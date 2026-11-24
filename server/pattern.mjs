/**
 * 种子作品：用极小的像素画 DSL 生成拼豆图纸。
 * 每个 piece 是一块可以独立熨烫、立体拼装的零件。
 */

export const C = {
  ink: '#20222A',
  charcoal: '#444A54',
  rock: '#8B9097',
  silver: '#C6CBD1',
  snow: '#F6F3EA',
  cream: '#F2E6CC',
  ivory: '#E4D4AE',
  sand: '#D8BC98',
  tan: '#B8895C',
  coffee: '#6B4328',
  gold: '#C9A227',
  lemon: '#F6DB57',
  apricot: '#F5C24F',
  ginger: '#E5A03C',
  orange: '#EE8835',
  vermilion: '#E0582F',
  red: '#D6393B',
  cherry: '#BF2A45',
  rose: '#E5487E',
  sakura: '#F5B0C0',
  peach: '#F7CCB3',
  grape: '#78499B',
  lavender: '#B49AD9',
  navy: '#1F376D',
  cobalt: '#2C5FBF',
  sky: '#4DA7D9',
  mist: '#A7CEE7',
  teal: '#1E8E8B',
  mint: '#8ECFBB',
  forest: '#2C6A4E',
  grass: '#5EA24B',
  lime: '#AECC47',
  neonPink: '#FF5EA8',
  glow: '#E4F6C6',
};

export class Painter {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.cells = new Map();
  }
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return this;
    this.cells.set(`${x},${y}`, c);
    return this;
  }
  erase(x, y) {
    this.cells.delete(`${Math.round(x)},${Math.round(y)}`);
    return this;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  frame(x, y, w, h, c) {
    for (let i = 0; i < w; i++) {
      this.set(x + i, y, c);
      this.set(x + i, y + h - 1, c);
    }
    for (let j = 0; j < h; j++) {
      this.set(x, y + j, c);
      this.set(x + w - 1, y + j, c);
    }
    return this;
  }
  circle(cx, cy, r, c) {
    return this.circlePaint(cx, cy, r, () => c);
  }
  circlePaint(cx, cy, r, fn) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) {
          const col = fn(x, y, dx, dy);
          if (col) this.set(x, y, col);
        }
      }
    }
    return this;
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }
  ring(cx, cy, r, thickness, c) {
    return this.circlePaint(cx, cy, r, (x, y, dx, dy) =>
      dx * dx + dy * dy >= (r - thickness) * (r - thickness) ? c : null,
    );
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }
  /** 带圆头的粗线，可先画描边再画内芯 */
  stroke(points, width, c) {
    const r = width / 2;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      const dist = Math.hypot(bx - ax, by - ay);
      const steps = Math.max(1, Math.ceil(dist * 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        this.circle(ax + (bx - ax) * t, ay + (by - ay) * t, r, c);
      }
    }
    return this;
  }
  poly(points, c) {
    const ys = points.map((p) => p[1]);
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k < xs.length; k += 2) {
        const from = Math.ceil(xs[k]);
        const to = Math.floor(xs[k + 1]);
        for (let x = from; x <= to; x++) this.set(x, y, c);
      }
    }
    return this;
  }
  beads() {
    return [...this.cells.entries()].map(([k, c]) => {
      const [x, y] = k.split(',').map(Number);
      return { x, y, c };
    });
  }
}

const mirrorPoints = (pts, width) => pts.map(([x, y]) => [width - 1 - x, y]);

/* ---------------------------------- 猫 ---------------------------------- */

