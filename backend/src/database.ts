import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(__dirname, 'data', 'viet_phuc.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 1. Tạo bảng nếu chưa có
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'guest',
    ai_usage_count INTEGER DEFAULT 0,
    max_ai_quota INTEGER DEFAULT 3,
    last_ai_usage_date TEXT,
    saved_look_count INTEGER DEFAULT 0,
    max_save_quota INTEGER DEFAULT 3,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saved_looks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    garment_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    palette TEXT NOT NULL,
    accessories TEXT NOT NULL,
    styling_reason TEXT,
    cultural_facts TEXT,
    caution_rules TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// 2. SEED DATA TỰ ĐỘNG: Tạo sẵn tài khoản mẫu nếu CSDL chưa có dữ liệu
const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "user"').get() as { count: number };

if (userCount.count === 0) {
  console.log('[Database] Đang nạp tài khoản mẫu cho buổi Demo...');
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('123456', salt);
  const today = new Date().toISOString().slice(0, 10);

  // Tạo tài khoản Demo
  const seedUserId = 'user_demo_01';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, ai_usage_count, max_ai_quota, last_ai_usage_date, saved_look_count, max_save_quota, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    seedUserId,
    'Nguyễn Hữu Thuận',
    'demo@vietphuc.vn',
    defaultPasswordHash,
    'user',
    0,
    50,
    today,
    2,
    100,
    new Date().toISOString()
  );

  // Nạp sẵn 1 bản phối mẫu vào tủ đồ của tài khoản Demo
  db.prepare(`
    INSERT INTO saved_looks (id, user_id, title, garment_id, event_id, palette, accessories, styling_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'look_seed_01',
    seedUserId,
    'Thanh Xuân Di Sản (Áo Ngũ Thân & Quạt Tre)',
    'ao_ngu_than',
    'ky_yeu',
    JSON.stringify(['#1E5E58', '#FDFBF7']),
    JSON.stringify(['acc_quat_tre', 'acc_sneaker_trang']),
    'Phối màu xanh ngọc bích cùng nẹp trắng ngà thanh nhã cho ngày chụp ảnh kỷ yếu.',
    new Date().toISOString()
  );

  console.log('✅ Đã nạp xong tài khoản mẫu: demo@vietphuc.vn | Mật khẩu: 123456');
}