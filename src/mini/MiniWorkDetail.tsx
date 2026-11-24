import React, { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Comment, WorkDetail } from '../types';
import { guideFromScene, piecesFromScene } from '../lib/scene';
import { formatNumber, timeAgo } from '../lib/render';
import { useApp } from '../appStore';
import { useStudio } from '../store';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Gallery';
import { MiniNav, MiniSheet, MiniPieceThumb, priceText } from './ui';
import { CommentText } from '../components/CommentText';
import { ReportBox } from '../components/ReportBox';

export function MiniWorkDetail({
  workId,
  onBack,
  onRemix,
}: {
  workId: string;
  onBack: () => void;
  onRemix: () => void;
}) {
  const user = useApp((s) => s.user);
  const setPoints = useApp((s) => s.setPoints);
  const toast = useApp((s) => s.toast);
  const project = useStudio((s) => s.project);
  const loadGuide = useStudio((s) => s.loadGuide);

  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemix, setConfirmRemix] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [collectBusy, setCollectBusy] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'work' | 'comment'; id: string; label: string } | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setComments([]);
    setCommentText('');
    setReplyTo(null);
    setReportTarget(null);
    setImageIndex(0);
    api
      .work(workId)
      .then((r) => {
        if (!alive) return;
        setWork(r.work);
        api
          .comments(workId)
          .then((res) => alive && setComments(res.comments))
          .catch(() => undefined);
      })
      .catch((e) => alive && setError(e?.message || '打不开这件作品'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [workId]);

  const parts = useMemo(() => (work?.scene ? piecesFromScene(work.scene) : []), [work?.scene]);
  const gallery = work?.images?.length ? work.images : work ? [work.coverUrl] : [];
  const galleryImage = gallery[imageIndex] || work?.coverUrl || '';
  const hasContent =
    project.loose.length > 0 || project.pieces.length > 0 || !!project.guide;

  const unlock = async () => {
    if (!work || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await api.unlock(work.id);
      setPoints(res.points);
      setWork(res.work);
      toast('success', `图纸解锁了，-${res.charged} 豆币`, '现在可以逐颗复刻');
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'POINTS') setNote(`还差 ${e.need ?? 0} 豆币，发布一件作品能赚 50。`);
        else setNote(e.message);
      } else setNote('解锁失败，稍后再试');
    } finally {
      setBusy(false);
    }
  };

  const beginRemix = (force = false) => {
    if (!work?.scene) return;
    if (hasContent && !force) {
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
    toast('success', '图纸铺在板上了', '照着淡影放豆，也可以换色');
    onRemix();
  };

  const toggleLike = async () => {
    if (!work || work.mine) {
      toast('info', '这是你自己的作品', '把心动留给别的岛民吧');
      return;
    }
    const prev = { liked: work.liked, likes: work.likes };
    setWork((w) => (w ? { ...w, liked: !w.liked, likes: w.likes + (w.liked ? -1 : 1) } : w));
    try {
      const res = await api.like(work.id);
      setWork((w) => (w ? { ...w, liked: res.liked, likes: res.likes } : w));
    } catch {
      setWork((w) => (w ? { ...w, ...prev } : w));
      toast('error', '心动没送到', '稍后再试');
    }
  };

  const toggleCollect = async () => {
    if (!work || collectBusy) return;
    const prev = { collected: work.collected, collects: work.collects };
    setCollectBusy(true);
    setWork((w) =>
      w ? { ...w, collected: !w.collected, collects: w.collects + (w.collected ? -1 : 1) } : w,
    );
    try {
      const res = await api.collect(work.id);
      setWork((w) => (w ? { ...w, collected: res.collected, collects: res.collects } : w));
      toast(res.collected ? 'success' : 'info', res.collected ? '收进收藏了' : '取消收藏');
    } catch {
      setWork((w) => (w ? { ...w, ...prev } : w));
      toast('error', '收藏没送到');
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

  const locked = work ? !work.unlocked : false;
  const enough = (user?.points ?? 0) >= (work?.price ?? 0);

  return (
    <div className="mini-detail">
      <MiniNav title="作品详情" onBack={onBack} />

      {loading ? (
        <div className="mini-loading">正在打开…</div>
      ) : error || !work ? (
        <div className="mini-empty">
          <span className="mini-empty-icon">
            <Icon name="info" size={24} />
          </span>
          <b>打不开这件作品</b>
          <p>{error || '它可能已经不在岛上了'}</p>
          <button className="mini-button ghost small" onClick={onBack}>
            回去逛逛
          </button>
        </div>
      ) : (
        <>
          <div className="mini-detail-scroll">
            <div className="mini-detail-cover">
              <img src={galleryImage || work.coverUrl} alt={work.title} />
              {gallery.length > 1 && (
                <div className="mini-gallery-dots">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      className={i === imageIndex ? 'on' : ''}
                      onClick={() => setImageIndex(i)}
                      aria-label={`第 ${i + 1} 张`}
                    />
                  ))}
                </div>
              )}
              <span
                className={`mini-price ${
                  work.mine ? 'mine' : work.price === 0 ? 'free' : work.unlocked ? 'unlocked' : ''
                }`}
              >
                {work.price > 0 && !work.mine && !work.unlocked && <Icon name="coin" size={10} />}
                {priceText(work)}
              </span>
            </div>

            <h1>{work.title}</h1>
            <div className="mini-author">
              <Avatar
                name={work.author.name}
                color={work.author.avatarColor}
                emoji={work.author.avatarEmoji}
                size={24}
              />
              <b>{work.author.name}</b>
              <span>
                {timeAgo(work.createdAt)} · {work.sales} 人复刻
              </span>
              <button
                className={`mini-collect ${work.collected ? 'on' : ''}`}
                onClick={toggleCollect}
                disabled={collectBusy}
                aria-label={work.collected ? '取消收藏' : '收藏'}
              >
                <Icon name="bookmark" size={13} filled={work.collected} />
                {work.collects || 0}
              </button>
              {work.mine && <span className="mini-mine">我的作品</span>}
            </div>

            <p className="mini-desc">{work.desc || '作者没有留下说明。'}</p>

            {work.source && (
              <span className="mini-source">
                <Icon name="layers" size={11} />
                复刻自《{work.source.title}》· @{work.source.author}
              </span>
            )}

            <div className="mini-facts">
              <span>
                <b>{work.partCount}</b> 块零件
              </span>
              <span>
                <b>{formatNumber(work.beadCount)}</b> 颗豆
              </span>
              <span>
                <b>{work.price === 0 ? '免费' : work.price}</b> {work.price === 0 ? '图纸' : '豆币'}
              </span>
            </div>

            {work.unlocked ? (
              <div className="mini-parts">
                <div className="mini-parts-head">
                  <b>图纸包含 {work.partCount} 块零件</b>
                  <span>每块可单独熨烫</span>
                </div>
                <div className="mini-parts-strip">
                  {parts.map((p) => (
                    <div className="mini-part" key={p.id}>
                      <MiniPieceThumb piece={p} size={64} />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mini-locked">
                <span>
                  <Icon name="lock" size={17} />
                </span>
                <div>
                  <b>{work.partCount} 块零件的逐颗图纸</b>
                  <p>解锁后展开成蓝图，你一颗一颗放豆复刻</p>
                </div>
              </div>
            )}

            <div className="mini-steps">
              <div>
                <span>01</span>
                <b>展开蓝图</b>
                <p>原作零件以淡影铺在板上</p>
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

            {locked ? (
              <p className="mini-unlock-note">
                你有 <b>{user?.points ?? 0}</b> 豆币
                {!enough ? (
                  <>
                    ，还差 <b>{work.price - (user?.points ?? 0)}</b> 豆币。去发布一件作品赚一点吧。
                  </>
                ) : (
                  <>，解锁后可以逐颗复刻，也能在原作者的基础上改。</>
                )}
              </p>
            ) : (
              <p className="mini-unlock-note">
                复刻会以淡色蓝图展开全部零件。照原色放，也可以换色、加零件，做出自己的版本。
              </p>
            )}

            {note && <div className="mini-form-error" style={{ marginTop: 9 }}>{note}</div>}

            <div className="mini-comments">
              <div className="mini-comments-head">
                <b>
                  <Icon name="message" size={13} /> 留言
                </b>
                <span>{work.commentCount || comments.length}</span>
              </div>
              {comments.length === 0 ? (
                <p className="mini-comments-empty">还没有留言。说说你想用什么颜色复刻？</p>
              ) : (
                <div className="mini-comments-list">
                  {comments.map((c) => (
                    <div className="mini-comment" key={c.id}>
                      <Avatar
                        name={c.author.name}
                        color={c.author.avatarColor}
                        emoji={c.author.avatarEmoji}
                        size={22}
                      />
                      <div>
                        <div className="mini-comment-meta">
                          <b>{c.author.name}</b>
                          <span>{timeAgo(c.createdAt)}</span>
                          <button onClick={() => setReplyTo(c)} title="回复留言">
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
                          <span className="mini-comment-replyto">回复 @{c.replyTo.author.name}</span>
                        )}
                        <p>
                          <CommentText text={c.body} />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mini-comment-compose">
                {replyTo && (
                  <span className="mini-reply-chip">
                    回复 @{replyTo.author.name}
                    <button onClick={() => setReplyTo(null)}>×</button>
                  </span>
                )}
                <textarea
                  value={commentText}
                  maxLength={280}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={replyTo ? `回复 @${replyTo.author.name}…` : '留一句给作者或下一位复刻的人…'}
                />
                <button
                  className="mini-button ghost small"
                  title="提到作者"
                  onClick={() =>
                    setCommentText((t) => `${t}${t ? ' ' : ''}@${replyTo?.author.name || work.author.name} `)
                  }
                >
                  @
                </button>
                <button
                  className="mini-button primary small"
                  onClick={submitComment}
                  disabled={commentBusy || !commentText.trim()}
                >
                  {commentBusy ? '…' : '发送'}
                </button>
              </div>
              <button
                className="mini-report-link"
                onClick={() => setReportTarget({ type: 'work', id: work.id, label: work.title })}
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
                  toast('success', '举报收到了', '谢谢帮忙维护岛上环境');
                  setReportTarget(null);
                }}
              />
            </div>
          </div>

          <div className="mini-detail-bar">
            <button className={`mini-like-btn ${work.liked ? 'on' : ''}`} onClick={toggleLike}>
              <Icon name="heart" size={18} filled={work.liked} />
              {work.likes}
            </button>
            {work.unlocked ? (
              <button className="mini-button primary" onClick={() => beginRemix()}>
                <Icon name="sparkle" size={16} />
                {work.mine ? '继续改造这张图纸' : '开始逐颗复刻'}
              </button>
            ) : (
              <button className="mini-button primary" onClick={unlock} disabled={busy || !enough}>
                {busy ? '解锁中…' : `解锁图纸 · ${work.price} 豆币`}
              </button>
            )}
          </div>

          <MiniSheet
            open={confirmRemix}
            title="工作台上有东西"
            onClose={() => setConfirmRemix(false)}
          >
            <p style={{ fontSize: 11, lineHeight: 1.75, color: 'var(--ink-2)' }}>
              开始复刻会替换当前的 {project.loose.length} 颗散豆和 {project.pieces.length} 块零件。
              已经发布到集市的作品不会丢。
            </p>
            <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
              <button className="mini-button ghost" style={{ flex: 1 }} onClick={() => setConfirmRemix(false)}>
                先留着
              </button>
              <button className="mini-button primary" style={{ flex: 1 }} onClick={() => beginRemix(true)}>
                替换，开始复刻
              </button>
            </div>
          </MiniSheet>
        </>
      )}
    </div>
  );
}
