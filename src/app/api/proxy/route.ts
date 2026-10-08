import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  try {
    const targetUrl = decodeURIComponent(url);
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };

    if (targetUrl.includes('kisskh') || targetUrl.includes('kissimge')) {
      headers['Referer'] = 'https://kisskh.id/';
      headers['Origin'] = 'https://kisskh.id';
    }

    const response = await fetch(targetUrl, {
      headers,
    });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Proxy fetch error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
