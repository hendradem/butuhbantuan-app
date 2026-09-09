<script setup lang="ts">
import { Icon } from "@iconify/vue";

const mobileOpen = ref(false);
const { setPendingOrders, setPendingSos, setSlaBreachCount, pushNotification, slaBreachCount } = useOpsAlerts();
const { playShort } = useAlertSound();

// Alert dispatcher when SLA breach count rises (skip first load).
const _slaInit = ref(false);
watch(slaBreachCount, (now, before) => {
  if (!_slaInit.value) { _slaInit.value = true; return; }
  if (now > (before ?? 0)) {
    playShort();
    if (import.meta.client && "Notification" in window && Notification.permission === "granted") {
      new Notification("SLA Breach", {
        body: `${now} tiket mendekati atau melebihi batas waktu respons.`,
        tag: "sla-breach",
      });
    }
  }
});

function closeMobile() { mobileOpen.value = false; }

provide("toggleMobile", () => { mobileOpen.value = !mobileOpen.value; });

// Ganti halaman (path) → scroll main ke atas. Query-only (filter periode, tab) tetap di posisi.
const route = useRoute();
watch(
  () => route.path,
  (to, from) => {
    if (!import.meta.client || to === from) return;
    nextTick(() => {
      document
        .querySelectorAll<HTMLElement>('[data-dashboard-scroll="main"]')
        .forEach((el) => {
          el.scrollTop = 0;
        });
    });
  },
);

// ── Top-right toast stack for new orders (supervisi — detail di unit) ─────────
const { baseUrl } = useApi();
const { token } = useAuth();
const SEEN_KEY = "bb-admin-seen-order-ids";
const toastStack = ref<any[]>([]);
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();
let pollInitialized = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function getSeenIds(): Set<string> {
  if (!import.meta.client) return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function addSeenIds(ids: string[]) {
  if (!import.meta.client) return;
  try {
    const s = getSeenIds();
    ids.forEach((id) => s.add(id));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-1000)));
  } catch {
    /* ignore */
  }
}

function dismissToast(id: string) {
  toastStack.value = toastStack.value.filter((o) => o.id !== id);
  const t = toastTimers.get(id);
  if (t) {
    clearTimeout(t);
    toastTimers.delete(id);
  }
}

function pushToast(order: any) {
  if (!order?.id) return;
  if (toastStack.value.some((o) => o.id === order.id)) return;
  toastStack.value = [order, ...toastStack.value].slice(0, 4);
  const existing = toastTimers.get(order.id);
  if (existing) clearTimeout(existing);
  toastTimers.set(
    order.id,
    setTimeout(() => dismissToast(order.id), 12_000),
  );
}

/** Live hub → Nuxt payload (orders table + open ticket) + overview heatmap. */
let liveRefreshAt = 0;
function refreshAdminLive() {
  const now = Date.now();
  if (now - liveRefreshAt < 400) return;
  liveRefreshAt = now;
  if (import.meta.client) {
    window.dispatchEvent(new CustomEvent("bb:admin-order-live"));
  }
  refreshNuxtData("admin-orders").catch(() => {});
  const ticket = route.params.ticket;
  if (typeof ticket === "string" && ticket && route.path.startsWith("/orders/")) {
    refreshNuxtData(`order-detail-${ticket}`).catch(() => {});
  }
}

function announceOrders(orders: any[]) {
  if (!orders.length) return;
  addSeenIds(orders.map((o: any) => o.id));
  // Admin dashboard: visual / browser notif only — no emergency MP3 (unit panel only).
  for (const o of orders) {
    pushNotification({
      id: `order-${o.id}`,
      title: o.source === "sos" ? "SOS baru · pantau unit" : "Pesanan baru · pantau unit",
      body: `${o.requester_name || "Pelapor"} · ${o.unit_name || "Unit"} · ${o.ticket_number || ""}`,
      href: o.ticket_number ? `/orders/${o.ticket_number}` : "/orders",
      kind: o.source === "sos" ? "sos" : "order",
    });
    pushToast(o);
  }
  refreshAdminLive();
}

async function pollOrders() {
  if (!token.value) return;
  try {
    const [ordersRes, sosRes] = await Promise.all([
      $fetch<{ data: any[] }>(`${baseUrl}/api/v1/admin/orders`, {
        headers: { "X-Admin-Key": token.value },
      }),
      $fetch<{ data: any[] }>(`${baseUrl}/api/v1/sos/`, {
        headers: { "X-Admin-Key": token.value },
      }).catch(() => ({ data: [] as any[] })),
    ]);

    const allOrders = ordersRes.data ?? [];
    const pending = allOrders.filter((o: any) => o.status === "pending");
    setPendingOrders(pending.length);

    const now = Date.now();
    const slaFocus = pending.filter((o: any) => {
      if (o.dispatch_status === "exhausted" || o.dispatch_status === "escalated") return true;
      if (!o.sla_deadline) return false;
      const t = new Date(o.sla_deadline).getTime();
      if (Number.isNaN(t)) return false;
      return t - now <= 60_000;
    });
    setSlaBreachCount(slaFocus.length);

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const orderByTicket = new Map(
      allOrders.filter((o: any) => o.ticket_number).map((o: any) => [o.ticket_number, o]),
    );
    // Badge Log SOS = yang perlu pantau (belum tiket / tiket masih aktif), 24 jam terakhir
    const sosWatch = (sosRes.data ?? []).filter((s: any) => {
      if (new Date(s.created_at).getTime() < dayAgo) return false;
      if (!s.ticket_number) return true;
      const o = orderByTicket.get(s.ticket_number);
      if (!o) return true;
      return o.status === "pending" || o.status === "accepted" || o.status === "in_progress";
    });
    setPendingSos(sosWatch.length);

    const seenIds = getSeenIds();
    if (!pollInitialized) {
      addSeenIds(pending.map((o: any) => o.id));
      pollInitialized = true;
      return;
    }

    const newOrders = pending.filter((o: any) => !seenIds.has(o.id));
    announceOrders(newOrders);
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  pollOrders();
  pollTimer = setInterval(pollOrders, 30_000);
});
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  for (const t of toastTimers.values()) clearTimeout(t);
  toastTimers.clear();
});

