/**
 * 豆屿 · 拼豆色卡
 * 统一由前端与种子数据使用。hex 即数据层存储的颜色值。
 */
export const PALETTE = [
  { code: 'P01', name: '雪白', hex: '#F6F3EA', family: 'neutral' },
  { code: 'P02', name: '奶油', hex: '#F2E6CC', family: 'neutral' },
  { code: 'P03', name: '象牙', hex: '#E4D4AE', family: 'neutral' },
  { code: 'P28', name: '岩灰', hex: '#8B9097', family: 'neutral' },
  { code: 'P29', name: '炭灰', hex: '#444A54', family: 'neutral' },
  { code: 'P30', name: '墨黑', hex: '#20222A', family: 'neutral' },
  { code: 'P31', name: '银亮', hex: '#C6CBD1', family: 'neutral' },
  { code: 'P32', name: '鎏金', hex: '#C9A227', family: 'neutral' },

  { code: 'P04', name: '柠檬', hex: '#F6DB57', family: 'warm' },
  { code: 'P05', name: '杏黄', hex: '#F5C24F', family: 'warm' },
  { code: 'P06', name: '姜黄', hex: '#E5A03C', family: 'warm' },
  { code: 'P07', name: '橙色', hex: '#EE8835', family: 'warm' },
  { code: 'P08', name: '朱红', hex: '#E0582F', family: 'warm' },
  { code: 'P09', name: '正红', hex: '#D6393B', family: 'warm' },
  { code: 'P10', name: '樱桃', hex: '#BF2A45', family: 'warm' },
  { code: 'P11', name: '玫粉', hex: '#E5487E', family: 'warm' },
  { code: 'P12', name: '樱花', hex: '#F5B0C0', family: 'warm' },
  { code: 'P13', name: '蜜桃', hex: '#F7CCB3', family: 'warm' },
  { code: 'P25', name: '咖啡', hex: '#6B4328', family: 'warm' },
  { code: 'P26', name: '驼色', hex: '#B8895C', family: 'warm' },
  { code: 'P27', name: '沙色', hex: '#D8BC98', family: 'warm' },

  { code: 'P14', name: '葡萄紫', hex: '#78499B', family: 'cool' },
  { code: 'P15', name: '薰衣草', hex: '#B49AD9', family: 'cool' },
  { code: 'P16', name: '深海蓝', hex: '#1F376D', family: 'cool' },
  { code: 'P17', name: '钴蓝', hex: '#2C5FBF', family: 'cool' },
  { code: 'P18', name: '天蓝', hex: '#4DA7D9', family: 'cool' },
  { code: 'P19', name: '雾蓝', hex: '#A7CEE7', family: 'cool' },
  { code: 'P20', name: '孔雀', hex: '#1E8E8B', family: 'cool' },
  { code: 'P21', name: '薄荷', hex: '#8ECFBB', family: 'cool' },

  { code: 'P22', name: '森林', hex: '#2C6A4E', family: 'nature' },
  { code: 'P23', name: '草绿', hex: '#5EA24B', family: 'nature' },
  { code: 'P24', name: '青柠', hex: '#AECC47', family: 'nature' },

  { code: 'P33', name: '荧光粉', hex: '#FF5EA8', family: 'special' },
  { code: 'P34', name: '荧光绿', hex: '#9BF24D', family: 'special' },
  { code: 'P35', name: '夜光', hex: '#E4F6C6', family: 'special' },
  { code: 'P36', name: '透蓝', hex: '#BFE7F6', family: 'special' },
];

export const PALETTE_FAMILIES = [
  { id: 'all', label: '全部' },
  { id: 'neutral', label: '中性' },
  { id: 'warm', label: '暖调' },
  { id: 'cool', label: '冷调' },
  { id: 'nature', label: '自然' },
  { id: 'special', label: '特别' },
];

export const COLOR_INFO = Object.fromEntries(
  PALETTE.map((c) => [c.hex.toLowerCase(), c]),
);

export const DEFAULT_COLOR = '#E0582F';

export const GUIDE_COLOR = '#8FE3D0';

export function colorInfo(hex) {
  return (
    COLOR_INFO[String(hex).toLowerCase()] || {
      code: '—',
      name: '自由色',
      hex,
      family: 'special',
    }
  );
}
