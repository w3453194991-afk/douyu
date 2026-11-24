import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { api, type Stats } from '../lib/api';
import type { WorkMeta } from '../types';
import { guideProgress, totalBeads } from '../lib/scene';
import { formatNumber, timeAgo } from '../lib/render';
import { Icon, LogoMark } from './Icon';
import { Avatar, WorkCard } from './Gallery';
import { Modal, ModalClose } from './Modal';
import { ProjectPreview } from './ProjectPreview';
import { PatternStudio } from './PatternStudio';
import { CraftGuide } from './CraftGuide';

export function Home() {
  const user = useApp((s) => s.user);
  const setView = useApp((s) => s.setView);
  const openWork = useApp((s) => s.openWork);
  const toast = useApp((s) => s.toast);
  const project = useStudio((s) => s.project);
  const newProject = useStudio((s) => s.newProject);

  const [latest, setLatest] = useState<WorkMeta[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .works('latest')
      .then((res) => {
        if (alive) setLatest(res.works.slice(0, 3));
      })
      .catch(() => undefined);
    api
      .stats()
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const beads = totalBeads(project);
  const hasContent = project.loose.length > 0 || project.pieces.length > 0 || !!project.guide;
  const progress = project.guide
    ? guideProgress(project.guide, project.loose, project.pieces)
    : null;
  const pct = progress ? Math.round(progress.ratio * 100) : 0;
  const lastEdit = timeAgo(project.updatedAt || Date.now());

  const openStudio = () => setView('studio');
  const startNew = () => {
    if (hasContent) {
      setConfirmNew(true);
    } else {
      newProject();
      setView('studio');
    }
  };

  return (
    <div className="home">
      <header className="home-top">
        <button className="brand" onClick={() => setView('home')} title="首页">
          <LogoMark size={32} />
          <span className="brand-text">
            <span className="wordmark">豆屿</span>
            <span className="brand-sub">BEAD ISLE</span>
          </span>
        </button>

        <nav className="home-nav" aria-label="主导航">
          <button className="on" onClick={() => setView('home')} title="首页">
            <Icon name="home" size={16} />
            <span className="nav-label">首页</span>
          </button>
          <button onClick={openStudio} title="工位">
            <Icon name="board" size={16} />
            <span className="nav-label">工位</span>
          </button>
          <button onClick={() => setView('gallery')} title="集市">
            <Icon name="gallery" size={16} />
            <span className="nav-label">集市</span>
          </button>
        </nav>

        <div className="topbar-right">
          <button className="mini-entry-btn" onClick={() => setView('mini')} title="打开小程序竖屏版">
            <Icon name="phone" size={15} />
            小程序版
          </button>
          <div className="points-pill" title="发布作品 +50 · 作品被喜欢 +2">
            <Icon name="coin" size={16} />
            <b>{user?.points ?? 0}</b>
            <span>豆币</span>
          </div>
          <button
            className="home-user"
            onClick={() => toast('info', '本机游客身份', '作品和数据都存在这台电脑上，不需要注册')}
            title="岛民身份"
          >
            {user && (
              <Avatar
                name={user.name}
                color={user.avatarColor}
                emoji={user.avatarEmoji}
                size={28}
              />
            )}
            <span>{user?.name ?? '岛民'}</span>
          </button>
        </div>
      </header>

      <main className="home-main">
        <section className="home-hero">
          <div className="home-copy">
            <span className="eyebrow">BEAD ISLE · 拼豆工作室</span>
            <h1>
              把一颗一颗豆，
              <br />
              <em>熨成一座岛。</em>
            </h1>
            <p className="home-lead">
              在无边无际的拼豆板上逐颗放豆，熨成一块块零件，再去立体拼装里把它们立成一个小世界。
              拍下成品挂上集市，让其他岛民用豆币解锁你的图纸，一颗一颗复刻，再改成自己的版本。
            </p>

            <div className="home-ctas">
              <button className="btn btn-primary btn-lg" onClick={openStudio}>
                {hasContent ? '继续上次的工位' : '开始拼一块'}
                <Icon name="arrowLeft" size={18} className="cta-arrow" />
              </button>
              {hasContent ? (
                <button className="btn btn-ghost btn-lg" onClick={startNew}>
                  <Icon name="plus" size={17} />
                  新开一块板
                </button>
              ) : (
                <button className="btn btn-ghost btn-lg" onClick={() => setView('gallery')}>
                  <Icon name="gallery" size={17} />
                  去集市找图纸
                </button>
              )}
            </div>

            <button className="home-photo-link" onClick={() => setPatternOpen(true)}>
              <span className="home-photo-icon">
                <Icon name="image" size={16} />
              </span>
              <span>
                <b>照片转图纸</b>
                <em>上传一张图，自动配色号、数颗数</em>
              </span>
              <Icon name="arrowLeft" size={15} className="cta-arrow" />
            </button>

            <div className="home-stats">
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
              <div>
                <b>{user?.points ?? 0}</b>
                <span>我的豆币</span>
              </div>
            </div>
          </div>

          <div className="home-feature">
            <div
              className="home-preview-card"
              onClick={openStudio}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openStudio();
              }}
              role="button"
              tabIndex={0}
              aria-label="打开工位"
            >
              <div className="preview-tape" />
              <div className="preview-head">
                <span>
                  <span className="preview-dot" /> 你的工位
                </span>
                <span className="preview-saved">
                  <Icon name="check" size={12} /> 自动保存
                </span>
              </div>
              <div className="preview-canvas-wrap">
                <ProjectPreview project={project} className="home-preview-canvas" />
                <div className="preview-caption">
                  <span className="preview-eyebrow">
                    {progress ? `复刻中 · ${pct}%` : hasContent ? '上次动工 · ' + lastEdit : '无限板 · 等你开张'}
                  </span>
                  <h2>{project.title || '无题小岛'}</h2>
                  <p>
                    {hasContent
                      ? `${beads} 颗豆 · ${project.pieces.length} 块零件`
                      : '无限大 · 36 色 · 没有 deadline'}
                  </p>
                  <span className="preview-open">
                    打开工位 <Icon name="arrowLeft" size={14} />
                  </span>
                </div>
                {progress && <span className="preview-guide-chip">图纸 {pct}%</span>}
              </div>
            </div>
            <span className="home-sticker">
              <Icon name="sparkle" size={14} />
              {hasContent ? '接着上次的拼' : '从第一颗开始'}
            </span>
          </div>
        </section>

        {latest.length > 0 && (
          <section className="home-section">
            <div className="home-section-head">
              <div>
                <span className="eyebrow">FRESH FROM THE ISLAND</span>
                <h2>岛上新作</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('gallery')}>
                去集市看全部 <Icon name="arrowLeft" size={15} className="cta-arrow" />
              </button>
            </div>
            <div className="home-works">
              {latest.map((w) => (
                <WorkCard key={w.id} work={w} onOpen={() => openWork(w.id)} />
              ))}
            </div>
          </section>
        )}

        <section className="home-how">
          <div className="how-head">
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>从一颗豆，到一座岛</h2>
          </div>
          <div className="how-steps">
            <div>
              <span className="how-num">01</span>
              <b>逐颗放豆</b>
              <p>无限板、36 色、随手拖出一整片。空格拖板，滚轮放大。</p>
            </div>
            <div>
              <span className="how-num">02</span>
              <b>熨成零件</b>
              <p>按 Enter，相连的散豆会熔成一块块独立零件，能单独拿起来。</p>
            </div>
            <div>
              <span className="how-num">03</span>
              <b>立成小世界</b>
              <p>去立体拼装拖动、旋转、叠放，再从最好的角度拍下成品。</p>
            </div>
            <div>
              <span className="how-num">04</span>
              <b>挂上集市</b>
              <p>定价、发布、被别的岛民解锁；你也可以用豆币解锁别人的图纸。</p>
            </div>
          </div>
          <button className="btn btn-ghost home-guide-link" onClick={() => setGuideOpen(true)}>
            <Icon name="book" size={16} />
            拼板、胶带法与熨烫教程
            <Icon name="arrowLeft" size={14} className="cta-arrow" />
          </button>
        </section>

        <footer className="home-foot">
          <div className="foot-mark">
            <LogoMark size={26} />
            <div>
              <b>豆屿</b>
              <span>BEAD ISLE · 一颗一颗，熨成一座岛</span>
            </div>
          </div>
          <p>本机运行的拼豆工作室 · 作品和数据都存在这台电脑上</p>
        </footer>
      </main>

      <Modal
        open={confirmNew}
        onClose={() => setConfirmNew(false)}
        className="confirm-modal"
        label="新建板子"
      >
        <ModalClose onClick={() => setConfirmNew(false)} />
        <div className="confirm-icon">
          <Icon name="board" size={26} />
        </div>
        <h2>铺一块新板？</h2>
        <p>
          当前工位上的 <b>{beads}</b> 颗豆和 <b>{project.pieces.length}</b> 块零件会从工作台清空。
          已经发布到集市的作品不受影响。
        </p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={() => setConfirmNew(false)}>
            先留着
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              newProject();
              setConfirmNew(false);
              setView('studio');
            }}
          >
            <Icon name="plus" size={16} /> 铺一块新的
          </button>
        </div>
      </Modal>

      <PatternStudio
        open={patternOpen}
        onClose={() => setPatternOpen(false)}
        onImported={() => {
          setPatternOpen(false);
          setView('studio');
        }}
      />
      <CraftGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
