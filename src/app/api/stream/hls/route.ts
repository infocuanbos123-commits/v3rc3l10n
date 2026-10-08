import { NextRequest, NextResponse } from 'next/server';
import { sourceFetch, sourceTimeoutMs } from '@/lib/source-fetch';
import { SOURCE_HEADERS, SourceError, assertSourceResponse } from '@/lib/source-client';

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');

  if (!urlParam) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    const targetUrl = new URL(urlParam).href;
    if (!['https:', 'http:'].includes(new URL(targetUrl).protocol)) return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });

    const headers: Record<string, string> = { ...SOURCE_HEADERS };

    // Forward byte range header if present (crucial for HLS video segments)
    const range = request.headers.get('range');
    if (range) {
      headers['Range'] = range;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), sourceTimeoutMs(20000));
    let response: Response;
    try {
      response = await sourceFetch(targetUrl, { headers, cache: 'no-store', signal: controller.signal });
    } finally {
      // A long MP4 response must remain readable after its headers arrive.
      clearTimeout(timeout);
    }

    try { assertSourceResponse(response); } catch (error) { await response.body?.cancel(); throw error; }

    const contentType = response.headers.get('content-type') || '';
    const isPlaylist =
      request.nextUrl.searchParams.get('format') === 'hls' ||
      contentType.includes('mpegurl') ||
      new URL(targetUrl).pathname.toLowerCase().endsWith('.m3u8');

    // If it's an M3U8 playlist, rewrite URLs to route through this proxy
    if (isPlaylist) {
      const text = await response.text();
      if (!text.trimStart().startsWith('#EXTM3U')) throw new SourceError('Sumber tidak mengembalikan playlist video.', 'SOURCE_NOT_MEDIA');
      const lines = text.split('\n');

      const rewritten = lines
        .map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // Rewrite key URIs if present (e.g. #EXT-X-KEY:METHOD=...,URI="...")
          if (trimmed.startsWith('#') && trimmed.includes('URI=')) {
            return trimmed.replace(/URI="([^"]+)"/g, (_, keyUrl) => {
              const resolvedKey = new URL(keyUrl, targetUrl).href;
              const format = trimmed.startsWith('#EXT-X-MEDIA:') ? '&format=hls' : '';
              return `URI="/api/stream/hls?url=${encodeURIComponent(resolvedKey)}${format}"`;
            });
          }

          // Leave comments/tags alone
          if (trimmed.startsWith('#')) return line;

          // Resolve relative or absolute segment/variant URLs
          const resolvedUrl = new URL(trimmed, targetUrl).href;
          const format = lines[index - 1]?.trim().startsWith('#EXT-X-STREAM-INF:') ? '&format=hls' : '';
          return `/api/stream/hls?url=${encodeURIComponent(resolvedUrl)}${format}`;
        })
        .join('\n');

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'public, max-age=60',
        },
      });
    }

    // For media segments (.ts, .mp4, keys, etc.), stream response with range support
    const responseHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept, Accept-Encoding',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    };

    if (contentType) {
      responseHeaders['Content-Type'] = contentType;
    } else {
      responseHeaders['Content-Type'] = 'video/mp2t';
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const contentRange = response.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    // Stream bytes without buffering the full video in server memory
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const failure = err instanceof SourceError ? err : new SourceError('Tidak bisa terhubung ke sumber video.', 'SOURCE_CONNECTION');
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: failure.status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
