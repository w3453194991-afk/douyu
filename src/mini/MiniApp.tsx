import React, { useEffect, useState } from 'react';
import { useApp } from '../appStore';
import { MiniStatusBar, MiniCapsule, MiniTabBar, MiniSheet, MiniToasts, type MiniTab } from './ui';
import { MiniHome } from './MiniHome';
import { MiniStudio } from './MiniStudio';
import { MiniGallery } from './MiniGallery';
import { MiniProfile } from './MiniProfile';
import { MiniWorkDetail } from './MiniWorkDetail';
import { MiniPublish } from './MiniPublish';
import { Icon } from '../components/Icon';
import { PatternStudio } from '../components/PatternStudio';
import { PatternReport } from '../components/PatternReport';
import { CraftGuide } from '../components/CraftGuide';
import { InventoryDialog } from '../components/InventoryDialog';
import '../mini/mini.css';

type WorkOrigin = 'home' | 'gallery' | 'profile';

export function MiniApp() {
  const setView = useApp((s) => s.setView);
  const toast = useApp((s) => s.toast);
  const [tab, setTab] = useState<MiniTab>('home');
  const [work, setWork] = useState<{ id: string; from: WorkOrigin } | null>(null);
  const [publish, setPublish] = useState<string | null>(null);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  useEffect(() => {
    useApp.getState().openWork(null);
  }, []);

  const changeTab = (next: MiniTab) => {
    setWork(null);
    setPublish(null);
    setCapsuleOpen(false);
    setPatternOpen(false);
    setReportOpen(false);
    setGuideOpen(false);
    setInventoryOpen(false);
    setTab(next);
  };

  const openWork = (id: string) => {
    const from: WorkOrigin = tab === 'gallery' ? 'gallery' : tab === 'profile' ? 'profile' : 'home';
    setWork({ id, from });
  };

  const showTabs = !work && !publish && tab !== 'studio';

  return (
    <div className="mini-showcase">
      <div className="mini-showcase-head">
        <div className="mini-showcase-title">豆屿 · 小程序竖屏版</div>
        <div className="mini-showcase-sub">BEAD ISLE · 390 × 844 · 可交互原型</div>
      </div>

      <div className="mini-device">
        <MiniStatusBar />
        <MiniCapsule onClick={() => setCapsuleOpen(true)} />

        <div className="mini-page">
          <div className="mini-view">
            {work ? (
              <MiniWorkDetail
                workId={work.id}
                onBack={() => {
                  const back = work.from;
                  setWork(null);
                  setTab(back);
                }}
                onRemix={() => {
                  setWork(null);
                  setTab('studio');
                }}
              />
            ) : publish ? (
              <MiniPublish
                image={publish}
                onBack={() => setPublish(null)}
                onPublished={(id) => {
                  setPublish(null);
                  setTab('gallery');
                  setWork({ id, from: 'gallery' });
                }}
              />
            ) : tab === 'home' ? (
              <MiniHome
                onStudio={() => changeTab('studio')}
                onGallery={() => changeTab('gallery')}
                onWork={openWork}
                onPattern={() => setPatternOpen(true)}
                onGuide={() => setGuideOpen(true)}
              />
            ) : tab === 'studio' ? (
              <MiniStudio
                onBack={() => changeTab('home')}
                onOpenGallery={() => changeTab('gallery')}
                onPublish={(img) => setPublish(img)}
                onWeb={() => setView('home')}
                onPattern={() => setPatternOpen(true)}
                onReport={() => setReportOpen(true)}
                onGuide={() => setGuideOpen(true)}
                onInventory={() => setInventoryOpen(true)}
              />
            ) : tab === 'gallery' ? (
              <MiniGallery onWork={openWork} />
            ) : (
              <MiniProfile
                onWork={openWork}
                onNew={() => changeTab('studio')}
                onWeb={() => setView('home')}
                onGallery={() => changeTab('gallery')}
              />
            )}
          </div>

          {showTabs && <MiniTabBar tab={tab} onChange={changeTab} />}

          <MiniSheet
            open={capsuleOpen}
            title="小程序"
            onClose={() => setCapsuleOpen(false)}
          >
            <div className="mini-capsule-brand">
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff8ef',
                }}
              >
                <Icon name="bead" size={20} />
              </span>
              <div>
                <b>豆屿 · BEAD ISLE</b>
                <span>一颗一颗，熨成一座岛</span>
              </div>
            </div>
            <div className="mini-sheet-actions">
              <button
                className="mini-sheet-action"
                onClick={() => {
                  setCapsuleOpen(false);
                  changeTab('home');
                }}
              >
                <Icon name="home" size={17} />
                回到首页
              </button>
              <button
                className="mini-sheet-action"
                onClick={() => {
                  setCapsuleOpen(false);
                  changeTab('gallery');
                }}
              >
                <Icon name="gallery" size={17} />
                去集市
              </button>
              <button
                className="mini-sheet-action"
                onClick={() => {
                  setCapsuleOpen(false);
                  setView('home');
                }}
              >
                <Icon name="phone" size={17} />
                打开桌面版
              </button>
              <button
                className="mini-sheet-action"
                onClick={() => {
                  setCapsuleOpen(false);
                  toast('info', '豆屿 · 拼豆工作室', '竖屏小程序原型 · 点按 / 拖拽 / 底部弹层');
                }}
              >
                <Icon name="info" size={17} />
                关于这个小程序
              </button>
            </div>
          </MiniSheet>

          <PatternStudio
            open={patternOpen}
            mini
            onClose={() => setPatternOpen(false)}
            onImported={() => {
              setPatternOpen(false);
              setTab('studio');
            }}
          />
          <PatternReport
            open={reportOpen}
            mini
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
          <CraftGuide
            open={guideOpen}
            mini
            onClose={() => setGuideOpen(false)}
          />
          <InventoryDialog
            open={inventoryOpen}
            mini
            onClose={() => setInventoryOpen(false)}
          />
        </div>

        <MiniToasts />
      </div>

      <div className="mini-showcase-foot">
        <span>微信小程序形态 · 竖屏 390 × 844</span>
        <button onClick={() => setView('home')}>返回桌面版</button>
      </div>
    </div>
  );
}
