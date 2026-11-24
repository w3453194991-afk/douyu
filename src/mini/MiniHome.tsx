import React, { useEffect, useState } from 'react';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { api, type Stats } from '../lib/api';
import type { WorkMeta } from '../types';
import { guideProgress, totalBeads } from '../lib/scene';
import { cmText, projectMetrics } from '../lib/metrics';
import { formatNumber } from '../lib/render';
import { Icon } from '../components/Icon';
import { ProjectPreview } from '../components/ProjectPreview';
import { MiniSheet, priceText } from './ui';

export function MiniHome({
  onStudio,
  onGallery,
  onWork,
  onPattern,
  onGuide,
}: {
  onStudio: () => void;
  onGallery: () => void;
  onWork: (id: string) => void;
  onPattern: () => void;
  onGuide: () => void;
}) {
  const user = useApp((s) => s.user);
  const project = useStudio((s) => s.project);
  const newProject = useStudio((s) => s.newProject);
  const [latest, setLatest] = useState<WorkMeta[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .works('latest')
      .then((r) => alive && setLatest(r.works.slice(0, 6)))
      .catch(() => undefined);
    api
      .stats()
      .then((s) => alive && setStats(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const beads = totalBeads(project);
  const metrics = projectMetrics(project);
  const hasContent = project.loose.length > 0 || project.pieces.length > 0 || !!project.guide;
  const progress = project.guide
    ? guideProgress(project.guide, project.loose, project.pieces)
    : null;
  const pct = progress ? Math.round(progress.ratio * 100) : 0;
  const shortName = (user?.name || '岛民').split(' ')[0];

  const startNew = () => {
    if (hasContent) setConfirmNew(true);
    else {
      newProject();
      onStudio();
    }
  };

  return (
    <>
      <div className="mini-scroll mini-home">
        <div className="mini-home-head">
          <div>
            <span className="mini-eyebrow">BEAD ISLE · 拼豆工作室</span>
            <h1>嗨，{shortName}</h1>
          </div>
          <span className="mini-head-points">
            <Icon name="coin" size={13} />
            {user?.points ?? 0}
          </span>
        </div>

        <div className="mini-hero">
          <span className="mini-eyebrow">无限拼豆 · 熨烫 · 立体拼装</span>
          <h2>
            把一颗一颗豆，
            <br />
            <em>熨成一座岛。</em>
          </h2>
          <p>
            逐颗放豆、熨成零件，再立成一个小世界。拍下成品挂上集市，让别的岛民用豆币解锁你的图纸。
          </p>
          <div className="mini-hero-actions">
            <button className="mini-button primary" onClick={onStudio}>
              {hasContent ? '继续上次的工位' : '开始拼豆'}
              <Icon name="arrowLeft" size={14} className="cta-arrow" />
            </button>
            {hasContent ? (
              <button className="mini-button ghost" onClick={startNew}>
                <Icon name="plus" size={13} />
                新开一块
              </button>
            ) : (
              <button className="mini-button ghost" onClick={onGallery}>
                <Icon name="gallery" size={13} />
                逛集市
              </button>
            )}
          </div>
        </div>

        <button className="mini-workbench" onClick={onStudio}>
          <div className="mini-preview-wrap">
            <ProjectPreview project={project} padBottom={20} maxCell={30} />
            {progress && <span className="mini-guide-badge">复刻 {pct}%</span>}
          </div>
          <div className="mini-workbench-info">
            <div>
              <b>{hasContent ? project.title || '无题小岛' : '一块空板'}</b>
              <span>
                {hasContent
                  ? `${beads} 颗豆 · ${project.pieces.length} 块零件 · 约${cmText(metrics.cmW)}×${cmText(metrics.cmH)}cm`
                  : '无限大 · 36 色 · 等你放第一颗'}
              </span>
            </div>
            <span className="mini-workbench-go">
              <Icon name="arrowLeft" size={15} />
            </span>
          </div>
        </button>

        <div className="mini-quick">
          <button onClick={startNew}>
            <span>
              <Icon name="plus" size={16} />
            </span>
            新开一块板
          </button>
          <button onClick={onGallery}>
            <span>
              <Icon name="gallery" size={16} />
            </span>
            逛集市
          </button>
          <button onClick={onPattern}>
            <span>
              <Icon name="image" size={16} />
            </span>
            照片转图纸
          </button>
          <button onClick={() => setHowOpen(true)}>
            <span>
              <Icon name="sparkle" size={16} />
            </span>
            怎么玩
          </button>
        </div>

        <div className="mini-section">
          <div className="mini-section-head">
            <h2>岛上新作</h2>
            <button onClick={onGallery}>
              全部 <Icon name="arrowLeft" size={12} className="cta-arrow" />
            </button>
          </div>
          {latest.length ? (
            <div className="mini-rail">
              {latest.map((w) => (
                <button className="mini-rail-card" key={w.id} onClick={() => onWork(w.id)}>
                  <div className="mini-rail-cover">
                    <img src={w.coverUrl} alt={w.title} loading="lazy" />
                    <span>{priceText(w)}</span>
                  </div>
                  <b>{w.title}</b>
                  <small>
                    @{w.author.name} · {formatNumber(w.beadCount)} 颗
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <div className="mini-loading">正在看看岛上有什么…</div>
          )}
        </div>

        <div className="mini-tip">
          <b>岛民提示</b>：发布作品 +50 豆币；作品被喜欢再 +2。解锁别人的图纸要花豆币，但改完就是你的版本。
          {stats && (
            <>
              {' '}
              岛上现在有 {stats.works} 件成品、{formatNumber(stats.beads)} 颗豆。
            </>
          )}
        </div>
      </div>

      <MiniSheet
        open={howOpen}
        title="怎么玩"
        onClose={() => setHowOpen(false)}
        className="mini-how-sheet"
      >
        <div className="mini-steps" style={{ marginTop: 0, borderTop: 'none' }}>
          <div>
            <span>01</span>
            <b>放豆</b>
            <p>点/拖放豆，空格拖板；色卡里换颜色。</p>
          </div>
          <div>
            <span>02</span>
            <b>熨烫</b>
            <p>相连的散豆会按连通块变成一块块零件。</p>
          </div>
          <div>
            <span>03</span>
            <b>立起来 / 发布</b>
            <p>去立体拼装摆好，拍下成品，挂上集市。</p>
          </div>
        </div>
        <button className="mini-button primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setHowOpen(false)}>
          开始拼豆
        </button>
        <button
          className="mini-button ghost"
          style={{ width: '100%', marginTop: 6 }}
          onClick={() => {
            setHowOpen(false);
            onGuide();
          }}
        >
          <Icon name="book" size={14} /> 看拼板 / 熨烫教程
        </button>
      </MiniSheet>

      <MiniSheet open={confirmNew} title="铺一块新板？" onClose={() => setConfirmNew(false)}>
        <p style={{ fontSize: 11, lineHeight: 1.75, color: 'var(--ink-2)' }}>
          当前工位上的 <b>{beads}</b> 颗豆和 <b>{project.pieces.length}</b> 块零件会清空。
          已经发布到集市的作品不受影响。
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
              onStudio();
            }}
          >
            铺一块新的
          </button>
        </div>
      </MiniSheet>
    </>
  );
}
