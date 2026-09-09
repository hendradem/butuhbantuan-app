/**
 * Back navigation to a known list/dashboard route.
 * Prefer an explicit target (with map/table view) over history.back(),
 * so deep-links and mid-flow hops still land on the right view.
 */
export function useSmartBack(fallback: string | (() => string)) {
  function resolveFallback(): string {
    return typeof fallback === "function" ? fallback() : fallback;
  }

  function goBack() {
    return navigateTo(resolveFallback());
  }

  return { goBack };
}

function readSession(key: string): string | null {
  if (!import.meta.client) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  if (!import.meta.client) return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

const UNIT_ORDERS_VIEW_KEY = "bb-unit-orders-view";
const ORDER_DETAIL_BACK_KEY = "bb-order-detail-back";
const ADMIN_HEATMAP_VIEW_KEY = "bb-admin-heatmap-view";

/** Unit pesanan list — restore map/table from persisted tab. */
export function unitOrdersBackTo(): string {
  const view = readSession(UNIT_ORDERS_VIEW_KEY);
  if (view === "table") return "/unit/orders?view=table";
  return "/unit/orders";
}

export function rememberUnitOrdersView(view: "map" | "table") {
  writeSession(UNIT_ORDERS_VIEW_KEY, view);
}

/** Admin: full back path e.g. `/` or `/orders`. */
export function rememberOrderDetailBack(path: string) {
  writeSession(ORDER_DETAIL_BACK_KEY, path);
}

export function adminOrderBackTo(): string {
  const raw = readSession(ORDER_DETAIL_BACK_KEY);
  if (raw === "/") return "/";
  if (raw === "/orders" || raw?.startsWith("/orders?")) return "/orders";
  return "/orders";
}

export function rememberAdminHeatmapView(view: "map" | "table") {
  writeSession(ADMIN_HEATMAP_VIEW_KEY, view);
}

export function readAdminHeatmapView(): "map" | "table" {
  return readSession(ADMIN_HEATMAP_VIEW_KEY) === "table" ? "table" : "map";
}

/** Dashboard overview — HeatmapViz view is restored from session on mount. */
export function adminHeatmapBackTo(): string {
  return "/";
}

export { ADMIN_HEATMAP_VIEW_KEY, UNIT_ORDERS_VIEW_KEY };
