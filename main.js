import { createPartyScene } from './cake3d.js';
import { startBlowDetector } from './blow.js';
import { startSong, toggleMute } from './music.js';
import { WISH_EMAIL } from './config.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const NAME = 'Upasana';

let party = null;
let detector = null;
let phase = 'gate'; // gate | lit | out | wishing | cut | party
let recorder = null;
let recChunks = [];
let recStream = null;

decorateRoom();
plantSunflowers();

if (sessionStorage.getItem('hb-upasana')) showSunfield();
sessionStorage.setItem('hb-upasana', '1');

$('enterBtn').addEventListener('click', enter);
$('cutBtn').addEventListener('click', askWish);
$('tapBlowBtn').addEventListener('click', () => tryBlow(1));
$('recBtn').addEventListener('click', toggleRecord);
$('skipWish').addEventListener('click', () => {
  if (recorder && recorder.state === 'recording') {
    recorder.onstop = () => {
      recStream?.getTracks().forEach(t => t.stop());
      recStream = null;
      recorder = null;
      finishWish(null);
    };
    recorder.stop();
    return;
  }
  finishWish(null);
});
$('mailBtn').addEventListener('click', () => {
  $('letter').hidden = false;
  $('letter').classList.add('is-on');
});
$('letter').addEventListener('click', () => {
  $('letter').classList.remove('is-on');
  $('letter').hidden = true;
});
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

function plantSunflowers() {
  const field = $('sunfield');
  for (let i = 0; i < 56; i++) {
    const s = document.createElement('span');
    s.className = 'sunflower';
    s.textContent = '🌻';
    s.style.left = (Math.random() * 100) + '%';
    s.style.bottom = (Math.random() * 46) + '%';
    s.style.setProperty('--s', (0.45 + Math.random() * 1.15).toFixed(2));
    s.style.animationDelay = (Math.random() * 2.8) + 's';
    s.style.zIndex = String((Math.random() * 8) | 0);
    field.appendChild(s);
  }
}

function showSunfield() {
  document.body.classList.add('is-sunfield');
  $('sunfield').classList.add('is-on');
}

async function enter() {
  $('enterBtn').disabled = true;
  $('gate').classList.remove('scene--on');
  $('gate').hidden = true;
  $('title').classList.add('is-on');
  $('buddy').classList.add('is-on');
  fireworks.startAmbient();

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

  $('scene3d').classList.add('is-in');
  await party.revealCake();

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
  say('The cake is here… blow!');
  setPrompt('Make an <em>O</em> with your lips, and blow.');

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

  showSunfield();
  startSong();
  $('soundToggle').hidden = false;

  say(`Happy birthday, ${NAME}! 🎂`);
  setPrompt(`Happy birthday, <em>${NAME}</em>.`);
  $('cutBtn').hidden = false;
  confetti(90);
  fireworks.show(5);
  sparkles();
}

function askWish() {
  if (phase !== 'out') return;
  phase = 'wishing';
  $('cutBtn').hidden = true;
  $('wishPanel').hidden = false;
  $('wishPanel').classList.add('is-on');
  say('Make a wish first.');
  setPrompt('Make a wish, then say it out loud.');
}

async function toggleRecord() {
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    return;
  }

  $('recStatus').textContent = 'Listening…';
  $('recBtn').textContent = 'Stop recording';
  $('recBtn').classList.add('is-hot');

  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    $('recStatus').textContent = 'Mic blocked — you can still cut';
    $('recBtn').textContent = 'Start recording';
    $('recBtn').classList.remove('is-hot');
    return;
  }

  recChunks = [];
  const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
  recorder = mime ? new MediaRecorder(recStream, { mimeType: mime }) : new MediaRecorder(recStream);
  recorder.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
  recorder.onstop = () => {
    recStream.getTracks().forEach(t => t.stop());
    recStream = null;
    $('recBtn').classList.remove('is-hot');
    $('recBtn').textContent = 'Start recording';
    const blob = new Blob(recChunks, { type: recorder.mimeType || 'audio/webm' });
    finishWish(blob);
  };
  recorder.start();
  setTimeout(() => {
    if (recorder && recorder.state === 'recording') recorder.stop();
  }, 12000);
}

