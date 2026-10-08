const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {
  return originalResolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx:ts.JsxEmit.ReactJSX },
}).outputText, filename);
require.extensions['.tsx']=require.extensions['.ts'];
const source = require('../src/lib/source-client.ts');
const api = require('../src/lib/kisskh-api.ts');
const stream = require('../src/app/api/stream/route.ts');
const proxy = require('../src/app/api/stream/hls/route.ts');
const health = require('../src/app/api/health/route.ts');
const searchRoute = require('../src/app/api/search/route.ts');
const catalog = require('../src/lib/catalog.ts');
const policy = require('../src/lib/browse-policy.ts');
const subtitleUtils = require('../src/lib/subtitles.ts');
const ai = require('../src/lib/browse-ai.ts');
const { sourceFetch } = require('../src/lib/source-fetch.ts');
const { NextRequest } = require('next/server');
const realFetch = global.fetch;
test.afterEach(() => { global.fetch = realFetch; });
const json = (data) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

test('direct requests share in-flight work and cache without a scraper host', async () => {
  let calls = 0;
  global.fetch = async (url) => { calls++; assert.equal(new URL(url).origin, source.SOURCE_ORIGIN); await new Promise(r => setTimeout(r, 10)); return json([1]); };
  assert.deepEqual(await Promise.all([api.fetchFromKissKH('test/catalog'), api.fetchFromKissKH('test/catalog')]), [[1], [1]]);
  await api.fetchFromKissKH('test/catalog');
  assert.equal(calls, 1);
});
test('Cloudflare is reported and repeated requests respect cooldown', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; return new Response('challenge', { status: 403, headers: { 'cf-mitigated': 'challenge', 'content-type': 'text/html' } }); };
  for (let i = 0; i < 2; i++) await assert.rejects(api.fetchFromKissKH('test/blocked'), { code: 'SOURCE_CHALLENGE' });
  assert.equal(calls, 1);
});
test('extensionless playlists and MP4 bytes are recognized; HTML is rejected', async () => {
  global.fetch = async () => new Response('#EXTM3U\n#EXT-X-VERSION:3\n');
  assert.equal(await source.detectMedia('https://media.example/source'), 'hls');
  global.fetch = async () => new Response(Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]));
  assert.equal(await source.detectMedia('https://media.example/file'), 'file');
  global.fetch = async () => new Response('<html>advert</html>', { headers: { 'content-type': 'text/html' } });
  await assert.rejects(source.detectMedia('https://media.example/embed'), { code: 'SOURCE_HTML' });
});
test('resolver tries Video_tmp and subtitles failure does not stop MP4 playback', async () => {
  const requested = [];
  global.fetch = async (url) => {
    requested.push(url);
    if (url.includes('/Episode/')) return json({ Video: 'https://media.example/embed', Video_tmp: 'https://media.example/movie.mp4' });
    if (url.includes('/Sub/')) return new Response('denied', { status: 403 });
    if (url.endsWith('/embed')) return new Response('<html>ad</html>', { headers: { 'content-type': 'text/html' } });
    return new Response('video', { headers: { 'content-type': 'video/mp4' } });
  };
  const result = await api.getEpisodeStreamAndSubs(101);
  assert.equal(result.format, 'file'); assert.equal(result.thirdParty, null);
  assert.equal(result.rawVideo, 'https://media.example/movie.mp4');
  assert.deepEqual(result.subtitles, []);
  const calls = requested.length; await api.getEpisodeStreamAndSubs(101); assert.equal(requested.length, calls);
});
test('empty episode is an uncached error, never a successful empty player', async () => {
  global.fetch = async () => json({});
  const response = await stream.GET(new NextRequest('http://localhost/api/stream?episodeId=102'));
  assert.equal(response.status, 502); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).code, 'SOURCE_NO_DIRECT_VIDEO');
});
test('invalid episode IDs do not contact the source', async () => {
  global.fetch = async () => { throw new Error('Unexpected fetch'); };
  for (const value of ['-1', '1abc', '0', '1.5']) assert.equal((await stream.GET(new NextRequest('http://localhost/api/stream?id=' + value))).status, 400);
});
test('countdown placeholders are not opened as media or embeds', async () => {
  let calls = 0;
  global.fetch = async (url) => {
    calls++; assert.ok(url.includes('/Episode/'));
    return json({ Type: 2, Video: 'https://www.tickcounter.com/widget/countdown/8954411' });
  };
  const response = await stream.GET(new NextRequest('http://localhost/api/stream?episodeId=103'));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'SOURCE_NO_DIRECT_VIDEO');
  assert.equal(calls, 1);
});
test('playlist proxy rewrites segments, initialization maps and keys without corrupting signed query strings', async () => {
  let requested;
  global.fetch = async (url) => { requested = url; return new Response('#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXT-X-KEY:METHOD=AES-128,URI="key"\nseg.ts\n', { headers: { 'content-type': 'application/octet-stream' } }); };
  const url = 'https://media.example/hls/source?token=a%2Fb';
  const response = await proxy.GET(new NextRequest('http://localhost/api/stream/hls?format=hls&url=' + encodeURIComponent(url)));
  assert.equal(response.status, 200); assert.equal(requested, url);
  const text = await response.text();
  for (const file of ['init.mp4', 'key', 'seg.ts']) assert.ok(text.includes(encodeURIComponent('https://media.example/hls/' + file)));
});
test('media proxy reports challenges and preserves MP4 range responses', async () => {
  global.fetch = async () => new Response('challenge', { status: 403, headers: { 'cf-mitigated': 'challenge' } });
  const request = new NextRequest('http://localhost/api/stream/hls?url=https%3A%2F%2Fmedia.example%2Fv.mp4', { headers: { range: 'bytes=0-3' } });
  let response = await proxy.GET(request);
  assert.equal(response.status, 503); assert.equal((await response.json()).code, 'SOURCE_CHALLENGE');
  global.fetch = async (url, options) => { assert.equal(options.headers.Range, 'bytes=0-3'); return new Response('test', { status: 206, headers: { 'content-type': 'video/mp4', 'content-range': 'bytes 0-3/20' } }); };
  response = await proxy.GET(request); assert.equal(response.status, 206); assert.equal(response.headers.get('content-range'), 'bytes 0-3/20'); assert.equal(await response.text(), 'test');
});
test('health does not report success when the catalogue is blocked', async () => {
  global.fetch = async () => new Response('blocked', { status: 403, headers: { 'cf-mitigated': 'challenge' } });
  const response = await health.GET(); assert.equal(response.status, 503);
  assert.equal((await response.json()).status, 'error');
});

