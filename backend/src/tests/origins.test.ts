import assert from 'node:assert/strict';
import { test } from 'node:test';
import { frontendOrigins } from '../origins.js';
import { AuthStore } from '../authStore.js';
import { createApp } from '../app.js';

test('development origin aliases keep the exact protocol and port and normalize a trailing slash', () => {
  assert.deepEqual(frontendOrigins(' http://localhost:5173/ ', false), ['http://localhost:5173','http://127.0.0.1:5173']);
  assert.deepEqual(frontendOrigins('http://127.0.0.1:5173', false), ['http://127.0.0.1:5173','http://localhost:5173']);
  assert.deepEqual(frontendOrigins('https://app.example.test/,http://localhost:5174', false), ['https://app.example.test','http://localhost:5174','http://127.0.0.1:5174']);
  const allowed = frontendOrigins('http://localhost:5173,http://127.0.0.1:5173', false);
  assert.equal(allowed.length, 2);
  for (const origin of ['http://localhost:5174','https://localhost:5173','http://localhost.evil.test:5173','http://127.0.0.1.evil.test:5173','null']) assert.ok(!allowed.includes(origin));
});

test('production origins are explicit and malformed configuration is rejected', () => {
  assert.deepEqual(frontendOrigins('http://localhost:5173/',true), ['http://localhost:5173']);
  assert.deepEqual(frontendOrigins('https://app.example.test',true), ['https://app.example.test']);
  for (const invalid of ['*','null','file:///tmp/app','http://user:password@localhost:5173','http://localhost:5173/path','http://localhost:5173/?q=x']) assert.throws(() => frontendOrigins(invalid,false));
});

test('configured localhost accepts IPv4 browser writes through the proxy, while CSRF and unrelated origins remain blocked', async () => {
  const previous = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = 'http://localhost:5173/';
  const store = new AuthStore(':memory:');
  const app = createApp({ store });
  if (previous === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = previous;
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening',resolve));
  const address=server.address(); assert.ok(address && typeof address !== 'string');
  const base=`http://127.0.0.1:${address.port}`;
  try {
    const boot=await fetch(`${base}/api/auth/session`);
    const cookie=boot.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    const csrf=(await boot.json()).session.csrfToken;
    const post = async (origin: string, extra: Record<string,string>={}) => {
      const r=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf,'Sec-Fetch-Site':'same-origin',Origin:origin,...extra},body:'{}'});
      return {status:r.status,data:await r.json(),cors:r.headers.get('access-control-allow-origin')};
    };
    for (const origin of ['http://localhost:5173','http://127.0.0.1:5173']) {
      const accepted=await post(origin);
      assert.equal(accepted.status,400); // Reaches credential validation, not origin rejection.
      assert.equal(accepted.data.code,'INVALID_INPUT');
      assert.equal(accepted.cors,origin);
    }
    assert.equal((await post('http://127.0.0.1:5173',{'X-CSRF-Token':''})).data.code,'SESSION_CHANGED');
    for (const origin of ['https://evil.example','http://localhost:5174','http://localhost.evil.example:5173','null']) {
      assert.equal((await post(origin)).data.code,'ORIGIN_REJECTED');
    }
    assert.equal((await post('https://evil.example',{'X-Forwarded-Host':'evil.example','X-Forwarded-Proto':'https'})).data.code,'ORIGIN_REJECTED');
    assert.equal((await post('http://localhost:5173',{'Sec-Fetch-Site':'cross-site'})).data.code,'ORIGIN_REJECTED');
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve()));store.close(); }
});
