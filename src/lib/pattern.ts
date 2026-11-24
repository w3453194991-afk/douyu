import type { Bead } from '../types';
import { PALETTE } from '../../shared/palette.mjs';
import type { ColorStat } from './metrics';
import { colorStats } from './metrics';

export type PatternStyle = 'original' | 'crisp' | 'soft';

export type PatternOptions = {
  /** 目标宽度（豆格），高度按原图比例走，最长边不超过 96 */
  width: number;
  /** 限定用色数量；36 表示全部色卡 */
  colorLimit: number;
  style: PatternStyle;
  /** Floyd–Steinberg 抖动，照片渐变更自然，但豆子会显得更碎 */
  dither: boolean;
  /** 把和四角颜色接近的背景留空 */
  dropBackground: boolean;
  /** 去背景强度：颜色距离阈值，越大去掉越多 */
  bgTolerance: number;
};

export type PatternResult = {
  beads: Bead[];
  /** 原图采样后的格数（裁掉空气边之前） */
  sourceW: number;
  sourceH: number;
  width: number;
  height: number;
  colors: ColorStat[];
  total: number;
};

export type GridPatternOptions = {
  cols: number;
  rows: number;
  colorLimit: number;
  /** 跳过接近白色的格子（图纸空白格） */
  skipWhite: boolean;
};

type RGB = { r: number; g: number; b: number };

const PALETTE_RGB = PALETTE.map((c) => {
  const n = parseInt(c.hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, hex: c.hex };
});

function clamp(v: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, v));
}

function adjustStyle(r: number, g: number, b: number, style: PatternStyle): RGB {
  if (style === 'crisp') {
    const c = 1.22;
    let rr = 128 + (r - 128) * c;
    let gg = 128 + (g - 128) * c;
    let bb = 128 + (b - 128) * c;
    const gray = rr * 0.299 + gg * 0.587 + bb * 0.114;
    rr = gray + (rr - gray) * 1.12;
    gg = gray + (gg - gray) * 1.12;
    bb = gray + (bb - gray) * 1.12;
    return { r: clamp(rr), g: clamp(gg), b: clamp(bb) };
  }
  if (style === 'soft') {
    return {
      r: clamp(r * 0.94 + 13),
      g: clamp(g * 0.94 + 13),
      b: clamp(b * 0.94 + 13),
    };
  }
  return { r, g, b };
}

/** 红均值加权，比纯 RGB 欧氏距离更贴近肤色和暖色 */
function distance(r: number, g: number, b: number, p: (typeof PALETTE_RGB)[number]): number {
  const rm = (r + p.r) / 2;
  const dr = r - p.r;
  const dg = g - p.g;
  const db = b - p.b;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

function nearest(r: number, g: number, b: number, pool = PALETTE_RGB) {
  let best = pool[0];
  let bestD = Infinity;
  for (const p of pool) {
    const d = distance(r, g, b, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export function targetGrid(width: number, imgW: number, imgH: number) {
  const w = Math.max(8, Math.min(96, Math.round(width)));
  let h = Math.max(1, Math.round((w * imgH) / Math.max(1, imgW)));
  if (h > 96) {
    h = 96;
    return { w: Math.max(8, Math.round((h * imgW) / Math.max(1, imgH))), h };
  }
  return { w, h };
}

export function loadImageFile(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('这张图片打不开，换一张试试'));
    };
    img.src = url;
  });
}

