import type { ComputedRef } from "vue";

export function useOrderNotification(
  pendingCount: ComputedRef<number>,
  refresh: () => void | Promise<void>,
  intervalMs = 30_000
) {
  const initialized = ref(false);
  let audioCtx: AudioContext | null = null;

  function getAudioCtx(): AudioContext | null {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtx) audioCtx = new Ctx();
      return audioCtx;
    } catch {
      return null;
    }
  }

  // Resume AudioContext on first user gesture so subsequent sounds work
  function onFirstInteraction() {
    const ctx = getAudioCtx();
    if (ctx?.state === "suspended") ctx.resume();
    document.removeEventListener("click", onFirstInteraction);
    document.removeEventListener("touchstart", onFirstInteraction);
  }

  function playEmergencySound() {
    const ctx = getAudioCtx();
    if (!ctx) return;

    // Three alternating high-low beeps: 880Hz / 660Hz
    const pattern: { freq: number; t: number }[] = [
      { freq: 880, t: 0.0 },
      { freq: 660, t: 0.22 },
      { freq: 880, t: 0.50 },
      { freq: 660, t: 0.72 },
      { freq: 880, t: 1.0 },
      { freq: 660, t: 1.22 },
    ];

    pattern.forEach(({ freq, t }) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.2);
      } catch {
        // ignore individual tone errors
      }
    });
  }

  function showBrowserNotification(newOrders: number) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification("🚨 Pesanan Baru Masuk!", {
      body: `Ada ${newOrders} pesanan baru menunggu respons.`,
      icon: "/favicon.ico",
      tag: "new-order",
      requireInteraction: true,
    });
  }

  async function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  // Watch pending count and react to increases
  watch(pendingCount, (now, before) => {
    if (!initialized.value) {
      initialized.value = true;
      return; // skip initial load
    }
    const diff = now - (before ?? 0);
    if (diff > 0) {
      playEmergencySound();
      showBrowserNotification(diff);
    }
  });

  let timer: ReturnType<typeof setInterval>;

  onMounted(() => {
    requestNotificationPermission();
    document.addEventListener("click", onFirstInteraction, { once: true });
    document.addEventListener("touchstart", onFirstInteraction, { once: true });
    timer = setInterval(() => refresh(), intervalMs);
  });

  onBeforeUnmount(() => {
    clearInterval(timer);
    document.removeEventListener("click", onFirstInteraction);
    document.removeEventListener("touchstart", onFirstInteraction);
  });

  return { playEmergencySound };
}
