import * as THREE from 'three';

const W = 1200;
const H = 900;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function shade(hex, amount) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amount >= 0) {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  } else {
    r *= 1 + amount;
    g *= 1 + amount;
    b *= 1 + amount;
  }
  const to = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * 用透视投影把场景画成一张 SVG 封面（种子作品用）。
 * 真正发布的作品会使用玩家截下来的 3D 画面。
 */
export function renderCoverSvg(scene) {
  const pieces = scene.pieces || [];
  const all = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  const matrices = pieces.map((p) => {
    const arr = p.beads.map((b) => (Array.isArray(b) ? b : [b.x, b.y, b.c]));
    const bb = arr.reduce(
      (acc, [x, y]) => {
        acc.minX = Math.min(acc.minX, x);
        acc.minY = Math.min(acc.minY, y);
        acc.maxX = Math.max(acc.maxX, x);
        acc.maxY = Math.max(acc.maxY, y);
        return acc;
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    );
    const w = bb.maxX - bb.minX + 1;
    const h = bb.maxY - bb.minY + 1;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(p.t.p[0], p.t.p[1], p.t.p[2]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(p.t.r[0], p.t.r[1], p.t.r[2], 'XYZ')),
      new THREE.Vector3(1, 1, 1),
    );
    for (const [bx, by, c] of arr) {
      const v = new THREE.Vector3(bx - w / 2 + 0.5, 0.11, by - h / 2 + 0.5).applyMatrix4(m);
      all.push({ x: v.x, y: v.y, z: v.z, c });
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
      minZ = Math.min(minZ, v.z);
      maxZ = Math.max(maxZ, v.z);
    }
    return { m, w, h, p };
  });

  if (!all.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#F7F0E2"/></svg>`;
  }

  const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 8);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 10000);
  const dir = new THREE.Vector3(Math.sin(0.2) * Math.cos(0.13), Math.sin(0.13), Math.cos(0.2) * Math.cos(0.13)).normalize();
  camera.position.copy(center).addScaledVector(dir, extent * 2.6);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);

  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const pxPerUnit = (() => {
    const a = center.clone().project(camera);
    const b = center.clone().addScaledVector(right, 1).project(camera);
    return Math.abs(b.x - a.x) * (W / 2);
  })();

  const raw = all.map((b) => {
    const v = new THREE.Vector3(b.x, b.y, b.z);
    const ndc = v.clone().project(camera);
    const depth = v.clone().applyMatrix4(camera.matrixWorldInverse).z;
    return {
      x: (ndc.x * 0.5 + 0.5) * W,
      y: (-ndc.y * 0.5 + 0.5) * H,
      r: 0.52 * pxPerUnit,
      depth,
      c: b.c,
    };
  });

  raw.sort((a, b) => a.depth - b.depth);

  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const b of raw) {
    bx0 = Math.min(bx0, b.x - b.r);
    by0 = Math.min(by0, b.y - b.r);
    bx1 = Math.max(bx1, b.x + b.r);
    by1 = Math.max(by1, b.y + b.r);
  }
  const padX = 80;
  const padTop = 80;
  const padBottom = 110;
  const s = Math.min((W - padX * 2) / (bx1 - bx0), (H - padTop - padBottom) / (by1 - by0), 2.2);
  const tx = W / 2 - ((bx0 + bx1) / 2) * s;
  const ty = padTop + (H - padTop - padBottom) / 2 - ((by0 + by1) / 2) * s;

  const beads = raw.map((b) => {
    const x = b.x * s + tx;
    const y = b.y * s + ty;
    const r = Math.max(0.7, b.r * s);
    return { ...b, x, y, r };
  });

  const dots = [];
  for (let x = 26; x < W; x += 32) {
    for (let y = 26; y < H; y += 32) dots.push(`M${x} ${y}h0.01`);
  }

  let shadowBottom = -Infinity;
  let shadowLeft = Infinity;
  let shadowRight = -Infinity;
  for (const b of beads) {
    shadowBottom = Math.max(shadowBottom, b.y + b.r);
    shadowLeft = Math.min(shadowLeft, b.x - b.r);
    shadowRight = Math.max(shadowRight, b.x + b.r);
  }

  const beadSvg = beads
    .map((b) => {
      const r = b.r;
      const rim = shade(b.c, -0.24);
      const hole = shade(b.c, -0.3);
      const hi = Math.max(0.6, r * 0.26);
      return `<g><circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${r.toFixed(2)}" fill="${b.c}" stroke="${rim}" stroke-opacity="0.5" stroke-width="${Math.max(0.35, r * 0.09).toFixed(2)}"/><circle cx="${(b.x - r * 0.22).toFixed(1)}" cy="${(b.y - r * 0.24).toFixed(1)}" r="${hi.toFixed(2)}" fill="#ffffff" opacity="0.34"/><circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${(r * 0.34).toFixed(2)}" fill="${hole}" opacity="0.38"/></g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="#FBF6EA"/>
      <stop offset="0.55" stop-color="#F4EAD8"/>
      <stop offset="1" stop-color="#E9DCC5"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFFDF6" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#FFFDF6" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="22"/>
    </filter>
    <pattern id="dotgrid" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="26" cy="26" r="1.2" fill="#9A8A6F" opacity="0.28"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g opacity="0.7">
    <circle cx="1040" cy="150" r="230" fill="#BCE3D6" opacity="0.42" filter="url(#soft)"/>
    <circle cx="140" cy="800" r="250" fill="#F6BFA6" opacity="0.4" filter="url(#soft)"/>
    <circle cx="650" cy="430" r="330" fill="#FFFDF6" opacity="0.5" filter="url(#soft)"/>
  </g>
  <rect width="${W}" height="${H}" fill="url(#dotgrid)" opacity="0.55"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="26" fill="none" stroke="#3A2C1D" stroke-opacity="0.12"/>

  <ellipse cx="${((shadowLeft + shadowRight) / 2).toFixed(1)}" cy="${(shadowBottom + 6).toFixed(1)}" rx="${(((shadowRight - shadowLeft) / 2) * 0.92).toFixed(1)}" ry="18" fill="#4A3826" opacity="0.16" filter="url(#soft)"/>

  <g>${beadSvg}</g>

  <g transform="translate(58 828)">
    <circle cx="17" cy="-10" r="12" fill="#E0582F"/>
    <circle cx="17" cy="-10" r="4" fill="#FBF6EA" opacity="0.9"/>
    <text x="38" y="-4" font-family="'Microsoft YaHei','PingFang SC',sans-serif" font-size="22" font-weight="700" fill="#3A2C1D">豆屿</text>
    <text x="38" y="16" font-family="'Microsoft YaHei','PingFang SC',sans-serif" font-size="12" letter-spacing="2" fill="#3A2C1D" opacity="0.55">BEAD ISLE · 拼豆作品</text>
  </g>
  <text x="${W - 58}" y="${H - 56}" text-anchor="end" font-family="'Microsoft YaHei','PingFang SC',sans-serif" font-size="13" fill="#3A2C1D" opacity="0.45">${esc(pieces.length)} 块零件 · ${esc(all.length)} 颗豆</text>
</svg>`;
}
