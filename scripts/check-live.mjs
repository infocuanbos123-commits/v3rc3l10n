import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { _0x54b991 } = require('../src/lib/kisskh-crypto.js');
const target = process.argv[2];
const backendMode = process.argv.includes('--backend');
if (!target) throw new Error('Usage: npm run check:live -- https://your-app OR https://your-backend --backend');
const app = new URL(target);
const source = new URL(process.env.KISSKH_BASE_URL || 'https://kisskh.co');
const token = process.env.SOURCE_BACKEND_TOKEN;
if (backendMode && !token) throw new Error('Set SOURCE_BACKEND_TOKEN in the local environment; never put it in the URL.');
async function request(url, range) {
  return fetch(backendMode ? new URL('/fetch',app) : url, {
    ...(backendMode ? {method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({url:String(url),range})} : {headers:range ? {Range:range} : {}}),
    signal:AbortSignal.timeout(90000),
  });
}
async function json(url) {
  const response=await request(url);
  if(!response.ok || response.headers.get('cf-mitigated')==='challenge') {
    const body=await response.text();
    throw new Error(`HTTP ${response.status}: ${body.slice(0,250)}`);
  }
  return response.json();
}
async function checkMedia(url, depth=0) {
  if(depth>4) throw new Error('Playlist nesting too deep');
  const response=await request(url,'bytes=0-4095');
  if(!response.ok || response.headers.get('cf-mitigated')==='challenge') {
    const details=await response.text();
    throw new Error(`Media ${new URL(url).hostname}: HTTP ${response.status}${response.headers.get('cf-mitigated')==='challenge'?' (Cloudflare challenge)':''}; ${details.slice(0,120)}`);
  }
  const playlist=response.headers.get('content-type')?.includes('mpegurl') || new URL(url).pathname.endsWith('.m3u8');
  if(playlist) {
    const text=await response.text();
    if(!text.trimStart().startsWith('#EXTM3U')) throw new Error('Invalid HLS playlist');
    const lines=text.split(/\r?\n/).map(line=>line.trim());
    const entry=lines.find(line=>line && !line.startsWith('#'));
    if(!entry) throw new Error('Empty HLS playlist');
    await checkMedia(new URL(entry,url),depth+1);
  } else {
    const reader=response.body.getReader();
    const first=await reader.read();
    await reader.cancel();
    if(!first.value?.length) throw new Error('Empty media response');
    if(response.headers.get('content-type')?.includes('text/html')) throw new Error('Media returned HTML');
  }
}
try {
  let video;
  let subtitles;
  let mediaChecked=false;
  if(backendMode) {
    const catalog=await json(new URL('/api/DramaList/Show',source));
    if(!Array.isArray(catalog) || !catalog.length) throw new Error('Empty catalogue');
    console.log(`PASS catalogue: ${catalog.length} items`);
    const key=sub=>_0x54b991(223821,null,'2.8.10',sub?'VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp':'62f176f3bb1b5b8e70e39932ad34a0c7',4830201,'kisskh','kisskh','kisskh','kisskh','kisskh','kisskh');
    const stream=await json(new URL(`/api/DramaList/Episode/223821.png?kkey=${encodeURIComponent(key(false))}`,source));
    let lastFailure;
    for(const candidate of [...new Set([stream.Video,stream.Video_tmp].filter(Boolean))]) {
      if (/(^|\.)tickcounter\.com$/i.test(new URL(candidate,source).hostname)) continue;
      try {await checkMedia(new URL(candidate,source));video=candidate;mediaChecked=true;break;}
      catch(error) {lastFailure=error;}
    }
    if(!mediaChecked) throw lastFailure || new Error('No supported direct video');
    subtitles=await json(new URL(`/api/Sub/223821?kkey=${encodeURIComponent(key(true))}`,source));
  } else {
    const health=await json(new URL('/api/health',app));
    if(health.status!=='ok') throw new Error('Catalogue health failed');
    console.log(`PASS catalogue: ${health.itemsFetched} items`);
    const stream=await json(new URL('/api/stream?episodeId=223821',app));
    video=new URL(stream.video,app).href;
    subtitles=stream.subtitles;
  }
  if(!video) throw new Error('No direct video');
  if(!mediaChecked) await checkMedia(new URL(video,backendMode?source:app));
  console.log('PASS sample video: playlist and media bytes');
  for(const language of ['en','id']) {
    const track=subtitles.find(sub=>[language,language==='en'?'eng':'ind'].includes(sub.land?.toLowerCase()) || (language==='en'?/english/i:/indones/i).test(sub.label||''));
    if(!track) throw new Error(`Sample subtitle ${language} missing`);
    const response=await request(backendMode?track.src:new URL(`/api/sub-vtt?url=${encodeURIComponent(track.src)}`,app));
    const text=await response.text();
    if(!response.ok || !/WEBVTT|\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(text)) throw new Error(`Sample subtitle ${language} invalid`);
    console.log(`PASS subtitle ${language}`);
  }
  console.log('PASS source integration. Browser playback and dashboard still need verification.');
} catch(error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode=1;
}
