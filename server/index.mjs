import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  COVERS_DIR,
  DATA_DIR,
  createGuest,
  db,
  findUserByToken,
  publicUser,
  seedDemoContent,
  workCount,
} from './db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.DOUYU_PORT || 8787);
const HOST = process.env.DOUYU_HOST || '127.0.0.1';
const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
fs.mkdirSync(PDFS_DIR, { recursive: true });

seedDemoContent();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '30mb' }));

function authOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  req.user = findUserByToken(token);
  next();
}
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'AUTH', message: '先登录一下吧' });
  next();
}
app.use(authOptional);

function httpError(status, code, message, extra = {}) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.extra = extra;
  return err;
}

const workSelect = `
  SELECT w.*, u.name AS author_name, u.avatar_color, u.avatar_emoji,
    (SELECT COUNT(*) FROM likes l WHERE l.work_id = w.id) AS like_count,
    (SELECT COUNT(*) FROM likes l WHERE l.work_id = w.id AND l.user_id = ?) AS liked_n,
    (SELECT COUNT(*) FROM purchases p WHERE p.work_id = w.id AND p.user_id = ?) AS purchased_n,
    (SELECT COUNT(*) FROM collections c WHERE c.work_id = w.id) AS collect_count,
    (SELECT COUNT(*) FROM collections c WHERE c.work_id = w.id AND c.user_id = ?) AS collected_n,
    (SELECT COUNT(*) FROM comments c WHERE c.work_id = w.id) AS comment_count,
    (SELECT COUNT(*) FROM work_images wi WHERE wi.work_id = w.id) AS image_count
  FROM works w JOIN users u ON u.id = w.author_id
`;

function mapWork(row, viewerId) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    desc: row.desc,
    coverUrl: row.cover,
    author: {
      id: row.author_id,
      name: row.author_name,
      avatarColor: row.avatar_color,
      avatarEmoji: row.avatar_emoji,
    },
    beadCount: row.bead_count,
    partCount: row.part_count,
    price: row.price,
    sales: row.sales,
    likes: row.like_count,
    liked: Number(row.liked_n || 0) > 0,
    collects: Number(row.collect_count || 0),
    collected: Number(row.collected_n || 0) > 0,
    commentCount: Number(row.comment_count || 0),
    imageCount: Number(row.image_count || 0),
    unlocked:
      row.price === 0 ||
      (!!viewerId && row.author_id === viewerId) ||
      Number(row.purchased_n || 0) > 0,
    mine: !!viewerId && row.author_id === viewerId,
    createdAt: row.created_at,
    source: row.source_work_id
      ? { workId: row.source_work_id, title: row.source_title, author: row.source_author }
      : null,
  };
}

function getWorkImages(workId) {
  return db
    .prepare('SELECT url FROM work_images WHERE work_id = ? ORDER BY sort ASC, created_at ASC')
    .all(workId)
    .map((r) => r.url);
}

function getWorkRow(id, viewerId) {
  return db
    .prepare(`${workSelect} WHERE w.id = ?`)
    .get(viewerId || '', viewerId || '', viewerId || '', id);
}

/* ------------------------------- session ------------------------------- */

