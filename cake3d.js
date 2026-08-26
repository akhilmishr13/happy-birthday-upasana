import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { pickCakeStyle } from './cakes.js';

const CANDLE_COUNT = 29;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function n3(x, y, z) {
  return hash(x * 12.9898 + y * 78.233 + z * 37.719) * 2 - 1;
}

function hexRgb(hex) {
  const n = hex.replace('#', '');
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16)
  };
}

function frostingTextures(hex) {
  const size = 512;
  const { r, g, b } = hexRgb(hex);
  const color = document.createElement('canvas');
  const bump = document.createElement('canvas');
  color.width = color.height = bump.width = bump.height = size;
  const cctx = color.getContext('2d');
  const bctx = bump.getContext('2d');
  const cimg = cctx.createImageData(size, size);
  const bimg = bctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      const swirl = Math.sin((u - 0.5) * 10 + Math.sin((v - 0.5) * 8) * 1.6);
      const spatula = Math.sin(v * 22 + Math.sin(u * 6) * 1.2);
      const grain = n3(x * 0.08, y * 0.08, 2.1);
      const grain2 = n3(x * 0.18, y * 0.16, 8.4);
      const tone = swirl * 4 + spatula * 3 + grain * 5 + grain2 * 3;
      cimg.data[i] = Math.min(255, Math.max(0, r + tone));
      cimg.data[i + 1] = Math.min(255, Math.max(0, g + tone * 0.92));
      cimg.data[i + 2] = Math.min(255, Math.max(0, b + tone * 0.85));
      cimg.data[i + 3] = 255;
      const bumpV = 128 + swirl * 18 + spatula * 22 + grain * 28;
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = Math.min(255, Math.max(0, bumpV));
      bimg.data[i + 3] = 255;
    }
  }
  cctx.putImageData(cimg, 0, 0);
  bctx.putImageData(bimg, 0, 0);
  const map = new THREE.CanvasTexture(color);
  const bumpMap = new THREE.CanvasTexture(bump);
  map.wrapS = map.wrapT = bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  bumpMap.anisotropy = 4;
  return { map, bumpMap };
}

function marbleTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f3ebe0';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 22; i++) {
    ctx.strokeStyle = `rgba(150,128,118,${0.12 + hash(i) * 0.18})`;
    ctx.lineWidth = 0.8 + hash(i + 4) * 1.6;
    ctx.beginPath();
    let x = hash(i * 3) * size;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < size) {
      x += (hash(x * 0.01 + y) - 0.5) * 32;
      y += 14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function spongeTexture(hex) {
  const size = 256;
  const { r, g, b } = hexRgb(hex);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const crumb = n3(x * 0.4, y * 0.4, 1) * 22;
      const pore = n3(x * 0.9, y * 0.9, 4) > 0.55 ? -28 : 0;
      img.data[i] = Math.min(255, Math.max(0, r + crumb + pore));
      img.data[i + 1] = Math.min(255, Math.max(0, g + crumb + pore));
      img.data[i + 2] = Math.min(255, Math.max(0, b + crumb * 0.8 + pore));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
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

function dripGeo(len, width) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = -t * len;
    let w = width * (1 - t * 0.62) * (0.92 + Math.sin(t * 9) * 0.08);
    if (t > 0.78) {
      const k = (t - 0.78) / 0.22;
      w = width * 0.22 + width * 0.38 * Math.sin(k * Math.PI);
    }
    pts.push(new THREE.Vector2(Math.max(0.004, w), y));
  }
  return new THREE.LatheGeometry(pts, 12);
}

