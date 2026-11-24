import React from 'react';

export type IconName =
  | 'bead'
  | 'eraser'
  | 'pick'
  | 'select'
  | 'hand'
  | 'undo'
  | 'redo'
  | 'iron'
  | 'camera'
  | 'gallery'
  | 'coin'
  | 'plus'
  | 'x'
  | 'check'
  | 'lock'
  | 'unlock'
  | 'heart'
  | 'move'
  | 'rotate'
  | 'cube'
  | 'grid'
  | 'fit'
  | 'sparkle'
  | 'trash'
  | 'split'
  | 'locate'
  | 'eye'
  | 'eyeOff'
  | 'search'
  | 'arrowLeft'
  | 'download'
  | 'info'
  | 'layers'
  | 'chevronDown'
  | 'zoomIn'
  | 'zoomOut'
  | 'menu'
  | 'board'
  | 'home'
  | 'user'
  | 'phone'
  | 'edit'
  | 'image'
  | 'printer'
  | 'book'
  | 'clock'
  | 'play'
  | 'pause'
  | 'bookmark'
  | 'message';

const P: Record<IconName, React.ReactNode> = {
  bead: (
    <>
      <circle cx="12" cy="12" r="7.2" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  eraser: (
    <>
      <path d="M4.5 14.5 12 7l6 6-5 5H7l-2.5-3.5Z" />
      <path d="m8 18 7-7" />
      <path d="M3 21h12" />
    </>
  ),
  pick: (
    <>
      <path d="m17.5 3.5 3 3-8.2 8.2-3.8.8.8-3.8 8.2-8.2Z" />
      <path d="m14 6 4 4" />
      <path d="M4 20 9 15" />
    </>
  ),
  select: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="m12 9 7 4-3 .8-1.2 3L12 9Z" />
    </>
  ),
  hand: (
    <>
      <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a6 6 0 0 0 12 0v-5a2 2 0 0 0-4 0" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
  redo: (
    <>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h3" />
    </>
  ),
  iron: (
    <>
      <path d="M3 16h14a4 4 0 0 0 4-4V9H7l-4 7Z" />
      <path d="M3 19h18" />
      <path d="M10 9V7a2 2 0 0 1 2-2h6" />
      <circle cx="16.5" cy="12.5" r="1" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7h3.2l1.6-2.5h6.4L16.8 7H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.4" />
      <path d="m3.5 17 5-5 4 4 3-3 4.5 4.5" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3.5v1.2M12 19.3v1.2M3.5 12h1.2M19.3 12h1.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 13 4 4L19 7" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2" />
    </>
  ),
  unlock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 7.5-2" />
      <path d="M12 14v2" />
    </>
  ),
  heart: <path d="M12 20.3 4.8 13a4.7 4.7 0 0 1 6.6-6.7l.6.6.6-.6A4.7 4.7 0 0 1 19.2 13L12 20.3Z" />,
  move: (
    <>
      <path d="M12 3v18M3 12h18" />
      <path d="m8 7 4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" />
    </>
  ),
  rotate: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 6" />
      <path d="M20 4v7h-7" />
    </>
  ),
  cube: (
    <>
      <path d="m12 2.8 8.5 4.7v9L12 21.2 3.5 16.5v-9L12 2.8Z" />
      <path d="m3.5 7.5 8.5 4.8 8.5-4.8M12 12.3v8.9" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
    </>
  ),
  fit: (
    <>
      <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5c.6 4.4 2.1 5.9 6.5 6.5-4.4.6-5.9 2.1-6.5 6.5-.6-4.4-2.1-5.9-6.5-6.5 4.4-.6 5.9-2.1 6.5-6.5Z" />
      <path d="M18.5 15.5c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3.5 6.5h17M9 6.5V4h6v2.5M6 6.5 7 21h10l1-14.5M10 11v6M14 11v6" />
    </>
  ),
  split: (
    <>
      <path d="M12 3v6M12 15v6" />
      <path d="m8 6 4 4 4-4M8 18l4-4 4 4" />
      <path d="M4 12h3M17 12h3" />
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4 20 20" />
      <path d="M9.9 5.8A10.8 10.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-2.6 3.4M6.4 8.3A15.7 15.7 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.7-.3 3.8-.9" />
      <path d="M9.5 9.7a3 3 0 0 0 4.1 4.3" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4 4" />
    </>
  ),
  arrowLeft: <path d="M20 12H4m6-6-6 6 6 6" />,
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  zoomIn: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4 4M10.5 7.5v6M7.5 10.5h6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4 4M7.5 10.5h6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  board: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M9 9.5V20M15 9.5V20M9 4v5.5M15 4v5.5" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6.5h-5V21H5a1 1 0 0 1-1-1v-9.5Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.6-3.6 3.2-5.5 7-5.5s6.4 1.9 7 5.5" />
    </>
  ),
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10 18.5h4" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.4" />
      <path d="m3.5 17 5-5 4 4 3-3 4.5 4.5" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V3h10v5" />
      <rect x="3.5" y="8" width="17" height="9" rx="2" />
      <path d="M7 14h10v7H7z" />
      <path d="M17 11h.5" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5h6a3 3 0 0 1 3 3V21a2.5 2.5 0 0 0-2.5-2.5H4v-14Z" />
      <path d="M20 4.5h-6a3 3 0 0 0-3 3V21a2.5 2.5 0 0 1 2.5-2.5H20v-14Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7V5Z" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  bookmark: (
    <>
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1Z" />
    </>
  ),
  message: (
    <>
      <path d="M4 5h16v11H8l-4 4V5Z" />
      <path d="M8 9h8M8 12.5h5" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  filled = false,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {P[name]}
    </svg>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <circle cx="10" cy="10" r="7" fill="#E0582F" />
      <circle cx="10" cy="10" r="2.6" fill="#FFF8EC" />
      <circle cx="23" cy="9" r="5.4" fill="#8ECFBB" />
      <circle cx="23" cy="9" r="2" fill="#FFF8EC" />
      <circle cx="22" cy="22" r="6.4" fill="#F5C24F" />
      <circle cx="22" cy="22" r="2.4" fill="#FFF8EC" />
      <circle cx="9.5" cy="23" r="4.4" fill="#4DA7D9" />
      <circle cx="9.5" cy="23" r="1.7" fill="#FFF8EC" />
    </svg>
  );
}
