import React, { useEffect, useRef } from 'react';
import { useStudio } from '../store';
import { PALETTE, colorInfo } from '../../shared/palette.mjs';

const FAMILIES = ['neutral', 'warm', 'cool', 'nature', 'special'] as const;
const ORDERED = FAMILIES.flatMap((family) => PALETTE.filter((c) => c.family === family));

export function PaletteDock() {
  const color = useStudio((s) => s.color);
  const setColor = useStudio((s) => s.setColor);
  const recent = useStudio((s) => s.recentColors);
  const info = colorInfo(color);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

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
          <b>{info.name}</b>
          <span>
            {info.code} · {PALETTE.length} 色
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
        <span className="palette-brand">HAMA · 5mm</span>
      </div>
      <div className="palette-scroll" ref={scrollRef}>
        <div className="swatches">
          {ORDERED.map((c) => (
            <button
              key={c.hex}
              ref={(el) => {
                if (c.hex.toLowerCase() === color.toLowerCase()) selectedRef.current = el;
              }}
              className={`swatch ${c.hex.toLowerCase() === color.toLowerCase() ? 'on' : ''}`}
              style={{ background: c.hex }}
              title={`${c.name} · ${c.code}`}
              aria-label={`${c.name} ${c.code}`}
              onClick={() => setColor(c.hex)}
            >
              <span />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
