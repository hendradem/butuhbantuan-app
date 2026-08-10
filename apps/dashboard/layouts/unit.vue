<script setup lang="ts">
import { Icon } from "@iconify/vue";

const { logout, unitHeaders, unitUsername, emergencyUUID } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const route = useRoute();

// ── Profile ───────────────────────────────────────────────────────────────────
const { data: profile } = await useAsyncData(
  "unit-profile",
  () => $fetch<{ data: any }>(`${baseUrl}/api/v1/unit/profile`, { headers: unitHeaders() })
    .then(r => r.data).catch(() => null),
  { server: false }
);

const fleet = computed(() => profile.value?.fleet);
const fleetColor = computed(() => {
  if (!fleet.value || fleet.value.total === 0) return "text-neutral-400";
  return fleet.value.available > 0 ? "text-green-600" : "text-emergency-600";
});

// ── Availability state (read-only in layout — editing is in /unit/settings) ──
const { isActive, initFromProfile } = useUnitAvailability();
watch(() => profile.value?.operational, (op) => { initFromProfile(op); }, { immediate: true });

// ── New-order popup (only fires for orders not previously seen) ────────────────
const SEEN_KEY = 'bb-unit-seen-order-ids';
const popupOrders = ref<any[]>([]);
const pendingCount = ref(0);
let popupTimer: ReturnType<typeof setTimeout> | null = null;
let pollInitialized = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

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

function showPopup(orders: any[]) {
  popupOrders.value = orders;
  if (popupTimer) clearTimeout(popupTimer);
  popupTimer = setTimeout(() => { popupOrders.value = []; }, 10_000);
}

function dismissPopup() {
  popupOrders.value = [];
  if (popupTimer) clearTimeout(popupTimer);
}

