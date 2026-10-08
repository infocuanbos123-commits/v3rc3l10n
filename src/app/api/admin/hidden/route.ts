import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, validAdminSession, sameOrigin } from '@/lib/admin-auth';
import { getHiddenTitles, setTitleHidden, settingsConfigured } from '@/lib/admin-settings';
export const dynamic = 'force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(request:NextRequest) {
  if(!validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.json({error:'Akses admin diperlukan.'},{status:401,headers});
  if(!settingsConfigured()) return NextResponse.json({error:'Penyimpanan admin belum terhubung.'},{status:503,headers});
  try {return NextResponse.json({items:await getHiddenTitles(true)},{headers});}
  catch {return NextResponse.json({error:'Daftar hide belum bisa dimuat.'},{status:503,headers});}
}
export async function PUT(request:NextRequest) {
  if(!sameOrigin(request)) return NextResponse.json({error:'Origin tidak diizinkan.'},{status:403,headers});
  if(!validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.json({error:'Akses admin diperlukan.'},{status:401,headers});
  try {
    const text=await request.text();
    if(text.length>4096) return NextResponse.json({error:'Permintaan terlalu besar.'},{status:413,headers});
    const data=JSON.parse(text);
    if(!Number.isSafeInteger(data.id) || data.id<=0 || data.id>2147483647 || !['hide','show'].includes(data.action) || (data.action==='hide' && (typeof data.title!=='string' || !data.title.trim() || data.title.length>200))) return NextResponse.json({error:'ID, judul, atau aksi tidak valid.'},{status:400,headers});
    return NextResponse.json({items:await setTitleHidden(data.id,data.title||'',data.action==='hide')},{headers});
  } catch {return NextResponse.json({error:'Perubahan belum tersimpan. Coba lagi.'},{status:503,headers});}
}
