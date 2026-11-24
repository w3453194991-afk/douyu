import React, { useEffect, useRef } from 'react';
import { useApp } from '../appStore';
import { Icon, type IconName } from '../components/Icon';
import { Avatar } from '../components/Gallery';
import type { Piece, WorkMeta } from '../types';
import { drawPieceThumb, formatNumber } from '../lib/render';

export type MiniTab = 'home' | 'studio' | 'gallery' | 'profile';

export function MiniStatusBar() {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return (
    <div className="mini-status">
      <span className="mini-time">{time}</span>
      <span className="mini-status-right">
        <span className="mini-signal">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="mini-5g">5G</span>
        <span className="mini-battery">
          <i />
        </span>
      </span>
    </div>
  );
}

export function MiniCapsule({ onClick }: { onClick: () => void }) {
  return (
    <button className="mini-capsule" onClick={onClick} aria-label="小程序菜单">
      <span className="mini-capsule-dots">•••</span>
      <span className="mini-capsule-line" />
      <span className="mini-capsule-target">
        <i />
      </span>
    </button>
  );
}

export function MiniNav({
  title,
  subtitle,
  onBack,
  right,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="mini-navbar">
      {onBack ? (
        <button className="mini-back" onClick={onBack} aria-label="返回">
          <Icon name="arrowLeft" size={20} />
        </button>
      ) : (
        <span className="mini-back-spacer" />
      )}
      <div className="mini-nav-title">
        <b>{title || '豆屿'}</b>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="mini-nav-right">{right}</div>
    </header>
  );
}

const TABS: Array<{ id: MiniTab; label: string; icon: IconName }> = [
  { id: 'home', label: '首页', icon: 'home' },
  { id: 'studio', label: '工位', icon: 'board' },
  { id: 'gallery', label: '集市', icon: 'gallery' },
  { id: 'profile', label: '我的', icon: 'user' },
];

export function MiniTabBar({
  tab,
  onChange,
}: {
  tab: MiniTab;
  onChange: (tab: MiniTab) => void;
}) {
  return (
    <nav className="mini-tabbar" aria-label="底部导航">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`mini-tab ${tab === t.id ? 'on' : ''}`}
          onClick={() => onChange(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          <Icon name={t.icon} size={21} strokeWidth={tab === t.id ? 2.1 : 1.8} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function MiniSheet({
  open,
  title,
  onClose,
  children,
  className = '',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="mini-sheet-layer">
      <div className="mini-sheet-backdrop" onClick={onClose} />
      <div className={`mini-sheet ${className}`} role="dialog" aria-label={title}>
        <div className="mini-sheet-handle" />
        <div className="mini-sheet-head">
          <b>{title}</b>
          <button className="mini-sheet-close" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="mini-sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function MiniToasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div className="mini-toasts" role="status" aria-live="polite">
      {toasts.slice(-2).map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span className="toast-icon">
            <Icon
              name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'info' : 'sparkle'}
              size={16}
            />
          </span>
          <div className="toast-copy">
            <b>{t.title}</b>
            {t.msg && <span>{t.msg}</span>}
          </div>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="关闭">
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function MiniPieceThumb({ piece, size = 46 }: { piece: Piece; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawPieceThumb(ref.current, piece, { padding: 4 });
  }, [piece]);
  return (
    <canvas
      ref={ref}
      className="mini-piece-thumb"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function priceText(work: WorkMeta): string {
  if (work.mine) return '我的作品';
  if (work.price === 0) return '免费图纸';
  if (work.unlocked) return '已解锁';
  return `${work.price} 豆币`;
}

export function MiniWorkCard({
  work,
  onOpen,
  wide = false,
}: {
  work: WorkMeta;
  onOpen: () => void;
  wide?: boolean;
}) {
  return (
    <button className={`mini-work-card ${wide ? 'wide' : ''}`} onClick={onOpen}>
      <div className="mini-work-cover">
        <img src={work.coverUrl} alt={work.title} loading="lazy" />
        <span
          className={`mini-price ${
            work.mine ? 'mine' : work.price === 0 ? 'free' : work.unlocked ? 'unlocked' : ''
          }`}
        >
          {work.price > 0 && !work.mine && !work.unlocked && <Icon name="coin" size={10} />}
          {priceText(work)}
        </span>
        {work.source && <span className="mini-remix-tag">复刻</span>}
      </div>
      <div className="mini-work-body">
        <b>{work.title}</b>
        <div className="mini-work-meta">
          <Avatar
            name={work.author.name}
            color={work.author.avatarColor}
            emoji={work.author.avatarEmoji}
            size={16}
          />
          <span>{work.author.name}</span>
          <span className="mini-like">
            <Icon name="heart" size={11} filled={work.liked} />
            {work.likes}
          </span>
        </div>
        {!wide && (
          <div className="mini-work-sub">
            {work.partCount} 块 · {formatNumber(work.beadCount)} 颗
          </div>
        )}
      </div>
    </button>
  );
}

export function MiniSegment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mini-segment">
      {options.map((o) => (
        <button key={o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MiniEmpty({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mini-empty">
      <span className="mini-empty-icon">
        <Icon name="bead" size={26} />
      </span>
      <b>{title}</b>
      {desc && <p>{desc}</p>}
      {action}
    </div>
  );
}
