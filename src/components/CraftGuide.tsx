import React from 'react';
import { Modal, ModalClose } from './Modal';
import { Icon } from './Icon';
import { useStudio } from '../store';

function GuideBody({ onClose, mini }: { onClose: () => void; mini: boolean }) {
  const showBoards = useStudio((s) => s.showBoards);
  const setShowBoards = useStudio((s) => s.setShowBoards);

  return (
    <div className={`craft-guide ${mini ? 'mini-craft' : ''}`}>
      <div className="pattern-head">
        <div>
          <span className="eyebrow">FIELD NOTES</span>
          <h2>拼板与熨烫</h2>
          <p>从图纸到实物，少走一点弯路。</p>
        </div>
        <div className="pattern-head-actions">
          <button className="modal-close icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={20} />
          </button>
        </div>
      </div>

      <div className="craft-intro">
        <span className="craft-intro-icon">
          <Icon name="board" size={22} />
        </span>
        <div>
          <b>标准方形拼板是 29 × 29 格</b>
          <p>
            5mm 中豆一格约 0.5cm，一块满板约 14.5 × 14.5cm。大图按 29 格分区，先拼接缝再填色，
            不容易错位。
          </p>
        </div>
      </div>

      <div className="craft-steps">
        {[
          {
            n: '01',
            t: '先看图纸',
            d: '按色号分堆，把外轮廓和一格格边界先摆出来，再填大面积颜色。',
          },
          {
            n: '02',
            t: '按色填豆',
            d: '一种颜色填完再换下一种。色号清单上的数字是颗数，按 1000 颗/包多备 10%。',
          },
          {
            n: '03',
            t: '多板拼接',
            d: '超过 29×29 时，先拼相邻两块板的接缝，对齐后再往两边铺。',
          },
          {
            n: '04',
            t: '熨烫定型',
            d: '垫熨烫纸，中温打圈 10–20 秒；翻面再熨一次，趁热用厚书压平。',
          },
        ].map((s) => (
          <div className="craft-step" key={s.n}>
            <span>{s.n}</span>
            <div>
              <b>{s.t}</b>
              <p>{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="craft-tape">
        <div className="craft-tape-head">
          <span className="craft-tape-badge">大图推荐</span>
          <b>美纹纸胶带法</b>
          <span>不伤拼板，接缝更平</span>
        </div>
        <ol>
          <li>把拼板放在硬纸板/切割垫上，拼完检查一遍。</li>
          <li>用米色美纹纸一条压一条贴满，重叠约 6mm，用勺子背压紧。</li>
          <li>
            <b>关键一步：</b>用针或反面拼板在每个豆孔扎透气孔，否则熨烫会鼓包。
          </li>
          <li>盖上硬板翻面，揭下拼板；垫熨烫纸先熨有胶带的一面，再揭胶带熨正面。</li>
          <li>趁热用书压平，完全冷却后再拿起来。</li>
        </ol>
        <p className="craft-warn">
          <Icon name="info" size={14} />
          不要用蓝色美纹纸或透明胶带；蓝色粘性太弱，透明胶带遇热会化。熨斗不要直接压在塑料拼板上。
        </p>
      </div>

      <div className="craft-board-toggle">
        <div>
          <b>在板上显示 29×29 拼板线</b>
          <p>按实物拼板分区，图纸再大也不会拼错格。</p>
        </div>
        <button
          className={`switch ${showBoards ? 'on' : ''}`}
          onClick={() => setShowBoards(!showBoards)}
          aria-pressed={showBoards}
        >
          <span />
        </button>
      </div>

      <div className="craft-foot">
        <span>
          <Icon name="check" size={13} /> 已经在板上帮你数好颗数、分好板
        </span>
        <button className="btn btn-primary" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}

export function CraftGuide({
  open,
  onClose,
  mini = false,
}: {
  open: boolean;
  onClose: () => void;
  mini?: boolean;
}) {
  if (!open) return null;
  if (mini) {
    return (
      <div className="mini-pattern-layer">
        <GuideBody onClose={onClose} mini />
      </div>
    );
  }
  return (
    <Modal open={open} onClose={onClose} className="guide-modal" label="拼板与熨烫教程">
      <ModalClose onClick={onClose} />
      <GuideBody onClose={onClose} mini={false} />
    </Modal>
  );
}
