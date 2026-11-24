/* 豆屿 · 拼豆小岛 —— 微信小游戏 Canvas 版核心
 * 这是一套独立的小游戏代码：game.js + game.json，不使用 WXML / web-view。
 * 先实现最核心的：29×29 拼板、选色、放豆/收豆、撤销、熨烫、清空。
 */
const sys = wx.getSystemInfoSync();
const W = sys.windowWidth;
const H = sys.windowHeight;
const DPR = Math.min(2, sys.pixelRatio || 1);
const SAFE_TOP = (sys.safeArea && sys.safeArea.top) || 20;
const SAFE_BOTTOM = sys.safeArea ? sys.safeArea.bottom : H;

const canvas = wx.createCanvas();
canvas.width = W * DPR;
canvas.height = H * DPR;
const ctx = canvas.getContext('2d');
ctx.scale(DPR, DPR);

const N = 29;
const COLORS = [
  { hex: '#E0582F', code: 'P08' },
  { hex: '#F5C24F', code: 'P05' },
  { hex: '#8ECFBB', code: 'P21' },
  { hex: '#4DA7D9', code: 'P18' },
  { hex: '#F5B0C0', code: 'P12' },
  { hex: '#B49AD9', code: 'P15' },
  { hex: '#2C5FBF', code: 'P17' },
  { hex: '#20222A', code: 'P30' },
];

const BG = '#F7EFE2';
const INK = '#2B2117';
const MUTED = '#8A7C68';
const BOARD = '#1B1D23';
const GRID = 'rgba(255,255,255,0.07)';
const CORAL = '#E0582F';
const MINT = '#8ECFBB';

function emptyBoard() {
  return Array.from({ length: N }, () => Array(N).fill(-1));
}

const STARTER = [
  [-1, -1, 2, 2, 2, -1, -1],
  [-1, 2, 2, 1, 2, 2, -1],
  [2, 2, 1, 1, 1, 2, 2],
  [2, 1, 1, 0, 1, 1, 2],
  [2, 2, 1, 1, 1, 2, 2],
  [-1, 2, 2, 1, 2, 2, -1],
  [-1, -1, 2, 2, 2, -1, -1],
];

function starterBoard() {
  const b = emptyBoard();
  const ox = Math.floor((N - STARTER.length) / 2);
  for (let y = 0; y < STARTER.length; y++) {
    for (let x = 0; x < STARTER[y].length; x++) {
      const c = STARTER[y][x];
      if (c >= 0) b[oy(y, ox)][x + ox] = c;
    }
  }
  return b;
}
function oy(y, ox) {
  return Math.floor((N - STARTER.length) / 2) + y;
}

const boardSize = Math.min(W - 28, Math.max(240, Math.min(H * 0.52, 360)));
const cell = boardSize / N;
const boardX = (W - boardSize) / 2;
const boardY = Math.max(SAFE_TOP + 68, 82);
const paletteY = boardY + boardSize + 34;
const paletteItem = (W - 32) / COLORS.length;
const toolbarY = H - 80;
const toolbarH = 44;
const toolbarItem = (W - 36) / 6;

let board = starterBoard();
let fused = Array.from({ length: N }, () => Array(N).fill(false));
let selected = 0;
let eraser = false;
let history = [];
let view3d = false;
let angle = -0.38;
let dragX = null;
let overlay = null; // 'menu' | 'inventory'
let rowMode = false;
let rowFocus = 0;
let stock = COLORS.map(() => 0);

/* ------------------------------ mini game API ---------------------------- */
// 开发者工具默认；真机请换成电脑局域网 IP 或 HTTPS 域名。
const API_BASE = 'http://127.0.0.1:8787';
let screen = 'studio'; // studio | gallery | detail
let token = '';
let me = null;
let works = [];
let worksLoading = false;
let galleryPage = 0;
let detail = null;
let comments = [];
let detailLoading = false;
let busyAction = '';
const coverCache = {};

function imageUrl(url) {
  if (!url) return '';
  return /^https?:\/\//.test(url) ? url : `${API_BASE}${url}`;
}

function cover(url) {
  const u = imageUrl(url);
  if (!u) return null;
  if (!coverCache[u]) {
    const img = wx.createImage();
    const entry = { img, ready: false };
    img.onload = () => {
      entry.ready = true;
      draw();
    };
    img.onerror = () => {};
    img.src = u;
    coverCache[u] = entry;
  }
  return coverCache[u];
}

function toast(title) {
  if (wx.showToast) wx.showToast({ title, icon: 'none' });
}

function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    if (!wx.request) return reject(new Error('当前环境不支持网络请求'));
    wx.request({
      url: `${API_BASE}${path}`,
      method,
      data: data || undefined,
      timeout: 10000,
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject({ status: res.statusCode, data: res.data });
      },
      fail: reject,
    });
  });
}

function ensureSession() {
  if (me && token) return Promise.resolve(me);
  try {
    token = wx.getStorageSync('douyu.game.token') || '';
  } catch (e) {}
  const body = token ? { token } : {};
  return request('/api/session', 'POST', body)
    .then((data) => {
      token = data.token;
      me = data.user;
      try {
        wx.setStorageSync('douyu.game.token', token);
      } catch (e) {}
      return me;
    })
    .catch(() => null);
}

