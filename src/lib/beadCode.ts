import { PALETTE, colorInfo } from '../../shared/palette.mjs';
import { BRANDS, nearestBrand, nearestHama } from '../../shared/brands.mjs';
import type { BeadBrand } from '../types';

const MIXED_BY_HEX = new Map<string, { code: string; name: string }>();
for (const c of PALETTE) MIXED_BY_HEX.set(c.hex.toLowerCase(), c);
for (const brand of Object.values(BRANDS) as any[]) {
  for (const c of brand.colors) {
    if (!MIXED_BY_HEX.has(c.hex.toLowerCase())) MIXED_BY_HEX.set(c.hex.toLowerCase(), c);
  }
}

export type BeadCode = {
  code: string;
  name: string;
  /** 这颗色不在豆屿 36 色里，用 Hama 近似色号显示 */
  approx: boolean;
};

/** 豆屿色卡有 P 编号；其他品牌/自定义色用对应品牌（或 Hama）近似编号。 */
export function beadCode(hex: string, brand: BeadBrand = 'douyu'): BeadCode {
  if (brand === 'mixed') {
    const hit = MIXED_BY_HEX.get(hex.toLowerCase());
    if (hit) return { code: hit.code, name: hit.name, approx: false };
    const near = nearestHama(hex);
    return { code: near.code, name: near.name, approx: true };
  }
  if (brand !== 'douyu') {
    const near = nearestBrand(hex, brand);
    return { code: near.code, name: near.name, approx: false };
  }
  const info = colorInfo(hex);
  if (info.code && info.code !== '—' && info.code !== '-') {
    return { code: info.code, name: info.name, approx: false };
  }
  const near = nearestHama(hex);
  return { code: near.code, name: near.name, approx: true };
}

export function codeLabel(hex: string): string {
  const c = beadCode(hex);
  return c.approx ? `≈${c.code}` : c.code;
}
