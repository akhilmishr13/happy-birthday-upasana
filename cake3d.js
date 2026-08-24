import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CANDLE_COUNT = 28;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function noiseTexture(size, base, amp) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amp;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function marbleTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4eee6';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(160,140,130,.28)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < size) {
      x += (Math.random() - 0.5) * 28;
      y += 18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function teardrop(w, h, segs = 12) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = t * h;
    const r = Math.max(0.001, w * Math.sin(Math.PI * t) * (1 - t * 0.12));
    pts.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(pts, segs);
}

function dripGeo() {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.05, 0.0),
    new THREE.Vector2(0.048, -0.04),
    new THREE.Vector2(0.03, -0.12),
    new THREE.Vector2(0.018, -0.2),
    new THREE.Vector2(0.012, -0.28),
    new THREE.Vector2(0.0, -0.32)
  ];
  return new THREE.LatheGeometry(pts, 10);
}

export async function createPartyScene(canvas, { onGlow } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 1.72, 3.35);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 2.2;
  controls.maxDistance = 4.6;
  controls.minPolarAngle = 0.7;
  controls.maxPolarAngle = 1.35;
  controls.target.set(0, 0.48, 0);
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.55;

  const hemi = new THREE.HemisphereLight(0xffe6c8, 0x3a2048, 0.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0d8, 1.15);
  key.position.set(2.4, 4.2, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8b8ff, 0.28);
  fill.position.set(-3, 1.4, -1.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc8a0, 0.35);
  rim.position.set(0, 1.2, -3);
  scene.add(rim);

  const candleLight = new THREE.PointLight(0xffb14a, 3.4, 8, 1.6);
  candleLight.position.set(0, 1.55, 0);
  scene.add(candleLight);

  const party = new THREE.Group();
  scene.add(party);

  // stand
  const marble = new THREE.MeshStandardMaterial({
    map: marbleTexture(),
    color: 0xf7f1e8,
    roughness: 0.22,
    metalness: 0.12
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xf0d48a,
    metalness: 1,
    roughness: 0.18,
    emissive: 0x3a2a10,
    emissiveIntensity: 0.15
  });

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.58, 0.06, 64), marble);
  plate.position.y = 0.03;
  plate.receiveShadow = true;
  plate.castShadow = true;
  party.add(plate);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.03, 10, 64), gold);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.06;
  party.add(lip);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.42, 24), gold);
  stem.position.y = -0.24;
  stem.castShadow = true;
  party.add(stem);

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.08, 32), gold);
  foot.position.y = -0.46;
  foot.castShadow = true;
  party.add(foot);

  const board = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.05, 64), gold);
  board.position.y = 0.085;
  party.add(board);

  // cake — modern single layer
  const cakeGroup = new THREE.Group();
  cakeGroup.position.y = 0.11;
  party.add(cakeGroup);

  const frostingMap = noiseTexture(512, '#fff4eb', 14);
  const frosting = new THREE.MeshPhysicalMaterial({
    map: frostingMap,
    color: 0xfff3ea,
    roughness: 0.38,
    metalness: 0.02,
    clearcoat: 0.42,
    clearcoatRoughness: 0.38,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xffd8c8)
  });
  const frostingClip = frosting.clone();

  const innerCake = new THREE.MeshPhysicalMaterial({
    color: 0xf2d3b0,
    roughness: 0.7,
    map: noiseTexture(256, '#f2d3b0', 18)
  });
  const creamFill = new THREE.MeshPhysicalMaterial({
    color: 0xffe8ef,
    roughness: 0.55
  });

  const R = 1.38;
  const H = 0.46;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.02, H, 80), frostingClip);
  body.position.y = H / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  cakeGroup.add(body);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.995, R * 0.995, 0.035, 80), frostingClip);
  top.position.y = H + 0.01;
  top.castShadow = true;
  cakeGroup.add(top);

  const piped = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.93, 0.055, 14, 80),
    new THREE.MeshPhysicalMaterial({
      color: 0xfffaf6,
      roughness: 0.28,
      clearcoat: 0.55
    })
  );
  piped.rotation.x = Math.PI / 2;
  piped.position.y = H + 0.04;
  cakeGroup.add(piped);

  const ribbon = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 1.015, R * 1.015, 0.08, 80),
    new THREE.MeshPhysicalMaterial({
      color: 0xe59aaa,
      roughness: 0.32,
      metalness: 0.04,
      sheen: 0.7,
      sheenColor: new THREE.Color(0xffd0dc)
    })
  );
  ribbon.position.y = H * 0.42;
  cakeGroup.add(ribbon);
  const bow = new THREE.Group();
  const bowRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 10, 20), gold);
  const loopA = bowRing.clone(); loopA.scale.set(1.1, 0.7, 1); loopA.position.x = -0.08;
  const loopB = bowRing.clone(); loopB.scale.set(1.1, 0.7, 1); loopB.position.x = 0.08;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), gold);
  bow.add(loopA, loopB, knot);
  bow.position.set(0, H * 0.42, R * 1.02);
  cakeGroup.add(bow);

  const basePipe = piped.clone();
  basePipe.position.y = 0.05;
  cakeGroup.add(basePipe);

  const pearlGeo = new THREE.SphereGeometry(0.028, 10, 10);
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff6ea,
    roughness: 0.12,
    metalness: 0.15,
    clearcoat: 1
  });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const pearl = new THREE.Mesh(pearlGeo, pearlMat);
    pearl.position.set(Math.cos(a) * R * 0.93, H + 0.07, Math.sin(a) * R * 0.93);
    cakeGroup.add(pearl);
  }

  // blush gold drip
  const dripMat = new THREE.MeshPhysicalMaterial({
    color: 0xc45a78,
    roughness: 0.12,
    metalness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    emissive: 0x4a1020,
    emissiveIntensity: 0.08
  });
  const dGeo = dripGeo();
  const dripCount = 16;
  for (let i = 0; i < dripCount; i++) {
    const a = (i / dripCount) * Math.PI * 2 + 0.08;
    const drip = new THREE.Mesh(dGeo, dripMat);
    const len = 0.85 + ((i * 17) % 10) / 18;
    drip.scale.set(1, len, 1);
    drip.position.set(Math.cos(a) * (R * 0.97), H - 0.02, Math.sin(a) * (R * 0.97));
    cakeGroup.add(drip);
  }
  const dripRing = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.97, 0.028, 10, 64),
    dripMat
  );
  dripRing.rotation.x = Math.PI / 2;
  dripRing.position.y = H - 0.01;
  cakeGroup.add(dripRing);

  // gold leaf flakes
  const flakeMat = new THREE.MeshStandardMaterial({
    color: 0xe6c35c,
    metalness: 1,
    roughness: 0.18
  });
  for (let i = 0; i < 9; i++) {
    const flake = new THREE.Mesh(new THREE.CircleGeometry(0.045 + (i % 3) * 0.01, 5), flakeMat);
    const a = i * 0.7;
    flake.position.set(Math.cos(a) * 0.28, H + 0.03, Math.sin(a) * 0.22 - 0.05);
    flake.rotation.x = -Math.PI / 2;
    flake.rotation.z = a;
    cakeGroup.add(flake);
  }

  // berry cluster
  function berry(color, r, x, y, z) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 16),
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.28,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2
      })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    cakeGroup.add(m);
  }
  const by = H + 0.07;
  berry(0x8b1e3f, 0.055, 0.02, by, 0.04);
  berry(0xa32648, 0.048, 0.09, by - 0.01, -0.02);
  berry(0x6b1c38, 0.042, -0.06, by, 0.0);
  berry(0x2a3d6b, 0.032, 0.0, by - 0.01, 0.11);
  berry(0x24365e, 0.028, -0.08, by - 0.015, 0.08);
  berry(0x2a3d6b, 0.026, 0.1, by - 0.018, 0.07);
  berry(0xc9a227, 0.016, 0.05, by + 0.02, 0.09);
  berry(0xc9a227, 0.014, -0.03, by + 0.015, -0.08);

  // tiny sugar flowers
  function flower(x, z, color) {
    const g = new THREE.Group();
    const petal = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 10),
      new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, side: THREE.DoubleSide })
    );
    for (let i = 0; i < 5; i++) {
      const p = petal.clone();
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.028, 0, Math.sin(a) * 0.028);
      p.rotation.x = -Math.PI / 2.2;
      g.add(p);
    }
    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xf2d36b })
    );
    center.position.y = 0.01;
    g.add(center);
    g.position.set(x, H + 0.04, z);
    cakeGroup.add(g);
  }
  flower(0.22, 0.18, 0xf4c4d0);
  flower(-0.2, 0.16, 0xf8e6c8);
  flower(0.18, -0.2, 0xd8ead0);
  flower(-0.16, -0.18, 0xf4c4d0);

  // ── slice (hidden until cut) ──
  const sliceAngle = 0.42;
  const sliceGroup = new THREE.Group();
  const sliceBody = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R * 1.02, H, 24, 1, false, -sliceAngle / 2, sliceAngle),
    frosting
  );
  sliceBody.position.y = H / 2;
  sliceGroup.add(sliceBody);
  const sliceTop = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.995, 24, -sliceAngle / 2, sliceAngle),
    frosting
  );
  sliceTop.rotation.x = -Math.PI / 2;
  sliceTop.position.y = H + 0.018;
  sliceGroup.add(sliceTop);

  function radialFace(angle, material) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(R, H), material);
    mesh.position.set(Math.cos(angle) * (R / 2), H / 2, Math.sin(angle) * (R / 2));
    mesh.rotation.y = -angle;
    return mesh;
  }
  innerCake.side = THREE.DoubleSide;
  creamFill.side = THREE.DoubleSide;
  sliceGroup.add(radialFace(-sliceAngle / 2, innerCake));
  sliceGroup.add(radialFace(sliceAngle / 2, creamFill));
  sliceGroup.visible = false;
  cakeGroup.add(sliceGroup);

  const clipA = new THREE.Plane(new THREE.Vector3(Math.sin(-sliceAngle / 2), 0, -Math.cos(-sliceAngle / 2)), 0);
  const clipB = new THREE.Plane(new THREE.Vector3(-Math.sin(sliceAngle / 2), 0, Math.cos(sliceAngle / 2)), 0);

  // ── candles ──
  const candleBodyGeo = new THREE.CylinderGeometry(0.018, 0.022, 1, 10);
  const wickGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.045, 6);
  const flameOuterGeo = teardrop(0.028, 0.09, 10);
  const flameInnerGeo = teardrop(0.014, 0.06, 8);
  const wickMat = new THREE.MeshStandardMaterial({ color: 0x2a1c14 });
  const flameOuterMat = new THREE.MeshBasicMaterial({
    color: 0xff7a28,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const flameInnerMat = new THREE.MeshBasicMaterial({
    color: 0xfff3c0,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const waxColors = [0xf7efe4, 0xf4c4d0, 0xe8c97a, 0xd8ead0, 0xf7efe4, 0xf0d0c0];

  const candles = [];
  const placements = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.05;
    placements.push({ x: Math.cos(a) * 0.92, z: Math.sin(a) * 0.92, h: 0.22 + (i % 5) * 0.012 });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.22;
    placements.push({ x: Math.cos(a) * 0.55, z: Math.sin(a) * 0.55, h: 0.2 + (i % 4) * 0.01 });
  }

  placements.forEach((p, i) => {
    const g = new THREE.Group();
    const h = p.h;
    const wax = new THREE.MeshStandardMaterial({
      color: waxColors[i % waxColors.length],
      roughness: 0.42
    });
    const bodyC = new THREE.Mesh(candleBodyGeo, wax);
    bodyC.scale.y = h;
    bodyC.position.y = h / 2;
    bodyC.castShadow = true;
    g.add(bodyC);
    const wick = new THREE.Mesh(wickGeo, wickMat);
    wick.position.y = h + 0.02;
    g.add(wick);
    const flame = new THREE.Group();
    const fo = new THREE.Mesh(flameOuterGeo, flameOuterMat.clone());
    const fi = new THREE.Mesh(flameInnerGeo, flameInnerMat.clone());
    fi.position.y = 0.012;
    flame.add(fo, fi);
    flame.position.y = h + 0.03;
    g.add(flame);
    g.position.set(p.x, H + 0.02, p.z);
    cakeGroup.add(g);
    candles.push({
      group: g,
      flame,
      lit: true,
      phase: Math.random() * Math.PI * 2,
      height: h,
      smoke: 0
    });
  });

  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xd8d0dc,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  candles.forEach(c => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), smokeMat.clone());
    s.position.y = c.height + 0.06;
    c.group.add(s);
    c.smokeMesh = s;
  });

  let lit = CANDLE_COUNT;
  let cutting = false;
  let celebrating = false;
  let running = true;
  const clock = new THREE.Clock();

  function size() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight * 0.72;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  size();
  const ro = new ResizeObserver(size);
  ro.observe(canvas);

  function setGlow() {
    const t = lit / CANDLE_COUNT;
    candleLight.intensity = 0.4 + t * 3.2;
    onGlow?.(t);
  }

  function extinguishOne(c) {
    if (!c.lit) return;
    c.lit = false;
    c.flame.visible = false;
    c.smoke = 1;
    lit = Math.max(0, lit - 1);
    setGlow();
  }

  function blowOutAll() {
    const remaining = candles.filter(c => c.lit).sort((a, b) => b.group.position.z - a.group.position.z);
    remaining.forEach((c, i) => {
      setTimeout(() => extinguishOne(c), i * 32);
    });
    return remaining.length;
  }

  function blowOut(strength = 1) {
    if (lit <= 0) return 0;
    const remaining = candles.filter(c => c.lit).sort((a, b) => b.group.position.z - a.group.position.z);
    const n = strength > 0.48 ? remaining.length : Math.max(4, Math.ceil(remaining.length * (0.35 + strength)));
    remaining.slice(0, n).forEach((c, i) => {
      setTimeout(() => extinguishOne(c), i * 28);
    });
    return Math.min(n, remaining.length);
  }

  function cutCake() {
    if (cutting) return;
    cutting = true;
    controls.autoRotate = false;

    frostingClip.clippingPlanes = [clipA, clipB];
    cakeGroup.add(radialFace(-sliceAngle / 2, innerCake));
    cakeGroup.add(radialFace(sliceAngle / 2, creamFill));

    sliceGroup.visible = true;
    const start = performance.now();
    const dur = 1100;
    function slide(now) {
      const k = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      sliceGroup.position.set(e * 0.55, e * 0.12, e * 0.85);
      sliceGroup.rotation.z = e * 0.18;
      sliceGroup.rotation.x = e * 0.08;
      if (k < 1) requestAnimationFrame(slide);
    }
    requestAnimationFrame(slide);
    celebrating = true;
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    controls.update();

    candles.forEach(c => {
      if (c.lit && !reduced) {
        const f = 0.92 + Math.sin(t * 14 + c.phase) * 0.1 + Math.sin(t * 23 + c.phase) * 0.05;
        c.flame.scale.set(f * 0.85, f, f * 0.85);
        c.flame.rotation.z = Math.sin(t * 11 + c.phase) * 0.12;
      }
      if (c.smoke > 0) {
        c.smoke -= 0.016;
        const sm = c.smokeMesh;
        sm.material.opacity = Math.max(0, c.smoke * 0.45);
        sm.position.y += 0.01;
        sm.scale.setScalar(1 + (1 - c.smoke) * 2.2);
      }
    });

    const glow = lit / CANDLE_COUNT;
    candleLight.intensity = 0.4 + glow * 3.2 + Math.sin(t * 9) * 0.14 * glow;

    if (celebrating && !reduced) {
      party.position.y = Math.sin(t * 2) * 0.012;
    }

    renderer.render(scene, camera);
  }
  loop();
  setGlow();

  return {
    blowOut,
    blowOutAll,
    cutCake,
    getLit: () => lit,
    dispose() {
      running = false;
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
    }
  };
}
