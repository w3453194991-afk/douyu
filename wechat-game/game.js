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
const toolbarItem = (W - 36) / 4;

let board = starterBoard();
let fused = Array.from({ length: N }, () => Array(N).fill(false));
let selected = 0;
let eraser = false;
let history = [];

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
  ctx.fillText('豆屿', 40, SAFE_TOP + 26);
  ctx.fillStyle = MUTED;
  ctx.font = '11px sans-serif';
  ctx.fillText('拼豆小岛 · 小游戏版', 40, SAFE_TOP + 43);

  const stat = countBeads();
  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`${stat.n} 颗`, W - 16, SAFE_TOP + 23);
  ctx.fillStyle = MUTED;
  ctx.font = '10px sans-serif';
  ctx.fillText(stat.f ? `已熨 ${stat.f}` : '点格子放豆', W - 16, SAFE_TOP + 39);
  ctx.textAlign = 'left';

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
  const tools = ['撤销', '橡皮', '熨烫', '清空'];
  for (let i = 0; i < tools.length; i++) {
    const x = 18 + i * toolbarItem;
    const w = toolbarItem - 6;
    const active = i === 1 && eraser;
    roundRect(x, toolbarY, w, toolbarH, 11);
    ctx.fillStyle = active ? CORAL : 'rgba(255,255,255,0.72)';
    ctx.fill();
    ctx.strokeStyle = active ? CORAL : 'rgba(53,41,27,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = active ? '#fff' : INK;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(tools[i], x + w / 2, toolbarY + 27);
    ctx.textAlign = 'left';
  }

  // footer hint
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(43,33,23,0.42)';
  ctx.font = '9px sans-serif';
  ctx.fillText('29 × 29 标准拼板 · 5mm 中豆 · 豆屿 BEAD ISLE', W / 2, toolbarY - 12);
  ctx.textAlign = 'left';
}

function handle(x, y) {
  // board
  if (x >= boardX && x <= boardX + boardSize && y >= boardY && y <= boardY + boardSize) {
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
  if (y >= paletteY - 6 && y <= paletteY + 38) {
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
    const i = Math.floor((x - 18) / toolbarItem);
    if (i < 0 || i > 3) return;
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
      snap();
      board = emptyBoard();
      fused = Array.from({ length: N }, () => Array(N).fill(false));
      save();
    }
    draw();
  }
}

load();
draw();

wx.onTouchStart((e) => {
  const t = e.touches && e.touches[0];
  if (t) handle(t.clientX, t.clientY);
});

// 方便排查/自动化测试，不影响正常游戏
if (typeof GameGlobal !== 'undefined') {
  GameGlobal.__douyuGame = { board: () => board, handle };
}
