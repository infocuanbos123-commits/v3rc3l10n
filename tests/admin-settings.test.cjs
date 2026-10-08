const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const Module=require('node:module');
const root=path.resolve(__dirname,'..');
const resolve=Module._resolveFilename;
Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,...args);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,file);
const auth=require('../src/lib/admin-auth.ts');
const settings=require('../src/lib/admin-settings.ts');
const session=require('../src/app/api/admin/session/route.ts');
const hidden=require('../src/app/api/admin/hidden/route.ts');
const browse=require('../src/app/api/browse-policy/route.ts');
const {NextRequest}=require('next/server');
const realFetch=global.fetch;
const originalEnv={...process.env};
const records=new Map();
test.beforeEach(()=>{
  process.env.ADMIN_ACCESS_CODE='test-secret-code';
  process.env.ADMIN_SESSION_SECRET='test-signing-secret-with-32-characters';
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN='private-test-token';
  records.clear();
  if(global.__adminHiddenTitles){global.__adminHiddenTitles.expires=0;global.__adminHiddenTitles.pending=undefined;}
  global.fetch=async(url,options)=>{
    assert.equal(String(url),'https://redis.example/');
    assert.equal(options.headers.Authorization,'Bearer private-test-token');
    const [command,,id,value]=JSON.parse(options.body);
    if(command==='HSET'){records.set(id,value);return Response.json({result:1});}
    if(command==='HDEL'){records.delete(id);return Response.json({result:1});}
    if(command==='HGETALL') return Response.json({result:[...records].flat()});
    if(command==='INCR') return Response.json({result:1});
    if(command==='EXPIRE') return Response.json({result:1});
    throw new Error(`Unexpected command ${command}`);
  };
});
test.afterEach(()=>{global.fetch=realFetch;for(const key of ['ADMIN_ACCESS_CODE','ADMIN_SESSION_SECRET','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN']){if(originalEnv[key]===undefined)delete process.env[key];else process.env[key]=originalEnv[key];}});
function request(pathname,method='GET',data,cookie,origin='http://localhost'){
  return new NextRequest(`http://localhost${pathname}`,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:`${auth.ADMIN_COOKIE}=${cookie}`}:{})},...(data?{body:JSON.stringify(data)}:{})});
}
test('access codes and signed sessions reject tampering, expiry and code rotation',()=>{
  assert.equal(auth.checkAdminCode('wrong'),false);
  assert.equal(auth.checkAdminCode('test-secret-code'),true);
  const now=Date.now();
  const token=auth.makeAdminSession(now);
  assert.equal(auth.validAdminSession(token,now),true);
  assert.equal(auth.validAdminSession(token+'x',now),false);
  assert.equal(auth.validAdminSession(token,now+(auth.SESSION_SECONDS+1)*1000),false);
  process.env.ADMIN_ACCESS_CODE='new-code';
  assert.equal(auth.validAdminSession(token,now),false);
});
test('login rejects wrong codes and cross-origin calls; success uses an HttpOnly cookie',async()=>{
  assert.equal((await session.POST(request('/api/admin/session','POST',{code:'wrong'}))).status,401);
  assert.equal((await session.POST(request('/api/admin/session','POST',{code:'test-secret-code'},undefined,'https://evil.example'))).status,403);
  const response=await session.POST(request('/api/admin/session','POST',{code:'test-secret-code'}));
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie');
  assert.ok(/HttpOnly/i.test(cookie));assert.ok(/SameSite=strict/i.test(cookie));
  assert.ok(!cookie.includes('test-secret-code'));
});
test('hidden settings cannot be read or modified without an admin session',async()=>{
  assert.equal((await hidden.GET(request('/api/admin/hidden'))).status,401);
  assert.equal((await hidden.PUT(request('/api/admin/hidden','PUT',{action:'hide',id:10903,title:'Against The Current'}))).status,401);
  const token=auth.makeAdminSession();
  assert.equal((await hidden.PUT(request('/api/admin/hidden','PUT',{action:'hide',id:10903,title:'Against The Current'},token,'https://evil.example'))).status,403);
  assert.equal((await hidden.PUT(request('/api/admin/hidden','PUT',{action:'hide',id:-1,title:'Bad ID'},token))).status,400);
});
test('global manual hide affects anonymous browsing, persists across cache resets, and can be undone',async()=>{
  const token=auth.makeAdminSession();
  const response=await hidden.PUT(request('/api/admin/hidden','PUT',{action:'hide',id:10903,title:'Against The Current'},token));
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).items.map(item=>item.id),[10903]);
  global.__adminHiddenTitles.items=undefined;global.__adminHiddenTitles.expires=0;
  assert.deepEqual([...(await settings.hiddenTitleIds())],[10903]);
  const anonymous=await browse.GET(request('/api/browse-policy?ids=10903'));
  assert.deepEqual((await anonymous.json()).hidden,[10903]);
  const undo=await hidden.PUT(request('/api/admin/hidden','PUT',{action:'show',id:10903},token));
  assert.deepEqual((await undo.json()).items,[]);
  assert.deepEqual((await (await browse.GET(request('/api/browse-policy?ids=10903'))).json()).hidden,[]);
});
test('shared storage failures do not pretend that admin changes were saved',async()=>{
  global.fetch=async()=>new Response('unavailable',{status:503});
  assert.equal((await hidden.PUT(request('/api/admin/hidden','PUT',{action:'hide',id:10903,title:'Against'},auth.makeAdminSession()))).status,503);
});
