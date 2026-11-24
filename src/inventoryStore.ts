import { create } from 'zustand';

const KEY = 'douyu.inventory.v1';

export type InventoryCounts = Record<string, number>;

function load(): InventoryCounts {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: InventoryCounts = {};
    for (const [k, v] of Object.entries(parsed)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[k.toLowerCase()] = Math.floor(n);
    }
    return out;
  } catch {
    return {};
  }
}

type InventoryState = {
  counts: InventoryCounts;
  setCount: (hex: string, count: number) => void;
  add: (hex: string, n: number) => void;
  reset: () => void;
};

export const useInventory = create<InventoryState>()((set, get) => ({
  counts: load(),
  setCount: (hex, count) =>
    set((s) => {
      const key = hex.toLowerCase();
      const next = { ...s.counts };
      const n = Math.max(0, Math.min(999999, Math.round(Number(count) || 0)));
      if (n) next[key] = n;
      else delete next[key];
      return { counts: next };
    }),
  add: (hex, n) => {
    const key = hex.toLowerCase();
    const cur = get().counts[key] || 0;
    get().setCount(key, cur + n);
  },
  reset: () => set({ counts: {} }),
}));

useInventory.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s.counts));
  } catch {
    /* 本机存储满了也不影响使用 */
  }
});
