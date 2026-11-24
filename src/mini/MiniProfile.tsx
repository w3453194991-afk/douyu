import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { api } from '../lib/api';
import type { WorkMeta } from '../types';
import { formatNumber, timeAgo } from '../lib/render';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Gallery';
import { MiniSheet, MiniEmpty } from './ui';

export function MiniProfile({
  onWork,
  onNew,
  onWeb,
  onGallery,
}: {
  onWork: (id: string) => void;
  onNew: () => void;
  onWeb: () => void;
  onGallery: () => void;
}) {
  const user = useApp((s) => s.user);
  const project = useStudio((s) => s.project);
  const newProject = useStudio((s) => s.newProject);
  const toast = useApp((s) => s.toast);
  const [mine, setMine] = useState<WorkMeta[]>([]);
  const [unlocked, setUnlocked] = useState<WorkMeta[]>([]);
  const [collected, setCollected] = useState<WorkMeta[]>([]);
  const [seg, setSeg] = useState<'works' | 'unlocked' | 'collected'>('works');
  const [confirmNew, setConfirmNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([api.works('mine'), api.works('unlocked'), api.works('collected')])
      .then(([a, b, c]) => {
        if (!alive) return;
        setMine(a.works);
        setUnlocked(b.works);
        setCollected(c.works);
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const likes = useMemo(() => mine.reduce((n, w) => n + w.likes, 0), [mine]);
  const hasContent =
    project.loose.length > 0 || project.pieces.length > 0 || !!project.guide;
  const list =
    seg === 'works' ? mine : seg === 'unlocked' ? unlocked : collected;

  const startNew = () => {
    if (hasContent) setConfirmNew(true);
    else {
      newProject();
      onNew();
      toast('success', '新板子铺好了', '无限大，随便放');
    }
  };

  return (
    <>
      <div className="mini-scroll">
        <div className="mini-tab-head" style={{ paddingTop: 6, paddingBottom: 8 }}>
          <div>
            <span className="mini-eyebrow">MY ISLAND</span>
            <h1>我的</h1>
          </div>
          <button className="mini-head-btn" onClick={onWeb} aria-label="打开桌面版">
            <Icon name="phone" size={16} />
          </button>
        </div>
        <div className="mini-profile-head">
          <div className="mini-profile-user">
            {user && (
              <Avatar
                name={user.name}
                color={user.avatarColor}
                emoji={user.avatarEmoji}
                size={44}
              />
            )}
            <div>
              <b>{user?.name ?? '岛民'}</b>
              <span>本机游客 · 自动保存</span>
            </div>
          </div>
          <div className="mini-points-big">
            <b>{user?.points ?? 0}</b>
            <span>豆币</span>
            <span className="coin">
              <Icon name="coin" size={18} />
            </span>
          </div>
        </div>

        <div className="mini-profile-stats">
          <div>
            <b>{mine.length}</b>
            <span>我的作品</span>
          </div>
          <div>
            <b>{unlocked.length}</b>
            <span>已解锁</span>
          </div>
          <div>
            <b>{collected.length}</b>
            <span>收藏</span>
          </div>
          <div>
            <b>{likes}</b>
            <span>收到喜欢</span>
          </div>
        </div>

        <div className="mini-segment">
          <button className={seg === 'works' ? 'on' : ''} onClick={() => setSeg('works')}>
            我的作品
          </button>
          <button className={seg === 'unlocked' ? 'on' : ''} onClick={() => setSeg('unlocked')}>
            已解锁图纸
          </button>
          <button className={seg === 'collected' ? 'on' : ''} onClick={() => setSeg('collected')}>
            收藏
          </button>
        </div>

        <div className="mini-profile-list">
          {loading ? (
            <div className="mini-loading">正在翻你的抽屉…</div>
          ) : list.length === 0 ? (
            <MiniEmpty
              title={
                seg === 'works'
                  ? '还没有发布过作品'
                  : seg === 'unlocked'
                    ? '还没有解锁过图纸'
                    : '还没有收藏'
              }
              desc={
                seg === 'works'
                  ? '拼一块板、拍张照挂上集市，还能赚 50 豆币。'
                  : seg === 'unlocked'
                    ? '去集市用豆币解锁一张图纸，逐颗复刻。'
                    : '在作品页点书签，喜欢的图纸就会收在这里。'
              }
              action={
                <button className="mini-button primary small" onClick={onGallery}>
                  去集市
                </button>
              }
            />
          ) : (
            list.map((w) => (
              <button className="mini-profile-row" key={w.id} onClick={() => onWork(w.id)}>
                <img src={w.coverUrl} alt={w.title} loading="lazy" />
                <div>
                  <b>{w.title}</b>
                  <span>
                    {w.partCount} 块 · {formatNumber(w.beadCount)} 颗 · {timeAgo(w.createdAt)}
                  </span>
                  <span>
                    {w.mine ? '我的作品' : w.price === 0 ? '免费图纸' : `${w.price} 豆币`}
                    {w.likes > 0 ? ` · ${w.likes} 喜欢` : ''}
                  </span>
                </div>
                <Icon name="arrowLeft" size={15} />
              </button>
            ))
          )}
        </div>

        <div className="mini-profile-actions">
          <button className="mini-button primary" onClick={startNew}>
            <Icon name="plus" size={14} />
            新开一块板
          </button>
          <button className="mini-button ghost" onClick={onNew}>
            <Icon name="board" size={14} />
            继续工位
          </button>
        </div>

        <div className="mini-profile-actions" style={{ paddingTop: 0 }}>
          <button className="mini-button ghost" onClick={onWeb}>
            <Icon name="phone" size={13} />
            打开桌面版
          </button>
          <button className="mini-button ghost" onClick={onGallery}>
            <Icon name="gallery" size={13} />
            逛集市
          </button>
        </div>

        <div className="mini-profile-note">
          <b>豆币规则</b>：新游客 900；发布作品 +50；作品被喜欢 +2；解锁图纸扣作者定价（自己的和免费的
          不扣）。数据都保存在这台电脑上。
        </div>
      </div>

      <MiniSheet open={confirmNew} title="铺一块新板？" onClose={() => setConfirmNew(false)}>
        <p style={{ fontSize: 11, lineHeight: 1.75, color: 'var(--ink-2)' }}>
          当前工位上的 <b>{project.loose.length}</b> 颗豆和 <b>{project.pieces.length}</b>{' '}
          块零件会清空。已经发布到集市的作品不受影响。
        </p>
        <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
          <button className="mini-button ghost" style={{ flex: 1 }} onClick={() => setConfirmNew(false)}>
            先留着
          </button>
          <button
            className="mini-button primary"
            style={{ flex: 1 }}
            onClick={() => {
              newProject();
              setConfirmNew(false);
              onNew();
              toast('success', '新板子铺好了', '无限大，随便放');
            }}
          >
            铺一块新的
          </button>
        </div>
      </MiniSheet>
    </>
  );
}
