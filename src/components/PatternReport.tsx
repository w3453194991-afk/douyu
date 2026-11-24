import React, { useEffect, useState } from 'react';
import { Modal, ModalClose } from './Modal';
import { Icon } from './Icon';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { BrandSelect, BrandTag, type BrandId } from './BrandTag';
import { buildPatternPages } from '../lib/patternPages';
import { downloadPatternSheet, printPatternSheets, type PatternSheetData } from '../lib/patternSheet';
import { cmText, formatMinutes } from '../lib/metrics';

function PatternReportBody({
  onClose,
  mini,
  onGuide,
  onInventory,
}: {
  onClose: () => void;
  mini: boolean;
  onGuide?: () => void;
  onInventory?: () => void;
}) {
  const project = useStudio((s) => s.project);
  const color = useStudio((s) => s.color);
  const replaceColor = useStudio((s) => s.replaceColor);
  const toast = useApp((s) => s.toast);
  const [pages, setPages] = useState<PatternSheetData[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const [brand, setBrand] = useState<BrandId>('hama');

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const next = buildPatternPages(project);
        setPages(next);
        setPageIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
      } catch (e) {
        setError(e instanceof Error ? e.message : '图纸生成失败');
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [project]);

  const sheet = pages[pageIndex] || pages[0] || null;
  const m = pages[0]?.metrics;

  const save = () => {
    if (!sheet) return;
    downloadPatternSheet(sheet);
    toast('success', '图纸已保存', 'PNG 文件，可以直接打印');
  };

  const print = () => {
    if (!pages.length) return;
    const ok = printPatternSheets(pages);
    if (!ok) {
      toast('error', '浏览器挡住了打印窗口', '允许弹窗后再试，或先保存 PNG');
    }
  };

  return (
    <div className={`pattern-report ${mini ? 'mini-report' : ''}`}>
      <div className="pattern-head">
        <div>
          <span className="eyebrow">PATTERN CHART</span>
          <h2>图纸与色号</h2>
          <p>A4 横版 · 色号用量 · 29×29 分板线 · 可直接打印</p>
        </div>
        <div className="pattern-head-actions">
          <button className="modal-close icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={20} />
          </button>
        </div>
      </div>

      {m && (
        <div className="report-summary">
          <span>
            <b>{m.beads}</b> 颗
          </span>
          <span>
            <b>{m.colors}</b> 色
          </span>
          <span>
            <b>
              {cmText(m.cmW)}×{cmText(m.cmH)}
            </b>{' '}
            cm
          </span>
          <span>
            <b>{m.boards}</b> 块拼板
          </span>
          <span>
            <b>{m.difficulty}</b>
          </span>
          <span>{formatMinutes(m.minutes)}</span>
          {pages.length > 1 && <span className="report-pages-count">{pages.length} 页</span>}
        </div>
      )}

      {pages.length > 1 && (
        <div className="report-page-tabs">
          {pages.map((p, i) => (
            <button
              key={`${p.label}-${i}`}
              className={i === pageIndex ? 'on' : ''}
              onClick={() => {
                setPageIndex(i);
                setZoom(false);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="report-body">
        <div className={`report-preview ${zoom ? 'zoom' : ''}`} onClick={() => setZoom((v) => !v)}>
          {sheet ? (
            <img src={sheet.dataUrl} alt="拼豆图纸预览" />
          ) : error ? (
            <div className="report-empty">{error}</div>
          ) : (
            <div className="report-empty">正在画图纸…</div>
          )}
          {sheet && (
            <span className="report-zoom-hint">
              {sheet.label} · {zoom ? '点击缩小' : '点击放大看色号'}
            </span>
          )}
        </div>

        {m && m.colorStats.length > 0 && (
          <div className="report-colors">
            <div className="report-colors-head">
              <b>色号清单</b>
              <span>{m.colors} 色 · 建议每色多备 10%</span>
            </div>
            <button className="report-inventory-link" onClick={onInventory}>
              <Icon name="coin" size={12} /> 豆仓 / 缺色替代
            </button>
            <p className="report-swap-hint">
              <i style={{ background: color }} /> 当前画笔色
              <span>点每行末尾 → 可整色替换</span>
            </p>
            <div className="report-brand-row">
              <BrandSelect brand={brand} onChange={setBrand} />
              <span>品牌色号为近似匹配</span>
            </div>
            <div className="report-color-list">
              {m.colorStats.map((c) => (
                <div className="report-color-row" key={c.hex}>
                  <i style={{ background: c.hex }} />
                  <span className="report-color-code">{c.code}</span>
                  <span className="report-color-name">{c.name}</span>
                  <BrandTag hex={c.hex} brand={brand} />
                  <b>{c.count}</b>
                  {c.hex.toLowerCase() !== color.toLowerCase() && (
                    <button
                      className="report-color-swap"
                      title={`把 ${c.name} 全部换成当前画笔色`}
                      onClick={() => {
                        const n = replaceColor(c.hex, color);
                        if (n) toast('success', `换掉了 ${n} 颗`, `${c.name} → 当前画笔色`);
                      }}
                    >
                      →
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="report-tip">
              按 1000 颗/包估算：共需 {m.beads} 颗，实际备料建议再多 10%。
            </p>
          </div>
        )}
      </div>

      <div className="report-actions">
        <button className="btn btn-ghost" onClick={onGuide}>
          <Icon name="book" size={16} />
          拼板 / 熨烫教程
        </button>
        <button className="btn btn-ghost" onClick={save} disabled={!sheet}>
          <Icon name="download" size={16} />
          保存本页 PNG
        </button>
        <button className="btn btn-primary" onClick={print} disabled={!pages.length}>
          <Icon name="printer" size={16} />
          {pages.length > 1 ? `打印全部 · ${pages.length} 页` : '打印 / 存 PDF'}
        </button>
      </div>
    </div>
  );
}

export function PatternReport({
  open,
  onClose,
  mini = false,
  onGuide,
  onInventory,
}: {
  open: boolean;
  onClose: () => void;
  mini?: boolean;
  onGuide?: () => void;
  onInventory?: () => void;
}) {
  if (!open) return null;
  if (mini) {
    return (
      <div className="mini-pattern-layer">
        <PatternReportBody
          onClose={onClose}
          mini
          onGuide={onGuide}
          onInventory={onInventory}
        />
      </div>
    );
  }
  return (
    <Modal open={open} onClose={onClose} className="report-modal" label="图纸与色号">
      <ModalClose onClick={onClose} />
      <PatternReportBody
        onClose={onClose}
        mini={false}
        onGuide={onGuide}
        onInventory={onInventory}
      />
    </Modal>
  );
}
