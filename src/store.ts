import { create } from 'zustand';
import type { Bead, Guide, Mode, Piece, Project, Rect, Snapshot, Tool, Transform } from './types';
import {
  allPieceCells,
  beadKey,
  beadMap,
  cloneBeads,
  clonePieces,
  contentBounds,
  ironLoose,
  layoutPieces,
  makePiece,
  nextPieceName,
  pieceBounds,
  splitConnected,
} from './lib/scene';
import { uid } from './lib/scene';

export const PROJECT_KEY = 'douyu.project.v1';

export function blankProject(title = '无题小岛'): Project {
  const now = Date.now();
  return {
    id: uid('pr'),
    title,
    loose: [],
    pieces: [],
    guide: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (!raw) return blankProject();
    const p = JSON.parse(raw) as Project;
    if (!p || !Array.isArray(p.loose) || !Array.isArray(p.pieces)) return blankProject();
    return {
      id: p.id || uid('pr'),
      title: typeof p.title === 'string' ? p.title : '无题小岛',
      loose: p.loose.filter(
        (b) => Number.isInteger(b?.x) && Number.isInteger(b?.y) && typeof b?.c === 'string',
      ),
      pieces: p.pieces
        .filter((pc) => pc && Array.isArray(pc.beads) && Array.isArray(pc.pos))
        .map((pc) => ({
          ...pc,
          t: pc.t && Array.isArray(pc.t.p) && Array.isArray(pc.t.r) ? pc.t : { p: [0, 0, 0], r: [0, 0, 0] },
        })),
      guide: p.guide && Array.isArray(p.guide.pieces) ? p.guide : null,
      createdAt: p.createdAt || Date.now(),
      updatedAt: p.updatedAt || Date.now(),
    };
  } catch {
    return blankProject();
  }
}

export function saveProject(project: Project): boolean {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
}

type Focus = { kind: 'content' | 'piece' | 'guide' | 'origin'; id?: string; nonce: number };

type StudioState = {
  project: Project;
  mode: Mode;
  tool: Tool;
  color: string;
  recentColors: string[];
  brush: number;
  selection: Rect | null;
  selectedPieceId: string | null;
  past: Snapshot[];
  future: Snapshot[];
  focus: Focus | null;
  layoutDirty: boolean;
  ironFx: { nonce: number; count: number } | null;
  showGuide: boolean;
  showBoards: boolean;
  showCodes: boolean;
  focusRow: number | null;
  savedAt: number | null;
  actionDirty: boolean;

  setTitle: (title: string) => void;
  setMode: (mode: Mode) => void;
  enterAssembly: () => { ironed: number };
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setBrush: (brush: number) => void;
  setSelection: (rect: Rect | null) => void;
  selectPiece: (id: string | null) => void;
  beginAction: () => void;
  endAction: () => void;

  paint: (cells: Array<[number, number]>) => void;
  erase: (cells: Array<[number, number]>) => number;
  pick: (x: number, y: number) => string | null;

  ironAll: () => number;
  ironSelection: () => number;
  deleteSelection: () => number;
  clearSelection: () => void;

  movePiece: (id: string, pos: [number, number]) => void;
  renamePiece: (id: string, name: string) => void;
  deletePiece: (id: string) => void;
  splitPiece: (id: string) => void;
  updateTransform: (id: string, t: Transform) => void;

  runLayout: () => void;
  standPiece: (id: string) => void;
  layPiece: (id: string) => void;

  undo: () => void;
  redo: () => void;

  newProject: (title?: string) => void;
  importProject: (beads: Bead[], title?: string) => void;
  replaceColor: (from: string, to: string) => number;
  loadGuide: (guide: Guide, title: string) => void;
  discardGuide: () => void;
  setShowGuide: (show: boolean) => void;
  setShowBoards: (show: boolean) => void;
  setShowCodes: (show: boolean) => void;
  setFocusRow: (row: number | null) => void;

  focusContent: () => void;
  focusPiece: (id: string) => void;
  focusGuide: () => void;
  markSaved: (at: number) => void;
};

function snapshot(project: Project): Snapshot {
  return { loose: cloneBeads(project.loose), pieces: clonePieces(project.pieces) };
}

const MAX_HISTORY = 60;

function pushHistory(state: StudioState): Pick<StudioState, 'past' | 'future'> {
  return {
    past: [...state.past, snapshot(state.project)].slice(-MAX_HISTORY),
    future: [],
  };
}

function pieceName(existing: Piece[]): string {
  return nextPieceName(existing);
}

