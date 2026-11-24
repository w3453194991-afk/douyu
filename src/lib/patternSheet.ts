import type { Project } from '../types';
import { projectBeads, projectMetrics, BOARD_SIZE, cmText, formatMinutes, type ProjectMetrics } from './metrics';
import { drawColorLegend } from './legend';

export type PatternSheetData = {
  dataUrl: string;
  metrics: ProjectMetrics;
  title: string;
  label: string;
  page: number;
  total: number;
};

const W = 2200;
const H = 1556;
const INK = '#2B2117';
const MUTED = '#706453';
const PAPER = '#FBF7EE';
const CARD = '#FFFDF8';
const ACCENT = '#E0582F';
const GOLD = '#C9A227';
const LINE = 'rgba(59,45,28,0.14)';

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

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 2) {
  let line = '';
  let lines = 0;
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      lines++;
      line = ch;
      if (lines >= maxLines) return;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineH);
}

/** 把当前作品画成一张可打印的 A4 横版图纸（含色号、用量、分板线）。 */
export function buildPatternSheet(
  project: Project,
  pageInfo: { page?: number; total?: number; label?: string } = {},
): PatternSheetData {
  const beads = projectBeads(project);
  const metrics = projectMetrics(project);
  const title = project.title || '无题小岛';
  const label = pageInfo.label || '总览';
  const page = pageInfo.page || 1;
  const total = pageInfo.total || 1;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持图纸导出');

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // 顶部
  ctx.fillStyle = INK;
  ctx.font = '700 26px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('豆屿 · BEAD ISLE', 64, 62);
  ctx.fillStyle = MUTED;
  ctx.font = '500 18px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('拼豆图纸 / PATTERN CHART', 64, 92);

  ctx.fillStyle = INK;
  ctx.font = '700 44px "PingFang SC","Microsoft YaHei",sans-serif';
  wrapText(ctx, title, 64, 150, 1180, 48, 1);

  ctx.fillStyle = MUTED;
  ctx.font = '500 19px "PingFang SC","Microsoft YaHei",sans-serif';
  const meta = `${metrics.beads} 颗豆 · ${metrics.colors} 色 · 成品约 ${cmText(metrics.cmW)} × ${cmText(metrics.cmH)} cm · ${metrics.boards} 块 ${BOARD_SIZE}×${BOARD_SIZE} 拼板 · ${formatMinutes(metrics.minutes)} · ${metrics.difficulty}`;
  wrapText(ctx, meta, 64, 182, 1900, 26, 1);
  if (total > 1) {
    ctx.fillStyle = MUTED;
    ctx.font = '500 16px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${label} · 第 ${page} / ${total} 页`, W - 64, 62);
    ctx.textAlign = 'left';
  }

  // 网格区域
  const gridArea = { x: 64, y: 222, w: 1390, h: 1010 };
  const bw = Math.max(1, metrics.width);
  const bh = Math.max(1, metrics.height);
  const cell = Math.max(6, Math.min(gridArea.w / bw, gridArea.h / bh, 40));
  const gridW = bw * cell;
  const gridH = bh * cell;
  const gx = gridArea.x + (gridArea.w - gridW) / 2;
  const gy = gridArea.y + (gridArea.h - gridH) / 2;

  // 纸张卡片
  ctx.fillStyle = CARD;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.2;
  roundRect(ctx, 40, 208, 1438, 1038, 18);
  ctx.fill();
  ctx.stroke();

  if (!beads.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '500 30px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('这块板上还没有豆子', gridArea.x + gridArea.w / 2, gridArea.y + gridArea.h / 2);
    ctx.textAlign = 'left';
  } else {
    // 找左上角
    let minX = Infinity;
    let minY = Infinity;
    for (const b of beads) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
    }

    // 空白格网格
    if (cell >= 8) {
      ctx.strokeStyle = 'rgba(59,45,28,0.055)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= bw; x++) {
        ctx.moveTo(gx + x * cell, gy);
        ctx.lineTo(gx + x * cell, gy + gridH);
      }
      for (let y = 0; y <= bh; y++) {
        ctx.moveTo(gx, gy + y * cell);
        ctx.lineTo(gx + gridW, gy + y * cell);
      }
      ctx.stroke();
    }

    // 豆子
    for (const b of beads) {
      const x = gx + (b.x - minX) * cell;
      const y = gy + (b.y - minY) * cell;
      if (cell >= 9) {
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.43, 0, Math.PI * 2);
        ctx.fillStyle = b.c;
        ctx.fill();
        ctx.lineWidth = Math.max(1, cell * 0.045);
        ctx.strokeStyle = 'rgba(30,24,15,0.24)';
        ctx.stroke();
        if (cell >= 14) {
          ctx.beginPath();
          ctx.arc(x + cell / 2, y + cell / 2, cell * 0.14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.68)';
          ctx.fill();
        }
      } else {
        ctx.fillStyle = b.c;
        ctx.fillRect(x, y, cell, cell);
      }
    }

    // 零件虚线边界
    if (project.pieces.length && cell >= 7) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(43,33,23,0.34)';
      ctx.lineWidth = 1;
      for (const p of project.pieces) {
        let pMinX = Infinity;
        let pMinY = Infinity;
        let pMaxX = -Infinity;
        let pMaxY = -Infinity;
        for (const b of p.beads) {
          pMinX = Math.min(pMinX, p.pos[0] + b.x);
          pMinY = Math.min(pMinY, p.pos[1] + b.y);
          pMaxX = Math.max(pMaxX, p.pos[0] + b.x);
          pMaxY = Math.max(pMaxY, p.pos[1] + b.y);
        }
        if (!Number.isFinite(pMinX)) continue;
        ctx.strokeRect(
          gx + (pMinX - minX) * cell,
          gy + (pMinY - minY) * cell,
          (pMaxX - pMinX + 1) * cell,
          (pMaxY - pMinY + 1) * cell,
        );
      }
      ctx.restore();
    }

    // 29×29 分板线
    ctx.save();
    ctx.strokeStyle = 'rgba(224,88,47,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    for (let x = BOARD_SIZE; x < bw; x += BOARD_SIZE) {
      ctx.beginPath();
      ctx.moveTo(gx + x * cell, gy);
      ctx.lineTo(gx + x * cell, gy + gridH);
      ctx.stroke();
    }
    for (let y = BOARD_SIZE; y < bh; y += BOARD_SIZE) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + y * cell);
      ctx.lineTo(gx + gridW, gy + y * cell);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (cell >= 10) {
      ctx.font = '700 13px "PingFang SC","Microsoft YaHei",sans-serif';
      for (let y = 0; y < metrics.boardsY; y++) {
        for (let x = 0; x < metrics.boardsX; x++) {
          const label = `${String.fromCharCode(65 + (x % 26))}${y + 1}`;
          const lx = gx + x * BOARD_SIZE * cell + 6;
          const ly = gy + y * BOARD_SIZE * cell + 6;
          ctx.fillStyle = 'rgba(255,253,248,0.9)';
          ctx.fillRect(lx, ly, 30, 20);
          ctx.fillStyle = ACCENT;
          ctx.fillText(label, lx + 6, ly + 15);
        }
      }
    }
    ctx.restore();

    // 坐标刻度
    ctx.fillStyle = MUTED;
    ctx.font = '500 12px "PingFang SC","Microsoft YaHei",sans-serif';
    for (let x = 0; x < bw; x += 5) {
      const sx = gx + x * cell + cell / 2;
      ctx.textAlign = 'center';
      ctx.fillText(String(x), sx, gy - 8);
    }
    ctx.textAlign = 'right';
    for (let y = 0; y < bh; y += 5) {
      const sy = gy + y * cell + cell / 2 + 4;
      ctx.fillText(String(y), gx - 8, sy);
    }
    ctx.textAlign = 'left';

    // 拼板清单
    ctx.fillStyle = MUTED;
    ctx.font = '500 15px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(
      `分板：${metrics.boardsX} × ${metrics.boardsY} · 每块 ${BOARD_SIZE}×${BOARD_SIZE} · 共 ${metrics.boards} 块`,
      gridArea.x,
      gy + gridH + 38,
    );
  }

  // 色号图例
  const legendX = 1510;
  const legendY = 228;
  ctx.fillStyle = INK;
  ctx.font = '700 24px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('色号清单', legendX, legendY);
  ctx.fillStyle = MUTED;
  ctx.font = '500 16px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`${metrics.colors} 种颜色 · ${metrics.beads} 颗`, legendX, legendY + 24);

  const list = metrics.colorStats;
  const legendBox = { x: legendX, y: 280, w: 626, h: 900 };
  const legendH = drawColorLegend(ctx, list, legendBox);

  // 建议
  const adviceY = Math.min(1200, legendBox.y + legendH + 16);
  ctx.fillStyle = '#F4EADB';
  roundRect(ctx, legendX, adviceY, 610, 54, 10);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = '500 15px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('按 1000 颗/包估算，建议每色多备 10%', legendX + 14, adviceY + 33);

  // 底部步骤
  const steps = [
    { n: '01', t: '先摆轮廓', d: '把外轮廓和一格格边界摆好，再填大面积颜色，不容易错位。' },
    { n: '02', t: '按色号填', d: '照着图例一色一色填；每完成一色，在清单上划掉。' },
    { n: '03', t: '胶带法翻面', d: '大图用美纹纸贴牢、压紧、逐颗扎孔，再用硬板翻面。' },
    { n: '04', t: '熨烫压平', d: '垫熨烫纸中温打圈，两面各熨一次；趁热用书压平。' },
  ];
  const footY = 1268;
  ctx.fillStyle = INK;
  ctx.font = '700 20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('制作顺序', 64, footY);
  const colW = 510;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const x = 64 + i * colW;
    ctx.fillStyle = ACCENT;
    ctx.font = '800 18px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(s.n, x, footY + 34);
    ctx.fillStyle = INK;
    ctx.font = '700 19px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(s.t, x + 36, footY + 34);
    ctx.fillStyle = MUTED;
    ctx.font = '400 15px "PingFang SC","Microsoft YaHei",sans-serif';
    wrapText(ctx, s.d, x, footY + 58, colW - 26, 21, 3);
  }

  // 页脚
  ctx.fillStyle = MUTED;
  ctx.font = '500 13px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('豆屿 BEAD ISLE · 无限拼豆工作室 · 5mm 中豆 · 标准拼板 29×29', 64, H - 22);
  ctx.textAlign = 'right';
  ctx.fillText('一颗一颗，熨成一座岛。', W - 64, H - 22);
  ctx.textAlign = 'left';

  return { dataUrl: canvas.toDataURL('image/png'), metrics, title, label, page, total };
}

