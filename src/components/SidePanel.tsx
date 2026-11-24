import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStudio } from '../store';
import { useApp } from '../appStore';
import { drawPieceThumb } from '../lib/render';
import { contentBounds, guideProgress, pieceBounds, totalBeads } from '../lib/scene';
import { cmText, formatMinutes, projectMetrics } from '../lib/metrics';
import { Icon } from './Icon';
import { RowBuild } from './RowBuild';
import type { Piece } from '../types';

function PieceThumb({ piece }: { piece: Piece }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawPieceThumb(ref.current, piece, { padding: 5 });
  }, [piece]);
  return <canvas ref={ref} className="piece-thumb" aria-hidden="true" />;
}

function PieceRow({
  piece,
  selected,
  mode,
}: {
  piece: Piece;
  selected: boolean;
  mode: 'board' | 'assembly';
}) {
  const selectPiece = useStudio((s) => s.selectPiece);
  const focusPiece = useStudio((s) => s.focusPiece);
  const splitPiece = useStudio((s) => s.splitPiece);
  const deletePiece = useStudio((s) => s.deletePiece);
  const renamePiece = useStudio((s) => s.renamePiece);
  const setMode = useStudio((s) => s.setMode);
  const toast = useApp((s) => s.toast);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(piece.name);
  const bb = pieceBounds(piece.beads);

  const locate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'assembly') {
      selectPiece(piece.id);
      focusPiece(piece.id);
      setMode('board');
    } else {
      focusPiece(piece.id);
    }
  };

  return (
    <div
      className={`piece-row ${selected ? 'selected' : ''}`}
      onClick={() => selectPiece(piece.id)}
      onDoubleClick={() => {
        setDraft(piece.name);
        setEditing(true);
      }}
    >
      <PieceThumb piece={piece} />
      <div className="piece-meta">
        {editing ? (
          <input
            className="piece-name-input"
            value={draft}
            autoFocus
            maxLength={20}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              renamePiece(piece.id, draft);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                renamePiece(piece.id, draft);
                setEditing(false);
              }
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <span className="piece-name" title="双击改名">
            {piece.name}
          </span>
        )}
        <span className="piece-sub">
          {piece.beads.length} 颗 · {bb.w}×{bb.h}
        </span>
      </div>
      <div className="piece-actions">
        <button
          className="mini-btn"
          title={mode === 'assembly' ? '回到板上定位' : '定位'}
          onClick={locate}
        >
          <Icon name="locate" size={15} />
        </button>
        <button
          className="mini-btn"
          title="拆回散豆"
          onClick={(e) => {
            e.stopPropagation();
            splitPiece(piece.id);
            toast('info', '拆开了', `「${piece.name}」又变回 ${piece.beads.length} 颗散豆`);
          }}
        >
          <Icon name="split" size={15} />
        </button>
        <button
          className="mini-btn danger"
          title="删除零件"
          onClick={(e) => {
            e.stopPropagation();
            deletePiece(piece.id);
            toast('info', '拿走了零件', '撤销可以找回来');
          }}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  );
}

function GuideBox() {
  const project = useStudio((s) => s.project);
  const showGuide = useStudio((s) => s.showGuide);
  const setShowGuide = useStudio((s) => s.setShowGuide);
  const setMode = useStudio((s) => s.setMode);
  const enterAssembly = useStudio((s) => s.enterAssembly);
  const toast = useApp((s) => s.toast);
  const guide = project.guide!;
  const progress = useMemo(
    () => guideProgress(guide, project.loose, project.pieces),
    [guide, project.loose, project.pieces],
  );
  const pct = Math.round(progress.ratio * 100);

  return (
    <section className="panel-card guide-card">
      <div className="panel-head">
        <div className="panel-title">
          <span className="panel-icon mint">
            <Icon name="layers" size={15} />
          </span>
          <div>
            <h3>复刻图纸</h3>
            <p>
              《{guide.title}》· @{guide.author}
            </p>
          </div>
        </div>
        <button
          className="icon-btn"
          title={showGuide ? '隐藏图纸' : '显示图纸'}
          onClick={() => setShowGuide(!showGuide)}
        >
          <Icon name={showGuide ? 'eye' : 'eyeOff'} size={17} />
        </button>
      </div>

      <div className={`guide-progress ${pct >= 100 ? 'done' : ''}`}>
        <div className="guide-bar">
          <span style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="guide-bar-label">
          <b>{pct}%</b>
          <span>
            {progress.matched} / {progress.total} 颗已摆
            {progress.colorMatched < progress.matched && (
              <> · 原色 {Math.round(progress.colorRatio * 100)}%</>
            )}
          </span>
        </div>
      </div>

      <div className="guide-pieces">
        {guide.pieces.map((p) => {
          const st = progress.perPiece.get(p.id);
          const done = st?.done;
          return (
            <div className={`guide-piece ${done ? 'done' : ''}`} key={p.id}>
              <span className="guide-check">
                {done ? <Icon name="check" size={11} /> : <span className="guide-check-dot" />}
              </span>
              <span className="guide-piece-name">{p.name}</span>
              <span className="guide-piece-count">
                {st?.matched ?? 0}/{st?.total ?? p.beads.length}
              </span>
            </div>
          );
        })}
      </div>

      {pct >= 100 ? (
        <button
          className="btn btn-primary btn-block btn-sm"
          onClick={() => {
            if (project.loose.length) {
              const res = enterAssembly();
              if (res.ironed) {
                toast('success', `图纸摆满了，熨出 ${res.ironed} 块零件`, '现在把它们立起来');
              }
            } else {
              setMode('assembly');
            }
          }}
        >
          <Icon name="sparkle" size={16} />
          {project.loose.length ? '熨烫并立起来' : '去立体拼装'}
        </button>
      ) : (
        <p className="guide-hint">
          板上的淡影就是原作。照着放，也可以换色——改出你自己的版本。
        </p>
      )}
    </section>
  );
}