test('failed search is not cached as an empty successful catalogue', async () => {
  global.fetch = async () => new Response('blocked', { status: 403, headers: { 'cf-mitigated': 'challenge' } });
  const response = await searchRoute.GET(new NextRequest('http://localhost/api/search?q=blocked-title-test'));
  assert.equal(response.status, 503); assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('catalogue filters request 30 items and retain pagination', async () => {
  global.fetch = async (url) => {
    const params = new URL(url).searchParams;
    assert.equal(params.get('pageSize'), '30'); assert.equal(params.get('type'), '3');
    const page = Number(params.get('page'));
    return json({ page, pageSize: 30, totalCount: 80, data: Array.from({ length: 30 }, (_, index) => ({ id: (page - 1) * 30 + index, title: 'Anime ' + index })) });
  };
  const result = await catalog.getCatalogPage(1, 3, 5, 2, 2, '', async items => policy.filterBrowseItems(items));
  assert.equal(result.data.length, 30); assert.equal(result.hasNext, true);
});

test('browse policy uses explicit themes and verified titles, not generic romance/adult words', () => {
  for (const item of [{ id: 10826, title: 'Revenged Love (2025)' }, { id: 1, title: 'Shutline (2025)' }, { id: 2, title: 'Papa datte, Shitai (UNCENSORED BL)' }, { id: 3, title: 'A story', label: 'BL' }]) {
    assert.equal(policy.isHiddenFromBrowse(item), true);
  }
  assert.equal(policy.isHiddenFromBrowse({id:10160,title:'Friendly Rivalry',label:'GL'}), false);
  assert.equal(policy.isHiddenFromBrowse({id:1,title:'Girls Love Anime',label:'Yuri'}), false);
  for (const title of ['Hidden Love', 'A Hot Night With My Boss in a Capsule Hotel (UNCENSORED)', 'First Frost', 'Girls Band Cry', 'The Gay Science']) {
    assert.equal(policy.isHiddenFromBrowse({ id: 1, title }), false);
  }
});

test('hidden browse titles are replaced before pagination and remain searchable', async () => {
  global.fetch = async (url) => {
    if (url.includes('/Search')) return json([{ id: 10826, title: 'Revenged Love (2025)' }]);
    const page = Number(new URL(url).searchParams.get('page'));
    return json({ page, pageSize: 30, totalCount: 90, data: Array.from({ length: 30 }, (_, index) => ({ id: 50000 + (page - 1) * 30 + index, title: index < 5 ? 'Explicit BL series' : 'Ordinary film ' + page + '-' + index })) });
  };
  const first = await catalog.getCatalogPage(1, 1, 3, 0, 1, '', async items => policy.filterBrowseItems(items));
  const second = await catalog.getCatalogPage(2, 1, 3, 0, 1, '', async items => policy.filterBrowseItems(items));
  assert.equal(first.data.length, 30); assert.equal(second.data.length, 30);
  assert.ok(first.data.every(item => !policy.isHiddenFromBrowse(item)));
  assert.equal(first.data.some(item => second.data.some(other => other.id === item.id)), false);
  assert.equal((await api.searchDramas('Revenged Love'))[0].id, 10826);
  assert.deepEqual(policy.filterBrowseItems(await api.searchDramas('Revenged Love')), []);
});
test('year filtering fills a visible page across source pages without duplicates', async () => {
  global.fetch = async (url) => {
    const page = Number(new URL(url).searchParams.get('page'));
    return json({ page, pageSize: 100, totalCount: 200, data: Array.from({ length: 100 }, (_, index) => ({ id: (page - 1) * 100 + index, title: 'Title (' + (index < 20 ? '2026' : '2025') + ')' })) });
  };
  const result = await catalog.getCatalogPage(1, 2, 5, 2, 3, '2026', async items => policy.filterBrowseItems(items));
  assert.equal(result.data.length, 30); assert.equal(new Set(result.data.map(item => item.id)).size, 30);
  assert.ok(result.data.every(item => item.title.includes('2026'))); assert.equal(result.hasNext, true);
  assert.equal(catalog.matchesYear({ title: 'Older (2019)' }, '2020'), true);
  assert.equal(catalog.matchesYear({ title: 'Missing year' }, '2026'), false);
});

test('subtitle normalization prioritizes English and Indonesian and selects one default', () => {
  const result = subtitleUtils.normalizeSubtitles([
    {src:'https://subs.test/ar.srt',label:'Arabic',land:'ar',default:true},
    {src:'https://subs.test/id.srt',label:'Indonesian',land:'ind'},
    {src:'https://subs.test/en.srt',label:'English',land:'eng'},
    {src:'javascript:alert(1)',label:'bad'},
    {src:'https://subs.test/en.srt',label:'duplicate'},
  ]);
  assert.deepEqual(result.map(item => item.land),['en','id','ar']);
  assert.equal(result.filter(item => item.default).length,1);
  assert.equal(result[0].default,true);
  assert.equal(subtitleUtils.normalizeSubtitles([]).length,0);
});

test('SRT is converted, existing VTT is preserved, and non-subtitle HTML is rejected', () => {
  assert.ok(subtitleUtils.subtitleToVtt('1\r\n00:00:01,500 --> 00:00:03,000\r\nHello').includes('00:00:01.500'));
  assert.equal(subtitleUtils.subtitleToVtt('\uFEFFWEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi'),'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi');
  assert.throws(() => subtitleUtils.subtitleToVtt('<html>challenge</html>'));
});

test('AI decision hides male romance but retains GL and uncertain non-romance', () => {
  const male='a romantic or sexual relationship between two men';
  assert.equal(ai.interpretTheme({labels:[male,'action and adventure'],scores:[0.8,0.2]}).hidden,true);
  assert.equal(ai.interpretTheme({labels:['a romantic relationship between two women',male],scores:[0.95,0.05]}).hidden,false);
  assert.equal(ai.interpretTheme({labels:[male,'action and adventure'],scores:[0.5,0.4]}).hidden,false);
});

test('every player renders a subtitle button even with no source tracks', () => {
  const React = require('react');
  const {renderToStaticMarkup} = require('react-dom/server');
  const {VideoPlayer} = require('../src/components/VideoPlayer.tsx');
  for(const format of ['hls','file']) {
    const html=renderToStaticMarkup(React.createElement(VideoPlayer,{streamUrl:'/example',format,subtitles:[],title:'Movie',episodeNumber:1,dramaId:1}));
    assert.ok(html.includes('aria-label="Subtitles"'));
  }
});

test('backend transport forwards ranges and keeps its token out of target URLs', async t => {
  const originalUrl=process.env.SOURCE_BACKEND_URL;
  const originalToken=process.env.SOURCE_BACKEND_TOKEN;
  t.after(() => {
    if(originalUrl===undefined) delete process.env.SOURCE_BACKEND_URL; else process.env.SOURCE_BACKEND_URL=originalUrl;
    if(originalToken===undefined) delete process.env.SOURCE_BACKEND_TOKEN; else process.env.SOURCE_BACKEND_TOKEN=originalToken;
  });
  process.env.SOURCE_BACKEND_URL='https://backend.example';
  process.env.SOURCE_BACKEND_TOKEN='server-only-test-token';
  global.fetch=async (url,options) => {
    assert.equal(String(url),'https://backend.example/fetch');
    assert.equal(options.method,'POST');
    assert.equal(options.headers.Authorization,'Bearer server-only-test-token');
    assert.deepEqual(JSON.parse(options.body),{url:'https://hls08.cdnvideo11.shop/video.mp4',range:'bytes=0-3'});
    return new Response(new Uint8Array([0,1,2,3]),{status:206});
  };
  assert.equal((await sourceFetch('https://hls08.cdnvideo11.shop/video.mp4',{headers:{Range:'bytes=0-3'}})).status,206);
  process.env.SOURCE_BACKEND_URL='http://backend.example';
  assert.throws(()=>sourceFetch('https://kisskh.co/api/DramaList/Show'),/HTTPS/);
});
