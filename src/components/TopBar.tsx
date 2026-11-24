import React, { useState } from 'react';
import { useStudio } from '../store';
import { useApp } from '../appStore';
import { Icon, LogoMark } from './Icon';
import { Modal, ModalClose } from './Modal';
import { guideProgress } from '../lib/scene';

function saveLabel(savedAt: number | null, updatedAt: number) {
  if (!savedAt) return '本机草稿';
  if (updatedAt > savedAt + 500) return '保存中…';
  const d = new Date(savedAt);
  return `已保存 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TopBar({
  onPublish,
  onPattern,
  onReport,
  onGuide,
}: {
  onPublish: () => void;
  onPattern: () => void;
  onReport: () => void;
  onGuide: () => void;
}) {
  const title = useStudio((s) => s.project.title);
  const setTitle = useStudio((s) => s.setTitle);
  const mode = useStudio((s) => s.mode);
  const setMode = useStudio((s) => s.setMode);
  const enterAssembly = useStudio((s) => s.enterAssembly);
  const toast = useApp((s) => s.toast);
  const project = useStudio((s) => s.project);
  const savedAt = useStudio((s) => s.savedAt);
  const user = useApp((s) => s.user);
  const setView = useApp((s) => s.setView);
  const [help, setHelp] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  const progress = project.guide
    ? guideProgress(project.guide, project.loose, project.pieces)
    : null;

  const switchMode = (next: 'board' | 'assembly') => {
    if (next === 'assembly') {
      const res = enterAssembly();
      if (res.ironed) {
        toast('success', `先把散豆熨成了 ${res.ironed} 块零件`, '现在可以把它们立起来了');
      }
    } else {
      setMode('board');
    }
  };

  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')} title="回到首页">
          <LogoMark size={32} />
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

        <div className="title-block">
          <input
            className="title-input"
            value={titleDraft ?? title}
            maxLength={30}
            spellCheck={false}
            onChange={(e) => {
              setTitleDraft(e.target.value);
              setTitle(e.target.value);
            }}
            onBlur={() => setTitleDraft(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            aria-label="作品名"
          />
          <span className="save-state">
            <span className="save-dot" />
            {saveLabel(savedAt, project.updatedAt)}
          </span>
        </div>

        {progress && progress.total > 0 && (
          <div className="guide-chip" title="对照原作图纸的完成度">
            <span className="guide-chip-dot" />
            复刻 {Math.round(progress.ratio * 100)}%
            <span className="guide-chip-sub">对照图纸</span>
          </div>
        )}

        <div className="mode-switch" role="tablist" aria-label="视图">
          <button
            className={mode === 'board' ? 'active' : ''}
            onClick={() => switchMode('board')}
            role="tab"
            aria-selected={mode === 'board'}
            title="拼豆板"
          >
            <Icon name="board" size={16} />
            <span className="mode-label">拼豆板</span>
          </button>
          <button
            className={mode === 'assembly' ? 'active' : ''}
            onClick={() => switchMode('assembly')}
            role="tab"
            aria-selected={mode === 'assembly'}
            title="立体拼装"
          >
            <Icon name="cube" size={16} />
            <span className="mode-label">立体拼装</span>
          </button>
        </div>

        <div className="topbar-right">
          <button className="icon-btn" onClick={onPattern} title="照片转图纸">
            <Icon name="image" size={19} />
          </button>
          <button className="icon-btn" onClick={onReport} title="图纸与色号">
            <Icon name="grid" size={19} />
          </button>
          <button className="icon-btn" onClick={onGuide} title="拼板与熨烫教程">
            <Icon name="book" size={19} />
          </button>
          <button className="icon-btn help-btn" onClick={() => setHelp(true)} title="怎么玩">
            <Icon name="info" size={19} />
          </button>
          <div className="points-pill" title="发布作品 +50 · 作品被喜欢 +2">
            <Icon name="coin" size={16} />
            <b>{user?.points ?? 0}</b>
            <span>豆币</span>
          </div>
          <button className="btn btn-ghost" onClick={() => setView('gallery')}>
            <Icon name="gallery" size={17} />
            <span className="btn-label">集市</span>
          </button>
          <button className="btn btn-primary" onClick={onPublish}>
            <Icon name="camera" size={17} />
            <span className="btn-label">发布作品</span>
          </button>
        </div>
      </header>

      <Modal open={help} onClose={() => setHelp(false)} className="help-modal" label="怎么玩">
        <ModalClose onClick={() => setHelp(false)} />
        <div className="help-head">
          <span className="eyebrow">HOW TO PLAY</span>
          <h2>一颗一颗，熨成一座岛。</h2>
          <p>不用赶进度。想放几颗，就放几颗。</p>
        </div>
        <div className="help-steps">
          {[
            { n: '01', t: '放豆', d: '在无边板上逐颗放豆，拖拽可以连续铺。空格拖板、滚轮缩放、右键收豆。' },
            { n: '02', t: '熨烫', d: '按 Enter 或点「自动熨烫」，相连的散豆会熔成一块块独立零件。' },
            { n: '03', t: '立起来', d: '去立体拼装，拖动、旋转、叠放零件，把平面拼成一个小世界。' },
            { n: '04', t: '挂上集市', d: '拍下成品，定个豆币价格。别人解锁你的图纸后，可以逐颗复刻再改造。' },
          ].map((s) => (
            <div className="help-step" key={s.n}>
              <span className="help-num">{s.n}</span>
              <div>
                <b>{s.t}</b>
                <p>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="help-shortcuts">
          <span>
            <kbd>B</kbd> 放豆
          </span>
          <span>
            <kbd>E</kbd> 收豆
          </span>
          <span>
            <kbd>I</kbd> 吸色
          </span>
          <span>
            <kbd>M</kbd> 框选
          </span>
          <span>
            <kbd>H</kbd> 移动
          </span>
          <span>
            <kbd>Enter</kbd> 熨烫
          </span>
          <span>
            <kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销
          </span>
          <span>
            <kbd>Del</kbd> 清空选区
          </span>
        </div>
        <div className="help-foot">
          <button className="btn btn-primary" onClick={() => setHelp(false)}>
            开始放豆
          </button>
        </div>
      </Modal>
    </>
  );
}