function organicize(geo, { radial = 0.008, height = 0.004, seed = 1.7, lockBottom = true } = {}) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = n3(v.x * 2.2 + seed, v.y * 3.1, v.z * 2.2);
    const n2 = n3(v.x * 5.1, v.y * 4.4 + seed, v.z * 5.1);
    const r = Math.hypot(v.x, v.z) || 1;
    let rad = radial;
    let ht = height;
    if (lockBottom && v.y < 0.025) {
      rad *= 0.1;
      ht = 0;
    }
    v.x += (v.x / r) * n * rad;
    v.z += (v.z / r) * n * rad;
    v.y += n2 * ht;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function cakeProfile(R, H, { top = 1, bot = 1.03, bulge = 0.05 } = {}) {
  const pts = [];
  const botR = R * bot;
  const topR = R * top;
  const rim = Math.min(0.095, H * 0.26);
  const dome = Math.min(0.05, H * 0.12);

  pts.push(new THREE.Vector2(0.001, 0));
  pts.push(new THREE.Vector2(botR - rim * 1.15, 0));
  for (let i = 1; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2);
    pts.push(new THREE.Vector2(
      botR - rim + Math.sin(a) * rim,
      (1 - Math.cos(a)) * rim * 0.42
    ));
  }
  const side0 = rim * 0.42;
  const side1 = H - rim;
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const y = side0 + t * (side1 - side0);
    const swell = Math.sin(t * Math.PI) * R * bulge;
    pts.push(new THREE.Vector2(botR * (1 - t) + topR * t + swell, y));
  }
  for (let i = 1; i <= 7; i++) {
    const a = (i / 7) * (Math.PI / 2);
    pts.push(new THREE.Vector2(
      topR - (1 - Math.cos(a)) * rim,
      (H - rim) + Math.sin(a) * rim
    ));
  }
  const innerR = Math.max(0.08, topR - rim);
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    const r = innerR * (1 - t);
    const y = H + dome * (1 - (r / innerR) ** 2);
    pts.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  return pts;
}

function roundCakeGeometry(R, H, opts = {}) {
  const pts = cakeProfile(R, H, opts);
  const geo = new THREE.LatheGeometry(pts, 96);
  return organicize(geo, { radial: R * 0.008, height: 0.005, seed: R * 9 + H });
}

function ganacheDome(R, y) {
  const pts = [];
  const dome = 0.035;
  const rim = 0.05;
  pts.push(new THREE.Vector2(0.001, dome));
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    const r = (R - rim) * t;
    pts.push(new THREE.Vector2(r, dome * (1 - t * t) + 0.006));
  }
  for (let i = 1; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - rim + Math.sin(a) * rim, 0.006 + Math.cos(a) * 0.02));
  }
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.translate(0, y, 0);
  return organicize(geo, { radial: 0.01, height: 0.006, seed: 3.3, lockBottom: false });
}

function icingRope(radius, y, tubeR, closed = true) {
  const pts = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 1 + Math.sin(a * 16) * 0.018 + n3(Math.cos(a), 1.2, Math.sin(a)) * 0.014;
    pts.push(new THREE.Vector3(
      Math.cos(a) * radius * wobble,
      y + Math.sin(a * 20) * 0.014,
      Math.sin(a) * radius * wobble
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts, closed);
  return new THREE.TubeGeometry(curve, n, tubeR, 12, closed);
}

function heartGeometry(s, h) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -s * 0.42);
  shape.bezierCurveTo(0, -s * 0.18, -s * 0.52, s * 0.08, -s * 0.5, s * 0.36);
  shape.bezierCurveTo(-s * 0.5, s * 0.62, -s * 0.22, s * 0.74, 0, s * 0.5);
  shape.bezierCurveTo(s * 0.22, s * 0.74, s * 0.5, s * 0.62, s * 0.5, s * 0.36);
  shape.bezierCurveTo(s * 0.52, s * 0.08, 0, -s * 0.18, 0, -s * 0.42);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.075,
    bevelSegments: 6,
    curveSegments: 28
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, h / 2, 0);
  return organicize(geo, { radial: 0.012, height: 0.008, seed: 4.4 });
}

