import { Resolver } from 'node:dns/promises';
import type { LookupFunction } from 'node:net';
import { Agent, fetch as directFetch } from 'undici';

// Optional DNS resolver for this app only. TLS hostname verification stays enabled.
const servers = (process.env.SOURCE_DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean);
let dispatcher: Agent | undefined;
if (servers.length) {
  const resolver = new Resolver({ timeout: 3000, tries: 2 });
  resolver.setServers(servers);
  const records = new Map<string, { addresses: string[]; expiry: number }>();
  const lookup = ((hostname: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) => {
    const resolve = async () => {
      const cached = records.get(hostname);
      if (cached && cached.expiry > Date.now()) return cached.addresses;
      const addresses = await resolver.resolve4(hostname);
      if (!addresses.length) throw new Error('DNS returned no IPv4 addresses');
      if (records.size >= 500) records.delete(records.keys().next().value!);
      records.set(hostname, { addresses, expiry: Date.now() + 60000 });
      return addresses;
    };
    resolve().then((addresses) => {
      if (options.all) callback(null, addresses.map((address) => ({ address, family: 4 })));
      else callback(null, addresses[0], 4);
    }, (error) => callback(error));
  }) as LookupFunction;
  dispatcher = new Agent({ connect: { lookup }, autoSelectFamily: false });
}

export function sourceTimeoutMs(normalMs: number): number {
  // Render Free can need about a minute to wake; retain short deadlines for direct requests.
  return process.env.SOURCE_BACKEND_URL ? Math.max(normalMs, 90000) : normalMs;
}

export function sourceFetch(url: string, options: RequestInit & { next?: { revalidate: number } } = {}): Promise<Response> {
  const backend = process.env.SOURCE_BACKEND_URL;
  if (backend) {
    const origin = new URL(backend);
    if (origin.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost','127.0.0.1'].includes(origin.hostname))) throw new Error('Source backend must use HTTPS.');
    const token = process.env.SOURCE_BACKEND_TOKEN;
    if (!token) throw new Error('Source backend token is missing.');
    const headers = new Headers(options.headers);
    return fetch(new URL('/fetch', origin), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, range: headers.get('range') || undefined }),
      cache: 'no-store', signal: options.signal,
    });
  }
  if (!dispatcher) return fetch(url, options);
  // Validated metadata is cached by source-client; no opaque error responses are cached here.
  return directFetch(url, {
    dispatcher, headers: options.headers as Record<string, string>,
    method: options.method, signal: options.signal,
  }) as unknown as Promise<Response>;
}
