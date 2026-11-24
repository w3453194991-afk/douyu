import type { ColorStat } from './metrics';

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

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

/**
 * 色号图例：颜色多时自动 2–3 列、缩小行高、截断长名字，避免 100+ 色重叠。
 * 返回实际占用高度。
 */
export function drawColorLegend(
  ctx: CanvasRenderingContext2D,
  stats: ColorStat[],
  box: { x: number; y: number; w: number; h: number },
): number {
  if (!stats.length) return 0;
  const n = stats.length;
  const cols = n <= 30 ? 1 : n <= 64 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const rowH = Math.max(12, Math.min(30, box.h / Math.max(1, rows)));
  const colW = box.w / cols;
  const swatch = Math.max(10, Math.min(22, rowH - 3));
  const font = rowH >= 24 ? 13 : rowH >= 18 ? 11.5 : 10;
  const countFont = Math.max(9, font - 1);

  ctx.save();
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const c = stats[i];
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = box.x + col * colW;
    const midY = box.y + (row + 0.5) * rowH;
    const sy = midY - swatch / 2;
    ctx.fillStyle = c.hex;
    roundRect(ctx, x, sy, swatch, swatch, Math.max(2, swatch * 0.22));
    ctx.fill();
    ctx.strokeStyle = 'rgba(43,33,23,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `600 ${countFont}px "PingFang SC","Microsoft YaHei",sans-serif`;
    const countText = String(c.count);
    const countW = ctx.measureText(countText).width;
    const textX = x + swatch + 6;
    const textMax = Math.max(20, colW - swatch - countW - 18);
    ctx.textAlign = 'left';
    ctx.font = `600 ${font}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle = '#2B2117';
    ctx.fillText(fit(ctx, `${c.code} ${c.name}`, textMax), textX, midY);

    ctx.textAlign = 'right';
    ctx.font = `600 ${countFont}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle = '#706453';
    ctx.fillText(countText, x + colW - 8, midY);
    ctx.textAlign = 'left';
  }
  ctx.restore();
  return rows * rowH;
}
