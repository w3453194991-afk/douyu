import React from 'react';
import { useApp } from '../appStore';
import { Icon } from './Icon';

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span className="toast-icon">
            <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'info' : 'sparkle'} size={17} />
          </span>
          <div className="toast-copy">
            <b>{t.title}</b>
            {t.msg && <span>{t.msg}</span>}
          </div>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="关闭">
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
