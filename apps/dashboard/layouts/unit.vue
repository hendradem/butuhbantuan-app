<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";

const { logout, unitHeaders, unitUsername, emergencyUUID, token } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const route = useRoute();
const { setPendingOrders, setSlaBreachCount, pushNotification, slaBreachCount } = useOpsAlerts();
const { startLoudLoop, stopLoop, unlock } = useAlertSound();

// Ganti halaman (path) → scroll main ke atas. Query-only (filter/tab) tetap di posisi.
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

// ── Profile ───────────────────────────────────────────────────────────────────
const { data: profile } = await useAsyncData(
  "unit-profile",
  () => $fetch<{ data: any }>(`${baseUrl}/api/v1/unit/profile`, { headers: unitHeaders() })
    .then(r => r.data).catch(() => null),
  { server: false }
);

const isDispatcher = computed(() =>
  !!(profile.value?.is_dispatcher || profile.value?.is_province_dispatcher || profile.value?.ops_scope),
);

const unitCoords = computed(() => {
  const coords = profile.value?.coordinates;
  if (!coords) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
});

// ── Availability state (read-only in layout — editing is in /unit/settings) ──
const { isActive, initFromProfile } = useUnitAvailability();
watch(() => profile.value?.operational, (op) => { initFromProfile(op); }, { immediate: true });

// ── Actionable alert queue (rings until Terima / Tolak) ───────────────────────
const SEEN_KEY = 'bb-unit-seen-order-ids';
const alertQueue = ref<any[]>([]);
const actingId = ref<string | null>(null);
const pendingCount = ref(0);
const opsQueueCount = ref(0);
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastPollAt = 0;
const POLL_DEDUP_MS = 2500;

const activeAlert = computed(() => alertQueue.value[0] ?? null);

watch(activeAlert, (v) => {
  if (!import.meta.client) return;
  document.body.style.overflow = v ? "hidden" : "";
});

function getSeenIds(): Set<string> {
  if (!import.meta.client) return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
}

function addSeenIds(ids: string[]) {
  if (!import.meta.client) return;
  try {
    const s = getSeenIds();
    ids.forEach(id => s.add(id));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-1000)));
  } catch {}
}

function syncRing() {
  if (alertQueue.value.length > 0) startLoudLoop(1700);
  else stopLoop();
}

function enqueueAlerts(orders: any[]) {
  if (!orders.length) return;
  const existing = new Set(alertQueue.value.map((o) => o.id));
  const fresh = orders.filter((o) => !existing.has(o.id));
  if (!fresh.length) return;

  addSeenIds(fresh.map((o: any) => o.id));
  for (const o of fresh) {
    pushNotification({
      id: `unit-order-${o.id}`,
      title: o.source === "sos" ? "SOS masuk ke unit Anda" : "Pesanan baru",
      body: `${o.requester_name} · ${o.ticket_number}`,
      href: o.ticket_number ? `/unit/orders/${o.ticket_number}` : "/unit/orders",
      kind: o.source === "sos" ? "sos" : "order",
    });
    notifyBrowser(o);
  }
  alertQueue.value = [...alertQueue.value, ...fresh];
  unlock();
  syncRing();
  if (import.meta.client && typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([280, 120, 280, 120, 400]);
    } catch {
      /* ignore */
    }
  }
}

function notifyBrowser(order: any) {
  if (!import.meta.client || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(
      order.source === "sos" ? "SOS masuk — butuh respons" : "Pesanan baru — butuh respons",
      {
        body: `${order.requester_name || "Pelapor"} · ${order.ticket_number || ""}`,
        tag: `unit-offer-${order.id}`,
        requireInteraction: true,
      }
    );
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // ignore
  }
}

function removeAlert(orderId: string) {
  alertQueue.value = alertQueue.value.filter((o) => o.id !== orderId);
  syncRing();
}

