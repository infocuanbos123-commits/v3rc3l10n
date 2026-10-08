import { NextResponse } from 'next/server';
import { fetchFromKissKH, DramaItem } from '@/lib/kisskh-api';
import { SOURCE_ORIGIN, SourceError } from '@/lib/source-client';
export const dynamic = 'force-dynamic';
export async function GET() {
  const mode = process.env.SOURCE_BACKEND_URL ? 'backend' : 'direct';
  try {
    const show = await fetchFromKissKH<DramaItem[]>('DramaList/Show', 3600);
    if (!Array.isArray(show) || !show.length) throw new SourceError('Katalog sumber kosong.', 'SOURCE_EMPTY');
    return NextResponse.json({ status: 'ok', mode, source: SOURCE_ORIGIN, itemsFetched: show.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const failure = error instanceof SourceError ? error : new SourceError('Sumber tidak tersedia.');
    return NextResponse.json({ status: 'error', mode, source: SOURCE_ORIGIN, error: failure.message, code: failure.code }, { status: failure.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
