import type { Comment, Scene, User, WorkDetail, WorkMeta } from '../types';

const TOKEN_KEY = 'douyu.token.v1';

export class ApiError extends Error {
  status: number;
  code: string;
  need?: number;
  points?: number;
  constructor(status: number, code: string, message: string, extra?: { need?: number; points?: number }) {
    super(message);
    this.status = status;
    this.code = code;
    this.need = extra?.need;
    this.points = extra?.points;
  }
}

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', '连不上豆屿服务，看看终端里的服务还开着吗');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  if (!res.ok) {
    if (res.status === 401) {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
    throw new ApiError(res.status, data?.error || 'ERROR', data?.message || '请求失败', {
      need: data?.need,
      points: data?.points,
    });
  }
  return data as T;
}

export type WorksResponse = { works: WorkMeta[] };
export type Stats = { works: number; beads: number; users: number; unlocks: number };
export type SessionResponse = { user: User; token: string };
export type UnlockResponse = { work: WorkDetail & { scene: Scene }; points: number; charged: number };
export type PublishResponse = { work: WorkMeta; points: number; awarded: number };

export async function bootSession(): Promise<User> {
  const token = getToken();
  const data = await request<SessionResponse>('/api/session', { method: 'POST', body: { token } });
  setToken(data.token);
  return data.user;
}

export const api = {
  me: () => request<{ user: User }>('/api/me'),
  rename: (name: string) => request<{ user: User }>('/api/me', { method: 'PATCH', body: { name } }),
  works: (filter = 'latest', q = '') =>
    request<WorksResponse>(`/api/works?filter=${encodeURIComponent(filter)}&q=${encodeURIComponent(q)}`),
  stats: () => request<Stats>('/api/stats'),
  work: (id: string) => request<{ work: WorkDetail }>(`/api/works/${encodeURIComponent(id)}`),
  unlock: (id: string) =>
    request<UnlockResponse>(`/api/works/${encodeURIComponent(id)}/unlock`, { method: 'POST' }),
  like: (id: string) =>
    request<{ liked: boolean; likes: number }>(`/api/works/${encodeURIComponent(id)}/like`, {
      method: 'POST',
    }),
  collect: (id: string) =>
    request<{ collected: boolean; collects: number }>(
      `/api/works/${encodeURIComponent(id)}/collect`,
      { method: 'POST' },
    ),
  comments: (id: string) =>
    request<{ comments: Comment[] }>(`/api/works/${encodeURIComponent(id)}/comments`),
  comment: (id: string, body: string, replyTo?: string | null) =>
    request<{ comment: Comment; commentCount: number }>(
      `/api/works/${encodeURIComponent(id)}/comments`,
      { method: 'POST', body: { body, replyTo: replyTo || null } },
    ),
  deleteComment: (commentId: string) =>
    request<{ ok: boolean; commentCount: number }>(
      `/api/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE' },
    ),
  report: (targetType: 'work' | 'comment', targetId: string, reason: string) =>
    request<{ ok: boolean }>('/api/reports', {
      method: 'POST',
      body: { targetType, targetId, reason },
    }),
  publish: (payload: {
    title: string;
    desc: string;
    price: number;
    cover: string;
    images?: string[];
    scene: Scene;
    sourceWorkId?: string | null;
  }) => request<PublishResponse>('/api/works', { method: 'POST', body: payload }),
};
