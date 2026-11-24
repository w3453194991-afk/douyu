import React from 'react';
import { BRANDS, nearestBrand } from '../../shared/brands.mjs';

export type BrandId = 'hama' | 'perler' | 'artkal';

export function BrandTag({ hex, brand }: { hex: string; brand: BrandId }) {
  const b = nearestBrand(hex, brand);
  const label = BRANDS[brand]?.label || 'Hama';
  return (
    <span className="brand-tag" title={`近似 ${label} ${b.code} ${b.name}`}>
      ≈{b.code}
    </span>
  );
}

export function BrandSelect({
  brand,
  onChange,
}: {
  brand: BrandId;
  onChange: (brand: BrandId) => void;
}) {
  return (
    <label className="brand-select" title="切换参考品牌色卡">
      <span>参考</span>
      <select value={brand} onChange={(e) => onChange(e.target.value as BrandId)}>
        <option value="hama">Hama</option>
        <option value="perler">Perler</option>
        <option value="artkal">Artkal S</option>
      </select>
    </label>
  );
}
