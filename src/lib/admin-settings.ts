export type HiddenTitle = {id:number;title:string;hiddenAt:number};
const KEY = 'metromovies:admin:hidden-titles';
type Cache = {items?:HiddenTitle[];expires:number;pending?:Promise<HiddenTitle[]>;unavailable?:boolean};
const global = globalThis as unknown as {__adminHiddenTitles?:Cache};
const cache = global.__adminHiddenTitles ||= {expires:0};

export function settingsConfigured() {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}
export function sharedBrowseSettingsUnavailable() {return !!cache.unavailable;}
export async function redisCommand(command: (string|number)[]) {
  if (!settingsConfigured()) throw new Error('Penyimpanan bersama admin belum dikonfigurasi.');
  const url = new URL(process.env.UPSTASH_REDIS_REST_URL!);
  if (url.protocol !== 'https:') throw new Error('Penyimpanan admin harus memakai HTTPS.');
  const response = await fetch(url, {
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`},
    body:JSON.stringify(command),cache:'no-store',signal:AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Penyimpanan admin sedang tidak tersedia.');
  const data = await response.json();
  if (data.error) throw new Error('Penyimpanan admin gagal memproses perubahan.');
  return data.result;
}
export async function getHiddenTitles(fresh=false): Promise<HiddenTitle[]> {
  if (!settingsConfigured()) {cache.unavailable=false;return [];}
  if (!fresh && cache.items && cache.expires > Date.now()) return cache.items;
  if (!fresh && cache.pending) return cache.pending;
  const task = (async () => {
    const result = await redisCommand(['HGETALL',KEY]);
    const values = Array.isArray(result) ? result.filter((_:unknown,index:number)=>index%2===1) : Object.values(result || {});
    const items:HiddenTitle[] = values.map((value:unknown)=>typeof value==='string'?JSON.parse(value):value)
      .filter((item:HiddenTitle)=>Number.isSafeInteger(item?.id) && item.id>0 && typeof item.title==='string')
      .sort((a:HiddenTitle,b:HiddenTitle)=>b.hiddenAt-a.hiddenAt);
    cache.items=items;
    cache.unavailable=false;
    cache.expires=Date.now()+5000;
    return items;
  })();
  cache.pending=task;
  try {return await task;} catch(error) {cache.unavailable=true;throw error;}
  finally {if(cache.pending===task) cache.pending=undefined;}
}
export async function setTitleHidden(id:number,title:string,hidden:boolean) {
  if (!Number.isSafeInteger(id) || id<=0 || id>2147483647 || (hidden && (!title.trim() || title.length>200))) throw new Error('ID atau judul tidak valid.');
  if(hidden) await redisCommand(['HSET',KEY,String(id),JSON.stringify({id,title:title.trim(),hiddenAt:Date.now()})]);
  else await redisCommand(['HDEL',KEY,String(id)]);
  cache.expires=0;
  cache.pending=undefined;
  return getHiddenTitles(true);
}
export async function hiddenTitleIds() {
  return new Set((await getHiddenTitles()).map(item=>item.id));
}
export async function allowAdminAttempt(identity:string) {
  const key=`metromovies:admin:login:${identity}`;
  const count=Number(await redisCommand(['INCR',key]));
  if(count===1) await redisCommand(['EXPIRE',key,900]);
  return count<=10;
}
