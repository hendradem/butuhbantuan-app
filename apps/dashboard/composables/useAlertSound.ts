/**
 * Alert sounds for dashboard — module singleton so unlock/play survive
 * component remounts (layout + page both call useAlertSound).
 *
 * Do NOT mute-play-then-pause while a loop is starting — that race was
 * silencing emergency-sound.mp3 right after startLoudLoop().
 */
const CUSTOM_SRC = "/sounds/emergency-sound.mp3";

let audioCtx: AudioContext | null = null;
let unlocked = false;
let alertAudio: HTMLAudioElement | null = null;
let looping = false;
let wantLoud = false;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let gestureBound = false;
let lastPlayOk = false;

function soundUrl(): string {
  if (!import.meta.client) return CUSTOM_SRC;
  try {
    const base = (useRuntimeConfig().app?.baseURL as string) || "/";
    const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${prefix}${CUSTOM_SRC}`;
  } catch {
    return CUSTOM_SRC;
  }
}

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

function getAlertAudio(): HTMLAudioElement | null {
  if (!import.meta.client) return null;
  if (!alertAudio) {
    alertAudio = new Audio();
    alertAudio.preload = "auto";
    (alertAudio as any).playsInline = true;
    alertAudio.src = soundUrl();
  }
  return alertAudio;
}

function playKriing(volume = 0.22) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const bursts: { start: number; freq1: number; freq2: number }[] = [
    { start: 0.0, freq1: 880, freq2: 980 },
    { start: 0.28, freq1: 880, freq2: 980 },
    { start: 0.56, freq1: 740, freq2: 820 },
  ];

  for (const b of bursts) {
    for (const freq of [b.freq1, b.freq2]) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = ctx.currentTime + b.start;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        osc.start(t0);
        osc.stop(t0 + 0.24);
      } catch {
        // ignore
      }
    }
  }
}

async function resumeCtx() {
  const ctx = getCtx();
  if (ctx?.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}

/**
 * Resume AudioContext only. Safe to call anytime — does not touch HTMLAudio
 * playback (avoids pause-race with the alert loop).
 */
function unlock() {
  unlocked = true;
  void resumeCtx();
  // Kick decode so the first alert play is faster.
  const a = getAlertAudio();
  if (a && a.readyState < 2) {
    try {
      a.load();
    } catch {
      // ignore
    }
  }
}

/**
 * Must be called from a user gesture. Actually plays (then may pause) the
 * MP3 so subsequent autoplay of the same element is allowed.
 */
async function armFromGesture(): Promise<boolean> {
  unlocked = true;
  await resumeCtx();
  const a = getAlertAudio();
  if (!a) return false;

  const want = soundUrl();
  if (!a.src || !String(a.src).includes("emergency-sound")) {
    a.src = want;
  }

  try {
    if (looping) {
      // Already ringing — just ensure unmuted + playing.
      a.muted = false;
      a.volume = 1;
      if (a.paused) await a.play();
      lastPlayOk = true;
      return true;
    }

    a.muted = true;
    a.volume = 0.01;
    await a.play();
    a.pause();
    a.currentTime = 0;
    a.muted = false;
    a.volume = 1;
    lastPlayOk = true;
    return true;
  } catch {
    lastPlayOk = false;
    return false;
  }
}

function startFileLoop(volume: number, _gapMs: number) {
  stopLoop(false);
  looping = true;
  wantLoud = true;

  const a = getAlertAudio();
  if (!a) {
    playKriing(0.28);
    fallbackTimer = setInterval(() => {
      if (!looping) return;
      playKriing(0.28);
    }, 1400);
    return;
  }

  const want = soundUrl();
  if (!a.src || !String(a.src).includes("emergency-sound")) {
    a.src = want;
  }
  if (a.readyState < 2) {
    try {
      a.load();
    } catch {
      // ignore
    }
  }

  // Continuous MP3 loop — more reliable than ended→replay (gap + autoplay).
  a.loop = true;
  a.muted = false;
  a.volume = Math.min(1, Math.max(0, volume));

  void (async () => {
    await resumeCtx();
    try {
      if (a.currentTime > 0) a.currentTime = 0;
    } catch {
      // ignore
    }
    try {
      await a.play();
      lastPlayOk = true;
    } catch {
      lastPlayOk = false;
      if (!looping) return;
      // Browser blocked autoplay — oscillator fallback; next gesture restarts MP3.
      playKriing(0.28);
      fallbackTimer = setInterval(() => {
        if (!looping) return;
        playKriing(0.28);
      }, 1400);
    }
  })();
}

function ensureGestureUnlock() {
  if (!import.meta.client || gestureBound) return;
  gestureBound = true;
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  const handler = () => {
    void (async () => {
      const ok = await armFromGesture();
      if (!ok) return;
      // Any click/key while an alert should ring → start/resume MP3 automatically.
      if (wantLoud) {
        const a = getAlertAudio();
        if (a) {
          a.muted = false;
          a.volume = 1;
          a.loop = true;
          try {
            if (a.paused || !looping) {
              looping = true;
              await a.play();
            }
            lastPlayOk = true;
            if (fallbackTimer) {
              clearInterval(fallbackTimer);
              fallbackTimer = null;
            }
          } catch {
            lastPlayOk = false;
          }
        }
      }
    })();
  };
  document.addEventListener("pointerdown", handler, opts);
  document.addEventListener("keydown", handler, opts);
  document.addEventListener("touchstart", handler, opts);
}

function stopLoop(clearWant = true) {
  looping = false;
  if (clearWant) wantLoud = false;
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  if (alertAudio) {
    try {
      alertAudio.loop = false;
      alertAudio.pause();
      alertAudio.currentTime = 0;
    } catch {
      // ignore
    }
  }
}

export function useAlertSound() {
  ensureGestureUnlock();

  async function playShort() {
    // Soft chirp only — emergency MP3 is reserved for unit panel loud loop.
    unlock();
    playKriing(0.18);
  }

  function startLoop(_intervalMs = 2200) {
    startFileLoop(0.9, 400);
  }

  function startLoudLoop(_intervalMs = 1800) {
    startFileLoop(1, 280);
  }

  /** Call from a button click when alert is visible and MP3 was blocked. */
  async function enableAlarm() {
    await armFromGesture();
    // Never start a new siren unless something already requested a loud ring
    // (e.g. pending offer). Calling this on layout mount must not blast audio.
    if (!wantLoud) return lastPlayOk;

    const a = getAlertAudio();
    if (a) {
      a.muted = false;
      a.volume = 1;
      a.loop = true;
      try {
        if (!looping || a.paused) {
          looping = true;
          await a.play();
        }
        lastPlayOk = true;
        if (fallbackTimer) {
          clearInterval(fallbackTimer);
          fallbackTimer = null;
        }
      } catch {
        lastPlayOk = false;
        if (!looping) {
          startLoudLoop();
        }
      }
    } else if (!looping) {
      startLoudLoop();
    }
    return lastPlayOk;
  }

  return {
    playShort,
    startLoop,
    startLoudLoop,
    stopLoop,
    unlock,
    armFromGesture,
    enableAlarm,
    unlocked: () => unlocked,
    lastPlayOk: () => lastPlayOk,
    isLooping: () => looping,
  };
}