async function respondAlert(order: any, action: "accepted" | "rejected", reason = "other", note = "") {
  if (!order?.id || actingId.value) return;
  actingId.value = order.id;
  try {
    if (action === "accepted") {
      await $fetch(`${baseUrl}/api/v1/unit/orders/${order.id}/accept`, {
        method: "POST",
        headers: unitHeaders(),
      });
      removeAlert(order.id);
      pendingCount.value = Math.max(0, pendingCount.value - 1);
      setPendingOrders(pendingCount.value);
      const ticket = order.ticket_number;
      if (ticket) {
        await navigateTo(`/unit/orders/${ticket}`);
      } else if (route.path.startsWith("/unit/orders")) {
        refreshNuxtData("unit-orders").catch(() => {});
      }
      return;
    }

    await $fetch(`${baseUrl}/api/v1/unit/orders/${order.id}/reject`, {
      method: "POST",
      headers: unitHeaders(),
      body: { reason, note },
    });
    removeAlert(order.id);
    pendingCount.value = Math.max(0, pendingCount.value - 1);
    setPendingOrders(pendingCount.value);
    if (route.path.startsWith("/unit/orders")) {
      refreshNuxtData("unit-orders").catch(() => {});
    }
  } catch {
    // keep ringing / alert visible on failure
  } finally {
    actingId.value = null;
  }
}

const showRejectAlert = ref(false);

function openRejectAlert() {
  if (!activeAlert.value) return;
  showRejectAlert.value = true;
}

async function onRejectAlertConfirm(payload: { reason: string; note: string }) {
  if (!activeAlert.value) return;
  await respondAlert(activeAlert.value, "rejected", payload.reason, payload.note);
}

async function pollOrders(source: "interval" | "sse" | "mount" = "interval") {
  const now = Date.now();
  // SSE and interval share one poll path — debounce so we don't double-enqueue/ring.
  if (source !== "mount" && now - lastPollAt < POLL_DEDUP_MS) return;
  lastPollAt = now;
  try {
    const res = await $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/orders`, { headers: unitHeaders() });
    const pending = (res.data ?? []).filter((o: any) => o.status === 'pending');
    pendingCount.value = pending.length;
    setPendingOrders(pending.length);

    // Drop alerts that are no longer pending (accepted elsewhere / refreshed)
    const pendingIds = new Set(pending.map((o: any) => o.id));
    alertQueue.value = alertQueue.value.filter((o) => pendingIds.has(o.id));
    syncRing();

    // Any pending not already in the respond queue must surface (HP-first).
    const missingFromQueue = pending.filter(
      (o: any) => !alertQueue.value.some((a) => a.id === o.id)
    );
    enqueueAlerts(missingFromQueue);
  } catch {}

  if (isDispatcher.value) {
    try {
      const opsRes = await $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/ops/orders`, {
        headers: unitHeaders(),
      });
      const opsPending = (opsRes.data ?? []).filter((o: any) => o.status === "pending");
      opsQueueCount.value = opsPending.length;
      const slaFocus = opsPending.filter((o: any) => {
        if (o.dispatch_status === "exhausted" || o.dispatch_status === "escalated") return true;
        if (!o.sla_deadline) return false;
        const t = new Date(o.sla_deadline).getTime();
        if (Number.isNaN(t)) return false;
        return t - now <= 60_000;
      });
      setSlaBreachCount(slaFocus.length);
    } catch {
      /* non-dispatcher / transient */
    }
  }
}

onMounted(() => {
  if (import.meta.client && "Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission();
  }
  pollOrders("mount");
  pollTimer = setInterval(() => pollOrders("interval"), 30_000);
});
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  stopLoop();
  if (import.meta.client) document.body.style.overflow = "";
});

// Live SSE so unit gets alerts even outside /unit/orders — triggers the same poll (deduped).
useOrderSSE(
  () => token.value,
  baseUrl,
  {
    onNewOrder: () => {
      pollOrders("sse");
    },
    onArrived: (order: any) => {
      const ticket = order?.ticket_number || "";
      pushNotification({
        id: `arrived-${order?.id || ticket}`,
        title: "Petugas sudah sampai",
        body: ticket
          ? `${order?.unit_name || "Unit"} · ${ticket}`
          : `${order?.requester_name || "Pelapor"} sudah ditangani di lokasi`,
        href: ticket ? `/unit/orders/${ticket}` : "/unit/orders",
        kind: "arrived",
      });
      toast.success(
        ticket ? `Petugas sampai · ${ticket}` : "Petugas sudah sampai di lokasi",
        { duration: 5000 }
      );
      if (route.path.startsWith("/unit/orders")) {
        refreshNuxtData().catch(() => {});
      }
    },
  },
  "unit"
);

// ── Mobile drawer ─────────────────────────────────────────────────────────────
const drawerOpen = ref(false);

type NavItem = {
  label: string;
  to: string;
  icon: string;
  badgeKey?: "orders" | "sla" | "opsQueue";
};

