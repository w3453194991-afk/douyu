import type { Bead, Project } from '../types';
import { colorInfo } from '../../shared/palette.mjs';
import { nearestBrand } from '../../shared/brands.mjs';
import { beadCode } from './beadCode';

export type ColorStat = {
  hex: string;
  count: number;
  code: string;
  name: string;
};

/**
 * 项目里真正摆上板的豆子：散豆 + 已熨零件（按零件落点还原到板面坐标）。
 * 同一格只算一次，后放的零件覆盖散豆。
 */
export function projectBeads(project: Project): Bead[] {
  const map = new Map<string, Bead>();
  for (const b of project.loose) {
    map.set(`${b.x},${b.y}`, { x: b.x, y: b.y, c: b.c });
  }
  for (const p of project.pieces) {
    for (const b of p.beads) {
      map.set(`${p.pos[0] + b.x},${p.pos[1] + b.y}`, {
        x: p.pos[0] + b.x,
        y: p.pos[1] + b.y,
        c: b.c,
      });
    }
  }
  return [...map.values()];
}

export function colorStats(beads: Bead[], brand: Project['brand'] = 'douyu'): ColorStat[] {
  const counts = new Map<string, number>();
  for (const b of beads) {
    const key = b.c.toUpperCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([hex, count]) => {
      if (brand === 'mixed') {
        const hit = beadCode(hex, 'mixed');
        return { hex, count, code: hit.code, name: hit.name };
      }
      if (brand && brand !== 'douyu') {
        const near = nearestBrand(hex, brand);
        return { hex, count, code: near.code, name: near.name };
      }
      const info = colorInfo(hex);
      return { hex, count, code: info.code, name: info.name };
    })
    .sort((a, b) => b.count - a.count);
}

export type ProjectMetrics = {
  beads: number;
  colors: number;
  colorStats: ColorStat[];
  width: number;
  height: number;
  cmW: number;
  cmH: number;
  boardsX: number;
  boardsY: number;
  boards: number;
  minutes: number;
  difficulty: '入门' | '进阶' | '挑战';
};

const BOARD_SIZE = 29;

/** 5mm 中豆；一块标准方形拼板 29×29。 */
export function projectMetrics(project: Project): ProjectMetrics {
  const beads = projectBeads(project);
  const stats = colorStats(beads, project.brand || 'douyu');
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
  const width = Number.isFinite(minX) ? maxX - minX + 1 : 0;
  const height = Number.isFinite(minY) ? maxY - minY + 1 : 0;
  const boardsX = width ? Math.max(1, Math.ceil(width / BOARD_SIZE)) : 0;
  const boardsY = height ? Math.max(1, Math.ceil(height / BOARD_SIZE)) : 0;
  const total = beads.length;
  const minutes = total ? Math.max(5, Math.ceil(total / 42 + project.pieces.length * 4)) : 0;
  const difficulty = total < 280 ? '入门' : total < 1100 ? '进阶' : '挑战';
  return {
    beads: total,
    colors: stats.length,
    colorStats: stats,
    width,
    height,
    cmW: Math.round(width * 0.5 * 10) / 10,
    cmH: Math.round(height * 0.5 * 10) / 10,
    boardsX,
    boardsY,
    boards: boardsX * boardsY,
    minutes,
    difficulty,
  };
}

export function cmText(cm: number): string {
  return Number.isInteger(cm) ? `${cm}` : cm.toFixed(1);
}

export function formatMinutes(minutes: number): string {
  if (!minutes) return '—';
  if (minutes < 60) return `约 ${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `约 ${h} 小时 ${m} 分` : `约 ${h} 小时`;
}

export { BOARD_SIZE };
