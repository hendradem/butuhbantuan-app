import type { ComputedRef } from "vue";

export function useOrderNotification(
  pendingCount: ComputedRef<number>,
  refresh: () => void | Promise<void>,
  intervalMs = 30_000,
  options: { sound?: "short" | "none"; browser?: boolean } = {}
) {
  const initialized = ref(false);
  // Default none: admin uses visual notif; unit layout owns emergency MP3.
  const soundMode = options.sound ?? "none";
  /** Unit layout owns OS Notification — set false on unit pages to avoid doubles. */
  const browserNotify = options.browser !== false;
  const { playShort } = useAlertSound();

  function showBrowserNotification(newOrders: number) {
    if (!browserNotify) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification("🚨 Pesanan Baru Masuk!", {
      body: `Ada ${newOrders} pesanan baru menunggu respons.`,
      icon: "/favicon.ico",
      tag: "new-order",
      requireInteraction: true,
    });
  }

  async function requestNotificationPermission() {
    if (!browserNotify) return;
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  watch(pendingCount, (now, before) => {
    if (!initialized.value) {
      initialized.value = true;
      return;
    }
    const diff = now - (before ?? 0);
    if (diff > 0) {
      if (soundMode === "short") playShort();
      showBrowserNotification(diff);
    }
  });

  let timer: ReturnType<typeof setInterval>;

  onMounted(() => {
    requestNotificationPermission();
    timer = setInterval(() => refresh(), intervalMs);
  });

  onBeforeUnmount(() => {
    clearInterval(timer);
  });

  return { playShort };
}