function catHead() {
  const p = new Painter(24, 22);
  const earL = [
    [3, 2],
    [10, 2],
    [7, 10],
  ];
  const earR = mirrorPoints(earL, 24);
  p.poly(earL, C.coffee);
  p.poly(earR, C.coffee);
  p.poly(
    [
      [4, 4],
      [9, 4],
      [7, 9],
    ],
    C.orange,
  );
  p.poly(mirrorPoints([[4, 4], [9, 4], [7, 9]], 24), C.orange);
  p.poly(
    [
      [5, 5],
      [8, 5],
      [7, 8],
    ],
    C.sakura,
  );
  p.poly(mirrorPoints([[5, 5], [8, 5], [7, 8]], 24), C.sakura);

  p.circle(12, 13, 10, C.coffee);
  p.circle(12, 13, 9, C.cream);
  // 右脸橘色斑
  p.circlePaint(12, 13, 9, (x, y, dx, dy) => (dx > 1 && dy < -2 ? C.orange : null));
  // 额头小条纹
  p.rect(10, 6, 1, 3, C.orange);
  p.rect(12, 5, 1, 3, C.orange);
  p.rect(14, 6, 1, 3, C.orange);
  // 眼睛
  for (const ex of [8, 16]) {
    p.rect(ex, 11, 2, 3, C.ink);
    p.set(ex, 11, C.snow);
  }
  // 鼻子与嘴
  p.rect(11, 15, 2, 1, C.rose);
  p.set(12, 16, C.coffee);
  p.set(11, 17, C.coffee);
  p.set(13, 17, C.coffee);
  // 腮红与胡须
  p.rect(4, 15, 2, 1, C.sakura);
  p.rect(18, 15, 2, 1, C.sakura);
  p.line(2, 13, 5, 14, C.coffee);
  p.line(2, 18, 5, 17, C.coffee);
  p.line(21, 13, 18, 14, C.coffee);
  p.line(21, 18, 18, 17, C.coffee);
  return p;
}

function catBody() {
  const p = new Painter(24, 18);
  p.ellipse(11, 10, 9, 8, C.coffee);
  p.ellipse(11, 10, 8, 7, C.cream);
  // 背部橘色条纹
  p.circlePaint(11, 10, 9, (x, y) =>
    y >= 4 && y <= 12 && ((x >= 7 && x <= 8) || (x >= 11 && x <= 12) || (x >= 15 && x <= 16))
      ? C.orange
      : null,
  );
  // 肚皮
  p.ellipse(11, 14, 4, 3, C.snow);
  // 前爪
  p.rect(5, 15, 3, 2, C.coffee);
  p.rect(4, 15, 3, 1, C.cream);
  p.rect(14, 15, 3, 2, C.coffee);
  p.rect(14, 15, 3, 1, C.cream);
  // 尾巴
  p.stroke(
    [
      [18, 12],
      [21, 11],
      [22, 8],
      [21, 5],
      [19, 3],
    ],
    4,
    C.coffee,
  );
  p.stroke(
    [
      [18, 12],
      [21, 11],
      [22, 8],
      [21, 5],
      [19, 3],
    ],
    2.4,
    C.orange,
  );
  return p;
}

function fish() {
  const p = new Painter(14, 9);
  p.ellipse(7, 5, 5, 3, C.navy);
  p.ellipse(7, 5, 4, 2.2, C.sky);
  p.poly(
    [
      [11, 5],
      [13, 2],
      [13, 7],
    ],
    C.cobalt,
  );
  p.set(5, 4, C.ink);
  p.set(5, 3, C.snow);
  p.set(2, 4, C.mist);
  p.rect(7, 2, 1, 1, C.cobalt);
  return p;
}

/* --------------------------------- 蘑菇 --------------------------------- */

function mushroomCap() {
  const p = new Painter(30, 15);
  p.circlePaint(15, 15, 15, (x, y) => (y <= 13 ? C.coffee : null));
  p.circlePaint(15, 15, 13.4, (x, y) => (y <= 12 ? C.red : null));
  // 红色渐变：上亮下暗
  p.circlePaint(15, 13, 12, (x, y, dx, dy) => {
    if (y > 10) return C.cherry;
    return null;
  });
  // 白点
  for (const [x, y, r] of [
    [8, 5, 2.4],
    [16, 3, 2],
    [23, 7, 2.6],
    [13, 9, 1.8],
    [21, 11, 1.5],
    [4, 9, 1.6],
  ]) {
    p.circle(x, y, r, C.snow);
  }
  // 底部奶油边
  p.rect(2, 12, 26, 2, C.ivory);
  p.rect(3, 14, 24, 1, C.tan);
  return p;
}

