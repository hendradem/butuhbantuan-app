import { toast } from "~/utils/appToast";

type OrderSSEHandlers = {
  onNewOrder?: (order?: any) => void;
  onArrived?: (order: any) => void;
  onReassigned?: () => void;
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

  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    const auth = getAuthParam();
    if (!auth || typeof window === "undefined") return;

    const url =
      channel === "admin"
        ? `${baseUrl}/api/v1/admin/stream?key=${encodeURIComponent(auth)}`
        : `${baseUrl}/api/v1/unit/stream?token=${encodeURIComponent(auth)}`;

    es = new EventSource(url);

    es.addEventListener("new_order", (e: MessageEvent) => {
      try {
        const order = JSON.parse(e.data);
        if (!opts.silentToast) {
          toast.success(`Permintaan baru: ${order.requester_name}`, { duration: 6000 });
        }
        opts.onNewOrder?.(order);
      } catch {
        // ignore
      }
    });

    es.addEventListener("order_reassigned", () => {
      if (!opts.silentToast) {
        toast("Tiket dialihkan ke unit lain", { duration: 4000 });
      }
      opts.onReassigned?.() ?? opts.onNewOrder?.();
    });

    es.addEventListener("order_dispatch_exhausted", (e: MessageEvent) => {
      try {
        const order = JSON.parse(e.data);
        opts.onOrderUpdated?.(order) ?? opts.onNewOrder?.(order);
      } catch {
        opts.onOrderUpdated?.() ?? opts.onNewOrder?.();
      }
    });

    es.addEventListener("order_updated", (e: MessageEvent) => {
      try {
        const order = JSON.parse(e.data);
        opts.onOrderUpdated?.(order) ?? opts.onNewOrder?.(order);
      } catch {
        opts.onOrderUpdated?.() ?? opts.onNewOrder?.();
      }
    });

    es.addEventListener("responder_location", (e: MessageEvent) => {
      try {
        const order = JSON.parse(e.data);
        opts.onOrderUpdated?.(order);
      } catch {
        // ignore
      }
    });

    es.addEventListener("order_arrived", (e: MessageEvent) => {
      try {
        const order = JSON.parse(e.data);
        opts.onArrived?.(order);
      } catch {
        // ignore
      }
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
