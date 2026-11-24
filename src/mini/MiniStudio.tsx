import React, { useState } from 'react';
import { useStudio } from '../store';
import { useApp } from '../appStore';
import { Icon, type IconName } from '../components/Icon';
import { BoardView } from '../components/BoardView';
import { AssemblyView } from '../components/AssemblyView';
import { MiniNav, MiniSheet, MiniPieceThumb } from './ui';
import { RowBuild } from '../components/RowBuild';
import { PALETTE, colorInfo } from '../../shared/palette.mjs';
import { BRANDS } from '../../shared/brands.mjs';
import { beadCode } from '../lib/beadCode';
import { guideProgress, pieceBounds } from '../lib/scene';
import type { Tool } from '../types';

const TOOLS: Array<{ id: Tool; label: string; icon: IconName }> = [
  { id: 'bead', label: '放豆', icon: 'bead' },
  { id: 'erase', label: '收豆', icon: 'eraser' },
  { id: 'pick', label: '吸色', icon: 'pick' },
  { id: 'select', label: '框选', icon: 'select' },
  { id: 'pan', label: '移板', icon: 'hand' },
];

const BRAND_COLORS = Object.values(BRANDS).flatMap((b: any) =>
  b.colors.map((c: any) => ({ ...c, brand: b.id, brandLabel: b.label })),
);

type Sheet = 'color' | 'pieces' | 'guide' | 'menu' | 'confirm' | 'row' | null;