function mushroomStem() {
  const p = new Painter(18, 22);
  p.rect(4, 1, 10, 21, C.coffee);
  p.rect(4, 1, 9, 20, C.cream);
  p.rect(5, 1, 7, 3, C.ivory);
  // 门
  p.rect(6, 11, 6, 11, C.tan);
  p.rect(7, 12, 4, 10, C.coffee);
  p.rect(8, 13, 2, 8, C.tan);
  p.set(12, 17, C.gold);
  // 圆窗
  p.circle(10, 7, 2.4, C.coffee);
  p.circle(10, 7, 1.8, C.mist);
  p.set(9, 6, C.snow);
  // 草
  p.poly(
    [
      [10, 22],
      [13, 17],
      [13, 22],
    ],
    C.grass,
  );
  p.poly(
    [
      [9, 22],
      [7, 17],
      [6, 22],
    ],
    C.forest,
  );
  return p;
}

function mushroomGrass() {
  const p = new Painter(22, 7);
  for (const [x, h] of [
    [2, 4],
    [5, 6],
    [8, 3],
    [12, 5],
    [15, 4],
    [18, 6],
    [21, 3],
  ]) {
    p.line(x, 6, x, 6 - h, x % 2 ? C.grass : C.forest);
    p.set(x - 1, 6 - h + 1, C.lime);
  }
  p.rect(1, 6, 21, 1, C.forest);
  return p;
}

/* --------------------------------- 月亮 --------------------------------- */

function moon() {
  const p = new Painter(26, 26);
  const inside = (x, y) => {
    const dx = x - 13;
    const dy = y - 13;
    const dx2 = x - 20;
    const dy2 = y - 9;
    return dx * dx + dy * dy <= 12 * 12 && dx2 * dx2 + dy2 * dy2 > 9.5 * 9.5;
  };
  const edge = (x, y) => {
    const dx = x - 13;
    const dy = y - 13;
    return dx * dx + dy * dy > 10.6 * 10.6 || (x - 20) * (x - 20) + (y - 9) * (y - 9) < 10.4 * 10.4;
  };
  for (let y = 0; y < 26; y++) {
    for (let x = 0; x < 26; x++) {
      if (inside(x, y)) p.set(x, y, edge(x, y) ? C.ginger : C.lemon);
    }
  }
  // 月面坑
  for (const [x, y] of [
    [7, 16],
    [9, 7],
    [4, 11],
  ]) {
    p.circle(x, y, 1.2, C.apricot);
  }
  return p;
}

function littleBear() {
  const p = new Painter(16, 15);
  // 耳朵
  for (const ex of [3, 12]) {
    p.circle(ex, 3, 2.6, C.coffee);
    p.circle(ex, 3, 1.7, C.tan);
  }
  p.ellipse(8, 8, 6.6, 6, C.coffee);
  p.ellipse(8, 8, 5.6, 5, C.sand);
  p.ellipse(8, 11.5, 3, 2, C.peach);
  // 闭眼
  p.line(5, 8, 7, 9, C.coffee);
  p.line(11, 8, 9, 9, C.coffee);
  p.rect(7.5, 9, 1, 1, C.coffee);
  p.set(8, 10, C.coffee);
  p.rect(4, 11, 1, 1, C.sakura);
  p.rect(12, 11, 1, 1, C.sakura);
  // 抱着的小枕头
  p.rect(2, 13, 12, 2, C.lavender);
  p.rect(3, 13, 10, 1, C.snow);
  return p;
}

function star() {
  const p = new Painter(9, 9);
  const c = C.lemon;
  p.rect(4, 0, 1, 9, c);
  p.rect(0, 4, 9, 1, c);
  p.rect(1, 1, 2, 2, C.apricot);
  p.rect(6, 6, 2, 2, C.apricot);
  p.set(4, 4, C.snow);
  return p;
}

function cloud() {
  const p = new Painter(18, 8);
  p.ellipse(5, 5, 4, 2.6, C.mist);
  p.ellipse(10, 3, 4.5, 3, C.mist);
  p.ellipse(14, 5, 3.4, 2.4, C.mist);
  p.rect(2, 6, 14, 1, C.sky);
  p.rect(4, 4, 3, 1, C.snow);
  return p;
}

/* -------------------------------- 掌机 --------------------------------- */

