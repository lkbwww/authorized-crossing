/**
 * Procedural traffic engine-bed audio for the escape road scene.
 * Volume and pitch are modulated by nearest car speed/proximity.
 */
function getAudioContext(scene) {
  return scene?.sound?.context ?? null;
}

function safeResume(ctx) {
  if (!ctx || ctx.state === "running") {
    return;
  }
  try {
    const resume = ctx.resume?.();
    if (resume && typeof resume.catch === "function") {
      resume.catch(() => {});
    }
  } catch {
    // Best-effort resume only.
  }
}

function playTrafficBurst(ctx, speedNorm, proximity) {
  const now = ctx.currentTime;
  const duration = 0.16;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.03 + proximity * 0.04, now + 0.025);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const rumble = ctx.createOscillator();
  rumble.type = "sawtooth";
  const base = 58 + speedNorm * 58;
  rumble.frequency.setValueAtTime(base, now);
  rumble.frequency.exponentialRampToValueAtTime(base * 0.82, now + duration);

  const engine = ctx.createOscillator();
  engine.type = "triangle";
  engine.frequency.setValueAtTime(base * 2.1, now);
  engine.frequency.exponentialRampToValueAtTime(base * 1.76, now + duration);

  const noise = ctx.createBufferSource();
  const frameCount = Math.max(32, Math.floor(ctx.sampleRate * duration));
  const noiseBuffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    noiseData[i] = Math.random() * 2 - 1;
  }
  noise.buffer = noiseBuffer;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(360 + speedNorm * 500, now);

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(980 + speedNorm * 540, now);
  bandpass.Q.setValueAtTime(0.45, now);

  rumble.connect(lowpass);
  lowpass.connect(master);

  engine.connect(master);

  noise.connect(bandpass);
  bandpass.connect(master);

  master.connect(ctx.destination);

  rumble.start(now);
  rumble.stop(now + duration + 0.02);
  engine.start(now);
  engine.stop(now + duration + 0.02);
  noise.start(now);
  noise.stop(now + duration + 0.02);
}

export class TrafficAudioController {
  constructor(scene) {
    this.scene = scene;
    this.nextAt = 0;
  }

  playForTraffic(cars, playerX, playerY) {
    // Emit short looping bursts based on the nearest active car only.
    if (!cars || cars.length === 0) {
      return;
    }
    const ctx = getAudioContext(this.scene);
    if (!ctx) {
      return;
    }
    safeResume(ctx);

    const now = ctx.currentTime;
    if (now < this.nextAt) {
      return;
    }

    let nearest = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const car of cars) {
      if (!car?.sprite?.active) {
        continue;
      }
      const dx = car.sprite.x - playerX;
      const dy = car.sprite.y - playerY;
      const dist = Math.hypot(dx, dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = car;
      }
    }

    if (!nearest || nearestDist > 760) {
      return;
    }

    const speed = Math.hypot(nearest.vx || 0, nearest.vy || 0);
    const speedNorm = Math.min(1.25, Math.max(0.25, speed / 260));
    const proximity = Math.min(1, Math.max(0.08, 1 - nearestDist / 760));

    playTrafficBurst(ctx, speedNorm, proximity);
    this.nextAt = now + 0.09 + (1 - proximity) * 0.12;
  }

  destroy() {
    this.scene = null;
  }
}
