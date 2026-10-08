import { sourceFetch, sourceTimeoutMs } from './source-fetch';

export class SourceError extends Error {
  constructor(message: string, public code = 'SOURCE_UNAVAILABLE', public status = 502) {
    super(message);
    this.name = 'SourceError';
  }
}

export const SOURCE_ORIGIN = new URL(process.env.KISSKH_BASE_URL || 'https://kisskh.co').origin;
export const SOURCE_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Referer: `${SOURCE_ORIGIN}/`,
  Origin: SOURCE_ORIGIN,
  Accept: 'application/json, application/vnd.apple.mpegurl, video/*, */*',
};

export function assertSourceResponse(response: Response): void {
  if (response.headers.get('cf-mitigated') === 'challenge') {
    throw new SourceError('Sumber meminta verifikasi Cloudflare. Akses langsung belum diizinkan oleh sumber.', 'SOURCE_CHALLENGE', 503);
  }
  if (!response.ok) {
    throw new SourceError(`Sumber menolak atau gagal merespons (HTTP ${response.status}).`, 'SOURCE_HTTP_ERROR', 502);
  }
  if (response.headers.get('content-type')?.includes('text/html')) {
    throw new SourceError('Sumber mengembalikan halaman web, bukan data atau video.', 'SOURCE_HTML', 502);
  }
}

export function normalizeMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), `${SOURCE_ORIGIN}/`);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export async function detectMedia(url: string): Promise<'hls' | 'file'> {
  const response = await sourceFetch(url, {
    headers: { ...SOURCE_HEADERS, Range: 'bytes=0-4095' },
    cache: 'no-store',
    signal: AbortSignal.timeout(sourceTimeoutMs(15000)),
  });
  try {
    assertSourceResponse(response);
    const type = response.headers.get('content-type')?.toLowerCase() || '';
    if (type.startsWith('video/')) return 'file';
    // Read only the prefix even when the origin ignores Range.
    const reader = response.body?.getReader();
    if (!reader) throw new SourceError('Sumber video kosong.', 'SOURCE_EMPTY');
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (length < 4096) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = value.subarray(0, 4096 - length);
        chunks.push(chunk);
        length += chunk.length;
      }
    } finally { await reader.cancel(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if (new TextDecoder().decode(bytes).trimStart().startsWith('#EXTM3U')) return 'hls';
    if (length >= 8 && new TextDecoder().decode(bytes.subarray(4, 8)) === 'ftyp') return 'file';
    throw new SourceError('URL sumber bukan playlist HLS atau file video yang didukung.', 'SOURCE_NOT_MEDIA');
  } finally {
    if (!response.body?.locked) await response.body?.cancel();
  }
}