export function imageToPattern(img: HTMLImageElement, options: PatternOptions): PatternResult {
  const { w, h } = targetGrid(options.width, img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('浏览器不支持图片处理');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const rgb = new Float32Array(w * h * 3);
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    rgb[i * 3] = r;
    rgb[i * 3 + 1] = g;
    rgb[i * 3 + 2] = b;
    alpha[i] = a;
  }

  const mapped: Array<{ x: number; y: number; hex: string } | null> = new Array(w * h).fill(null);
  const err = options.dither ? new Float32Array(w * h * 3) : null;

  // 取四角颜色作为“背景色”。很多照片/商品图是纯色底，
  // 直接去掉比让用户手动抠图快得多；主体颜色如果接近背景也不会被误删。
  const cornerIndexes = [0, w - 1, (h - 1) * w, h * w - 1];
  const bgSamples = cornerIndexes
    .map((i) => ({
      r: data[i * 4],
      g: data[i * 4 + 1],
      b: data[i * 4 + 2],
      a: data[i * 4 + 3],
    }))
    .filter((c) => c.a >= 28);
  const nearBg = (r: number, g: number, b: number) => {
    if (r > 244 && g > 244 && b > 244) return true;
    const limit = Math.max(9, Math.min(140, options.bgTolerance ?? 28)) ** 2;
    for (const c of bgSamples) {
      const rm = (r + c.r) / 2;
      const dr = r - c.r;
      const dg = g - c.g;
      const db = b - c.b;
      if ((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db < limit) {
        return true;
      }
    }
    return false;
  };

  // 只去掉「和画面边缘连通」的背景色。这样猫肚皮、白衣服这种
  // 和背景相近、但被主体包住的颜色不会被误删。
  let outsideBg: Uint8Array | null = null;
  if (options.dropBackground && bgSamples.length) {
    const bgFlag = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (alpha[i] < 28) continue;
      if (nearBg(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2])) bgFlag[i] = 1;
    }
    outsideBg = new Uint8Array(w * h);
    const stack: number[] = [];
    const push = (i: number) => {
      if (bgFlag[i] && !outsideBg![i]) {
        outsideBg![i] = 1;
        stack.push(i);
      }
    };
    for (let x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      push(y * w);
      push(y * w + w - 1);
    }
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % w;
      const y = Math.floor(i / w);
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w);
      if (y < h - 1) push(i + w);
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (alpha[i] < 28) continue;
      if (outsideBg && outsideBg[i]) continue;
      const rawR = rgb[i * 3];
      const rawG = rgb[i * 3 + 1];
      const rawB = rgb[i * 3 + 2];
      const adjusted = adjustStyle(rawR, rawG, rawB, options.style);
      let rr = adjusted.r;
      let gg = adjusted.g;
      let bb = adjusted.b;
      if (err) {
        rr += err[i * 3];
        gg += err[i * 3 + 1];
        bb += err[i * 3 + 2];
      }
      rr = clamp(rr);
      gg = clamp(gg);
      bb = clamp(bb);
      const match = nearest(rr, gg, bb);
      mapped[i] = { x, y, hex: match.hex };
      if (err) {
        const er = rr - match.r;
        const eg = gg - match.g;
        const eb = bb - match.b;
        const add = (nx: number, ny: number, factor: number) => {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
          const ni = ny * w + nx;
          if (alpha[ni] < 28) return;
          err[ni * 3] += er * factor;
          err[ni * 3 + 1] += eg * factor;
          err[ni * 3 + 2] += eb * factor;
        };
        add(x + 1, y, 7 / 16);
        add(x - 1, y + 1, 3 / 16);
        add(x, y + 1, 5 / 16);
        add(x + 1, y + 1, 1 / 16);
      }
    }
  }

  let beads: Bead[] = mapped.filter(Boolean).map((b) => ({ x: b!.x, y: b!.y, c: b!.hex }));

  const unique = new Set(beads.map((b) => b.c.toUpperCase()));
  if (options.colorLimit > 0 && unique.size > options.colorLimit) {
    const ranked = colorStats(beads).slice(0, options.colorLimit);
    const keep = ranked.map((s) => PALETTE_RGB.find((p) => p.hex.toUpperCase() === s.hex.toUpperCase())!);
    beads = beads.map((b) => {
      if (keep.some((p) => p.hex.toUpperCase() === b.c.toUpperCase())) return b;
      const n = parseInt(b.c.slice(1), 16);
      return {
        ...b,
        c: nearest((n >> 16) & 255, (n >> 8) & 255, n & 255, keep).hex,
      };
    });
  }

  if (!beads.length) {
    return {
      beads: [],
      sourceW: w,
      sourceH: h,
      width: 0,
      height: 0,
      colors: [],
      total: 0,
    };
  }

  const minX = Math.min(...beads.map((b) => b.x));
  const minY = Math.min(...beads.map((b) => b.y));
  const maxX = Math.max(...beads.map((b) => b.x));
  const maxY = Math.max(...beads.map((b) => b.y));
  beads = beads.map((b) => ({ ...b, x: b.x - minX, y: b.y - minY }));

  return {
    beads,
    sourceW: w,
    sourceH: h,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    colors: colorStats(beads),
    total: beads.length,
  };
}

export const PATTERN_PRESETS = [
  { width: 24, label: '小挂件' },
  { width: 36, label: '钥匙扣' },
  { width: 48, label: '摆件' },
  { width: 64, label: '大图' },
];

/** 给已经裁到网格外框的图纸/PDF 页按行列逐格取色，适合打印图纸翻豆图。 */
export function imageToGridPattern(img: HTMLImageElement, options: GridPatternOptions): PatternResult {
  const cols = Math.max(2, Math.min(160, Math.round(options.cols)));
  const rows = Math.max(2, Math.min(160, Math.round(options.rows)));
  const maxSide = 2400;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('浏览器不支持图片处理');
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const cellW = w / cols;
  const cellH = h / rows;
  let beads: Bead[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      // 只取格子中间 60%，避开图纸网格线和坐标字。
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const px = Math.round((x + 0.5) * cellW + ox * cellW * 0.18);
          const py = Math.round((y + 0.5) * cellH + oy * cellH * 0.18);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const i = (py * w + px) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
          n++;
        }
      }
      if (!n) continue;
      r /= n;
      g /= n;
      b /= n;
      a /= n;
      if (a < 32) continue;
      if (options.skipWhite && r > 242 && g > 242 && b > 242) continue;
      const match = nearest(r, g, b);
      beads.push({ x, y, c: match.hex });
    }
  }

  const unique = new Set(beads.map((b) => b.c.toUpperCase()));
  if (options.colorLimit > 0 && unique.size > options.colorLimit) {
    const ranked = colorStats(beads).slice(0, options.colorLimit);
    const keep = ranked.map((s) => PALETTE_RGB.find((p) => p.hex.toUpperCase() === s.hex.toUpperCase())!);
    beads = beads.map((b) => {
      if (keep.some((p) => p.hex.toUpperCase() === b.c.toUpperCase())) return b;
      const n = parseInt(b.c.slice(1), 16);
      return { ...b, c: nearest((n >> 16) & 255, (n >> 8) & 255, n & 255, keep).hex };
    });
  }

  return {
    beads,
    sourceW: cols,
    sourceH: rows,
    width: cols,
    height: rows,
    colors: colorStats(beads),
    total: beads.length,
  };
}
