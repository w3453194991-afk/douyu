import React, { useMemo, useState } from 'react';
import { Modal, ModalClose } from './Modal';
import { Icon } from './Icon';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { useInventory } from '../inventoryStore';
import { PALETTE } from '../../shared/palette.mjs';
import { BrandSelect, BrandTag, type BrandId } from './BrandTag';
import { projectMetrics } from '../lib/metrics';
import {
  inventoryRows,
  inventorySummary,
  stockOf,
  type InventoryRow,
} from '../lib/inventory';

type Filter = 'project' | 'all' | 'missing';

function InventoryBody({ onClose, mini }: { onClose: () => void; mini: boolean }) {
  const project = useStudio((s) => s.project);
  const replaceColor = useStudio((s) => s.replaceColor);
  const counts = useInventory((s) => s.counts);
  const setCount = useInventory((s) => s.setCount);
  const add = useInventory((s) => s.add);
  const reset = useInventory((s) => s.reset);
  const toast = useApp((s) => s.toast);
  const [filter, setFilter] = useState<Filter>('project');
  const [confirmReset, setConfirmReset] = useState(false);
  const [brand, setBrand] = useState<BrandId>('hama');

  const metrics = useMemo(() => projectMetrics(project), [project]);
  const usedRows = useMemo(() => inventoryRows(metrics.colorStats, counts), [metrics, counts]);
  const summary = useMemo(() => inventorySummary(usedRows), [usedRows]);
  const stock = stockOf(counts);

  const allRows: InventoryRow[] = useMemo(() => {
    const needMap = new Map(metrics.colorStats.map((c) => [c.hex.toLowerCase(), c.count]));
    return PALETTE.map((p) => {
      const need = needMap.get(p.hex.toLowerCase()) || 0;
      const have = counts[p.hex.toLowerCase()] || 0;
      const used = usedRows.find((r) => r.hex.toLowerCase() === p.hex.toLowerCase());
      return {
        hex: p.hex,
        code: p.code,
        name: p.name,
        need,
        have,
        missing: Math.max(0, need - have),
        substitute: used?.substitute ?? null,
      };
    });
  }, [metrics, counts, usedRows]);

  const rows =
    filter === 'project' ? usedRows : filter === 'missing' ? usedRows.filter((r) => r.missing > 0) : allRows;

  const onSubstitute = (row: InventoryRow) => {
    if (!row.substitute) return;
    const n = replaceColor(row.hex, row.substitute.hex);
    if (n) {
      toast('success', `换掉了 ${n} 颗`, `${row.name} → ${row.substitute.name}`);
    }
  };

  return (
    <div className={`inventory-panel ${mini ? 'mini-inventory' : ''}`}>
      <div className="pattern-head">
        <div>
          <span className="eyebrow">BEAD STASH</span>
          <h2>豆仓与缺色</h2>
          <p>记一下手头有多少颗，就能知道还缺什么、能拿什么替代。</p>
        </div>
        <div className="pattern-head-actions">
          <button className="modal-close icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={20} />
          </button>
        </div>
      </div>

      <div className="inv-summary">
        <div>
          <b>{stock}</b>
          <span>手头豆子</span>
        </div>
        <div>
          <b>{metrics.colors}</b>
          <span>本图用色</span>
        </div>
        <div className={summary.missingColors ? 'warn' : ''}>
          <b>{summary.missingColors}</b>
          <span>缺色</span>
        </div>
        <div className={summary.missingBeads ? 'warn' : ''}>
          <b>{summary.missingBeads}</b>
          <span>缺颗数</span>
        </div>
      </div>

      <div className="inv-toolbar">
        <div className="inv-filter">
          {[
            { id: 'project', label: '本图用色' },
            { id: 'all', label: '全部色卡' },
            { id: 'missing', label: '只看缺色' },
          ].map((f) => (
            <button
              key={f.id}
              className={filter === f.id ? 'on' : ''}
              onClick={() => setFilter(f.id as Filter)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <BrandSelect brand={brand} onChange={setBrand} />
        <label className="inv-reset">
          <input
            type="checkbox"
            checked={confirmReset}
            onChange={(e) => setConfirmReset(e.target.checked)}
          />
          清空
        </label>
        {confirmReset && (
          <button
            className="inv-reset-confirm"
            onClick={() => {
              reset();
              setConfirmReset(false);
              toast('info', '豆仓清空了', '不影响板上的作品');
            }}
          >
            确认清空
          </button>
        )}
      </div>

      <div className="inv-list">
        {rows.length === 0 ? (
          <div className="inv-empty">
            <Icon name="coin" size={24} />
            <b>{filter === 'missing' ? '没有缺色，够用' : '这块板上还没有豆子'}</b>
            <span>先放几颗，或者去照片转图纸生成一张。</span>
          </div>
        ) : (
          rows.map((row) => (
            <div className={`inv-row ${row.missing ? 'missing' : ''}`} key={row.hex}>
              <span className="inv-swatch" style={{ background: row.hex }} />
              <div className="inv-name">
                <b>
                  {row.code} {row.name} <BrandTag hex={row.hex} brand={brand} />
                </b>
                <span>
                  {row.need ? (
                    <>
                      需要 <b>{row.need}</b> 颗
                      {row.have > 0 ? ` · 有 ${row.have}` : ''}
                    </>
                  ) : (
                    '本图未使用'
                  )}
                </span>
              </div>
              <div className="inv-count">
                <input
                  type="number"
                  min={0}
                  max={999999}
                  value={row.have || ''}
                  placeholder="0"
                  onChange={(e) => setCount(row.hex, Number(e.target.value))}
                  aria-label={`${row.name} 库存`}
                />
                <div className="inv-plus">
                  <button onClick={() => add(row.hex, 100)}>+100</button>
                  <button onClick={() => add(row.hex, 1000)}>+1000</button>
                </div>
              </div>
              <div className="inv-status">
                {row.need > 0 ? (
                  row.missing > 0 ? (
                    <span className="inv-missing">缺 {row.missing}</span>
                  ) : (
                    <span className="inv-ok">
                      <Icon name="check" size={11} /> 够
                    </span>
                  )
                ) : (
                  <span className="inv-unused">—</span>
                )}
              </div>
              {row.substitute && (
                <button
                  className="inv-sub"
                  title={`用 ${row.substitute.code} ${row.substitute.name} 替代`}
                  onClick={() => onSubstitute(row)}
                >
                  可用 {row.substitute.code} 替
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="inv-foot">
        <span>
          <Icon name="info" size={13} /> 豆仓只存在本机；品牌色号为近似参考。
        </span>
        <button className="btn btn-primary btn-sm" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}

export function InventoryDialog({
  open,
  onClose,
  mini = false,
}: {
  open: boolean;
  onClose: () => void;
  mini?: boolean;
}) {
  if (!open) return null;
  if (mini) {
    return (
      <div className="mini-pattern-layer">
        <InventoryBody onClose={onClose} mini />
      </div>
    );
  }
  return (
    <Modal open={open} onClose={onClose} className="inventory-modal" label="豆仓与缺色">
      <ModalClose onClick={onClose} />
      <InventoryBody onClose={onClose} mini={false} />
    </Modal>
  );
}