export function SidePanel({
  onNewBoard,
  onPattern,
  onReport,
  onGuide,
  onInventory,
  className = '',
  onClose,
}: {
  onNewBoard: () => void;
  onPattern: () => void;
  onReport: () => void;
  onGuide: () => void;
  onInventory: () => void;
  className?: string;
  onClose?: () => void;
}) {
  const project = useStudio((s) => s.project);
  const mode = useStudio((s) => s.mode);
  const loose = project.loose.length;
  const pieces = project.pieces;
  const selectedPieceId = useStudio((s) => s.selectedPieceId);
  const ironAll = useStudio((s) => s.ironAll);
  const focusContent = useStudio((s) => s.focusContent);
  const setMode = useStudio((s) => s.setMode);
  const toast = useApp((s) => s.toast);
  const bounds = useMemo(() => contentBounds(project), [project]);
  const total = totalBeads(project);
  const metrics = useMemo(() => projectMetrics(project), [project]);

  const iron = () => {
    const n = ironAll();
    if (!n) return;
    toast('success', `滋啦——熨出了 ${n} 块零件`, '去「立体拼装」把它们立起来');
  };

  return (
    <aside className={`side-panel ${className}`}>
      <div className="mobile-panel-head">
        <span>工作台</span>
        <button className="mobile-panel-close" onClick={onClose} aria-label="收起">
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="panel-scroll">
        {project.guide && <GuideBox />}

        {mode === 'board' ? (
          <section className="iron-card">
            <div className="iron-copy">
              <span className="iron-badge">
                <Icon name="iron" size={18} />
              </span>
              <div>
                <h3>熨斗</h3>
                <p>相连的散豆会自动熔成一块</p>
              </div>
            </div>
            <button className={`iron-btn ${loose ? '' : 'off'}`} onClick={iron} disabled={!loose}>
              <span className="iron-main">{loose ? `自动熨烫` : '先放几颗豆'}</span>
              <span className="iron-sub">
                {loose ? `${loose} 颗散豆待熨` : '放豆后再来按一下'}
              </span>
              <span className="iron-key">Enter</span>
            </button>
            <p className="iron-tip">会按连通块自动分成多块零件 · 也可框选局部熨烫</p>
          </section>
        ) : (
          <section className="panel-card assembly-tip">
            <div className="panel-title">
              <span className="panel-icon coral">
                <Icon name="cube" size={15} />
              </span>
              <div>
                <h3>立体拼装台</h3>
                <p>拖动圆环移动，切换旋转</p>
              </div>
            </div>
            <ul>
              <li>
                <kbd>G</kbd> 移动 · <kbd>R</kbd> 旋转
              </li>
              <li>按住圆环轴拖动，滚轮缩放视角</li>
              <li>用「立起」把平躺的零件站到桌面上</li>
            </ul>
            <button className="btn btn-ghost btn-block" onClick={() => setMode('board')}>
              <Icon name="board" size={16} /> 回拼豆板继续放
            </button>
          </section>
        )}

        <section className="panel-card pieces-card">
          <div className="panel-head">
            <div className="panel-title">
              <span className="panel-icon gold">
                <Icon name="layers" size={15} />
              </span>
              <div>
                <h3>
                  零件架 <em>{pieces.length}</em>
                </h3>
                <p>双击名字可以改名</p>
              </div>
            </div>
            {pieces.length > 0 && (
              <button className="icon-btn" title="在板上定位全部" onClick={focusContent}>
                <Icon name="fit" size={16} />
              </button>
            )}
          </div>

          {pieces.length === 0 ? (
            <div className="pieces-empty">
              <span className="pieces-empty-icon">
                <Icon name="iron" size={22} />
              </span>
              <p>熨好的零件会排在这里</p>
              <span>每块都能单独拿起来</span>
            </div>
          ) : (
            <div className="piece-list">
              {pieces.map((p) => (
                <PieceRow key={p.id} piece={p} selected={p.id === selectedPieceId} mode={mode} />
              ))}
            </div>
          )}
        </section>

        <section className="panel-card pattern-card">
          <div className="panel-head">
            <div className="panel-title">
              <span className="panel-icon coral">
                <Icon name="image" size={15} />
              </span>
              <div>
                <h3>图纸与备料</h3>
                <p>色号、用量、分板</p>
              </div>
            </div>
            <button className="icon-btn" title="打开图纸与色号" onClick={onReport}>
              <Icon name="grid" size={16} />
            </button>
          </div>

          <div className="pattern-card-metrics">
            <div>
              <b>{metrics.beads}</b>
              <span>{metrics.colors} 色</span>
            </div>
            <div>
              <b>
                {metrics.width ? `${cmText(metrics.cmW)}×${cmText(metrics.cmH)}` : '—'}
              </b>
              <span>cm · 5mm</span>
            </div>
            <div>
              <b>{metrics.boards || '—'}</b>
              <span>块 29×29</span>
            </div>
          </div>

          <div className="pattern-card-colors">
            {metrics.colorStats.slice(0, 10).map((c) => (
              <span key={c.hex} title={`${c.code} ${c.name} · ${c.count} 颗`}>
                <i style={{ background: c.hex }} />
                <em>{c.count}</em>
              </span>
            ))}
            {metrics.colors > 10 && <b className="pattern-card-more">+{metrics.colors - 10}</b>}
            {metrics.colors === 0 && <span className="pattern-card-empty">还没有豆子</span>}
          </div>

          <p className="pattern-card-note">
            {metrics.beads
              ? `${formatMinutes(metrics.minutes)} · ${metrics.difficulty} · 按 1000 颗/包多备 10%`
              : '先放豆，或者用照片生成一张图纸。'}
          </p>

          <div className="pattern-card-actions">
            <button className="btn btn-primary btn-sm" onClick={onPattern}>
              <Icon name="image" size={14} /> 照片转图纸
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onReport}
              disabled={!metrics.beads}
            >
              <Icon name="grid" size={14} /> 图纸 / 色号
            </button>
          </div>
          <button className="pattern-card-guide" onClick={onInventory}>
            <Icon name="coin" size={14} />
            豆仓 / 缺色替代
            <Icon name="arrowLeft" size={13} className="cta-arrow" />
          </button>
          <button className="pattern-card-guide" onClick={onGuide}>
            <Icon name="book" size={14} />
            拼板与熨烫教程
            <Icon name="arrowLeft" size={13} className="cta-arrow" />
          </button>
        </section>

        <section className="panel-card row-build-card">
          <RowBuild />
        </section>

        <section className="board-stats">
          <div>
            <b>{total}</b>
            <span>颗豆</span>
          </div>
          <div>
            <b>{pieces.length}</b>
            <span>块零件</span>
          </div>
          <div>
            <b>{bounds ? `${bounds.w}×${bounds.h}` : '—'}</b>
            <span>板面范围</span>
          </div>
        </section>

        <section className="studio-note">
          <div className="note-beads" aria-hidden="true">
            <span style={{ background: '#F5C24F' }} />
            <span style={{ background: '#8ECFBB' }} />
            <span style={{ background: '#E0582F' }} />
          </div>
          <div>
            <span className="note-eyebrow">岛民提示</span>
            <p>发布一件成品能赚 50 豆币。解锁别人的图纸要花豆币，但改完就是你的版本。</p>
          </div>
        </section>
      </div>

      <footer className="panel-footer">
        <span className="save-note">
          <Icon name="check" size={13} /> 自动保存在本机
        </span>
        <button className="text-btn" onClick={onNewBoard}>
          <Icon name="plus" size={14} /> 新建一块板
        </button>
      </footer>
    </aside>
  );
}