function apiError(err) {
  const msg = err && err.data && (err.data.message || err.data.error);
  if (err && err.status === 402) return '豆币不够，先去攒一点';
  return msg || '网络没有连上';
}

function openGallery() {
  screen = 'gallery';
  overlay = null;
  rowMode = false;
  view3d = false;
  draw();
  loadGallery();
}

function loadGallery() {
  worksLoading = true;
  galleryPage = 0;
  draw();
  ensureSession()
    .then(() => request('/api/works?filter=latest'))
    .then((data) => {
      works = data.works || [];
      worksLoading = false;
      draw();
    })
    .catch((err) => {
      worksLoading = false;
      toast(apiError(err));
      draw();
    });
}

function openDetail(id) {
  screen = 'detail';
  detail = works.find((w) => w.id === id) || null;
  comments = [];
  detailLoading = true;
  draw();
  ensureSession()
    .then(() =>
      Promise.all([
        request(`/api/works/${encodeURIComponent(id)}`),
        request(`/api/works/${encodeURIComponent(id)}/comments`),
      ]),
    )
    .then(([w, c]) => {
      detail = w.work;
      comments = c.comments || [];
      detailLoading = false;
      draw();
    })
    .catch((err) => {
      detailLoading = false;
      toast(apiError(err));
      draw();
    });
}

function doAction(kind) {
  if (!detail || busyAction) return;
  const id = detail.id;
  if (kind === 'comment') {
    if (!wx.showModal) return;
    wx.showModal({
      title: '写留言',
      editable: true,
      placeholderText: '留一句给作者或下一位复刻的人…',
      success(res) {
        const body = String((res && (res.content || res.value)) || '').trim();
        if (!res.confirm || !body) return;
        busyAction = 'comment';
        ensureSession()
          .then(() => request(`/api/works/${encodeURIComponent(id)}/comments`, 'POST', { body }))
          .then(() => request(`/api/works/${encodeURIComponent(id)}/comments`))
          .then((c) => {
            comments = c.comments || [];
            detail.commentCount = comments.length;
            busyAction = '';
            draw();
          })
          .catch((err) => {
            busyAction = '';
            toast(apiError(err));
          });
      },
    });
    return;
  }

  const path =
    kind === 'like' ? 'like' : kind === 'collect' ? 'collect' : kind === 'unlock' ? 'unlock' : '';
  if (!path) return;
  if (kind === 'unlock' && detail.price > 0 && !detail.unlocked) {
    wx.showModal({
      title: '解锁这张图纸',
      content: `需要 ${detail.price} 豆币，解锁后可以继续改造。`,
      success(res) {
        if (res.confirm) runAction(kind, id);
      },
    });
    return;
  }
  runAction(kind, id);
}

function runAction(kind, id) {
  busyAction = kind;
  ensureSession()
    .then(() => request(`/api/works/${encodeURIComponent(id)}/${kind}`, 'POST', {}))
    .then((data) => {
      busyAction = '';
      if (kind === 'like') {
        detail.liked = data.liked;
        detail.likes = data.likes;
      } else if (kind === 'collect') {
        detail.collected = data.collected;
        detail.collects = data.collects;
      } else if (kind === 'unlock') {
        detail = data.work;
        if (me && typeof data.points === 'number') me.points = data.points;
        toast('图纸已解锁');
      }
      draw();
    })
    .catch((err) => {
      busyAction = '';
      toast(apiError(err));
      draw();
    });
}

function save() {
  try {
    wx.setStorageSync('douyu.game.board', {
      board: board.map((row) => row.join(',')),
      fused: fused.map((row) => row.map((v) => (v ? 1 : 0)).join(',')),
    });
  } catch (e) {}
}

function load() {
  try {
    const raw = wx.getStorageSync('douyu.game.board');
    if (!raw || !raw.board) return;
    const b = raw.board.map((row) => row.split(',').map(Number));
    if (b.length !== N) return;
    board = b;
    if (raw.fused) {
      fused = raw.fused.map((row) => row.split(',').map((v) => v === '1'));
    }
  } catch (e) {}
}

function loadStock() {
  try {
    const raw = wx.getStorageSync('douyu.game.stock');
    if (Array.isArray(raw) && raw.length === COLORS.length) {
      stock = raw.map((n) => Math.max(0, Number(n) || 0));
    }
  } catch (e) {}
}

function saveStock() {
  try {
    wx.setStorageSync('douyu.game.stock', stock);
  } catch (e) {}
}

function snap() {
  history.push({
    board: board.map((r) => r.slice()),
    fused: fused.map((r) => r.slice()),
  });
  if (history.length > 40) history.shift();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBead(cx, cy, r, color, isFused) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(0.6, r * 0.08);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.stroke();
  const hole = r * (isFused ? 0.16 : 0.25);
  ctx.beginPath();
  ctx.arc(cx, cy, hole, 0, Math.PI * 2);
  ctx.fillStyle = isFused ? 'rgba(20,20,22,0.55)' : BOARD;
  ctx.fill();
  if (r > 5) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, Math.PI * 1.08, Math.PI * 1.56);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(0.7, r * 0.1);
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function countBeads() {
  let n = 0;
  let f = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (board[y][x] >= 0) {
        n++;
        if (fused[y][x]) f++;
      }
    }
  }
  return { n, f };
}