function gameBody() {
  const p = new Painter(28, 40);
  p.rect(2, 1, 24, 39, C.charcoal);
  p.rect(2, 1, 23, 38, C.silver);
  // 圆角
  for (const [x, y] of [
    [2, 1],
    [25, 1],
    [2, 39],
    [25, 39],
  ])
    p.erase(x, y);
  p.rect(3, 2, 21, 1, C.snow);
  // 屏幕凹槽
  p.rect(4, 4, 20, 15, C.charcoal);
  p.rect(5, 5, 18, 13, C.ink);
  // 屏幕下方的装饰线
  p.rect(5, 21, 18, 1, C.rock);
  p.rect(6, 22, 16, 1, C.silver);
  // D-pad
  p.rect(5, 27, 9, 9, C.charcoal);
  p.rect(7, 28, 5, 7, C.ink);
  p.rect(6, 30, 7, 3, C.ink);
  // A/B
  p.circle(20, 29, 2.4, C.charcoal);
  p.circle(20, 29, 1.7, C.cherry);
  p.circle(20, 34, 2.4, C.charcoal);
  p.circle(20, 34, 1.7, C.cobalt);
  // 喇叭
  for (let i = 0; i < 4; i++) p.line(8 + i * 3, 37, 9 + i * 3, 38, C.rock);
  // 小字 DOT
  p.rect(15, 23, 1, 2, C.rock);
  p.rect(17, 23, 1, 2, C.rock);
  p.rect(19, 23, 1, 2, C.rock);
  return p;
}

function gameScreen() {
  const p = new Painter(20, 15);
  p.rect(0, 0, 20, 15, C.charcoal);
  p.rect(1, 1, 18, 13, C.ink);
  p.rect(1, 1, 18, 13, C.forest);
  p.rect(1, 9, 18, 5, C.grass);
  p.circle(5, 5, 2, C.snow);
  p.rect(1, 9, 18, 1, C.lime);
  p.rect(12, 3, 4, 3, C.mint);
  p.rect(13, 4, 2, 1, C.snow);
  p.rect(3, 11, 3, 1, C.forest);
  p.rect(10, 10, 4, 1, C.forest);
  p.set(17, 2, C.snow);
  p.set(2, 2, C.snow);
  return p;
}

function gameDPad() {
  const p = new Painter(9, 9);
  p.rect(0, 2, 9, 5, C.ink);
  p.rect(2, 0, 5, 9, C.ink);
  p.rect(3, 3, 3, 3, C.charcoal);
  p.set(3, 2, C.rock);
  return p;
}

function gameButtons() {
  const p = new Painter(9, 9);
  p.circle(2.5, 2.5, 2.2, C.ink);
  p.circle(2.5, 2.5, 1.6, C.cherry);
  p.circle(6.5, 6.5, 2.2, C.ink);
  p.circle(6.5, 6.5, 1.6, C.cobalt);
  return p;
}

/* --------------------------------- 蛋糕 -------------------------------- */

function cakePlate() {
  const p = new Painter(34, 6);
  p.ellipse(17, 4, 16, 2.2, C.silver);
  p.ellipse(17, 3, 15, 1.8, C.snow);
  p.rect(6, 1, 22, 1, C.rock);
  return p;
}

function cakeSponge() {
  const p = new Painter(26, 8);
  p.rect(0, 1, 26, 6, C.tan);
  p.rect(0, 0, 26, 4, C.apricot);
  p.rect(0, 6, 26, 1, C.coffee);
  for (let x = 2; x < 26; x += 5) p.set(x, 3, C.sand);
  return p;
}

function cakeCream() {
  const p = new Painter(28, 5);
  p.rect(0, 1, 28, 4, C.snow);
  p.rect(0, 0, 28, 1, C.cream);
  // 滴落
  for (const x of [2, 7, 13, 19, 25]) {
    p.rect(x, 3, 2, 2, C.snow);
    p.set(x + 1, 4, C.cream);
  }
  p.rect(0, 4, 28, 1, C.ivory);
  return p;
}

function cakeCream2() {
  const p = new Painter(28, 4);
  p.rect(0, 1, 28, 3, C.snow);
  p.rect(0, 0, 28, 1, C.cream);
  return p;
}

