import React, { useState } from 'react';

const REASONS = ['广告/引流', '不友善', '侵权/盗图', '其他'];

export function ReportBox({
  open,
  label,
  onClose,
  onSubmit,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  return (
    <div className="report-box">
      <div className="report-head">
        <b>举报{label ? `「${label}」` : ''}</b>
        <button onClick={onClose} aria-label="关闭举报">
          ×
        </button>
      </div>
      <div className="report-reasons">
        {REASONS.map((r) => (
          <button key={r} className={reason === r ? 'on' : ''} onClick={() => setReason(r)}>
            {r}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="补充说明（可选）"
        maxLength={160}
      />
      <div className="report-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          取消
        </button>
        <button
          className="btn btn-primary btn-sm"
          disabled={busy || !reason.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(note.trim() ? `${reason}：${note.trim()}` : reason);
              setReason('');
              setNote('');
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? '提交中…' : '提交举报'}
        </button>
      </div>
    </div>
  );
}
