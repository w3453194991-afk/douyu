import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { WorkMeta } from '../types';
import { Icon } from '../components/Icon';
import { MiniWorkCard } from './ui';

type Filter = 'latest' | 'hot' | 'unlocked' | 'collected' | 'mine';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'latest', label: '最新' },
  { id: 'hot', label: '热门' },
  { id: 'unlocked', label: '已解锁' },
  { id: 'collected', label: '收藏' },
  { id: 'mine', label: '我的' },
];

export function MiniGallery({ onWork }: { onWork: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>('latest');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [works, setWorks] = useState<WorkMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 240);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .works(filter, debounced)
      .then((r) => alive && setWorks(r.works))
      .catch((e) => alive && setError(e?.message || '集市暂时关门了'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filter, debounced, tick]);

  return (
    <div className="mini-gallery" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="mini-tab-head">
        <div>
          <span className="mini-eyebrow">THE ISLAND MARKET</span>
          <h1>集市</h1>
        </div>
        <button className="mini-head-btn" onClick={() => setSearchOpen((v) => !v)} aria-label="搜索">
          <Icon name={searchOpen ? 'x' : 'search'} size={17} />
        </button>
      </div>

      {searchOpen && (
        <label className="mini-search">
          <Icon name="search" size={14} />
          <input
            value={q}
            autoFocus
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜作品名、描述里的灵感…"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="清空">
              <Icon name="x" size={12} />
            </button>
          )}
        </label>
      )}

      <div className="mini-chips">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`mini-chip ${filter === f.id ? 'on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 8.5, color: 'var(--ink-3)' }}>
          {loading ? '…' : `${works.length} 件`}
        </span>
      </div>

      <div className="mini-scroll">
        {error ? (
          <div className="mini-empty">
            <span className="mini-empty-icon">
              <Icon name="info" size={24} />
            </span>
            <b>集市暂时关门了</b>
            <p>{error}</p>
            <button className="mini-button primary small" onClick={() => setTick((n) => n + 1)}>
              再敲一次门
            </button>
          </div>
        ) : loading && !works.length ? (
          <div className="mini-skeleton-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="mini-skeleton" key={i} />
            ))}
          </div>
        ) : works.length === 0 ? (
          <div className="mini-empty">
            <span className="mini-empty-icon">
              <Icon name="gallery" size={24} />
            </span>
            <b>
              {q
                ? '没有找到这件作品'
                : filter === 'mine'
                  ? '你还没发布过作品'
                  : filter === 'collected'
                    ? '还没有收藏'
                    : filter === 'unlocked'
                      ? '还没解锁过图纸'
                      : '岛上还没有作品'}
            </b>
            <p>
              {filter === 'mine'
                ? '拼一块板、拍张照挂上集市，还能赚 50 豆币。'
                : filter === 'collected'
                  ? '看到喜欢的作品，点作品页的书签就收进来了。'
                  : '换个关键词，或者去看看最新上岛的。'}
            </p>
            <button
              className="mini-button primary small"
              onClick={() => {
                setFilter('latest');
                setQ('');
              }}
            >
              看最新
            </button>
          </div>
        ) : (
          <div className="mini-gallery-grid">
            {works.map((w) => (
              <MiniWorkCard key={w.id} work={w} onOpen={() => onWork(w.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
