import React, { useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { sceneFromPieces, totalBeads } from '../lib/scene';
import { Icon } from '../components/Icon';
import { MiniNav } from './ui';

export function MiniPublish({
  image,
  onBack,
  onPublished,
}: {
  image: string;
  onBack: () => void;
  onPublished: (id: string) => void;
}) {
  const user = useApp((s) => s.user);
  const setPoints = useApp((s) => s.setPoints);
  const toast = useApp((s) => s.toast);
  const project = useStudio((s) => s.project);

  const [title, setTitle] = useState(project.title === '无题小岛' ? '' : project.title);
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState(project.guide ? 40 : 60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const extraRef = useRef<HTMLInputElement>(null);

  const addExtras = async (files: FileList | null) => {
    if (!files) return;
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, 3 - extras.length)) {
      if (!file.type.startsWith('image/')) continue;
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('read'));
        reader.readAsDataURL(file);
      });
      if (data) next.push(data);
    }
    setExtras((list) => [...list, ...next].slice(0, 3));
  };

  const total = useMemo(() => totalBeads(project), [project]);

  const submit = async () => {
    if (!title.trim()) {
      setError('先给作品起个名字');
      return;
    }
    if (!project.pieces.length) {
      setError('还没有熨好的零件');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.publish({
        title: title.trim(),
        desc: desc.trim(),
        price: Math.max(0, Math.min(999, Math.round(price))),
        cover: image,
        images: extras,
        scene: sceneFromPieces(project.pieces),
        sourceWorkId: project.guide?.workId ?? null,
      });
      setPoints(res.points);
      toast('success', `发布成功，+${res.awarded} 豆币`, '已经在集市上了');
      onPublished(res.work.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '发布失败，稍后再试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mini-publish">
      <MiniNav title="发布成品" onBack={onBack} />

      <div className="mini-publish-scroll">
        <img className="mini-publish-img" src={image} alt="成品截图" />
        <div className="mini-publish-note">
          <Icon name="camera" size={12} /> 这张截图会作为集市封面 · {project.pieces.length} 块零件 ·{' '}
          {total} 颗豆
        </div>
        <div className="mini-extra">
          <div className="mini-extra-head">
            <b>更多角度照片</b>
            <span>可选，最多 3 张</span>
          </div>
          <div className="mini-extra-list">
            {extras.map((src, i) => (
              <div className="mini-extra-item" key={i}>
                <img src={src} alt="" />
                <button onClick={() => setExtras((list) => list.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            {extras.length < 3 && (
              <button className="mini-extra-add" onClick={() => extraRef.current?.click()}>
                <Icon name="plus" size={15} /> 添加
              </button>
            )}
          </div>
          <input
            ref={extraRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(e) => addExtras(e.target.files)}
          />
        </div>

        <label className="mini-field">
          <span>作品名</span>
          <input
            className="mini-input"
            value={title}
            maxLength={30}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：摸鱼小猫的下班时间"
          />
        </label>

        <label className="mini-field">
          <span>说点什么（可选）</span>
          <textarea
            className="mini-textarea"
            value={desc}
            maxLength={400}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="用了多少颗豆、拼了多久、想对下一位复刻的人说什么…"
          />
        </label>

        <div className="mini-field">
          <span>复刻定价</span>
          <div className="mini-price-row">
            {[0, 30, 60, 120].map((p) => (
              <button
                key={p}
                className={`mini-price-chip ${price === p ? 'on' : ''}`}
                onClick={() => setPrice(p)}
              >
                {p === 0 ? '免费' : `${p} 豆币`}
              </button>
            ))}
            <div className="mini-price-input">
              <input
                type="number"
                min={0}
                max={999}
                value={price}
                onChange={(e) => setPrice(Math.max(0, Math.min(999, Number(e.target.value) || 0)))}
              />
              <span>豆币</span>
            </div>
          </div>
        </div>

        <div className="mini-reward">
          <Icon name="coin" size={14} />
          发布即得 <b>+50 豆币</b>
          {project.guide && <span style={{ marginLeft: 'auto', fontSize: 8.5 }}>复刻自《{project.guide.title}》</span>}
        </div>

        {error && <div className="mini-form-error">{error}</div>}

        <p style={{ fontSize: 8.5, color: 'var(--ink-3)', lineHeight: 1.6, marginTop: 10 }}>
          发布后仍可继续修改本机草稿；集市上的版本会保留发布时的样子。你当前有{' '}
          {user?.points ?? 0} 豆币。
        </p>
      </div>

      <div className="mini-publish-bar">
        <button className="mini-button ghost" onClick={onBack} disabled={busy}>
          再改改
        </button>
        <button className="mini-button primary" onClick={submit} disabled={busy}>
          {busy ? '正在挂上去…' : '确认发布'}
        </button>
      </div>
    </div>
  );
}