export function downloadPatternSheet(sheet: PatternSheetData) {
  const a = document.createElement('a');
  const safe = sheet.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || '豆屿图纸';
  a.download = `${safe}-图纸.png`;
  a.href = sheet.dataUrl;
  a.click();
}

export function printPatternSheet(sheet: PatternSheetData): boolean {
  return printPatternSheets([sheet]);
}

export function printPatternSheets(sheets: PatternSheetData[]): boolean {
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) return false;
  const safeTitle = (sheets[0]?.title || '豆屿图纸').replace(/[<>&"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : '&quot;',
  );
  const images = sheets
    .map(
      (s) =>
        `<div class="page"><img src="${s.dataUrl}"><span>${s.label} · 第 ${s.page} / ${s.total} 页</span></div>`,
    )
    .join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle} · 拼豆图纸</title>
<style>
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
html,body { margin:0; padding:0; background:#fff; }
.page { page-break-after: always; position: relative; width:100vw; }
.page:last-child { page-break-after: auto; }
.page img { display:block; width:100%; height:auto; }
.page span { display:none; }
@media print { .page { width:297mm; height:210mm; } .page img { width:297mm; height:210mm; object-fit:contain; } }
</style></head><body>${images}<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},220)})</script></body></html>`);
  win.document.close();
  return true;
}
