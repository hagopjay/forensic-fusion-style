import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DEFECTS, type Defect } from './data';

export type ViewMode = '3d' | 'plan' | 'section' | 'thermal';
export type LayerKey = 'walls' | 'furniture' | 'defects' | 'zones';

export type SceneApi = {
  select: (id: string) => void;
  setMode: (m: ViewMode) => void;
  toggleLayer: (k: LayerKey, on: boolean) => void;
  setSection: (v: number) => void;
  resetView: () => void;
};

type Opts = {
  canvasHost: HTMLDivElement;
  labelHost: HTMLDivElement;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  selectedRef: { current: string | null };
};

export function buildForensicScene(opts: Opts): { api: SceneApi; dispose: () => void } {
  const { canvasHost, labelHost, onSelect, onHover, selectedRef } = opts;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05080f);
  scene.fog = new THREE.Fog(0x05080f, 24, 58);

  const perspCam = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
  const orthoCam = new THREE.OrthographicCamera(-9, 9, 6.75, -6.75, 0.1, 60);
  orthoCam.position.set(0, 22, 0);
  orthoCam.lookAt(0, 0, 0);
  let activeCam: THREE.Camera = perspCam;

  const orb = { theta: 0.68, phi: 0.78, r: 21 };
  const tgt = new THREE.Vector3(0, 1.0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x05080f, 1);
  canvasHost.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0x1a2840, 1.0));
  const sun = new THREE.DirectionalLight(0xc4d8f0, 1.6);
  sun.position.set(9, 16, 8); sun.castShadow = true;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xf5b840, 0.55);
  rim.position.set(-8, 6, -10);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x1a3260, 0x030810, 0.55));

  // Grid (dual layer for depth)
  const grid = new THREE.GridHelper(40, 40, 0x12243c, 0x0a1424);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as any).opacity = 0.55;
  grid.position.y = -0.01; scene.add(grid);

  const subgrid = new THREE.GridHelper(40, 80, 0x0a1828, 0x081224);
  (subgrid.material as THREE.Material).transparent = true;
  (subgrid.material as any).opacity = 0.25;
  subgrid.position.y = -0.011; scene.add(subgrid);

  const layers: Record<LayerKey, THREE.Object3D[]> = { walls: [], furniture: [], defects: [], zones: [] };

  const sectionPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

  // Materials
  const wallMat = new THREE.MeshPhongMaterial({ color: 0x1a3254, transparent: true, opacity: 0.20, side: THREE.DoubleSide, depthWrite: false, shininess: 30 });
  const wallEdge = new THREE.LineBasicMaterial({ color: 0x3a6aa0, transparent: true, opacity: 0.85 });
  const divMat = new THREE.MeshPhongMaterial({ color: 0x182e4a, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false });
  const divEdge = new THREE.LineBasicMaterial({ color: 0x305880, transparent: true, opacity: 0.6 });
  const floorMat = new THREE.MeshPhongMaterial({ color: 0x0a1622, shininess: 60, specular: 0x1a3450 });
  const ceilMat = new THREE.MeshPhongMaterial({ color: 0x0e2030, transparent: true, opacity: 0.06, depthWrite: false });
  const ceilEdge = new THREE.LineBasicMaterial({ color: 0x142230, transparent: true, opacity: 0.20 });
  const furnitureMat = new THREE.LineBasicMaterial({ color: 0x4a7098, transparent: true, opacity: 0.55 });
  const winMat = new THREE.LineBasicMaterial({ color: 0x6ab4dc, transparent: true, opacity: 0.75 });

  const thermalWallMat = new THREE.MeshPhongMaterial({ color: 0x001428, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const thermalFloorMat = new THREE.MeshPhongMaterial({ color: 0x000a14 });

  const wallMeshes: THREE.Mesh[] = [];
  const floorMeshes: THREE.Mesh[] = [];

  function solidBox(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, edgeMat: THREE.LineBasicMaterial, layer?: LayerKey) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    e.position.set(x, y, z); scene.add(e);
    if (layer) { layers[layer].push(m, e); }
    return m;
  }
  function wireBox(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.LineBasicMaterial, layer?: LayerKey) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
    m.position.set(x, y, z); scene.add(m);
    if (layer) layers[layer].push(m);
    return m;
  }
  function winFrame(x: number, y: number, z: number, w: number, h: number, axis: 'x' | 'z') {
    const pts: THREE.Vector3[] = [];
    const hw = w / 2, hh = h / 2;
    if (axis === 'z') {
      const c = [[x - hw, y - hh, z], [x + hw, y - hh, z], [x + hw, y + hh, z], [x - hw, y + hh, z]];
      for (let i = 0; i < 4; i++) pts.push(new THREE.Vector3(...(c[i] as [number, number, number])), new THREE.Vector3(...(c[(i + 1) % 4] as [number, number, number])));
      pts.push(new THREE.Vector3(x, y - hh, z), new THREE.Vector3(x, y + hh, z));
      pts.push(new THREE.Vector3(x - hw, y, z), new THREE.Vector3(x + hw, y, z));
    } else {
      const c = [[x, y - hh, z - hw], [x, y - hh, z + hw], [x, y + hh, z + hw], [x, y + hh, z - hw]];
      for (let i = 0; i < 4; i++) pts.push(new THREE.Vector3(...(c[i] as [number, number, number])), new THREE.Vector3(...(c[(i + 1) % 4] as [number, number, number])));
      pts.push(new THREE.Vector3(x, y - hh, z), new THREE.Vector3(x, y + hh, z));
      pts.push(new THREE.Vector3(x, y, z - hw), new THREE.Vector3(x, y, z + hw));
    }
    const m = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), winMat);
    scene.add(m); layers.walls.push(m);
  }

  // Build the unit
  const W = 0.08;
  const fm = solidBox(10, 0.06, 8, 0, -0.03, 0, floorMat, new THREE.LineBasicMaterial({ color: 0x2e588a, transparent: true, opacity: 0.6 }));
  floorMeshes.push(fm);
  const cm = solidBox(10, 0.04, 8, 0, 3.01, 0, ceilMat, ceilEdge); layers.walls.push(cm);

  const extWalls = [
    solidBox(10.16, 3, W, 0, 1.5, -4, wallMat, wallEdge),
    solidBox(3.5, 3, W, -3.25, 1.5, 4, wallMat, wallEdge),
    solidBox(3.5, 3, W, 3.25, 1.5, 4, wallMat, wallEdge),
    solidBox(3.0, 0.95, W, 0, 2.52, 4, wallMat, wallEdge),
    solidBox(W, 3, 8.16, -5, 1.5, 0, wallMat, wallEdge),
    solidBox(W, 3, 8.16, 5, 1.5, 0, wallMat, wallEdge),
  ];
  extWalls.forEach((m) => { wallMeshes.push(m); layers.walls.push(m); });
  const intWalls = [
    solidBox(W, 3, 4, -1.5, 1.5, -2, divMat, divEdge),
    solidBox(10, 3, W, 0, 1.5, 0, divMat, divEdge),
    solidBox(W, 3, 2, 1.5, 1.5, 3, divMat, divEdge),
    solidBox(W, 3, 1, 1.5, 1.5, 0.5, divMat, divEdge),
    solidBox(W, 0.85, 1, 1.5, 2.57, 1.5, divMat, divEdge),
  ];
  intWalls.forEach((m) => { wallMeshes.push(m); layers.walls.push(m); });

  winFrame(-3.3, 1.75, -4, 1.2, 1.1, 'z');
  winFrame(1.5, 1.75, -4, 1.6, 1.2, 'z');
  winFrame(5, 1.75, -2, 1.4, 1.2, 'x');
  winFrame(5, 1.75, 2, 1.2, 1.1, 'x');
  winFrame(-2.0, 1.75, 4, 1.2, 1.0, 'z');
  winFrame(3.5, 1.75, 4, 1.0, 1.0, 'z');

  const fur = furnitureMat;
  wireBox(1.4, 0.65, 1.2, -4.1, 0.32, -3.4, fur, 'furniture');
  wireBox(0.5, 0.72, 0.55, -2.6, 0.36, -3.7, fur, 'furniture');
  wireBox(1.0, 0.88, 0.5, -1.85, 0.44, -1.8, fur, 'furniture');
  wireBox(0.5, 0.5, 0.08, -2.1, 0.88, -1.55, fur, 'furniture');
  wireBox(1.9, 0.6, 1.5, 1.5, 0.30, -3.2, fur, 'furniture');
  wireBox(0.18, 0.5, 1.5, 0.5, 0.25, -3.2, fur, 'furniture');
  wireBox(0.5, 0.62, 0.5, 2.65, 0.31, -3.2, fur, 'furniture');
  wireBox(0.8, 1.4, 0.5, 4.6, 0.70, -1.8, fur, 'furniture');
  wireBox(1.2, 0.75, 0.7, 3.1, 0.37, -0.7, fur, 'furniture');
  wireBox(0.18, 0.75, 0.7, 2.55, 0.37, -0.7, fur, 'furniture');
  wireBox(2.4, 0.82, 0.9, -1.8, 0.41, 1.5, fur, 'furniture');
  wireBox(2.4, 0.15, 0.3, -1.8, 0.8, 1.05, fur, 'furniture');
  wireBox(1.0, 0.44, 0.5, -1.8, 0.22, 2.45, fur, 'furniture');
  wireBox(1.4, 0.72, 0.18, -1.8, 0.36, 3.55, fur, 'furniture');
  wireBox(1.2, 0.08, 0.65, -1.8, 0.74, 3.47, fur, 'furniture');
  wireBox(3.0, 0.88, 0.55, 3.2, 0.44, 3.62, fur, 'furniture');
  wireBox(0.55, 0.88, 2.0, 4.72, 0.44, 1.8, fur, 'furniture');
  wireBox(0.7, 1.75, 0.7, 4.55, 0.87, 3.62, fur, 'furniture');
  wireBox(0.65, 0.9, 0.55, 2.8, 0.45, 3.6, fur, 'furniture');
  wireBox(1.0, 0.7, 0.7, 2.5, 0.35, 1.5, fur, 'furniture');
  wireBox(0.42, 0.82, 0.42, 2.1, 0.41, 1.0, fur, 'furniture');
  wireBox(0.42, 0.82, 0.42, 2.9, 0.41, 2.0, fur, 'furniture');

  // Damage zones
  (() => {
    const s = new THREE.Shape();
    s.moveTo(-2.85, -3.25);
    s.bezierCurveTo(-2.2, -3.1, -1.8, -3.35, -1.68, -3.75);
    s.bezierCurveTo(-1.58, -4.05, -1.85, -4.12, -2.35, -4.08);
    s.bezierCurveTo(-2.75, -4.05, -3.05, -3.85, -2.85, -3.25);
    const geo = new THREE.ShapeGeometry(s, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = 2.96;
    scene.add(m); layers.zones.push(m);
    const ws = new THREE.Shape();
    ws.moveTo(-2.9, 2.98); ws.lineTo(-1.75, 2.98); ws.lineTo(-1.7, 2.55); ws.lineTo(-2.0, 2.25); ws.lineTo(-2.75, 2.3); ws.lineTo(-2.9, 2.7); ws.closePath();
    const wm = new THREE.Mesh(new THREE.ShapeGeometry(ws, 6), mat.clone());
    wm.position.z = -3.96; scene.add(wm); layers.zones.push(wm);
  })();

  (() => {
    const s = new THREE.Shape();
    s.moveTo(0.55, 2.42);
    s.bezierCurveTo(1.4, 2.55, 2.1, 2.45, 2.52, 2.15);
    s.bezierCurveTo(2.72, 1.85, 2.55, 1.28, 2.08, 1.18);
    s.bezierCurveTo(1.55, 1.08, 0.82, 1.18, 0.52, 1.4);
    s.bezierCurveTo(0.28, 1.62, 0.28, 2.12, 0.55, 2.42);
    const geo = new THREE.ShapeGeometry(s, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x4b8df8, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat); m.position.z = -3.96;
    scene.add(m); layers.zones.push(m);
    [[1.0, 1.18, 0.35], [1.6, 1.08, 0.42], [2.0, 1.18, 0.30]].forEach(([x, y, len]) => {
      const p = [new THREE.Vector3(x, y, -3.97), new THREE.Vector3(x + 0.04, y - len, -3.97)];
      const lm = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: 0x6ab0ff, transparent: true, opacity: 0.6 }));
      scene.add(lm); layers.zones.push(lm);
    });
  })();

  (() => {
    const pts = [
      new THREE.Vector3(-0.72, 2.08, 3.97),
      new THREE.Vector3(-0.62, 1.78, 3.97),
      new THREE.Vector3(-0.68, 1.42, 3.97),
      new THREE.Vector3(-0.52, 1.05, 3.97),
      new THREE.Vector3(-0.58, 0.62, 3.97),
      new THREE.Vector3(-0.42, 0.24, 3.97),
      new THREE.Vector3(-0.38, 0.04, 3.97),
    ];
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.022, 5, false);
    const m = new THREE.Mesh(tube, new THREE.MeshPhongMaterial({ color: 0xff6045, emissive: 0x882030, emissiveIntensity: 0.45 }));
    scene.add(m); layers.zones.push(m);
    const em = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.72, 2.08, 3.97), new THREE.Vector3(-0.95, 2.28, 3.97),
      new THREE.Vector3(-0.55, 1.42, 3.97), new THREE.Vector3(-0.78, 1.48, 3.97),
    ]), new THREE.LineBasicMaterial({ color: 0xff7050, transparent: true, opacity: 0.55 }));
    scene.add(em); layers.zones.push(em);
  })();

  (() => {
    const geo = new THREE.PlaneGeometry(2.0, 2.3);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe060a0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat); m.rotation.y = -Math.PI / 2; m.position.set(4.96, 1.25, 2.15);
    scene.add(m); layers.zones.push(m);
    const em = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xe080b8, transparent: true, opacity: 0.55 }));
    em.rotation.y = -Math.PI / 2; em.position.set(4.96, 1.25, 2.15);
    scene.add(em); layers.zones.push(em);
    for (let i = 0; i < 5; i++) {
      const lp = [new THREE.Vector3(4.96, 0.1 + i * 0.5, 1.2), new THREE.Vector3(4.96, 0.4 + i * 0.5, 3.0)];
      const lm = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: 0xe060a0, transparent: true, opacity: 0.22 }));
      scene.add(lm); layers.zones.push(lm);
    }
  })();

  // Defect markers
  const markers: THREE.Mesh[] = [];
  const glowRings: THREE.Mesh[] = [];
  const defectInternal: { d: Defect; sphere: THREE.Mesh; mat: THREE.MeshPhongMaterial; halo: THREE.Mesh }[] = [];

  DEFECTS.forEach((d, i) => {
    const sGeo = new THREE.SphereGeometry(0.14, 18, 14);
    const sMat = new THREE.MeshPhongMaterial({ color: d.hex, emissive: d.hex, emissiveIntensity: 0.45, transparent: true, opacity: 0.96, shininess: 80 });
    const sphere = new THREE.Mesh(sGeo, sMat);
    sphere.position.set(...d.pos); (sphere.userData as any).did = d.id; sphere.castShadow = true;
    scene.add(sphere); markers.push(sphere);

    // Halo billboard sprite
    const haloMat = new THREE.SpriteMaterial({ color: d.hex, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(...d.pos); halo.scale.set(0.9, 0.9, 1);
    scene.add(halo);
    layers.defects.push(halo as unknown as THREE.Object3D);

    const sh = d.pos[1];
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, sh, 4), new THREE.MeshBasicMaterial({ color: d.hex, transparent: true, opacity: 0.4 }));
    stem.position.set(d.pos[0], sh / 2, d.pos[2]); scene.add(stem);
    layers.defects.push(sphere, stem);

    const br = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 24), new THREE.MeshBasicMaterial({ color: d.hex, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    br.rotation.x = -Math.PI / 2; br.position.set(d.pos[0], 0.005, d.pos[2]);
    scene.add(br); layers.defects.push(br);

    for (let j = 0; j < 3; j++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.13, 24), new THREE.MeshBasicMaterial({ color: d.hex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      r.rotation.x = -Math.PI / 2; r.position.set(d.pos[0], 0.01, d.pos[2]);
      (r.userData as any) = { phase: j / 3, didx: i };
      scene.add(r);
      glowRings.push(r); layers.defects.push(r);
    }

    defectInternal.push({ d, sphere, mat: sMat, halo: halo as unknown as THREE.Mesh });
  });

  // Thermal overlays
  const thermalObjects: { mesh: THREE.Mesh; type: 'hot' | 'cold' | 'reading' }[] = [];
  (() => {
    const geo = new THREE.PlaneGeometry(3.5, 3.5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(-1.8, 0.02, 1.5);
    scene.add(m); thermalObjects.push({ mesh: m, type: 'hot' });
  })();
  ([[-4.5, 1.85, -3.9], [2.0, 1.85, -3.9], [4.96, 1.75, -1.5], [4.96, 1.75, 2.0]] as [number, number, number][]).forEach(([x, y, z]) => {
    const geo = new THREE.PlaneGeometry(0.9, 0.9);
    const mat = new THREE.MeshBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    if (Math.abs(z + 1.5) < 1 || Math.abs(z - 2) < 1) { m.rotation.y = -Math.PI / 2; m.position.set(x, y, z); }
    else { m.position.set(x, y, z); }
    scene.add(m); thermalObjects.push({ mesh: m, type: 'cold' });
  });
  ([
    { pos: [-2.2, 0.01, 1.5] }, { pos: [-3.8, 0.01, -1.0] }, { pos: [2.5, 0.01, 1.5] },
    { pos: [-3.0, 0.01, 3.0] }, { pos: [1.8, 0.01, 3.2] },
  ] as { pos: [number, number, number] }[]).forEach((t) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.25, 18), new THREE.MeshBasicMaterial({ color: 0x0066cc, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(...t.pos);
    scene.add(m); thermalObjects.push({ mesh: m, type: 'reading' });
  });
  function setThermalVis(on: boolean) {
    thermalObjects.forEach((o) => {
      const mat = o.mesh.material as THREE.MeshBasicMaterial;
      if (o.type === 'hot') mat.opacity = on ? 0.34 : 0;
      else if (o.type === 'cold') mat.opacity = on ? 0.26 : 0;
      else mat.opacity = on ? 0.6 : 0;
    });
  }

  // HTML labels
  const ROOMS = [
    { txt: 'BATHROOM · NW', p: new THREE.Vector3(-3.2, 0.3, -2) },
    { txt: 'BEDROOM · NE', p: new THREE.Vector3(1.8, 0.3, -2) },
    { txt: 'LIVING ROOM', p: new THREE.Vector3(-1.8, 0.3, 2) },
    { txt: 'KITCHEN · SE', p: new THREE.Vector3(3.2, 0.3, 2) },
  ];
  const roomLbls = ROOMS.map((r) => {
    const el = document.createElement('div');
    el.className = 'absolute -translate-x-1/2 -translate-y-1/2 text-[8px] tracking-[0.22em] font-mono-ui font-medium text-primary/30 pointer-events-none whitespace-nowrap';
    el.textContent = r.txt;
    labelHost.appendChild(el);
    return { el, p: r.p };
  });
  const defLbls = DEFECTS.map((d) => {
    const el = document.createElement('div');
    el.id = 'lbl-' + d.id;
    el.className = 'absolute flex items-center gap-1.5 pointer-events-none transition-opacity translate-x-3 -translate-y-1/2';
    el.innerHTML = `
      <div class="w-1.5 h-1.5 rounded-full" style="background:${d.color};box-shadow:0 0 8px ${d.color}"></div>
      <span class="text-[9px] font-mono-ui font-bold tracking-[0.08em] text-foreground/60" data-id>${d.id}</span>
    `;
    labelHost.appendChild(el);
    return { el, p: new THREE.Vector3(...d.pos), did: d.id };
  });

  // Camera control
  function updateCam() {
    const x = orb.r * Math.sin(orb.phi) * Math.sin(orb.theta);
    const y = orb.r * Math.cos(orb.phi);
    const z = orb.r * Math.sin(orb.phi) * Math.cos(orb.theta);
    perspCam.position.set(tgt.x + x, tgt.y + y, tgt.z + z);
    perspCam.lookAt(tgt);
  }
  updateCam();

  let dragging = false, pmx = 0, pmy = 0, hasMoved = false;
  let orbitEnabled = true;

  const onDown = (e: MouseEvent) => { if (e.button === 0) { dragging = true; pmx = e.clientX; pmy = e.clientY; hasMoved = false; } };
  const onUp = () => { dragging = false; };
  const onMove = (e: MouseEvent) => {
    if (!dragging || !orbitEnabled) return;
    if (Math.abs(e.clientX - pmx) + Math.abs(e.clientY - pmy) > 3) hasMoved = true;
    orb.theta -= (e.clientX - pmx) * 0.008;
    orb.phi = Math.max(0.10, Math.min(Math.PI / 2 - 0.05, orb.phi - (e.clientY - pmy) * 0.007));
    pmx = e.clientX; pmy = e.clientY; updateCam();
  };
  const onWheel = (e: WheelEvent) => {
    if (activeCam === orthoCam) {
      orthoCam.zoom = Math.max(0.3, Math.min(3, orthoCam.zoom + e.deltaY * -0.002));
      orthoCam.updateProjectionMatrix();
    } else { orb.r = Math.max(7, Math.min(40, orb.r + e.deltaY * 0.04)); updateCam(); }
  };
  const rc = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const onClick = (e: MouseEvent) => {
    if (hasMoved) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    rc.setFromCamera(mouse, activeCam as THREE.PerspectiveCamera);
    const hits = rc.intersectObjects(markers);
    if (hits.length) onSelect((hits[0].object.userData as any).did as string);
  };
  const onMouseMoveHover = (e: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    rc.setFromCamera(mouse, activeCam as THREE.PerspectiveCamera);
    const hits = rc.intersectObjects(markers);
    const id = hits.length ? ((hits[0].object.userData as any).did as string) : null;
    renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    onHover(id);
  };

  renderer.domElement.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);
  renderer.domElement.addEventListener('mousemove', onMove);
  renderer.domElement.addEventListener('mousemove', onMouseMoveHover);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.style.cursor = 'grab';

  // Fly-to
  let flyAnim: { from: { theta: number; phi: number; r: number }; to: { theta: number; phi: number; r: number }; t: number } | null = null;
  function flyTo(did: string) {
    const d = DEFECTS.find((x) => x.id === did); if (!d) return;
    const dx = d.pos[0] - tgt.x, dz = d.pos[2] - tgt.z;
    const idealTheta = Math.atan2(dx, dz) + Math.PI * 0.3;
    flyAnim = { from: { theta: orb.theta, phi: orb.phi, r: orb.r }, to: { theta: idealTheta, phi: 0.72, r: 16 }, t: 0 };
  }
  const easeIO = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

  // Mode
  let currentMode: ViewMode = '3d';
  function setMode(mode: ViewMode) {
    currentMode = mode;
    renderer.clippingPlanes = [];
    setThermalVis(false);
    scene.background = new THREE.Color(0x05080f);
    scene.fog = new THREE.Fog(0x05080f, 24, 58);
    wallMeshes.forEach((m) => (m.material = wallMat));
    floorMeshes.forEach((m) => (m.material = floorMat));
    cm.visible = mode !== 'plan';
    switch (mode) {
      case '3d': activeCam = perspCam; orbitEnabled = true; break;
      case 'plan':
        activeCam = orthoCam; orbitEnabled = false;
        orthoCam.zoom = 1; orthoCam.updateProjectionMatrix();
        scene.fog = new THREE.Fog(0x05080f, 60, 80);
        break;
      case 'section':
        activeCam = perspCam; orbitEnabled = true;
        renderer.clippingPlanes = [sectionPlane];
        break;
      case 'thermal':
        activeCam = perspCam; orbitEnabled = true;
        setThermalVis(true);
        scene.background = new THREE.Color(0x010408);
        scene.fog = new THREE.Fog(0x010408, 22, 50);
        wallMeshes.forEach((m) => (m.material = thermalWallMat));
        floorMeshes.forEach((m) => (m.material = thermalFloorMat));
        break;
    }
    resize();
  }

  function setSection(v: number) {
    sectionPlane.constant = -v;
  }

  function toggleLayer(name: LayerKey, on: boolean) {
    layers[name].forEach((m) => (m.visible = on));
  }

  function select(id: string) {
    const d = DEFECTS.find((x) => x.id === id); if (!d) return;
    defLbls.forEach((l) => {
      const span = l.el.querySelector('[data-id]') as HTMLElement;
      if (span) span.style.color = l.did === id ? d.color : '';
    });
    if (activeCam === perspCam && orbitEnabled) flyTo(id);
  }

  function resetView() {
    flyAnim = { from: { theta: orb.theta, phi: orb.phi, r: orb.r }, to: { theta: 0.68, phi: 0.78, r: 21 }, t: 0 };
  }

  function resize() {
    const w = canvasHost.clientWidth, h = canvasHost.clientHeight;
    if (w === 0 || h === 0) return;
    perspCam.aspect = w / h; perspCam.updateProjectionMatrix();
    const asp = w / h;
    orthoCam.left = -9; orthoCam.right = 9;
    orthoCam.top = 9 / asp; orthoCam.bottom = -9 / asp;
    orthoCam.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvasHost);
  resize();

  // Animate
  let T = 0; let raf = 0;
  function updateLabels() {
    const w = canvasHost.clientWidth, h = canvasHost.clientHeight;
    const proj = (p: THREE.Vector3) => {
      const v = p.clone().project(activeCam as THREE.Camera);
      return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1 };
    };
    roomLbls.forEach((r) => {
      const { x, y, behind } = proj(r.p);
      r.el.style.display = behind ? 'none' : '';
      r.el.style.left = x + 'px'; r.el.style.top = y + 'px';
    });
    defLbls.forEach((l) => {
      const { x, y, behind } = proj(l.p);
      l.el.style.display = behind ? 'none' : '';
      l.el.style.left = x + 'px'; l.el.style.top = y + 'px';
    });
  }

  function animate() {
    raf = requestAnimationFrame(animate);
    T += 0.016;
    if (flyAnim) {
      flyAnim.t = Math.min(1, flyAnim.t + 0.022);
      const e = easeIO(flyAnim.t);
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      let dt = flyAnim.to.theta - flyAnim.from.theta;
      if (dt > Math.PI) dt -= Math.PI * 2; if (dt < -Math.PI) dt += Math.PI * 2;
      orb.theta = flyAnim.from.theta + dt * e;
      orb.phi = lerp(flyAnim.from.phi, flyAnim.to.phi, e);
      orb.r = lerp(flyAnim.from.r, flyAnim.to.r, e);
      updateCam();
      if (flyAnim.t >= 1) flyAnim = null;
    }
    defectInternal.forEach((di, i) => {
      const isSel = selectedRef.current === di.d.id;
      di.mat.emissiveIntensity = isSel ? 0.85 + 0.2 * Math.sin(T * 4.5) : 0.32 + 0.14 * Math.sin(T * 1.7 + i * 1.3);
      di.sphere.scale.setScalar(isSel ? 1.45 : 1.0);
      const haloMat = (di.halo as unknown as THREE.Sprite).material as THREE.SpriteMaterial;
      haloMat.opacity = isSel ? 0.55 + 0.15 * Math.sin(T * 3) : 0.28 + 0.06 * Math.sin(T * 1.2 + i);
      const s = isSel ? 1.4 : 1.0;
      (di.halo as unknown as THREE.Sprite).scale.set(0.95 * s, 0.95 * s, 1);
    });
    glowRings.forEach((r) => {
      const ud = r.userData as { phase: number; didx: number };
      const ph = (ud.phase + T * 0.38) % 1;
      const s = 0.15 + ph * 3.0;
      r.scale.set(s, 1, s);
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.32;
    });
    updateLabels();
    renderer.render(scene, activeCam as THREE.Camera);
  }
  animate();

  function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    renderer.domElement.removeEventListener('mousedown', onDown);
    window.removeEventListener('mouseup', onUp);
    renderer.domElement.removeEventListener('mousemove', onMove);
    renderer.domElement.removeEventListener('mousemove', onMouseMoveHover);
    renderer.domElement.removeEventListener('wheel', onWheel as EventListener);
    renderer.domElement.removeEventListener('click', onClick);
    renderer.dispose();
    if (renderer.domElement.parentElement === canvasHost) canvasHost.removeChild(renderer.domElement);
    [...roomLbls, ...defLbls].forEach((l) => l.el.remove());
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
  }

  return {
    api: { select, setMode, toggleLayer, setSection, resetView },
    dispose,
  };
}

export function useForensicScene(
  canvasRef: React.RefObject<HTMLDivElement>,
  labelRef: React.RefObject<HTMLDivElement>,
  selected: string | null,
  onSelect: (id: string) => void,
  onHover: (id: string | null) => void,
) {
  const apiRef = useRef<SceneApi | null>(null);
  const selectedRef = useRef<string | null>(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!canvasRef.current || !labelRef.current) return;
    const built = buildForensicScene({
      canvasHost: canvasRef.current,
      labelHost: labelRef.current,
      onSelect,
      onHover,
      selectedRef,
    });
    apiRef.current = built.api;
    return () => built.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return apiRef;
}