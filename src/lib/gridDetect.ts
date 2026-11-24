/**
 * 从裁到网格外框的图纸/PDF 页里猜行列数。
 * 思路：网格线会在列/行方向形成周期性边缘；用边缘投影的自相关找周期。
 * 只做「猜」，猜完仍让用户确认/微调。
 */
export function detectGrid(img: HTMLImageElement): { cols: number; rows: number; confidence: number } | null {
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  }

  const colScore = new Float32Array(w);
  for (let x = 0; x < w - 1; x++) {
    let s = 0;
    for (let y = 0; y < h; y += 2) {
      s += Math.abs(gray[y * w + x] - gray[y * w + x + 1]);
    }
    colScore[x] = s;
  }
  const rowScore = new Float32Array(h);
  for (let y = 0; y < h - 1; y++) {
    let s = 0;
    for (let x = 0; x < w; x += 2) {
      s += Math.abs(gray[y * w + x] - gray[(y + 1) * w + x]);
    }
    rowScore[y] = s;
  }

  const period = (scores: Float32Array, size: number): { p: number; conf: number } => {
    let total = 0;
    for (let i = 0; i < size; i++) total += scores[i];
    const mean = total / Math.max(1, size);
    let bestP = 0;
    let best = -Infinity;
    const maxP = Math.min(120, Math.floor(size / 5));
    const vals: Array<{ p: number; v: number }> = [];
    for (let p = 5; p <= maxP; p++) {
      let s = 0;
      let n = 0;
      for (let i = 0; i + p < size; i++) {
        s += scores[i] * scores[i + p];
        n++;
      }
      const v = s / Math.max(1, n);
      vals.push({ p, v });
      if (v > best) {
        best = v;
        bestP = p;
      }
    }
    if (!bestP || !Number.isFinite(best)) return { p: 0, conf: 0 };
    // 优先基频：如果某个较小周期也接近最高峰，选它。
    const floor = best * 0.82;
    for (const item of vals) {
      if (item.v >= floor) {
        bestP = item.p;
        break;
      }
    }
    const conf = mean > 0 ? best / (mean * mean + 1e-6) : 0;
    return { p: bestP, conf };
  };

  const cp = period(colScore, w);
  const rp = period(rowScore, h);
  if (!cp.p || !rp.p) return null;
  const cols = Math.max(4, Math.min(160, Math.round(w / cp.p)));
  const rows = Math.max(4, Math.min(160, Math.round(h / rp.p)));
  if (cols < 4 || rows < 4) return null;
  return { cols, rows, confidence: Math.min(cp.conf, rp.conf) };
}
