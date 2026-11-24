import { create } from 'zustand';
import type { User } from './types';
import { ApiError, bootSession } from './lib/api';

export type View = 'home' | 'studio' | 'gallery' | 'mini';
export type ToastKind = 'success' | 'info' | 'error';
export type Toast = { id: number; kind: ToastKind; title: string; msg?: string; at: number };

function defaultView(): View {
  try {
    return window.innerWidth <= 700 ? 'mini' : 'home';
  } catch {
    return 'home';
  }
}

function parseHash(): { view: View; workId: string | null } {
  try {
    const h = window.location.hash || '';
    if (h.startsWith('#/work/')) {
      return { view: 'gallery', workId: decodeURIComponent(h.slice(7)) || null };
    }
    if (h.startsWith('#/gallery')) return { view: 'gallery', workId: null };
    if (h.startsWith('#/studio')) return { view: 'studio', workId: null };
    if (h.startsWith('#/home')) return { view: 'home', workId: null };
    if (h.startsWith('#/mini')) return { view: 'mini', workId: null };
  } catch {
    /* ignore */
  }
  return { view: defaultView(), workId: null };
}

function pushHash(hash: string) {
  try {
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
  } catch {
    /* ignore */
  }
}

function replaceHash(hash: string) {
  try {
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
  } catch {
    /* ignore */
  }
}

const initial = parseHash();

type AppState = {
  user: User | null;
  booted: boolean;
  booting: boolean;
  bootError: string | null;
  view: View;
  activeWorkId: string | null;
  toasts: Toast[];
  pointsPulse: number;
  boot: () => Promise<void>;
  setUser: (user: User) => void;
  setPoints: (points: number) => void;
  setView: (view: View) => void;
  openWork: (id: string | null) => void;
  toast: (kind: ToastKind, title: string, msg?: string) => void;
  dismissToast: (id: number) => void;
};

let toastSeq = 0;

export const useApp = create<AppState>()((set, get) => ({
  user: null,
  booted: false,
  booting: false,
  bootError: null,
  view: initial.view,
  activeWorkId: initial.workId,
  toasts: [],
  pointsPulse: 0,
  boot: async () => {
    if (get().booting) return;
    set({ booting: true, bootError: null });
    try {
      const user = await bootSession();
      set({ user, booted: true, booting: false });
    } catch (e) {
      set({
        booting: false,
        booted: false,
        bootError: e instanceof ApiError ? e.message : '启动失败，请刷新再试',
      });
    }
  },
  setUser: (user) => set({ user }),
  setPoints: (points) =>
    set((s) => ({
      user: s.user ? { ...s.user, points } : s.user,
      pointsPulse: s.pointsPulse + 1,
    })),
  setView: (view) => {
    set({ view, activeWorkId: view === 'gallery' ? get().activeWorkId : null });
    pushHash(
      view === 'gallery'
        ? '#/gallery'
        : view === 'studio'
          ? '#/studio'
          : view === 'mini'
            ? '#/mini'
            : '#/home',
    );
  },
  openWork: (id) => {
    set({ activeWorkId: id });
    if (id) pushHash(`#/work/${encodeURIComponent(id)}`);
    else {
      const view = get().view;
      replaceHash(
        view === 'gallery' ? '#/gallery' : view === 'home' ? '#/home' : view === 'mini' ? '#/mini' : '#/studio',
      );
    }
  },
  toast: (kind, title, msg) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, title, msg, at: Date.now() }] }));
    window.setTimeout(() => {
      get().dismissToast(id);
    }, kind === 'error' ? 5200 : 3600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  return useApp((s) => s.toast);
}