function bundtGeometry(R, H) {
  const geo = new THREE.TorusGeometry(R * 0.58, H * 0.36, 28, 72);
  geo.rotateX(Math.PI / 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const theta = Math.atan2(v.z, v.x);
    const flute = 0.055 * Math.sin(theta * 12);
    const fade = THREE.MathUtils.smoothstep(Math.hypot(v.x, v.z), R * 0.28, R * 0.85);
    v.x += Math.cos(theta) * flute * fade;
    v.z += Math.sin(theta) * flute * fade;
    v.y *= 0.92;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.translate(0, H * 0.42, 0);
  return organicize(geo, { radial: 0.01, height: 0.01, seed: 11, lockBottom: false });
}

function isGanache(name) {
  return /Chocolate|Velvet|Midnight/.test(name);
}

export async function createPartyScene(canvas, { onGlow, style, unlit = false } = {}) {
  const look = style || pickCakeStyle();
  const R = look.R;
  const H = look.H;
  const canCut = !!look.cut && (look.shape === 'round' || look.shape === 'tall' || look.shape === 'short' || look.shape === 'taper');
  const ganache = isGanache(look.name);

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
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRt = pmrem.fromScene(new RoomEnvironment(), 0.06);
  const envMap = envRt.texture;

  const scene = new THREE.Scene();
  scene.environment = envMap;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 2.2;
  controls.maxDistance = 4.6;
  controls.minPolarAngle = 0.7;
  controls.maxPolarAngle = 1.35;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.45;

  scene.add(new THREE.HemisphereLight(0xffe6c8, 0x3a2048, 0.72));
  const key = new THREE.DirectionalLight(0xfff3e0, 1.4);
  key.position.set(2.2, 4.4, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8b8ff, 0.22);
  fill.position.set(-3, 1.6, -1.2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc8a0, 0.32);
  rim.position.set(0.2, 1.4, -3.2);
  scene.add(rim);
  const bounce = new THREE.DirectionalLight(0xffe4c8, 0.2);
  bounce.position.set(0, -2, 1);
  scene.add(bounce);
  const candleLight = new THREE.PointLight(0xffb14a, 3.4, 8, 1.6);
  candleLight.position.set(0, 1.55, 0);
  scene.add(candleLight);

  const party = new THREE.Group();
  party.position.y = unlit ? -0.55 : -2.55;
  scene.add(party);
  camera.position.set(0, 1.28 + H * 0.32, 3.35 + R * 0.08);
  controls.target.set(0, 0.22 + H * 0.38, 0);

  const marble = new THREE.MeshStandardMaterial({
    map: marbleTexture(),
    color: 0xf7f1e8,
    roughness: 0.28,
    metalness: 0.08,
    envMapIntensity: 0.35
  });
  const metalColor = /Midnight|Blueberry/.test(look.name) ? 0xc0c8d8 : 0xe8c98a;
  const gold = new THREE.MeshStandardMaterial({
    color: metalColor,
    metalness: 0.92,
    roughness: 0.28,
    envMapIntensity: 0.7
  });

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.56, 0.055, 64), marble);
  plate.position.y = 0.03;
  plate.receiveShadow = true;
  plate.castShadow = true;
  party.add(plate);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.028, 12, 64), gold);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.055;
  party.add(lip);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.4, 24), gold);
  stem.position.y = -0.22;
  stem.castShadow = true;
  party.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.6, 0.07, 32), gold);
  foot.position.y = -0.44;
  party.add(foot);
  const board = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.36, 0.045, 64), gold);
  board.position.y = 0.082;
  board.receiveShadow = true;
  party.add(board);

  const cakeGroup = new THREE.Group();
  cakeGroup.position.y = 0.11;
  party.add(cakeGroup);

  const { map: frostMap, bumpMap } = frostingTextures(look.hex);
  const frosting = new THREE.MeshPhysicalMaterial({
    map: frostMap,
    bumpMap,
    bumpScale: ganache ? 0.008 : 0.028,
    color: look.frosting,
    roughness: ganache ? 0.48 : 0.58,
    metalness: 0,
    clearcoat: ganache ? 0.18 : 0.06,
    clearcoatRoughness: ganache ? 0.45 : 0.82,
    sheen: ganache ? 0.12 : 1,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(look.sheen),
    envMapIntensity: ganache ? 0.22 : 0.22
  });
  const innerCake = new THREE.MeshPhysicalMaterial({
    color: look.sponge,
    roughness: 0.88,
    map: spongeTexture(look.hex),
    sheen: 0.2,
    sheenColor: new THREE.Color(look.sponge)
  });
  const creamFill = new THREE.MeshPhysicalMaterial({
    color: look.cream,
    roughness: 0.55,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xfff6ea)
  });
  innerCake.side = THREE.DoubleSide;
  creamFill.side = THREE.DoubleSide;

  const profileOpts = look.shape === 'taper'
    ? { top: 0.9, bot: 1.06, bulge: 0.04 }
    : look.shape === 'tall'
      ? { top: 0.98, bot: 1.04, bulge: 0.042 }
      : look.shape === 'short'
        ? { top: 1, bot: 1.02, bulge: 0.058 }
        : { top: 1, bot: 1.03, bulge: 0.05 };

  if (look.shape === 'heart') {
    const body = new THREE.Mesh(heartGeometry(R * 0.78, H), frosting);
    body.castShadow = true;
    body.receiveShadow = true;
    cakeGroup.add(body);
  } else if (look.shape === 'bundt') {
    const body = new THREE.Mesh(bundtGeometry(R, H), frosting);
    body.castShadow = true;
    body.receiveShadow = true;
    cakeGroup.add(body);
  } else if (look.shape === 'square') {
    const body = new THREE.Mesh(
      organicize(
        new RoundedBoxGeometry(R * 1.82, H, R * 1.82, 10, 0.09),
        { radial: 0.01, height: 0.006, seed: 6.2 }
      ),
      frosting
    );
    body.position.y = H / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    cakeGroup.add(body);
  } else {
    const body = new THREE.Mesh(roundCakeGeometry(R, H, profileOpts), frosting);
    body.castShadow = true;
    body.receiveShadow = true;
    cakeGroup.add(body);
  }

  const creamMat = new THREE.MeshPhysicalMaterial({
    color: look.pearl,
    roughness: 0.42,
    sheen: 0.7,
    sheenColor: new THREE.Color(look.sheen),
    clearcoat: 0.18,
    envMapIntensity: 0.25
  });

  function rimPoints(count, radius, y) {
    const pts = [];
    if (look.shape === 'square') {
      const half = R * 0.9;
      const corner = 0.1;
      const per = Math.ceil(count / 4);
      for (let s = 0; s < 4; s++) {
        for (let i = 0; i < per; i++) {
          const t = i / per;
          const a = s * Math.PI / 2;
          const along = (t - 0.5) * 2 * (half - corner);
          let x = 0, z = 0;
          if (s === 0) { x = along; z = half; }
          if (s === 1) { x = half; z = -along; }
          if (s === 2) { x = -along; z = -half; }
          if (s === 3) { x = -half; z = along; }
          const wobble = n3(x, y, z) * 0.012;
          pts.push(new THREE.Vector3(x + Math.cos(a) * wobble, y, z + Math.sin(a) * wobble));
        }
      }
    } else if (look.shape === 'heart') {
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const sx = 16 * Math.sin(t) ** 3;
        const sz = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push(new THREE.Vector3(sx * R * 0.032, y, -sz * R * 0.032));
      }
    } else {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const wobble = 1 + n3(Math.cos(a), 2, Math.sin(a)) * 0.012;
        pts.push(new THREE.Vector3(Math.cos(a) * radius * wobble, y + n3(i, 1, 2) * 0.008, Math.sin(a) * radius * wobble));
      }
    }
    return pts;
  }

  if (look.piped) {
    const y = look.shape === 'bundt' ? H * 0.78 : H + 0.02;
    const rad = look.shape === 'bundt' ? R * 0.9 : look.shape === 'square' ? R * 0.92 : R * 0.97;
    if (look.shape !== 'heart' && look.shape !== 'square' && look.shape !== 'bundt') {
      cakeGroup.add(new THREE.Mesh(icingRope(rad, y, 0.038), creamMat));
      cakeGroup.add(new THREE.Mesh(icingRope(R * 0.99, 0.05, 0.032), creamMat));
    }
    const blobs = rimPoints(look.shape === 'heart' ? 28 : 26, rad, y);
    const blobGeo = new THREE.SphereGeometry(0.052, 12, 10);
    blobs.forEach((p, i) => {
      const m = new THREE.Mesh(blobGeo, creamMat);
      const s = 0.75 + hash(i + 2) * 0.55;
      m.scale.set(1.7 * s, 0.38 * s, 1.05 * s);
      m.position.copy(p);
      m.lookAt(0, p.y + 0.2, 0);
      m.rotateZ((hash(i) - 0.5) * 0.5);
      m.castShadow = true;
      cakeGroup.add(m);
    });
  }

  if (look.ribbon && look.shape !== 'heart' && look.shape !== 'bundt') {
    const ribbonMat = new THREE.MeshPhysicalMaterial({
      color: look.ribbon,
      roughness: 0.48,
      metalness: 0.02,
      sheen: 0.8,
      sheenColor: new THREE.Color(look.sheen),
      envMapIntensity: 0.2
    });
    const bandY = H * 0.4;
    if (look.shape === 'square') {
      const w = R * 1.82;
      const t = 0.028;
      const bh = 0.07;
      const front = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, bh, t), ribbonMat);
      front.position.set(0, bandY, w / 2);
      const back = front.clone();
      back.position.z = -w / 2;
      const side = new THREE.Mesh(new THREE.BoxGeometry(t, bh, w + 0.01), ribbonMat);
      side.position.set(-w / 2, bandY, 0);
      const right = side.clone();
      right.position.x = w / 2;
      cakeGroup.add(front, back, side, right);
    } else {
      const sash = new THREE.Mesh(icingRope(R * 1.02, bandY, 0.03), ribbonMat);
      cakeGroup.add(sash);
    }
    const bow = new THREE.Group();
    const loopGeo = new THREE.TorusGeometry(0.075, 0.02, 10, 22);
    const loopA = new THREE.Mesh(loopGeo, gold);
    loopA.scale.set(1.15, 0.65, 1);
    loopA.position.x = -0.07;
    const loopB = loopA.clone();
    loopB.position.x = 0.07;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), gold);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.09, 4, 8), gold);
    tail.rotation.z = 0.5;
    tail.position.set(-0.04, -0.06, 0.01);
    const tail2 = tail.clone();
    tail2.rotation.z = -0.5;
    tail2.position.x = 0.04;
    bow.add(loopA, loopB, knot, tail, tail2);
    bow.position.set(0, bandY, look.shape === 'square' ? R * 0.94 : R * 1.04);
    cakeGroup.add(bow);
  }

  if (look.pearls && !look.piped) {
    const pearlGeo = new THREE.SphereGeometry(0.026, 14, 12);
    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: look.pearl,
      roughness: 0.08,
      metalness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 0.85
    });
    const pearls = rimPoints(look.shape === 'square' ? 28 : 30, R * 0.93, H + 0.05);
    pearls.forEach((p, i) => {
      const m = new THREE.Mesh(pearlGeo, pearlMat);
      m.scale.setScalar(0.85 + hash(i + 9) * 0.3);
      m.position.copy(p);
      m.position.y += 0.01;
      cakeGroup.add(m);
    });
  }

  if (look.drip) {
    const dripMat = new THREE.MeshPhysicalMaterial({
      color: look.drip,
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
      envMapIntensity: 0.7
    });
    if (look.shape !== 'heart' && look.shape !== 'bundt') {
      const capR = look.shape === 'square' ? R * 0.82 : R * 0.88;
      const cap = new THREE.Mesh(ganacheDome(capR, H - 0.01), dripMat);
      cakeGroup.add(cap);
    }
    const nDrip = look.shape === 'square' ? 18 : 22;
    const spots = rimPoints(nDrip, look.shape === 'bundt' ? R * 0.9 : R * 1.05, look.shape === 'bundt' ? H * 0.72 : H + 0.02);
    spots.forEach((p, i) => {
      if (hash(i + 0.3) < 0.12) return;
      const len = 0.28 + hash(i * 3.1) * 0.32;
      const width = 0.042 + hash(i * 1.7) * 0.03;
      const drip = new THREE.Mesh(dripGeo(len, width), dripMat);
      drip.position.set(p.x, p.y, p.z);
      cakeGroup.add(drip);
    });
  }

  if (look.goldLeaf) {
    const flakeMat = new THREE.MeshStandardMaterial({
      color: 0xe4c056,
      metalness: 1,
      roughness: 0.22,
      side: THREE.DoubleSide,
      envMapIntensity: 0.9
    });
    for (let i = 0; i < 11; i++) {
      const shape = new THREE.Shape();
      const s = 0.035 + hash(i) * 0.03;
      shape.moveTo(0, s);
      for (let k = 1; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + hash(i * 10 + k) * 0.5;
        const rr = s * (0.55 + hash(i + k) * 0.7);
        shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      shape.closePath();
      const flake = new THREE.Mesh(new THREE.ShapeGeometry(shape), flakeMat);
      const a = hash(i * 2) * Math.PI * 2;
      const rr = 0.12 + hash(i + 5) * 0.28;
      flake.position.set(Math.cos(a) * rr, H + 0.04, Math.sin(a) * rr - 0.04);
      flake.rotation.set(-Math.PI / 2 + (hash(i) - 0.5) * 0.4, 0, a);
      cakeGroup.add(flake);
    }
  }

  function berry(color, r, x, y, z, squash = 1) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 18, 16),
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.22,
        clearcoat: 0.85,
        clearcoatRoughness: 0.2,
        envMapIntensity: 0.55
      })
    );
    m.scale.set(1.05, squash, 0.95);
    m.position.set(x, y, z);
    m.castShadow = true;
    cakeGroup.add(m);
  }
  if (look.berries) {
    const by = H + 0.08;
    berry(0x8b1e3f, 0.058, 0.03, by, 0.05, 0.9);
    berry(0xa32648, 0.05, 0.1, by - 0.012, -0.03, 0.92);
    berry(0x6b1c38, 0.044, -0.07, by - 0.006, 0.01, 0.88);
    berry(0x7a1836, 0.038, 0.0, by - 0.01, -0.09, 0.9);
    berry(0x2a3d6b, 0.03, -0.02, by - 0.012, 0.12, 1);
    berry(0xc9a227, 0.014, 0.06, by + 0.02, 0.1, 1);
    const leaf = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 10),
      new THREE.MeshPhysicalMaterial({ color: 0x4a7a3a, roughness: 0.55, side: THREE.DoubleSide })
    );
    leaf.position.set(-0.11, by - 0.01, 0.06);
    leaf.rotation.set(-1.1, 0.4, 0.3);
    cakeGroup.add(leaf);
  }

  function flower(x, z, color) {
    const g = new THREE.Group();
    const petalMat = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.45, sheen: 0.5, sheenColor: new THREE.Color(color), side: THREE.DoubleSide
    });
    const petalGeo = new THREE.SphereGeometry(0.038, 10, 8);
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(petalGeo, petalMat);
      const a = (i / 6) * Math.PI * 2;
      p.scale.set(0.55, 0.22, 1.05);
      p.position.set(Math.cos(a) * 0.032, 0.008, Math.sin(a) * 0.032);
      p.lookAt(0, 0.04, 0);
      g.add(p);
    }
    g.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2d36b, roughness: 0.4 })
    ));
    g.position.set(x, H + 0.055, z);
    g.rotation.y = hash(x + z) * 6;
    cakeGroup.add(g);
  }
  if (look.flowers) {
    flower(0.24, 0.16, look.ribbon || 0xf4c4d0);
    flower(-0.22, 0.14, 0xf8e6c8);
    flower(0.16, -0.22, 0xd8ead0);
    flower(-0.14, -0.18, look.cream);
    flower(0.02, 0.28, 0xf4b8c5);
  }

  if (look.sprinkles) {
    const cols = [0xf4b8c5, 0xe8c97a, 0xb7cbb0, 0xc5d0e8, 0xffffff, 0xe0899a, 0xf5c07a];
    const rod = new THREE.CapsuleGeometry(0.007, 0.038, 3, 6);
    for (let i = 0; i < 110; i++) {
      const bit = new THREE.Mesh(rod, new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.35 }));
      const a = hash(i) * Math.PI * 2;
      const r = Math.sqrt(hash(i + 1)) * R * 0.78;
      bit.position.set(Math.cos(a) * r, H + 0.035, Math.sin(a) * r);
      bit.rotation.set(hash(i + 2) * 1.2, hash(i + 3) * 6, hash(i + 4) * 1.2);
      cakeGroup.add(bit);
    }
  }

  if (look.macarons) {
    const macCols = [look.ribbon || 0xf4c4d0, look.drip || 0xe8c97a, 0xd8ead0, 0xc5d0e8];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.1;
      const g = new THREE.Group();
      const col = macCols[i % macCols.length];
      const shell = new THREE.MeshPhysicalMaterial({
        color: col, roughness: 0.48, sheen: 0.4, sheenColor: new THREE.Color(col)
      });
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.072, 16, 10, 0, Math.PI * 2, 0, 1.45), shell);
      top.position.y = 0.042;
      top.scale.y = 0.72;
      const bot = top.clone();
      bot.rotation.x = Math.PI;
      bot.position.y = 0.002;
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.028, 16), creamFill);
      fill.position.y = 0.022;
      const foot = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 8, 20), shell);
      foot.rotation.x = Math.PI / 2;
      foot.position.y = 0.012;
      g.add(top, bot, fill, foot);
      g.position.set(Math.cos(a) * R * 0.7, H + 0.02, Math.sin(a) * R * 0.7);
      g.rotation.y = a;
      cakeGroup.add(g);
    }
  }

  const sliceGroup = new THREE.Group();
  sliceGroup.visible = false;
  if (canCut) {
    const sliceAngle = 0.42;
    const pts = cakeProfile(R, H, profileOpts);
    const sliceBody = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 16, -sliceAngle / 2, sliceAngle),
      frosting
    );
    sliceGroup.add(sliceBody);
    function radialFace(angle, material) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.05, H * 1.08), material);
      mesh.position.set(Math.cos(angle) * (R / 2), H / 2, Math.sin(angle) * (R / 2));
      mesh.rotation.y = -angle;
      return mesh;
    }
    sliceGroup.add(radialFace(-sliceAngle / 2, innerCake));
    sliceGroup.add(radialFace(sliceAngle / 2, creamFill));
  }
  cakeGroup.add(sliceGroup);

  const candleBodyGeo = new THREE.CylinderGeometry(0.016, 0.021, 1, 12);
  const wickGeo = new THREE.CylinderGeometry(0.0028, 0.0028, 0.05, 6);
  const capGeo = new THREE.SphereGeometry(0.018, 10, 8);
  const flameOuterGeo = teardrop(0.026, 0.085, 10);
  const flameInnerGeo = teardrop(0.013, 0.055, 8);
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
      const a = (i / CANDLE_COUNT) * Math.PI * 2 + 0.03;
      placements.push({
        x: Math.cos(a) * R * 0.58,
        z: Math.sin(a) * R * 0.58,
        h: 0.19 + hash(i) * 0.07,
        lean: (hash(i + 4) - 0.5) * 0.16
      });
    }
  } else {
    const outerN = 17;
    const innerN = 12;
    const outerRad = look.shape === 'square' ? R * 0.68 : look.shape === 'heart' ? R * 0.38 : R * 0.64;
    const innerRad = look.shape === 'heart' ? R * 0.18 : R * 0.36;
    for (let i = 0; i < outerN; i++) {
      const a = (i / outerN) * Math.PI * 2 + 0.05;
      const jitter = 0.97 + hash(i) * 0.06;
      placements.push({
        x: Math.cos(a) * outerRad * jitter,
        z: Math.sin(a) * outerRad * jitter,
        h: 0.18 + hash(i + 1) * 0.07,
        lean: (hash(i + 8) - 0.5) * 0.18
      });
    }
    for (let i = 0; i < innerN; i++) {
      const a = (i / innerN) * Math.PI * 2 + 0.22;
      const jitter = 0.96 + hash(i + 20) * 0.07;
      placements.push({
        x: Math.cos(a) * innerRad * jitter,
        z: Math.sin(a) * innerRad * jitter,
        h: 0.16 + hash(i + 3) * 0.065,
        lean: (hash(i + 12) - 0.5) * 0.16
      });
    }
  }

  placements.forEach((p, i) => {
    const g = new THREE.Group();
    const h = p.h;
    const wax = new THREE.MeshPhysicalMaterial({
      color: look.wax[i % look.wax.length],
      roughness: 0.38,
      sheen: 0.25,
      sheenColor: new THREE.Color(look.wax[i % look.wax.length])
    });
    const bodyC = new THREE.Mesh(candleBodyGeo, wax);
    const thick = 0.82 + hash(i + 6) * 0.38;
    bodyC.scale.set(thick, h, thick);
    bodyC.position.y = h / 2;
    bodyC.castShadow = true;
    g.add(bodyC);
    const cap = new THREE.Mesh(capGeo, wax);
    cap.scale.y = 0.42;
    cap.position.y = h;
    g.add(cap);
    const wick = new THREE.Mesh(wickGeo, wickMat);
    wick.position.y = h + 0.022;
    g.add(wick);
    const flame = new THREE.Group();
    flame.add(new THREE.Mesh(flameOuterGeo, flameOuterMat.clone()));
    const fi = new THREE.Mesh(flameInnerGeo, flameInnerMat.clone());
    fi.position.y = 0.012;
    flame.add(fi);
    flame.position.y = h + 0.028;
    g.add(flame);
    const yOff = look.shape === 'bundt' ? H * 0.7 : H + 0.018;
    g.position.set(p.x, yOff, p.z);
    g.rotation.z = p.lean;
    g.rotation.x = p.lean * 0.4;
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
          if (m.bumpMap) m.bumpMap.dispose();
          m.dispose();
        });
      });
      envMap.dispose();
      envRt.dispose();
      pmrem.dispose();
      renderer.dispose();
    }
  };
}
