import type { ComputedRef } from "vue";

export function useOrderNotification(
  pendingCount: ComputedRef<number>,
  refresh: () => void | Promise<void>,
  intervalMs = 30_000,
  options: { sound?: "short" | "none" } = {}
) {
  const initialized = ref(false);
  const soundMode = options.sound ?? "short";
  const { playShort } = useAlertSound();

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
