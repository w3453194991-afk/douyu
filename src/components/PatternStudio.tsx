import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ModalClose } from './Modal';
import { Icon } from './Icon';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { loadImageFile, imageToPattern, imageToGridPattern, type PatternOptions, type PatternResult, PATTERN_PRESETS } from '../lib/pattern';
import { openPdf, renderPdfPage } from '../lib/pdf';
import { detectGrid } from '../lib/gridDetect';
import { cmText } from '../lib/metrics';

type Source = { img: HTMLImageElement; url: string; name: string };

function PatternCanvas({ result }: { result: PatternResult }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const cell = Math.max(5, Math.min(12, Math.floor(620 / Math.max(result.width, result.height, 1))));
    const pad = 10;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = result.width * cell + pad * 2;
    const h = result.height * cell + pad * 2;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.aspectRatio = `${w} / ${h}`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#191b21';
    ctx.fillRect(0, 0, w, h);
    for (const b of result.beads) {
      const x = pad + b.x * cell + cell / 2;
      const y = pad + b.y * cell + cell / 2;
      if (cell >= 8) {
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.44, 0, Math.PI * 2);
        ctx.fillStyle = b.c;
        ctx.fill();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#191b21';
        ctx.fill();
      } else {
        ctx.fillStyle = b.c;
        ctx.fillRect(pad + b.x * cell, pad + b.y * cell, cell, cell);
      }
    }
    ctx.strokeStyle = 'rgba(245,194,79,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let x = 29; x < result.width; x += 29) {
      ctx.beginPath();
      ctx.moveTo(pad + x * cell, pad);
      ctx.lineTo(pad + x * cell, pad + result.height * cell);
      ctx.stroke();
    }
    for (let y = 29; y < result.height; y += 29) {
      ctx.beginPath();
      ctx.moveTo(pad, pad + y * cell);
      ctx.lineTo(pad + result.width * cell, pad + y * cell);
      ctx.stroke();
    }
  }, [result]);
  return <canvas ref={ref} className="pattern-preview-canvas" aria-label="图纸预览" />;
}

function PaletteStrip({ result }: { result: PatternResult }) {
  return (
    <div className="pattern-palette">
      {result.colors.slice(0, 10).map((c) => (
        <span className="pattern-palette-item" key={c.hex} title={`${c.code} ${c.name} · ${c.count} 颗`}>
          <i style={{ background: c.hex }} />
          <em>{c.count}</em>
        </span>
      ))}
      {result.colors.length > 10 && <span className="pattern-palette-more">+{result.colors.length - 10}</span>}
    </div>
  );
}

