import {
  ORDER_PERIOD_PRESETS,
  isCreatedInRange,
  orderPeriodRange,
  toDateInputValue,
  type OrderPeriodId,
} from "~/utils/orderPeriod";

/**
 * Persisted period filter for order lists (admin / unit).
 * storagePrefix e.g. "bb-admin-orders" | "bb-unit-orders"
 */
export function useOrderPeriodFilter(
  storagePrefix: string,
  queryKey = "range",
  defaultPeriod: OrderPeriodId = "all",
) {
  const PRESET_IDS = ORDER_PERIOD_PRESETS.map((p) => p.id);
  const { tab: period, setTab: setPeriodTab } = usePersistedTab(
    `${storagePrefix}-period`,
    defaultPeriod,
    PRESET_IDS,
    queryKey,
  );

  const customFrom = usePersistedQueryParam(`${storagePrefix}-from`, "from", "", {
    syncQuery: false,
  });
  const customTo = usePersistedQueryParam(`${storagePrefix}-to`, "to", "", {
    syncQuery: false,
  });

  function setPeriod(id: string) {
    if (!(PRESET_IDS as readonly string[]).includes(id)) return;
    setPeriodTab(id as OrderPeriodId);
    if (id === "custom") {
      const today = toDateInputValue(new Date());
      if (!customFrom.value) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        customFrom.value = toDateInputValue(weekAgo);
      }
      if (!customTo.value) customTo.value = today;
    }
  }

  const range = computed(() =>
    orderPeriodRange(period.value, customFrom.value, customTo.value),
  );

  function matchesCreatedAt(iso: string | null | undefined): boolean {
    return isCreatedInRange(iso, range.value);
  }

  function filterByPeriod<T extends { created_at?: string | null }>(list: T[]): T[] {
    if (period.value === "all") return list;
    return list.filter((o) => matchesCreatedAt(o.created_at));
  }

  const presets = ORDER_PERIOD_PRESETS;
  const isCustom = computed(() => period.value === "custom");

  return {
    period,
    setPeriod,
    customFrom,
    customTo,
    range,
    presets,
    isCustom,
    matchesCreatedAt,
    filterByPeriod,
  };
}
