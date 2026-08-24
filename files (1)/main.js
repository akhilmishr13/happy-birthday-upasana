import { createPartyScene } from './cake3d.js';
import { startBlowDetector } from './blow.js';
import { startSong, toggleMute } from './music.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const NAME = 'Upasana';

let party = null;
let detector = null;
let phase = 'gate'; // gate | lit | out | cut | party

decorateRoom();

$('enterBtn').addEventListener('click', enter);
$('cutBtn').addEventListener('click', cutCake);
$('tapBlowBtn').addEventListener('click', () => tryBlow(1));
$('soundToggle').addEventListener('click', () => {
  const muted = toggleMute();
  $('soundToggle').classList.toggle('muted', muted);
  $('soundIcon').textContent = muted ? '✕' : '♪';
});

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && phase === 'lit') {
    e.preventDefault();
    tryBlow(1);
  }
});

function decorateRoom() {
  const colors = ['#e8c97a', '#f4b8c5', '#b7cbb0', '#f7efe4'];
  const lights = $('stringLights');
  for (let i = 0; i < 24; i++) {
    const el = document.createElement('i');
    el.style.left = (2 + i * 4.15) + '%';
    el.style.background = colors[i % 4];
    el.style.color = colors[i % 4];
    el.style.top = (4 + Math.sin(i * 0.65) * 10) + 'px';
    lights.appendChild(el);
  }

  const garland = $('garland');
  const gColors = ['#f4b8c5', '#e8c97a', '#b7cbb0', '#e0899a', '#f7efe4'];
  for (let i = 0; i < 22; i++) {
    const b = document.createElement('b');
    b.style.background = gColors[i % gColors.length];
    b.style.transform = `rotate(${i % 2 ? 8 : -8}deg)`;
    garland.appendChild(b);
  }

  const bl = $('balloons');
  const spots = [
    [6, 28], [11, 36], [18, 24],
    [78, 30], [86, 22], [91, 34]
  ];
  spots.forEach(([x, y], i) => {
    const b = document.createElement('span');
    b.className = 'balloon';
    b.style.left = x + '%';
    b.style.top = y + '%';
    b.style.background = colors[i % colors.length];
    b.style.animationDelay = (i * 0.4) + 's';
    bl.appendChild(b);
  });
}

async function enter() {
  $('enterBtn').disabled = true;
  $('enterBtn').textContent = 'Lighting the candles…';
  $('gate').classList.remove('scene--on');
  $('gate').hidden = true;
  $('title').classList.add('is-on');
  $('buddy').classList.add('is-on');

  try {
    party = await createPartyScene($('scene3d'), {
      onGlow(t) {
        document.documentElement.style.setProperty('--glow', t.toFixed(3));
      }
    });
  } catch (err) {
    $('status').textContent = 'Could not start the 3D cake. Try another browser.';
    console.error(err);
    return;
  }

  let pressed = false;
  let dragged = false;
  $('scene3d').addEventListener('pointerdown', () => { pressed = true; dragged = false; });
  $('scene3d').addEventListener('pointermove', () => { if (pressed) dragged = true; });
  $('scene3d').addEventListener('pointerup', () => { pressed = false; });
  $('scene3d').addEventListener('click', () => {
    if (!dragged && phase === 'lit') tryBlow(1);
  });

  $('tapBlowBtn').hidden = false;
  phase = 'lit';
  say('Make a wish… then blow!');
  setPrompt('Lean in. Make an <em>O</em> with your lips, and blow.');

  startCamera();
}

async function startCamera() {
  const video = $('cam');
  $('status').textContent = 'Asking for the camera…';

  const result = await startBlowDetector({
    video,
    onMouth(v) {
      document.documentElement.style.setProperty('--mouth', v.toFixed(3));
      $('mirrorRing').classList.toggle('is-ready', v > 0.28);
      if (phase === 'lit' && v > 0.28) {
        $('mirrorLabel').textContent = 'Yes — now blow';
      }
    },
    onBlow(strength) {
      tryBlow(strength);
    },
    onStatus(msg) {
      $('status').textContent = msg;
    },
    onError() {
      $('mirror').hidden = true;
      if (phase === 'lit') $('tapBlowBtn').hidden = false;
      $('status').textContent = 'No camera — tap to blow, or allow the camera';
      if (phase === 'lit') say('Camera said no. Tap to blow!');
    }
  });

  detector = result;
  if (result?.ready) {
    $('mirror').hidden = false;
    $('tapBlowBtn').hidden = false;
    if (result.visionOk) {
      say('I can see you! Make an O, then blow 💨');
    } else {
      say('Blow toward the cake — I am listening!');
    }
  } else {
    $('tapBlowBtn').hidden = false;
  }
}

