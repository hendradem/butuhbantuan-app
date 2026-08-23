<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";

const { logout, unitHeaders, unitUsername, emergencyUUID, token } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const route = useRoute();
const { setPendingOrders, setSlaBreachCount, pushNotification, slaBreachCount } = useOpsAlerts();
const { startLoudLoop, stopLoop, unlock, enableAlarm, armFromGesture, lastPlayOk, playShort } = useAlertSound();
const soundNeedsTap = ref(false);

const profileOpen = ref(false);
const profileRef = ref<HTMLElement | null>(null);

function onProfileOutside(e: MouseEvent) {
  if (profileRef.value && !profileRef.value.contains(e.target as Node)) {
    profileOpen.value = false;
  }
}

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

// Chirp + browser notif when dispatcher's SLA watchlist grows (skip initial load).
const _slaInit = ref(false);
watch(slaBreachCount, (now, before) => {
  if (!_slaInit.value) { _slaInit.value = true; return; }
  if (!isDispatcher.value) return;
  if (now > (before ?? 0)) {
    playShort();
    if (import.meta.client && "Notification" in window && Notification.permission === "granted") {
      new Notification("SLA Breach", {
        body: `${now} tiket di antrian Anda mendekati batas waktu.`,
        tag: "sla-breach",
      });
    }
  }
});

const unitCoords = computed(() => {
  const p = profile.value;
  if (!p) return null;

  // [lng, lat] array (API shape)
  const coords = p.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      return { lat, lng };
    }
  }

  // Object / alternate fields
  const lat = Number(p.latitude ?? p.lat ?? p.address?.latitude);
  const lng = Number(p.longitude ?? p.lng ?? p.address?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }
  return null;
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
/** Deduplicate hub SubscribeMany fan-out (assignee + wilayah) for the same order. */
const recentNewOrderAt = new Map<string, number>();
const NEW_ORDER_DEDUP_MS = 5000;

function isDuplicateNewOrder(order?: any): boolean {
  const key = String(order?.id || order?.ticket_number || "").trim();
  if (!key) return false;
  const now = Date.now();
  const prev = recentNewOrderAt.get(key) || 0;
  if (now - prev < NEW_ORDER_DEDUP_MS) return true;
  recentNewOrderAt.set(key, now);
  if (recentNewOrderAt.size > 80) {
    for (const [k, t] of recentNewOrderAt) {
      if (now - t > NEW_ORDER_DEDUP_MS) recentNewOrderAt.delete(k);
    }
  }
  return false;
}

const activeAlert = computed(() => alertQueue.value[0] ?? null);

watch(activeAlert, (v) => {
  // Keep page usable (map/list) under the minimal offer panel
  if (!import.meta.client) return;
  void v;
});

const activeAlertShared = useState<any>("bb-unit-active-alert", () => null);
watch(
  activeAlert,
  (v) => {
    activeAlertShared.value = v;
  },
  { immediate: true },
);

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
  if (alertQueue.value.length > 0) {
    startLoudLoop(1700);
    // Browser may still block until any click — gesture handler auto-resumes MP3.
    window.setTimeout(() => {
      soundNeedsTap.value = alertQueue.value.length > 0 && !lastPlayOk();
    }, 400);
  } else {
    stopLoop();
    soundNeedsTap.value = false;
  }
}

/** Bring unit ops to orders map home so the heatmap is visible behind the offer sheet. */
function ensureOrdersMapVisible() {
  if (!import.meta.client) return;
  if (!route.path.startsWith("/unit")) return;
  // Already on the orders dashboard (map/table) — sheet teleports over it.
  if (route.path === "/unit/orders") return;

  try {
    sessionStorage.setItem("bb-unit-orders-view", "map");
  } catch {
    /* ignore */
  }
  void navigateTo("/unit/orders");
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
  ensureOrdersMapVisible();
  if (import.meta.client && typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([280, 120, 280, 120, 400]);
    } catch {
      /* ignore */
    }
  }
}

async function onEnableAlarm() {
  const ok = await enableAlarm();
  soundNeedsTap.value = !ok;
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
    // Merge fresher poll fields (photo_url, etc.) into queue — don't keep stale SSE stubs.
    alertQueue.value = alertQueue.value
      .filter((o) => pendingIds.has(o.id))
      .map((o) => {
        const fresh = pending.find((p: any) => p.id === o.id);
        return fresh ? { ...o, ...fresh } : o;
      });
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
  document.addEventListener("mousedown", onProfileOutside);
  if (import.meta.client && "Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission();
  }
  // Unlock autoplay only — do NOT start siren here (that caused false alarms).
  void armFromGesture().then((ok) => {
    if (ok) soundNeedsTap.value = false;
  });
  pollOrders("mount");
  pollTimer = setInterval(() => pollOrders("interval"), 30_000);
});
onUnmounted(() => {
  document.removeEventListener("mousedown", onProfileOutside);
  if (pollTimer) clearInterval(pollTimer);
  stopLoop();
  if (import.meta.client) document.body.style.overflow = "";
});