export function MiniStudio({
  onBack,
  onOpenGallery,
  onPublish,
  onWeb,
  onPattern,
  onReport,
  onGuide,
  onInventory,
}: {
  onBack: () => void;
  onOpenGallery: () => void;
  onPublish: (image: string) => void;
  onWeb: () => void;
  onPattern: () => void;
  onReport: () => void;
  onGuide: () => void;
  onInventory: () => void;
}) {
  const project = useStudio((s) => s.project);
  const mode = useStudio((s) => s.mode);
  const tool = useStudio((s) => s.tool);
  const color = useStudio((s) => s.color);
  const brush = useStudio((s) => s.brush);
  const setColor = useStudio((s) => s.setColor);
  const setBrush = useStudio((s) => s.setBrush);
  const setTool = useStudio((s) => s.setTool);
  const setMode = useStudio((s) => s.setMode);
  const enterAssembly = useStudio((s) => s.enterAssembly);
  const ironAll = useStudio((s) => s.ironAll);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const past = useStudio((s) => s.past.length);
  const future = useStudio((s) => s.future.length);
  const selectedPieceId = useStudio((s) => s.selectedPieceId);
  const selectPiece = useStudio((s) => s.selectPiece);
  const focusPiece = useStudio((s) => s.focusPiece);
  const splitPiece = useStudio((s) => s.splitPiece);
  const deletePiece = useStudio((s) => s.deletePiece);
  const newProject = useStudio((s) => s.newProject);
  const showGuide = useStudio((s) => s.showGuide);
  const setShowGuide = useStudio((s) => s.setShowGuide);
  const showBoards = useStudio((s) => s.showBoards);
  const setShowBoards = useStudio((s) => s.setShowBoards);
  const showCodes = useStudio((s) => s.showCodes);
  const setShowCodes = useStudio((s) => s.setShowCodes);
  const toast = useApp((s) => s.toast);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [colorQuery, setColorQuery] = useState('');

  const loose = project.loose.length;
  const pieces = project.pieces;
  const info = colorInfo(color);
  const currentCode = beadCode(color);
  const cq = colorQuery.trim().toLowerCase();
  const colorResults = cq
    ? [...PALETTE.map((c) => ({ ...c, brand: 'douyu', brandLabel: '豆屿' })), ...BRAND_COLORS]
        .filter(
          (c: any) =>
            c.code.toLowerCase().includes(cq) ||
            String(c.name).toLowerCase().includes(cq) ||
            c.hex.toLowerCase().includes(cq) ||
            c.brandLabel.toLowerCase().includes(cq),
        )
        .slice(0, 80)
    : PALETTE.map((c) => ({ ...c, brand: 'douyu', brandLabel: '豆屿' }));
  const progress = project.guide
    ? guideProgress(project.guide, project.loose, project.pieces)
    : null;
  const pct = progress ? Math.round(progress.ratio * 100) : 0;
  const hasContent = loose > 0 || pieces.length > 0 || !!project.guide;

  const iron = () => {
    const n = ironAll();
    if (n) toast('success', `滋啦——熨出了 ${n} 块零件`, '去「立体」把它们立起来');
    else toast('info', '板上还没有散豆', '先放几颗再熨');
  };

  const toggle3d = () => {
    if (mode === 'board') {
      if (!loose && !pieces.length) {
        toast('info', '先放几颗豆', '有零件才能去立体拼装');
        return;
      }
      const res = enterAssembly();
      if (res.ironed) {
        toast('success', `熨出 ${res.ironed} 块零件`, '拖动圆环把它们摆起来');
      }
      setSheet(null);
    } else {
      setMode('board');
    }
  };

  const startNew = () => {
    if (hasContent) setSheet('confirm');
    else {
      newProject();
      setSheet(null);
      toast('success', '新板子铺好了', '无限大，随便放');
    }
  };

  return (
    <div className="mini-studio">
      <MiniNav
        title={project.title || '无题小岛'}
        subtitle={
          pieces.length
            ? `${pieces.length} 块零件`
            : loose
              ? `${loose} 颗散豆`
              : '空白板'
        }
        onBack={onBack}
        right={
          <>
            {mode === 'assembly' && (
              <button className="mini-nav-btn" onClick={() => setMode('board')} title="回到拼豆板">
                <Icon name="board" size={18} />
              </button>
            )}
            <button className="mini-nav-btn" onClick={() => setSheet('menu')} title="更多">
              <Icon name="menu" size={18} />
            </button>
          </>
        }
      />

      {mode === 'board' ? (
        <>
          <div className="mini-board-area">
            <BoardView
              onEmptyAction={(action) => {
                if (action === 'gallery') onOpenGallery();
                else {
                  setTool('bead');
                  toast('info', '找一个空位，点一下', '拖动可以连续铺豆');
                }
              }}
            />
            {project.guide && (
              <button className="mini-guide-chip" onClick={() => setSheet('guide')}>
                <Icon name="layers" size={11} />
                复刻 {pct}%
              </button>
            )}
          </div>

          <div className="mini-editor">
            <div className="mini-editor-float">
              <button className="mini-button primary mini-iron" onClick={iron} disabled={!loose}>
                <Icon name="iron" size={16} />
                熨烫
                <b>{loose}</b>
              </button>
              <button className="mini-pieces-chip" onClick={() => setSheet('pieces')}>
                <Icon name="layers" size={13} />
                零件 <b>{pieces.length}</b>
              </button>
              <div className="mini-history">
                <button onClick={undo} disabled={!past} aria-label="撤销">
                  <Icon name="undo" size={16} />
                </button>
                <button onClick={redo} disabled={!future} aria-label="重做">
                  <Icon name="redo" size={16} />
                </button>
              </div>
            </div>

            <div className="mini-dock">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  className={`mini-tool ${tool === t.id ? 'on' : ''}`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                  aria-label={t.label}
                >
                  <Icon name={t.icon} size={19} />
                </button>
              ))}
              <button
                className="mini-swatch"
                style={{ background: color }}
                onClick={() => setSheet('color')}
                aria-label="打开色卡"
              />
              <button className="mini-dock-three" onClick={toggle3d} title="立体拼装">
                <Icon name="cube" size={15} />
                3D
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="mini-assembly-area">
          <AssemblyView onPublish={onPublish} />
        </div>
      )}

      <MiniSheet open={sheet === 'color'} title="色卡" onClose={() => setSheet(null)}>
        <div className="mini-color-current">
          <span className="mini-color-big" style={{ background: color }} />
          <div>
            <b>{currentCode.name || info.name}</b>
            <span>
              {currentCode.approx ? '≈' : ''}
              {currentCode.code} · 36 色 + 全品牌
            </span>
          </div>
        </div>
        <div className="mini-color-tools">
          <label className="mini-color-search">
            <input
              value={colorQuery}
              onChange={(e) => setColorQuery(e.target.value)}
              placeholder="搜编号：P05 / H02 / S01"
              aria-label="搜索豆子编号"
            />
            {colorQuery && <button onClick={() => setColorQuery('')}>×</button>}
          </label>
          <button
            className={`mini-code-toggle ${showCodes ? 'on' : ''}`}
            onClick={() => setShowCodes(!showCodes)}
          >
            编号{showCodes ? '开' : '关'}
          </button>
        </div>
        <div className="mini-color-grid">
          {colorResults.map((c: any) => (
            <button
              key={`${c.brand}-${c.code}-${c.hex}`}
              className={`mini-color ${c.hex.toLowerCase() === color.toLowerCase() ? 'on' : ''}`}
              style={{ background: c.hex }}
              title={`${c.brandLabel} · ${c.code} ${c.name}`}
              onClick={() => setColor(c.hex)}
            >
              <em>{c.code}</em>
            </button>
          ))}
          {!colorResults.length && <span className="mini-color-none">没找到这个编号</span>}
        </div>
        {cq && colorResults.length > 0 && (
          <p className="mini-color-note">找到 {colorResults.length} 色，编号会显示在豆子上</p>
        )}
        <div className="mini-brush">
          <span>笔刷大小</span>
          <div className="mini-brush-group">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={brush === n ? 'on' : ''}
                onClick={() => setBrush(n)}
              >
                {n}×{n}
              </button>
            ))}
          </div>
        </div>
        <button
          className="mini-button primary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => setSheet(null)}
        >
          完成
        </button>
      </MiniSheet>

      <MiniSheet open={sheet === 'pieces'} title={`零件架 · ${pieces.length}`} onClose={() => setSheet(null)}>
        <div className="mini-piece-tools">
          <button className="mini-button small ghost" onClick={iron} disabled={!loose}>
            <Icon name="iron" size={14} /> 熨烫 {loose} 颗
          </button>
          <button className="mini-button small primary" onClick={toggle3d}>
            <Icon name="cube" size={14} /> 立体拼装
          </button>
        </div>

        {progress && (
          <div className="mini-guide-summary">
            <div className="mini-guide-summary-head">
              <b>复刻《{project.guide!.title}》</b>
              <span>{pct}%</span>
            </div>
            <div className="mini-guide-bar">
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {pieces.length === 0 ? (
          <div className="mini-empty" style={{ padding: '24px 10px' }}>
            <span className="mini-empty-icon">
              <Icon name="iron" size={22} />
            </span>
            <b>还没有熨好的零件</b>
            <p>放几颗豆，按「熨烫」，相连的豆子就会熔成一块。</p>
          </div>
        ) : (
          <div>
            {pieces.map((p) => {
              const bb = pieceBounds(p.beads);
              return (
                <div
                  key={p.id}
                  className={`mini-piece-row ${selectedPieceId === p.id ? 'on' : ''}`}
                  onClick={() => selectPiece(p.id)}
                >
                  <MiniPieceThumb piece={p} />
                  <div className="mini-piece-meta">
                    <b>{p.name}</b>
                    <span>
                      {p.beads.length} 颗 · {bb.w}×{bb.h}
                    </span>
                  </div>
                  <div className="mini-piece-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        focusPiece(p.id);
                        setSheet(null);
                        setMode('board');
                      }}
                      aria-label="定位"
                    >
                      <Icon name="locate" size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        splitPiece(p.id);
                        toast('info', '拆开了', '又变回散豆');
                      }}
                      aria-label="拆开"
                    >
                      <Icon name="split" size={13} />
                    </button>
                    <button
                      className="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePiece(p.id);
                        toast('info', '拿走了零件', '可以撤销');
                      }}
                      aria-label="删除"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </MiniSheet>

      <MiniSheet open={sheet === 'guide'} title="复刻图纸" onClose={() => setSheet(null)}>
        {project.guide ? (
          <>
            <div className="mini-guide-summary" style={{ marginBottom: 10 }}>
              <div className="mini-guide-summary-head">
                <b>《{project.guide.title}》</b>
                <span>{pct}%</span>
              </div>
              <div className="mini-guide-bar">
                <i style={{ width: `${pct}%` }} />
              </div>
              <div className="mini-guide-list">
                {project.guide.pieces.map((p) => {
                  const st = progress?.perPiece.get(p.id);
                  return (
                    <div key={p.id}>
                      <span>{p.name}</span>
                      <span>
                        {st?.matched ?? 0}/{st?.total ?? p.beads.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mini-piece-tools">
              <button className="mini-button small ghost" onClick={() => setShowGuide(!showGuide)}>
                <Icon name={showGuide ? 'eyeOff' : 'eye'} size={14} />
                {showGuide ? '隐藏蓝图' : '显示蓝图'}
              </button>
              {pct >= 100 ? (
                <button className="mini-button small primary" onClick={toggle3d}>
                  <Icon name="sparkle" size={14} />
                  {loose ? '熨烫并立起来' : '去立体拼装'}
                </button>
              ) : (
                <button className="mini-button small ghost" onClick={() => setSheet(null)}>
                  继续放豆
                </button>
              )}
            </div>
            <p style={{ fontSize: 9, color: 'var(--ink-3)', lineHeight: 1.6, marginTop: 9 }}>
              板上的淡影就是原作。照着放，也可以换色——改出你自己的版本。
            </p>
          </>
        ) : (
          <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>这块板还没有图纸。去集市解锁一张吧。</p>
        )}
      </MiniSheet>

      <MiniSheet open={sheet === 'menu'} title="工位" onClose={() => setSheet(null)}>
        <div className="mini-sheet-actions">
          <button className="mini-sheet-action" onClick={startNew}>
            <Icon name="plus" size={17} />
            新开一块板
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setSheet(null);
              onPattern();
            }}
          >
            <Icon name="image" size={17} />
            照片转图纸
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setSheet(null);
              onReport();
            }}
          >
            <Icon name="grid" size={17} />
            图纸 / 色号清单
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setSheet(null);
              onInventory();
            }}
          >
            <Icon name="coin" size={17} />
            豆仓 / 缺色替代
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setShowBoards(!showBoards);
              toast('info', showBoards ? '拼板线关掉了' : '29×29 拼板线打开了', '按实物拼板分区');
            }}
          >
            <Icon name="board" size={17} />
            {showBoards ? '隐藏 29×29 拼板线' : '显示 29×29 拼板线'}
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setSheet(null);
              onGuide();
            }}
          >
            <Icon name="book" size={17} />
            拼板与熨烫教程
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setSheet('row');
            }}
          >
            <Icon name="clock" size={17} />
            按行跟做 · 计时
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setSheet('pieces');
            }}
          >
            <Icon name="layers" size={17} />
            零件架 · {pieces.length} 块
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setSheet('color');
            }}
          >
            <Icon name="bead" size={17} />
            色卡 · 当前 {info.name}
          </button>
          {project.guide && (
            <button className="mini-sheet-action" onClick={() => setSheet('guide')}>
              <Icon name="layers" size={17} />
              复刻进度 · {pct}%
            </button>
          )}
          <button className="mini-sheet-action" onClick={toggle3d}>
            <Icon name="cube" size={17} />
            {mode === 'board' ? '去立体拼装' : '回拼豆板'}
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setSheet(null);
              onBack();
            }}
          >
            <Icon name="home" size={17} />
            回到首页
          </button>
          <button
            className="mini-sheet-action"
            onClick={() => {
              setSheet(null);
              onWeb();
            }}
          >
            <Icon name="phone" size={17} />
            打开桌面版
          </button>
        </div>
      </MiniSheet>

      <MiniSheet open={sheet === 'row'} title="逐行跟做" onClose={() => setSheet(null)}>
        <RowBuild mini />
        <p style={{ fontSize: 9, lineHeight: 1.65, color: 'var(--ink-3)', marginTop: 10 }}>
          板上会只亮当前一行，其他行压暗；跟着亮条放豆，放完点「下一行」。计时只在本机，不会上传。
        </p>
      </MiniSheet>

      <MiniSheet open={sheet === 'confirm'} title="铺一块新板？" onClose={() => setSheet(null)}>
        <p style={{ fontSize: 11, lineHeight: 1.75, color: 'var(--ink-2)' }}>
          当前工位上的 <b>{loose}</b> 颗豆和 <b>{pieces.length}</b> 块零件会清空。
          已经发布到集市的作品不受影响。
        </p>
        <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
          <button className="mini-button ghost" style={{ flex: 1 }} onClick={() => setSheet(null)}>
            先留着
          </button>
          <button
            className="mini-button primary"
            style={{ flex: 1 }}
            onClick={() => {
              newProject();
              setSheet(null);
              toast('success', '新板子铺好了', '无限大，随便放');
            }}
          >
            铺一块新的
          </button>
        </div>
      </MiniSheet>
    </div>
  );
}
