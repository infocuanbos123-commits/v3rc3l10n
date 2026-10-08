import { NextRequest, NextResponse } from 'next/server';
import { isHiddenWithAI } from '@/lib/browse-ai';
import { hiddenTitleIds } from '@/lib/admin-settings';
export async function GET(request: NextRequest) {
  const ids = [...new Set((request.nextUrl.searchParams.get('ids') || '').split(',').map(Number))].filter(id => Number.isSafeInteger(id) && id>0).slice(0,50);
  const hidden: number[] = [];
  let manual:Set<number>;
  try {manual=await hiddenTitleIds();}
  catch {return NextResponse.json({error:'Preferensi katalog belum tersedia.'},{status:503,headers:{'Cache-Control':'no-store'}});}
  for (const id of ids) if (manual.has(id) || await isHiddenWithAI({id,title:'' ,thumbnail:''})) hidden.push(id);
  return NextResponse.json({hidden},{headers:{'Cache-Control':'no-store'}});
}