function PatternStudioBody({
  onClose,
  mini,
  onImported,
}: {
  onClose: () => void;
  mini: boolean;
  onImported?: () => void;
}) {
  const project = useStudio((s) => s.project);
  const importProject = useStudio((s) => s.importProject);
  const toast = useApp((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<any>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [options, setOptions] = useState<PatternOptions>({
    width: 48,
    colorLimit: 36,
    style: 'original',
    dither: false,
    dropBackground: false,
    bgTolerance: 28,
  });
  const [result, setResult] = useState<PatternResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [drag, setDrag] = useState(false);
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNote, setPdfNote] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ l: 0, t: 0, r: 1, b: 1 });
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'photo' | 'grid'>('photo');
  const [gridCols, setGridCols] = useState(29);
  const [gridRows, setGridRows] = useState(29);
  const [gridSkipWhite, setGridSkipWhite] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState('');

  const hasContent = project.loose.length > 0 || project.pieces.length > 0 || !!project.guide;

  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source.url);
    };
  }, [source]);

  useEffect(() => {
    return () => {
      try {
        pdfRef.current?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  useEffect(() => {
    setCropOpen(false);
    setCrop({ l: 0, t: 0, r: 1, b: 1 });
  }, [source]);

  useEffect(() => {
    if (!source || !cropOpen) {
      setCropUrl(null);
      return;
    }
    const sx = Math.round(source.img.naturalWidth * crop.l);
    const sy = Math.round(source.img.naturalHeight * crop.t);
    const sw = Math.max(1, Math.round(source.img.naturalWidth * (crop.r - crop.l)));
    const sh = Math.max(1, Math.round(source.img.naturalHeight * (crop.b - crop.t)));
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(source.img, sx, sy, sw, sh, 0, 0, sw, sh);
    setCropUrl(canvas.toDataURL('image/png'));
  }, [source, crop, cropOpen]);

  useEffect(() => {
    if (!source) return;
    setBusy(true);
    setError(null);
    const t = window.setTimeout(() => {
      try {
        setResult(
          mode === 'grid'
            ? imageToGridPattern(source.img, {
                cols: gridCols,
                rows: gridRows,
                colorLimit: options.colorLimit,
                skipWhite: gridSkipWhite,
              })
            : imageToPattern(source.img, options),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : '图片处理失败');
      } finally {
        setBusy(false);
      }
    }, 80);
    return () => window.clearTimeout(t);
  }, [source, options, mode, gridCols, gridRows, gridSkipWhite]);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf && !file.type.startsWith('image/')) {
      setError('请选择一张图片或 PDF 图纸');
      return;
    }
    if (file.size > 24 * 1024 * 1024) {
      setError('文件太大了，换一个 24MB 以内的');
      return;
    }
    if (isPdf) {
      setPdfBusy(true);
      setError(null);
      setPdfNote(null);
      try {
        try {
          pdfRef.current?.destroy?.();
        } catch {
          /* noop */
        }
        const { doc, pages } = await openPdf(file);
        pdfRef.current = doc;
        setPdfPages(pages);
        setPdfPage(1);
        const loaded = await renderPdfPage(doc, 1);
        setSource({ ...loaded, name: file.name });
        setTitle((file.name.replace(/\.pdf$/i, '') || 'PDF 图纸').slice(0, 24));
        setMode('grid');
        setPdfNote(
          pages > 1
            ? `PDF 共 ${pages} 页，已把第 1 页转成图片；可以在下面切页。`
            : 'PDF 已转成图片。图纸里的文字/网格不会被识别，会按图片自动配豆。',
        );
        setConfirm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'PDF 打不开');
      } finally {
        setPdfBusy(false);
      }
      return;
    }
    try {
      const loaded = await loadImageFile(file);
      setSource({ ...loaded, name: file.name });
      setTitle((file.name.replace(/\.[^.]+$/, '') || '照片图纸').slice(0, 24));
      setPdfPages(0);
      setPdfPage(1);
      setPdfNote(null);
      setConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片打不开');
    }
  };

  const changePdfPage = async (next: number) => {
    const doc = pdfRef.current;
    if (!doc || !source) return;
    const n = Math.max(1, Math.min(pdfPages, next));
    if (n === pdfPage) return;
    setPdfBusy(true);
    try {
      const loaded = await renderPdfPage(doc, n);
      setSource({ ...loaded, name: source.name });
      setPdfPage(n);
    } catch {
      setError('这一页渲染失败，换一页试试');
    } finally {
      setPdfBusy(false);
    }
  };

  const applyCrop = async () => {
    if (!cropUrl) return;
    const img = new Image();
    img.src = cropUrl;
    try {
      await img.decode();
      setSource({ img, url: cropUrl, name: source?.name || '裁剪图纸' });
      setCropOpen(false);
    } catch {
      setError('裁剪失败，再试一次');
    }
  };

  const setCropEdge = (key: 'l' | 't' | 'r' | 'b', value: number) => {
    const v = Math.max(0, Math.min(1, value / 100));
    setCrop((c) => {
      const next = { ...c, [key]: v };
      if (next.r - next.l < 0.06) {
        if (key === 'l') next.l = next.r - 0.06;
        else next.r = next.l + 0.06;
      }
      if (next.b - next.t < 0.06) {
        if (key === 't') next.t = next.b - 0.06;
        else next.b = next.t + 0.06;
      }
      return next;
    });
  };

  const autoDetectGrid = () => {
    if (!source) return;
    setDetecting(true);
    window.setTimeout(() => {
      try {
        const found = detectGrid(source.img);
        if (!found) {
          toast('error', '没猜出来', '先把图裁到网格外框，再手动填行列数');
          return;
        }
        setGridCols(found.cols);
        setGridRows(found.rows);
        toast('success', `猜是 ${found.cols} × ${found.rows} 格`, '不对的话直接改数字');
      } catch {
        toast('error', '猜不出来', '手动填一下行列数吧');
      } finally {
        setDetecting(false);
      }
    }, 30);
  };

  const aiCutout = async () => {
    if (!source || aiBusy) return;
    setAiBusy(true);
    setAiProgress('正在载入抠图模型…');
    try {
      const mod = await import('@imgly/background-removal');
      setAiProgress('正在识别主体…');
      const blob = await mod.removeBackground(source.url, {
        device: 'cpu',
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            setAiProgress(`正在载入模型 ${Math.round((current / total) * 100)}%`);
          } else if (key) {
            setAiProgress('正在识别主体…');
          }
        },
      });
      const file = new File([blob], 'ai-cutout.png', { type: 'image/png' });
      const loaded = await loadImageFile(file);
      setSource({ ...loaded, name: 'AI 抠图' });
      setMode('photo');
      toast('success', '主体抠出来了', '透明背景不会变成豆子；不满意可以再手动裁剪');
    } catch (e) {
      console.error('[ai-cutout]', e);
      toast(
        'error',
        'AI 抠图没有跑起来',
        e instanceof Error ? e.message.slice(0, 80) : '可能网络/模型加载失败；先用「裁剪」和「去背景强度」也行',
      );
    } finally {
      setAiBusy(false);
      setAiProgress('');
    }
  };

  const metrics = useMemo(() => {
    if (!result || !result.width) return null;
    return {
      cmW: result.width * 0.5,
      cmH: result.height * 0.5,
      boards: Math.max(1, Math.ceil(result.width / 29)) * Math.max(1, Math.ceil(result.height / 29)),
    };
  }, [result]);

  const doImport = () => {
    if (!result || !result.beads.length) return;
    if (hasContent && !confirm) {
      setConfirm(true);
      return;
    }
    importProject(result.beads, title || '照片图纸');
    toast('success', '图纸铺到板上了', `${result.total} 颗豆 · 可以逐颗改了`);
    onClose();
    onImported?.();
  };

  return (
    <div className={`pattern-studio ${mini ? 'mini-pattern' : ''}`}>
      <div className="pattern-head">
        <div>
          <span className="eyebrow">PHOTO / PDF TO BEADS</span>
          <h2>照片转图纸</h2>
          <p>选一张图或 PDF，自动配成豆屿色卡，再一颗一颗改。</p>
        </div>
        <div className="pattern-head-actions">
          {source && (
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              <Icon name="image" size={15} /> 换一张
            </button>
          )}
          <button className="modal-close icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={20} />
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf"
        hidden
        onChange={(e) => accept(e.target.files?.[0])}
      />

      {!source ? (
        <button
          className={`pattern-drop ${drag ? 'drag' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            accept(e.dataTransfer.files?.[0]);
          }}
        >
          <span className="pattern-drop-icon">
            <Icon name="image" size={30} />
          </span>
          <b>拖一张照片或 PDF 图纸进来，或点这里选择</b>
          <span>人物、宠物、插画、像素图、PDF 图纸都可以 · 只在本机处理</span>
          <em>JPG / PNG / WebP / PDF · 最大 24MB</em>
        </button>
      ) : (
        <div className="pattern-body">
          <div className="pattern-preview-col">
            <div className="pattern-preview-head">
              <span>预览</span>
              <span>{pdfBusy ? 'PDF 渲染中…' : busy ? '正在配豆…' : result ? `${result.width} × ${result.height} 格` : ''}</span>
            </div>
            <div className="pattern-preview">
              {result && result.total > 0 ? (
                <PatternCanvas result={result} />
              ) : (
                <div className="pattern-preview-empty">
                  {busy ? '正在配豆…' : '这张图里没有可用的豆子，换一张或关掉「自动去背景」'}
                </div>
              )}
            </div>
            {result && result.total > 0 && (
              <>
                <PaletteStrip result={result} />
                <div className="pattern-metrics">
                  <span>
                    <b>{result.total}</b> 颗
                  </span>
                  <span>
                    <b>{result.colors.length}</b> 色
                  </span>
                  {metrics && (
                    <span>
                      约 <b>{cmText(metrics.cmW)}×{cmText(metrics.cmH)}</b> cm
                    </span>
                  )}
                  {metrics && (
                    <span>
                      <b>{metrics.boards}</b> 块拼板
                    </span>
                  )}
                </div>
              </>
            )}
            <div className="pattern-source-row">
              <img className="pattern-source" src={source.url} alt="原图" />
              <div>
                <b>{pdfPages ? 'PDF 当前页' : '原图对照'}</b>
                <span>{source.name}</span>
              </div>
              <div className="pattern-source-actions">
                <button
                  className="pattern-ai-btn"
                  onClick={aiCutout}
                  disabled={aiBusy}
                  title="AI 自动抠掉背景（首次会下载模型）"
                >
                  <Icon name="sparkle" size={13} />
                  {aiBusy ? 'AI 处理中…' : 'AI 抠图'}
                </button>
                <button
                  className="pattern-crop-btn"
                  onClick={() => setCropOpen((v) => !v)}
                  title="裁掉主体以外的部分"
                >
                  <Icon name="edit" size={13} /> 裁剪
                </button>
              </div>
            </div>
            {aiProgress && <p className="pattern-ai-note">{aiProgress}</p>}
            {pdfPages > 1 && (
              <div className="pattern-pdf-pages">
                <button disabled={pdfBusy || pdfPage <= 1} onClick={() => changePdfPage(pdfPage - 1)}>
                  ‹
                </button>
                <span>
                  第 {pdfPage} / {pdfPages} 页
                </span>
                <button
                  disabled={pdfBusy || pdfPage >= pdfPages}
                  onClick={() => changePdfPage(pdfPage + 1)}
                >
                  ›
                </button>
              </div>
            )}
            {pdfNote && <p className="pattern-pdf-note">{pdfNote}</p>}
            {cropOpen && (
              <div className="pattern-crop-editor">
                <div className="pattern-crop-preview">
                  {cropUrl ? <img src={cropUrl} alt="裁剪预览" /> : <span>正在裁剪…</span>}
                </div>
                <div className="pattern-crop-sliders">
                  {[
                    { key: 'l', label: '左' },
                    { key: 't', label: '上' },
                    { key: 'r', label: '右' },
                    { key: 'b', label: '下' },
                  ].map((s) => (
                    <label key={s.key}>
                      <span>{s.label}</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(crop[s.key as 'l' | 't' | 'r' | 'b'] * 100)}
                        onChange={(e) => setCropEdge(s.key as 'l' | 't' | 'r' | 'b', Number(e.target.value))}
                      />
                      <b>{Math.round(crop[s.key as 'l' | 't' | 'r' | 'b'] * 100)}%</b>
                    </label>
                  ))}
                </div>
                <div className="pattern-crop-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setCropOpen(false)}>
                    取消
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={applyCrop}>
                    使用这块
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={`pattern-controls ${mode === 'grid' ? 'grid-mode' : ''}`}>
            <div className="pattern-mode">
              <button
                className={mode === 'photo' ? 'on' : ''}
                onClick={() => setMode('photo')}
              >
                照片配豆
              </button>
              <button className={mode === 'grid' ? 'on' : ''} onClick={() => setMode('grid')}>
                图纸网格
              </button>
            </div>

            <div className="pattern-control pattern-photo-only">
              <div className="pattern-label">
                <span>图纸大小</span>
                <b>{options.width} 格宽</b>
              </div>
              <input
                type="range"
                min={16}
                max={96}
                step={4}
                value={options.width}
                onChange={(e) => setOptions((o) => ({ ...o, width: Number(e.target.value) }))}
              />
              <div className="pattern-presets">
                {PATTERN_PRESETS.map((p) => (
                  <button
                    key={p.width}
                    className={options.width === p.width ? 'on' : ''}
                    onClick={() => setOptions((o) => ({ ...o, width: p.width }))}
                  >
                    {p.label}
                    <em>{p.width}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="pattern-control pattern-grid-only">
              <div className="pattern-label">
                <span>图纸网格</span>
                <b>
                  {gridCols} × {gridRows}
                </b>
              </div>
              <button className="pattern-detect" onClick={autoDetectGrid} disabled={detecting}>
                <Icon name="sparkle" size={13} />
                {detecting ? '正在看网格线…' : '自动猜行列'}
              </button>
              <div className="pattern-grid-size">
                <label>
                  列
                  <input
                    type="number"
                    min={4}
                    max={160}
                    value={gridCols}
                    onChange={(e) =>
                      setGridCols(Math.max(4, Math.min(160, Number(e.target.value) || 29)))
                    }
                  />
                </label>
                <label>
                  行
                  <input
                    type="number"
                    min={4}
                    max={160}
                    value={gridRows}
                    onChange={(e) =>
                      setGridRows(Math.max(4, Math.min(160, Number(e.target.value) || 29)))
                    }
                  />
                </label>
              </div>
              <div className="pattern-presets">
                {[
                  [29, 29],
                  [48, 48],
                  [58, 58],
                  [64, 64],
                ].map(([c, r]) => (
                  <button
                    key={`${c}-${r}`}
                    className={gridCols === c && gridRows === r ? 'on' : ''}
                    onClick={() => {
                      setGridCols(c);
                      setGridRows(r);
                    }}
                  >
                    {c}×{r}
                  </button>
                ))}
              </div>
              <p className="pattern-hint">
                先把图纸裁到网格外框，再填行列数；每格取中间 60% 的颜色，尽量避开网格线和坐标字。
              </p>
            </div>

            <div className="pattern-control">
              <div className="pattern-label">
                <span>用色数量</span>
                <b>{options.colorLimit >= 36 ? '全部色卡' : `${options.colorLimit} 色`}</b>
              </div>
              <div className="pattern-segment">
                {[8, 16, 24, 36].map((n) => (
                  <button
                    key={n}
                    className={options.colorLimit === n ? 'on' : ''}
                    onClick={() => setOptions((o) => ({ ...o, colorLimit: n }))}
                  >
                    {n === 36 ? '全部' : `${n} 色`}
                  </button>
                ))}
              </div>
              <p className="pattern-hint">色少更像像素画，色多更像照片；可以导入后再改。</p>
            </div>

            <div className="pattern-control pattern-photo-only">
              <div className="pattern-label">
                <span>照片风格</span>
              </div>
              <div className="pattern-segment">
                {[
                  { id: 'original', label: '原色' },
                  { id: 'crisp', label: '清晰' },
                  { id: 'soft', label: '柔和' },
                ].map((s) => (
                  <button
                    key={s.id}
                    className={options.style === s.id ? 'on' : ''}
                    onClick={() => setOptions((o) => ({ ...o, style: s.id as PatternOptions['style'] }))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pattern-switches pattern-photo-only">
              <button
                className={`pattern-switch ${options.dither ? 'on' : ''}`}
                onClick={() => setOptions((o) => ({ ...o, dither: !o.dither }))}
              >
                <span className="switch-dot" />
                <div>
                  <b>渐变抖动</b>
                  <em>照片过渡更自然，但豆子会更碎</em>
                </div>
              </button>
              <button
                className={`pattern-switch ${options.dropBackground ? 'on' : ''}`}
                onClick={() => setOptions((o) => ({ ...o, dropBackground: !o.dropBackground }))}
              >
                <span className="switch-dot" />
                <div>
                  <b>自动去背景</b>
                  <em>纯色商品图可以试试；主体和背景接近时关掉</em>
                </div>
              </button>
              {options.dropBackground && (
                <label className="pattern-tolerance">
                  <span>去背景强度</span>
                  <input
                    type="range"
                    min={10}
                    max={80}
                    step={2}
                    value={options.bgTolerance}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, bgTolerance: Number(e.target.value) }))
                    }
                  />
                  <b>{options.bgTolerance}</b>
                </label>
              )}
            </div>

            <div className="pattern-switches pattern-grid-only">
              <button
                className={`pattern-switch ${gridSkipWhite ? 'on' : ''}`}
                onClick={() => setGridSkipWhite((v) => !v)}
              >
                <span className="switch-dot" />
                <div>
                  <b>跳过白色空格</b>
                  <em>图纸上的白色格子不导入，留空</em>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="pattern-error">{error}</div>}

      <div className="pattern-footer">
        <label className="pattern-title">
          <span>作品名</span>
          <input
            value={title}
            maxLength={30}
            placeholder="照片图纸"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        {confirm && (
          <div className="pattern-confirm">
            <span>
              当前板上还有 {project.loose.length} 颗散豆、{project.pieces.length} 块零件，导入会替换它。
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>
              先留着
            </button>
          </div>
        )}
        <button
          className="btn btn-primary pattern-import"
          onClick={doImport}
          disabled={!result || !result.beads.length || busy || pdfBusy}
        >
          <Icon name="board" size={17} />
          {confirm ? '确认替换并导入' : '开新板并导入'}
        </button>
      </div>
    </div>
  );
}

export function PatternStudio({
  open,
  onClose,
  mini = false,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  mini?: boolean;
  onImported?: () => void;
}) {
  if (!open) return null;
  if (mini) {
    return (
      <div className="mini-pattern-layer">
        <PatternStudioBody onClose={onClose} mini onImported={onImported} />
      </div>
    );
  }
  return (
    <Modal open={open} onClose={onClose} className="pattern-modal" label="照片转图纸">
      <ModalClose onClick={onClose} />
      <PatternStudioBody onClose={onClose} mini={false} onImported={onImported} />
    </Modal>
  );
}
