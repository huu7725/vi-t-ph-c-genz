import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { restoreLooks, type Look } from './domain.js';

export const limits = { guestAi: 3, guestLooks: 3, memberLooks: 100 };
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export interface Session { tokenHash: string; actorId: string; role: 'guest' | 'member'; csrf: string; expiresAt: number }
export interface UserRow { actor_id: string; email: string; name: string; password_hash: string }
export class AppError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export function dayWindow(now: number) {
  const offset = 7 * 60 * 60 * 1000;
  const day = new Date(now + offset).toISOString().slice(0, 10);
  return { day, resetsAt: new Date(Date.parse(`${day}T00:00:00Z`) + 86400000 - offset).toISOString() };
}

export class AuthStore {
  readonly db: DatabaseSync;
  constructor(filename = process.env.DATABASE_PATH || fileURLToPath(new URL('../var/remix.sqlite', import.meta.url)), readonly now = () => Date.now()) {
    if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS actors (id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('guest','member')));
      CREATE TABLE IF NOT EXISTS users (actor_id TEXT PRIMARY KEY REFERENCES actors(id), email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES actors(id), csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS sessions_actor ON sessions(actor_id);
      CREATE TABLE IF NOT EXISTS looks (actor_id TEXT NOT NULL REFERENCES actors(id), id TEXT NOT NULL, body TEXT NOT NULL, saved_at TEXT NOT NULL, PRIMARY KEY(actor_id,id));
      CREATE TABLE IF NOT EXISTS ai_usage (actor_id TEXT NOT NULL REFERENCES actors(id), day TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(actor_id,day));
      CREATE TABLE IF NOT EXISTS ai_reservations (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES actors(id), day TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS account_limits (
      actor_id TEXT PRIMARY KEY REFERENCES actors(id),
      ai_per_day INTEGER NOT NULL CHECK(ai_per_day > 0)
    );`);
    this.cleanup();
  }
  close() { this.db.close(); }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  cleanup() {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(this.now());
    this.db.prepare('DELETE FROM ai_reservations WHERE expires_at <= ?').run(this.now());
    this.db.prepare('DELETE FROM auth_attempts WHERE reset_at <= ?').run(this.now());
  }
  createGuest() {
    const actorId = randomUUID();
    this.db.prepare("INSERT INTO actors(id,role) VALUES (?, 'guest')").run(actorId);
    return this.issueSession(actorId, 'guest');
  }
  issueSession(actorId: string, role: Session['role']) {
    const token = randomBytes(32).toString('base64url');
    const session: Session = { tokenHash: digest(token), actorId, role, csrf: randomBytes(32).toString('base64url'), expiresAt: this.now() + (role === 'guest' ? 90 : 7) * 86400000 };
    this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').run(session.tokenHash, actorId, session.csrf, session.expiresAt);
    return { token, session };
  }
  findSession(token?: string): Session | undefined {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
    const row = this.db.prepare('SELECT s.*, a.role FROM sessions s JOIN actors a ON a.id=s.actor_id WHERE token_hash=? AND expires_at>?').get(digest(token), this.now()) as Record<string, string | number> | undefined;
    if (!row) return;
    return { tokenHash: String(row.token_hash), actorId: String(row.actor_id), role: row.role as Session['role'], csrf: String(row.csrf), expiresAt: Number(row.expires_at) };
  }
  revoke(session: Session) { this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.tokenHash); }
  userByEmail(email: string) { return this.db.prepare('SELECT * FROM users WHERE email=?').get(email) as unknown as UserRow | undefined; }
  register(name: string, email: string, passwordHash: string, guestId?: string) {
    return this.transaction(() => {
      if (this.userByEmail(email)) throw new AppError(409, 'EMAIL_EXISTS', 'Email này đã được đăng ký. Bạn có thể đăng nhập.');
      const actorId = randomUUID();
      this.db.prepare("INSERT INTO actors VALUES (?, 'member')").run(actorId);
      this.db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').run(actorId, email, name, passwordHash);
      if (guestId) this.transferGuest(guestId, actorId);
      return this.issueSession(actorId, 'member');
    });
  }
  transferGuest(guestId: string, userId: string) {
    const guest = this.db.prepare("SELECT id FROM actors WHERE id=? AND role='guest'").get(guestId);
    if (!guest) return;
    const existingCount = this.countLooks(userId);
    const rows = this.db.prepare('SELECT id,body,saved_at FROM looks WHERE actor_id=? AND id NOT IN (SELECT id FROM looks WHERE actor_id=?)').all(guestId, userId) as { id: string; body: string; saved_at: string }[];
    if (existingCount + rows.length > limits.memberLooks) throw new AppError(409, 'LOOKBOOK_LIMIT', 'Tủ đồ tài khoản chưa đủ chỗ để chuyển các bản phối khách.');
    for (const row of rows) this.db.prepare('INSERT INTO looks VALUES (?, ?, ?, ?)').run(userId, row.id, row.body, row.saved_at);
    this.db.prepare('DELETE FROM looks WHERE actor_id=?').run(guestId);
  }
  login(user: UserRow, guestId?: string) {
    return this.transaction(() => { if (guestId) this.transferGuest(guestId, user.actor_id); return this.issueSession(user.actor_id, 'member'); });
  }
  countLooks(actorId: string) { return Number(this.db.prepare('SELECT count(*) AS n FROM looks WHERE actor_id=?').get(actorId)!.n); }
  getLooks(actorId: string) {
    const rows = this.db.prepare('SELECT body,saved_at FROM looks WHERE actor_id=? ORDER BY saved_at DESC, rowid DESC').all(actorId) as { body: string; saved_at: string }[];
    return restoreLooks(rows.map(row => ({ ...JSON.parse(row.body), savedAt: row.saved_at })));
  }
  saveLook(session: Session, look: Look) {
    return this.transaction(() => {
      const exists = this.db.prepare('SELECT id FROM looks WHERE actor_id=? AND id=?').get(session.actorId, look.id);
      if (exists) return false;
      const max = session.role === 'guest' ? limits.guestLooks : limits.memberLooks;
      if (this.countLooks(session.actorId) >= max) throw new AppError(403, 'LOOKBOOK_LIMIT', session.role === 'guest' ? 'Khách trải nghiệm lưu tối đa 3 bản phối. Đăng ký để mở rộng tủ đồ hoặc xóa một bản đã lưu.' : 'Tủ đồ đã có 100 bản phối. Hãy xóa bớt trước khi lưu thêm.');
      this.db.prepare('INSERT INTO looks VALUES (?, ?, ?, ?)').run(session.actorId, look.id, JSON.stringify(look), new Date(this.now()).toISOString());
      return true;
    });
  }
  deleteLook(session: Session, id: string) {
    const result = this.db.prepare('DELETE FROM looks WHERE actor_id=? AND id=?').run(session.actorId, id);
    if (!result.changes) throw new AppError(404, 'LOOK_NOT_FOUND', 'Bản phối không còn trong tủ đồ của bạn.');
  }
  snapshot(session: Session) {
    const { day, resetsAt } = dayWindow(this.now());
    const used = Number(this.db.prepare('SELECT used FROM ai_usage WHERE actor_id=? AND day=?').get(session.actorId, day)?.used || 0);
    const pending = Number(this.db.prepare('SELECT count(*) AS n FROM ai_reservations WHERE actor_id=? AND day=? AND expires_at>?').get(session.actorId, day, this.now())!.n);
    const user = this.db.prepare('SELECT actor_id AS id, name, email FROM users WHERE actor_id=?').get(session.actorId);
    const accountLimit = this.db.prepare('SELECT ai_per_day FROM account_limits WHERE actor_id=?').get(session.actorId);
    const aiPerDay = session.role === 'guest' ? limits.guestAi : accountLimit ? Number(accountLimit.ai_per_day) : null;
    return { actorId: session.actorId, role: session.role, user: user || null, csrfToken: session.csrf,
      limits: { aiPerDay, lookbook: session.role === 'guest' ? limits.guestLooks : limits.memberLooks },
      usage: { aiUsed: used, aiRemaining: aiPerDay === null ? null : Math.max(0, aiPerDay - used - pending), lookbookCount: this.countLooks(session.actorId), resetsAt, timezone: 'Asia/Ho_Chi_Minh' } };
  }
  reserveAi(session: Session) {
    return this.transaction(() => {
      this.cleanup();
      const snapshot = this.snapshot(session);
      if (snapshot.usage.aiRemaining === 0) throw new AppError(429, 'AI_LIMIT', session.role === 'guest' ? 'Bạn đã dùng hết 3 lượt AI hôm nay. Đăng ký hoặc quay lại sau 00:00 giờ Việt Nam.' : `Tài khoản đã dùng hết ${snapshot.limits.aiPerDay} lượt AI hôm nay. Quay lại sau 00:00 giờ Việt Nam.`);
      const pending = this.db.prepare('SELECT id FROM ai_reservations WHERE actor_id=?').get(session.actorId);
      if (pending) throw new AppError(409, 'AI_BUSY', 'Một yêu cầu AI đang được xử lý. Vui lòng chờ kết quả.');
      const id = randomUUID();
      this.db.prepare('INSERT INTO ai_reservations VALUES (?, ?, ?, ?)').run(id, session.actorId, dayWindow(this.now()).day, this.now() + 120000);
      return id;
    });
  }
  finishAi(id: string, success: boolean) {
    this.transaction(() => {
      const row = this.db.prepare('SELECT actor_id,day FROM ai_reservations WHERE id=?').get(id) as { actor_id: string; day: string } | undefined;
      if (!row) return;
      if (success) this.db.prepare('INSERT INTO ai_usage VALUES (?, ?, 1) ON CONFLICT(actor_id,day) DO UPDATE SET used=used+1').run(row.actor_id, row.day);
      this.db.prepare('DELETE FROM ai_reservations WHERE id=?').run(id);
    });
  }
  takeAttempt(key: string, max: number, windowMs: number) {
    this.transaction(() => {
      const row = this.db.prepare('SELECT count,reset_at FROM auth_attempts WHERE key=?').get(key) as { count: number; reset_at: number } | undefined;
      if (row && row.reset_at > this.now() && row.count >= max) throw new AppError(429, 'AUTH_RATE_LIMIT', 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.');
      if (!row || row.reset_at <= this.now()) this.db.prepare('INSERT OR REPLACE INTO auth_attempts VALUES (?, 1, ?)').run(key, this.now() + windowMs);
      else this.db.prepare('UPDATE auth_attempts SET count=count+1 WHERE key=?').run(key);
    });
  }
}
