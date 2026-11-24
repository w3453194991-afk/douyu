import React from 'react';
import { useStudio } from '../store';
import { Icon, type IconName } from './Icon';
import type { Tool } from '../types';

const TOOLS: Array<{ id: Tool; label: string; key: string; icon: IconName }> = [
  { id: 'bead', label: '放豆', key: 'B', icon: 'bead' },
  { id: 'erase', label: '收豆', key: 'E', icon: 'eraser' },
  { id: 'pick', label: '吸色', key: 'I', icon: 'pick' },
  { id: 'select', label: '框选', key: 'M', icon: 'select' },
  { id: 'pan', label: '移板', key: 'H', icon: 'hand' },
];

export function ToolRail() {
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
  const brush = useStudio((s) => s.brush);
  const setBrush = useStudio((s) => s.setBrush);
  const past = useStudio((s) => s.past.length);
  const future = useStudio((s) => s.future.length);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);

  return (
    <div className="tool-rail">
      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'on' : ''}`}
            onClick={() => setTool(t.id)}
            data-tip={`${t.label} · ${t.key}`}
            aria-label={t.label}
            aria-pressed={tool === t.id}
          >
            <Icon name={t.icon} size={21} />
          </button>
        ))}
      </div>

      {(tool === 'bead' || tool === 'erase') && (
        <>
          <div className="tool-divider" />
          <div className="brush-group" title="笔刷大小">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`brush-btn ${brush === n ? 'on' : ''}`}
                onClick={() => setBrush(n)}
                aria-label={`${n} 格笔刷`}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="tool-divider" />
      <div className="tool-group">
        <button
          className="tool-btn"
          onClick={undo}
          disabled={!past}
          data-tip="撤销 · Ctrl+Z"
          aria-label="撤销"
        >
          <Icon name="undo" size={20} />
        </button>
        <button
          className="tool-btn"
          onClick={redo}
          disabled={!future}
          data-tip="重做 · Ctrl+Shift+Z"
          aria-label="重做"
        >
          <Icon name="redo" size={20} />
        </button>
      </div>
    </div>
  );
}
