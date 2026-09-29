import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AuthStore, AppError, dayWindow } from '../authStore.js';
import { createApp } from '../app.js';
import { csrfMatches } from '../auth.js';
import { defaultRequest, manualLook, fallbackRecommendations } from '../domain.js';
import type { RecommendProvider } from '../routes/recommendRoute.js';

const password = 'Test-password-2026!';
const ai: RecommendProvider = async request => ({ ...fallbackRecommendations(request), isFallback: false, looks: fallbackRecommendations(request).looks.map(l => ({ ...l, isFallback: false, source: 'gemini' })) });
function bodyFor(index = 0) {
  const l = manualLook({ ...defaultRequest, primaryColor: ['#1E5E58','#BC4749','#264653','#5E3054','#E9C46A'][index] });
  return { title: l.title, garmentId: l.garmentId, eventId: l.eventId, styleId: l.styleId, palette: l.palette, accessoryIds: l.accessoryIds, stylingReason: l.stylingReason, culturalFactIds: l.culturalFactIds, cautionRuleIds: l.cautionRuleIds, source: l.source };
}
async function fixture(provider: RecommendProvider = ai) {
  const store = new AuthStore(':memory:');
  const server = createApp({ store, recommend: provider }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  function client() {
    const cookies = new Map<string,string>(); let csrf = '';
    return {
      cookies, get csrf() { return csrf; },
      async call(url: string, method = 'GET', body?: unknown, extras: Record<string,string> = {}) {
        const res = await fetch(base + '/api' + url, { method, headers: { 'Content-Type': 'application/json', Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), 'X-CSRF-Token': csrf, ...extras }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        for (const cookie of res.headers.getSetCookie()) { const [name,...value] = cookie.split(';')[0].split('='); if (!value.join('=')) cookies.delete(name); else cookies.set(name, value.join('=')); }
        const data = await res.json(); if (data.session) csrf = data.session.csrfToken;
        return { res, data };
      },
    };
  }
  return { store, client, base, async close() { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); } };
}

test('register, password hashing, login, session revocation and persistent account wardrobe', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const boot = await c.call('/auth/session');
    assert.equal(boot.data.session.role, 'guest');
    assert.match(boot.res.headers.getSetCookie()[0], /HttpOnly/); assert.match(boot.res.headers.getSetCookie()[0], /SameSite=Lax/);
    await c.call('/lookbook','POST',bodyFor());
    const registered = await c.call('/auth/register','POST',{ name:'An Việt', email:'AN@EXAMPLE.TEST', password, importGuestLooks:true });
    assert.equal(registered.res.status,201); assert.equal(registered.data.session.role,'member'); assert.equal(registered.data.looks.length,1);
    assert.equal(registered.data.session.limits.aiPerDay,null);
    const row = f.store.userByEmail('an@example.test')!;
    assert.notEqual(row.password_hash,password); assert.match(row.password_hash,/^scrypt-v1:/);
    assert.ok(!JSON.stringify(registered.data).includes('password_hash'));
    const memberCookie = c.cookies.get('vpr_session')!;
    assert.ok(!JSON.stringify(f.store.db.prepare('SELECT * FROM sessions').all()).includes(memberCookie));
    const out = await c.call('/auth/logout','POST',{});
    assert.equal(out.data.session.role,'guest'); assert.equal(out.data.looks.length,0); assert.equal(f.store.findSession(memberCookie),undefined);
    const wrong = await c.call('/auth/login','POST',{email:'an@example.test',password:'wrong-password-2026'});
    assert.equal(wrong.res.status,401);
    const login = await c.call('/auth/login','POST',{email:' AN@example.test ',password});
    assert.equal(login.res.status,200); assert.equal(login.data.looks.length,1);
    const otherDevice = f.client(); await otherDevice.call('/auth/session');
    const sameUser = await otherDevice.call('/auth/login','POST',{email:'an@example.test',password});
    assert.equal(sameUser.data.looks.length,1);
    const duplicate = f.client(); await duplicate.call('/auth/session');
    assert.equal((await duplicate.call('/auth/register','POST',{name:'Other',email:'an@example.test',password})).res.status,409);
  } finally { await f.close(); }
});