app.post('/api/session', (req, res) => {
  const token = String(req.body?.token || req.headers.authorization?.replace('Bearer ', '') || '');
  const existing = findUserByToken(token);
  if (existing) return res.json({ user: publicUser(existing), token: existing.token });
  const guest = createGuest();
  res.json({ user: publicUser(guest), token: guest.token });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.patch('/api/me', requireAuth, (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name || name.length > 12) {
    return res.status(400).json({ error: 'NAME', message: '昵称需要 1–12 个字' });
  }
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  res.json({ user: publicUser({ ...req.user, name }) });
});

/* -------------------------------- works -------------------------------- */

app.get('/api/works', (req, res) => {
  const viewerId = req.user?.id || '';
  const filter = String(req.query.filter || 'latest');
  const q = String(req.query.q || '').trim();
  const where = [];
  const params = [viewerId, viewerId, viewerId];

  if (q) {
    where.push('(w.title LIKE ? OR w.desc LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (filter === 'mine') {
    if (!viewerId) return res.json({ works: [] });
    where.push('w.author_id = ?');
    params.push(viewerId);
  }
  if (filter === 'collected') {
    if (!viewerId) return res.json({ works: [] });
    where.push('EXISTS (SELECT 1 FROM collections c WHERE c.work_id = w.id AND c.user_id = ?)');
    params.push(viewerId);
  }
  if (filter === 'unlocked') {
    if (!viewerId) return res.json({ works: [] });
    where.push(
      "(w.price = 0 OR w.author_id = ? OR EXISTS (SELECT 1 FROM purchases p WHERE p.work_id = w.id AND p.user_id = ?))",
    );
    params.push(viewerId, viewerId);
  }

  const order =
    filter === 'hot'
      ? 'like_count DESC, w.created_at DESC'
      : filter === 'collected'
        ? 'w.created_at DESC'
        : filter === 'unlocked'
          ? 'w.created_at DESC'
          : 'w.created_at DESC';

  const sql = `${workSelect} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order} LIMIT 60`;
  const rows = db.prepare(sql).all(...params);
  res.json({ works: rows.map((r) => mapWork(r, viewerId)) });
});

app.get('/api/stats', (_req, res) => {
  const works = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(bead_count),0) b, COALESCE(SUM(sales),0) s FROM works').get();
  const users = db.prepare('SELECT COUNT(*) n FROM users').get();
  res.json({ works: works.n, beads: works.b, users: users.n, unlocks: works.s });
});

app.get('/api/works/:id', (req, res) => {
  const viewerId = req.user?.id || '';
  const row = getWorkRow(req.params.id, viewerId);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  const work = mapWork(row, viewerId);
  work.images = [row.cover, ...getWorkImages(row.id)];
  if (work.unlocked) {
    work.scene = JSON.parse(row.scene);
  }
  res.json({ work });
});

app.post('/api/works/:id/unlock', requireAuth, (req, res) => {
  const viewerId = req.user.id;
  const row = getWorkRow(req.params.id, viewerId);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: '这件作品不在了' });
  const work = mapWork(row, viewerId);
  if (work.unlocked) {
    return res.json({
      work: { ...work, images: [row.cover, ...getWorkImages(row.id)], scene: JSON.parse(row.scene) },
      points: req.user.points,
      charged: 0,
    });
  }
  if (req.user.points < row.price) {
    return res.status(402).json({
      error: 'POINTS',
      message: '豆币不够，先去发布一件作品赚一点吧',
      need: row.price - req.user.points,
      points: req.user.points,
    });
  }
  try {
    db.exec('BEGIN IMMEDIATE');
    const upd = db
      .prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?')
      .run(row.price, viewerId, row.price);
    if (Number(upd.changes) === 0) throw httpError(402, 'POINTS', '豆币不够');
    db.prepare('INSERT OR IGNORE INTO purchases (user_id, work_id, price, created_at) VALUES (?,?,?,?)').run(
      viewerId,
      row.id,
      row.price,
      Date.now(),
    );
    db.prepare('UPDATE works SET sales = sales + 1 WHERE id = ?').run(row.id);
    db.exec('COMMIT');
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* noop */
    }
    if (e.status) return res.status(e.status).json({ error: e.code, message: e.message });
    throw e;
  }
  const fresh = getWorkRow(row.id, viewerId);
  const points = db.prepare('SELECT points FROM users WHERE id = ?').get(viewerId).points;
  res.json({
    work: { ...mapWork(fresh, viewerId), images: [row.cover, ...getWorkImages(row.id)], scene: JSON.parse(row.scene) },
    points,
    charged: row.price,
  });
});

app.post('/api/works/:id/like', requireAuth, (req, res) => {
  const viewerId = req.user.id;
  const row = db.prepare('SELECT * FROM works WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  if (row.author_id === viewerId) {
    return res.status(400).json({ error: 'SELF_LIKE', message: '自己的作品，留着给别人心动吧' });
  }
  const existing = db
    .prepare('SELECT 1 FROM likes WHERE user_id = ? AND work_id = ?')
    .get(viewerId, row.id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND work_id = ?').run(viewerId, row.id);
    db.prepare('UPDATE users SET points = MAX(0, points - 2) WHERE id = ?').run(row.author_id);
  } else {
    db.prepare('INSERT INTO likes (user_id, work_id, created_at) VALUES (?,?,?)').run(
      viewerId,
      row.id,
      Date.now(),
    );
    db.prepare('UPDATE users SET points = points + 2 WHERE id = ?').run(row.author_id);
  }
  const likes = db.prepare('SELECT COUNT(*) n FROM likes WHERE work_id = ?').get(row.id).n;
  res.json({ liked: !existing, likes });
});

