import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { pickCakeStyle } from './cakes.js';

const CANDLE_COUNT = 29;
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

function heartGeometry(s, h) {
  const shape = new THREE.Shape();
  shape.moveTo(0, s * 0.32);
  shape.bezierCurveTo(s * 0.15, s * 0.72, s * 0.85, s * 0.55, s * 0.72, s * 0.05);
  shape.bezierCurveTo(s * 0.55, -s * 0.35, s * 0.12, -s * 0.7, 0, -s * 0.92);
  shape.bezierCurveTo(-s * 0.12, -s * 0.7, -s * 0.55, -s * 0.35, -s * 0.72, s * 0.05);
  shape.bezierCurveTo(-s * 0.85, s * 0.55, -s * 0.15, s * 0.72, 0, s * 0.32);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, h / 2, 0);
  return geo;
}

function frostingMat(style) {
  return new THREE.MeshPhysicalMaterial({
    map: noiseTexture(512, style.hex, 14),
    color: style.frosting,
    roughness: 0.38,
    metalness: 0.02,
    clearcoat: 0.42,
    clearcoatRoughness: 0.38,
    sheen: 0.4,
    sheenColor: new THREE.Color(style.sheen)
  });
}

export async function createPartyScene(canvas, { onGlow, style, unlit = false } = {}) {
  const look = style || pickCakeStyle();
  const R = look.R;
  const H = look.H;
  const canCut = !!look.cut && (look.shape === 'round' || look.shape === 'tall' || look.shape === 'short' || look.shape === 'taper');

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
  party.position.y = unlit ? -0.55 : -2.55;
  scene.add(party);
  camera.position.set(0, 1.55 + H * 0.45, 3.2 + R * 0.12);
  controls.target.set(0, 0.28 + H * 0.45, 0);

  const marble = new THREE.MeshStandardMaterial({
    map: marbleTexture(),
    color: 0xf7f1e8,
    roughness: 0.22,
    metalness: 0.12
  });
  const metalColor = look.name.includes('Midnight') || look.name.includes('Blueberry') ? 0xc0c8d8 : 0xf0d48a;
  const gold = new THREE.MeshStandardMaterial({
    color: metalColor,
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
  party.add(foot);
  const board = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.05, 64), gold);
  board.position.y = 0.085;
  party.add(board);

  const cakeGroup = new THREE.Group();
  cakeGroup.position.y = 0.11;
  party.add(cakeGroup);

  const frosting = frostingMat(look);
  const innerCake = new THREE.MeshPhysicalMaterial({
    color: look.sponge,
    roughness: 0.7,
    map: noiseTexture(256, look.hex, 18)
  });
  const creamFill = new THREE.MeshPhysicalMaterial({ color: look.cream, roughness: 0.55 });
  innerCake.side = THREE.DoubleSide;
  creamFill.side = THREE.DoubleSide;

  if (look.shape === 'heart') {
    const body = new THREE.Mesh(heartGeometry(R * 0.72, H), frosting);
    body.castShadow = true;
    body.receiveShadow = true;
    cakeGroup.add(body);
  } else if (look.shape === 'bundt') {
    const body = new THREE.Mesh(new THREE.TorusGeometry(R * 0.62, H * 0.38, 18, 48), frosting);
    body.rotation.x = Math.PI / 2;
    body.position.y = H * 0.42;
    body.castShadow = true;
    cakeGroup.add(body);
  } else if (look.shape === 'square') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(R * 1.85, H, R * 1.85), frosting);
    body.position.y = H / 2;
    body.castShadow = true;
    cakeGroup.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(R * 1.82, 0.03, R * 1.82), frosting);
    top.position.y = H + 0.01;
    cakeGroup.add(top);
  } else {
    const topR = look.shape === 'taper' ? R * 0.9 : R;
    const botR = look.shape === 'taper' ? R * 1.06 : R * 1.02;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, H, 80), frosting);
    body.position.y = H / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    cakeGroup.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(topR * 0.995, topR * 0.995, 0.035, 80), frosting);
    top.position.y = H + 0.01;
    cakeGroup.add(top);
  }

  if (look.piped && look.shape !== 'heart' && look.shape !== 'bundt' && look.shape !== 'square') {
    const piped = new THREE.Mesh(
      new THREE.TorusGeometry(R * 0.93, 0.055, 14, 80),
      new THREE.MeshPhysicalMaterial({ color: look.pearl, roughness: 0.28, clearcoat: 0.55 })
    );
    piped.rotation.x = Math.PI / 2;
    piped.position.y = H + 0.04;
    cakeGroup.add(piped);
    const basePipe = piped.clone();
    basePipe.position.y = 0.05;
    cakeGroup.add(basePipe);
  }

  if (look.ribbon && look.shape !== 'heart' && look.shape !== 'bundt') {
    const ribbonMat = new THREE.MeshPhysicalMaterial({
      color: look.ribbon,
      roughness: 0.32,
      metalness: 0.04,
      sheen: 0.7,
      sheenColor: new THREE.Color(look.sheen)
    });
    if (look.shape === 'square') {
      const w = R * 1.85;
      const bandH = 0.08;
      const t = 0.03;
      const y = H * 0.42;
      const front = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, bandH, t), ribbonMat);
      front.position.set(0, y, w / 2);
      const back = front.clone();
      back.position.z = -w / 2;
      const left = new THREE.Mesh(new THREE.BoxGeometry(t, bandH, w + 0.02), ribbonMat);
      left.position.set(-w / 2, y, 0);
      const right = left.clone();
      right.position.x = w / 2;
      cakeGroup.add(front, back, left, right);
    } else {
      const ribbon = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 1.015, R * 1.015, 0.08, 80),
        ribbonMat
      );
      ribbon.position.y = H * 0.42;
      cakeGroup.add(ribbon);
    }
    const bowRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 10, 20), gold);
    const bow = new THREE.Group();
    const loopA = bowRing.clone(); loopA.scale.set(1.1, 0.7, 1); loopA.position.x = -0.08;
    const loopB = bowRing.clone(); loopB.scale.set(1.1, 0.7, 1); loopB.position.x = 0.08;
    bow.add(loopA, loopB, new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), gold));
    bow.position.set(0, H * 0.42, look.shape === 'square' ? R * 0.95 : R * 1.02);
    cakeGroup.add(bow);
  }

  if (look.pearls && look.shape !== 'heart' && look.shape !== 'bundt') {
    const pearlGeo = new THREE.SphereGeometry(0.028, 10, 10);
    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: look.pearl, roughness: 0.12, metalness: 0.15, clearcoat: 1
    });
    const n = look.shape === 'square' ? 24 : 28;
    for (let i = 0; i < n; i++) {
      const pearl = new THREE.Mesh(pearlGeo, pearlMat);
      if (look.shape === 'square') {
        const side = i % 4;
        const t = (Math.floor(i / 4) + 0.5) / 6 - 0.5;
        const d = R * 0.86;
        const x = side === 0 ? t * 2 * d : side === 2 ? -t * 2 * d : side === 1 ? d : -d;
        const z = side === 1 ? t * 2 * d : side === 3 ? -t * 2 * d : side === 0 ? d : -d;
        pearl.position.set(x, H + 0.07, z);
      } else {
        const a = (i / n) * Math.PI * 2;
        pearl.position.set(Math.cos(a) * R * 0.93, H + 0.07, Math.sin(a) * R * 0.93);
      }
      cakeGroup.add(pearl);
    }
  }

  if (look.drip && look.shape !== 'heart' && look.shape !== 'square') {
    const dripMat = new THREE.MeshPhysicalMaterial({
      color: look.drip,
      roughness: 0.12,
      metalness: 0.22,
      clearcoat: 0.85,
      emissive: look.drip,
      emissiveIntensity: 0.04
    });
    const dGeo = dripGeo();
    const dripR = look.shape === 'bundt' ? R * 0.95 : R * 0.97;
    const dripY = look.shape === 'bundt' ? H * 0.7 : H - 0.02;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.08;
      const drip = new THREE.Mesh(dGeo, dripMat);
      drip.scale.set(1, 0.85 + ((i * 17) % 10) / 18, 1);
      drip.position.set(Math.cos(a) * dripR, dripY, Math.sin(a) * dripR);
      cakeGroup.add(drip);
    }
    if (look.shape !== 'bundt') {
      const dripRing = new THREE.Mesh(new THREE.TorusGeometry(R * 0.97, 0.028, 10, 64), dripMat);
      dripRing.rotation.x = Math.PI / 2;
      dripRing.position.y = H - 0.01;
      cakeGroup.add(dripRing);
    }
  }

  if (look.goldLeaf) {
    const flakeMat = new THREE.MeshStandardMaterial({ color: 0xe6c35c, metalness: 1, roughness: 0.18 });
    for (let i = 0; i < 9; i++) {
      const flake = new THREE.Mesh(new THREE.CircleGeometry(0.045 + (i % 3) * 0.01, 5), flakeMat);
      const a = i * 0.7;
      flake.position.set(Math.cos(a) * 0.28, H + 0.04, Math.sin(a) * 0.22 - 0.05);
      flake.rotation.x = -Math.PI / 2;
      flake.rotation.z = a;
      cakeGroup.add(flake);
    }
  }

  function berry(color, r, x, y, z) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 16),
      new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.8 })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    cakeGroup.add(m);
  }
  if (look.berries) {
    const by = H + 0.07;
    berry(0x8b1e3f, 0.055, 0.02, by, 0.04);
    berry(0xa32648, 0.048, 0.09, by - 0.01, -0.02);
    berry(0x6b1c38, 0.042, -0.06, by, 0.0);
    berry(0x2a3d6b, 0.032, 0.0, by - 0.01, 0.11);
    berry(0xc9a227, 0.016, 0.05, by + 0.02, 0.09);
  }

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
    g.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xf2d36b })
    ));
    g.position.set(x, H + 0.05, z);
    cakeGroup.add(g);
  }
  if (look.flowers) {
    flower(0.22, 0.18, look.ribbon || 0xf4c4d0);
    flower(-0.2, 0.16, 0xf8e6c8);
    flower(0.18, -0.2, 0xd8ead0);
    flower(-0.16, -0.18, look.cream);
  }

  if (look.sprinkles) {
    const cols = [0xf4b8c5, 0xe8c97a, 0xb7cbb0, 0xc5d0e8, 0xffffff, 0xe0899a];
    for (let i = 0; i < 70; i++) {
      const bit = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.05, 5),
        new THREE.MeshStandardMaterial({ color: cols[i % cols.length] })
      );
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * R * 0.75;
      bit.position.set(Math.cos(a) * r, H + 0.04, Math.sin(a) * r);
      bit.rotation.set(Math.random(), Math.random(), Math.random());
      cakeGroup.add(bit);
    }
  }

  if (look.macarons) {
    const macCols = [look.ribbon || 0xf4c4d0, look.drip || 0xe8c97a, 0xd8ead0, 0xc5d0e8];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const g = new THREE.Group();
      const col = macCols[i % macCols.length];
      const shell = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.45 });
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, 6.3, 0, 1.4), shell);
      top.position.y = 0.04;
      const bot = top.clone();
      bot.rotation.x = Math.PI;
      bot.position.y = 0;
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 12), creamFill);
      fill.position.y = 0.02;
      g.add(top, bot, fill);
      g.position.set(Math.cos(a) * R * 0.72, H + 0.02, Math.sin(a) * R * 0.72);
      cakeGroup.add(g);
    }
  }

  const sliceGroup = new THREE.Group();
  sliceGroup.visible = false;
  if (canCut) {
    const sliceAngle = 0.42;
    const topR = look.shape === 'taper' ? R * 0.9 : R;
    const botR = look.shape === 'taper' ? R * 1.06 : R * 1.02;
    const sliceBody = new THREE.Mesh(
      new THREE.CylinderGeometry(topR, botR, H, 24, 1, false, -sliceAngle / 2, sliceAngle),
      frosting
    );
    sliceBody.position.y = H / 2;
    sliceGroup.add(sliceBody);
    function radialFace(angle, material) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(R, H), material);
      mesh.position.set(Math.cos(angle) * (R / 2), H / 2, Math.sin(angle) * (R / 2));
      mesh.rotation.y = -angle;
      return mesh;
    }
    sliceGroup.add(radialFace(-sliceAngle / 2, innerCake));
    sliceGroup.add(radialFace(sliceAngle / 2, creamFill));
  }
  cakeGroup.add(sliceGroup);

  const candleBodyGeo = new THREE.CylinderGeometry(0.018, 0.022, 1, 10);
  const wickGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.045, 6);
  const flameOuterGeo = teardrop(0.028, 0.09, 10);
  const flameInnerGeo = teardrop(0.014, 0.06, 8);
  const wickMat = new THREE.MeshStandardMaterial({ color: 0x2a1c14 });
  const flameOuterMat = new THREE.MeshBasicMaterial({
    color: 0xff7a28, transparent: true, opacity: 0.72,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const flameInnerMat = new THREE.MeshBasicMaterial({
    color: 0xfff3c0, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false
  });

  const candles = [];
  const placements = [];
  if (look.shape === 'bundt') {
    for (let i = 0; i < CANDLE_COUNT; i++) {
      const a = (i / CANDLE_COUNT) * Math.PI * 2;
      placements.push({ x: Math.cos(a) * R * 0.62, z: Math.sin(a) * R * 0.62, h: 0.2 + (i % 5) * 0.01 });
    }
  } else {
    const outerN = 17;
    const innerN = 12;
    const outerRad = look.shape === 'square' ? R * 0.7 : look.shape === 'heart' ? R * 0.4 : R * 0.66;
    const innerRad = look.shape === 'heart' ? R * 0.2 : R * 0.38;
    for (let i = 0; i < outerN; i++) {
      const a = (i / outerN) * Math.PI * 2 + 0.05;
      placements.push({ x: Math.cos(a) * outerRad, z: Math.sin(a) * outerRad, h: 0.22 + (i % 5) * 0.012 });
    }
    for (let i = 0; i < innerN; i++) {
      const a = (i / innerN) * Math.PI * 2 + 0.22;
      placements.push({ x: Math.cos(a) * innerRad, z: Math.sin(a) * innerRad, h: 0.2 + (i % 4) * 0.01 });
    }
  }

  placements.forEach((p, i) => {
    const g = new THREE.Group();
    const h = p.h;
    const wax = new THREE.MeshStandardMaterial({ color: look.wax[i % look.wax.length], roughness: 0.42 });
    const bodyC = new THREE.Mesh(candleBodyGeo, wax);
    bodyC.scale.y = h;
    bodyC.position.y = h / 2;
    bodyC.castShadow = true;
    g.add(bodyC);
    const wick = new THREE.Mesh(wickGeo, wickMat);
    wick.position.y = h + 0.02;
    g.add(wick);
    const flame = new THREE.Group();
    flame.add(new THREE.Mesh(flameOuterGeo, flameOuterMat.clone()));
    const fi = new THREE.Mesh(flameInnerGeo, flameInnerMat.clone());
    fi.position.y = 0.012;
    flame.add(fi);
    flame.position.y = h + 0.03;
    g.add(flame);
    const yOff = look.shape === 'bundt' ? H * 0.72 : H + 0.02;
    g.position.set(p.x, yOff, p.z);
    cakeGroup.add(g);
    const startLit = !unlit;
    flame.visible = startLit;
    candles.push({ group: g, flame, lit: startLit, phase: Math.random() * Math.PI * 2, height: h, smoke: 0 });
  });

  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xd8d0dc, transparent: true, opacity: 0, depthWrite: false
  });
  candles.forEach(c => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), smokeMat.clone());
    s.position.y = c.height + 0.06;
    c.group.add(s);
    c.smokeMesh = s;
  });

  let lit = unlit ? 0 : CANDLE_COUNT;
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

  function blowOutAll(immediate = false) {
    const remaining = candles.filter(c => c.lit).sort((a, b) => b.group.position.z - a.group.position.z);
    remaining.forEach((c, i) => {
      if (immediate) extinguishOne(c);
      else setTimeout(() => extinguishOne(c), i * 32);
    });
    return remaining.length;
  }

  function revealCake() {
    const start = performance.now();
    const from = party.position.y;
    const dur = 1600;
    return new Promise(resolve => {
      function tick(now) {
        const k = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        party.position.y = from + (0 - from) * e;
        if (k < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function cutCake() {
    if (!canCut || cutting) return Promise.resolve();
    cutting = true;
    controls.autoRotate = false;
    controls.enableRotate = false;
    sliceGroup.visible = true;
    const start = performance.now();
    const dur = 1800;
    return new Promise(resolve => {
      function slide(now) {
        const k = Math.min(1, (now - start) / dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const lift = Math.sin(Math.min(e, 1) * Math.PI) * 0.16;
        sliceGroup.position.set(e * 0.85, 0.04 + lift, e * 0.95);
        sliceGroup.rotation.y = e * 0.22;
        sliceGroup.rotation.z = e * 0.08;
        if (k < 1) requestAnimationFrame(slide);
        else {
          celebrating = true;
          controls.enableRotate = true;
          resolve();
        }
      }
      requestAnimationFrame(slide);
    });
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
        c.smokeMesh.material.opacity = Math.max(0, c.smoke * 0.45);
        c.smokeMesh.position.y += 0.01;
        c.smokeMesh.scale.setScalar(1 + (1 - c.smoke) * 2.2);
      }
    });
    const glow = lit / CANDLE_COUNT;
    candleLight.intensity = 0.4 + glow * 3.2 + Math.sin(t * 9) * 0.14 * glow;
    if (celebrating && !reduced) party.position.y = Math.sin(t * 2) * 0.012;
    renderer.render(scene, camera);
  }
  loop();
  setGlow();

  return {
    style: look,
    supportsCut: canCut,
    blowOutAll,
    cutCake,
    revealCake,
    getLit: () => lit,
    dispose() {
      running = false;
      ro.disconnect();
      controls.dispose();
      const seenGeo = new Set();
      const seenMat = new Set();
      scene.traverse(obj => {
        if (obj.geometry && !seenGeo.has(obj.geometry)) {
          seenGeo.add(obj.geometry);
          obj.geometry.dispose();
        }
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
        mats.forEach(m => {
          if (!m || seenMat.has(m)) return;
          seenMat.add(m);
          if (m.map) m.map.dispose();
          m.dispose();
        });
      });
      renderer.dispose();
    }
  };
}
