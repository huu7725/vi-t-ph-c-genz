import { Router } from 'express';
import { z } from 'zod';
import { AuthStore, AppError, digest } from '../authStore.js';
import { cookieValue, currentSession, GUEST_COOKIE, SESSION_COOKIE, hashPassword, verifyPassword, requireSession, sessionOf, setSessionCookie } from '../auth.js';

const email = z.string().trim().email('Email không hợp lệ.').max(254).transform(s => s.toLowerCase());
const password = z.string().min(10, 'Mật khẩu cần ít nhất 10 ký tự.').max(128, 'Mật khẩu tối đa 128 ký tự.');
const registerSchema = z.object({ name: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự.').max(60), email, password, importGuestLooks: z.boolean().default(true) }).strict();
// Existing seeded passwords are verified as stored; the 10-character rule applies to registration.
const loginSchema = z.object({ email, password: z.string().min(1, 'Vui lòng nhập mật khẩu.').max(128), importGuestLooks: z.boolean().default(false) }).strict();

export function authRoutes(store: AuthStore) {
  const router = Router();
  router.get('/session', (req, res) => {
    let session = currentSession(req, store);
    if (!session) { const created = store.createGuest(); session = created.session; setSessionCookie(res, created.token, session); }
    res.json({ session: store.snapshot(session), looks: store.getLooks(session.actorId) });
  });
  router.post('/register', requireSession(store, true), async (req, res, next) => {
    try {
      const current = sessionOf(res);
      if (current.role !== 'guest') throw new AppError(409, 'ALREADY_SIGNED_IN', 'Bạn đang đăng nhập. Hãy đăng xuất trước khi đổi tài khoản.');
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', parsed.error.issues[0].message);
      store.takeAttempt(`register:${digest(req.ip || 'unknown')}`, 15, 900000);
      const data = parsed.data;
      const hashed = await hashPassword(data.password);
      const created = store.register(data.name, data.email, hashed, data.importGuestLooks ? current.actorId : undefined);
      setSessionCookie(res, created.token, created.session);
      res.status(201).json({ session: store.snapshot(created.session), looks: store.getLooks(created.session.actorId) });
    } catch (error) { next(error); }
  });
  router.post('/login', requireSession(store, true), async (req, res, next) => {
    try {
      const current = sessionOf(res);
      if (current.role !== 'guest') throw new AppError(409, 'ALREADY_SIGNED_IN', 'Bạn đang đăng nhập. Hãy đăng xuất trước khi đổi tài khoản.');
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', parsed.error.issues[0].message);
      const data = parsed.data;
      store.takeAttempt(`login-ip:${digest(req.ip || 'unknown')}`, 30, 900000);
      store.takeAttempt(`login-email:${digest(data.email)}`, 8, 900000);
      const user = store.userByEmail(data.email);
      if (!await verifyPassword(data.password, user?.password_hash) || !user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu chưa đúng. Vui lòng thử lại.');
      const created = store.login(user, data.importGuestLooks ? current.actorId : undefined);
      setSessionCookie(res, created.token, created.session);
      res.json({ session: store.snapshot(created.session), looks: store.getLooks(created.session.actorId) });
    } catch (error) { next(error); }
  });
  router.post('/logout', requireSession(store, true), (req, res) => {
    const current = sessionOf(res);
    if (current.role === 'member') store.revoke(current);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    let guest = store.findSession(cookieValue(req, GUEST_COOKIE));
    if (!guest || guest.role !== 'guest') { const created = store.createGuest(); guest = created.session; setSessionCookie(res, created.token, guest); }
    res.json({ session: store.snapshot(guest), looks: store.getLooks(guest.actorId) });
  });
  return router;
}
