import React, { useEffect, useRef } from 'react';
import { useApp } from './appStore';
import { useStudio, saveProject } from './store';
import { Studio } from './components/Studio';
import { Gallery } from './components/Gallery';
import { Home } from './components/Home';
import { MiniApp } from './mini/MiniApp';
import { WorkModal } from './components/WorkModal';
import { Toasts } from './components/Toasts';
import { LogoMark } from './components/Icon';

function Persistence() {
  const project = useStudio((s) => s.project);
  const warned = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (saveProject(project)) {
        useStudio.getState().markSaved(Date.now());
      } else if (!warned.current) {
        warned.current = true;
        useApp.getState().toast('error', '本机草稿没存下', '浏览器存储可能满了，先发布作品保底');
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [project]);

  useEffect(() => {
    const save = () => saveProject(useStudio.getState().project);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') save();
    });
    return () => window.removeEventListener('beforeunload', save);
  }, []);

  return null;
}

function Splash() {
  const bootError = useApp((s) => s.bootError);
  const boot = useApp((s) => s.boot);
  const booting = useApp((s) => s.booting);

  return (
    <div className="splash">
      <div className="splash-glow" />
      <div className="splash-inner">
        <LogoMark size={68} />
        <h1>豆屿</h1>
        <p>一颗一颗，熨成一座岛。</p>
        {bootError ? (
          <div className="splash-error">
            <b>服务没有回应</b>
            <span>{bootError}</span>
            <p>
              先确认终端里的豆屿服务开着：
              <code>npm start</code>
            </p>
            <button className="btn btn-primary" onClick={() => boot()} disabled={booting}>
              再试一次
            </button>
          </div>
        ) : (
          <div className="splash-loading">
            <span />
            <span />
            <span />
            <em>正在铺板子…</em>
          </div>
        )}
      </div>
      <div className="splash-foot">BEAD ISLE · 2026</div>
    </div>
  );
}

export default function App() {
  const booted = useApp((s) => s.booted);
  const bootError = useApp((s) => s.bootError);
  const view = useApp((s) => s.view);
  const boot = useApp((s) => s.boot);

  useEffect(() => {
    if (!booted && !bootError) boot();
  }, [booted, bootError, boot]);

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash || '';
      let view: 'home' | 'studio' | 'gallery' | 'mini' =
        window.innerWidth <= 700 ? 'mini' : 'home';
      let workId: string | null = null;
      if (h.startsWith('#/work/')) {
        view = 'gallery';
        workId = decodeURIComponent(h.slice(7)) || null;
      } else if (h.startsWith('#/gallery')) {
        view = 'gallery';
      } else if (h.startsWith('#/studio')) {
        view = 'studio';
      } else if (h.startsWith('#/mini')) {
        view = 'mini';
      }
      const state = useApp.getState();
      if (state.view !== view || state.activeWorkId !== workId) {
        useApp.setState({ view, activeWorkId: workId });
      }
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  if (!booted) return <Splash />;

  return (
    <div className={`app app-${view}`}>
      <Persistence />
      {view === 'studio' ? (
        <Studio />
      ) : view === 'gallery' ? (
        <Gallery />
      ) : view === 'mini' ? (
        <MiniApp />
      ) : (
        <Home />
      )}
      {view !== 'mini' && <WorkModal />}
      {view !== 'mini' && <Toasts />}
    </div>
  );
}
