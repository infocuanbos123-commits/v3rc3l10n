import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, SESSION_SECONDS, adminConfigured, checkAdminCode, makeAdminSession, validAdminSession, sameOrigin } from '@/lib/admin-auth';
import { settingsConfigured, allowAdminAttempt } from '@/lib/admin-settings';
export const dynamic = 'force-dynamic';
const noCache = {'Cache-Control':'no-store'};

export async function GET(request:NextRequest) {
  return NextResponse.json({authenticated:validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value),configured:adminConfigured()}, {headers:noCache});
}
export async function POST(request:NextRequest) {
  if(!sameOrigin(request)) return NextResponse.json({error:'Origin tidak diizinkan.'},{status:403,headers:noCache});
  if(!adminConfigured() || !settingsConfigured()) return NextResponse.json({error:'Admin atau penyimpanan bersama belum dikonfigurasi.'},{status:503,headers:noCache});
  try {
    const identity=createHash('sha256').update(request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown').digest('hex');
    if(!await allowAdminAttempt(identity)) return NextResponse.json({error:'Terlalu banyak percobaan. Coba lagi dalam 15 menit.'},{status:429,headers:noCache});
    if(Number(request.headers.get('content-length'))>2048) return NextResponse.json({error:'Permintaan terlalu besar.'},{status:413,headers:noCache});
    const text=await request.text();
    if(text.length>2048) return NextResponse.json({error:'Permintaan terlalu besar.'},{status:413,headers:noCache});
    let code;
    try {code=JSON.parse(text).code;} catch {return NextResponse.json({error:'Permintaan tidak valid.'},{status:400,headers:noCache});}
    if(!checkAdminCode(code)) return NextResponse.json({error:'Kode akses salah.'},{status:401,headers:noCache});
    const response=NextResponse.json({authenticated:true},{headers:noCache});
    response.cookies.set(ADMIN_COOKIE,makeAdminSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:SESSION_SECONDS});
    return response;
  } catch {return NextResponse.json({error:'Penyimpanan admin sedang tidak tersedia.'},{status:503,headers:noCache});}
}
export async function DELETE(request:NextRequest) {
  if(!sameOrigin(request)) return NextResponse.json({error:'Origin tidak diizinkan.'},{status:403,headers:noCache});
  const response=NextResponse.json({authenticated:false},{headers:noCache});
  response.cookies.set(ADMIN_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
  return response;
}
