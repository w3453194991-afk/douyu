import React, { useEffect, useState } from 'react';
import { useStudio } from '../store';
import { useApp } from '../appStore';
import { captureCover } from '../lib/capture';
import { TopBar } from './TopBar';
import { BoardView } from './BoardView';
import { AssemblyView } from './AssemblyView';
import { ToolRail } from './ToolRail';
import { PaletteDock } from './PaletteDock';
import { SidePanel } from './SidePanel';
import { PublishDialog } from './PublishDialog';
import { PatternStudio } from './PatternStudio';
import { PatternReport } from './PatternReport';
import { CraftGuide } from './CraftGuide';
import { InventoryDialog } from './InventoryDialog';
import { Modal, ModalClose } from './Modal';
import { Icon } from './Icon';

export function Studio() {
  const mode = useStudio((s) => s.mode);
  const setMode = useStudio((s) => s.setMode);
  const setTool = useStudio((s) => s.setTool);
  const [publishImage, setPublishImage] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const piecesCount = useStudio((s) => s.project.pieces.length);
  const looseCount = useStudio((s) => s.project.loose.length);
  const hasGuide = useStudio((s) => !!s.project.guide);
  const isEmpty = piecesCount === 0 && looseCount === 0 && !hasGuide;
  const toast = useApp((s) => s.toast);
  const setView = useApp((s) => s.setView);

  useEffect(() => {
    setPanelOpen(false);
  }, [mode]);

  const handlePublish = () => {
    if (mode !== 'assembly') {
      const st = useStudio.getState();
      if (!st.project.pieces.length && !st.project.loose.length) {
        toast('info', '还没有零件', '先放豆，按 Enter 熨一块出来');
        return;
      }
      const res = st.enterAssembly();
      toast(
        'success',
        res.ironed ? `熨出 ${res.ironed} 块零件，先找个好角度` : '先找个好角度',
        '在立体拼装台按「拍下成品」，就能发布了',
      );
      return;
    }
    const img = captureCover();
    if (!img) {
      toast('error', '截图失败', '先在台上摆几块零件，再试一次');
      return;
    }
    setPublishImage(img);
  };

  const requestNewBoard = () => {
    const p = useStudio.getState().project;
    if (!p.loose.length && !p.pieces.length && !p.guide) {
      useStudio.getState().newProject();
      toast('success', '新板子铺好了', '无限大，随便放');
      return;
    }
    setConfirmNew(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA|SELECT|BUTTON/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (document.querySelector('.modal-backdrop')) return;
      const st = useStudio.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        st.redo();
        return;
      }
      if (mod || e.altKey) return;

      const key = e.key.toLowerCase();
      if (st.mode === 'board') {
        if (key === 'b') st.setTool('bead');
        else if (key === 'e') st.setTool('erase');
        else if (key === 'i') st.setTool('pick');
        else if (key === 'm') st.setTool('select');
        else if (key === 'h') st.setTool('pan');
        else if (key === 'enter') {
          e.preventDefault();
          const n = st.ironAll();
          if (n) toast('success', `滋啦——熨出了 ${n} 块零件`, '去立体拼装把它们立起来');
          else toast('info', '板上还没有散豆');
        } else if (key === 'delete' || key === 'backspace') {
          if (st.selection) {
            e.preventDefault();
            const n = st.deleteSelection();
            if (n) toast('info', `收走了 ${n} 颗豆`);
          }
        } else if (key === 'escape') {
          st.clearSelection();
          st.selectPiece(null);
        } else if (key === '[') {
          st.setBrush(st.brush - 1);
        } else if (key === ']') {
          st.setBrush(st.brush + 1);
        }
      } else if (key === 'escape') {
        st.selectPiece(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toast]);

  return (
    <div className="studio">
      <TopBar
        onPublish={handlePublish}
        onPattern={() => setPatternOpen(true)}
        onReport={() => setReportOpen(true)}
        onGuide={() => setGuideOpen(true)}
      />
      <div className="studio-body">
        {mode === 'board' ? (
          <div className={`stage-wrap ${isEmpty ? 'stage-empty' : ''}`}>
            <BoardView
              onEmptyAction={(action) => {
                if (action === 'gallery') setView('gallery');
                else {
                  setTool('bead');
                  toast('info', '找一个空位，点一下', '拖动可以连续铺豆');
                }
              }}
            />
            <ToolRail />
            <PaletteDock />
          </div>
        ) : (
          <div className="stage-wrap assembly-wrap">
            <AssemblyView onPublish={(img) => setPublishImage(img)} />
          </div>
        )}
        <SidePanel
          onNewBoard={requestNewBoard}
          onPattern={() => setPatternOpen(true)}
          onReport={() => setReportOpen(true)}
          onGuide={() => setGuideOpen(true)}
          onInventory={() => setInventoryOpen(true)}
          className={panelOpen ? 'open' : ''}
          onClose={() => setPanelOpen(false)}
        />
      </div>

      <button
        className="mobile-panel-btn"
        onClick={() => setPanelOpen(true)}
        aria-label="打开零件和工作台"
      >
        <Icon name="layers" size={17} />
        零件 {piecesCount}
        {looseCount > 0 && <span className="mobile-panel-dot">{looseCount}</span>}
      </button>
      {panelOpen && <div className="mobile-scrim" onClick={() => setPanelOpen(false)} />}

      <PublishDialog image={publishImage} onClose={() => setPublishImage(null)} />
      <PatternStudio
        open={patternOpen}
        onClose={() => setPatternOpen(false)}
        onImported={() => {
          setPatternOpen(false);
          setPanelOpen(false);
        }}
      />
      <PatternReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onGuide={() => {
          setReportOpen(false);
          setGuideOpen(true);
        }}
        onInventory={() => {
          setReportOpen(false);
          setInventoryOpen(true);
        }}
      />
      <CraftGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
      <InventoryDialog
        open={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
      />

      <Modal open={confirmNew} onClose={() => setConfirmNew(false)} className="confirm-modal" label="新建板子">
        <ModalClose onClick={() => setConfirmNew(false)} />
        <div className="confirm-icon">
          <Icon name="board" size={26} />
        </div>
        <h2>铺一块新板？</h2>
        <p>
          当前这块板上的 <b>{useStudio.getState().project.loose.length}</b> 颗散豆和{' '}
          <b>{useStudio.getState().project.pieces.length}</b> 块零件会从工作台清空。
          已经发布到集市的作品不受影响。
        </p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={() => setConfirmNew(false)}>
            先留着
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              useStudio.getState().newProject();
              setConfirmNew(false);
              toast('success', '新板子铺好了', '这块没有边，也没有 deadline');
            }}
          >
            <Icon name="plus" size={16} /> 铺一块新的
          </button>
        </div>
      </Modal>
    </div>
  );
}