// Live SSE — assignee alerts + wilayah dispatcher ops (same stream, hub fans out).
useOrderSSE(
  () => token.value,
  baseUrl,
  {
    silentToast: true,
    onNewOrder: (order?: any) => {
      const dup = isDuplicateNewOrder(order);
      // Offer sheet + OS + bell already notify — skip flash toast (felt like double notif).
      // Still refresh data; poll itself is debounced.
      if (!dup) {
        pollOrders("sse");
      }
      if (route.path.startsWith("/unit/ops") || route.path.startsWith("/unit/orders")) {
        refreshNuxtData().catch(() => {});
      } else {
        refreshNuxtData("unit-orders").catch(() => {});
      }
    },
    onOrderUpdated: (order?: any) => {
      const own =
        order?.emergency_uuid && order.emergency_uuid === emergencyUUID.value;
      if (own && order?.status === "completed") {
        const ticket = order?.ticket_number || "";
        pushNotification({
          id: `completed-${order?.id || ticket}`,
          title: "Selesai & laporan",
          body: ticket
            ? `Tiket ${ticket} ditutup — lanjut isi laporan`
            : "Tiket ditutup — lanjut isi laporan",
          href: ticket ? `/unit/orders/${ticket}` : "/unit/orders",
          kind: "system",
        });
        const suppressUntil = useState<number>("suppress-order-flash-until", () => 0).value;
        if (Date.now() > suppressUntil) {
          toast.success(
            ticket ? `Selesai & laporan · ${ticket}` : "Selesai & laporan",
            { duration: 5000 },
          );
        }
      }
      pollOrders("sse");
      if (route.path.startsWith("/unit/ops") || route.path.startsWith("/unit/orders")) {
        refreshNuxtData().catch(() => {});
      }
    },
    onReassigned: () => {
      pollOrders("sse");
      if (route.path.startsWith("/unit/ops") || route.path.startsWith("/unit/orders")) {
        refreshNuxtData().catch(() => {});
      }
    },
    onArrived: (order: any) => {
      const ticket = order?.ticket_number || "";
      // Arrived toasts only for own tickets (wilayah may also receive the event).
      if (order?.emergency_uuid && order.emergency_uuid !== emergencyUUID.value) {
        if (route.path.startsWith("/unit/ops")) {
          refreshNuxtData().catch(() => {});
        }
        return;
      }
      pushNotification({
        id: `arrived-${order?.id || ticket}`,
        title: "Tiba di lokasi",
        body: ticket
          ? `${order?.unit_name || "Unit"} · ${ticket}`
          : `${order?.requester_name || "Pelapor"} — petugas di lokasi`,
        href: ticket ? `/unit/orders/${ticket}` : "/unit/orders",
        kind: "arrived",
      });
      const suppressUntil = useState<number>("suppress-order-flash-until", () => 0).value;
      if (Date.now() > suppressUntil) {
        toast.success(
          ticket ? `Tiba di lokasi · ${ticket}` : "Petugas sudah sampai di lokasi",
          { duration: 5000 },
        );
      }
      if (route.path.startsWith("/unit/orders") || route.path.startsWith("/unit/ops")) {
        refreshNuxtData().catch(() => {});
      }
    },
  },
  "unit"
);

// ── Mobile drawer ─────────────────────────────────────────────────────────────
const drawerOpen = ref(false);
const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useUnitSidebar();

type NavItem = {
  label: string;
  to: string;
  icon: string;
  badgeKey?: "orders" | "sla" | "opsQueue";
};

const coreNavItems: NavItem[] = [
  { label: "Dashboard", to: "/unit/orders", icon: "lucide:layout-dashboard", badgeKey: "orders" },
  { label: "Statistik", to: "/unit/stats", icon: "lucide:bar-chart-2" },
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
  if (to === "/unit/stats") {
    return route.path === "/unit/stats" || route.path.startsWith("/unit/stats/");
  }
  if (to === "/unit/feedback") {
    return route.path === "/unit/feedback" || route.path.startsWith("/unit/feedback/");
  }
  if (to === "/unit/settings") {
    return route.path === "/unit/settings" || route.path.startsWith("/unit/settings/");
  }
  return route.path === to || route.path.startsWith(`${to}/`);
}