export const useStudio = create<StudioState>()((set, get) => ({
  project: loadProject(),
  mode: 'board',
  tool: 'bead',
  color: '#E0582F',
  recentColors: ['#E0582F', '#F6DB57', '#8ECFBB', '#2C5FBF', '#F5B0C0', '#20222A'],
  brush: 1,
  selection: null,
  selectedPieceId: null,
  past: [],
  future: [],
  focus: null,
  layoutDirty: false,
  ironFx: null,
  showGuide: true,
  showBoards: false,
  showCodes: true,
  focusRow: null,
  savedAt: null,
  actionDirty: false,

  setTitle: (title) =>
    set((s) => ({ project: { ...s.project, title: title.slice(0, 30), updatedAt: Date.now() } })),
  setMode: (mode) =>
    set((s) => {
      if (s.mode === mode) return {};
      const allDefault = s.project.pieces.every((p) => p.t.p[0] === 0 && p.t.p[1] === 0 && p.t.p[2] === 0);
      if (mode === 'assembly' && s.project.pieces.length > 0 && (s.layoutDirty || allDefault)) {
        return {
          mode,
          selection: null,
          project: {
            ...s.project,
            pieces: layoutPieces(s.project.pieces, true),
            updatedAt: Date.now(),
          },
          layoutDirty: false,
        };
      }
      return { mode, selection: null };
    }),
  setTool: (tool) => set({ tool }),

  enterAssembly: () => {
    const s = get();
    if (s.mode === 'assembly') return { ironed: 0 };
    let ironed = 0;
    if (s.project.loose.length) {
      const result = ironLoose(s.project.loose, s.project.pieces);
      ironed = result.pieces.length;
      if (ironed) {
        set({
          ...pushHistory(s),
          project: {
            ...s.project,
            loose: [],
            pieces: [...s.project.pieces, ...result.pieces],
            updatedAt: Date.now(),
          },
          layoutDirty: true,
          selectedPieceId: result.pieces[0]?.id ?? s.selectedPieceId,
        });
      }
    }
    get().setMode('assembly');
    return { ironed };
  },
  setColor: (color) =>
    set((s) => ({
      color,
      recentColors: [color, ...s.recentColors.filter((c) => c !== color)].slice(0, 8),
    })),
  setBrush: (brush) => set({ brush: Math.max(1, Math.min(4, brush)) }),
  setSelection: (rect) => set({ selection: rect }),
  selectPiece: (id) => set({ selectedPieceId: id }),
  beginAction: () => set((s) => ({ ...pushHistory(s), actionDirty: false })),
  endAction: () =>
    set((s) => {
      if (s.actionDirty) return { actionDirty: false };
      if (!s.past.length) return { actionDirty: false };
      return { past: s.past.slice(0, -1), actionDirty: false };
    }),

  paint: (cells) =>
    set((s) => {
      if (!cells.length) return {};
      const occupied = allPieceCells(s.project.pieces);
      const loose = beadMap(s.project.loose);
      let changed = false;
      for (const [x, y] of cells) {
        const k = beadKey(x, y);
        if (occupied.has(k)) continue;
        const prev = loose.get(k);
        if (prev && prev.c.toLowerCase() === s.color.toLowerCase()) continue;
        loose.set(k, { x, y, c: s.color });
        changed = true;
      }
      if (!changed) return {};
      return {
        project: {
          ...s.project,
          loose: [...loose.values()],
          updatedAt: Date.now(),
        },
        actionDirty: true,
      };
    }),

  erase: (cells) => {
    let removed = 0;
    set((s) => {
      if (!s.project.loose.length) return {};
      const drop = new Set(cells.map(([x, y]) => beadKey(x, y)));
      const next = s.project.loose.filter((b) => {
        const hit = drop.has(beadKey(b.x, b.y));
        if (hit) removed++;
        return !hit;
      });
      if (!removed) return {};
      return { project: { ...s.project, loose: next, updatedAt: Date.now() }, actionDirty: true };
    });
    return removed;
  },

  pick: (x, y) => {
    const s = get();
    const k = beadKey(x, y);
    const loose = beadMap(s.project.loose).get(k);
    if (loose) {
      get().setColor(loose.c);
      return loose.c;
    }
    for (const p of s.project.pieces) {
      const lx = x - p.pos[0];
      const ly = y - p.pos[1];
      const bead = p.beads.find((b) => b.x === lx && b.y === ly);
      if (bead) {
        get().setColor(bead.c);
        return bead.c;
      }
    }
    return null;
  },

  ironAll: () => {
    const s = get();
    if (!s.project.loose.length) return 0;
    const result = ironLoose(s.project.loose, s.project.pieces);
    if (!result.pieces.length) return 0;
    const history = pushHistory(s);
    set({
      ...history,
      project: {
        ...s.project,
        loose: [],
        pieces: [...s.project.pieces, ...result.pieces],
        updatedAt: Date.now(),
      },
      selectedPieceId: result.pieces[0].id,
      selection: null,
      layoutDirty: true,
      ironFx: { nonce: Date.now(), count: result.pieces.length },
    });
    return result.pieces.length;
  },

  ironSelection: () => {
    const s = get();
    if (!s.selection) return 0;
    const rect = s.selection;
    const inRect = s.project.loose.filter(
      (b) =>
        b.x >= rect.x && b.x < rect.x + rect.w && b.y >= rect.y && b.y < rect.y + rect.h,
    );
    if (!inRect.length) return 0;
    const groups = splitConnected(inRect);
    const created: Piece[] = [];
    const used = [...s.project.pieces];
    for (const group of groups) {
      const piece = makePiece(group, pieceName(used));
      used.push(piece);
      created.push(piece);
    }
    const drop = new Set(inRect.map((b) => beadKey(b.x, b.y)));
    const history = pushHistory(s);
    set({
      ...history,
      project: {
        ...s.project,
        loose: s.project.loose.filter((b) => !drop.has(beadKey(b.x, b.y))),
        pieces: [...s.project.pieces, ...created],
        updatedAt: Date.now(),
      },
      selection: null,
      selectedPieceId: created[0]?.id ?? s.selectedPieceId,
      layoutDirty: true,
      ironFx: { nonce: Date.now(), count: created.length },
    });
    return created.length;
  },

  deleteSelection: () => {
    const s = get();
    if (!s.selection) return 0;
    const rect = s.selection;
    const drop = new Set(
      s.project.loose
        .filter(
          (b) =>
            b.x >= rect.x && b.x < rect.x + rect.w && b.y >= rect.y && b.y < rect.y + rect.h,
        )
        .map((b) => beadKey(b.x, b.y)),
    );
    if (!drop.size) return 0;
    const history = pushHistory(s);
    set({
      ...history,
      project: {
        ...s.project,
        loose: s.project.loose.filter((b) => !drop.has(beadKey(b.x, b.y))),
        updatedAt: Date.now(),
      },
      selection: null,
    });
    return drop.size;
  },

  clearSelection: () => set({ selection: null }),

  movePiece: (id, pos) =>
    set((s) => ({
      project: {
        ...s.project,
        pieces: s.project.pieces.map((p) => (p.id === id ? { ...p, pos } : p)),
        updatedAt: Date.now(),
      },
      actionDirty: true,
    })),

  renamePiece: (id, name) =>
    set((s) => ({
      project: {
        ...s.project,
        pieces: s.project.pieces.map((p) =>
          p.id === id ? { ...p, name: name.trim().slice(0, 20) || p.name } : p,
        ),
        updatedAt: Date.now(),
      },
    })),

  deletePiece: (id) =>
    set((s) => {
      if (!s.project.pieces.some((p) => p.id === id)) return {};
      return {
        ...pushHistory(s),
        project: {
          ...s.project,
          pieces: s.project.pieces.filter((p) => p.id !== id),
          updatedAt: Date.now(),
        },
        selectedPieceId: s.selectedPieceId === id ? null : s.selectedPieceId,
      };
    }),

  splitPiece: (id) =>
    set((s) => {
      const piece = s.project.pieces.find((p) => p.id === id);
      if (!piece) return {};
      const back: Bead[] = piece.beads.map((b) => ({
        x: b.x + piece.pos[0],
        y: b.y + piece.pos[1],
        c: b.c,
      }));
      const loose = beadMap([...s.project.loose, ...back]);
      return {
        ...pushHistory(s),
        project: {
          ...s.project,
          loose: [...loose.values()],
          pieces: s.project.pieces.filter((p) => p.id !== id),
          updatedAt: Date.now(),
        },
        selectedPieceId: s.selectedPieceId === id ? null : s.selectedPieceId,
      };
    }),

  updateTransform: (id, t) =>
    set((s) => ({
      project: {
        ...s.project,
        pieces: s.project.pieces.map((p) => (p.id === id ? { ...p, t } : p)),
        updatedAt: Date.now(),
      },
      actionDirty: true,
    })),

  runLayout: () =>
    set((s) => {
      if (!s.project.pieces.length) return { layoutDirty: false };
      return {
        ...pushHistory(s),
        project: { ...s.project, pieces: layoutPieces(s.project.pieces), updatedAt: Date.now() },
        layoutDirty: false,
      };
    }),

  standPiece: (id) =>
    set((s) => {
      const piece = s.project.pieces.find((p) => p.id === id);
      if (!piece) return {};
      const h = pieceBounds(piece.beads).h;
      return {
        ...pushHistory(s),
        project: {
          ...s.project,
          pieces: s.project.pieces.map((p) =>
            p.id === id
              ? { ...p, t: { p: [p.t.p[0], h / 2 + 0.02, p.t.p[2]], r: [Math.PI / 2, 0, 0] } }
              : p,
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  layPiece: (id) =>
    set((s) => {
      const piece = s.project.pieces.find((p) => p.id === id);
      if (!piece) return {};
      return {
        ...pushHistory(s),
        project: {
          ...s.project,
          pieces: s.project.pieces.map((p) =>
            p.id === id ? { ...p, t: { p: [p.t.p[0], 0.02, p.t.p[2]], r: [0, 0, 0] } } : p,
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return {};
      const current = snapshot(s.project);
      const selected =
        s.selectedPieceId && prev.pieces.some((p) => p.id === s.selectedPieceId)
          ? s.selectedPieceId
          : null;
      return {
        past: s.past.slice(0, -1),
        future: [current, ...s.future].slice(0, MAX_HISTORY),
        project: {
          ...s.project,
          loose: cloneBeads(prev.loose),
          pieces: clonePieces(prev.pieces),
          updatedAt: Date.now(),
        },
        selectedPieceId: selected,
        selection: null,
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return {};
      const current = snapshot(s.project);
      return {
        past: [...s.past, current].slice(-MAX_HISTORY),
        future: s.future.slice(1),
        project: {
          ...s.project,
          loose: cloneBeads(next.loose),
          pieces: clonePieces(next.pieces),
          updatedAt: Date.now(),
        },
        selection: null,
      };
    }),

  newProject: (title) =>
    set({
      project: blankProject(title || '无题小岛'),
      selection: null,
      selectedPieceId: null,
      past: [],
      future: [],
      layoutDirty: false,
      mode: 'board',
      focus: { kind: 'origin', nonce: Date.now() },
      focusRow: null,
      actionDirty: false,
    }),

  importProject: (beads, title) =>
    set(() => {
      const map = new Map<string, Bead>();
      for (const b of beads) {
        if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || typeof b.c !== 'string') continue;
        map.set(beadKey(Math.round(b.x), Math.round(b.y)), {
          x: Math.round(b.x),
          y: Math.round(b.y),
          c: b.c,
        });
      }
      const list = [...map.values()];
      return {
        project: {
          ...blankProject(title?.trim().slice(0, 30) || '照片图纸'),
          loose: list,
          updatedAt: Date.now(),
        },
        selection: null,
        selectedPieceId: null,
        past: [],
        future: [],
        layoutDirty: false,
        mode: 'board',
        tool: 'bead',
        showGuide: false,
        focusRow: null,
        focus: { kind: 'content', nonce: Date.now() },
        actionDirty: false,
      };
    }),

  replaceColor: (from, to) => {
    const s = get();
    const src = from.toLowerCase();
    if (src === to.toLowerCase()) return 0;
    let changed = 0;
    const loose = s.project.loose.map((b) => {
      if (b.c.toLowerCase() !== src) return b;
      changed++;
      return { ...b, c: to };
    });
    const pieces = s.project.pieces.map((p) => ({
      ...p,
      beads: p.beads.map((b) => {
        if (b.c.toLowerCase() !== src) return b;
        changed++;
        return { ...b, c: to };
      }),
    }));
    if (!changed) return 0;
    set({
      ...pushHistory(s),
      project: { ...s.project, loose, pieces, updatedAt: Date.now() },
    });
    return changed;
  },

  loadGuide: (guide, title) =>
    set({
      project: {
        ...blankProject(title),
        guide,
      },
      selection: null,
      selectedPieceId: null,
      past: [],
      future: [],
      layoutDirty: false,
      mode: 'board',
      tool: 'bead',
      showGuide: true,
      focusRow: null,
      focus: { kind: 'guide', nonce: Date.now() },
      actionDirty: false,
    }),

  discardGuide: () =>
    set((s) => ({
      project: { ...s.project, guide: null, updatedAt: Date.now() },
      showGuide: false,
    })),

  setShowGuide: (show) => set({ showGuide: show }),
  setShowBoards: (show) => set({ showBoards: show }),
  setShowCodes: (show) => set({ showCodes: show }),
  setFocusRow: (row) => set({ focusRow: row }),

  focusContent: () => set({ focus: { kind: 'content', nonce: Date.now() } }),
  focusPiece: (id) => set({ focus: { kind: 'piece', id, nonce: Date.now() }, selectedPieceId: id }),
  focusGuide: () => set({ focus: { kind: 'guide', nonce: Date.now() } }),
  markSaved: (at) => set({ savedAt: at }),
}));

export function getContentBounds() {
  return contentBounds(useStudio.getState().project);
}
