import { NextRequest, NextResponse } from 'next/server';
import { sourceFetch, sourceTimeoutMs } from '@/lib/source-fetch';
import { assertSourceResponse } from '@/lib/source-client';
import { subtitleToVtt } from '@/lib/subtitles';


export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    const srtRes = await sourceFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://kisskh.co/',
      },
      signal: AbortSignal.timeout(sourceTimeoutMs(15000)),
    });

    if (!srtRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch subtitle' }, { status: 502 });
    }

    assertSourceResponse(srtRes);
    const srtText = await srtRes.text();
    const vttText = subtitleToVtt(srtText);

    return new NextResponse(vttText, {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error converting subtitle';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