function strawberry() {
  const p = new Painter(10, 11);
  p.poly(
    [
      [5, 2],
      [9, 4],
      [8, 8],
      [5, 10],
      [2, 8],
      [1, 4],
    ],
    C.cherry,
  );
  p.poly(
    [
      [5, 3],
      [8, 4],
      [7, 7],
      [5, 9],
      [3, 7],
      [2, 4],
    ],
    C.red,
  );
  // 叶子
  p.rect(4, 0, 2, 2, C.grass);
  p.rect(2, 1, 2, 1, C.forest);
  p.rect(6, 1, 2, 1, C.forest);
  p.set(5, 2, C.lime);
  // 籽
  for (const [x, y] of [
    [4, 5],
    [6, 5],
    [5, 7],
    [3, 7],
  ])
    p.set(x, y, C.snow);
  return p;
}

/* --------------------------------- 落日 -------------------------------- */

function sunsetSky() {
  const p = new Painter(38, 17);
  p.rect(0, 0, 38, 17, C.navy);
  const bands = [
    [0, 4, C.grape],
    [4, 4, C.rose],
    [8, 4, C.vermilion],
    [12, 3, C.orange],
    [15, 2, C.apricot],
  ];
  for (const [y, h, c] of bands) p.rect(0, y, 38, h, c);
  // 星点
  for (const [x, y] of [
    [4, 2],
    [9, 1],
    [28, 2],
    [33, 1],
    [21, 3],
  ])
    p.set(x, y, C.snow);
  return p;
}

function sunsetSun() {
  const p = new Painter(14, 14);
  p.circle(7, 7, 6.5, C.ginger);
  p.circle(7, 7, 5.4, C.lemon);
  p.circle(6, 5, 1.2, C.snow);
  return p;
}

function sunsetSea() {
  const p = new Painter(38, 9);
  p.rect(0, 0, 38, 9, C.cobalt);
  p.rect(0, 0, 38, 3, C.sky);
  p.rect(0, 3, 38, 2, C.teal);
  p.rect(0, 5, 38, 4, C.navy);
  for (let x = 1; x < 38; x += 6) {
    p.rect(x, 4, 3, 1, C.mist);
    p.rect(x + 3, 1, 2, 1, C.mist);
  }
  return p;
}

function birds() {
  const p = new Painter(13, 6);
  p.line(0, 2, 3, 0, C.ink);
  p.line(3, 0, 6, 2, C.ink);
  p.line(6, 2, 9, 0, C.ink);
  p.line(9, 0, 12, 2, C.ink);
  return p;
}

/* -------------------------------- 作品定义 ------------------------------- */

