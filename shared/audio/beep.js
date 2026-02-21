/**
 * Minimal one-shot beep helper for warnings and telegraphs.
 * Uses WebAudio directly so it works without external assets.
 */
export function playBeep(scene, frequency = 820, durationSec = 0.08, volume = 0.03) {
  try {
    const ctx = scene.sound?.context;
    if (!ctx) {
      return;
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec);
  } catch (_error) {
    // Best-effort audio cue. Ignore autoplay/context failures.
  }
}
