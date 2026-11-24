import { colorInfo } from '../../shared/palette.mjs';
import { nearestHama } from '../../shared/brands.mjs';

export type BeadCode = {
  code: string;
  name: string;
  /** 这颗色不在豆屿 36 色里，用 Hama 近似色号显示 */
  approx: boolean;
};

/** 豆屿色卡有 P 编号；其他品牌/自定义色用 Hama 近似编号，保证每颗豆都有号。 */
export function beadCode(hex: string): BeadCode {
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
