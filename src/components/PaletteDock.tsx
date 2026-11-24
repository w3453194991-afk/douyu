import React, { useEffect, useRef, useState } from 'react';
import { useStudio } from '../store';
import { PALETTE, colorInfo } from '../../shared/palette.mjs';
import { BRANDS } from '../../shared/brands.mjs';
import { beadCode } from '../lib/beadCode';

const FAMILIES = ['neutral', 'warm', 'cool', 'nature', 'special'] as const;
const ORDERED = FAMILIES.flatMap((family) => PALETTE.filter((c) => c.family === family));
const BRAND_COLORS = Object.values(BRANDS).flatMap((b: any) =>
  b.colors.map((c: any) => ({ ...c, brand: b.id, brandLabel: b.label })),
);
const DOUYU = ORDERED.map((c) => ({ ...c, brand: 'douyu', brandLabel: '豆屿' }));
const COLOR_TOTAL = DOUYU.length + BRAND_COLORS.length;

export function PaletteDock() {
  const color = useStudio((s) => s.color);
  const projectBrand = useStudio((s) => s.project.brand) || 'douyu';
  const setColor = useStudio((s) => s.setColor);
  const recent = useStudio((s) => s.recentColors);
  const info = colorInfo(color);
  const currentCode = beadCode(color, projectBrand);
  const showCodes = useStudio((s) => s.showCodes);
  const setShowCodes = useStudio((s) => s.setShowCodes);
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const q = query.trim().toLowerCase();
  const baseColors =
    projectBrand === 'douyu'
      ? DOUYU
      : projectBrand === 'mixed'
        ? [...DOUYU, ...BRAND_COLORS]
        : BRAND_COLORS.filter((c: any) => c.brand === projectBrand);
  const results = q
    ? [...DOUYU, ...BRAND_COLORS]
        .filter(
          (c: any) =>
            c.code.toLowerCase().includes(q) ||
            String(c.name).toLowerCase().includes(q) ||
            c.hex.toLowerCase().includes(q) ||
            c.brandLabel.toLowerCase().includes(q),
        )
        .slice(0, 90)
    : baseColors;

  const centerSelected = (behavior: ScrollBehavior = 'smooth') => {
    const box = scrollRef.current;
    const el = selectedRef.current;
    if (!box || !el) return;
    if (box.scrollWidth <= box.clientWidth + 2) return;
    box.scrollTo({
      left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2,
      behavior,
    });
  };

  useEffect(() => {
    centerSelected('smooth');
  }, [color]);

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    centerSelected('auto');
    const ro = new ResizeObserver(() => centerSelected('auto'));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="palette-dock">
      <div className="palette-head">
        <div className="current-bead" style={{ background: color }}>
          <span />
        </div>
        <div className="current-meta">
          <b>{currentCode.name || info.name}</b>
          <span>
            {currentCode.approx ? '≈' : ''}
            {currentCode.code} · {COLOR_TOTAL} 色
          </span>
        </div>
        <div className="recent-colors" title="最近使用">
          {recent.slice(0, 6).map((c) => (
            <button
              key={c}
              className={`recent-dot ${c === color ? 'on' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`使用 ${colorInfo(c).name}`}
            />
          ))}
        </div>
        <label className="palette-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜编号：P05 / H02 / S01 / 红"
            aria-label="搜索豆子编号或颜色名"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="清空搜索">
              ×
            </button>
          )}
        </label>
        <button
          className={`palette-code-toggle ${showCodes ? 'on' : ''}`}
          onClick={() => setShowCodes(!showCodes)}
          title="在每颗豆子上显示编号；缩得很小时只显示后两位"
        >
          编号 {showCodes ? '开' : '关'}
        </button>
        <span className="palette-brand">{COLOR_TOTAL} 色</span>
      </div>
      <div className="palette-scroll" ref={scrollRef}>
        <div className="swatches">
          {results.map((c: any) => (
            <button
              key={`${c.brand}-${c.code}-${c.hex}`}
              ref={(el) => {
                if (c.hex.toLowerCase() === color.toLowerCase()) selectedRef.current = el;
              }}
              className={`swatch ${c.hex.toLowerCase() === color.toLowerCase() ? 'on' : ''}`}
              style={{ background: c.hex }}
              title={`${c.brandLabel} · ${c.code} ${c.name}`}
              aria-label={`${c.brandLabel} ${c.name} ${c.code}`}
              onClick={() => setColor(c.hex)}
            >
              <span />
              <em>{c.code}</em>
            </button>
          ))}
          {!results.length && <span className="palette-no-result">没找到这个编号，换个试试</span>}
        </div>
      </div>
      {q && results.length > 0 && (
        <div className="palette-search-note">
          找到 {results.length} 个颜色 · 点一下换色；编号会显示在每颗豆子上
        </div>
      )}
    </div>
  );
}