/* ------------------------------ collections ----------------------------- */

app.post('/api/works/:id/collect', requireAuth, (req, res) => {
  const viewerId = req.user.id;
  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(req.params.id);
  if (!work) return res.status(404).json({ error: 'NOT_FOUND', message: '这件作品不在了' });
  const existing = db
    .prepare('SELECT 1 FROM collections WHERE user_id = ? AND work_id = ?')
    .get(viewerId, work.id);
  if (existing) {
    db.prepare('DELETE FROM collections WHERE user_id = ? AND work_id = ?').run(viewerId, work.id);
  } else {
    db.prepare('INSERT OR IGNORE INTO collections (user_id, work_id, created_at) VALUES (?,?,?)').run(
      viewerId,
      work.id,
      Date.now(),
    );
  }
  const collects = db.prepare('SELECT COUNT(*) n FROM collections WHERE work_id = ?').get(work.id).n;
  res.json({ collected: !existing, collects });
});

/* ------------------------------- reports -------------------------------- */

app.post('/api/reports', requireAuth, (req, res) => {
  const targetType = String(req.body?.targetType || '');
  const targetId = String(req.body?.targetId || '');
  const reason = String(req.body?.reason || '').trim().slice(0, 200);
  if (!['work', 'comment'].includes(targetType) || !targetId || !reason) {
    return res.status(400).json({ error: 'REPORT', message: '举报内容不完整' });
  }
  const exists =
    targetType === 'work'
      ? db.prepare('SELECT 1 FROM works WHERE id = ?').get(targetId)
      : db.prepare('SELECT 1 FROM comments WHERE id = ?').get(targetId);
  if (!exists) return res.status(404).json({ error: 'NOT_FOUND' });
  const id = `r_${crypto.randomUUID().slice(0, 10)}`;
  db.prepare(
    'INSERT INTO reports (id, target_type, target_id, user_id, reason, created_at) VALUES (?,?,?,?,?,?)',
  ).run(id, targetType, targetId, req.user.id, reason, Date.now());
  res.json({ ok: true });
});

/* ------------------------------- comments ------------------------------- */

function mapComment(row, viewerId) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    mine: !!viewerId && row.user_id === viewerId,
    replyTo: row.reply_to
      ? {
          id: row.reply_to,
          author: {
            id: row.reply_user_id,
            name: row.reply_author_name,
            avatarColor: row.reply_avatar_color,
            avatarEmoji: row.reply_avatar_emoji,
          },
        }
      : null,
    author: {
      id: row.user_id,
      name: row.author_name,
      avatarColor: row.avatar_color,
      avatarEmoji: row.avatar_emoji,
    },
  };
}

app.get('/api/works/:id/comments', (req, res) => {
  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(req.params.id);
  if (!work) return res.status(404).json({ error: 'NOT_FOUND' });
  const viewerId = req.user?.id || '';
  const rows = db
    .prepare(
      `SELECT c.*, u.name AS author_name, u.avatar_color, u.avatar_emoji,
        pu.id AS reply_user_id, pu.name AS reply_author_name,
        pu.avatar_color AS reply_avatar_color, pu.avatar_emoji AS reply_avatar_emoji
       FROM comments c JOIN users u ON u.id = c.user_id
       LEFT JOIN comments pc ON pc.id = c.reply_to
       LEFT JOIN users pu ON pu.id = pc.user_id
       WHERE c.work_id = ? ORDER BY c.created_at ASC LIMIT 100`,
    )
    .all(work.id);
  res.json({ comments: rows.map((r) => mapComment(r, viewerId)) });
});

