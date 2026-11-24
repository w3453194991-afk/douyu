import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStudio } from '../store';
import { useApp } from '../appStore';
import { beadKey, beadsInRect, contentBounds, guideBounds, pieceAt, pieceBounds } from '../lib/scene';
import { BOARD_BG, drawBead, rgba } from '../lib/render';
import { Icon } from './Icon';

const CELL = 22;

type View = { zoom: number; tx: number; ty: number; w: number; h: number; dpr: number };
type Cell = { x: number; y: number };

type Interaction =
  | { type: 'pan'; sx: number; sy: number; tx0: number; ty0: number }
  | { type: 'paint'; last: Cell; erasing: boolean }
  | { type: 'erase'; last: Cell; warned: boolean }
  | { type: 'rect'; start: Cell; current: Cell }
  | { type: 'piece'; id: string; start: Cell; orig: [number, number]; moved: boolean };

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function lineCells(a: Cell, b: Cell): Cell[] {
  const out: Cell[] = [];
  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 2000; guard++) {
    out.push({ x: x0, y: y0 });
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
  return out;
}

function brushCells(cell: Cell, n: number): Cell[] {
  if (n <= 1) return [cell];
  const from = -Math.floor((n - 1) / 2);
  const out: Cell[] = [];
  for (let dy = 0; dy < n; dy++) {
    for (let dx = 0; dx < n; dx++) out.push({ x: cell.x + from + dx, y: cell.y + from + dy });
  }
  return out;
}

