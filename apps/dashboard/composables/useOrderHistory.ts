import type { OrderHistoryItem } from "~/components/orders/OrderHistoryTimeline.vue";

export type OrderHistoryMode = "admin" | "unit";

/**
 * Loads order timeline history for admin / unit dashboards.
 * Prefers embedded ticket.history when present; otherwise fetches by order id.
 */
export function useOrderHistory(mode: OrderHistoryMode) {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;
  const items = ref<OrderHistoryItem[]>([]);
  const loading = ref(false);
  const error = ref("");

  function headers(): Record<string, string> {
    if (mode === "admin") {
      const { token } = useAuth();
      return token.value ? { "X-Admin-Key": token.value } : {};
    }
    const { unitHeaders } = useUnitAuth();
    return unitHeaders();
  }

  function prefix() {
    return mode === "admin" ? "/api/v1/admin/orders" : "/api/v1/unit/orders";
  }

  async function load(order: { id?: string; history?: OrderHistoryItem[] } | null) {
    items.value = [];
    error.value = "";
    if (!order?.id) return;

    if (Array.isArray(order.history) && order.history.length) {
      items.value = order.history;
      return;
    }

    loading.value = true;
    try {
      const res = await $fetch<{ data: OrderHistoryItem[] }>(
        `${baseUrl}${prefix()}/${order.id}/history`,
        { headers: headers() }
      );
      items.value = res.data ?? [];
    } catch (e: any) {
      error.value = e?.data?.message || "Gagal memuat riwayat";
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    items.value = [];
    error.value = "";
    loading.value = false;
  }

  return { items, loading, error, load, reset };
}