app.post('/api/works/:id/comments', requireAuth, (req, res) => {
  const body = String(req.body?.body || '').trim();
  if (!body || body.length > 280) {
    return res.status(400).json({ error: 'COMMENT', message: '留言需要 1–280 个字' });
  }
  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(req.params.id);
  if (!work) return res.status(404).json({ error: 'NOT_FOUND', message: '这件作品不在了' });
  let replyTo = String(req.body?.replyTo || '') || null;
  if (replyTo) {
    const parent = db.prepare('SELECT id FROM comments WHERE id = ? AND work_id = ?').get(replyTo, work.id);
    if (!parent) replyTo = null;
  }
  const now = Date.now();
  const id = `c_${crypto.randomUUID().slice(0, 10)}`;
  db.prepare(
    'INSERT INTO comments (id, work_id, user_id, body, reply_to, created_at) VALUES (?,?,?,?,?,?)',
  ).run(id, work.id, req.user.id, body, replyTo, now);
  const row = db
    .prepare(
      `SELECT c.*, u.name AS author_name, u.avatar_color, u.avatar_emoji,
        pu.id AS reply_user_id, pu.name AS reply_author_name,
        pu.avatar_color AS reply_avatar_color, pu.avatar_emoji AS reply_avatar_emoji
       FROM comments c JOIN users u ON u.id = c.user_id
       LEFT JOIN comments pc ON pc.id = c.reply_to
       LEFT JOIN users pu ON pu.id = pc.user_id
       WHERE c.id = ?`,
    )
    .get(id);
  const count = db.prepare('SELECT COUNT(*) n FROM comments WHERE work_id = ?').get(work.id).n;
  res.json({ comment: mapComment(row, req.user.id), commentCount: count });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const row = db
    .prepare(
      `SELECT c.*, w.author_id FROM comments c JOIN works w ON w.id = c.work_id WHERE c.id = ?`,
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  if (row.user_id !== req.user.id && row.author_id !== req.user.id) {
    return res.status(403).json({ error: 'FORBIDDEN', message: '只能删自己的留言' });
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(row.id);
  const count = db.prepare('SELECT COUNT(*) n FROM comments WHERE work_id = ?').get(row.work_id).n;
  res.json({ ok: true, commentCount: count });
});

function validateColor(c) {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
}

function validateScene(scene) {
  if (!scene || typeof scene !== 'object' || !Array.isArray(scene.pieces)) {
    throw httpError(400, 'SCENE', '图纸数据不完整');
  }
  if (scene.pieces.length < 1) throw httpError(400, 'SCENE', '还没有熨出零件');
  if (scene.pieces.length > 80) throw httpError(400, 'SCENE', '零件太多了（最多 80 块）');
  let beadTotal = 0;
  const pieces = scene.pieces.map((p, index) => {
    if (!p || !Array.isArray(p.beads) || p.beads.length === 0 || p.beads.length > 6000) {
      throw httpError(400, 'SCENE', `第 ${index + 1} 块零件的数据有问题`);
    }
    beadTotal += p.beads.length;
    if (beadTotal > 30000) throw httpError(400, 'SCENE', '这张图太大了（最多 30000 颗豆）');
    const beads = p.beads.map((b) => {
      if (!Array.isArray(b) || b.length < 3) throw httpError(400, 'SCENE', '豆子坐标错误');
      const x = Number(b[0]);
      const y = Number(b[1]);
      const c = String(b[2]);
      if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > 5000 || Math.abs(y) > 5000) {
        throw httpError(400, 'SCENE', '豆子坐标超出范围');
      }
      if (!validateColor(c)) throw httpError(400, 'SCENE', '颜色值不合法');
      return [x, y, c.toLowerCase()];
    });
    const pos = Array.isArray(p.pos) ? p.pos : [0, 0];
    const posX = Math.round(Number(pos[0]) || 0);
    const posY = Math.round(Number(pos[1]) || 0);
    const t = p.t || {};
    const p3 = Array.isArray(t.p) ? t.p : [0, 0, 0];
    const r3 = Array.isArray(t.r) ? t.r : [0, 0, 0];
    const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
    return {
      id: String(p.id || `p${index}`).slice(0, 40),
      name: String(p.name || `零件 ${index + 1}`).slice(0, 24),
      beads,
      pos: [posX, posY],
      t: {
        p: [num(p3[0]), num(p3[1]), num(p3[2])],
        r: [num(r3[0]), num(r3[1]), num(r3[2])],
      },
    };
  });
  return { v: 1, pieces, beadTotal };
}

app.post('/api/works', requireAuth, (req, res) => {
  const title = String(req.body?.title || '').trim();
  const desc = String(req.body?.desc || '').trim();
  const price = Math.round(Number(req.body?.price ?? 0));
  const cover = String(req.body?.cover || '');
  if (!title || title.length > 30) {
    return res.status(400).json({ error: 'TITLE', message: '给作品起个 1–30 字的名字' });
  }
  if (desc.length > 400) {
    return res.status(400).json({ error: 'DESC', message: '描述最多 400 字' });
  }
  if (!Number.isFinite(price) || price < 0 || price > 999) {
    return res.status(400).json({ error: 'PRICE', message: '定价需要在 0–999 豆币之间' });
  }
  const scene = validateScene(req.body?.scene);
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(cover);
  if (!match) return res.status(400).json({ error: 'COVER', message: '缺少成品截图' });
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length < 2000 || buffer.length > 8 * 1024 * 1024) {
    return res.status(400).json({ error: 'COVER', message: '截图大小不合适' });
  }
  const ext = match[1] === 'jpeg' || match[1] === 'jpg' ? 'jpg' : match[1];
  const id = `w_${crypto.randomUUID().slice(0, 10)}`;
  const coverFile = `${id}.${ext}`;
  fs.writeFileSync(path.join(COVERS_DIR, coverFile), buffer);

  const rawImages = Array.isArray(req.body?.images) ? req.body.images.slice(0, 3) : [];
  const extraImages = [];
  for (let i = 0; i < rawImages.length; i++) {
    const img = String(rawImages[i] || '');
    const m = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(img);
    if (!m) continue;
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length < 500 || buf.length > 4 * 1024 * 1024) continue;
    const e = m[1] === 'jpeg' || m[1] === 'jpg' ? 'jpg' : m[1];
    const file = `${id}-${i + 2}.${e}`;
    fs.writeFileSync(path.join(COVERS_DIR, file), buf);
    extraImages.push(`/covers/${file}`);
  }

  let source = null;
  const sourceId = String(req.body?.sourceWorkId || '');
  if (sourceId) {
    const srow = db
      .prepare('SELECT w.id, w.title, u.name FROM works w JOIN users u ON u.id = w.author_id WHERE w.id = ?')
      .get(sourceId);
    if (srow) source = srow;
  }

  const now = Date.now();
  db.prepare(`
    INSERT INTO works (id, author_id, title, desc, cover, scene, bead_count, part_count, price, sales, created_at, source_work_id, source_title, source_author)
    VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?)`).run(
    id,
    req.user.id,
    title,
    desc,
    `/covers/${coverFile}`,
    JSON.stringify({ v: 1, pieces: scene.pieces }),
    scene.beadTotal,
    scene.pieces.length,
    price,
    now,
    source?.id || null,
    source?.title || null,
    source?.name || null,
  );
  extraImages.forEach((url, index) => {
    db.prepare('INSERT INTO work_images (id, work_id, url, sort, created_at) VALUES (?,?,?,?,?)').run(
      `wi_${crypto.randomUUID().slice(0, 10)}`,
      id,
      url,
      index + 1,
      now,
    );
  });
  db.prepare('UPDATE users SET points = points + 50 WHERE id = ?').run(req.user.id);
  const points = db.prepare('SELECT points FROM users WHERE id = ?').get(req.user.id).points;
  const row = getWorkRow(id, req.user.id);
  res.json({ work: mapWork(row, req.user.id), points, awarded: 50 });
});

