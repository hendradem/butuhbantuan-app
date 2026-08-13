export type OpsNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  kind: "order" | "sos" | "system" | "arrived";
  createdAt: string;
  read: boolean;
};

const MAX_ITEMS = 40;

/** Shared ops alerts + notification inbox for admin/unit dashboards. */
export function useOpsAlerts() {
  const pendingOrders = useState<number>("ops-pending-orders", () => 0);
  const pendingSos = useState<number>("ops-pending-sos", () => 0);
  const slaBreachCount = useState<number>("ops-sla-breach", () => 0);
  const notifications = useState<OpsNotification[]>("ops-notifications", () => []);

  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length);

  function setPendingOrders(n: number) {
    pendingOrders.value = Math.max(0, n);
  }

  function setPendingSos(n: number) {
    pendingSos.value = Math.max(0, n);
  }

  function setSlaBreachCount(n: number) {
    slaBreachCount.value = Math.max(0, n);
  }

  function pushNotification(input: Omit<OpsNotification, "id" | "createdAt" | "read"> & { id?: string }) {
    const id = input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Dedupe by id (e.g. order id) so poll loops don't spam.
    if (notifications.value.some((n) => n.id === id)) return;
    notifications.value = [
      {
        id,
        title: input.title,
        body: input.body,
        href: input.href,
        kind: input.kind,
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...notifications.value,
    ].slice(0, MAX_ITEMS);
  }

  function markRead(id: string) {
    notifications.value = notifications.value.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
  }

  function markAllRead() {
    notifications.value = notifications.value.map((n) => ({ ...n, read: true }));
  }

  function clearAll() {
    notifications.value = [];
  }

  return {
    pendingOrders,
    pendingSos,
    slaBreachCount,
    notifications,
    unreadCount,
    setPendingOrders,
    setPendingSos,
    setSlaBreachCount,
    pushNotification,
    markRead,
    markAllRead,
    clearAll,
  };
}
