import type { Bead, Project } from '../types';
import { buildPatternSheet, type PatternSheetData } from './patternSheet';
import { colorStats, projectBeads, projectMetrics, BOARD_SIZE, cmText, formatMinutes } from './metrics';

const W = 2200;
const H = 1556;
const INK = '#2B2117';
const MUTED = '#706453';
const PAPER = '#FBF7EE';
const CARD = '#FFFDF8';
const ACCENT = '#E0582F';
const LINE = 'rgba(59,45,28,0.14)';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxLines = 2,
) {
  let line = '';
  let lines = 0;
  for (const ch of text) {
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

type Segment = {
  label: string;
  bx: number;
  by: number;
  x0: number;
  y0: number;
  w: number;
  h: number;
  beads: Bead[];
};

function renderBoardPage(
  project: Project,
  seg: Segment,
  info: { page: number; total: number },
): PatternSheetData {
  const title = project.title || '无题小岛';
  const fullMetrics = projectMetrics(project);
  const stats = colorStats(seg.beads);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持图纸导出');

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = INK;
  ctx.font = '700 26px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('豆屿 · BEAD ISLE', 64, 62);
  ctx.fillStyle = MUTED;
  ctx.font = '500 18px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`分板图纸 / BOARD ${seg.label}`, 64, 92);

  ctx.fillStyle = INK;
  ctx.font = '700 42px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`${title} · 板 ${seg.label}`, 64, 148);
  ctx.fillStyle = MUTED;
  ctx.font = '500 18px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(
    `本板 ${seg.beads.length} 颗 · ${stats.length} 色 · 全图 ${fullMetrics.beads} 颗 · ${cmText(fullMetrics.cmW)}×${cmText(fullMetrics.cmH)}cm · 坐标 x ${seg.x0}–${seg.x0 + seg.w - 1} / y ${seg.y0}–${seg.y0 + seg.h - 1}`,
    64,
    180,
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = MUTED;
  ctx.font = '500 16px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`第 ${info.page} / ${info.total} 页 · 板 ${seg.label}`, W - 64, 62);
  ctx.textAlign = 'left';

  const gridArea = { x: 64, y: 218, w: 1430, h: 1010 };
  const cell = Math.max(8, Math.min(gridArea.w / seg.w, gridArea.h / seg.h, 40));
  const gridW = seg.w * cell;
  const gridH = seg.h * cell;
  const gx = gridArea.x + (gridArea.w - gridW) / 2;
  const gy = gridArea.y + (gridArea.h - gridH) / 2;

  ctx.fillStyle = CARD;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.2;
  roundRect(ctx, 40, 204, 1478, 1042, 18);
  ctx.fill();
  ctx.stroke();

  // 全格网格
  ctx.strokeStyle = 'rgba(59,45,28,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= seg.w; x++) {
    ctx.moveTo(gx + x * cell, gy);
    ctx.lineTo(gx + x * cell, gy + gridH);
  }
  for (let y = 0; y <= seg.h; y++) {
    ctx.moveTo(gx, gy + y * cell);
    ctx.lineTo(gx + gridW, gy + y * cell);
  }
  ctx.stroke();

  // 坐标
  ctx.fillStyle = MUTED;
  ctx.font = '600 14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  for (let x = 0; x < seg.w; x += 5) {
    ctx.fillText(String(seg.x0 + x), gx + x * cell + cell / 2, gy - 10);
  }
  ctx.textAlign = 'right';
  for (let y = 0; y < seg.h; y += 5) {
    ctx.fillText(String(seg.y0 + y), gx - 9, gy + y * cell + cell / 2 + 5);
  }
  ctx.textAlign = 'left';

  // 豆子
  for (const b of seg.beads) {
    const x = gx + (b.x - seg.x0) * cell;
    const y = gy + (b.y - seg.y0) * cell;
    if (cell >= 12) {
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, cell * 0.43, 0, Math.PI * 2);
      ctx.fillStyle = b.c;
      ctx.fill();
      ctx.lineWidth = Math.max(1, cell * 0.045);
      ctx.strokeStyle = 'rgba(30,24,15,0.24)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, cell * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.fill();
    } else {
      ctx.fillStyle = b.c;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  // 板边界
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.strokeRect(gx, gy, gridW, gridH);
  ctx.fillStyle = ACCENT;
  ctx.font = '700 20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`板 ${seg.label}`, gx, gy - 34);

  // 图例
  const legendX = 1556;
  const legendY = 230;
  ctx.fillStyle = INK;
  ctx.font = '700 24px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`本板色号 · ${stats.length} 色`, legendX, legendY);
  ctx.fillStyle = MUTED;
  ctx.font = '500 16px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`${seg.beads.length} 颗 · 全图 ${fullMetrics.beads} 颗`, legendX, legendY + 24);

  const rowH = Math.min(34, 850 / Math.max(1, stats.length));
  stats.forEach((c, i) => {
    const y = legendY + 54 + i * rowH;
    ctx.fillStyle = c.hex;
    roundRect(ctx, legendX, y - 2, 24, 24, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(43,33,23,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = '600 16px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(`${c.code} ${c.name}`, legendX + 34, y + 16);
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    ctx.fillText(String(c.count), legendX + 590, y + 16);
    ctx.textAlign = 'left';
  });

  // 步骤 / 对位提示
  ctx.fillStyle = '#F4EADB';
  roundRect(ctx, 64, 1270, 2072, 92, 14);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = '700 20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`先对 ${seg.label} 的接缝，再往两边铺`, 84, 1302);
  ctx.fillStyle = MUTED;
  ctx.font = '500 16px "PingFang SC","Microsoft YaHei",sans-serif';
  wrapText(
    ctx,
    `本页只画板 ${seg.label}。按坐标对应全图位置；拼完先检查与相邻板的接缝，再熨烫。 全图共 ${fullMetrics.boards} 块 ${BOARD_SIZE}×${BOARD_SIZE} 拼板，预计 ${formatMinutes(fullMetrics.minutes)}。`,
    84,
    1330,
    2020,
    22,
    2,
  );

  ctx.fillStyle = MUTED;
  ctx.font = '500 13px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('豆屿 BEAD ISLE · 5mm 中豆 · 标准拼板 29×29 · 分板打印', 64, H - 22);
  ctx.textAlign = 'right';
  ctx.fillText('一颗一颗，熨成一座岛。', W - 64, H - 22);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    metrics: fullMetrics,
    title,
    label: seg.label,
    page: info.page,
    total: info.total,
  };
}

/** 总览 + 每块 29×29 拼板一页；小图只有总览页。 */
export function buildPatternPages(project: Project): PatternSheetData[] {
  const beads = projectBeads(project);
  const metrics = projectMetrics(project);
  if (!metrics.width || !metrics.height) {
    return [buildPatternSheet(project)];
  }
  if (metrics.width <= BOARD_SIZE && metrics.height <= BOARD_SIZE) {
    return [buildPatternSheet(project)];
  }
  const minX = Math.min(...beads.map((b) => b.x));
  const minY = Math.min(...beads.map((b) => b.y));
  const segments: Segment[] = [];
  const cols = Math.ceil(metrics.width / BOARD_SIZE);
  const rows = Math.ceil(metrics.height / BOARD_SIZE);
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const x0 = minX + bx * BOARD_SIZE;
      const y0 = minY + by * BOARD_SIZE;
      const x1 = Math.min(x0 + BOARD_SIZE, minX + metrics.width);
      const y1 = Math.min(y0 + BOARD_SIZE, minY + metrics.height);
      const segBeads = beads.filter((b) => b.x >= x0 && b.x < x1 && b.y >= y0 && b.y < y1);
      if (!segBeads.length) continue;
      const label = `${String.fromCharCode(65 + (bx % 26))}${by + 1}`;
      segments.push({ label, bx, by, x0, y0, w: x1 - x0, h: y1 - y0, beads: segBeads });
    }
  }
  if (!segments.length) return [buildPatternSheet(project)];
  const total = 1 + segments.length;
  return [
    buildPatternSheet(project, { page: 1, total, label: '总览' }),
    ...segments.map((seg, i) => renderBoardPage(project, seg, { page: i + 2, total })),
  ];
}
