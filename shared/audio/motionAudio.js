/**
 * Procedural motion sound effects:
 * dirt steps, snow steps, swim strokes, and dive entry.
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

function createNoiseBuffer(ctx, durationSec) {
  const frameCount = Math.max(32, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function makeDirtStep(ctx, intensity = 1) {
  const duration = 0.08;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.11 * intensity, now + 0.01);
  out.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const tone = ctx.createOscillator();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(140, now);
  tone.frequency.exponentialRampToValueAtTime(78, now + duration);

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration + 0.02);

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(520, now);

  tone.connect(out);
  noise.connect(noiseFilter);
  noiseFilter.connect(out);
  out.connect(ctx.destination);

  tone.start(now);
  tone.stop(now + duration + 0.02);
  noise.start(now);
  noise.stop(now + duration + 0.03);
}

function makeSnowStep(ctx, intensity = 1) {
  const duration = 0.11;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.09 * intensity, now + 0.015);
  out.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const crunch = ctx.createBufferSource();
  crunch.buffer = createNoiseBuffer(ctx, duration + 0.02);

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.setValueAtTime(600, now);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(2600, now);

  const click = ctx.createOscillator();
  click.type = "square";
  click.frequency.setValueAtTime(320, now);
  click.frequency.exponentialRampToValueAtTime(180, now + 0.05);

  crunch.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(out);

  click.connect(out);
  out.connect(ctx.destination);

  click.start(now);
  click.stop(now + 0.055);
  crunch.start(now);
  crunch.stop(now + duration + 0.02);
}

function makeSwimStroke(ctx, intensity = 1) {
  const duration = 0.12;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.08 * intensity, now + 0.02);
  out.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const tone = ctx.createOscillator();
  tone.type = "sine";
  tone.frequency.setValueAtTime(240, now);
  tone.frequency.exponentialRampToValueAtTime(138, now + duration);

  const splash = ctx.createBufferSource();
  splash.buffer = createNoiseBuffer(ctx, duration + 0.02);
  const splashFilter = ctx.createBiquadFilter();
  splashFilter.type = "bandpass";
  splashFilter.frequency.setValueAtTime(820, now);
  splashFilter.Q.setValueAtTime(0.7, now);

  tone.connect(out);
  splash.connect(splashFilter);
  splashFilter.connect(out);
  out.connect(ctx.destination);

  tone.start(now);
  tone.stop(now + duration + 0.02);
  splash.start(now);
  splash.stop(now + duration + 0.02);
}

function makeDive(ctx) {
  const duration = 0.18;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.13, now + 0.02);
  out.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const tone = ctx.createOscillator();
  tone.type = "sawtooth";
  tone.frequency.setValueAtTime(190, now);
  tone.frequency.exponentialRampToValueAtTime(58, now + duration);

  const plunge = ctx.createBufferSource();
  plunge.buffer = createNoiseBuffer(ctx, duration + 0.04);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(780, now);

  tone.connect(out);
  plunge.connect(lowpass);
  lowpass.connect(out);
  out.connect(ctx.destination);

  tone.start(now);
  tone.stop(now + duration + 0.03);
  plunge.start(now);
  plunge.stop(now + duration + 0.05);
}

export class MotionAudioController {
  constructor(scene) {
    this.scene = scene;
    this.nextAt = {
      walkDirt: 0,
      walkSnow: 0,
      swim: 0,
      dive: 0,
    };
  }

  canPlay(type, cooldownSec) {
    const ctx = getAudioContext(this.scene);
    if (!ctx) {
      return false;
    }
    safeResume(ctx);
    const now = ctx.currentTime;
    if (now < this.nextAt[type]) {
      return false;
    }
    this.nextAt[type] = now + cooldownSec;
    return true;
  }

  // Dirt footstep used on non-winter land tiles.
  playWalkDirt(intensity = 1) {
    if (!this.canPlay("walkDirt", 0.1)) {
      return;
    }
    const ctx = getAudioContext(this.scene);
    if (!ctx) {
      return;
    }
    makeDirtStep(ctx, intensity);
  }

  // Crunchier winter step used on snow/ice ground.
  playWalkSnow(intensity = 1) {
    if (!this.canPlay("walkSnow", 0.12)) {
      return;
    }
    const ctx = getAudioContext(this.scene);
    if (!ctx) {
      return;
    }
    makeSnowStep(ctx, intensity);
  }

  // Repeated water stroke while moving in water.
  playSwim(intensity = 1) {
    if (!this.canPlay("swim", 0.14)) {
      return;
    }
    const ctx = getAudioContext(this.scene);
    if (!ctx) {
      return;
    }
    makeSwimStroke(ctx, intensity);
  }

  // One-shot entry sound when submerge starts.
  playDive() {
    if (!this.canPlay("dive", 0.24)) {
      return;
    }
    const ctx = getAudioContext(this.scene);
    if (!ctx) {
      return;
    }
    makeDive(ctx);
  }

  destroy() {
    this.scene = null;
  }
}