function tryBlow(strength = 1) {
  if (phase !== 'lit' || !party) return;
  phase = 'extinguishing';
  $('mirrorRing').classList.remove('is-ready');
  $('tapBlowBtn').hidden = true;
  say('The candles felt that…');
  setPrompt('Watch them go.');

  const n = party.blowOutAll();
  const wait = Math.max(600, n * 32 + 420);
  setTimeout(onAllOut, wait);
}

function onAllOut() {
  if (phase !== 'extinguishing') return;
  phase = 'out';
  detector?.stop?.();
  $('mirrorLabel').textContent = 'Wish made';
  $('status').textContent = '';
  document.documentElement.style.setProperty('--mouth', '0');

  startSong();
  $('soundToggle').hidden = false;

  say(`Happy birthday, ${NAME}! 🎂`);
  setPrompt(`Happy birthday, <em>${NAME}</em>.`);
  $('cutBtn').hidden = false;
  confetti(90);
  fireworks.show(4);
  sparkles();
}

function cutCake() {
  if (phase !== 'out' || !party) return;
  phase = 'cut';
  $('cutBtn').hidden = true;
  $('knife').classList.add('go');
  say('One slice, coming up.');

  setTimeout(() => party.cutCake(), 420);
  setTimeout(() => {
    phase = 'party';
    document.body.classList.add('is-celebrate');
    $('buddy').classList.add('is-party');
    say(`Happy birthday, ${NAME}!!!`);
    setPrompt(`Make a wish, <em>${NAME}</em>. This year is yours.`);
    confetti(140);
    fireworks.show(7);
    sparkles();
    releaseBalloons();
  }, 1500);
}

function say(text) {
  const bubble = $('bubble');
  const el = $('bubbleText');
  $('buddy').classList.add('is-talk');
  bubble.style.animation = 'none';
  void bubble.offsetWidth;
  bubble.style.animation = '';
  el.textContent = text;
  clearTimeout(say.t);
  say.t = setTimeout(() => $('buddy').classList.remove('is-talk'), 2600);
}

function setPrompt(html) {
  const p = $('prompt');
  p.style.opacity = 0;
  setTimeout(() => {
    p.innerHTML = html;
    p.style.opacity = 1;
  }, 180);
}

function confetti(count) {
  if (reduced) return;
  const box = $('confetti');
  const colors = ['#e8c97a', '#f4b8c5', '#fbf3ea', '#b7cbb0', '#e0899a'];
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span');
    bit.className = 'bit';
    bit.style.left = Math.random() * 100 + 'vw';
    bit.style.background = colors[i % colors.length];
    bit.style.animationDuration = (2.4 + Math.random() * 2.4) + 's';
    bit.style.animationDelay = Math.random() * 1.2 + 's';
    box.appendChild(bit);
    setTimeout(() => bit.remove(), 7000);
  }
}

function sparkles() {
  if (reduced) return;
  const box = $('sparkleBurst');
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('span');
    const a = (i / 28) * Math.PI * 2;
    const d = 80 + Math.random() * 140;
    s.style.left = '50%';
    s.style.top = '46%';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    s.style.background = i % 2 ? '#e8c97a' : '#f4b8c5';
    box.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}

function releaseBalloons() {
  const bl = $('balloons');
  const colors = ['#e8c97a', '#f4b8c5', '#b7cbb0', '#f7efe4', '#e0899a'];
  for (let i = 0; i < 10; i++) {
    const b = document.createElement('span');
    b.className = 'balloon';
    b.style.left = (8 + Math.random() * 84) + '%';
    b.style.top = '110%';
    b.style.background = colors[i % colors.length];
    b.style.transition = 'top 4.5s ease-out, opacity 4.5s ease';
    bl.appendChild(b);
    requestAnimationFrame(() => {
      b.style.top = (-20 - Math.random() * 20) + '%';
      b.style.opacity = '0';
    });
    setTimeout(() => b.remove(), 5000);
  }
}

const fireworks = (function () {
  const cv = $('fx');
  const ctx = cv.getContext('2d');
  let parts = [];
  let running = false;

  function size() {
    cv.width = innerWidth * devicePixelRatio;
    cv.height = innerHeight * devicePixelRatio;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  size();
  addEventListener('resize', size);

  const palette = ['#e8c97a', '#f4b8c5', '#b7cbb0', '#fbf3ea', '#e0899a'];

  function burst(x, y) {
    const color = palette[(Math.random() * palette.length) | 0];
    for (let i = 0; i < 56; i++) {
      const a = (Math.PI * 2 * i) / 56 + Math.random() * 0.2;
      const sp = 1.7 + Math.random() * 3.8;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
    }
  }

  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.045; p.vx *= 0.987; p.vy *= 0.987;
      p.life -= 0.011;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop);
    else running = false;
  }

  return {
    show(n) {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          burst(innerWidth * (0.16 + Math.random() * 0.68),
                innerHeight * (0.14 + Math.random() * 0.32));
          if (!running) { running = true; loop(); }
        }, i * 320);
      }
    }
  };
})();
