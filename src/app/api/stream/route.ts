import { NextRequest, NextResponse } from 'next/server';
import { getEpisodeStreamAndSubs } from '@/lib/kisskh-api';
import { SourceError } from '@/lib/source-client';

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('episodeId') || request.nextUrl.searchParams.get('id') || '';
  const episodeId = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(episodeId) || episodeId <= 0) {
    return NextResponse.json({ error: 'invalid episodeId' }, { status: 400 });
  }
  try {
    const result = await getEpisodeStreamAndSubs(episodeId);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  } catch (error) {
    const failure = error instanceof SourceError ? error : new SourceError('Sumber video tidak tersedia.');
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: failure.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
