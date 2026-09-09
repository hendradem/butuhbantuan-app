import { toast } from "~/utils/appToast";

type OrderSSEHandlers = {
  onNewOrder?: (order?: any) => void;
  onArrived?: (order: any) => void;
  onReassigned?: (order?: any) => void;
  /** Status / wilayah ops refresh (accept, exhausted, location, etc.). */
  onOrderUpdated?: (order?: any) => void;
  /** Skip built-in toast (use custom UI instead). */
  silentToast?: boolean;
};

/**
 * SSE helper for unit (/unit/stream?token=) or admin (/admin/stream?key=).
 * Pass a function as 3rd arg for backward-compatible onNewOrder-only usage.
 */
export function useOrderSSE(
  getAuthParam: () => string | null,
  baseUrl: string,
  handlers: OrderSSEHandlers | (() => void),
  channel: "unit" | "admin" = "unit"
) {
  const opts: OrderSSEHandlers =
    typeof handlers === "function" ? { onNewOrder: handlers } : handlers;

  function emitUpdate(order?: any) {
    if (opts.onOrderUpdated) opts.onOrderUpdated(order);
    else opts.onNewOrder?.(order);
  }

  function emitReassigned(order?: any) {
    if (opts.onReassigned) opts.onReassigned(order);
    else emitUpdate(order);
  }

  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Hub fans a single event out to multiple channels (assignee UUID + wilayah +
   * admin). A dispatcher unit that subscribes to both its unit UUID AND its
   * regency channel therefore receives the same event twice via SubscribeMany.
   * Dedupe here so every downstream handler & toast fires exactly once per
   * logical event within a short burst window.
   */
  const seenAt = new Map<string, number>();

  // Per-event window: most events echo once within ~2s (network + fan-out is
  // sub-ms). GPS pings can legitimately arrive every few seconds so keep their
  // window short — enough to absorb the fan-out echo but not real intermediate
  // pings.
  const DEDUP_WINDOW_MS: Record<string, number> = {
    new_order: 3000,
    order_reassigned: 3000,
    order_dispatch_exhausted: 3000,
    order_updated: 2000,
    order_arrived: 3000,
    responder_location: 800,
  };

  function isRecentDuplicate(type: string, payload: any): boolean {
    const id = payload?.id || payload?.ticket_number || payload?.ID;
    if (!id) return false; // no stable key → can't dedupe; let through
    const key = `${type}:${id}`;
    const now = Date.now();
    const window = DEDUP_WINDOW_MS[type] ?? 2000;
    const prev = seenAt.get(key) ?? 0;
    if (now - prev < window) return true;
    seenAt.set(key, now);
    // Occasional cleanup so the map doesn't grow forever on long-lived streams.
    if (seenAt.size > 200) {
      for (const [k, t] of seenAt) {
        if (now - t > 5000) seenAt.delete(k);
      }
    }
    return false;
  }

  function parse(e: MessageEvent): any {
    try {
      return JSON.parse(e.data);
    } catch {
      return undefined;
    }
  }

  function connect() {
    const auth = getAuthParam();
    if (!auth || typeof window === "undefined") return;

    const url =
      channel === "admin"
        ? `${baseUrl}/api/v1/admin/stream?key=${encodeURIComponent(auth)}`
        : `${baseUrl}/api/v1/unit/stream?token=${encodeURIComponent(auth)}`;

    es = new EventSource(url);

    es.addEventListener("new_order", (e: MessageEvent) => {
      const order = parse(e);
      if (!order) return;
      if (isRecentDuplicate("new_order", order)) return;
      if (!opts.silentToast) {
        toast.success(`Permintaan baru: ${order.requester_name}`, { duration: 6000 });
      }
      opts.onNewOrder?.(order);
    });

    es.addEventListener("order_reassigned", (e: MessageEvent) => {
      const payload = parse(e);
      if (payload && isRecentDuplicate("order_reassigned", payload)) return;
      if (!opts.silentToast) {
        toast("Tiket dialihkan ke unit lain", { duration: 4000 });
      }
      emitReassigned(payload);
    });

    es.addEventListener("order_dispatch_exhausted", (e: MessageEvent) => {
      const payload = parse(e);
      if (payload && isRecentDuplicate("order_dispatch_exhausted", payload)) return;
      emitUpdate(payload);
    });

    es.addEventListener("order_updated", (e: MessageEvent) => {
      const payload = parse(e);
      if (payload && isRecentDuplicate("order_updated", payload)) return;
      emitUpdate(payload);
    });

    es.addEventListener("responder_location", (e: MessageEvent) => {
      const order = parse(e);
      if (!order) return;
      // Location pings can legitimately be frequent — dedupe on a short window
      // that still absorbs the SubscribeMany fan-out echo without losing pings.
      if (isRecentDuplicate("responder_location", order)) return;
      opts.onOrderUpdated?.(order);
    });

    es.addEventListener("order_arrived", (e: MessageEvent) => {
      const order = parse(e);
      if (!order) return;
      if (isRecentDuplicate("order_arrived", order)) return;
      opts.onArrived?.(order);
    });

    es.onerror = () => {
      es?.close();
      es = null;
      reconnectTimer = setTimeout(connect, 5000);
    };
  }

  function disconnect() {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (es) {
      es.close();
      es = null;
    }
  }

  onMounted(connect);
  onUnmounted(disconnect);

  return { disconnect };
}