function draw() {
  if (screen === 'gallery') {
    drawGallery();
    return;
  }
  if (screen === 'detail') {
    drawDetail();
    return;
  }
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // header
  ctx.beginPath();
  ctx.arc(23, SAFE_TOP + 18, 10, 0, Math.PI * 2);
  ctx.fillStyle = CORAL;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(23, SAFE_TOP + 18, 3.6, 0, Math.PI * 2);
  ctx.fillStyle = BOARD;
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = 'bold 23px sans-serif';
  ctx.fillText(view3d ? '豆屿 · 立体' : '豆屿', 40, SAFE_TOP + 26);
  ctx.fillStyle = MUTED;
  ctx.font = '11px sans-serif';
  ctx.fillText(
    view3d
      ? '2.5D 预览 · 左右拖动旋转'
      : rowMode
        ? `按行 · 第 ${rowFocus + 1} / ${N} 行`
        : '拼豆小岛 · 小游戏版',
    40,
    SAFE_TOP + 43,
  );

  const stat = countBeads();
  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`${stat.n} 颗`, W - 16, SAFE_TOP + 23);
  ctx.fillStyle = MUTED;
  ctx.font = '10px sans-serif';
  ctx.fillText(stat.f ? `已熨 ${stat.f}` : '点格子放豆', W - 16, SAFE_TOP + 39);
  ctx.textAlign = 'left';

  // menu + save
  roundRect(W - 182, SAFE_TOP + 46, 50, 22, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('集市', W - 157, SAFE_TOP + 61);
  ctx.textAlign = 'left';

  roundRect(W - 126, SAFE_TOP + 46, 50, 22, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('菜单', W - 101, SAFE_TOP + 61);
  ctx.textAlign = 'left';

  roundRect(W - 70, SAFE_TOP + 46, 54, 22, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('保存', W - 43, SAFE_TOP + 61);
  ctx.textAlign = 'left';

  if (overlay) {
    drawOverlay();
    return;
  }
  if (view3d) {
    draw3DScene();
    drawToolbar();
    drawFooter();
    return;
  }

  // board
  roundRect(boardX, boardY, boardSize, boardSize, 12);
  ctx.fillStyle = BOARD;
  ctx.fill();

  ctx.save();
  roundRect(boardX, boardY, boardSize, boardSize, 12);
  ctx.clip();
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 0.5;
  for (let i = 1; i < N; i++) {
    ctx.beginPath();
    ctx.moveTo(boardX + i * cell, boardY);
    ctx.lineTo(boardX + i * cell, boardY + boardSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(boardX, boardY + i * cell);
    ctx.lineTo(boardX + boardSize, boardY + i * cell);
    ctx.stroke();
  }

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const c = board[y][x];
      if (c < 0) continue;
      drawBead(
        boardX + (x + 0.5) * cell,
        boardY + (y + 0.5) * cell,
        cell * (fused[y][x] ? 0.47 : 0.43),
        COLORS[c].hex,
        fused[y][x],
      );
    }
  }

  if (stat.n === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('点格子，放一颗豆', W / 2, boardY + boardSize / 2);
    ctx.textAlign = 'left';
  }

  if (rowMode) {
    const fy = boardY + rowFocus * cell;
    ctx.fillStyle = 'rgba(15,16,20,0.66)';
    ctx.fillRect(boardX, boardY, boardSize, fy - boardY);
    ctx.fillRect(boardX, fy + cell, boardSize, boardSize - (fy - boardY) - cell);
    ctx.strokeStyle = CORAL;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boardX, fy, boardSize, cell);
  }
  ctx.restore();

  // palette
  ctx.fillStyle = INK;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('色卡', 16, paletteY - 11);
  ctx.fillStyle = MUTED;
  ctx.font = '9px sans-serif';
  ctx.fillText(eraser ? '橡皮模式：点豆子收走' : '点一下换色，点板上放豆', 48, paletteY - 11);

  for (let i = 0; i < COLORS.length; i++) {
    const cx = 16 + paletteItem * (i + 0.5);
    const cy = paletteY + 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[i].hex;
    ctx.fill();
    if (selected === i && !eraser) {
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = MUTED;
    ctx.font = '8px sans-serif';
    ctx.fillText(COLORS[i].code, cx, cy + 27);
    ctx.textAlign = 'left';
  }

  // toolbar
  if (rowMode) drawRowToolbar();
  else drawToolbar();
  drawFooter();
}

function drawRowToolbar() {
  const labels = ['上一行', '下一行', '退出'];
  const item = (W - 36) / 3;
  for (let i = 0; i < 3; i++) {
    const x = 18 + i * item;
    const w = item - 6;
    roundRect(x, toolbarY, w, toolbarH, 10);
    ctx.fillStyle = i === 2 ? '#FFFFFF' : 'rgba(255,255,255,0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(53,41,27,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = i === 2 ? MUTED : INK;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(labels[i], x + w / 2, toolbarY + 27);
    ctx.textAlign = 'left';
  }
}

function drawOverlay() {
  ctx.fillStyle = 'rgba(20,18,14,0.46)';
  ctx.fillRect(0, 0, W, H);
  if (overlay === 'menu') drawMenu();
  else if (overlay === 'inventory') drawInventory();
}

function drawMenu() {
  const x = W / 2 - 140;
  const y = SAFE_TOP + 120;
  const w = 280;
  const h = 300;
  roundRect(x, y, w, h, 18);
  ctx.fillStyle = BG;
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.12)';
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText('豆屿菜单', x + 20, y + 38);
  ctx.fillStyle = MUTED;
  ctx.font = '10px sans-serif';
  ctx.fillText('拼板、豆仓、按行跟做', x + 20, y + 55);

  const items = [
    ['豆仓 / 缺色', '查当前用豆和库存'],
    ['按行跟做', '一次亮一行'],
    ['保存图片', '把当前画面存相册'],
    ['关闭', '回到拼板'],
  ];
  for (let i = 0; i < items.length; i++) {
    const iy = y + 78 + i * 52;
    roundRect(x + 16, iy, w - 32, 42, 10);
    ctx.fillStyle = i === 3 ? 'rgba(255,255,255,0.45)' : '#FFFDF8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(53,41,27,0.10)';
    ctx.stroke();
    ctx.fillStyle = i === 3 ? MUTED : INK;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(items[i][0], x + 28, iy + 18);
    ctx.fillStyle = MUTED;
    ctx.font = '9px sans-serif';
    ctx.fillText(items[i][1], x + 28, iy + 32);
  }
}

