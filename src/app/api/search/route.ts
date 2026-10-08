import { NextRequest, NextResponse } from 'next/server';
import { searchDramas } from '@/lib/kisskh-api';
import { SourceError } from '@/lib/source-client';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  const type = parseInt(request.nextUrl.searchParams.get('type') || '0', 10);

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchDramas(q, isNaN(type) ? 0 : type);
    return NextResponse.json(results, {
    headers: {
      'Cache-Control': results.length ? 'public, max-age=0, s-maxage=3600' : 'no-store',
    },
  });
  } catch (error) {
    return NextResponse.json({error:error instanceof SourceError ? error.message : 'Pencarian sumber tidak tersedia.'}, {status:error instanceof SourceError ? error.status : 502,headers:{'Cache-Control':'no-store'}});
  }
}
