import type { Bead, Guide, Piece, Project, Rect, Scene, ScenePiece, Transform } from '../types';

let seq = 0;

export function uid(prefix = 'p'): string {
  seq = (seq + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}

export function beadKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function beadMap(list: Bead[]): Map<string, Bead> {
  const m = new Map<string, Bead>();
  for (const b of list) m.set(beadKey(b.x, b.y), b);
  return m;
}

export function pieceBounds(beads: Bead[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of beads) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x > maxX) maxX = b.x;
    if (b.y > maxY) maxY = b.y;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** 把豆子归一化到 (0,0) 起，返回豆子与原始左上角 */
export function normalizeBeads(beads: Bead[]): { beads: Bead[]; minX: number; minY: number } {
  const { minX, minY } = pieceBounds(beads);
  return { beads: beads.map((b) => ({ x: b.x - minX, y: b.y - minY, c: b.c })), minX, minY };
}

/** 四邻接连通块 */
export function splitConnected(beads: Bead[]): Bead[][] {
  const map = beadMap(beads);
  const seen = new Set<string>();
  const groups: Bead[][] = [];
  for (const b of beads) {
    const k = beadKey(b.x, b.y);
    if (seen.has(k)) continue;
    const stack = [b];
    seen.add(k);
    const group: Bead[] = [];
    while (stack.length) {
      const cur = stack.pop()!;
      group.push(cur);
      const neighbors = [
        [cur.x + 1, cur.y],
        [cur.x - 1, cur.y],
        [cur.x, cur.y + 1],
        [cur.x, cur.y - 1],
      ];
      for (const [nx, ny] of neighbors) {
        const nk = beadKey(nx, ny);
        if (seen.has(nk)) continue;
        const nb = map.get(nk);
        if (nb) {
          seen.add(nk);
          stack.push(nb);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

export function defaultTransform(): Transform {
  return { p: [0, 0, 0], r: [Math.PI / 2, 0, 0] };
}

export function nextPieceName(pieces: Piece[]): string {
  const used = new Set(pieces.map((p) => p.name));
  for (let i = 1; i < 999; i++) {
    const name = `零件 ${String(i).padStart(2, '0')}`;
    if (!used.has(name)) return name;
  }
  return `零件 ${pieces.length + 1}`;
}

export function makePiece(beads: Bead[], name: string, pos?: [number, number]): Piece {
  const norm = normalizeBeads(beads);
  return {
    id: uid('pc'),
    name,
    beads: norm.beads,
    pos: pos ?? [norm.minX, norm.minY],
    t: defaultTransform(),
  };
}

/** 从松豆中按连通块熨出零件 */
export function ironLoose(loose: Bead[], existing: Piece[]): { pieces: Piece[]; remaining: Bead[] } {
  const groups = splitConnected(loose);
  const pieces = groups.map((g) => {
    const piece = makePiece(g, nextPieceName([...existing, ...[]]));
    // 每块都基于已有零件重新取一个不重名的编号
    return piece;
  });
  // 统一重命名，保证递进且不重复
  const used = new Set(existing.map((p) => p.name));
  const named = pieces.map((piece) => {
    let i = 1;
    let name = '';
    do {
      name = `零件 ${String(i).padStart(2, '0')}`;
      i++;
    } while (used.has(name));
    used.add(name);
    return { ...piece, name };
  });
  return { pieces: named, remaining: [] };
}

export function beadsInRect(beads: Bead[], rect: Rect): Bead[] {
  const x2 = rect.x + rect.w;
  const y2 = rect.y + rect.h;
  return beads.filter((b) => b.x >= rect.x && b.x < x2 && b.y >= rect.y && b.y < y2);
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function pieceCellSet(piece: Piece): Set<string> {
  const set = new Set<string>();
  for (const b of piece.beads) set.add(beadKey(piece.pos[0] + b.x, piece.pos[1] + b.y));
  return set;
}

export function allPieceCells(pieces: Piece[]): Set<string> {
  const set = new Set<string>();
  for (const p of pieces) {
    for (const b of p.beads) set.add(beadKey(p.pos[0] + b.x, p.pos[1] + b.y));
  }
  return set;
}

export function pieceAt(pieces: Piece[], x: number, y: number): Piece | null {
  for (const p of pieces) {
    const lx = x - p.pos[0];
    const ly = y - p.pos[1];
    if (lx < 0 || ly < 0) continue;
    for (const b of p.beads) if (b.x === lx && b.y === ly) return p;
  }
  return null;
}

export function sceneFromPieces(pieces: Piece[]): Scene {
  return {
    v: 1,
    pieces: pieces.map<ScenePiece>((p) => ({
      id: p.id,
      name: p.name,
      beads: p.beads.map((b) => [b.x, b.y, b.c] as [number, number, string]),
      pos: [p.pos[0], p.pos[1]],
      t: { p: [...p.t.p] as Transform['p'], r: [...p.t.r] as Transform['r'] },
    })),
  };
}

export function piecesFromScene(scene: Scene): Piece[] {
  return scene.pieces.map((sp) => ({
    id: sp.id || uid('pc'),
    name: sp.name || '零件',
    beads: sp.beads.map(([x, y, c]) => ({ x, y, c })),
    pos: [sp.pos?.[0] ?? 0, sp.pos?.[1] ?? 0],
    t: {
      p: [
        Number(sp.t?.p?.[0] ?? 0),
        Number(sp.t?.p?.[1] ?? 0),
        Number(sp.t?.p?.[2] ?? 0),
      ],
      r: [
        Number(sp.t?.r?.[0] ?? 0),
        Number(sp.t?.r?.[1] ?? 0),
        Number(sp.t?.r?.[2] ?? 0),
      ],
    },
  }));
}

export function guideFromScene(scene: Scene, meta: { workId: string; title: string; author: string; price: number }): Guide {
  return { ...meta, pieces: piecesFromScene(scene) };
}

export type GuideProgress = {
  total: number;
  matched: number;
  colorMatched: number;
  ratio: number;
  colorRatio: number;
  perPiece: Map<string, { total: number; matched: number; colorMatched: number; done: boolean }>;
};

export function guideProgress(guide: Guide | null, loose: Bead[], pieces: Piece[] = []): GuideProgress {
  const perPiece = new Map<string, { total: number; matched: number; colorMatched: number; done: boolean }>();
  if (!guide) return { total: 0, matched: 0, colorMatched: 0, ratio: 0, colorRatio: 0, perPiece };
  const colors = new Map<string, string>();
  for (const b of loose) colors.set(beadKey(b.x, b.y), b.c);
  for (const p of pieces) {
    for (const b of p.beads) {
      colors.set(beadKey(p.pos[0] + b.x, p.pos[1] + b.y), b.c);
    }
  }
  let total = 0;
  let matched = 0;
  let colorMatched = 0;
  for (const piece of guide.pieces) {
    let pTotal = 0;
    let pMatched = 0;
    let pColor = 0;
    for (const b of piece.beads) {
      pTotal++;
      total++;
      const placed = colors.get(beadKey(piece.pos[0] + b.x, piece.pos[1] + b.y));
      if (placed) pMatched++;
      if (placed && placed.toLowerCase() === b.c.toLowerCase()) pColor++;
    }
    matched += pMatched;
    colorMatched += pColor;
    perPiece.set(piece.id, {
      total: pTotal,
      matched: pMatched,
      colorMatched: pColor,
      done: pTotal > 0 && pMatched === pTotal,
    });
  }
  return {
    total,
    matched,
    colorMatched,
    ratio: total ? matched / total : 0,
    colorRatio: total ? colorMatched / total : 0,
    perPiece,
  };
}

export function guideBounds(guide: Guide | null): Rect | null {
  if (!guide || !guide.pieces.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of guide.pieces) {
    minX = Math.min(minX, p.pos[0]);
    minY = Math.min(minY, p.pos[1]);
    maxX = Math.max(maxX, p.pos[0] + pieceBounds(p.beads).w);
    maxY = Math.max(maxY, p.pos[1] + pieceBounds(p.beads).h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function contentBounds(project: Project): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of project.loose) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + 1);
    maxY = Math.max(maxY, b.y + 1);
  }
  for (const p of project.pieces) {
    const bb = pieceBounds(p.beads);
    minX = Math.min(minX, p.pos[0]);
    minY = Math.min(minY, p.pos[1]);
    maxX = Math.max(maxX, p.pos[0] + bb.w);
    maxY = Math.max(maxY, p.pos[1] + bb.h);
  }
  if (project.guide) {
    const gb = guideBounds(project.guide);
    if (gb) {
      minX = Math.min(minX, gb.x);
      minY = Math.min(minY, gb.y);
      maxX = Math.max(maxX, gb.x + gb.w);
      maxY = Math.max(maxY, gb.y + gb.h);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function cloneBeads(list: Bead[]): Bead[] {
  return list.map((b) => ({ x: b.x, y: b.y, c: b.c }));
}

export function clonePieces(list: Piece[]): Piece[] {
  return list.map((p) => ({
    ...p,
    beads: cloneBeads(p.beads),
    pos: [p.pos[0], p.pos[1]],
    t: { p: [...p.t.p] as Transform['p'], r: [...p.t.r] as Transform['r'] },
  }));
}

/** 立体拼装：把零件按正面朝向相机排成网格。preservePlaced=true 时只摆还没摆过的零件 */
export function layoutPieces(pieces: Piece[], preservePlaced = false): Piece[] {
  if (!pieces.length) return pieces;
  const sizes = pieces.map((p) => {
    const bb = pieceBounds(p.beads);
    return { w: bb.w, h: bb.h };
  });

  if (preservePlaced) {
    const isCustom = (p: Piece) => p.t.p[0] !== 0 || p.t.p[1] !== 0 || p.t.p[2] !== 0;
    const placed = pieces.filter(isCustom);
    if (placed.length) {
      let cursorX = 0;
      let cursorZ = 0;
      for (const p of placed) {
        const bb = pieceBounds(p.beads);
        cursorX = Math.max(cursorX, p.t.p[0] + bb.w / 2 + 4);
        cursorZ = Math.max(cursorZ, p.t.p[2]);
      }
      let rowH = 0;
      return pieces.map((p, i) => {
        if (isCustom(p)) return p;
        const { w, h } = sizes[i];
        const p3: Transform['p'] = [cursorX + w / 2, h / 2 + 0.02, cursorZ];
        cursorX += w + 3;
        rowH = Math.max(rowH, h);
        void rowH;
        return { ...p, t: { p: p3, r: [Math.PI / 2, 0, 0] as Transform['r'] } };
      });
    }
  }

  const rowMax = Math.max(18, Math.min(34, Math.sqrt(pieces.length) * 12));
  let cursorX = 0;
  let cursorZ = 0;
  let rowH = 0;
  const placed = pieces.map((p, i) => {
    const { w, h } = sizes[i];
    if (cursorX > 0 && cursorX + w > rowMax) {
      cursorX = 0;
      cursorZ += rowH + 3;
      rowH = 0;
    }
    const p3: Transform['p'] = [cursorX + w / 2, h / 2 + 0.02, cursorZ];
    cursorX += w + 3;
    rowH = Math.max(rowH, h);
    return { ...p, t: { p: p3, r: [Math.PI / 2, 0, 0] as Transform['r'] } };
  });
  // 以整体中心归零
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of placed) {
    minX = Math.min(minX, p.t.p[0]);
    maxX = Math.max(maxX, p.t.p[0]);
    minZ = Math.min(minZ, p.t.p[2]);
    maxZ = Math.max(maxZ, p.t.p[2]);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  return placed.map((p) => ({
    ...p,
    t: { ...p.t, p: [p.t.p[0] - cx, p.t.p[1], p.t.p[2] - cz] },
  }));
}

export function totalBeads(project: Project): number {
  let n = project.loose.length;
  for (const p of project.pieces) n += p.beads.length;
  return n;
}