/* ------------------------------- PDF tools ------------------------------- */

const CHROME =
  process.env.DOUYU_CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cdpRenderPage(pageUrl, outPath, profile) {
  const port = 9300 + Math.floor(Math.random() * 500);  const child = spawn(
    CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-extensions',
      '--hide-scrollbars',
      '--window-size=1200,1200',
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  );

  let ws = null;
  try {
    let page = null;
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        const list = await res.json();
        page = list.find((p) => p.type === 'page');
        if (page && page.webSocketDebuggerUrl) break;
      } catch (e) {}
      await sleep(250);
    }
    if (!page) throw new Error('Chrome 没有启动');

    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    let seq = 0;
    const pending = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      }
    });
    const cdp = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp('Page.navigate', { url: pageUrl });

    let done = false;
    for (let i = 0; i < 50; i++) {
      await sleep(300);
      try {
        const state = await cdp('Runtime.evaluate', {
          expression: '({done:!!window.__pdfDone,error:window.__pdfError||""})',
          returnByValue: true,
        });
        const value = state.result && state.result.value;
        if (value && value.done) {
          done = true;
          break;
        }
        if (value && value.error) throw new Error(value.error);
      } catch (e) {
        if (String(e).includes('PDF')) throw e;
      }
    }
    if (!done) throw new Error('PDF 页面渲染超时');

    const shot = await cdp('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
    });
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    let pages = 1;
    try {
      const info = await cdp('Runtime.evaluate', {
        expression: 'window.__pdfPages || 1',
        returnByValue: true,
      });
      pages = Number(info.result && info.result.value) || 1;
    } catch (e) {}
    return pages;
  } finally {
    try {
      if (ws) ws.close();
    } catch (e) {}
    try {
      child.kill();
    } catch (e) {}
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch (e) {}
  }
}

