import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { buildSeedWorks } from './pattern.mjs';
import { renderCoverSvg } from './covers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = process.env.DOUYU_DATA || path.join(ROOT, 'data');
export const COVERS_DIR = path.join(DATA_DIR, 'covers');
fs.mkdirSync(COVERS_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'douyu.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 900,
  avatar_color TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  desc TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL,
  scene TEXT NOT NULL,
  bead_count INTEGER NOT NULL,
  part_count INTEGER NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  source_work_id TEXT,
  source_title TEXT,
  source_author TEXT
);
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  work_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, work_id)
);
CREATE TABLE IF NOT EXISTS purchases (
  user_id TEXT NOT NULL,
  work_id TEXT NOT NULL,
  price INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, work_id)
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS collections (
  user_id TEXT NOT NULL,
  work_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, work_id)
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS work_images (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  url TEXT NOT NULL,
  sort INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE INDEX IF NOT EXISTS idx_works_created ON works(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_work ON likes(work_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_work ON comments(work_id, created_at);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id, created_at DESC);
`);

// 兼容旧库：给留言补 reply_to 字段
{
  const cols = db.prepare('PRAGMA table_info(comments)').all();
  if (!cols.some((c) => c.name === 'reply_to')) {
    db.exec('ALTER TABLE comments ADD COLUMN reply_to TEXT');
  }
}

export const SEED_USERS = [
  { id: 'u_ado', name: '阿豆', color: '#E0582F', emoji: '🐱' },
  { id: 'u_iron', name: '小熨斗', color: '#1E8E8B', emoji: '🧲' },
  { id: 'u_kada', name: '咔嗒', color: '#2C5FBF', emoji: '🎮' },
  { id: 'u_doudou', name: '豆豆龙', color: '#5EA24B', emoji: '🍓' },
  { id: 'u_bean', name: '一颗豆', color: '#E5487E', emoji: '🌙' },
  { id: 'u_mint', name: '薄荷糖', color: '#8ECFBB', emoji: '🍃' },
  { id: 'u_pixel', name: '像素秋', color: '#EE8835', emoji: '🦊' },
  { id: 'u_night', name: '夜航', color: '#1F376D', emoji: '🐳' },
  { id: 'u_sugar', name: '糖霜', color: '#F5B0C0', emoji: '🍰' },
  { id: 'u_shroom', name: '香菇', color: '#6B4328', emoji: '🍄' },
  { id: 'u_cloud', name: '云朵机', color: '#A7CEE7', emoji: '☁️' },
  { id: 'u_lime', name: '青柠汽水', color: '#AECC47', emoji: '🥤' },
  { id: 'u_slow', name: '慢慢', color: '#B49AD9', emoji: '🐌' },
  { id: 'u_full', name: '小满', color: '#F5C24F', emoji: '🌾' },
  { id: 'u_tofu', name: '铁板豆腐', color: '#D8BC98', emoji: '🍢' },
  { id: 'u_half', name: '半颗豆', color: '#F7CCB3', emoji: '🫘' },
  { id: 'u_cat', name: '猫舌头', color: '#D6393B', emoji: '👅' },
  { id: 'u_typhoon', name: '九号台风', color: '#444A54', emoji: '🌀' },
];

const GUEST_EMOJI = ['🫘', '🌱', '🐣', '🍡', '🧵', '🪡', '🐚', '🪄'];
const GUEST_COLOR = ['#E0582F', '#1E8E8B', '#2C5FBF', '#5EA24B', '#E5487E', '#EE8835', '#78499B'];
const GUEST_NAMES = ['豆友', '新豆子', '小豆丁', '拼豆人', '熨斗新手', '格子居民'];

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    points: row.points,
    avatarColor: row.avatar_color,
    avatarEmoji: row.avatar_emoji,
    createdAt: row.created_at,
  };
}

export function createGuest() {
  const now = Date.now();
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  const name = `${GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)]} ${suffix}`;
  const user = {
    id: `u_${crypto.randomUUID().slice(0, 8)}`,
    token: crypto.randomUUID(),
    name,
    points: 900,
    color: GUEST_COLOR[Math.floor(Math.random() * GUEST_COLOR.length)],
    emoji: GUEST_EMOJI[Math.floor(Math.random() * GUEST_EMOJI.length)],
    createdAt: now,
  };
  db.prepare(
    'INSERT INTO users (id, token, name, points, avatar_color, avatar_emoji, created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(user.id, user.token, user.name, user.points, user.color, user.emoji, user.createdAt);
  return user;
}

export function findUserByToken(token) {
  if (!token) return null;
  const row = db.prepare('SELECT * FROM users WHERE token = ?').get(String(token));
  return row || null;
}

export function seedDemoContent({ silent = false } = {}) {
  const users = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  {
    const now = Date.now();
    const insert = db.prepare(
      'INSERT OR IGNORE INTO users (id, token, name, points, avatar_color, avatar_emoji, created_at) VALUES (?,?,?,?,?,?,?)',
    );
    for (let i = 0; i < SEED_USERS.length; i++) {
      const u = SEED_USERS[i];
      insert.run(
        u.id,
        `seed-token-${u.id}`,
        u.name,
        [420, 680, 240, 910, 560, 1200, 330][i % 7],
        u.color,
        u.emoji,
        now - (60 - i) * 86400000,
      );
    }
  }

  const works = db.prepare('SELECT COUNT(*) n FROM works').get().n;
  if (works > 0) return false;

  const defs = buildSeedWorks();
  const now = Date.now();
  const insertWork = db.prepare(`
    INSERT INTO works (id, author_id, title, desc, cover, scene, bead_count, part_count, price, sales, created_at, source_work_id, source_title, source_author)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertLike = db.prepare('INSERT OR IGNORE INTO likes (user_id, work_id, created_at) VALUES (?,?,?)');
  const allUsers = db.prepare('SELECT id FROM users').all().map((r) => r.id);

  defs.forEach((w, index) => {
    const svg = renderCoverSvg(w.scene);
    const coverFile = `${w.id}.svg`;
    fs.writeFileSync(path.join(COVERS_DIR, coverFile), svg, 'utf8');
    const createdAt = now - w.daysAgo * 86400000 - index * 120000;
    insertWork.run(
      w.id,
      w.author,
      w.title,
      w.desc,
      `/covers/${coverFile}`,
      JSON.stringify(w.scene),
      w.beadCount,
      w.partCount,
      w.price,
      Math.max(0, (w.likes * 3 + index * 5) % 17),
      createdAt,
      null,
      null,
      null,
    );
    const pool = allUsers.filter((id) => id !== w.author);
    const count = Math.min(w.likes, pool.length);
    for (let i = 0; i < count; i++) {
      const pick = pool[(i + index) % pool.length];
      insertLike.run(pick, w.id, createdAt + (i + 1) * 3600000);
    }
  });

  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded_at', ?)").run(String(now));
  if (!silent) {
    console.log(
      `[seed] ${defs.length} 件种子作品 / ${defs.reduce((n, w) => n + w.beadCount, 0)} 颗豆`,
    );
  }
  return true;
}

export function reseedDemoContent() {
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM works');
    db.exec('DELETE FROM likes');
    db.exec('DELETE FROM purchases');
    db.exec('DELETE FROM comments');
    db.exec('DELETE FROM collections');
    db.exec('DELETE FROM reports');
    db.exec('DELETE FROM work_images');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  seedDemoContent({ silent: false });
}

export function workCount() {
  return db.prepare('SELECT COUNT(*) n FROM works').get().n;
}
