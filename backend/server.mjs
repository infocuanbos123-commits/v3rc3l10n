import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { Agent, fetch as upstreamFetch } from 'undici';

export function createBackend({ token, origin = 'https://kisskh.co', mediaHosts = '*.cdnvideo11.shop,*.streamingcdn5.site', dnsServers = '', fetchImpl } = {}) {
  if (!token || token.length < 32) throw new Error('SOURCE_BACKEND_TOKEN must contain at least 32 characters.');
  const source = new URL(origin);
  if (source.protocol !== 'https:' || source.username || source.password) throw new Error('Source must use HTTPS.');
  const allowedMedia = mediaHosts.split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
  const apiPath = /^\/api\/(?:DramaList\/(?:Show|LastUpdate|TopRating|Upcoming|MostView|List|Search|Drama\/\d+|Episode\/\d+\.png)|Sub\/\d+)$/;
  function allowed(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
      if (url.origin === source.origin) return apiPath.test(url.pathname);
      return allowedMedia.some(host => host.startsWith('*.')
        ? url.hostname.endsWith(host.slice(1)) && url.hostname !== host.slice(2)
        : url.hostname === host);
    } catch { return false; }
  }
  let dispatcher;
  if (dnsServers) {
    const resolver = new Resolver({ timeout: 3000, tries: 2 });
    resolver.setServers(dnsServers.split(',').map(value => value.trim()).filter(Boolean));
    dispatcher = new Agent({ connect: { lookup(host, options, callback) {
      resolver.resolve4(host).then(addresses => {
        if (!addresses.length) return callback(new Error('DNS returned no addresses'));
        callback(null, options.all ? addresses.map(address => ({address, family: 4})) : addresses[0], 4);
      }, callback);
    } }, autoSelectFamily: false });
  }
  const fetch = fetchImpl || ((url, options) => upstreamFetch(url, { ...options, dispatcher }));
  const expected = Buffer.from(`Bearer ${token}`);
  const cache = new Map();
  let cachedBytes = 0;
  let active = 0;
  function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  }
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/ready') return json(res, 200, { status: 'ready' });
    const supplied = Buffer.from(req.headers.authorization || '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(res, 401, { error: 'Unauthorized' });
    if (req.method !== 'POST' || req.url !== '/fetch') return json(res, 404, { error: 'Not found' });
    if (active >= 16) return json(res, 429, { error: 'Backend busy; retry later' });
    active++;
    const controller = new AbortController();
    const abort = () => controller.abort();
    req.on('aborted', abort);
    res.on('close', abort);
    let timer;
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 16384) return json(res, 413, { error: 'Request too large' });
      }
      let input;
      try { input = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
      if (!allowed(input.url)) return json(res, 403, { error: 'Destination not allowed' });
      const range = input.range;
      if (range && (typeof range !== 'string' || !/^bytes=(?:\d+-\d*|-\d+)(?:,(?:\d+-\d*|-\d+))*$/.test(range))) return json(res, 400, { error: 'Invalid range' });
      const isApi = new URL(input.url).origin === source.origin;
      const saved = cache.get(input.url);
      if (isApi && !range && saved && saved.expires > Date.now()) {
        res.writeHead(200, saved.headers);
        return res.end(saved.body);
      }
      timer = setTimeout(abort, 20000);
      const headers = { 'User-Agent': 'Mozilla/5.0', Referer: `${source.origin}/`, Origin: source.origin, Accept: 'application/json, application/vnd.apple.mpegurl, video/*, */*' };
      if (range) headers.Range = range;
      let target = input.url;
      let upstream;
      for (let redirect = 0; redirect <= 3; redirect++) {
        upstream = await fetch(target, { headers, redirect: 'manual', signal: controller.signal });
        if (![301,302,303,307,308].includes(upstream.status)) break;
        const location = upstream.headers.get('location');
        await upstream.body?.cancel();
        if (!location) return json(res, 502, { error: 'Invalid source redirect' });
        target = new URL(location, target).href;
        if (!allowed(target) || redirect === 3) return json(res, 502, { error: 'Source redirect not allowed' });
      }
      clearTimeout(timer);
      const responseHeaders = { 'Cache-Control': 'no-store' };
      // Fetch decompresses bodies; don't forward the original content-length/encoding.
      for (const name of ['content-type','content-range','accept-ranges','cf-mitigated','retry-after']) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders[name] = value;
      }
      if (isApi && !range && upstream.ok && responseHeaders['content-type']?.includes('application/json')) {
        timer = setTimeout(abort, 20000);
        const bytes = [];
        let size = 0;
        for await (const chunk of upstream.body) {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) { controller.abort(); return json(res, 502, { error: 'Source JSON too large' }); }
          bytes.push(Buffer.from(chunk));
        }
        const data = Buffer.concat(bytes);
        JSON.parse(data.toString());
        if (saved) { cache.delete(input.url); cachedBytes -= saved.body.length; }
        while (cache.size >= 250 || (cache.size && cachedBytes + data.length > 20 * 1024 * 1024)) {
          const key = cache.keys().next().value;
          cachedBytes -= cache.get(key).body.length;
          cache.delete(key);
        }
        const ttl = /\/Episode\/|\/Sub\//.test(target) ? 60000 : /\/Drama\/\d+/.test(target) ? 86400000 : 3600000;
        cache.set(input.url, { body: data, headers: responseHeaders, expires: Date.now() + ttl });
        cachedBytes += data.length;
        res.writeHead(upstream.status, responseHeaders);
        return res.end(data);
      }
      res.writeHead(upstream.status, responseHeaders);
      if (!upstream.body) return res.end();
      const stream = Readable.fromWeb(upstream.body);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
      await new Promise(resolve => { res.on('finish', resolve); res.on('close', resolve); });
    } catch {
      if (!res.headersSent) json(res, 502, { error: 'Source request failed' });
      else res.destroy();
    } finally {
      clearTimeout(timer);
      active--;
      req.off('aborted', abort);
      res.off('close', abort);
    }
  });
  server.on('close', () => dispatcher?.close());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createBackend({ token: process.env.SOURCE_BACKEND_TOKEN, origin: process.env.KISSKH_BASE_URL, mediaHosts: process.env.SOURCE_MEDIA_HOSTS, dnsServers: process.env.SOURCE_DNS_SERVERS });
  server.listen(Number(process.env.PORT || 10000), '0.0.0.0', () => console.log('Source backend listening'));
}
