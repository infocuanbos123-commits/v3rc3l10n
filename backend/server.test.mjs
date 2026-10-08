import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackend } from './server.mjs';

const token = 'test-only-token-with-more-than-32-characters';
async function fixture(t, fetchImpl) {
  const server = createBackend({token, fetchImpl});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => {server.closeAllConnections();server.close();});
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {origin, request: (url, range) => fetch(`${origin}/fetch`, {method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({url,range})})};
}
test('backend requires a strong server token', () => {
  assert.throws(() => createBackend({token:'short'}), /at least 32/);
});
test('unauthorized requests cannot reach the source', async t => {
  const {origin} = await fixture(t, () => {throw new Error('must not run');});
  assert.equal((await fetch(`${origin}/ready`)).status,200);
  assert.equal((await fetch(`${origin}/fetch`,{method:'POST',body:'{}'})).status,401);
});
test('private, arbitrary and credential-bearing destinations are rejected', async t => {
  const {request} = await fixture(t, () => {throw new Error('must not run');});
  for(const url of ['http://127.0.0.1/','https://example.com/','https://user:pass@kisskh.co/api/DramaList/Show','https://kisskh.co/admin','https://evilcdnvideo11.shop/file']) {
    assert.equal((await request(url)).status,403,url);
  }
});
test('successful JSON is cached, avoiding repeated source requests', async t => {
  let calls=0;
  const {request}=await fixture(t,async () => {calls++;return Response.json([{id:10903}]);});
  for(let i=0;i<2;i++) assert.deepEqual(await (await request('https://kisskh.co/api/DramaList/Show')).json(),[{id:10903}]);
  assert.equal(calls,1);
});
test('Cloudflare challenge remains visible and is never cached', async t => {
  let calls=0;
  const {request}=await fixture(t,async () => {calls++;return new Response('challenge',{status:403,headers:{'cf-mitigated':'challenge','Content-Type':'text/html'}});});
  for(let i=0;i<2;i++) {
    const response=await request('https://kisskh.co/api/DramaList/Show');
    assert.equal(response.status,403);
    assert.equal(response.headers.get('cf-mitigated'),'challenge');
    await response.text();
  }
  assert.equal(calls,2);
});
test('source redirects cannot turn the backend into an open proxy', async t => {
  const {request}=await fixture(t,async () => new Response(null,{status:302,headers:{Location:'https://127.0.0.1/private'}}));
  assert.equal((await request('https://kisskh.co/api/DramaList/Show')).status,502);
});
test('media byte ranges and response bytes are preserved', async t => {
  const {request}=await fixture(t,async (_,options) => {
    assert.equal(options.headers.Range,'bytes=0-3');
    return new Response(new Uint8Array([0,1,2,3]),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/100','Content-Length':'999'}});
  });
  const response=await request('https://hls08.cdnvideo11.shop/movie.mp4','bytes=0-3');
  assert.equal(response.status,206);
  assert.equal(response.headers.get('content-range'),'bytes 0-3/100');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[0,1,2,3]);
});