async function finishWish(blob) {
  if (phase !== 'wishing') return;
  phase = 'cutting';
  $('wishPanel').classList.remove('is-on');
  $('wishPanel').hidden = true;
  if (blob && blob.size > 200) {
    $('recStatus').textContent = 'Sending your wish…';
    say('I heard it. Sending it now.');
    await sendWish(blob);
  } else {
    say('Alright — time to cut.');
  }
  await doCut();
}

async function sendWish(blob) {
  const fd = new FormData();
  fd.append('name', NAME);
  fd.append('message', `${NAME} spoke a birthday wish.`);
  fd.append('_subject', `${NAME}'s birthday wish`);
  fd.append('_captcha', 'false');
  fd.append('attachment', blob, 'upasana-wish.webm');

  try {
    const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(WISH_EMAIL), {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error('send failed');
    $('status').textContent = 'Your wish is on its way';
    return;
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upasana-wish.webm';
    a.click();
    URL.revokeObjectURL(url);
    const mail = `mailto:${WISH_EMAIL}?subject=${encodeURIComponent(NAME + "'s birthday wish")}&body=${encodeURIComponent('Upasana recorded a wish. The audio file was saved on this device — please send it along.')}`;
    location.href = mail;
    $('status').textContent = 'Wish saved — send the file if asked';
  }
}

async function doCut() {
  if (!party || (phase !== 'wishing' && phase !== 'out' && phase !== 'cutting')) return;
  phase = 'cut';
  $('knife').classList.add('go');
  say('One slice, coming up.');
  setPrompt('Watch…');

  await new Promise(r => setTimeout(r, 380));
  await party.cutCake();

  phase = 'party';
  document.body.classList.add('is-celebrate');
  $('buddy').classList.add('is-party');
  $('mailBtn').hidden = false;
  requestAnimationFrame(() => $('mailBtn').classList.add('is-in'));
  say(`Happy birthday, ${NAME}!!!`);
  setPrompt(`Happy birthday, <em>${NAME}</em>. This year is yours.`);
  confetti(140);
  fireworks.show(8);
  sparkles();
  releaseBalloons();
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
  let ambient = false;
  let ambientTimer = 0;

  function size() {
    cv.width = innerWidth * devicePixelRatio;
    cv.height = innerHeight * devicePixelRatio;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  size();
  addEventListener('resize', size);

  const palette = ['#e8c97a', '#f4b8c5', '#b7cbb0', '#fbf3ea', '#e0899a', '#7ec4e8'];

  function burst(x, y, n = 56) {
    const color = palette[(Math.random() * palette.length) | 0];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.2;
      const sp = 1.5 + Math.random() * 3.6;
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
    if (parts.length || ambient) requestAnimationFrame(loop);
    else running = false;
  }

  function kick() {
    if (!running) { running = true; loop(); }
  }

  function ambientTick() {
    if (!ambient || reduced) return;
    burst(innerWidth * (0.12 + Math.random() * 0.76),
          innerHeight * (0.08 + Math.random() * 0.28),
          40);
    kick();
    ambientTimer = setTimeout(ambientTick, 650 + Math.random() * 850);
  }

  return {
    startAmbient() {
      if (reduced) return;
      ambient = true;
      ambientTick();
    },
    stopAmbient() {
      ambient = false;
      clearTimeout(ambientTimer);
    },
    show(n) {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          burst(innerWidth * (0.16 + Math.random() * 0.68),
                innerHeight * (0.14 + Math.random() * 0.32));
          kick();
        }, i * 320);
      }
    }
  };
})();