test('guest wardrobe limit is enforced atomically, deduplicated and scoped to owner', async () => {
  const f = await fixture();
  try {
    const a = f.client(), b = f.client(); await a.call('/auth/session'); await b.call('/auth/session');
    const results = await Promise.all([0,1,2,3].map(i => a.call('/lookbook','POST',bodyFor(i))));
    assert.equal(results.filter(r => r.res.status === 201).length,3);
    assert.equal(results.filter(r => r.data.code === 'LOOKBOOK_LIMIT').length,1);
    const wardrobe = await a.call('/lookbook'); const id = wardrobe.data.looks[0].id;
    const ownedLook = wardrobe.data.looks[0];
    assert.equal((await a.call('/lookbook','POST',bodyFor(['#1E5E58','#BC4749','#264653','#5E3054'].indexOf(ownedLook.palette[0])))).res.status,200);
    assert.equal((await b.call('/lookbook')).data.looks.length,0);
    assert.equal((await b.call(`/lookbook/${id}`,'DELETE')).res.status,404);
    assert.equal((await a.call(`/lookbook/${id}`,'DELETE')).res.status,200);
    assert.equal((await a.call('/lookbook')).data.looks.length,2);
    assert.equal((await a.call('/lookbook','POST',bodyFor(4))).res.status,201);
    assert.equal((await a.call('/auth/session')).data.session.usage.lookbookCount,3);
  } finally { await f.close(); }
});

test('guest has exactly 3 successful AI uses, cannot bypass with role fields or refresh, logout preserves quota', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const original = (await c.call('/auth/session')).data.session.actorId;
    assert.equal((await c.call('/recommend','POST',{...defaultRequest,role:'member'})).res.status,400);
    for (let i=0;i<3;i++) { const r = await c.call('/recommend','POST',defaultRequest); assert.equal(r.res.status,200); assert.equal(r.data.session.usage.aiRemaining,2-i); }
    assert.equal((await c.call('/auth/session')).data.session.usage.aiRemaining,0);
    assert.equal((await c.call('/recommend','POST',defaultRequest)).data.code,'AI_LIMIT');
    await c.call('/auth/register','POST',{name:'Guest Upgrade',email:'upgrade@example.test',password});
    assert.equal((await c.call('/recommend','POST',defaultRequest)).res.status,200);
    const loggedOut = await c.call('/auth/logout','POST',{});
    assert.equal(loggedOut.data.session.actorId,original); assert.equal(loggedOut.data.session.usage.aiRemaining,0);
    assert.equal((await c.call('/recommend','POST',defaultRequest)).res.status,429);
  } finally { await f.close(); }
});

test('fallback, invalid requests and provider failures do not charge guest AI', async () => {
  let count=0;
  const f=await fixture(async req => { count++; if(count===2) throw new Error('private provider details'); return fallbackRecommendations(req); });
  try {
    const c=f.client(); await c.call('/auth/session');
    assert.equal((await c.call('/recommend','POST',{})).res.status,400);
    assert.equal((await c.call('/recommend','POST',defaultRequest)).data.isFallback,true);
    const failed=await c.call('/recommend','POST',defaultRequest); assert.equal(failed.res.status,500); assert.ok(!JSON.stringify(failed.data).includes('private provider details'));
    assert.equal((await c.call('/auth/session')).data.session.usage.aiRemaining,3);
  } finally { await f.close(); }
});

test('simultaneous AI requests cannot overspend the final slot', async () => {
  const f=await fixture(async req => { await new Promise(resolve => setTimeout(resolve,50)); return ai(req); });
  try {
    const c=f.client(); await c.call('/auth/session');
    await c.call('/recommend','POST',defaultRequest); await c.call('/recommend','POST',defaultRequest);
    const results=await Promise.all([1,2,3].map(() => c.call('/recommend','POST',defaultRequest)));
    assert.equal(results.filter(r => r.res.status===200).length,1);
    assert.equal((await c.call('/auth/session')).data.session.usage.aiUsed,3);
  } finally { await f.close(); }
});

