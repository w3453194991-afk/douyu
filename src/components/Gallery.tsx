import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, type Stats } from '../lib/api';
import type { WorkMeta } from '../types';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { Icon, LogoMark } from './Icon';
import { formatNumber, timeAgo } from '../lib/render';

type Filter = 'latest' | 'hot' | 'unlocked' | 'collected' | 'mine';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'latest', label: '最新' },
  { id: 'hot', label: '热门' },
  { id: 'unlocked', label: '已解锁' },
  { id: 'collected', label: '收藏' },
  { id: 'mine', label: '我的' },
];

export function Avatar({
  name,
  color,
  emoji,
  size = 28,
}: {
  name: string;
  color: string;
  emoji: string;
  size?: number;
}) {
  return (
    <span
      className="avatar"
      style={{ background: color, width: size, height: size, fontSize: size * 0.5 }}
      title={name}
    >
      {emoji}
    </span>
  );
}

function priceBadge(w: WorkMeta) {
  if (w.mine) return <span className="price-tag mine">我的作品</span>;
  if (w.price === 0) return <span className="price-tag free">免费图纸</span>;
  if (w.unlocked) return <span className="price-tag unlocked">已解锁</span>;
  return (
    <span className="price-tag locked">
      <Icon name="coin" size={13} /> {w.price}
    </span>
  );
}

