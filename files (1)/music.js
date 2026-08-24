const MELODY = [
  [392, .5], [392, .5], [440, 1], [392, 1], [523.25, 1], [493.88, 2],
  [392, .5], [392, .5], [440, 1], [392, 1], [587.33, 1], [523.25, 2],
  [392, .5], [392, .5], [783.99, 1], [659.25, 1], [523.25, 1], [493.88, 1], [440, 2],
  [698.46, .5], [698.46, .5], [659.25, 1], [523.25, 1], [587.33, 1], [523.25, 2.5]
];

let track = null;
let synthCtx = null;
let started = false;
let muted = false;
let melodyTimer = null;

export function startSong() {
  if (started) return;
  started = true;

  track = new Audio('song.mp3');
  track.volume = 0.86;
  track.loop = true;

  let fellBack = false;
  const fallback = () => {
    if (fellBack) return;
    fellBack = true;
    track = null;
    playMelody();
  };

  track.addEventListener('error', fallback, { once: true });
  const p = track.play();
  if (p && p.catch) p.catch(fallback);
}

export function toggleMute() {
  muted = !muted;
  if (track) {
    if (muted) track.pause();
    else track.play();
  } else if (synthCtx) {
    if (muted) synthCtx.suspend();
    else synthCtx.resume();
  }
  return muted;
}

function playMelody() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  synthCtx = new AC();
  if (synthCtx.state === 'suspended') synthCtx.resume();
  loopMelody();
}

function loopMelody() {
  if (!synthCtx) return;
  const beat = 0.44;
  let t = synthCtx.currentTime + 0.08;
  const master = synthCtx.createGain();
  master.gain.value = muted ? 0 : 0.2;
  master.connect(synthCtx.destination);

  for (const [freq, beats] of MELODY) {
    const dur = beats * beat;
    const osc = synthCtx.createOscillator();
    const harm = synthCtx.createOscillator();
    const env = synthCtx.createGain();
    const hg = synthCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;
    harm.type = 'sine';
    harm.frequency.value = freq * 2;
    hg.gain.value = 0.16;

    harm.connect(hg); hg.connect(env); osc.connect(env); env.connect(master);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.9, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.92);

    osc.start(t); harm.start(t);
    osc.stop(t + dur); harm.stop(t + dur);
    t += dur;
  }

  const total = MELODY.reduce((s, [, b]) => s + b, 0) * beat;
  melodyTimer = setTimeout(loopMelody, total * 1000 + 400);
}
