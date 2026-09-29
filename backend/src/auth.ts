import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, RequestHandler } from 'express';
import { AuthStore, AppError, type Session } from './authStore.js';

export const SESSION_COOKIE = 'vpr_session';
export const GUEST_COOKIE = 'vpr_guest';
export function cookieValue(req: Request, name: string) {
  return req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1);
}
export function setSessionCookie(res: Response, token: string, session: Session) {
  res.cookie(session.role === 'member' ? SESSION_COOKIE : GUEST_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    path: '/', maxAge: session.role === 'member' ? 7 * 86400000 : 90 * 86400000,
  });
}
export function currentSession(req: Request, store: AuthStore) {
  return store.findSession(cookieValue(req, SESSION_COOKIE)) || store.findSession(cookieValue(req, GUEST_COOKIE));
}
export function csrfMatches(actual: string | undefined, expected: string) {
  if (typeof actual !== 'string') return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function requireSession(store: AuthStore, mutation = false): RequestHandler {
  return (req, res, next) => {
    const session = currentSession(req, store);
    if (!session) { next(new AppError(401, 'AUTH_REQUIRED', 'Phiên đã hết hạn. Vui lòng kết nối lại để tiếp tục.')); return; }
    if (mutation && !csrfMatches(req.get('X-CSRF-Token'), session.csrf)) { next(new AppError(403, 'SESSION_CHANGED', 'Phiên đăng nhập đã thay đổi. Hãy thử lại sau khi cập nhật tài khoản.')); return; }
    res.locals.session = session;
    next();
  };
}
export function sessionOf(res: Response): Session { return res.locals.session as Session; }

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt-v1:${salt.toString('hex')}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, stored?: string) {
  const parts = (stored || `scrypt-v1:${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt-v1' || !/^[0-9a-f]{32}$/.test(parts[1]) || !/^[0-9a-f]{128}$/.test(parts[2])) return false;
  const actual = await derive(password, Buffer.from(parts[1], 'hex'));
  return timingSafeEqual(actual, Buffer.from(parts[2], 'hex')) && Boolean(stored);
}