export function WorkCard({ work, onOpen }: { work: WorkMeta; onOpen: () => void }) {
  return (
    <article className="work-card">
      <button className="work-cover" onClick={onOpen} aria-label={`查看 ${work.title}`}>
        <img src={work.coverUrl} alt={work.title} loading="lazy" />
        {priceBadge(work)}
        {work.source && <span className="remix-tag">复刻</span>}
        <span className="cover-hover">
          打开看看 <Icon name="arrowLeft" size={15} className="cover-arrow" />
        </span>
      </button>
      <button className="work-body" onClick={onOpen}>
        <h3>{work.title}</h3>
        <div className="work-meta">
          <Avatar name={work.author.name} color={work.author.avatarColor} emoji={work.author.avatarEmoji} size={22} />
          <span className="author-name">{work.author.name}</span>
          <span className="meta-dot">·</span>
          <span>{timeAgo(work.createdAt)}</span>
        </div>
        <div className="work-foot">
          <span className="like-count">
            <Icon name="heart" size={14} filled={work.liked} /> {work.likes}
          </span>
          <span>
            {work.partCount} 块零件 · {formatNumber(work.beadCount)} 颗豆
          </span>
        </div>
      </button>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="work-card skeleton">
      <div className="skeleton-cover" />
      <div className="skeleton-body">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function Gallery() {
  const user = useApp((s) => s.user);
  const setView = useApp((s) => s.setView);
  const openWork = useApp((s) => s.openWork);
  const activeWorkId = useApp((s) => s.activeWorkId);
  const [filter, setFilter] = useState<Filter>('latest');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [works, setWorks] = useState<WorkMeta[]>([]);
  const [featured, setFeatured] = useState<WorkMeta | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const prevWork = useRef<string | null>(activeWorkId);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 260);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .works(filter, debounced)
      .then((res) => {
        if (!alive) return;
        setWorks(res.works);
        if (filter === 'latest' && !debounced) {
          setFeatured((f) => f ?? res.works[0] ?? null);
        }
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || '集市暂时关门了');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filter, debounced, tick]);

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (prevWork.current && activeWorkId === null) setTick((n) => n + 1);
    prevWork.current = activeWorkId;
  }, [activeWorkId]);

  const countLabel = useMemo(() => {
    if (loading) return '铺货中…';
    return `${works.length} 件`;
  }, [loading, works.length]);

  const shownWorks = useMemo(() => {
    if (filter === 'latest' && !debounced && featured && works.length > 1) {
      return works.filter((w) => w.id !== featured.id);
    }
    return works;
  }, [works, filter, debounced, featured]);

  return (
    <div className="gallery">
      <header className="gallery-top">
        <button className="brand" onClick={() => setView('home')} title="回到首页">
          <LogoMark size={30} />
          <span className="brand-text">
            <span className="wordmark">豆屿</span>
            <span className="brand-sub">BEAD ISLE</span>
          </span>
        </button>
        <button
          className="icon-btn home-jump"
          onClick={() => setView('home')}
          title="首页"
          aria-label="首页"
        >
          <Icon name="home" size={18} />
        </button>
        <label className="gallery-search">
          <Icon name="search" size={17} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜作品名、描述里的灵感…"
            aria-label="搜索作品"
          />
          {q && (
            <button type="button" className="search-clear" onClick={() => setQ('')} aria-label="清空">
              <Icon name="x" size={14} />
            </button>
          )}
        </label>
        <div className="topbar-right">
          <div className="points-pill">
            <Icon name="coin" size={16} />
            <b>{user?.points ?? 0}</b>
            <span>豆币</span>
          </div>
          <button className="btn btn-dark" onClick={() => setView('studio')}>
            <Icon name="arrowLeft" size={17} />
            <span className="btn-label">回到工位</span>
          </button>
        </div>
      </header>

      <main className="gallery-main">
        <section className="gallery-hero">
          <div className="hero-copy">
            <span className="eyebrow">THE ISLAND MARKET</span>
            <h1>
              每一颗豆，
              <br />
              <em>都有人认真熨过。</em>
            </h1>
            <p>
              看看别人把零件拼成了什么。用豆币解锁图纸，一颗一颗复刻
              <br />
              然后在原作的基础上，改成你自己的版本。
            </p>
            <div className="hero-stats">
              <div>
                <b>{stats ? stats.works : '—'}</b>
                <span>件成品</span>
              </div>
              <div>
                <b>{stats ? formatNumber(stats.beads) : '—'}</b>
                <span>颗豆</span>
              </div>
              <div>
                <b>{stats ? stats.unlocks : '—'}</b>
                <span>次复刻</span>
              </div>
            </div>
          </div>
          {featured && (
            <div className="hero-feature">
              <button className="hero-card" onClick={() => openWork(featured.id)}>
                <img src={featured.coverUrl} alt={featured.title} />
                <span className="hero-card-caption">
                  <span className="hero-card-eyebrow">本周精选</span>
                  <b>{featured.title}</b>
                  <span className="hero-card-author">@{featured.author.name}</span>
                </span>
              </button>
              <span className="hero-sticker">
                <Icon name="sparkle" size={14} /> 发布作品 +50 豆币
              </span>
            </div>
          )}
        </section>

        <div className="gallery-toolbar">
          <div className="filter-tabs" role="tablist" aria-label="筛选">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={filter === f.id ? 'on' : ''}
                onClick={() => setFilter(f.id)}
                role="tab"
                aria-selected={filter === f.id}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="result-count">{countLabel}</span>
        </div>

        {error ? (
          <div className="gallery-state">
            <span className="state-icon">
              <Icon name="info" size={26} />
            </span>
            <h2>集市暂时关门了</h2>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => setTick((n) => n + 1)}>
              再敲一次门
            </button>
          </div>
        ) : loading && !works.length ? (
          <div className="works-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : works.length === 0 ? (
          <div className="gallery-state">
            <span className="state-icon warm">
              <Icon name="gallery" size={26} />
            </span>
            <h2>
              {q
                ? '没有找到这件作品'
                : filter === 'mine'
                  ? '你还没发布过作品'
                  : filter === 'collected'
                    ? '还没有收藏'
                    : filter === 'unlocked'
                      ? '还没解锁过图纸'
                      : '岛上还没有作品'}
            </h2>
            <p>
              {q
                ? '换个关键词试试，或者去看看最新上岛的。'
                : filter === 'mine'
                  ? '拼一块板，拍张照，挂到集市上，还能赚 50 豆币。'
                  : filter === 'collected'
                    ? '在作品页点书签，喜欢的图纸就会收在这里。'
                    : filter === 'unlocked'
                      ? '去「最新」逛逛，用豆币解锁一张图纸，逐颗复刻。'
                      : '成为第一个把作品挂上岛的人吧。'}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (filter === 'mine' || filter === 'unlocked' || filter === 'collected') setFilter('latest');
                else setView('studio');
                setQ('');
              }}
            >
              {filter === 'mine' || filter === 'collected' ? '去最新看看' : '回工位拼一块'}
            </button>
          </div>
        ) : (
          <div className="works-grid">
            {shownWorks.map((w) => (
              <WorkCard key={w.id} work={w} onOpen={() => openWork(w.id)} />
            ))}
          </div>
        )}

        <footer className="gallery-foot">
          <div className="foot-mark">
            <LogoMark size={26} />
            <div>
              <b>豆屿</b>
              <span>BEAD ISLE · 一颗一颗，熨成一座岛</span>
            </div>
          </div>
          <p>
            所有图纸由岛上的玩家创作。解锁后可以逐颗复刻，也可以换色、加零件、重新立体拼装。
            发布作品可得 50 豆币，作品被喜欢还能再赚一点。
          </p>
        </footer>
      </main>
    </div>
  );
}
