import { toast } from "vue3-hot-toast";

export function useOrderSSE(getToken: () => string | null, baseUrl: string, onNewOrder: () => void) {
  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    const token = getToken();
    if (!token || typeof window === "undefined") return;

    es = new EventSource(`${baseUrl}/api/v1/unit/stream?token=${encodeURIComponent(token)}`);

    es.addEventListener("new_order", (e: MessageEvent) => {
      try {
        const order = JSON.parse(e.data);
        toast.success(`Permintaan baru: ${order.requester_name}`, { duration: 6000 });
        onNewOrder();
      } catch {}
    });

    es.onerror = () => {
      es?.close();
      es = null;
      reconnectTimer = setTimeout(connect, 5000);
    };
  }

  function disconnect() {
    if (reconnectTimer !== null) {
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
