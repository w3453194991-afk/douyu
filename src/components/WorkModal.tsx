import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { api, ApiError } from '../lib/api';
import type { Comment, Piece, WorkDetail } from '../types';
import { guideFromScene, piecesFromScene } from '../lib/scene';
import { drawPieceThumb, formatNumber, timeAgo } from '../lib/render';
import { Modal, ModalClose } from './Modal';
import { Icon } from './Icon';
import { Avatar } from './Gallery';
import { CommentText } from './CommentText';
import { ReportBox } from './ReportBox';

function SceneThumb({ piece, index }: { piece: Piece; index: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawPieceThumb(ref.current, piece, { padding: 6 });
  }, [piece]);
  return (
    <div className="part-thumb">
      <canvas ref={ref} aria-hidden="true" />
      <span>{piece.name || `零件 ${index + 1}`}</span>
    </div>
  );
}

export function WorkModal() {
  const workId = useApp((s) => s.activeWorkId);
  const openWork = useApp((s) => s.openWork);
  const setView = useApp((s) => s.setView);
  const setPoints = useApp((s) => s.setPoints);
  const user = useApp((s) => s.user);
  const toast = useApp((s) => s.toast);
  const loadGuide = useStudio((s) => s.loadGuide);
  const project = useStudio((s) => s.project);

  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [collectBusy, setCollectBusy] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'work' | 'comment'; id: string; label: string } | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [confirmRemix, setConfirmRemix] = useState(false);

  useEffect(() => {
    if (!workId) {
      setWork(null);
      return;
    }
    let alive = true;
    setWork(null);
    setLoading(true);
    setError(null);
    setNote(null);
    setConfirmRemix(false);
    api
      .work(workId)
      .then((res) => {
        if (alive) setWork(res.work);
      })
      .catch((e) => {
        if (alive) setError(e instanceof ApiError ? e.message : '打不开这件作品');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [workId]);

  useEffect(() => {
    if (!workId) {
      setComments([]);
      return;
    }
    let alive = true;
    setComments([]);
    setCommentText('');
    setReplyTo(null);
    setReportTarget(null);
    setImageIndex(0);
    api
      .comments(workId)
      .then((res) => {
        if (alive) setComments(res.comments);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [workId]);

  const scenePieces = useMemo(
    () => (work?.scene ? piecesFromScene(work.scene) : []),
    [work?.scene],
  );
  const gallery = work?.images?.length ? work.images : work ? [work.coverUrl] : [];
  const galleryImage = gallery[imageIndex] || work?.coverUrl || '';

  const hasStudioContent =
    project.loose.length > 0 || project.pieces.length > 0 || !!project.guide;

  const close = () => openWork(null);

  const unlock = async () => {
    if (!work || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await api.unlock(work.id);
      setPoints(res.points);
      setWork(res.work);
      toast('success', `图纸解锁了，-${res.charged} 豆币`, '现在可以逐颗复刻，也可以改色');
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'POINTS') setNote(`还差 ${e.need ?? 0} 豆币。发布一件作品能赚 50 豆币。`);
        else setNote(e.message);
      } else {
        setNote('解锁失败，稍后再试');
      }
    } finally {
      setBusy(false);
    }
  };

  const beginRemix = (force = false) => {
    if (!work?.scene) return;
    if (hasStudioContent && !force) {
      setConfirmRemix(true);
      return;
    }
    loadGuide(
      guideFromScene(work.scene, {
        workId: work.id,
        title: work.title,
        author: work.author.name,
        price: work.price,
      }),
      `《${work.title}》复刻`,
    );
    openWork(null);
    setView('studio');
    toast('success', '图纸在板上铺开了', '淡淡的影子就是原作，照着放豆；换色也行');
  };

  const toggleLike = async () => {
    if (!work || likeBusy) return;
    if (work.mine) {
      toast('info', '这是你自己的作品', '把心动留给别的豆友吧');
      return;
    }
    const prev = { liked: work.liked, likes: work.likes };
    setLikeBusy(true);
    setWork((w) => (w ? { ...w, liked: !w.liked, likes: w.likes + (w.liked ? -1 : 1) } : w));
    try {
      const res = await api.like(work.id);
      setWork((w) => (w ? { ...w, liked: res.liked, likes: res.likes } : w));
    } catch {
      setWork((w) => (w ? { ...w, ...prev } : w));
      toast('error', '心动没送到', '稍后再试一次');
    } finally {
      setLikeBusy(false);
    }
  };

  const toggleCollect = async () => {
    if (!work || collectBusy) return;
    const prev = { collected: work.collected, collects: work.collects };
    setCollectBusy(true);
    setWork((w) =>
      w
        ? { ...w, collected: !w.collected, collects: w.collects + (w.collected ? -1 : 1) }
        : w,
    );
    try {
      const res = await api.collect(work.id);
      setWork((w) => (w ? { ...w, collected: res.collected, collects: res.collects } : w));
      toast(res.collected ? 'success' : 'info', res.collected ? '收进收藏了' : '取消收藏');
    } catch {
      setWork((w) => (w ? { ...w, ...prev } : w));
      toast('error', '收藏没送到', '稍后再试一次');
    } finally {
      setCollectBusy(false);
    }
  };

  const submitComment = async () => {
    if (!work || commentBusy) return;
    const body = commentText.trim();
    if (!body) return;
    setCommentBusy(true);
    try {
      const res = await api.comment(work.id, body, replyTo?.id || null);
      setComments((list) => [...list, res.comment]);
      setWork((w) => (w ? { ...w, commentCount: res.commentCount } : w));
      setCommentText('');
      setReplyTo(null);
    } catch (e) {
      toast('error', '留言没送到', e instanceof ApiError ? e.message : '稍后再试');
    } finally {
      setCommentBusy(false);
    }
  };

  const removeComment = async (id: string) => {
    if (!work) return;
    try {
      const res = await api.deleteComment(id);
      setComments((list) => list.filter((c) => c.id !== id));
      setWork((w) => (w ? { ...w, commentCount: res.commentCount } : w));
    } catch {
      toast('error', '删不掉这条留言');
    }
  };

  if (!workId) return null;

  return (
    <Modal open={!!workId} onClose={close} className="work-modal" closeOnBackdrop={!busy} label="作品详情">
      <ModalClose onClick={close} />
      {loading && (
        <div className="work-loading">
          <span className="spinner dark" />
          正在打开这件作品…
        </div>
      )}
      {error && !loading && (
        <div className="work-loading">
          <Icon name="info" size={26} />
          <p>{error}</p>
          <button className="btn btn-primary" onClick={close}>
            回去逛逛
          </button>
        </div>
      )}
      {work && !loading && (
        <div className="work-modal-grid">
          <div className="work-visual">
            <div
              className="visual-bg"
              style={{ backgroundImage: `url(${galleryImage || work.coverUrl})` }}
              aria-hidden="true"
            />
            <img src={galleryImage || work.coverUrl} alt={work.title} />
            {gallery.length > 1 && (
              <div className="work-gallery-nav">
                <button
                  disabled={imageIndex <= 0}
                  onClick={() => setImageIndex((i) => Math.max(0, i - 1))}
                  aria-label="上一张"
                >
                  ‹
                </button>
                <span>
                  {imageIndex + 1} / {gallery.length}
                </span>
                <button
                  disabled={imageIndex >= gallery.length - 1}
                  onClick={() => setImageIndex((i) => Math.min(gallery.length - 1, i + 1))}
                  aria-label="下一张"
                >
                  ›
                </button>
              </div>
            )}
            <div className="visual-caption">
              <span className="visual-brand">
                <Icon name="camera" size={14} /> 玩家成品截图
              </span>
              <a
                className="visual-download"
                href={galleryImage || work.coverUrl}
                download={`${work.title}-豆屿.jpg`}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="download" size={15} />
                保存
              </a>
            </div>
            {gallery.length > 1 && (
              <div className="work-thumbs">
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    className={i === imageIndex ? 'on' : ''}
                    onClick={() => setImageIndex(i)}
                    aria-label={`第 ${i + 1} 张`}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="work-info">
            <div className="work-author-row">
              <Avatar
                name={work.author.name}
                color={work.author.avatarColor}
                emoji={work.author.avatarEmoji}
                size={30}
              />
              <div className="work-author-meta">
                <b>{work.author.name}</b>
                <span>
                  {timeAgo(work.createdAt)} · {work.sales} 人复刻过
                </span>
              </div>
              {work.mine && <span className="mine-chip">我的作品</span>}
            </div>

            <h1>{work.title}</h1>
            <p className="work-desc">{work.desc || '作者没有留下说明。'}</p>

            {work.source && (
              <button className="source-link" onClick={() => openWork(work.source!.workId)}>
                <Icon name="layers" size={14} />
                复刻自《{work.source.title}》· @{work.source.author}
              </button>
            )}

            <div className="work-facts">
              <span>
                <b>{work.partCount}</b> 块零件
              </span>
              <span>
                <b>{formatNumber(work.beadCount)}</b> 颗豆
              </span>
              <span>
                <b>{work.price === 0 ? '免费' : `${work.price} 豆币`}</b> 复刻价
              </span>
            </div>

            {work.unlocked ? (
              <div className="parts-section">
                <div className="parts-head">
                  <b>图纸包含 {work.partCount} 块零件</b>
                  <span>每块都能单独熨烫、单独拿起来</span>
                </div>
                <div className="parts-strip">
                  {scenePieces.map((p, i) => (
                    <SceneThumb key={p.id} piece={p} index={i} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="locked-strip">
                <span className="locked-icon">
                  <Icon name="lock" size={20} />
                </span>
                <div>
                  <b>{work.partCount} 块零件的逐颗图纸</b>
                  <span>解锁后展开成蓝图，你一颗一颗放豆复刻</span>
                </div>
              </div>
            )}

            <div className="work-actions">
              <button
                className={`collect-btn ${work.collected ? 'on' : ''}`}
                onClick={toggleCollect}
                disabled={collectBusy}
                title={work.collected ? '取消收藏' : '收藏这件作品'}
              >
                <Icon name="bookmark" size={19} filled={work.collected} />
                {work.collects || 0}
              </button>
              <button
                className={`like-btn ${work.liked ? 'on' : ''}`}
                onClick={toggleLike}
                disabled={likeBusy || work.mine}
                title={work.mine ? '不能给自己的作品点赞' : work.liked ? '取消心动' : '心动'}
              >
                <Icon name="heart" size={20} filled={work.liked} />
                {work.likes}
              </button>

              {work.unlocked ? (
                <button className="btn btn-primary btn-lg" onClick={() => beginRemix()}>
                  <Icon name="sparkle" size={18} />
                  {work.mine ? '继续改造这张图纸' : '开始逐颗复刻'}
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={unlock}
                  disabled={busy || (user?.points ?? 0) < work.price}
                >
                  {busy ? (
                    <>
                      <span className="spinner" /> 解锁中…
                    </>
                  ) : (
                    <>
                      <Icon name="unlock" size={18} />
                      解锁图纸 · {work.price} 豆币
                    </>
                  )}
                </button>
              )}
            </div>

            {!work.unlocked && (
              <p className="unlock-note">
                你有 <b>{user?.points ?? 0}</b> 豆币
                {user && user.points < work.price ? (
                  <>
                    ，还差 <b>{work.price - user.points}</b> 豆币。
                    <button
                      className="inline-link"
                      onClick={() => {
                        openWork(null);
                        setView('studio');
                      }}
                    >
                      去发布作品赚豆币
                    </button>
                  </>
                ) : (
                  <>，解锁后可以逐颗复刻，也能在原作者的基础上改。</>
                )}
              </p>
            )}

            {work.unlocked && (
              <p className="unlock-note">
                复刻会以淡色蓝图展开全部零件。你可以照原色放，也可以换色、加零件，做出自己的版本。
              </p>
            )}

            <div className="remix-steps">
              <div>
                <span>01</span>
                <b>展开蓝图</b>
                <p>原作零件会以淡影铺在板上</p>
              </div>
              <div>
                <span>02</span>
                <b>逐颗放豆</b>
                <p>照着摆，也可以换色加减</p>
              </div>
              <div>
                <span>03</span>
                <b>熨烫重拼</b>
                <p>做成你自己的立体版本</p>
              </div>
            </div>

            {confirmRemix && (
              <div className="overwrite-box">
                <b>工作台上已经有东西了</b>
                <p>
                  开始复刻会替换当前的 {project.loose.length} 颗散豆和 {project.pieces.length}{' '}
                  块零件。已经发布到集市的作品不会丢。
                </p>
                <div className="overwrite-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemix(false)}>
                    先留着
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => beginRemix(true)}>
                    替换，开始复刻
                  </button>
                </div>
              </div>
            )}

            {note && <div className="work-note">{note}</div>}

            <div className="work-comments">
              <div className="work-comments-head">
                <b>
                  <Icon name="message" size={15} /> 留言
                </b>
                <span>{work.commentCount || comments.length}</span>
              </div>
              {comments.length === 0 ? (
                <p className="work-comments-empty">还没有留言。说说你想用什么颜色复刻？</p>
              ) : (
                <div className="work-comments-list">
                  {comments.map((c) => (
                    <div className="work-comment" key={c.id}>
                      <Avatar
                        name={c.author.name}
                        color={c.author.avatarColor}
                        emoji={c.author.avatarEmoji}
                        size={24}
                      />
                      <div>
                        <div className="work-comment-meta">
                          <b>{c.author.name}</b>
                          <span>{timeAgo(c.createdAt)}</span>
                          <button
                            className="work-comment-reply-btn"
                            onClick={() => setReplyTo(c)}
                            title="回复这条留言"
                          >
                            回复
                          </button>
                          {(c.mine || work.mine) && (
                            <button onClick={() => removeComment(c.id)} title="删除留言">
                              删除
                            </button>
                          )}
                          {!c.mine && !work.mine && (
                            <button
                              onClick={() =>
                                setReportTarget({
                                  type: 'comment',
                                  id: c.id,
                                  label: '这条留言',
                                })
                              }
                            >
                              举报
                            </button>
                          )}
                        </div>
                        {c.replyTo && (
                          <span className="work-comment-replyto">
                            回复 @{c.replyTo.author.name}
                          </span>
                        )}
                        <p>
                          <CommentText text={c.body} />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="work-comment-compose">
                {replyTo && (
                  <span className="work-reply-chip">
                    回复 @{replyTo.author.name}
                    <button onClick={() => setReplyTo(null)}>×</button>
                  </span>
                )}
                <textarea
                  value={commentText}
                  maxLength={280}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={replyTo ? `回复 @${replyTo.author.name}…` : '留一句给作者或下一位复刻的人…'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      submitComment();
                    }
                  }}
                />
                <button
                  className="work-at-btn"
                  title="提到作者"
                  onClick={() =>
                    setCommentText((t) => `${t}${t ? ' ' : ''}@${replyTo?.author.name || work.author.name} `)
                  }
                >
                  @
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={submitComment}
                  disabled={commentBusy || !commentText.trim()}
                >
                  {commentBusy ? '发送中…' : '发送'}
                </button>
              </div>
              <button
                className="work-report-link"
                onClick={() =>
                  setReportTarget({ type: 'work', id: work.id, label: work.title })
                }
              >
                举报作品
              </button>
              <ReportBox
                open={!!reportTarget}
                label={reportTarget?.label || ''}
                onClose={() => setReportTarget(null)}
                onSubmit={async (reason) => {
                  if (!reportTarget) return;
                  await api.report(reportTarget.type, reportTarget.id, reason);
                  toast('success', '举报收到了', '我们会看看；感谢你帮忙维护岛上环境');
                  setReportTarget(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
