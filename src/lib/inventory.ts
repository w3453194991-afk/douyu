import { PALETTE } from '../../shared/palette.mjs';
import { colorInfo } from '../../shared/palette.mjs';
import type { ColorStat } from './metrics';
import type { InventoryCounts } from '../inventoryStore';

type RGB = { r: number; g: number; b: number };

function rgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function colorDistance(a: string, b: string): number {
  const x = rgb(a);
  const y = rgb(b);
  const rm = (x.r + y.r) / 2;
  const dr = x.r - y.r;
  const dg = x.g - y.g;
  const db = x.b - y.b;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

export type Substitute = {
  hex: string;
  code: string;
  name: string;
  have: number;
  distance: number;
};

export type InventoryRow = {
  hex: string;
  code: string;
  name: string;
  need: number;
  have: number;
  missing: number;
  substitute: Substitute | null;
};

export function inventoryRows(stats: ColorStat[], counts: InventoryCounts): InventoryRow[] {
  return stats.map((s) => {
    const need = s.count;
    const have = counts[s.hex.toLowerCase()] || 0;
    const missing = Math.max(0, need - have);
    let substitute: Substitute | null = null;
    if (missing > 0) {
      let best: Substitute | null = null;
      for (const p of PALETTE) {
        if (p.hex.toLowerCase() === s.hex.toLowerCase()) continue;
        const stock = counts[p.hex.toLowerCase()] || 0;
        if (stock <= 0) continue;
        const d = colorDistance(p.hex, s.hex);
        if (!best || d < best.distance) {
          best = { hex: p.hex, code: p.code, name: p.name, have: stock, distance: d };
        }
      }
      substitute = best && best.distance <= 72 ? best : null;
    }
    return {
      hex: s.hex,
      code: colorInfo(s.hex).code,
      name: colorInfo(s.hex).name,
      need,
      have,
      missing,
      substitute,
    };
  });
}

export function inventorySummary(rows: InventoryRow[]) {
  let missingColors = 0;
  let missingBeads = 0;
  let covered = 0;
  for (const r of rows) {
    if (r.missing > 0) {
      missingColors++;
      missingBeads += r.missing;
    } else {
      covered++;
    }
  }
  return { missingColors, missingBeads, covered };
}

export function stockOf(counts: InventoryCounts): number {
  return Object.values(counts).reduce((n, v) => n + v, 0);
}
