/**
 * Alert sounds for dashboard.
 * - short: one "kriiing" burst (admin)
 * - loop: repeats until stopLoop() (unit pending accept/reject)
 * - loud: higher-volume dual-tone for blocking offer modal
 */
export function useAlertSound() {
  let audioCtx: AudioContext | null = null;
  let loopTimer: ReturnType<typeof setInterval> | null = null;
  let unlocked = false;

  function getCtx(): AudioContext | null {
    if (!import.meta.client) return null;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtx) audioCtx = new Ctx();
      return audioCtx;
    } catch {
      return null;
    }
  }

  function unlock() {
    const ctx = getCtx();
    if (ctx?.state === "suspended") void ctx.resume();
    unlocked = true;
  }

  function onFirstGesture() {
    unlock();
    document.removeEventListener("click", onFirstGesture);
    document.removeEventListener("touchstart", onFirstGesture);
  }

  if (import.meta.client) {
    document.addEventListener("click", onFirstGesture, { once: true });
    document.addEventListener("touchstart", onFirstGesture, { once: true });
  }

  /** Classic phone-like "kriiing" burst (~1.2s). */
  function playKriing(volume = 0.22) {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    // Dual-tone ring pairs (like a landline ring)
    const bursts: { start: number; freq1: number; freq2: number }[] = [
      { start: 0.0, freq1: 440, freq2: 480 },
      { start: 0.35, freq1: 440, freq2: 480 },
      { start: 0.7, freq1: 440, freq2: 480 },
    ];

    for (const b of bursts) {
      for (const freq of [b.freq1, b.freq2]) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          const t0 = ctx.currentTime + b.start;
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
          osc.start(t0);
          osc.stop(t0 + 0.3);
        } catch {
          // ignore
        }
      }
    }
  }

  /** Louder siren-ish sweep for blocking unit offer (~1.4s). */
  function playLoudAlarm(volume = 0.38) {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime;
      osc.frequency.setValueAtTime(680, t0);
      osc.frequency.linearRampToValueAtTime(920, t0 + 0.35);
      osc.frequency.linearRampToValueAtTime(680, t0 + 0.7);
      osc.frequency.linearRampToValueAtTime(980, t0 + 1.05);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.04);
      gain.gain.setValueAtTime(volume * 0.85, t0 + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.35);
      osc.start(t0);
      osc.stop(t0 + 1.4);
    } catch {
      playKriing(volume);
    }
    // Layer a short ring on top so it still feels like a phone alert
    playKriing(Math.min(0.28, volume * 0.7));
  }

  function playShort() {
    playKriing(0.18);
  }

  function startLoop(intervalMs = 2200) {
    stopLoop();
    playKriing(0.24);
    loopTimer = setInterval(() => playKriing(0.24), intervalMs);
  }

  function startLoudLoop(intervalMs = 1800) {
    stopLoop();
    unlock();
    playLoudAlarm(0.4);
    loopTimer = setInterval(() => playLoudAlarm(0.4), intervalMs);
  }

  function stopLoop() {
    if (loopTimer) {
      clearInterval(loopTimer);
      loopTimer = null;
    }
  }

  onBeforeUnmount(() => {
    stopLoop();
    if (import.meta.client) {
      document.removeEventListener("click", onFirstGesture);
      document.removeEventListener("touchstart", onFirstGesture);
    }
  });

  return { playShort, startLoop, startLoudLoop, stopLoop, unlock, unlocked: () => unlocked };
}
