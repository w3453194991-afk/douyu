import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStudio } from '../store';
import { useApp } from '../appStore';
import { Icon } from './Icon';
import { pieceBounds } from '../lib/scene';
import { registerCapture } from '../lib/capture';
import type { Piece } from '../types';

type Engine = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  orbit: OrbitControls;
  tc: TransformControls;
  tcHelper: THREE.Object3D;
  groups: Map<string, THREE.Group>;
  grid: THREE.GridHelper;
  fit: (animate?: boolean) => void;
  rebuild: (pieces: Piece[]) => void;
  syncSelection: () => void;
  setMode: (mode: 'translate' | 'rotate') => void;
  capture: () => string | null;
  resetCamera: (preset: 'quarter' | 'front' | 'top') => void;
};

function createBeadGeometry() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.47, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.165, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.028,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function makeBackdrop(): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#FBF4E4');
  grad.addColorStop(0.55, '#F0DFC4');
  grad.addColorStop(1, '#D6BD98');
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(180, 40, 28), mat);
  mesh.frustumCulled = false;
  return mesh;
}

function makeContactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(40,26,10,0.55)');
  grad.addColorStop(0.55, 'rgba(40,26,10,0.28)');
  grad.addColorStop(1, 'rgba(40,26,10,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function AssemblyView({ onPublish }: { onPublish: (image: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const fittedRef = useRef(false);
  const tweenRef = useRef<{
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    start: number;
    dur: number;
  } | null>(null);

  const pieces = useStudio((s) => s.project.pieces);
  const selectedPieceId = useStudio((s) => s.selectedPieceId);
  const selectPiece = useStudio((s) => s.selectPiece);
  const runLayout = useStudio((s) => s.runLayout);
  const standPiece = useStudio((s) => s.standPiece);
  const layPiece = useStudio((s) => s.layPiece);
  const setMode2d = useStudio((s) => s.setMode);
  const toast = useApp((s) => s.toast);

  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');
  const [showGrid, setShowGrid] = useState(true);
  const [hintOpen, setHintOpen] = useState(true);

  const selectedPiece = pieces.find((p) => p.id === selectedPieceId) || null;

  /* ------------------------------- setup ------------------------------- */

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 800);
    camera.position.set(34, 26, 46);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'assembly-canvas';
    host.appendChild(renderer.domElement);

    const backdrop = makeBackdrop();
    scene.add(backdrop);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(64, 80),
      new THREE.MeshStandardMaterial({ color: '#E8D4B2', roughness: 0.96, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    scene.add(floor);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(64, 65.2, 96),
      new THREE.MeshBasicMaterial({ color: '#C9AE85', transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -0.01;
    scene.add(rim);

    const grid = new THREE.GridHelper(128, 64, '#B39A73', '#C9B189');
    grid.position.y = 0.006;
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.4;
    scene.add(grid);

    const hemi = new THREE.HemisphereLight('#FFF7E8', '#9C8768', 0.7);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#FFF2D9', 1.7);
    key.position.set(26, 42, 28);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -55;
    key.shadow.camera.right = 55;
    key.shadow.camera.top = 55;
    key.shadow.camera.bottom = -55;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 180;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    const fill = new THREE.DirectionalLight('#CFE4FF', 0.35);
    fill.position.set(-30, 16, 14);
    scene.add(fill);

    const rimLight = new THREE.DirectionalLight('#FFD8B4', 0.6);
    rimLight.position.set(2, 18, -32);
    scene.add(rimLight);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.35;

    const contactShadowTex = makeContactShadowTexture();
    const contactShadowGeo = new THREE.PlaneGeometry(1, 1);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    let contactShadows: THREE.Mesh[] = [];

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.target.set(0, 8, 0);
    orbit.minDistance = 10;
    orbit.maxDistance = 260;
    orbit.maxPolarAngle = Math.PI * 0.53;
    orbit.screenSpacePanning = true;
    orbit.update();

    const tc = new TransformControls(camera, renderer.domElement);
    tc.setSize(0.82);
    tc.translationSnap = 0.5;
    tc.rotationSnap = Math.PI / 12;
    tc.space = 'world';
    const tcHelper = tc.getHelper();
    tcHelper.visible = false;
    scene.add(tcHelper);

    const beadGeo = createBeadGeometry();
    const beadMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.03,
      clearcoat: 0.5,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.9,
    });

    const groups = new Map<string, THREE.Group>();
    let selectionHelper: THREE.BoxHelper | null = null;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const disposeSelectionHelper = () => {
      if (selectionHelper) {
        scene.remove(selectionHelper);
        selectionHelper.geometry.dispose();
        (selectionHelper.material as THREE.Material).dispose();
        selectionHelper = null;
      }
    };

    const syncSelection = () => {
      const id = useStudio.getState().selectedPieceId;
      const group = id ? groups.get(id) : null;
      disposeSelectionHelper();
      if (!group) {
        tc.detach();
        tcHelper.visible = false;
        return;
      }
      tc.attach(group);
      tcHelper.visible = true;
      selectionHelper = new THREE.BoxHelper(group, 0xffb14d);
      const mat = selectionHelper.material as THREE.LineBasicMaterial;
      mat.transparent = true;
      mat.opacity = 0.85;
      mat.depthTest = false;
      scene.add(selectionHelper);
    };

    const fit = (animate = false) => {
      const list = [...groups.values()];
      if (!list.length) {
        const pos = new THREE.Vector3(34, 26, 46);
        const target = new THREE.Vector3(0, 8, 0);
        if (animate) {
          tweenRef.current = {
            fromPos: camera.position.clone(),
            toPos: pos,
            fromTarget: orbit.target.clone(),
            toTarget: target,
            start: performance.now(),
            dur: 520,
          };
        } else {
          camera.position.copy(pos);
          orbit.target.copy(target);
          orbit.update();
        }
        return;
      }
      const box = new THREE.Box3();
      for (const g of list) box.expandByObject(g);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(3, size.length() / 2);
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.6, camera.aspect));
      const viewFov = Math.min(vFov, hFov);
      const dist = Math.max(7, (radius / Math.sin(viewFov / 2)) * 1.12);
      const dir = new THREE.Vector3(0.52, 0.34, 0.78).normalize();
      const pos = center.clone().addScaledVector(dir, dist);
      const target = center.clone();
      target.y = Math.max(0, center.y - size.y * 0.08);
      if (animate) {
        tweenRef.current = {
          fromPos: camera.position.clone(),
          toPos: pos,
          fromTarget: orbit.target.clone(),
          toTarget: target,
          start: performance.now(),
          dur: 520,
        };
      } else {
        camera.position.copy(pos);
        orbit.target.copy(target);
        camera.near = Math.max(0.1, dist / 500);
        camera.far = Math.max(800, dist * 10);
        camera.updateProjectionMatrix();
        orbit.update();
      }
    };

    const resetCamera = (preset: 'quarter' | 'front' | 'top') => {
      const list = [...groups.values()];
      const box = new THREE.Box3();
      if (list.length) for (const g of list) box.expandByObject(g);
      const center = list.length ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 8, 0);
      const size = list.length ? box.getSize(new THREE.Vector3()) : new THREE.Vector3(30, 24, 20);
      const radius = Math.max(3, size.length() / 2);
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.6, camera.aspect));
      const dist = Math.max(8, (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.25);
      const dir =
        preset === 'front'
          ? new THREE.Vector3(0, 0.12, 1)
          : preset === 'top'
            ? new THREE.Vector3(0.001, 1, 0.02)
            : new THREE.Vector3(0.52, 0.34, 0.78);
      const pos = center.clone().addScaledVector(dir.normalize(), dist);
      tweenRef.current = {
        fromPos: camera.position.clone(),
        toPos: pos,
        fromTarget: orbit.target.clone(),
        toTarget: center,
        start: performance.now(),
        dur: 560,
      };
    };

    const rebuild = (nextPieces: Piece[]) => {
      for (const g of groups.values()) scene.remove(g);
      groups.clear();
      for (const s of contactShadows) scene.remove(s);
      contactShadows = [];
      disposeSelectionHelper();
      tc.detach();
      tcHelper.visible = false;

      const dummy = new THREE.Object3D();
      for (const piece of nextPieces) {
        if (!piece.beads.length) continue;
        const bb = pieceBounds(piece.beads);
        const group = new THREE.Group();
        group.position.fromArray(piece.t.p);
        group.rotation.set(piece.t.r[0], piece.t.r[1], piece.t.r[2], 'XYZ');
        group.userData.pieceId = piece.id;

        const mesh = new THREE.InstancedMesh(beadGeo, beadMat, piece.beads.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.pieceId = piece.id;
        const color = new THREE.Color();
        piece.beads.forEach((b, i) => {
          dummy.position.set(b.x - bb.w / 2 + 0.5, 0.015, b.y - bb.h / 2 + 0.5);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          color.set(b.c);
          mesh.setColorAt(i, color);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
        group.add(mesh);
        scene.add(group);
        groups.set(piece.id, group);

        const upright = Math.abs(Math.sin(piece.t.r[0])) > 0.55;
        const sx = upright ? bb.w * 1.25 : bb.w + 2;
        const sz = upright ? 4.2 : bb.h + 2;
        const shadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
        shadow.position.set(piece.t.p[0], 0.018, piece.t.p[2]);
        shadow.scale.set(Math.max(1.2, sx), 1, Math.max(1.2, sz));
        scene.add(shadow);
        contactShadows.push(shadow);
      }
      syncSelection();
      if (!fittedRef.current && groups.size) {
        fittedRef.current = true;
        fit(false);
      }
    };

    const commitTransform = () => {
      const obj = tc.object as THREE.Group | null;
      if (!obj) return;
      const id = obj.userData.pieceId as string;
      const st = useStudio.getState();
      const origin = (tc as any).__origin as
        | { p: [number, number, number]; r: [number, number, number] }
        | undefined;
      const next = {
        p: [obj.position.x, obj.position.y, obj.position.z] as [number, number, number],
        r: [obj.rotation.x, obj.rotation.y, obj.rotation.z] as [number, number, number],
      };
      if (
        origin &&
        Math.abs(origin.p[0] - next.p[0]) < 1e-5 &&
        Math.abs(origin.p[1] - next.p[1]) < 1e-5 &&
        Math.abs(origin.p[2] - next.p[2]) < 1e-5 &&
        Math.abs(origin.r[0] - next.r[0]) < 1e-5 &&
        Math.abs(origin.r[1] - next.r[1]) < 1e-5 &&
        Math.abs(origin.r[2] - next.r[2]) < 1e-5
      ) {
        st.endAction();
        return;
      }
      st.updateTransform(id, next);
      st.endAction();
    };

    tc.addEventListener('dragging-changed', (e: any) => {
      orbit.enabled = !e.value;
      if (e.value) {
        useStudio.getState().beginAction();
        const obj = tc.object;
        if (obj) {
          (tc as any).__origin = {
            p: [obj.position.x, obj.position.y, obj.position.z],
            r: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
          };
        }
      }
    });
    tc.addEventListener('mouseUp', commitTransform);

    const getPieceMeshes = () => [...groups.values()];

    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5) return;
      if (tc.dragging || tc.axis) return;
      if (groups.size === 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(getPieceMeshes(), true);
      if (hits.length) {
        const id = (hits[0].object.userData.pieceId as string) || null;
        useStudio.getState().selectPiece(id);
      } else {
        useStudio.getState().selectPiece(null);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    const preventMenu = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('contextmenu', preventMenu);

    const capture = (): string | null => {
      if (!groups.size) return null;
      const size = renderer.getSize(new THREE.Vector2());
      const pr = renderer.getPixelRatio();
      const aspect = camera.aspect;
      const gridVisible = grid.visible;
      const helperVisible = tcHelper.visible;
      const selVisible = selectionHelper?.visible ?? false;
      const prevPos = camera.position.clone();
      const prevTarget = orbit.target.clone();
      tcHelper.visible = false;
      if (selectionHelper) selectionHelper.visible = false;
      grid.visible = false;
      try {
        const box = new THREE.Box3();
        for (const g of groups.values()) box.expandByObject(g);
        const center = box.getCenter(new THREE.Vector3());
        const dir = camera.position.clone().sub(orbit.target).normalize();
        const dist = camera.position.distanceTo(orbit.target) * 0.88;
        orbit.target.copy(center);
        camera.position.copy(center).addScaledVector(dir, dist);
        camera.lookAt(center);
        renderer.setPixelRatio(1);
        renderer.setSize(1200, 900, false);
        camera.aspect = 4 / 3;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/jpeg', 0.92);
      } finally {
        camera.position.copy(prevPos);
        orbit.target.copy(prevTarget);
        camera.lookAt(prevTarget);
        renderer.setPixelRatio(pr);
        renderer.setSize(size.x, size.y, false);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        grid.visible = gridVisible;
        tcHelper.visible = helperVisible;
        if (selectionHelper) selectionHelper.visible = selVisible;
        orbit.update();
        renderer.render(scene, camera);
      }
    };

    const unregister = registerCapture(capture);

    const resize = () => {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const tw = tweenRef.current;
      if (tw) {
        const k = Math.min(1, (t - tw.start) / tw.dur);
        const e = 1 - Math.pow(1 - k, 3);
        camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
        orbit.target.lerpVectors(tw.fromTarget, tw.toTarget, e);
        if (k >= 1) tweenRef.current = null;
      }
      orbit.update();
      if (selectionHelper && tc.object) selectionHelper.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    const engine: Engine = {
      renderer,
      scene,
      camera,
      orbit,
      tc,
      tcHelper,
      groups,
      grid,
      fit,
      rebuild,
      syncSelection,
      setMode: (mode) => {
        tc.setMode(mode);
        tc.space = mode === 'rotate' ? 'local' : 'world';
      },
      capture,
      resetCamera,
    };
    engineRef.current = engine;

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unregister();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('contextmenu', preventMenu);
      tc.detach();
      tc.dispose();
      orbit.dispose();
      disposeSelectionHelper();
      beadGeo.dispose();
      beadMat.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
      contactShadowTex.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      engineRef.current = null;
    };
  }, []);

  /* --------------------------- sync effects --------------------------- */

  useEffect(() => {
    engineRef.current?.rebuild(pieces);
  }, [pieces]);

  useEffect(() => {
    engineRef.current?.syncSelection();
  }, [selectedPieceId]);

  useEffect(() => {
    engineRef.current?.setMode(transformMode);
  }, [transformMode]);

  useEffect(() => {
    const engine = engineRef.current;
    if (engine) engine.grid.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA|SELECT|BUTTON/.test(target.tagName)) return;
      if (e.key === 'g' || e.key === 'G') setTransformMode('translate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('rotate');
      if (e.key === 'Escape') useStudio.getState().selectPiece(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleCapture = () => {
    const img = engineRef.current?.capture();
    if (!img) {
      toast('error', '没有拍成', '先熨出至少一块零件再拍');
      return;
    }
    onPublish(img);
  };

  const doLayout = () => {
    if (!pieces.length) return;
    runLayout();
    toast('info', '重新摆盘了', '所有零件都立起来，排整齐了');
    window.setTimeout(() => engineRef.current?.fit(true), 80);
  };

  const stats = useMemo(() => {
    const beads = pieces.reduce((n, p) => n + p.beads.length, 0);
    return { beads, pieces: pieces.length };
  }, [pieces]);

  return (
    <div className="assembly-stage">
      <div className="assembly-host" ref={hostRef} />

      <div className="assembly-badge">
        <Icon name="cube" size={15} />
        立体拼装台
        <span>
          {stats.pieces} 块零件 · {stats.beads} 颗豆
        </span>
      </div>

      {hintOpen && pieces.length > 0 && (
        <div className="assembly-hint">
          <button className="hint-close" onClick={() => setHintOpen(false)} aria-label="收起提示">
            <Icon name="x" size={14} />
          </button>
          <span className="eyebrow">ASSEMBLY</span>
          <b>把它们立成一个小世界</b>
          <p>
            点选零件，拖动彩色圆环移动；切到「旋转」可以把面板立起来。按住空白处旋转视角。
          </p>
        </div>
      )}

      <div className="camera-presets">
        <button onClick={() => engineRef.current?.resetCamera('front')} title="正面视角">
          正
        </button>
        <button onClick={() => engineRef.current?.resetCamera('quarter')} title="斜侧视角">
          斜
        </button>
        <button onClick={() => engineRef.current?.resetCamera('top')} title="俯视视角">
          顶
        </button>
        <button onClick={() => engineRef.current?.fit(true)} title="适应画面">
          <Icon name="fit" size={15} />
        </button>
      </div>

      {selectedPiece && (
        <div className="selected-piece-card">
          <div className="selected-piece-head">
            <span className="selected-dot" />
            <b>{selectedPiece.name}</b>
            <span>{selectedPiece.beads.length} 颗</span>
          </div>
          <div className="selected-piece-actions">
            <button className="btn btn-ghost btn-xs" onClick={() => standPiece(selectedPiece.id)}>
              立起
            </button>
            <button className="btn btn-ghost btn-xs" onClick={() => layPiece(selectedPiece.id)}>
              平放
            </button>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => {
                const st = useStudio.getState();
                const p = st.project.pieces.find((x) => x.id === selectedPiece.id);
                if (!p) return;
                st.beginAction();
                st.updateTransform(p.id, {
                  p: p.t.p,
                  r: [p.t.r[0], p.t.r[1] + Math.PI / 2, p.t.r[2]],
                });
                st.endAction();
                st.selectPiece(p.id);
              }}
            >
              转 90°
            </button>
          </div>
        </div>
      )}

      <div className="assembly-bar">
        <div className="segmented">
          <button
            className={transformMode === 'translate' ? 'on' : ''}
            onClick={() => setTransformMode('translate')}
            title="移动 · G"
          >
            <Icon name="move" size={17} /> 移动
          </button>
          <button
            className={transformMode === 'rotate' ? 'on' : ''}
            onClick={() => setTransformMode('rotate')}
            title="旋转 · R"
          >
            <Icon name="rotate" size={17} /> 旋转
          </button>
        </div>
        <span className="bar-divider" />
        <button className="bar-btn" onClick={doLayout}>
          <Icon name="grid" size={17} /> 自动摆盘
        </button>
        <button className="bar-btn" onClick={() => setShowGrid(!showGrid)}>
          <Icon name="board" size={17} /> {showGrid ? '收起桌面' : '铺开桌面'}
        </button>
        <span className="bar-divider" />
        <button className="btn btn-primary" onClick={handleCapture}>
          <Icon name="camera" size={17} /> 拍下成品
        </button>
      </div>

      {pieces.length === 0 && (
        <div className="assembly-empty">
          <span className="assembly-empty-icon">
            <Icon name="cube" size={30} />
          </span>
          <h3>还没有可以立起来的零件</h3>
          <p>
            回拼豆板放几颗豆，按 <kbd>Enter</kbd> 熨成零件，这里就有东西可以拼了。
          </p>
          <button className="btn btn-primary" onClick={() => setMode2d('board')}>
            <Icon name="board" size={16} /> 回拼豆板
          </button>
        </div>
      )}
    </div>
  );
}
