import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export function Modal({
  open,
  onClose,
  children,
  className = '',
  closeOnBackdrop = true,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  label?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal-panel ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalClose({ onClick }: { onClick: () => void }) {
  return (
    <button className="modal-close icon-btn" onClick={onClick} aria-label="关闭">
      <Icon name="x" size={20} />
    </button>
  );
}