function renderPdfPage(pdfPath, outPath, pageNo = 1) {
  const profile = path.join(PDFS_DIR, `profile-${crypto.randomUUID().slice(0, 8)}`);
  const url = `http://127.0.0.1:${PORT}/pdf-render.html?file=${encodeURIComponent(
    `/pdfs/${path.basename(pdfPath)}`,
  )}&page=${encodeURIComponent(pageNo)}`;
  return cdpRenderPage(url, outPath, profile).then((pages) => {
    if (!fs.existsSync(outPath)) throw new Error('PDF 渲染失败');
    return pages;
  });
}

app.post('/api/tools/pdf', async (req, res, next) => {
  try {
    const raw = String(req.body?.data || '');
    const base64 = raw.includes(',') ? raw.split(',').pop() : raw;
    if (!base64) return res.status(400).json({ error: 'PDF', message: '没有收到 PDF 文件' });
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length < 1000 || buffer.length > 20 * 1024 * 1024) {
      return res.status(400).json({ error: 'PDF', message: 'PDF 大小不合适（最大 20MB）' });
    }
    const id = crypto.randomUUID().slice(0, 10);
    const pdfPath = path.join(PDFS_DIR, `${id}.pdf`);
    const pngPath = path.join(PDFS_DIR, `${id}.png`);
    fs.writeFileSync(pdfPath, buffer);
    const pages = await renderPdfPage(pdfPath, pngPath, 1);
    setTimeout(() => {
      try {
        fs.unlinkSync(pdfPath);
      } catch (e) {}
    }, 10 * 60 * 1000).unref();
    res.json({ url: `/pdfs/${id}.png`, width: 1200, height: 1200, pages, pdfId: id });
  } catch (e) {
    next(e);
  }
});

app.post('/api/tools/pdf/page', async (req, res, next) => {
  try {
    const id = String(req.body?.id || '');
    const page = Math.max(1, Math.min(50, Number(req.body?.page) || 1));
    if (!/^[a-f0-9-]{6,40}$/i.test(id)) {
      return res.status(400).json({ error: 'PDF', message: 'PDF 编号不对' });
    }
    const pdfPath = path.join(PDFS_DIR, `${id}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF', message: 'PDF 已过期，请重新选择文件' });
    }
    const pngPath = path.join(PDFS_DIR, `${id}-p${page}.png`);
    const pages = await renderPdfPage(pdfPath, pngPath, page);
    res.json({ url: `/pdfs/${id}-p${page}.png`, width: 1200, height: 1200, pages });
  } catch (e) {
    next(e);
  }
});

app.get('/pdf-render.html', (_req, res) => {
  res.sendFile(path.join(ROOT, 'server', 'pdf-render.html'));
});

app.use('/pdfjs', express.static(path.join(ROOT, 'node_modules', 'pdfjs-dist', 'build')));
app.use('/pdfs', express.static(PDFS_DIR, { maxAge: '1d', fallthrough: true }));

/* ------------------------------- static -------------------------------- */

app.use('/covers', express.static(COVERS_DIR, { maxAge: '7d', fallthrough: true }));

const dist = path.join(ROOT, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/covers')) {
      return next();
    }
    res.sendFile(path.join(dist, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.code || 'SERVER',
    message: err.message || '服务器开小差了',
    ...(err.extra || {}),
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[douyu] 豆屿服务 http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}  (作品 ${workCount()} 件)`);
  console.log(`[douyu] 数据目录 ${DATA_DIR}`);
});
