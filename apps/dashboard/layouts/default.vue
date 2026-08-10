<script setup lang="ts">
import { Icon } from "@iconify/vue";

const { collapsed, toggle } = useSidebar();
const mobileOpen = ref(false);
const route = useRoute();

function closeMobile() { mobileOpen.value = false; }

provide("toggleMobile", () => { mobileOpen.value = !mobileOpen.value; });

// ── New-order popup (only fires for orders not previously seen) ────────────────
const { baseUrl } = useApi();
const { token } = useAuth();
const SEEN_KEY = 'bb-admin-seen-order-ids';
const popupOrders = ref<any[]>([]);
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
  if (!token.value) return;
  try {
    const res = await $fetch<{ data: any[] }>(`${baseUrl}/api/v1/admin/orders`, {
      headers: { "X-Admin-Key": token.value },
    });
    const pending = (res.data ?? []).filter((o: any) => o.status === 'pending');

    const seenIds = getSeenIds();
    if (!pollInitialized) {
      addSeenIds(pending.map((o: any) => o.id));
      pollInitialized = true;
      return;
    }

    const newOrders = pending.filter((o: any) => !seenIds.has(o.id));
    if (newOrders.length > 0) {
      addSeenIds(newOrders.map((o: any) => o.id));
      if (route.path !== '/orders') {
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
</script>

<template>
  <div class="flex h-screen bg-neutral-50 overflow-hidden font-sans">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-40 bg-neutral-950/40 lg:hidden"
        @click="closeMobile"
      />
    </Transition>

    <!-- Sidebar — always visible on lg+, drawer on mobile -->
    <div
      :class="[
        'fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:flex transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <AppSidebar :mobile-open="mobileOpen" @close="closeMobile" />
    </div>

    <!-- Main content -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <AppHeader @toggle-mobile="mobileOpen = !mobileOpen" />
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>

    <!-- ── New-order popup ────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="popup-slide">
        <div
          v-if="popupOrders.length > 0"
          class="fixed bottom-6 right-4 z-[9999] w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
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
              to="/orders"
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
