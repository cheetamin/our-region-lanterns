import { test } from 'node:test';
import assert from 'node:assert/strict';
import proxyApi from '../netlify/edge-functions/proxy-api.js';

const host = 'https://classroom.example.netlify.app';

async function withFetch(stub, run) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try { return await run(); } finally { globalThis.fetch = original; }
}

test('Netlify frontend can reach the isolated staging Worker with cookies and JSON body', async () => {
  await withFetch(async request => {
    assert.equal(request.url, 'https://our-region-netlify-staging.cheetamin.workers.dev/api/classrooms/enter?class=demo');
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.get('origin'), 'https://our-region-netlify-staging.cheetamin.workers.dev');
    assert.equal(request.headers.get('cookie'), 'lantern_session=abc');
    assert.equal(request.headers.get('x-lantern-request'), '1');
    assert.equal(await request.text(), '{"code":"demo"}');
    return Response.json({ok:true}, {status: 200, headers:{'Set-Cookie':'lantern_session=new; Path=/; HttpOnly; SameSite=Strict'}});
  }, async () => {
    const r = await proxyApi(new Request(host + '/api/classrooms/enter?class=demo', {
      method:'POST',
      headers:{'Origin':host,'Cookie':'lantern_session=abc','X-Lantern-Request':'1'},
      body:'{"code":"demo"}',
    }));
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.match(r.headers.get('set-cookie'), /lantern_session=new/);
  });
});

test('CSRF origin mismatch and missing custom header never reach backend', async () => {
  await withFetch(() => { throw Error('must not call backend'); }, async () => {
    for (const headers of [{origin:'https://other.example','x-lantern-request':'1'}, {origin:host}]) {
      const r = await proxyApi(new Request(host+'/api/classrooms/create', {method:'POST',headers,body:'{}'}));
      assert.equal(r.status, 403);
    }
  });
});

test('GET requests proxy while non-GET/POST methods fail closed', async () => {
  await withFetch(async request => {
    assert.equal(request.url,'https://our-region-netlify-staging.cheetamin.workers.dev/api/status');
    return Response.json({ready:true});
  }, async () => {
    const ok = await proxyApi(new Request(host+'/api/status'));
    assert.equal(ok.status,200);
    assert.equal(ok.headers.get('cache-control'), 'no-store');
    const invalid = await proxyApi(new Request(host+'/api/status',{method:'DELETE'}));
    assert.equal(invalid.status,405);
  });
});

test('upstream failure yields a private non-cacheable 503 response',async()=>{
 await withFetch(()=>{throw Error('private reason')},async()=>{
   const r=await proxyApi(new Request(host+'/api/status'));
   assert.equal(r.status,503);
   assert.equal(r.headers.get('cache-control'),'no-store');
   assert.ok(!(await r.text()).includes('private reason'));
 });
});