test('CSRF, cross-origin writes, unauthenticated writes and client role escalation are rejected', async () => {
  const f=await fixture();
  try {
    const c=f.client(); assert.equal((await c.call('/lookbook','POST',bodyFor())).res.status,401); await c.call('/auth/session');
    assert.equal((await c.call('/lookbook','POST',bodyFor(),{'X-CSRF-Token':''})).res.status,403);
    assert.equal((await c.call('/lookbook','POST',bodyFor(),{Origin:'https://evil.example'})).res.status,403);
    assert.equal((await c.call('/auth/register','POST',{name:'Escalation',email:'x@example.test',password,role:'admin'})).res.status,400);
    assert.equal(csrfMatches('é'.repeat(43),'a'.repeat(43)),false);
    const oldCsrf=c.csrf; await c.call('/auth/register','POST',{name:'Member',email:'member@example.test',password});
    assert.equal((await c.call('/lookbook','POST',bodyFor(),{'X-CSRF-Token':oldCsrf})).data.code,'SESSION_CHANGED');
  } finally { await f.close(); }
});

test('login import is opt-in; two users never share or delete each other’s wardrobe', async () => {
  const f=await fixture();
  try {
    const a=f.client(),b=f.client(); await a.call('/auth/session');await b.call('/auth/session');
    await a.call('/auth/register','POST',{name:'User A',email:'a@example.test',password});
    await a.call('/lookbook','POST',bodyFor());
    await b.call('/auth/register','POST',{name:'User B',email:'b@example.test',password});
    assert.equal((await b.call('/lookbook')).data.looks.length,0);
    const id=(await a.call('/lookbook')).data.looks[0].id;
    assert.equal((await b.call(`/lookbook/${id}`,'DELETE')).res.status,404);
    await a.call('/auth/logout','POST',{}); await a.call('/lookbook','POST',bodyFor(1));
    const login=await a.call('/auth/login','POST',{email:'a@example.test',password});
    assert.equal(login.data.looks.length,1);
    await a.call('/auth/logout','POST',{});
    const merged=await a.call('/auth/login','POST',{email:'a@example.test',password,importGuestLooks:true});
    assert.equal(merged.data.looks.length,2);
  } finally { await f.close(); }
});

test('midnight Vietnam reset and persistent SQLite storage survive reopening', () => {
  let now=Date.parse('2026-09-28T16:59:59Z');
  const dir=mkdtempSync(path.join(os.tmpdir(),'viet-phuc-auth-test-'));
  const filename=path.join(dir,'test.sqlite');
  let store=new AuthStore(filename,()=>now);
  try {
    const guest=store.createGuest();
    store.saveLook(guest.session,manualLook(defaultRequest));
    for(let i=0;i<3;i++)store.finishAi(store.reserveAi(guest.session),true);
    assert.throws(()=>store.reserveAi(guest.session),AppError);
    store.close();store=new AuthStore(filename,()=>now);
    const restored=store.findSession(guest.token)!;
    assert.equal(store.getLooks(restored.actorId).length,1);assert.equal(store.snapshot(restored).usage.aiRemaining,0);
    now+=2000;
    assert.equal(store.snapshot(restored).usage.aiRemaining,3);
    assert.equal(dayWindow(now).day,'2026-09-29');
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});

test('authentication attempt limiter persists and expires after its window', () => {
  let now=1000000;const store=new AuthStore(':memory:',()=>now);
  try{ for(let i=0;i<3;i++)store.takeAttempt('login-test',3,1000);assert.throws(()=>store.takeAttempt('login-test',3,1000),AppError);now+=1001;assert.doesNotThrow(()=>store.takeAttempt('login-test',3,1000)); }finally{store.close();}
});