const pageTitle = computed(() => {
  const meta = route.meta as Record<string, string>;
  return meta.title || "Dashboard";
});

const breadcrumbs = computed(() => {
  const path = route.path;
  const crumbs: { label: string; to?: string }[] = [
    { label: "Home", to: "/unit/orders" },
  ];

  if (path.startsWith("/unit/orders/") && path !== "/unit/orders") {
    crumbs.push({ label: "Pesanan", to: "/unit/orders" });
    crumbs.push({ label: String(route.params.ticket || "Detail") });
    return crumbs;
  }
  if (path.startsWith("/unit/ops")) {
    crumbs.push({ label: "Ops Wilayah", to: "/unit/ops" });
    if (path.startsWith("/unit/ops/queue")) crumbs.push({ label: "Antrian" });
    else if (path.startsWith("/unit/ops/sla")) crumbs.push({ label: "SLA Breach" });
    else if (path.startsWith("/unit/ops/map")) crumbs.push({ label: "Peta Ops" });
    else if (path !== "/unit/ops") crumbs.push({ label: pageTitle.value });
    return crumbs;
  }
  if (path.startsWith("/unit/reports")) {
    crumbs.push({ label: "Laporan" });
    return crumbs;
  }
  if (path.startsWith("/unit/stats")) {
    crumbs.push({ label: "Statistik" });
    return crumbs;
  }
  if (path.startsWith("/unit/feedback")) {
    crumbs.push({ label: "Feedback" });
    return crumbs;
  }
  if (path.startsWith("/unit/settings")) {
    crumbs.push({ label: "Pengaturan" });
    return crumbs;
  }
  // /unit/orders home
  crumbs.push({ label: pageTitle.value });
  return crumbs;
});
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

    <!-- ── Sidebar (desktop collapsible, mobile as drawer) ─────────────────── -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-white border-r border-neutral-200 shrink-0 transition-all duration-300',
        sidebarCollapsed ? 'lg:w-[60px]' : 'lg:w-[240px]',
        'w-[240px]',
        'lg:static lg:translate-x-0',
        drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <!-- Brand -->
      <div
        :class="[
          'border-b border-neutral-100 shrink-0',
          sidebarCollapsed
            ? 'lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-1.5 lg:py-2.5 lg:px-0 lg:h-auto h-[60px] flex items-center px-3.5 gap-3'
            : 'h-[60px] flex items-center gap-3 px-3.5',
        ]"
      >
        <div class="w-8 h-8 rounded-lg bg-emergency-600 flex items-center justify-center shrink-0">
          <Icon icon="lucide:siren" class="text-white text-base" />
        </div>
        <div class="flex-1 min-w-0" :class="{ 'lg:hidden': sidebarCollapsed }">
          <p class="text-sm font-semibold text-neutral-900 leading-none truncate">ButuhBantuan</p>
          <p class="text-xs text-neutral-400 leading-none mt-1">Unit Panel</p>
        </div>
        <button
          type="button"
          class="hidden lg:flex w-7 h-7 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors shrink-0"
          :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="toggleSidebar"
        >
          <Icon :icon="sidebarCollapsed ? 'lucide:chevrons-right' : 'lucide:chevrons-left'" class="text-sm" />
        </button>
        <button class="lg:hidden w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:bg-neutral-100" @click="drawerOpen = false">
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <template v-for="(item, idx) in navItems" :key="item.to">
          <p
            v-if="isDispatcher && idx === coreNavItems.length && !sidebarCollapsed"
            class="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400"
          >
            Ops Wilayah
          </p>
          <div
            v-else-if="isDispatcher && idx === coreNavItems.length && sidebarCollapsed"
            class="border-t border-neutral-100 my-2 hidden lg:block"
          />
          <NuxtLink
            :to="item.to"
            :title="sidebarCollapsed ? item.label : undefined"
            :class="[
              'flex items-center rounded-lg text-sm font-medium transition-colors relative',
              sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2.5 lg:w-full gap-2.5 px-2.5 py-2.5' : 'gap-2.5 px-2.5 py-2.5',
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
            <span :class="['truncate', sidebarCollapsed ? 'lg:hidden' : '']">{{ item.label }}</span>
            <span
              v-if="navBadge(item) > 0"
              :class="[
                'bg-emergency-600 text-white font-bold rounded-full flex items-center justify-center',
                sidebarCollapsed
                  ? 'lg:absolute lg:top-1 lg:right-1 min-w-[14px] h-3.5 text-[8px] px-0.5 ml-0'
                  : 'ml-auto min-w-[20px] h-5 text-[10px] px-1',
              ]"
            >
              {{ navBadge(item) > 99 ? '99+' : navBadge(item) }}
            </span>
          </NuxtLink>
        </template>
      </nav>

      <!-- Bottom: logout only -->
      <div :class="['shrink-0 border-t border-neutral-100 p-2', sidebarCollapsed ? 'lg:flex lg:justify-center' : '']">
        <button
          type="button"
          :title="sidebarCollapsed ? 'Keluar' : undefined"
          :class="[
            'flex items-center rounded-lg text-sm font-medium text-neutral-600 hover:bg-emergency-50 hover:text-emergency-700 transition-colors',
            sidebarCollapsed ? 'lg:justify-center lg:w-full lg:px-0 lg:py-2.5 gap-2.5 px-2.5 py-2 w-full' : 'w-full gap-2.5 px-2.5 py-2',
          ]"
          @click="logout"
        >
          <Icon icon="lucide:log-out" class="text-[18px] shrink-0" />
          <span :class="sidebarCollapsed ? 'lg:hidden' : ''">Keluar</span>
        </button>
      </div>
    </aside>

    <!-- ── Main content ───────────────────────────────────────────────────────── -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">

      <!-- Top header -->
      <header class="h-[60px] shrink-0 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-neutral-200 relative z-40">
        <button
          type="button"
          class="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
          @click="drawerOpen = true"
        >
          <Icon icon="lucide:menu" class="text-lg" />
        </button>
        <button
          type="button"
          class="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
          :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="toggleSidebar"
        >
          <Icon :icon="sidebarCollapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'" class="text-lg" />
        </button>

        <!-- Breadcrumb -->
        <div class="flex items-center gap-1.5 text-sm min-w-0 flex-1">
          <template v-for="(seg, i) in breadcrumbs" :key="`${seg.label}-${i}`">
            <NuxtLink
              v-if="seg.to && i < breadcrumbs.length - 1"
              :to="seg.to"
              class="hidden sm:block text-neutral-400 hover:text-neutral-700 transition-colors shrink-0"
            >
              {{ seg.label }}
            </NuxtLink>
            <Icon
              v-if="i < breadcrumbs.length - 1"
              icon="lucide:chevron-right"
              class="hidden sm:block text-neutral-300 text-xs shrink-0"
            />
            <span
              v-if="i === breadcrumbs.length - 1"
              class="font-semibold text-neutral-900 truncate"
            >
              {{ seg.label }}
            </span>
          </template>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <NotificationCenter />

          <div class="w-px h-5 bg-neutral-200" />

          <!-- Profile dropdown → settings -->
          <div ref="profileRef" class="relative">
            <button
              type="button"
              class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              @click="profileOpen = !profileOpen"
            >
              <div class="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                <Icon icon="lucide:user" class="text-primary-600 text-[12px]" />
              </div>
              <span class="hidden sm:block text-sm font-medium text-neutral-700 max-w-[140px] truncate">
                {{ profile?.unit_name || unitUsername || "Unit" }}
              </span>
              <Icon
                icon="lucide:chevron-down"
                class="hidden sm:block text-neutral-400 text-xs transition-transform"
                :class="{ 'rotate-180': profileOpen }"
              />
            </button>

            <Transition name="dropdown">
              <div
                v-if="profileOpen"
                class="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 z-50"
              >
                <div class="px-3 py-2.5 border-b border-neutral-100">
                  <p class="text-sm font-semibold text-neutral-900 truncate">
                    {{ profile?.unit_name ?? "Unit" }}
                  </p>
                  <p class="text-xs text-neutral-400 truncate mt-0.5">
                    {{ profile?.emergency_type || unitUsername || "Unit Panel" }}
                  </p>
                  <p class="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
                    <span :class="['w-1.5 h-1.5 rounded-full', isActive ? 'bg-green-500' : 'bg-neutral-400']" />
                    {{ isActive ? "Layanan aktif" : "Layanan nonaktif" }}
                  </p>
                </div>
                <div class="py-1">
                  <NuxtLink
                    to="/unit/settings"
                    class="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    @click="profileOpen = false"
                  >
                    <Icon icon="lucide:settings" class="text-neutral-400 text-[15px]" />
                    Pengaturan
                  </NuxtLink>
                </div>
              </div>
            </Transition>
          </div>
        </div>
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
        :sound-needs-tap="soundNeedsTap"
        @accept="respondAlert(activeAlert, 'accepted')"
        @reject="openRejectAlert"
        @enable-sound="onEnableAlarm"
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
.dropdown-enter-active, .dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