function drawInventory() {
  const x = 16;
  const y = SAFE_TOP + 76;
  const w = W - 32;
  const h = H - SAFE_TOP - 150;
  roundRect(x, y, w, h, 16);
  ctx.fillStyle = BG;
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.12)';
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('豆仓 / 缺色', x + 16, y + 32);
  ctx.fillStyle = MUTED;
  ctx.font = '9px sans-serif';
  ctx.fillText('按当前拼板统计；库存点 +100 记一笔', x + 16, y + 49);

  const used = COLORS.map(() => 0);
  for (let yy = 0; yy < N; yy++) {
    for (let xx = 0; xx < N; xx++) {
      if (board[yy][xx] >= 0) used[board[yy][xx]]++;
    }
  }
  const rowH = Math.min(50, (h - 75) / COLORS.length);
  for (let i = 0; i < COLORS.length; i++) {
    const ry = y + 64 + i * rowH;
    ctx.beginPath();
    ctx.arc(x + 26, ry + 14, 10, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[i].hex;
    ctx.fill();

    ctx.fillStyle = INK;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${COLORS[i].code}`, x + 44, ry + 17);
    ctx.fillStyle = MUTED;
    ctx.font = '9px sans-serif';
    ctx.fillText(`用 ${used[i]}`, x + 86, ry + 17);
    const miss = Math.max(0, used[i] - stock[i]);
    ctx.fillStyle = miss ? CORAL : MUTED;
    ctx.fillText(`存 ${stock[i]}${miss ? ` · 缺 ${miss}` : ''}`, x + 132, ry + 17);

    roundRect(x + w - 68, ry + 1, 52, 26, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(53,41,27,0.14)';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('+100', x + w - 42, ry + 18);
    ctx.textAlign = 'left';
  }

  roundRect(x + 16, y + h - 44, 82, 30, 9);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.14)';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('返回', x + 57, y + h - 24);
  ctx.textAlign = 'left';
}

function drawScreenHeader(title) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  roundRect(16, SAFE_TOP + 12, 52, 28, 9);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('返回', 42, SAFE_TOP + 30);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(title, 82, SAFE_TOP + 32);
  if (me) {
    ctx.textAlign = 'right';
    ctx.fillStyle = MUTED;
    ctx.font = '10px sans-serif';
    ctx.fillText(`豆币 ${me.points}`, W - 16, SAFE_TOP + 30);
    ctx.textAlign = 'left';
  }
}

function fitText(text, maxW) {
  let s = String(text || '');
  if (ctx.measureText(s).width <= maxW) return s;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

function wrapped(text, x, y, maxW, lineH, maxLines) {
  let line = '';
  let lines = 0;
  for (const ch of String(text || '')) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      lines++;
      line = ch;
      if (lines >= maxLines) return;
    } else line = test;
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineH);
}

function drawCoverBox(work, x, y, w, h, radius) {
  roundRect(x, y, w, h, radius);
  ctx.fillStyle = '#E6D8C2';
  ctx.fill();
  const entry = cover((work.images && work.images[0]) || work.coverUrl);
  if (entry && entry.ready) {
    ctx.save();
    roundRect(x, y, w, h, radius);
    ctx.clip();
    ctx.drawImage(entry.img, x, y, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(work.title || '豆').slice(0, 1), x + w / 2, y + h / 2 + 6);
    ctx.textAlign = 'left';
  }
  ctx.strokeStyle = 'rgba(43,33,23,0.12)';
  ctx.lineWidth = 1;
  roundRect(x, y, w, h, radius);
  ctx.stroke();
}

function galleryCard(i) {
  const gap = 10;
  const cw = (W - 28 - gap) / 2;
  const ch = 154;
  const top = SAFE_TOP + 72;
  return {
    x: 14 + (i % 2) * (cw + gap),
    y: top + Math.floor(i / 2) * (ch + 10),
    w: cw,
    h: ch,
  };
}

function drawGallery() {
  drawScreenHeader('集市');
  if (worksLoading && !works.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('正在打开集市…', W / 2, H * 0.45);
    ctx.textAlign = 'left';
    return;
  }
  if (!works.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('集市还没有作品', W / 2, H * 0.45);
    ctx.textAlign = 'left';
    return;
  }

  const list = works.slice(galleryPage * 8, galleryPage * 8 + 8);
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const r = galleryCard(i);
    drawCoverBox(w, r.x, r.y, r.w, r.h - 47, 10);
    ctx.fillStyle = INK;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(fitText(w.title, r.w), r.x, r.y + r.h - 31);
    ctx.fillStyle = MUTED;
    ctx.font = '8px sans-serif';
    ctx.fillText(fitText(w.author && w.author.name, r.w - 44), r.x, r.y + r.h - 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = w.price ? CORAL : MUTED;
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText(w.price ? `${w.price} 豆币` : '免费', r.x + r.w, r.y + r.h - 16);
    ctx.textAlign = 'left';
  }

  if (works.length > 8) {
    const y = H - 56;
    roundRect(16, y, 78, 30, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.fillStyle = galleryPage > 0 ? INK : MUTED;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('上一页', 55, y + 19);
    roundRect(W - 94, y, 78, 30, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.fillStyle = galleryPage < Math.ceil(works.length / 8) - 1 ? INK : MUTED;
    ctx.fillText('下一页', W - 55, y + 19);
    ctx.textAlign = 'left';
  }
}

function detailRects() {
  const top = SAFE_TOP + 76;
  const coverH = 200;
  const btnY = top + coverH + 104;
  const collect = { x: 16, y: btnY, w: 102, h: 38 };
  const like = { x: 126, y: btnY, w: 102, h: 38 };
  const unlock = { x: 236, y: btnY, w: W - 252, h: 38 };
  const comment = { x: 16, y: btnY + 48, w: W - 32, h: 34 };
  return { top, coverH, btnY, collect, like, unlock, comment };
}

function drawDetail() {
  drawScreenHeader('作品');
  if (!detail) {
    ctx.fillStyle = MUTED;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(detailLoading ? '正在打开作品…' : '作品不在了', W / 2, H * 0.45);
    ctx.textAlign = 'left';
    return;
  }
  const r = detailRects();
  drawCoverBox(detail, 16, r.top, W - 32, r.coverH, 14);

  let y = r.top + r.coverH + 30;
  ctx.fillStyle = INK;
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(fitText(detail.title, W - 32), 16, y);
  y += 18;
  ctx.fillStyle = MUTED;
  ctx.font = '9px sans-serif';
  ctx.fillText(
    `${detail.author ? detail.author.name : '豆友'} · ${detail.partCount || 0} 块零件 · ${detail.beadCount || 0} 颗豆`,
    16,
    y,
  );
  y += 18;
  ctx.fillStyle = '#5F5548';
  ctx.font = '10px sans-serif';
  wrapped(detail.desc || '作者还没有写介绍。', 16, y, W - 32, 15, 2);

  const buttons = [
    { r: r.collect, label: detail.collected ? `★ 已收藏 ${detail.collects}` : `☆ 收藏 ${detail.collects}` },
    { r: r.like, label: detail.liked ? `♥ 已心动 ${detail.likes}` : `♡ 心动 ${detail.likes}` },
    {
      r: r.unlock,
      label: detail.unlocked ? '已解锁' : detail.price > 0 ? `解锁 ${detail.price}` : '免费',
    },
  ];
  for (const b of buttons) {
    roundRect(b.r.x, b.r.y, b.r.w, b.r.h, 9);
    ctx.fillStyle = b.r === r.unlock && !detail.unlocked ? CORAL : 'rgba(255,255,255,0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(53,41,27,0.15)';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = b.r === r.unlock && !detail.unlocked ? '#fff' : INK;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(b.label, b.r.x + b.r.w / 2, b.r.y + 23);
    ctx.textAlign = 'left';
  }

  roundRect(r.comment.x, r.comment.y, r.comment.w, r.comment.h, 9);
  ctx.fillStyle = '#FFFDF8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,41,27,0.12)';
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = '10px sans-serif';
  ctx.fillText(`留言 ${detail.commentCount || 0} · 点这里写一句`, r.comment.x + 12, r.comment.y + 22);

  const cy = r.comment.y + r.comment.h + 24;
  ctx.fillStyle = INK;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('最近留言', 16, cy);
  if (!comments.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '9px sans-serif';
    ctx.fillText('还没有留言，做第一个吧。', 16, cy + 20);
  } else {
    comments.slice(0, 3).forEach((c, i) => {
      const yy = cy + 20 + i * 35;
      ctx.fillStyle = INK;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(fitText(c.author ? c.author.name : '豆友', 120), 16, yy);
      ctx.fillStyle = MUTED;
      ctx.font = '9px sans-serif';
      ctx.fillText(fitText(c.body, W - 32), 16, yy + 14);
    });
  }

  if (detailLoading) {
    ctx.fillStyle = MUTED;
    ctx.font = '9px sans-serif';
    ctx.fillText('正在同步…', W - 80, SAFE_TOP + 30);
  }
}
function drawToolbar() {
  const tools = ['撤销', '橡皮', '熨烫', '图纸', view3d ? '返回' : '3D', '清空'];
  for (let i = 0; i < tools.length; i++) {
    const x = 18 + i * toolbarItem;
    const w = toolbarItem - 5;
    const active = (i === 1 && eraser) || (i === 4 && view3d);
    roundRect(x, toolbarY, w, toolbarH, 10);
    ctx.fillStyle = active ? CORAL : 'rgba(255,255,255,0.72)';
    ctx.fill();
    ctx.strokeStyle = active ? CORAL : 'rgba(53,41,27,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = active ? '#fff' : INK;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(tools[i], x + w / 2, toolbarY + 27);
    ctx.textAlign = 'left';
  }
}

function drawFooter() {
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(43,33,23,0.42)';
  ctx.font = '9px sans-serif';
  let text = '29 × 29 标准拼板 · 5mm 中豆 · 豆屿 BEAD ISLE';
  if (view3d) text = 'Canvas 2.5D 预览 · 完整 3D 待接 WebGL';
  else if (rowMode) {
    let n = 0;
    for (let x = 0; x < N; x++) if (board[rowFocus][x] >= 0) n++;
    text = `按行跟做 · 第 ${rowFocus + 1} 行 · 本行 ${n} 颗`;
  }
  ctx.fillText(text, W / 2, toolbarY - 12);
  ctx.textAlign = 'left';
}

function draw3DScene() {
  const stat = countBeads();
  if (!stat.n) {
    ctx.textAlign = 'center';
    ctx.fillStyle = MUTED;
    ctx.font = '13px sans-serif';
    ctx.fillText('先回拼板放几颗豆，再来看立体', W / 2, H * 0.48);
    ctx.textAlign = 'left';
    return;
  }

  const scale = Math.min((W - 40) / (N * 1.38), (H * 0.46) / (N * 0.58));
  const cx = W / 2;
  const cy = boardY + boardSize * 0.47;
  const center = (N - 1) / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const project = (x, y) => {
    const u = x - center;
    const v = y - center;
    const X = u * cos - v * sin;
    const Z = u * sin + v * cos;
    return { x: cx + X * scale, y: cy + Z * scale * 0.55, z: Z };
  };

  // base plate
  const corners = [
    [-0.6, -0.6],
    [N - 0.4, -0.6],
    [N - 0.4, N - 0.4],
    [-0.6, N - 0.4],
  ].map(([x, y]) => project(x, y));
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(27,29,35,0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // beads, back to front
  const items = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (board[y][x] < 0) continue;
      const p = project(x, y);
      items.push({ ...p, color: COLORS[board[y][x]].hex, fused: fused[y][x] });
    }
  }
  items.sort((a, b) => a.z - b.z);

  const h = scale * (stat.f ? 0.7 : 0.9);
  const r = scale * 0.42;
  for (const it of items) {
    ctx.beginPath();
    ctx.moveTo(it.x - r, it.y - h);
    ctx.lineTo(it.x + r, it.y - h);
    ctx.lineTo(it.x + r, it.y);
    ctx.lineTo(it.x - r, it.y);
    ctx.closePath();
    ctx.fillStyle = it.color;
    ctx.globalAlpha = 0.72;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(it.x, it.y - h, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = it.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(it.x, it.y - h, r * 0.34, r * 0.19, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1B1D23';
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(43,33,23,0.55)';
  ctx.font = '10px sans-serif';
  ctx.fillText('左右拖动，转一转', W / 2, toolbarY - 38);
  ctx.textAlign = 'left';
}

function saveImage() {
  if (!wx.canvasToTempFilePath) {
    wx.showToast({ title: '当前环境不支持保存', icon: 'none' });
    return;
  }
  if (wx.showLoading) wx.showLoading({ title: '正在保存…' });
  wx.canvasToTempFilePath({
    canvas,
    success(res) {
      if (wx.hideLoading) wx.hideLoading();
      wx.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success() {
          wx.showToast({ title: '已保存到相册', icon: 'none' });
        },
        fail() {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置里允许保存图片到相册。',
            showCancel: false,
          });
        },
      });
    },
    fail() {
      if (wx.hideLoading) wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    },
  });
}

function choosePhotoPattern() {
  wx.showModal({
    title: '照片转图纸',
    content: '会按 29×29 重新配成 8 色豆图，并替换当前拼板。继续吗？',
    success(res) {
      if (!res.confirm) return;
      const done = (path) => loadPhotoPattern(path);
      if (wx.chooseMedia) {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          success(r) {
            const f = r.tempFiles && r.tempFiles[0];
            if (f) done(f.tempFilePath);
          },
        });
      } else if (wx.chooseImage) {
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          success(r) {
            if (r.tempFilePaths && r.tempFilePaths[0]) done(r.tempFilePaths[0]);
          },
        });
      } else {
        wx.showToast({ title: '当前环境不支持选图', icon: 'none' });
      }
    },
  });
}

function loadPhotoPattern(path) {
  if (wx.showLoading) wx.showLoading({ title: '正在配豆…' });
  const img = wx.createImage();
  img.onload = () => {
    try {
      const cv = wx.createOffscreenCanvas
        ? wx.createOffscreenCanvas({ type: '2d', width: N, height: N })
        : wx.createCanvas();
      const c2 = cv.getContext('2d');
      const s = Math.min(img.width || 1, img.height || 1);
      const sx = ((img.width || s) - s) / 2;
      const sy = ((img.height || s) - s) / 2;
      c2.drawImage(img, sx, sy, s, s, 0, 0, N, N);
      const data = c2.getImageData(0, 0, N, N).data;
      const palette = COLORS.map((c) => ({
        r: parseInt(c.hex.slice(1, 3), 16),
        g: parseInt(c.hex.slice(3, 5), 16),
        b: parseInt(c.hex.slice(5, 7), 16),
      }));
      const next = emptyBoard();
      let n = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 4;
          if (data[i + 3] < 32) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          let best = 0;
          let bestD = Infinity;
          for (let k = 0; k < palette.length; k++) {
            const p = palette[k];
            const d = (r - p.r) ** 2 * 2 + (g - p.g) ** 2 * 4 + (b - p.b) ** 2 * 3;
            if (d < bestD) {
              bestD = d;
              best = k;
            }
          }
          next[y][x] = best;
          n++;
        }
      }
      if (!n) {
        wx.showToast({ title: '这张图没读出颜色', icon: 'none' });
        return;
      }
      snap();
      board = next;
      fused = Array.from({ length: N }, () => Array(N).fill(false));
      save();
      draw();
      wx.showToast({ title: `已转 ${n} 格`, icon: 'none' });
    } catch (e) {
      wx.showToast({ title: '转图失败，换一张试试', icon: 'none' });
    } finally {
      if (wx.hideLoading) wx.hideLoading();
    }
  };
  img.onerror = () => {
    if (wx.hideLoading) wx.hideLoading();
    wx.showToast({ title: '图片打不开', icon: 'none' });
  };
  img.src = path;
}

function handle(x, y) {
  if (screen === 'gallery') {
    handleGallery(x, y);
    return;
  }
  if (screen === 'detail') {
    handleDetail(x, y);
    return;
  }
  if (overlay) {
    handleOverlay(x, y);
    return;
  }

  // marketplace button
  if (x >= W - 182 && x <= W - 132 && y >= SAFE_TOP + 42 && y <= SAFE_TOP + 72) {
    openGallery();
    return;
  }

  // menu button
  if (x >= W - 126 && x <= W - 76 && y >= SAFE_TOP + 42 && y <= SAFE_TOP + 72) {
    overlay = 'menu';
    draw();
    return;
  }

  // save button
  if (x >= W - 74 && x <= W - 12 && y >= SAFE_TOP + 42 && y <= SAFE_TOP + 72) {
    saveImage();
    return;
  }

  // board
  if (
    !view3d &&
    x >= boardX &&
    x <= boardX + boardSize &&
    y >= boardY &&
    y <= boardY + boardSize
  ) {
    const bx = Math.floor((x - boardX) / cell);
    const by = Math.floor((y - boardY) / cell);
    if (bx >= 0 && bx < N && by >= 0 && by < N) {
      snap();
      if (eraser) {
        board[by][bx] = -1;
        fused[by][bx] = false;
      } else {
        board[by][bx] = selected;
        fused[by][bx] = false;
      }
      save();
      draw();
    }
    return;
  }

  // palette
  if (!view3d && y >= paletteY - 6 && y <= paletteY + 38) {
    for (let i = 0; i < COLORS.length; i++) {
      const cx = 16 + paletteItem * (i + 0.5);
      if (Math.abs(x - cx) <= 20) {
        selected = i;
        eraser = false;
        draw();
        return;
      }
    }
  }

  // toolbar
  if (y >= toolbarY && y <= toolbarY + toolbarH) {
    if (rowMode) {
      const item = (W - 36) / 3;
      const ri = Math.floor((x - 18) / item);
      if (ri === 0) rowFocus = Math.max(0, rowFocus - 1);
      else if (ri === 1) rowFocus = Math.min(N - 1, rowFocus + 1);
      else if (ri === 2) rowMode = false;
      draw();
      return;
    }
    const i = Math.floor((x - 18) / toolbarItem);
    if (i < 0 || i > 5) return;
    if (i === 0) {
      const prev = history.pop();
      if (prev) {
        board = prev.board;
        fused = prev.fused;
        save();
      }
    } else if (i === 1) {
      eraser = !eraser;
    } else if (i === 2) {
      for (let yy = 0; yy < N; yy++) {
        for (let xx = 0; xx < N; xx++) {
          if (board[yy][xx] >= 0) fused[yy][xx] = true;
        }
      }
      save();
    } else if (i === 3) {
      choosePhotoPattern();
    } else if (i === 4) {
      view3d = !view3d;
      dragX = null;
    } else if (i === 5) {
      snap();
      board = emptyBoard();
      fused = Array.from({ length: N }, () => Array(N).fill(false));
      save();
    }
    draw();
  }
}

function handleGallery(x, y) {
  if (x >= 16 && x <= 68 && y >= SAFE_TOP + 12 && y <= SAFE_TOP + 42) {
    screen = 'studio';
    draw();
    return;
  }
  const list = works.slice(galleryPage * 8, galleryPage * 8 + 8);
  for (let i = 0; i < list.length; i++) {
    const r = galleryCard(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      openDetail(list[i].id);
      return;
    }
  }
  if (works.length > 8) {
    const by = H - 56;
    if (y >= by && y <= by + 30) {
      if (x >= 16 && x <= 94) {
        galleryPage = Math.max(0, galleryPage - 1);
        draw();
      } else if (x >= W - 94 && x <= W - 16) {
        galleryPage = Math.min(Math.ceil(works.length / 8) - 1, galleryPage + 1);
        draw();
      }
    }
  }
}

function handleDetail(x, y) {
  if (x >= 16 && x <= 68 && y >= SAFE_TOP + 12 && y <= SAFE_TOP + 42) {
    screen = 'gallery';
    detail = null;
    comments = [];
    draw();
    return;
  }
  if (!detail) return;
  const r = detailRects();
  if (y >= r.collect.y && y <= r.collect.y + r.collect.h) {
    if (x >= r.collect.x && x <= r.collect.x + r.collect.w) return doAction('collect');
    if (x >= r.like.x && x <= r.like.x + r.like.w) return doAction('like');
    if (x >= r.unlock.x && x <= r.unlock.x + r.unlock.w) {
      if (detail.unlocked) return;
      return doAction('unlock');
    }
  }
  if (x >= r.comment.x && x <= r.comment.x + r.comment.w && y >= r.comment.y && y <= r.comment.y + r.comment.h) {
    doAction('comment');
  }
}

function handleOverlay(x, y) {
  if (overlay === 'menu') {
    const x0 = W / 2 - 140;
    const y0 = SAFE_TOP + 120;
    for (let i = 0; i < 4; i++) {
      const iy = y0 + 78 + i * 52;
      if (x >= x0 + 16 && x <= x0 + 264 && y >= iy && y <= iy + 42) {
        if (i === 0) overlay = 'inventory';
        else if (i === 1) {
          rowMode = true;
          view3d = false;
          overlay = null;
          rowFocus = N - 1;
          for (let yy = 0; yy < N; yy++) {
            if (board[yy].some((c) => c >= 0)) {
              rowFocus = yy;
              break;
            }
          }
        } else if (i === 2) {
          overlay = null;
          saveImage();
        } else overlay = null;
        draw();
        return;
      }
    }
    if (y < y0 || y > y0 + 300) overlay = null;
    draw();
    return;
  }

  if (overlay === 'inventory') {
    const x0 = 16;
    const w = W - 32;
    const h = H - SAFE_TOP - 150;
    const y0 = SAFE_TOP + 76;
    const rowH = Math.min(50, (h - 75) / COLORS.length);
    if (x >= x0 + 16 && x <= x0 + 98 && y >= y0 + h - 44 && y <= y0 + h - 14) {
      overlay = null;
      draw();
      return;
    }
    for (let i = 0; i < COLORS.length; i++) {
      const ry = y0 + 64 + i * rowH;
      if (x >= x0 + w - 68 && x <= x0 + w - 16 && y >= ry + 1 && y <= ry + 27) {
        stock[i] += 100;
        saveStock();
        draw();
        return;
      }
    }
    if (y > y0 + h + 10) {
      overlay = null;
      draw();
    }
  }
}

load();
loadStock();
draw();

wx.onTouchStart((e) => {
  const t = e.touches && e.touches[0];
  if (!t) return;
  if (view3d && !overlay && t.clientY < toolbarY - 6) dragX = t.clientX;
  handle(t.clientX, t.clientY);
});

if (wx.onTouchMove) {
  wx.onTouchMove((e) => {
    if (!view3d || overlay || dragX == null) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    angle += (t.clientX - dragX) * 0.012;
    dragX = t.clientX;
    draw();
  });
}

if (wx.onTouchEnd) {
  wx.onTouchEnd(() => {
    dragX = null;
  });
}

// 方便排查/自动化测试，不影响正常游戏
if (typeof GameGlobal !== 'undefined') {
  GameGlobal.__douyuGame = {
    board: () => board,
    handle,
    toggle3D: () => {
      view3d = !view3d;
      draw();
    },
  };
}
