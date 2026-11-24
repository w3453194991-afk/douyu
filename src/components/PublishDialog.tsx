import React, { useEffect, useMemo, useState } from 'react';
import { useStudio } from '../store';
import { useApp } from '../appStore';
import { Modal, ModalClose } from './Modal';
import { Icon } from './Icon';
import { api, ApiError } from '../lib/api';
import { sceneFromPieces, totalBeads, pieceBounds } from '../lib/scene';

export function PublishDialog({
  image,
  onClose,
}: {
  image: string | null;
  onClose: () => void;
}) {
  const project = useStudio((s) => s.project);
  const user = useApp((s) => s.user);
  const setPoints = useApp((s) => s.setPoints);
  const setView = useApp((s) => s.setView);
  const openWork = useApp((s) => s.openWork);
  const toast = useApp((s) => s.toast);

  const [title, setTitle] = useState(project.title === '无题小岛' ? '' : project.title);
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState(project.guide ? 40 : 60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const extraRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) return;
    setTitle(project.title === '无题小岛' ? '' : project.title);
    setDesc('');
    setError(null);
    setExtras([]);
  }, [image]);

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

  const beadTotal = useMemo(() => totalBeads(project), [project]);
  const sizes = useMemo(
    () => project.pieces.map((p) => pieceBounds(p.beads)).reduce((m, b) => Math.max(m, b.w, b.h), 0),
    [project.pieces],
  );

  const submit = async () => {
    if (!image) return;
    if (!title.trim()) {
      setError('先给作品起个名字吧');
      return;
    }
    if (!project.pieces.length) {
      setError('还没有熨好的零件，回去按 Enter 熨一下');
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
      toast('success', `发布成功，+${res.awarded} 豆币`, '去集市看看别人怎么评价吧');
      onClose();
      setView('gallery');
      openWork(res.work.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '发布失败，稍后再试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!image} onClose={onClose} className="publish-modal" closeOnBackdrop={!busy} label="发布作品">
      <ModalClose onClick={onClose} />
      {image && (
        <div className="publish-grid">
          <div className="publish-preview">
            <img src={image} alt="成品截图" />
            <div className="publish-preview-note">
              <Icon name="camera" size={15} />
              这张截图会作为集市封面
            </div>
            <div className="publish-stats">
              <span>
                <b>{project.pieces.length}</b> 块零件
              </span>
              <span>
                <b>{beadTotal}</b> 颗豆
              </span>
              <span>
                <b>{sizes}</b> 格最大边
              </span>
            </div>
            <div className="publish-extra">
              <div className="publish-extra-head">
                <b>更多角度照片</b>
                <span>可选，最多 3 张</span>
              </div>
              <div className="publish-extra-list">
                {extras.map((src, i) => (
                  <div className="publish-extra-item" key={i}>
                    <img src={src} alt={`角度 ${i + 2}`} />
                    <button
                      onClick={() => setExtras((list) => list.filter((_, j) => j !== i))}
                      aria-label="移除照片"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {extras.length < 3 && (
                  <button className="publish-extra-add" onClick={() => extraRef.current?.click()}>
                    <Icon name="plus" size={16} />
                    添加
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
          </div>

          <div className="publish-form">
            <span className="eyebrow">PUBLISH WORK</span>
            <h2>把这座小岛挂上去</h2>
            <p className="publish-lead">
              别人解锁你的图纸后，可以逐颗复刻，也能在你的基础上改色、加零件。
            </p>

            <label className="field">
              <span>作品名</span>
              <input
                value={title}
                maxLength={30}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：摸鱼小猫的下班时间"
              />
            </label>

            <label className="field">
              <span>说点什么（可选）</span>
              <textarea
                value={desc}
                maxLength={400}
                rows={3}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="用了多少颗豆、拼了多久、想对下一位复刻的人说什么…"
              />
              <em>{desc.length}/400</em>
            </label>

            <div className="field">
              <span>复刻定价</span>
              <div className="price-row">
                {[0, 30, 60, 120, 180].map((p) => (
                  <button
                    key={p}
                    className={`price-chip ${price === p ? 'on' : ''}`}
                    onClick={() => setPrice(p)}
                  >
                    {p === 0 ? '免费' : `${p} 豆币`}
                  </button>
                ))}
                <div className="price-input">
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

            <div className="publish-reward">
              <Icon name="coin" size={16} />
              发布即得 <b>+50 豆币</b>
              {project.guide && <span className="remix-note">会标注复刻自《{project.guide.title}》</span>}
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="publish-actions">
              <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
                再改改
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={busy || !user}>
                {busy ? (
                  <>
                    <span className="spinner" /> 正在挂上去…
                  </>
                ) : (
                  <>
                    <Icon name="sparkle" size={17} /> 确认发布
                  </>
                )}
              </button>
            </div>
            <p className="publish-fine">发布后仍可继续修改本机草稿；集市上的版本会保留发布时的样子。</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
