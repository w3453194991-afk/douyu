import React, { useEffect, useMemo, useState } from 'react';
import { useStudio } from '../store';
import { Icon } from './Icon';
import { contentBounds, beadKey } from '../lib/scene';

function timeText(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function RowBuild({ mini = false }: { mini?: boolean }) {
  const project = useStudio((s) => s.project);
  const focusRow = useStudio((s) => s.focusRow);
  const setFocusRow = useStudio((s) => s.setFocusRow);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const bounds = useMemo(() => contentBounds(project), [project]);
  const rows = bounds?.h || 0;
  const minY = bounds?.y || 0;
  const idx = focusRow == null ? 0 : Math.max(0, Math.min(rows - 1, focusRow - minY));
  const active = focusRow != null && rows > 0;

  const guideRows = useMemo(() => {
    const guide = project.guide;
    if (!guide) return null;
    const placed = new Set<string>();
    for (const b of project.loose) placed.add(beadKey(b.x, b.y));
    for (const p of project.pieces) {
      for (const b of p.beads) placed.add(beadKey(p.pos[0] + b.x, p.pos[1] + b.y));
    }
    const map = new Map<number, { total: number; matched: number }>();
    for (const p of guide.pieces) {
      for (const b of p.beads) {
        const y = p.pos[1] + b.y;
        const s = map.get(y) || { total: 0, matched: 0 };
        s.total++;
        if (placed.has(beadKey(p.pos[0] + b.x, y))) s.matched++;
        map.set(y, s);
      }
    }
    return map;
  }, [project]);

  const currentRow = guideRows?.get(focusRow ?? minY + idx);
  const currentDone = !!currentRow && currentRow.total > 0 && currentRow.matched === currentRow.total;

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const start = () => {
    if (!rows) return;
    setFocusRow(minY);
    setSeconds(0);
    setRunning(true);
  };

  const move = (delta: number) => {
    if (!rows) return;
    if (focusRow == null) {
      setFocusRow(minY);
      return;
    }
    if (delta > 0 && guideRows) {
      let next = idx + 1;
      while (next < rows) {
        const st = guideRows.get(minY + next);
        if (!st || st.matched < st.total) break;
        next++;
      }
      setFocusRow(minY + Math.max(0, Math.min(rows - 1, next)));
      return;
    }
    setFocusRow(minY + Math.max(0, Math.min(rows - 1, idx + delta)));
  };

  const stop = () => {
    setFocusRow(null);
    setRunning(false);
  };

  if (!rows) {
    return (
      <div className={`row-build ${mini ? 'mini-row-build' : ''}`}>
        <p className="row-build-empty">板上还没有豆子，先放几颗或导入一张图纸。</p>
      </div>
    );
  }

  return (
    <div className={`row-build ${mini ? 'mini-row-build' : ''} ${active ? 'active' : ''}`}>
      <div className="row-build-head">
        <div>
          <b>按行跟做</b>
          <span>
            {active ? `第 ${idx + 1} / ${rows} 行` : `${rows} 行 · 一行一行来`}
            {currentRow && (
              <em className={currentDone ? 'done' : ''}>
                {' '}
                · 本行 {currentRow.matched}/{currentRow.total}
                {currentDone ? ' ✓' : ''}
              </em>
            )}
          </span>
        </div>
        <span className="row-build-timer" title="制作计时">
          <Icon name="clock" size={13} />
          {timeText(seconds)}
        </span>
      </div>

      <div className="row-build-track">
        <span style={{ width: `${rows ? ((idx + 1) / rows) * 100 : 0}%` }} />
      </div>

      {active ? (
        <>
          <div className="row-build-nav">
            <button onClick={() => move(-1)} disabled={idx <= 0}>
              <Icon name="arrowLeft" size={14} /> 上一行
            </button>
            <button onClick={() => move(1)} disabled={idx >= rows - 1}>
              下一行 <Icon name="arrowLeft" size={14} className="cta-arrow" />
            </button>
          </div>
          <div className="row-build-actions">
            <button className={`row-timer-btn ${running ? 'on' : ''}`} onClick={() => setRunning((v) => !v)}>
              <Icon name={running ? 'pause' : 'play'} size={14} />
              {running ? '暂停' : seconds ? '继续' : '计时'}
            </button>
            <button
              className="row-timer-reset"
              onClick={() => {
                setSeconds(0);
                setRunning(false);
              }}
            >
              归零
            </button>
            <button className="row-exit" onClick={stop}>
              退出跟做
            </button>
          </div>
        </>
      ) : (
        <button className="row-start" onClick={start}>
          <Icon name="play" size={15} /> 从第一行开始
        </button>
      )}
    </div>
  );
}
