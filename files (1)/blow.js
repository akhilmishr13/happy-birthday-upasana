const MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const VISION_CDNS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17',
  'https://unpkg.com/@mediapipe/tasks-vision@0.10.14'
];

function scoreOf(shapes, name) {
  const hit = shapes.find(s => s.categoryName === name);
  return hit ? hit.score : 0;
}

async function loadVision() {
  for (const cdn of VISION_CDNS) {
    try {
      const mod = await import(cdn);
      const FaceLandmarker = mod.FaceLandmarker;
      const FilesetResolver = mod.FilesetResolver;
      if (!FaceLandmarker || !FilesetResolver) continue;
      const fileset = await FilesetResolver.forVisionTasks(`${cdn}/wasm`);
      const options = {
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      };
      try {
        return await FaceLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' }
        });
      } catch {
        return await FaceLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }
        });
      }
    } catch {
      /* try next cdn */
    }
  }
  return null;
}

export async function startBlowDetector({
  video,
  onMouth,
  onBlow,
  onStatus,
  onError
}) {
  let stream;
  try {
    const media = navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    const timed = new Promise((_, rej) => setTimeout(() => rej(new Error('camera-timeout')), 10000));
    stream = await Promise.race([media, timed]);
  } catch (err) {
    onError?.(err);
    return { stop() {}, ready: false, visionOk: false };
  }

  video.srcObject = stream;
  video.playsInline = true;
  video.muted = true;
  await video.play().catch(() => {});

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  const src = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  const bins = new Uint8Array(analyser.frequencyBinCount);
  const time = new Uint8Array(analyser.fftSize);

  onStatus?.('Warming up the camera…');
  let faceLandmarker = null;
  try {
    faceLandmarker = await loadVision();
  } catch {
    faceLandmarker = null;
  }
  const visionOk = !!faceLandmarker;
  onStatus?.(visionOk
    ? 'Make an O with your lips, then blow'
    : 'Camera is on — blow toward the mic');

  let raf = 0;
  let cooldown = 0;
  let lastVideoTime = -1;
  let running = true;

  const audioLevel = () => {
    analyser.getByteFrequencyData(bins);
    analyser.getByteTimeDomainData(time);
    let low = 0;
    for (let i = 2; i < 40; i++) low += bins[i];
    low /= 38;
    let rms = 0;
    for (let i = 0; i < time.length; i++) {
      const v = (time[i] - 128) / 128;
      rms += v * v;
    }
    rms = Math.sqrt(rms / time.length);
    return { low, rms };
  };

  const tick = () => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    if (cooldown > 0) cooldown--;

    const { low, rms } = audioLevel();
    const whoosh = low > 42 && rms > 0.045;

    let mouthO = 0;
    if (visionOk && video.currentTime !== lastVideoTime && video.readyState >= 2) {
      lastVideoTime = video.currentTime;
      try {
        const res = faceLandmarker.detectForVideo(video, performance.now());
        const shapes = res.faceBlendshapes?.[0]?.categories || [];
        const pucker = scoreOf(shapes, 'mouthPucker');
        const funnel = scoreOf(shapes, 'mouthFunnel');
        const jaw = scoreOf(shapes, 'jawOpen');
        mouthO = Math.max(pucker, funnel * 1.15);
        if (jaw > 0.45 && funnel < 0.2) mouthO *= 0.35;
        onMouth?.(mouthO);
      } catch {
        /* keep listening */
      }
    } else if (!visionOk) {
      onMouth?.(whoosh ? 0.7 : 0);
    }

    const oShape = mouthO > 0.28;
    const blowing = visionOk
      ? oShape && (whoosh || mouthO > 0.62)
      : whoosh && rms > 0.06;

    if (blowing && cooldown <= 0) {
      const strength = Math.min(1, Math.max(0.4, mouthO * 0.7 + rms * 3 + (low / 140)));
      cooldown = 36;
      onBlow?.(strength);
    }
  };
  tick();

  return {
    ready: true,
    visionOk,
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      stream.getTracks().forEach(t => t.stop());
      audioCtx.close().catch(() => {});
      faceLandmarker?.close?.();
    }
  };
}