const coreNavItems: NavItem[] = [
  { label: "Dashboard", to: "/unit/orders", icon: "lucide:layout-dashboard", badgeKey: "orders" },
  { label: "Laporan", to: "/unit/reports", icon: "lucide:file-text" },
  { label: "Feedback", to: "/unit/feedback", icon: "lucide:message-square-heart" },
  { label: "Pengaturan", to: "/unit/settings", icon: "lucide:settings" },
];

const opsNavItems: NavItem[] = [
  { label: "Ops Wilayah", to: "/unit/ops", icon: "lucide:radar" },
  { label: "Antrian", to: "/unit/ops/queue", icon: "lucide:columns-3", badgeKey: "opsQueue" },
  { label: "SLA Breach", to: "/unit/ops/sla", icon: "lucide:alarm-clock", badgeKey: "sla" },
  { label: "Peta Ops", to: "/unit/ops/map", icon: "lucide:map" },
];

const navItems = computed(() =>
  isDispatcher.value ? [...coreNavItems, ...opsNavItems] : coreNavItems,
);

function navBadge(item: NavItem): number {
  if (item.badgeKey === "orders") return pendingCount.value;
  if (item.badgeKey === "sla") return slaBreachCount.value;
  if (item.badgeKey === "opsQueue") return opsQueueCount.value;
  return 0;
}

function isNavActive(to: string) {
  if (to === "/unit/orders") {
    return route.path === "/unit/orders" || route.path.startsWith("/unit/orders/");
  }
  if (to === "/unit/ops") {
    return route.path === "/unit/ops";
  }
  if (to === "/unit/ops/queue" || to === "/unit/ops/sla" || to === "/unit/ops/map") {
    return route.path === to || route.path.startsWith(`${to}/`);
  }
  if (to === "/unit/reports") {
    return route.path === "/unit/reports" || route.path.startsWith("/unit/reports/");
  }
  if (to === "/unit/feedback") {
    return route.path === "/unit/feedback" || route.path.startsWith("/unit/feedback/");
  }
  if (to === "/unit/settings") {
    return route.path === "/unit/settings" || route.path.startsWith("/unit/settings/");
  }
  return route.path === to || route.path.startsWith(`${to}/`);
}
</script>