function normalizeRect(a: Cell, b: Cell) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function BoardView({
  onEmptyAction,
}: {
  onEmptyAction: (action: 'gallery' | 'bead') => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ zoom: 1.15, tx: 0, ty: 0, w: 0, h: 0, dpr: 1 });
  const dirtyRef = useRef(true);
  const animRef = useRef<{ from: View; to: View; start: number; dur: number } | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const spaceRef = useRef(false);
  const hoverRef = useRef<Cell | null>(null);
  const hoverPieceRef = useRef<string | null>(null);
  const rectRef = useRef<{ start: Cell; current: Cell } | null>(null);
  const drawRef = useRef<() => void>(() => {});

  const project = useStudio((s) => s.project);
  const tool = useStudio((s) => s.tool);
  const color = useStudio((s) => s.color);
  const brush = useStudio((s) => s.brush);
  const selection = useStudio((s) => s.selection);
  const selectedPieceId = useStudio((s) => s.selectedPieceId);
  const showGuide = useStudio((s) => s.showGuide);
  const showBoards = useStudio((s) => s.showBoards);
  const setShowBoards = useStudio((s) => s.setShowBoards);
  const focusRow = useStudio((s) => s.focusRow);
  const focus = useStudio((s) => s.focus);
  const ironFx = useStudio((s) => s.ironFx);

  const [status, setStatus] = useState({ cell: null as Cell | null, zoom: 115 });
  const [space, setSpace] = useState(false);
  const [steam, setSteam] = useState<number | null>(null);
  const [emptyDismissed, setEmptyDismissed] = useState(false);

  const guide = project.guide;
  const selectionCount = useMemo(
    () => (selection ? beadsInRect(project.loose, selection).length : 0),
    [selection, project.loose],
  );
  const totalLoose = project.loose.length;
  const isEmpty = totalLoose === 0 && project.pieces.length === 0 && !guide;

  const latest = useRef({
    project,
    tool,
    color,
    brush,
    selection,
    selectedPieceId,
    showGuide,
    showBoards,
    focusRow,
    hover: hoverRef.current,
    hoverPiece: hoverPieceRef.current,
    rect: rectRef.current,
    space,
  });
  latest.current = {
    project,
    tool,
    color,
    brush,
    selection,
    selectedPieceId,
    showGuide,
    showBoards,
    focusRow,
    hover: hoverRef.current,
    hoverPiece: hoverPieceRef.current,
    rect: rectRef.current,
    space,
  };

  const requestDraw = () => {
    dirtyRef.current = true;
  };

  useEffect(() => {
    requestDraw();
  }, [project, selection, selectedPieceId, showGuide, showBoards, focusRow, tool, color, brush]);

  useEffect(() => {
    if (focusRow == null) return;
    const v = viewRef.current;
    if (!v.w) return;
    const b = contentBounds(useStudio.getState().project);
    if (b && b.w > 0) {
      const safeW = Math.max(200, v.w - 90);
      const zoom = Math.max(0.16, Math.min(2.4, safeW / ((b.w + 6) * CELL)));
      v.zoom = zoom;
      v.tx = v.w / 2 - (b.x + b.w / 2) * CELL * zoom;
      v.ty = v.h / 2 - (focusRow + 0.5) * CELL * zoom;
      setStatus((s) => ({ ...s, zoom: Math.round(zoom * 100) }));
    } else {
      v.ty = v.h / 2 - (focusRow + 0.5) * CELL * v.zoom;
    }
    dirtyRef.current = true;
  }, [focusRow]);

  /* ------------------------------ drawing ------------------------------ */

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellPx = () => CELL * viewRef.current.zoom;

    const toScreen = (x: number, y: number) => {
      const v = viewRef.current;
      return {
        x: (x + 0.5) * CELL * v.zoom + v.tx,
        y: (y + 0.5) * CELL * v.zoom + v.ty,
      };
    };

    const drawGrid = () => {
      const v = viewRef.current;
      const cp = cellPx();
      const x0 = Math.floor(-v.tx / cp) - 1;
      const y0 = Math.floor(-v.ty / cp) - 1;
      const x1 = Math.ceil((v.w - v.tx) / cp) + 1;
      const y1 = Math.ceil((v.h - v.ty) / cp) + 1;

      if (cp >= 7) {
        const r = Math.min(1.8, Math.max(0.7, cp * 0.055));
        ctx.fillStyle = 'rgba(255,255,255,0.105)';
        for (let y = y0; y <= y1; y++) {
          const sy = (y + 0.5) * cp + v.ty;
          for (let x = x0; x <= x1; x++) {
            if ((x + y) % 10 === 0) continue;
            const sx = (x + 0.5) * cp + v.tx;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 10 格主网格
      ctx.strokeStyle = 'rgba(255,255,255,0.055)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const step = 10;
      for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
        const sx = x * cp + v.tx + cp / 2;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, v.h);
      }
      for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
        const sy = y * cp + v.ty + cp / 2;
        ctx.moveTo(0, sy);
        ctx.lineTo(v.w, sy);
      }
      ctx.stroke();

      // 原点
      const ox = v.tx;
      const oy = v.ty;
      if (ox > -40 && ox < v.w + 40 && oy > -40 && oy < v.h + 40) {
        ctx.strokeStyle = 'rgba(143,227,208,0.34)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ox - 9, oy);
        ctx.lineTo(ox + 9, oy);
        ctx.moveTo(ox, oy - 9);
        ctx.lineTo(ox, oy + 9);
        ctx.stroke();
        ctx.fillStyle = 'rgba(143,227,208,0.55)';
        ctx.font = '600 10px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText('0,0', ox + 12, oy - 9);
      }
    };

    const drawGuides = () => {
      const { project, showGuide, hover } = latest.current;
      if (!project.guide || !showGuide) return;
      const cp = cellPx();
      const v = viewRef.current;
      for (const piece of project.guide.pieces) {
        const bb = pieceBounds(piece.beads);
        const x = piece.pos[0];
        const y = piece.pos[1];
        // 虚线外框
        if (cp > 4) {
          ctx.save();
          ctx.strokeStyle = 'rgba(143,227,208,0.20)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 5]);
          ctx.strokeRect(
            x * cp + v.tx + cp * 0.5,
            y * cp + v.ty + cp * 0.5,
            bb.w * cp,
            bb.h * cp,
          );
          ctx.restore();
        }
        if (cp >= 5) {
          for (const b of piece.beads) {
            const gx = x + b.x;
            const gy = y + b.y;
            const s = toScreen(gx, gy);
            if (s.x < -10 || s.y < -10 || s.x > v.w + 10 || s.y > v.h + 10) continue;
            const r = cp * 0.4;
            ctx.beginPath();
            ctx.arc(s.x, s.y, Math.max(1, r), 0, Math.PI * 2);
            ctx.fillStyle = rgba(b.c, 0.18);
            ctx.fill();
            ctx.lineWidth = Math.max(0.6, cp * 0.035);
            ctx.strokeStyle = rgba(b.c, 0.46);
            ctx.stroke();
            if (cp >= 12) {
              ctx.beginPath();
              ctx.arc(s.x, s.y, Math.max(0.8, cp * 0.09), 0, Math.PI * 2);
              ctx.fillStyle = rgba(b.c, 0.72);
              ctx.fill();
            }
          }
        }
      }
      // 图纸标注
      if (cp >= 9) {
        ctx.font = '600 10px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillStyle = 'rgba(143,227,208,0.45)';
        for (const piece of project.guide.pieces) {
          const bb = pieceBounds(piece.beads);
          ctx.fillText(`原 · ${piece.name}`, piece.pos[0] * cp + v.tx + cp * 0.5, piece.pos[1] * cp + v.ty + cp * 0.5 - 6);
          void bb;
        }
      }
      void hover;
    };

    const drawLoose = () => {
      const cp = cellPx();
      const v = viewRef.current;
      if (cp < 3) return;
      for (const b of latest.current.project.loose) {
        const sx = (b.x + 0.5) * cp + v.tx;
        const sy = (b.y + 0.5) * cp + v.ty;
        if (sx < -cp || sy < -cp || sx > v.w + cp || sy > v.h + cp) continue;
        drawBead(ctx, sx, sy, cp, b.c, false, BOARD_BG);
      }
    };

    const drawPieces = () => {
      const cp = cellPx();
      const v = viewRef.current;
      const { project, selectedPieceId, hoverPiece, tool } = latest.current;
      if (cp < 3) return;
      for (const piece of project.pieces) {
        const bb = pieceBounds(piece.beads);
        const bx = (piece.pos[0] + 0.5) * cp + v.tx;
        const by = (piece.pos[1] + 0.5) * cp + v.ty;
        const bw = bb.w * cp;
        const bh = bb.h * cp;
        if (bx + bw < -cp || by + bh < -cp || bx > v.w + cp || by > v.h + cp) continue;

        // 零件落影
        if (cp > 6) {
          ctx.fillStyle = 'rgba(0,0,0,0.32)';
          roundRect(ctx, bx + cp * 0.12, by + cp * 0.2, bw, bh, Math.min(6, cp * 0.4));
          ctx.fill();
        }

        for (const b of piece.beads) {
          const sx = (piece.pos[0] + b.x + 0.5) * cp + v.tx;
          const sy = (piece.pos[1] + b.y + 0.5) * cp + v.ty;
          drawBead(ctx, sx, sy, cp, b.c, true, BOARD_BG);
        }

        const isSelected = piece.id === selectedPieceId;
        const isHover = piece.id === hoverPiece && tool === 'select' && !isSelected;
        if ((isSelected || isHover) && cp > 5) {
          ctx.save();
          ctx.setLineDash(isSelected ? [6, 4] : [3, 4]);
          ctx.lineWidth = isSelected ? 1.8 : 1.2;
          ctx.strokeStyle = isSelected ? 'rgba(255,184,77,0.95)' : 'rgba(143,227,208,0.7)';
          ctx.strokeRect(bx - cp * 0.1, by - cp * 0.1, bw + cp * 0.2, bh + cp * 0.2);
          ctx.restore();
        }

        if (isSelected && cp > 6) {
          const label = `${piece.name} · ${piece.beads.length} 颗`;
          ctx.font = '600 11px "PingFang SC","Microsoft YaHei",sans-serif';
          const tw = ctx.measureText(label).width;
          const lx = bx;
          const ly = Math.max(8, by - 26);
          ctx.fillStyle = '#F6F0E4';
          roundRect(ctx, lx, ly, tw + 18, 20, 10);
          ctx.fill();
          ctx.fillStyle = '#3A2C1D';
          ctx.fillText(label, lx + 9, ly + 14);
        }
      }
    };

    const drawOverlay = () => {
      const v = viewRef.current;
      const cp = cellPx();
      const { selection, rect, hover, tool, color: currentColor, brush } = latest.current;

      if (selection) {
        const x = selection.x * cp + v.tx + cp / 2;
        const y = selection.y * cp + v.ty + cp / 2;
        const w = selection.w * cp;
        const h = selection.h * cp;
        ctx.fillStyle = 'rgba(224,88,47,0.10)';
        ctx.fillRect(x, y, w, h);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(255,138,92,0.95)';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
        ctx.fillStyle = 'rgba(255,184,150,0.9)';
        ctx.font = '600 10px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText(`${selection.w} × ${selection.h}`, x + 4, y - 6);
      }

      if (rect) {
        const r = normalizeRect(rect.start, rect.current);
        const x = r.x * cp + v.tx + cp / 2;
        const y = r.y * cp + v.ty + cp / 2;
        ctx.fillStyle = 'rgba(224,88,47,0.08)';
        ctx.fillRect(x, y, r.w * cp, r.h * cp);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(255,138,92,0.8)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x, y, r.w * cp, r.h * cp);
        ctx.restore();
        ctx.fillStyle = 'rgba(255,200,175,0.85)';
        ctx.font = '600 10px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText(`${r.w} × ${r.h}`, x + r.w * cp + 6, y + r.h * cp + 12);
      }

      if (hover && cp >= 4) {
        const s = toScreen(hover.x, hover.y);
        if (tool === 'bead' || tool === 'erase') {
          const isErase = tool === 'erase';
          const n = brush;
          const from = -Math.floor((n - 1) / 2);
          const x = (hover.x + from) * cp + v.tx;
          const y = (hover.y + from) * cp + v.ty;
          ctx.save();
          if (isErase) {
            ctx.fillStyle = 'rgba(255,93,93,0.12)';
            ctx.fillRect(x, y, n * cp, n * cp);
            ctx.strokeStyle = 'rgba(255,120,110,0.9)';
          } else {
            ctx.strokeStyle = rgba(currentColor, 0.95);
            ctx.fillStyle = rgba(currentColor, 0.16);
            ctx.fillRect(x, y, n * cp, n * cp);
          }
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, n * cp, n * cp);
          ctx.restore();
          if (n === 1) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, cp * 0.5, 0, Math.PI * 2);
            ctx.strokeStyle = isErase ? 'rgba(255,120,110,0.9)' : rgba(currentColor, 0.95);
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        } else if (tool === 'pick') {
          ctx.beginPath();
          ctx.arc(s.x, s.y, cp * 0.34, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(143,227,208,0.9)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
    };

    const drawBoardGuides = () => {
      const { showBoards } = latest.current;
      if (!showBoards) return;
      const v = viewRef.current;
      const cp = cellPx();
      const board = 29;
      const stepPx = cp * board;
      if (stepPx < 8) return;
      const gx0 = Math.floor(-v.tx / stepPx) - 1;
      const gx1 = Math.ceil((v.w - v.tx) / stepPx) + 1;
      const gy0 = Math.floor(-v.ty / stepPx) - 1;
      const gy1 = Math.ceil((v.h - v.ty) / stepPx) + 1;

      ctx.save();
      ctx.strokeStyle = 'rgba(245,194,79,0.32)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      for (let gx = gx0; gx <= gx1; gx++) {
        const x = gx * stepPx + v.tx;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, v.h);
      }
      for (let gy = gy0; gy <= gy1; gy++) {
        const y = gy * stepPx + v.ty;
        ctx.moveTo(0, y);
        ctx.lineTo(v.w, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      if (stepPx >= 46) {
        ctx.font = '700 10px "PingFang SC","Microsoft YaHei",sans-serif';
        for (let gy = gy0; gy <= gy1; gy++) {
          for (let gx = gx0; gx <= gx1; gx++) {
            const x = gx * stepPx + v.tx;
            const y = gy * stepPx + v.ty;
            if (x < -40 || y < -40 || x > v.w + 40 || y > v.h + 40) continue;
            const label = `${String.fromCharCode(65 + ((gx % 26) + 26) % 26)}${gy + 1}`;
            ctx.fillStyle = 'rgba(30,24,15,0.6)';
            ctx.fillRect(x + 4, y + 4, 25, 16);
            ctx.fillStyle = 'rgba(245,194,79,0.95)';
            ctx.fillText(label, x + 8, y + 16);
          }
        }
      }
      ctx.restore();
    };

    const drawRowFocus = () => {
      const { focusRow } = latest.current;
      if (focusRow == null) return;
      const v = viewRef.current;
      const cp = cellPx();
      const y = focusRow * cp + v.ty;
      if (y + cp < 0 || y > v.h) return;
      ctx.save();
      ctx.fillStyle = 'rgba(10,12,16,0.48)';
      ctx.fillRect(0, 0, v.w, Math.max(0, y));
      ctx.fillRect(0, y + cp, v.w, Math.max(0, v.h - y - cp));
      ctx.fillStyle = 'rgba(245,194,79,0.12)';
      ctx.fillRect(0, y, v.w, cp);
      ctx.strokeStyle = 'rgba(245,194,79,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(v.w, y);
      ctx.moveTo(0, y + cp);
      ctx.lineTo(v.w, y + cp);
      ctx.stroke();
      ctx.font = '700 10px "PingFang SC","Microsoft YaHei",sans-serif';
      const cb = contentBounds(latest.current.project);
      const rowNo = cb ? focusRow - cb.y + 1 : focusRow + 1;
      const label = `第 ${rowNo} 行`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(245,194,79,0.95)';
      roundRect(ctx, 10, y + Math.max(2, cp / 2 - 9), tw + 14, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#2B2117';
      ctx.fillText(label, 17, y + Math.max(2, cp / 2 - 9) + 13);
      ctx.restore();
    };

    const draw = () => {
      const v = viewRef.current;
      ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      ctx.fillStyle = BOARD_BG;
      ctx.fillRect(0, 0, v.w, v.h);
      drawGrid();
      drawGuides();
      drawLoose();
      drawPieces();
      drawBoardGuides();
      drawRowFocus();
      drawOverlay();
    };
    drawRef.current = draw;

    let raf = 0;
    const loop = (t: number) => {
      const anim = animRef.current;
      if (anim) {
        const k = Math.min(1, (t - anim.start) / anim.dur);
        const e = easeOutCubic(k);
        const v = viewRef.current;
        v.zoom = anim.from.zoom + (anim.to.zoom - anim.from.zoom) * e;
        v.tx = anim.from.tx + (anim.to.tx - anim.from.tx) * e;
        v.ty = anim.from.ty + (anim.to.ty - anim.from.ty) * e;
        dirtyRef.current = true;
        if (k >= 1) animRef.current = null;
      }
      if (dirtyRef.current) {
        dirtyRef.current = false;
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const v = viewRef.current;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      if (!v.w) {
        v.w = r.width;
        v.h = r.height;
        v.dpr = dpr;
        v.tx = r.width / 2;
        v.ty = r.height / 2;
        fitInitial();
      } else {
        v.tx += (r.width - v.w) / 2;
        v.ty += (r.height - v.h) / 2;
        v.w = r.width;
        v.h = r.height;
        v.dpr = dpr;
      }
      dirtyRef.current = true;
      setStatus((s) => ({ ...s, zoom: Math.round(v.zoom * 100) }));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  /* ------------------------------ fit view ------------------------------ */

  const fitRect = (rect: { x: number; y: number; w: number; h: number } | null, animate = true) => {
    const v = viewRef.current;
    if (!v.w) return;
    const safeW = Math.max(200, v.w - 90);
    const safeH = Math.max(200, v.h - 190);
    let zoom = 1.2;
    let cx = 0.5;
    let cy = 0.5;
    if (rect && rect.w > 0 && rect.h > 0) {
      zoom = Math.min(safeW / ((rect.w + 6) * CELL), safeH / ((rect.h + 6) * CELL), 2.4);
      zoom = Math.max(0.16, Math.min(3.2, zoom));
      cx = rect.x + rect.w / 2;
      cy = rect.y + rect.h / 2;
    }
    const to: View = {
      ...v,
      zoom,
      tx: v.w / 2 - cx * CELL * zoom,
      ty: v.h / 2 - cy * CELL * zoom,
    };
    if (animate) {
      animRef.current = { from: { ...v }, to, start: performance.now(), dur: 320 };
      setStatus((s) => ({ ...s, zoom: Math.round(zoom * 100) }));
    } else {
      v.zoom = to.zoom;
      v.tx = to.tx;
      v.ty = to.ty;
      dirtyRef.current = true;
      setStatus((s) => ({ ...s, zoom: Math.round(zoom * 100) }));
    }
  };

  const fitInitial = () => {
    const st = useStudio.getState();
    const f = st.focus;
    const p = st.project;
    if (f?.kind === 'piece' && f.id) {
      const piece = p.pieces.find((x) => x.id === f.id);
      if (piece) {
        const bb = pieceBounds(piece.beads);
        fitRect({ x: piece.pos[0], y: piece.pos[1], w: bb.w, h: bb.h }, false);
        return;
      }
    }
    const gb = p.guide ? guideBounds(p.guide) : null;
    const cb = contentBounds(p);
    fitRect(gb || cb, false);
  };

  useEffect(() => {
    const unsub = useStudio.subscribe((state, prev) => {
      if (state.focus && state.focus !== prev.focus) {
        const f = state.focus;
        const p = state.project;
        if (f.kind === 'piece' && f.id) {
          const piece = p.pieces.find((x) => x.id === f.id);
          if (piece) {
            const bb = pieceBounds(piece.beads);
            fitRect({ x: piece.pos[0] - 1, y: piece.pos[1] - 1, w: bb.w + 2, h: bb.h + 2 });
            return;
          }
        }
        if (f.kind === 'guide' && p.guide) {
          fitRect(guideBounds(p.guide));
          return;
        }
        if (f.kind === 'content') {
          fitRect(contentBounds(p));
          return;
        }
        fitRect(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!ironFx) return;
    setSteam(ironFx.nonce);
    const t = window.setTimeout(() => setSteam(null), 1100);
    return () => clearTimeout(t);
  }, [ironFx]);

  /* ------------------------------ keyboard ------------------------------ */

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.code === 'Space') {
        if (!spaceRef.current) {
          spaceRef.current = true;
          setSpace(true);
        }
        if (e.target === document.body) e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceRef.current = false;
        setSpace(false);
      }
    };
    const blur = () => {
      spaceRef.current = false;
      setSpace(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  /* ------------------------------ pointer ------------------------------ */

  const cellAt = (e: React.PointerEvent | PointerEvent): Cell => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const v = viewRef.current;
    const cp = CELL * v.zoom;
    return {
      x: Math.floor((e.clientX - r.left - v.tx) / cp),
      y: Math.floor((e.clientY - r.top - v.ty) / cp),
    };
  };

  const updateHover = (cell: Cell | null) => {
    hoverRef.current = cell;
    const st = useStudio.getState();
    let hp: string | null = null;
    if (cell && st.tool === 'select') {
      hp = pieceAt(st.project.pieces, cell.x, cell.y)?.id ?? null;
      if (hp !== hoverPieceRef.current) {
        hoverPieceRef.current = hp;
        dirtyRef.current = true;
      }
    } else if (hoverPieceRef.current) {
      hoverPieceRef.current = null;
      dirtyRef.current = true;
    }
    setStatus((s) => (s.cell?.x === cell?.x && s.cell?.y === cell?.y ? s : { ...s, cell }));
    dirtyRef.current = true;
  };

  const paintAt = (from: Cell, to: Cell, erasing: boolean) => {
    const st = useStudio.getState();
    const path = lineCells(from, to);
    const cells = path.flatMap((c) => brushCells(c, st.brush));
    if (erasing) {
      st.erase(cells.map((c) => [c.x, c.y]));
    } else {
      st.paint(cells.map((c) => [c.x, c.y]));
    }
  };

  const startErase = (cell: Cell) => {
    const st = useStudio.getState();
    st.beginAction();
    st.erase(brushCells(cell, st.brush).map((c) => [c.x, c.y]));
    interactionRef.current = { type: 'erase', last: cell, warned: false };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    canvas.focus();
    canvas.setPointerCapture(e.pointerId);
    const st = useStudio.getState();
    const cell = cellAt(e);
    const wantPan = st.tool === 'pan' || e.button === 1 || spaceRef.current;
    if (wantPan) {
      e.preventDefault();
      interactionRef.current = {
        type: 'pan',
        sx: e.clientX,
        sy: e.clientY,
        tx0: viewRef.current.tx,
        ty0: viewRef.current.ty,
      };
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 2 || (st.tool === 'bead' && e.altKey)) {
      e.preventDefault();
      startErase(cell);
      return;
    }

    if (st.tool === 'bead') {
      st.beginAction();
      st.paint(brushCells(cell, st.brush).map((c) => [c.x, c.y]));
      interactionRef.current = { type: 'paint', last: cell, erasing: false };
      return;
    }

    if (st.tool === 'erase') {
      startErase(cell);
      return;
    }

    if (st.tool === 'pick') {
      const picked = st.pick(cell.x, cell.y);
      if (picked) {
        useApp.getState().toast('info', '吸到一颗豆', `${picked.toUpperCase()} · 已切换成画笔`);
        useStudio.getState().setTool('bead');
      }
      return;
    }

    if (st.tool === 'select') {
      const hit = pieceAt(st.project.pieces, cell.x, cell.y);
      if (hit) {
        st.selectPiece(hit.id);
        interactionRef.current = {
          type: 'piece',
          id: hit.id,
          start: cell,
          orig: [hit.pos[0], hit.pos[1]],
          moved: false,
        };
        canvas.style.cursor = 'grabbing';
        return;
      }
      st.selectPiece(null);
      rectRef.current = { start: cell, current: cell };
      interactionRef.current = { type: 'rect', start: cell, current: cell };
      dirtyRef.current = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellAt(e);
    updateHover(cell);
    const inter = interactionRef.current;
    if (!inter) return;
    if (inter.type === 'pan') {
      viewRef.current.tx = inter.tx0 + (e.clientX - inter.sx);
      viewRef.current.ty = inter.ty0 + (e.clientY - inter.sy);
      dirtyRef.current = true;
      return;
    }
    if (inter.type === 'paint') {
      if (cell.x !== inter.last.x || cell.y !== inter.last.y) {
        paintAt(inter.last, cell, false);
        inter.last = cell;
      }
      return;
    }
    if (inter.type === 'erase') {
      if (cell.x !== inter.last.x || cell.y !== inter.last.y) {
        const removed = useStudio.getState().erase(
          lineCells(inter.last, cell).flatMap((c) => brushCells(c, useStudio.getState().brush)).map((c) => [c.x, c.y]),
        );
        if (removed === 0 && !inter.warned) {
          const hit = pieceAt(useStudio.getState().project.pieces, cell.x, cell.y);
          if (hit) {
            inter.warned = true;
            useApp.getState().toast('info', '这块已经熨好了', '选中零件后点「拆开」，就能逐颗修改');
          }
        }
        inter.last = cell;
      }
      return;
    }
    if (inter.type === 'rect') {
      inter.current = cell;
      rectRef.current = { start: inter.start, current: cell };
      dirtyRef.current = true;
      return;
    }
    if (inter.type === 'piece') {
      const dx = cell.x - inter.start.x;
      const dy = cell.y - inter.start.y;
      if (dx !== 0 || dy !== 0) {
        if (!inter.moved) {
          useStudio.getState().beginAction();
          inter.moved = true;
        }
        useStudio.getState().movePiece(inter.id, [inter.orig[0] + dx, inter.orig[1] + dy]);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const inter = interactionRef.current;
    interactionRef.current = null;
    const canvas = e.currentTarget;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    canvas.style.cursor = '';
    const st = useStudio.getState();
    if (!inter) return;
    if (inter.type === 'paint' || inter.type === 'erase' || inter.type === 'piece') {
      st.endAction();
    }
    if (inter.type === 'rect') {
      const r = normalizeRect(inter.start, inter.current);
      const moved =
        Math.abs(inter.current.x - inter.start.x) + Math.abs(inter.current.y - inter.start.y) > 0;
      rectRef.current = null;
      st.setSelection(moved ? r : null);
      dirtyRef.current = true;
    }
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const v = viewRef.current;
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const cp = CELL * v.zoom;
    const worldX = (sx - v.tx) / cp;
    const worldY = (sy - v.ty) / cp;
    const factor = Math.exp(-e.deltaY * 0.0016);
    const zoom = Math.max(0.16, Math.min(3.4, v.zoom * factor));
    v.zoom = zoom;
    v.tx = sx - worldX * CELL * zoom;
    v.ty = sy - worldY * CELL * zoom;
    dirtyRef.current = true;
    setStatus((s) => ({ ...s, zoom: Math.round(zoom * 100) }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const v = viewRef.current;
    const sx = v.w / 2;
    const sy = v.h / 2;
    const cp = CELL * v.zoom;
    const worldX = (sx - v.tx) / cp;
    const worldY = (sy - v.ty) / cp;
    const zoom = Math.max(0.16, Math.min(3.4, v.zoom * factor));
    v.zoom = zoom;
    v.tx = sx - worldX * CELL * zoom;
    v.ty = sy - worldY * CELL * zoom;
    dirtyRef.current = true;
    setStatus((s) => ({ ...s, zoom: Math.round(zoom * 100) }));
  };

  const cursor = space ? 'grab' : tool === 'bead' ? 'crosshair' : tool === 'erase' ? 'cell' : tool === 'pick' ? 'copy' : tool === 'pan' ? 'grab' : 'default';

  return (
    <div className="board-stage" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="board-canvas"
        style={{ cursor }}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          updateHover(null);
        }}
        onContextMenu={(e) => e.preventDefault()}
      />

      <div className="board-status">
        <span className="mono">{status.cell ? `${status.cell.x}, ${status.cell.y}` : '自由板面'}</span>
        <span className="dot-sep" />
        <span>{status.zoom}%</span>
        <span className="dot-sep" />
        <span>
          {totalLoose} 颗散豆 · {project.pieces.length} 块零件
        </span>
        {guide && (
          <>
            <span className="dot-sep" />
            <span>图纸模式</span>
          </>
        )}
      </div>

      <div className="board-zoom">
        <button
          className={`icon-btn ${showBoards ? 'on' : ''}`}
          title={showBoards ? '隐藏 29×29 拼板线' : '显示 29×29 拼板线'}
          onClick={() => setShowBoards(!showBoards)}
        >
          <Icon name="board" size={18} />
        </button>
        <button className="icon-btn" title="放大" onClick={() => zoomBy(1.25)}>
          <Icon name="zoomIn" size={18} />
        </button>
        <button className="icon-btn" title="缩小" onClick={() => zoomBy(0.8)}>
          <Icon name="zoomOut" size={18} />
        </button>
        <button className="icon-btn" title="回到内容" onClick={() => fitRect(guideBounds(guide) || contentBounds(project))}>
          <Icon name="fit" size={18} />
        </button>
      </div>

      {focusRow != null && (
        <div className="row-focus-chip">
          <span>
            跟做中 · 第 {focusRow - (contentBounds(project)?.y ?? 0) + 1} 行
          </span>
          <button onClick={() => useStudio.getState().setFocusRow(null)}>退出</button>
        </div>
      )}

      {selection && (
        <div className="selection-bar">
          <div className="selection-info">
            <Icon name="select" size={16} />
            <b>
              {selection.w} × {selection.h}
            </b>
            <span>{selectionCount} 颗散豆</span>
          </div>
          <div className="selection-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                const n = useStudio.getState().ironSelection();
                if (!n) useApp.getState().toast('info', '选区里没有可以熨的散豆');
              }}
            >
              <Icon name="iron" size={16} /> 熨烫选区
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const n = useStudio.getState().deleteSelection();
                if (n) useApp.getState().toast('info', `收走了 ${n} 颗豆`);
              }}
            >
              <Icon name="trash" size={16} /> 收走
            </button>
            <button className="icon-btn" onClick={() => useStudio.getState().clearSelection()} title="取消选区">
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
      )}

      {steam && (
        <div className="steam-layer" key={steam}>
          <span className="steam s1" />
          <span className="steam s2" />
          <span className="steam s3" />
          <span className="steam s4" />
          <span className="steam s5" />
        </div>
      )}

      {isEmpty && !emptyDismissed && (
        <div className="empty-board">
          <div className="empty-beads" aria-hidden="true">
            {['#E0582F', '#F5C24F', '#8ECFBB', '#4DA7D9', '#F5B0C0'].map((c, i) => (
              <span key={i} style={{ background: c, animationDelay: `${i * 90}ms` }} />
            ))}
          </div>
          <h2>这块板，没有边。</h2>
          <p>
            一颗一颗放上去，连成一块就能熨成零件，
            <br />
            再去立体拼装里，把它们立成一个小世界。
          </p>
          <div className="empty-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                setEmptyDismissed(true);
                onEmptyAction('bead');
              }}
            >
              <Icon name="bead" size={18} /> 放第一颗豆
            </button>
            <button className="btn btn-ghost" onClick={() => onEmptyAction('gallery')}>
              <Icon name="gallery" size={18} /> 去集市找图纸
            </button>
          </div>
          <div className="empty-hints">
            <span>
              <kbd>空格</kbd> 拖动板面
            </span>
            <span>
              <kbd>滚轮</kbd> 缩放
            </span>
            <span>
              <kbd>右键</kbd> 收豆
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
