import React from 'react';
import type { Piece } from '../types';
import { pieceBounds } from './scene';

export function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amount >= 0) {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  } else {
    r *= 1 + amount;
    g *= 1 + amount;
    b *= 1 + amount;
  }
  const to = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const BOARD_BG = '#191b21';

/** 在画布上画一颗豆。fused=已熨烫的零件质感 */
export function drawBead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  color: string,
  fused: boolean,
  holeBg = BOARD_BG,
) {
  const r = cell * (fused ? 0.472 : 0.44);
  if (cell < 5) {
    ctx.fillStyle = color;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    return;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  if (cell > 8) {
    ctx.lineWidth = Math.max(0.5, cell * 0.045);
    ctx.strokeStyle = rgba(shade(color, -0.4), fused ? 0.5 : 0.3);
    ctx.stroke();
  }

  // 中心孔
  const hole = cell * (fused ? 0.135 : 0.16);
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0.7, hole), 0, Math.PI * 2);
  ctx.fillStyle = fused ? rgba(shade(color, -0.5), 0.62) : holeBg;
  ctx.fill();

  if (cell > 9) {
    // 塑料高光
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, Math.PI * 1.08, Math.PI * 1.55);
    ctx.lineWidth = Math.max(0.6, cell * 0.075);
    ctx.strokeStyle = fused ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.42)';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export function drawPieceThumb(
  canvas: HTMLCanvasElement,
  piece: Piece,
  options: { bg?: string | null; padding?: number } = {},
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(24, Math.round(rect.width || canvas.clientWidth || 64));
  const h = Math.max(24, Math.round(rect.height || canvas.clientHeight || 64));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (options.bg) {
    ctx.fillStyle = options.bg;
    ctx.fillRect(0, 0, w, h);
  }
  const bb = pieceBounds(piece.beads);
  if (!bb.w || !bb.h) return;
  const pad = options.padding ?? 6;
  const cell = Math.min((w - pad * 2) / bb.w, (h - pad * 2) / bb.h);
  const ox = (w - bb.w * cell) / 2;
  const oy = (h - bb.h * cell) / 2;
  ctx.save();
  for (const b of piece.beads) {
    drawBead(ctx, ox + (b.x + 0.5) * cell, oy + (b.y + 0.5) * cell, cell, b.c, true, options.bg || '#1b1d23');
  }
  ctx.restore();
}

export function formatNumber(n: number): string {
  if (n >= 100000) return `${(n / 10000).toFixed(1)} 万`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
