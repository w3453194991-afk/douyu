import React, { useEffect, useRef } from 'react';
import type { Project } from '../types';
import { drawBead, rgba } from '../lib/render';

export function drawProjectPreview(
  canvas: HTMLCanvasElement,
  project: Project,
  options: { padBottom?: number; maxCell?: number } = {},
) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = rect.width;
  const h = rect.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = '#191b21';
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.45, Math.max(w, h) * 0.8);
  glow.addColorStop(0, 'rgba(255,255,255,0.045)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let y = 14; y < h; y += 18) {
    for (let x = 14; x < w; x += 18) {
      ctx.beginPath();
      ctx.arc(x, y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const beads: Array<{ x: number; y: number; c: string; fused: boolean }> = [];
  for (const b of project.loose) beads.push({ x: b.x, y: b.y, c: b.c, fused: false });
  for (const p of project.pieces) {
    for (const b of p.beads) beads.push({ x: p.pos[0] + b.x, y: p.pos[1] + b.y, c: b.c, fused: true });
  }
  const guideBeads: Array<{ x: number; y: number; c: string }> = [];
  if (project.guide) {
    for (const p of project.guide.pieces) {
      for (const b of p.beads) guideBeads.push({ x: p.pos[0] + b.x, y: p.pos[1] + b.y, c: b.c });
    }
  }

  const all = [...beads, ...guideBeads];
  if (!all.length) {
    ctx.save();
    ctx.strokeStyle = 'rgba(224,88,47,0.58)';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.roundRect(w / 2 - 92, h / 2 - 52, 184, 104, 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 12, h / 2);
    ctx.lineTo(w / 2 + 12, h / 2);
    ctx.moveTo(w / 2, h / 2 - 12);
    ctx.lineTo(w / 2, h / 2 + 12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.46)';
    ctx.font = '500 11px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('一块空板，等你放第一颗', w / 2, h / 2 + 34);
    ctx.restore();
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of all) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x);
    maxY = Math.max(maxY, b.y);
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const padX = 34;
  const padTop = 26;
  const padBottom = options.padBottom ?? 104;
  const cell = Math.max(
    3,
    Math.min((w - padX * 2) / bw, (h - padTop - padBottom) / bh, options.maxCell ?? 18),
  );
  const ox = (w - bw * cell) / 2 - minX * cell;
  const oy = padTop + (h - padTop - padBottom - bh * cell) / 2 - minY * cell;

  if (guideBeads.length) {
    for (const b of guideBeads) {
      const cx = ox + (b.x + 0.5) * cell;
      const cy = oy + (b.y + 0.5) * cell;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = rgba(b.c, 0.14);
      ctx.fill();
      ctx.strokeStyle = rgba(b.c, 0.35);
      ctx.lineWidth = Math.max(0.5, cell * 0.04);
      ctx.stroke();
    }
  }

  for (const b of beads) {
    drawBead(ctx, ox + (b.x + 0.5) * cell, oy + (b.y + 0.5) * cell, cell, b.c, b.fused, '#191b21');
  }
}

export function ProjectPreview({
  project,
  className = '',
  padBottom = 104,
  maxCell = 18,
}: {
  project: Project;
  className?: string;
  padBottom?: number;
  maxCell?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => drawProjectPreview(canvas, project, { padBottom, maxCell });
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [project, padBottom, maxCell]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