async function pollOrders() {
  try {
    const res = await $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/orders`, { headers: unitHeaders() });
    const pending = (res.data ?? []).filter((o: any) => o.status === 'pending');
    pendingCount.value = pending.length;

    const seenIds = getSeenIds();
    if (!pollInitialized) {
      addSeenIds(pending.map((o: any) => o.id));
      pollInitialized = true;
      return;
    }

    const newOrders = pending.filter((o: any) => !seenIds.has(o.id));
    if (newOrders.length > 0) {
      addSeenIds(newOrders.map((o: any) => o.id));
      if (route.path !== '/unit/orders') {
        showPopup(newOrders);
      }
    }
  } catch {}
}

onMounted(() => {
  pollOrders();
  pollTimer = setInterval(pollOrders, 30_000);
});
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  if (popupTimer) clearTimeout(popupTimer);
});

// ── Mobile drawer ─────────────────────────────────────────────────────────────
const drawerOpen = ref(false);

const navItems = [
  { label: "Pesanan", to: "/unit/orders", icon: "lucide:clipboard-list" },
  { label: "Feedback", to: "/unit/feedback", icon: "lucide:message-square" },
  { label: "Laporan", to: "/unit/reports", icon: "lucide:file-text" },
  { label: "Pengaturan", to: "/unit/settings", icon: "lucide:settings" },
];
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
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 rounded-lg text-sm font-medium px-2.5 py-2.5 transition-colors text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          active-class="bg-primary-50 text-primary-700"
          @click="drawerOpen = false"
        >
          <Icon :icon="item.icon" class="text-[18px] shrink-0" />
          <span class="truncate">{{ item.label }}</span>
          <span
            v-if="item.to === '/unit/orders' && pendingCount > 0"
            class="ml-auto min-w-[20px] h-5 bg-emergency-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
          >
            {{ pendingCount > 99 ? '99+' : pendingCount }}
          </span>
        </NuxtLink>
      </nav>

      <!-- Bottom section: unit info + status indicator + user row -->
      <div class="shrink-0 border-t border-neutral-100 p-3 space-y-3">
        <!-- Unit info card -->
        <div class="bg-neutral-50 rounded-xl p-3 space-y-1.5">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emergency-100 flex items-center justify-center shrink-0">
              <Icon icon="lucide:shield" class="text-emergency-600 text-sm" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-neutral-900 leading-none truncate">
                {{ profile?.unit_name ?? '...' }}
              </p>
              <p class="text-[11px] text-neutral-400 mt-0.5 leading-none truncate">
                {{ profile?.emergency_type ?? '' }}
              </p>
            </div>
          </div>
          <div v-if="profile?.address?.regency" class="flex items-center gap-1 text-[11px] text-neutral-400">
            <Icon icon="lucide:map-pin" class="text-[10px] shrink-0" />
            <span class="truncate">{{ profile.address.regency }}</span>
          </div>
          <div v-if="fleet" class="flex items-center gap-1 text-[11px]" :class="fleetColor">
            <Icon icon="lucide:truck" class="text-[10px] shrink-0" />
            <span>{{ fleet.available }}/{{ fleet.total }} unit tersedia</span>
          </div>
        </div>

        <!-- Status indicator → taps to settings -->
        <NuxtLink
          to="/unit/settings"
          :class="[
            'w-full flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-colors',
            isActive
              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              : 'bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200',
          ]"
          @click="drawerOpen = false"
        >
          <div class="flex items-center gap-2">
            <span :class="['w-2 h-2 rounded-full shrink-0', isActive ? 'bg-green-500' : 'bg-neutral-400']" />
            {{ isActive ? 'Layanan Aktif' : 'Layanan Nonaktif' }}
          </div>
          <Icon icon="lucide:settings" class="text-sm opacity-50" />
        </NuxtLink>

        <!-- User row -->
        <div class="flex items-center gap-2 px-1">
          <div class="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <Icon icon="lucide:user" class="text-primary-600 text-xs" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-neutral-700 truncate">{{ unitUsername ?? profile?.username ?? '—' }}</p>
            <p class="text-[11px] text-neutral-400 leading-none">Operator unit</p>
          </div>
          <button
            class="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-emergency-600 hover:bg-emergency-50 transition-colors"
            title="Keluar"
            @click="logout"
          >
            <Icon icon="lucide:log-out" class="text-sm" />
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Main content ───────────────────────────────────────────────────────── -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">

      <!-- Top header -->
      <header class="h-[60px] shrink-0 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-neutral-200">
        <button
          class="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
          @click="drawerOpen = true"
        >
          <Icon icon="lucide:menu" class="text-lg" />
        </button>
        <p class="text-sm font-semibold text-neutral-900 truncate flex-1">
          {{ profile?.unit_name ?? 'Dashboard Unit' }}
        </p>
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
      <main class="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <slot />
      </main>

      <!-- ── Mobile bottom navigation ─────────────────────────────────────────── -->
      <nav class="lg:hidden shrink-0 fixed bottom-0 inset-x-0 z-30 bg-white border-t border-neutral-200 flex">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-neutral-400 transition-colors"
          active-class="text-primary-600"
        >
          <div class="relative">
            <Icon :icon="item.icon" class="text-xl" />
            <span
              v-if="item.to === '/unit/orders' && pendingCount > 0"
              class="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-emergency-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
            >
              {{ pendingCount > 99 ? '99+' : pendingCount }}
            </span>
          </div>
          <span class="text-[10px] font-medium">{{ item.label }}</span>
        </NuxtLink>
        <!-- Menu shortcut -->
        <button
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-neutral-400"
          @click="drawerOpen = true"
        >
          <Icon icon="lucide:menu" class="text-xl" />
          <span class="text-[10px] font-medium">Menu</span>
        </button>
      </nav>
    </div>

    <!-- ── New-order popup ────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="popup-slide">
        <div
          v-if="popupOrders.length > 0"
          class="fixed bottom-[76px] lg:bottom-6 right-4 z-[9999] w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
        >
          <div class="bg-emergency-600 px-4 py-3 flex items-center gap-2.5">
            <Icon icon="lucide:bell-ring" class="text-white text-lg shrink-0 animate-bounce" />
            <p class="text-sm font-bold text-white flex-1">
              {{ popupOrders.length === 1 ? 'Pesanan Baru Masuk!' : `${popupOrders.length} Pesanan Baru Masuk!` }}
            </p>
            <button
              class="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              @click="dismissPopup"
            >
              <Icon icon="lucide:x" class="text-base" />
            </button>
          </div>
          <div class="divide-y divide-neutral-100 max-h-40 overflow-y-auto">
            <div v-for="order in popupOrders" :key="order.id" class="px-4 py-3 flex items-start gap-3">
              <Icon icon="lucide:file-text" class="text-neutral-400 text-sm shrink-0 mt-0.5" />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-neutral-900 truncate">{{ order.requester_name }}</p>
                <p class="text-xs text-neutral-400 font-mono">{{ order.ticket_number }}</p>
              </div>
            </div>
          </div>
          <div class="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
            <NuxtLink
              to="/unit/orders"
              class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emergency-600 hover:bg-emergency-700 text-white text-sm font-semibold rounded-xl transition-colors"
              @click="dismissPopup"
            >
              Lihat Pesanan
              <Icon icon="lucide:arrow-right" class="text-sm" />
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.popup-slide-enter-active, .popup-slide-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.popup-slide-enter-from, .popup-slide-leave-to { opacity: 0; transform: translateY(16px) scale(0.96); }
</style>