useOrderSSE(
  () => token.value,
  baseUrl,
  {
    silentToast: true,
    onOrderUpdated: () => {
      refreshAdminLive();
    },
    onReassigned: () => {
      refreshAdminLive();
      pollOrders();
    },
    onNewOrder: (order?: any) => {
      if (order?.id) {
        const seen = getSeenIds();
        if (!seen.has(order.id)) {
          announceOrders([order]);
          return;
        }
      }
      refreshAdminLive();
      pollOrders();
    },
    onArrived: (order: any) => {
      const ticket = order?.ticket_number || "";
      pushNotification({
        id: `arrived-${order?.id || ticket}`,
        title: "Tiba di lokasi",
        body: ticket
          ? `${order?.unit_name || "Unit"} · ${ticket} · ${order?.requester_name || ""}`
          : "Petugas tiba di lokasi pelapor",
        href: ticket ? `/orders/${ticket}` : "/orders",
        kind: "arrived",
      });
      refreshAdminLive();
    },
  },
  "admin",
);
</script>

<template>
  <div class="flex h-dvh max-h-dvh bg-neutral-50 overflow-hidden font-sans">
    <Transition name="fade">
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-40 bg-neutral-950/40 lg:hidden"
        @click="closeMobile"
      />
    </Transition>

    <div
      :class="[
        'fixed inset-y-0 left-0 z-50 shrink-0 lg:relative lg:z-auto lg:h-full transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <AppSidebar :mobile-open="mobileOpen" @close="closeMobile" />
    </div>

    <div class="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
      <AppHeader @toggle-mobile="mobileOpen = !mobileOpen" />
      <main
        data-dashboard-scroll="main"
        class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-neutral-50"
      >
        <slot />
      </main>
    </div>

    <!-- Top-right toast (supervisi only — bukan modal offer) -->
    <Teleport to="body">
      <div
        class="fixed top-[72px] right-4 z-[9999] w-[340px] max-w-[calc(100vw-2rem)] flex flex-col gap-2 pointer-events-none"
      >
        <TransitionGroup name="admin-toast">
          <div
            v-for="order in toastStack"
            :key="order.id"
            class="pointer-events-auto bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden ring-1 ring-black/5"
          >
            <div class="px-3.5 py-3 flex items-start gap-3">
              <div
                :class="[
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  order.source === 'sos' ? 'bg-emergency-50 text-emergency-600' : 'bg-primary-50 text-primary-600',
                ]"
              >
                <Icon :icon="order.source === 'sos' ? 'lucide:siren' : 'lucide:bell'" class="text-base" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-neutral-900 leading-snug">
                  {{ order.source === "sos" ? "SOS masuk" : "Pesanan masuk" }}
                </p>
                <p class="text-xs text-neutral-600 truncate mt-0.5">
                  {{ order.requester_name || "Pelapor" }}
                  <span v-if="order.unit_name"> → {{ order.unit_name }}</span>
                </p>
                <p class="text-[11px] text-neutral-400 font-mono mt-0.5">
                  {{ order.ticket_number }}
                </p>
                <p class="text-[11px] text-neutral-400 mt-1.5">
                  Unit yang menangani — pantau saja di sini
                </p>
              </div>
              <button
                type="button"
                class="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 shrink-0"
                @click="dismissToast(order.id)"
              >
                <Icon icon="lucide:x" class="text-sm" />
              </button>
            </div>
            <div class="px-3.5 pb-3 flex gap-2">
              <NuxtLink
                :to="order.ticket_number ? `/orders/${order.ticket_number}` : '/orders'"
                class="flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800"
                @click="dismissToast(order.id)"
              >
                Pantau tiket
              </NuxtLink>
              <NuxtLink
                to="/orders"
                class="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                @click="dismissToast(order.id)"
              >
                Semua pesanan
              </NuxtLink>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.admin-toast-enter-active, .admin-toast-leave-active { transition: all 0.28s ease; }
.admin-toast-enter-from { opacity: 0; transform: translateX(16px); }
.admin-toast-leave-to { opacity: 0; transform: translateX(12px) scale(0.96); }
.admin-toast-move { transition: transform 0.28s ease; }
</style>