<template>
  <div class="flex h-screen bg-neutral-50 overflow-hidden font-sans">

    <!-- ── Mobile: drawer overlay ────────────────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-40 bg-neutral-950/40 lg:hidden"
        @click="drawerOpen = false"
      />
    </Transition>

    <!-- ── Sidebar (desktop always, mobile as drawer) ─────────────────────────── -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-white border-r border-neutral-200 w-[240px] shrink-0 transition-transform duration-300',
        'lg:static lg:translate-x-0',
        drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <!-- Brand -->
      <div class="h-[60px] flex items-center gap-3 px-3.5 border-b border-neutral-100 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-emergency-600 flex items-center justify-center shrink-0">
          <Icon icon="lucide:siren" class="text-white text-base" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-neutral-900 leading-none truncate">ButuhBantuan</p>
          <p class="text-xs text-neutral-400 leading-none mt-1">Unit Panel</p>
        </div>
        <button class="lg:hidden w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:bg-neutral-100" @click="drawerOpen = false">
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <template v-for="(item, idx) in navItems" :key="item.to">
          <p
            v-if="isDispatcher && idx === coreNavItems.length"
            class="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400"
          >
            Ops Wilayah
          </p>
          <NuxtLink
            :to="item.to"
            :class="[
              'flex items-center gap-2.5 rounded-lg text-sm font-medium px-2.5 py-2.5 transition-colors',
              isNavActive(item.to)
                ? 'bg-primary-50 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
            ]"
            @click="drawerOpen = false"
          >
            <Icon
              :icon="item.icon"
              :class="[
                'text-[18px] shrink-0',
                isNavActive(item.to) ? 'text-primary-600' : 'text-neutral-400',
              ]"
            />
            <span class="truncate">{{ item.label }}</span>
            <span
              v-if="navBadge(item) > 0"
              class="ml-auto min-w-[20px] h-5 bg-emergency-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
            >
              {{ navBadge(item) > 99 ? '99+' : navBadge(item) }}
            </span>
          </NuxtLink>
        </template>
      </nav>

      <!-- Bottom: status + keluar (simple) -->
      <div class="shrink-0 border-t border-neutral-100 p-2 space-y-0.5">
        <div class="px-2.5 py-2 min-w-0">
          <p class="text-sm font-semibold text-neutral-900 truncate">
            {{ profile?.unit_name ?? "…" }}
          </p>
          <p class="text-xs text-neutral-400 truncate mt-0.5">
            {{ profile?.emergency_type || unitUsername || "Unit" }}
          </p>
        </div>
        <NuxtLink
          to="/unit/settings"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          @click="drawerOpen = false"
        >
          <span
            :class="['w-2 h-2 rounded-full shrink-0', isActive ? 'bg-green-500' : 'bg-neutral-400']"
          />
          <span class="flex-1 truncate">{{ isActive ? "Layanan aktif" : "Layanan nonaktif" }}</span>
          <Icon icon="lucide:chevron-right" class="text-neutral-300 text-sm shrink-0" />
        </NuxtLink>
        <button
          type="button"
          class="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-600 hover:bg-emergency-50 hover:text-emergency-700 transition-colors"
          @click="logout"
        >
          <Icon icon="lucide:log-out" class="text-[18px] shrink-0" />
          Keluar
        </button>
      </div>
    </aside>

    <!-- ── Main content ───────────────────────────────────────────────────────── -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">

      <!-- Top header -->
      <header class="h-[60px] shrink-0 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-neutral-200 relative z-40">
        <button
          class="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
          @click="drawerOpen = true"
        >
          <Icon icon="lucide:menu" class="text-lg" />
        </button>
        <p class="text-sm font-semibold text-neutral-900 truncate flex-1">
          {{ profile?.unit_name ?? 'Dashboard Unit' }}
        </p>
        <NotificationCenter />
        <!-- Status pill (mobile header) -->
        <NuxtLink
          to="/unit/settings"
          :class="[
            'lg:hidden inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border',
            isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-neutral-100 border-neutral-200 text-neutral-500',
          ]"
        >
          <span :class="['w-1.5 h-1.5 rounded-full', isActive ? 'bg-green-500' : 'bg-neutral-400']" />
          {{ isActive ? 'Aktif' : 'Nonaktif' }}
        </NuxtLink>
        <div class="hidden lg:block text-[11px] text-neutral-400 font-mono truncate max-w-[200px]">{{ emergencyUUID }}</div>
      </header>

      <!-- Page content -->
      <main data-dashboard-scroll="main" class="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <slot />
      </main>

      <!-- ── Mobile bottom navigation ─────────────────────────────────────────── -->
      <nav class="lg:hidden shrink-0 fixed bottom-0 inset-x-0 z-30 bg-white border-t border-neutral-200 flex">
        <NuxtLink
          v-for="item in coreNavItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors',
            isNavActive(item.to) ? 'text-primary-600' : 'text-neutral-400',
          ]"
        >
          <div class="relative">
            <Icon :icon="item.icon" class="text-xl" />
            <span
              v-if="navBadge(item) > 0"
              class="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-emergency-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
            >
              {{ navBadge(item) > 99 ? '99+' : navBadge(item) }}
            </span>
          </div>
          <span class="text-[10px] font-medium">{{ item.label }}</span>
        </NuxtLink>
        <!-- Menu shortcut (ops items live in drawer) -->
        <button
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-neutral-400 relative"
          @click="drawerOpen = true"
        >
          <div class="relative">
            <Icon icon="lucide:menu" class="text-xl" />
            <span
              v-if="isDispatcher && (slaBreachCount > 0 || opsQueueCount > 0)"
              class="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-emergency-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
            >
              {{ Math.min(99, slaBreachCount + opsQueueCount) }}
            </span>
          </div>
          <span class="text-[10px] font-medium">Menu</span>
        </button>
      </nav>
    </div>

    <!-- ── Blocking offer modal (map + route + alarm until Terima / Alihkan) ─ -->
    <Teleport to="body">
      <UnitRespondSheet
        v-if="activeAlert"
        :key="activeAlert.id"
        :order="activeAlert"
        :queue-length="alertQueue.length"
        :acting="actingId === activeAlert.id"
        :unit-lat="unitCoords?.lat"
        :unit-lng="unitCoords?.lng"
        :unit-name="profile?.unit_name || profile?.name"
        @accept="respondAlert(activeAlert, 'accepted')"
        @reject="openRejectAlert"
      />
    </Teleport>

    <RejectReasonModal
      v-model:open="showRejectAlert"
      :unit-name="activeAlert?.unit_name"
      @confirm="onRejectAlertConfirm"
    />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
