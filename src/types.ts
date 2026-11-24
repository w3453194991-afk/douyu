export type Bead = { x: number; y: number; c: string };

/** 板面矩形选区，单位为格，w/h 至少为 1 */
export type Rect = { x: number; y: number; w: number; h: number };

export type Vec3 = [number, number, number];

export type Transform = { p: Vec3; r: Vec3 };

export type Piece = {
  id: string;
  name: string;
  /** 局部坐标，从 0,0 开始 */
  beads: Bead[];
  /** 这块零件在无限板上的落点（局部 0,0 对应的板面格） */
  pos: [number, number];
  /** three.js 立体拼装变换，单位=1 颗豆 */
  t: Transform;
  hidden?: boolean;
};

export type Guide = {
  workId: string;
  title: string;
  author: string;
  price: number;
  pieces: Piece[];
};

export type BeadBrand = 'douyu' | 'hama' | 'perler' | 'artkal' | 'mixed';

export type Project = {
  id: string;
  title: string;
  loose: Bead[];
  pieces: Piece[];
  guide: Guide | null;
  /** 这张图纸按哪个品牌的色卡输出；旧项目没有则按豆屿 */
  brand?: BeadBrand;
  createdAt: number;
  updatedAt: number;
};

export type ScenePiece = {
  id: string;
  name: string;
  beads: [number, number, string][];
  pos: [number, number];
  t: Transform;
};

export type Scene = { v: 1; pieces: ScenePiece[] };

export type User = {
  id: string;
  name: string;
  points: number;
  avatarColor: string;
  avatarEmoji: string;
  createdAt: number;
};

export type Author = {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string;
};

export type WorkMeta = {
  id: string;
  title: string;
  desc: string;
  coverUrl: string;
  author: Author;
  beadCount: number;
  partCount: number;
  price: number;
  sales: number;
  likes: number;
  liked: boolean;
  collects: number;
  collected: boolean;
  commentCount: number;
  imageCount: number;
  unlocked: boolean;
  mine: boolean;
  createdAt: number;
  source: { workId: string; title: string; author: string } | null;
};

export type WorkDetail = WorkMeta & { scene?: Scene; images?: string[] };

export type Comment = {
  id: string;
  body: string;
  createdAt: number;
  mine: boolean;
  replyTo: { id: string; author: Author } | null;
  author: Author;
};

export type Tool = 'bead' | 'erase' | 'pick' | 'select' | 'pan';
export type Mode = 'board' | 'assembly';

export type Snapshot = {
  loose: Bead[];
  pieces: Piece[];
};