const WORK_DEFS = [
  {
    id: 'w_cat',
    title: '摸鱼小猫',
    desc: '它今天也没抓到鱼。头上那撮橘毛是加班熬出来的。三块零件，猫头可以拆下来单独挂包上。',
    price: 120,
    author: 'u_ado',
    likes: 9,
    daysAgo: 1,
    pieces: [
      { name: '身体', painter: catBody, place: [0, 0, 0] },
      { name: '猫头', painter: catHead, place: [0, 12, 2] },
      { name: '小鱼', painter: fish, place: [17, 3, 4] },
    ],
  },
  {
    id: 'w_mushroom',
    title: '蘑菇小屋',
    desc: '一枚住在森林边的蘑菇，门永远为迷路的豆子开着。帽子、屋身、草丛可以分开熨。',
    price: 90,
    author: 'u_iron',
    likes: 7,
    daysAgo: 3,
    pieces: [
      { name: '屋身', painter: mushroomStem, place: [0, 0, 0] },
      { name: '蘑菇帽', painter: mushroomCap, place: [0, 16, 1.5] },
      { name: '门口草丛', painter: mushroomGrass, place: [-3, 0, 4] },
    ],
  },
  {
    id: 'w_moon',
    title: '月亮上的小熊',
    desc: '把月亮掰下来当摇椅，小熊睡着了。云、星星和月亮是四块独立的零件。',
    price: 60,
    author: 'u_bean',
    likes: 12,
    daysAgo: 5,
    pieces: [
      { name: '云朵', painter: cloud, place: [-13, 0, 3] },
      { name: '月亮', painter: moon, place: [0, 2, 0] },
      { name: '小熊', painter: littleBear, place: [1, 8, 5] },
      { name: '星星 A', painter: star, place: [-14, 23, 4] },
      { name: '星星 B', painter: star, place: [14, 27, 6] },
    ],
  },
  {
    id: 'w_gameboy',
    title: '豆豆掌机',
    desc: '一台只能玩一个游戏的掌机：打开就是夏天。屏幕、十字键和 AB 键都是浮在机身上的零件。',
    price: 180,
    author: 'u_kada',
    likes: 15,
    daysAgo: 7,
    pieces: [
      { name: '机身', painter: gameBody, place: [0, 0, 0] },
      { name: '屏幕', painter: gameScreen, place: [0, 19, 2] },
      { name: '十字键', painter: gameDPad, place: [-7, 6, 2] },
      { name: 'AB 键', painter: gameButtons, place: [8, 6, 2] },
    ],
  },
  {
    id: 'w_cake',
    title: '草莓奶油蛋糕',
    desc: '没有蜡烛，因为每天都可以是生日。五层零件叠起来，侧面看有真正的厚度。',
    price: 150,
    author: 'u_doudou',
    likes: 10,
    daysAgo: 9,
    pieces: [
      { name: '盘子', painter: cakePlate, place: [0, 0, 0] },
      { name: '蛋糕底', painter: cakeSponge, place: [0, 4, 1] },
      { name: '奶油夹层', painter: cakeCream, place: [0, 10, 2] },
      { name: '蛋糕顶', painter: cakeSponge, place: [0, 13, 1] },
      { name: '奶油顶', painter: cakeCream2, place: [0, 17, 2] },
      { name: '草莓', painter: strawberry, place: [0, 19, 4] },
    ],
  },
  {
    id: 'w_sunset',
    title: '落日海',
    desc: '免费图纸。三块零件：天空、太阳、海面。适合第一次来岛上的你，先拼一个傍晚。',
    price: 0,
    author: 'u_iron',
    likes: 6,
    daysAgo: 12,
    pieces: [
      { name: '天空', painter: sunsetSky, place: [0, 10, 0] },
      { name: '落日', painter: sunsetSun, place: [0, 9, 2] },
      { name: '海面', painter: sunsetSea, place: [0, 0, 1] },
      { name: '海鸟', painter: birds, place: [8, 22, 4] },
    ],
  },
];

/** 2D 蓝图摆放：货架式排布，避免零件重叠 */
function packPositions(pieces) {
  const gap = 3;
  const maxWidth = 46;
  let x = 0;
  let y = 0;
  let rowH = 0;
  return pieces.map((p) => {
    const w = p.w;
    const h = p.h;
    if (x > 0 && x + w > maxWidth) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    const pos = [x, y];
    x += w + gap;
    rowH = Math.max(rowH, h);
    return pos;
  });
}

export function buildSeedWorks() {
  return WORK_DEFS.map((def) => {
    const built = def.pieces.map((p) => {
      const painter = p.painter();
      const beads = painter.beads();
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const b of beads) {
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x);
        maxY = Math.max(maxY, b.y);
      }
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      return {
        name: p.name,
        w,
        h,
        beads: beads.map((b) => [b.x - minX, b.y - minY, b.c]),
        place: p.place,
      };
    });
    const positions = packPositions(built);
    const pieces = built.map((p, i) => {
      const [tx, ty, tz] = p.place;
      return {
        id: `${def.id}_p${i + 1}`,
        name: p.name,
        beads: p.beads,
        pos: positions[i],
        t: {
          p: [tx, ty + p.h / 2, tz],
          r: [Math.PI / 2, 0, 0],
        },
      };
    });
    return {
      id: def.id,
      title: def.title,
      desc: def.desc,
      price: def.price,
      author: def.author,
      likes: def.likes,
      daysAgo: def.daysAgo,
      scene: { v: 1, pieces },
      beadCount: pieces.reduce((n, p) => n + p.beads.length, 0),
      partCount: pieces.length,
    };
  });
}
