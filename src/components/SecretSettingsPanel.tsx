'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, LockKeyhole, LogOut, Search, Loader2 } from 'lucide-react';
import type { HiddenTitle } from '@/lib/admin-settings';
import type { DramaItem } from '@/lib/kisskh-api';

async function request(url:string,options:RequestInit={}) {
  const response=await fetch(url,{...options,cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'Permintaan gagal.');
  return data;
}
export function SecretSettingsPanel({initialAuthenticated}:{initialAuthenticated:boolean}) {
  const [authenticated,setAuthenticated]=useState(initialAuthenticated);
  const [code,setCode]=useState('');
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<DramaItem[]>([]);
  const [hidden,setHidden]=useState<HiddenTitle[]>([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState<number|null>(null);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [manualId,setManualId]=useState('');
  const [manualTitle,setManualTitle]=useState('');
  useEffect(()=>{
    if(!authenticated) return;
    let active=true;
    void request('/api/admin/hidden').then(data=>{if(active) setHidden(data.items);}).catch(err=>{if(active) setError(err.message);});
    return()=>{active=false;};
  },[authenticated]);
  async function login(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try {await request('/api/admin/session',{method:'POST',body:JSON.stringify({code})});setAuthenticated(true);setCode('');}
    catch(err) {setError(err instanceof Error?err.message:'Login gagal.');}
    finally {setBusy(false);}
  }
  async function logout() {
    setBusy(true);setError('');
    try {await request('/api/admin/session',{method:'DELETE'});setAuthenticated(false);setHidden([]);setResults([]);setNotice('');}
    catch(err) {setError(err instanceof Error?err.message:'Logout gagal.');}
    finally {setBusy(false);}
  }
  async function search(event:React.FormEvent) {
    event.preventDefault();if(query.trim().length<2) return;
    setLoading(true);setError('');setNotice('');
    try {const data=await request(`/api/search?q=${encodeURIComponent(query.trim())}`);setResults(Array.isArray(data)?data:[]);}
    catch(err) {setError(err instanceof Error?err.message:'Pencarian gagal.');}
    finally {setLoading(false);}
  }
  async function toggle(id:number,title:string,hide:boolean) {
    setSaving(id);setError('');setNotice('');
    try {
      const data=await request('/api/admin/hidden',{method:'PUT',body:JSON.stringify({action:hide?'hide':'show',id,title})});
      setHidden(data.items);
      setNotice(hide?`“${title}” disembunyikan dari tampilan semua pengunjung. Tetap bisa dicari dan diputar.`:`Hide manual untuk “${title}” dihapus. Filter tema yang sudah aktif tetap berlaku.`);
    } catch(err) {setError(err instanceof Error?err.message:'Perubahan gagal.');}
    finally {setSaving(null);}
  }
  const hiddenIds=new Set(hidden.map(item=>item.id));
  const field='w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-red-500';
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-500">Private control room</p><h1 className="flex items-center gap-3 text-2xl font-black text-white sm:text-3xl"><LockKeyhole className="h-7 w-7"/>Secret Settings</h1></div>
        {authenticated && <button onClick={logout} disabled={busy} className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"><LogOut className="h-4 w-4"/>Keluar</button>}
      </div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}
      {!authenticated ? (
        <form onSubmit={login} className="mx-auto max-w-md space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <div><h2 className="text-lg font-bold text-white">Akses admin</h2><p className="mt-2 text-sm text-zinc-400">Masukkan kode akses untuk mengatur judul yang tampil di website.</p></div>
          <label className="block text-sm text-zinc-300">Kode akses<input type="password" autoComplete="current-password" value={code} onChange={event=>setCode(event.target.value)} maxLength={256} required className={`${field} mt-2`}/></label>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-50">{busy&&<Loader2 className="h-4 w-4 animate-spin"/>}Masuk admin</button>
        </form>
      ) : (
        <div className="space-y-7">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"><h2 className="text-lg font-bold text-white">Atur tampilan katalog</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">Hide berlaku di dashboard, semua kategori, watchlist, dan lanjut menonton untuk semua pengunjung. Judul tetap tersedia lewat pencarian dan player. Halaman yang sudah terbuka perlu dimuat ulang.</p></div>
          <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="font-bold text-white">Cari judul untuk di-hide</h2>
            <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row"><label className="flex-1"><span className="sr-only">Cari judul film</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cari judul film atau series…" minLength={2} maxLength={120} required className={field}/></label><button disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}Cari judul</button></form>
            <div className="divide-y divide-zinc-800">{results.map(item=><div key={item.id} className="flex items-center gap-3 py-4">{item.thumbnail&&<Image src={item.thumbnail} alt="" width={48} height={64} unoptimized className="h-16 w-12 shrink-0 rounded object-cover"/>}<div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{item.title}</p><Link href={`/drama/${item.id}`} className="mt-1 inline-block text-xs text-zinc-400 hover:text-white">Buka player · ID {item.id}</Link></div><button onClick={()=>toggle(item.id,item.title,!hiddenIds.has(item.id))} disabled={saving!==null} className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-white hover:border-red-500 disabled:opacity-50">{hiddenIds.has(item.id)?<Eye className="h-4 w-4"/>:<EyeOff className="h-4 w-4"/>}{saving===item.id?'Menyimpan…':hiddenIds.has(item.id)?'Tampilkan':'Hide'}</button></div>)}</div>
            <details className="rounded-xl border border-zinc-800 p-4"><summary className="cursor-pointer text-sm text-zinc-400">Tambah dengan ID jika pencarian tidak tersedia</summary><form onSubmit={event=>{event.preventDefault();void toggle(Number(manualId),manualTitle,true);}} className="mt-4 grid gap-3 sm:grid-cols-[130px_1fr_auto]"><label><span className="sr-only">ID film</span><input type="number" min="1" max="2147483647" step="1" value={manualId} onChange={event=>setManualId(event.target.value)} placeholder="ID film" required className={field}/></label><label><span className="sr-only">Judul film</span><input value={manualTitle} onChange={event=>setManualTitle(event.target.value)} maxLength={200} placeholder="Judul film" required className={field}/></label><button disabled={saving!==null} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Hide judul</button></form></details>
          </section>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-white">Hide manual</h2><span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">{hidden.length} judul</span></div>{hidden.length===0?<p className="py-5 text-sm text-zinc-500">Belum ada judul yang di-hide manual.</p>:<div className="divide-y divide-zinc-800">{hidden.map(item=><div key={item.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-semibold text-white">{item.title}</p><Link href={`/drama/${item.id}`} className="text-xs text-zinc-500 hover:text-white">ID {item.id} · Buka player</Link></div><button onClick={()=>toggle(item.id,item.title,false)} disabled={saving!==null} className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white disabled:opacity-50"><Eye className="h-4 w-4"/>{saving===item.id?'Menyimpan…':'Tampilkan lagi'}</button></div>)}</div>}</section>
        </div>
      )}
    </div>
  );
}
