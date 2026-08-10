<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";

definePageMeta({ layout: "unit", title: "Pesanan Masuk" });

const { unitHeaders, logout, token } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

const activeTab = ref<"pending" | "in_progress" | "completed">("pending");

const { data, pending, error, refresh } = await useAsyncData(
  "unit-orders",
  () => $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/orders`, { headers: unitHeaders() }),
  { server: false, lazy: false }
);

// Mark pending orders as seen so the layout doesn't popup for orders the user sees here
const SEEN_KEY = 'bb-unit-seen-order-ids';
watch(data, (d) => {
  if (!d?.data || !import.meta.client) return;
  try {
    const ids = d.data.filter((o: any) => o.status === 'pending').map((o: any) => o.id);
    if (!ids.length) return;
    const existing = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    ids.forEach((id: string) => existing.add(id));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...existing].slice(-1000)));
  } catch {}
});

// Redirect to login when token is invalid / expired
watch(error, (err: any) => {
  if (err?.status === 401 || err?.statusCode === 401) logout();
});

const fetchError = computed(() => error.value && (error.value as any)?.status !== 401);

const orders = computed(() => data.value?.data ?? []);

const filtered = computed(() => {
  if (activeTab.value === "in_progress") {
    return orders.value.filter((o: any) => o.status === "accepted" || o.status === "in_progress");
  }
  if (activeTab.value === "completed") {
    return orders.value.filter((o: any) => o.status === "completed" || o.status === "cancelled");
  }
  return orders.value.filter((o: any) => o.status === "pending");
});

type UnitSortCol = 'ticket_number' | 'requester_name' | 'created_at' | 'status';
const sortCol = ref<UnitSortCol>('created_at');
const sortDir = ref<'asc' | 'desc'>('desc');

function sortBy(col: UnitSortCol) {
  if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else { sortCol.value = col; sortDir.value = col === 'created_at' ? 'desc' : 'asc'; }
}

const sortedFiltered = computed(() =>
  [...filtered.value].sort((a: any, b: any) => {
    const va = String(a[sortCol.value] ?? '');
    const vb = String(b[sortCol.value] ?? '');
    const cmp = va.localeCompare(vb);
    return sortDir.value === 'asc' ? cmp : -cmp;
  })
);

const counts = computed(() => ({
  pending: orders.value.filter((o: any) => o.status === "pending").length,
  in_progress: orders.value.filter((o: any) => o.status === "accepted" || o.status === "in_progress").length,
  completed: orders.value.filter((o: any) => o.status === "completed" || o.status === "cancelled").length,
}));

// ── Notification + auto-refresh ───────────────────────────────────────────────
useOrderNotification(computed(() => counts.value.pending), refresh);
useOrderSSE(() => token.value, baseUrl, refresh);

// ── Update order ──────────────────────────────────────────────────────────────
const updating = ref<string | null>(null);

async function updateStatus(id: string, status: string, handlerName = "", notes = "") {
  updating.value = id;
  const statusLabel: Record<string, string> = {
    accepted: "Pesanan diterima",
    in_progress: "Pesanan sedang diproses",
    completed: "Pesanan selesai",
    cancelled: "Pesanan ditolak",
  };
  try {
    await $fetch(`${baseUrl}/api/v1/unit/orders/${id}`, {
      method: "PUT",
      headers: unitHeaders(),
      body: { status, handler_name: handlerName, handling_notes: notes },
    });
    await refresh();
    toast.success(statusLabel[status] ?? "Status diperbarui");
  } catch {
    toast.error("Gagal memperbarui status pesanan");
  } finally {
    updating.value = null;
  }
}

// ── Completion modal ──────────────────────────────────────────────────────────
const showComplete = ref(false);
const completeTarget = ref<any>(null);
const handlerName = ref("");
const handlingNotes = ref("");
const completing = ref(false);

function openComplete(order: any) {
  completeTarget.value = order;
  handlerName.value = "";
  handlingNotes.value = "";
  showComplete.value = true;
}

async function submitComplete() {
  if (!completeTarget.value) return;
  completing.value = true;
  try {
    await updateStatus(completeTarget.value.id, "completed", handlerName.value, handlingNotes.value);
    showComplete.value = false;
    sendCompletionWA(completeTarget.value, handlerName.value, handlingNotes.value);
  } finally {
    completing.value = false;
  }
}

// ── WA send ────────────────────────────────────────────────────────────────────
function convertPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("62")) return d;
  return d;
}

function sendCompletionWA(order: any, handler: string, notes: string) {
  const webUrl = `${window.location.origin}/ticket/${order.ticket_number}`;
  const lines = [
    `Halo ${order.requester_name},`,
    ``,
    `Laporan Anda dari *${order.unit_name}* telah selesai ditangani.`,
    ``,
    `📋 No. Tiket: *${order.ticket_number}*`,
    handler ? `👤 Petugas: ${handler}` : "",
    notes ? `📝 Catatan: ${notes}` : "",
    ``,
    `Lihat detail e-tiket: ${webUrl}`,
    ``,
    `Terima kasih telah menggunakan ButuhBantuan. Semoga lekas pulih! 🙏`,
  ].filter((l) => l !== null);

  const number = convertPhone(order.requester_phone);
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return baseUrl + url;
}

function hasReport(ticketNum: string): boolean {
  if (!import.meta.client) return false;
  return !!localStorage.getItem(`bb-report-${ticketNum}`);
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    pending: "Menunggu", accepted: "Diterima", in_progress: "Diproses",
    completed: "Selesai", cancelled: "Dibatal",
  };
  return m[s] ?? s;
}

function statusClass(s: string) {
  const m: Record<string, string> = {
    pending:     "bg-yellow-100 text-yellow-800",
    accepted:    "bg-blue-100 text-blue-800",
    in_progress: "bg-orange-100 text-orange-800",
    completed:   "bg-green-100 text-green-800",
    cancelled:   "bg-neutral-100 text-neutral-600",
  };
  return m[s] ?? "bg-neutral-100 text-neutral-600";
}

// ── Photo lightbox ────────────────────────────────────────────────────────────
const lightboxPhoto = ref<string | null>(null);

// ── Detail modal ─────────────────────────────────────────────────────────────
const showDetail = ref(false);
const detailOrder = ref<any>(null);

function openDetail(order: any) {
  detailOrder.value = order;
  showDetail.value = true;
}

// ── Row dropdown ──────────────────────────────────────────────────────────────
const dropdownOrder = ref<any>(null);
const dropdownPos = ref({ top: 0, right: 0 });

function toggleDropdown(order: any, event: MouseEvent) {
  if (dropdownOrder.value?.id === order.id) {
    dropdownOrder.value = null;
    return;
  }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right };
  dropdownOrder.value = order;
}

// ── WA follow-up (for active orders) ─────────────────────────────────────────
function sendFollowUpWA(order: any) {
  const webUrl = `${window.location.origin}/ticket/${order.ticket_number}`;
  const statusLine: Record<string, string> = {
    pending:     "Kami telah menerima laporan Anda dan sedang memproses permintaan bantuan.",
    accepted:    "Laporan Anda telah diterima oleh tim kami. Petugas akan segera dikirimkan ke lokasi Anda.",
    in_progress: "Petugas kami sedang dalam perjalanan menuju lokasi Anda. Harap tetap di posisi yang aman.",
  };
  const lines = [
    `Halo *${order.requester_name}*,`,
    ``,
    statusLine[order.status] ?? "Laporan Anda sedang kami tangani.",
    ``,
    `📋 *No. Tiket:* ${order.ticket_number}`,
    order.location ? `📍 *Lokasi:* ${order.location}` : null,
    order.condition ? `🚨 *Kondisi:* ${order.condition}` : null,
    ``,
    `Pantau status laporan Anda secara langsung di:`,
    webUrl,
    ``,
    `Terima kasih telah menghubungi *${order.unit_name}*. 🙏`,
  ].filter((l): l is string => l !== null);

  window.open(`https://wa.me/${convertPhone(order.requester_phone)}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-neutral-900">Pesanan Masuk</h1>
          <p class="text-sm text-neutral-500 mt-0.5">{{ orders.length }} total pesanan</p>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="secondary" @click="refresh()">
            <Icon icon="lucide:refresh-cw" class="text-sm" />
            Refresh
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Fetch error banner (non-auth errors) -->
    <div v-if="fetchError" class="mx-4 mt-4 sm:mx-6 flex items-center gap-2 rounded-xl bg-emergency-50 border border-emergency-200 px-4 py-3 text-sm text-emergency-700">
      <Icon icon="lucide:alert-circle" class="text-base shrink-0" />
      <span class="flex-1">Gagal memuat pesanan. Pastikan koneksi ke server aktif.</span>
      <button class="text-emergency-600 underline text-sm" @click="refresh()">Coba lagi</button>
    </div>

    <!-- Tabs -->
    <div class="bg-white border-b border-neutral-100 px-4 sm:px-6">
      <div class="flex gap-1">
        <button
          v-for="t in (['pending', 'in_progress', 'completed'] as const)"
          :key="t"
          :class="[
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-700',
          ]"
          @click="activeTab = t"
        >
          {{ t === 'pending' ? 'Masuk' : t === 'in_progress' ? 'Diproses' : 'Selesai' }}
          <span
            v-if="counts[t] > 0"
            :class="['ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold', activeTab === t ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-600']"
          >{{ counts[t] }}</span>
        </button>
      </div>
    </div>

    <!-- Dropdown overlay (click outside to close) -->
    <div v-if="dropdownOrder" class="fixed inset-0 z-[98]" @click="dropdownOrder = null" />

    <!-- ── Mobile card list (below md) ─────────────────────────────────────── -->
    <div class="md:hidden mx-4 my-4 space-y-3">
      <!-- Skeleton -->
      <template v-if="pending">
        <div v-for="i in 3" :key="`mskel-${i}`" class="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse space-y-3">
          <div class="flex justify-between">
            <div class="h-4 bg-neutral-200 rounded w-36" />
            <div class="h-5 bg-neutral-100 rounded w-20" />
          </div>
          <div class="h-4 bg-neutral-100 rounded w-28" />
          <div class="h-9 bg-neutral-100 rounded-lg w-full" />
        </div>
      </template>

      <!-- Empty -->
      <div v-else-if="!filtered.length" class="bg-white rounded-xl border border-neutral-200">
        <UiEmptyState title="Tidak ada pesanan" description="Belum ada pesanan di kategori ini.">
          <template #icon>
            <Icon icon="lucide:inbox" class="text-neutral-400 text-2xl" />
          </template>
        </UiEmptyState>
      </div>

      <!-- Cards -->
      <div
        v-else
        v-for="order in sortedFiltered"
        :key="order.id"
        class="bg-white rounded-xl border border-neutral-200 p-4 space-y-3"
      >
        <!-- Top row: ticket + status -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-mono text-sm font-semibold text-primary-700 truncate">{{ order.ticket_number }}</span>
            <span
              v-if="order.source === 'sos'"
              class="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emergency-600 text-white uppercase tracking-wide animate-pulse shrink-0"
            >
              <Icon icon="lucide:siren" class="text-[10px]" />
              SOS
            </span>
          </div>
          <span :class="['inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded shrink-0', statusClass(order.status)]">
            {{ statusLabel(order.status) }}
          </span>
        </div>

        <!-- Requester -->
        <div class="flex items-center gap-2">
          <Icon icon="lucide:user" class="text-neutral-400 text-sm shrink-0" />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-neutral-900 truncate">{{ order.requester_name }}</p>
            <p class="text-xs text-neutral-500">{{ order.requester_phone }}</p>
          </div>
        </div>

        <!-- Location -->
        <div v-if="order.location" class="flex items-start gap-2">
          <Icon icon="lucide:map-pin" class="text-neutral-400 text-sm shrink-0 mt-0.5" />
          <p class="text-sm text-neutral-600 line-clamp-2">{{ order.location }}</p>
        </div>

        <!-- Condition -->
        <p v-if="order.condition" class="text-sm text-neutral-500 line-clamp-2 pl-5">{{ order.condition }}</p>

        <!-- Date -->
        <p class="text-xs text-neutral-400">{{ formatDate(order.created_at) }}</p>

        <!-- Action button -->
        <button
          type="button"
          class="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
          @click.stop="toggleDropdown(order, $event)"
        >
          Aksi
          <Icon icon="lucide:chevron-down" class="text-xs text-neutral-500" />
        </button>
      </div>
    </div>

    <!-- ── Desktop table (md+) ────────────────────────────────────────────── -->
    <div class="hidden md:block mx-6 my-4 bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-neutral-200 bg-neutral-50">
              <th class="px-6 py-3.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none transition-colors group" @click="sortBy('created_at')">
                <div class="flex items-center gap-1">Tiket <Icon :icon="sortCol==='created_at'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='created_at'?'text-primary-500':'text-neutral-300 group-hover:text-neutral-400']" /></div>
              </th>
              <th class="px-6 py-3.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none transition-colors group" @click="sortBy('requester_name')">
                <div class="flex items-center gap-1">Pelapor <Icon :icon="sortCol==='requester_name'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='requester_name'?'text-primary-500':'text-neutral-300 group-hover:text-neutral-400']" /></div>
              </th>
              <th class="px-6 py-3.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Info</th>
              <th class="px-6 py-3.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none transition-colors group" @click="sortBy('status')">
                <div class="flex items-center gap-1">Status <Icon :icon="sortCol==='status'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='status'?'text-primary-500':'text-neutral-300 group-hover:text-neutral-400']" /></div>
              </th>
              <th class="px-6 py-3.5 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">

            <!-- Skeleton -->
            <tr v-if="pending" v-for="i in 4" :key="`skel-${i}`" class="animate-pulse">
              <td class="px-6 py-5">
                <div class="h-4 bg-neutral-200 rounded w-32 mb-2" />
                <div class="h-3 bg-neutral-100 rounded w-20" />
              </td>
              <td class="px-6 py-5">
                <div class="h-4 bg-neutral-200 rounded w-36 mb-2" />
                <div class="h-3 bg-neutral-100 rounded w-28" />
              </td>
              <td class="px-6 py-5">
                <div class="h-4 bg-neutral-100 rounded w-48 mb-2" />
                <div class="h-3 bg-neutral-100 rounded w-32" />
              </td>
              <td class="px-6 py-5">
                <div class="h-6 bg-neutral-100 rounded w-20" />
              </td>
              <td class="px-6 py-5">
                <div class="h-9 bg-neutral-100 rounded-lg w-24 ml-auto" />
              </td>
            </tr>

            <!-- Empty -->
            <tr v-else-if="!filtered.length">
              <td colspan="5">
                <UiEmptyState title="Tidak ada pesanan" description="Belum ada pesanan di kategori ini.">
                  <template #icon>
                    <Icon icon="lucide:inbox" class="text-neutral-400 text-2xl" />
                  </template>
                </UiEmptyState>
              </td>
            </tr>

            <!-- Rows -->
            <tr
              v-else
              v-for="order in sortedFiltered"
              :key="order.id"
              class="hover:bg-neutral-50 transition-colors"
            >
              <!-- Tiket -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-mono text-sm font-semibold text-primary-700">{{ order.ticket_number }}</span>
                  <span
                    v-if="order.source === 'sos'"
                    class="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emergency-600 text-white uppercase tracking-wide animate-pulse"
                  >
                    <Icon icon="lucide:siren" class="text-[10px]" />
                    SOS
                  </span>
                </div>
                <p class="text-xs text-neutral-400">{{ formatDate(order.created_at) }}</p>
              </td>

              <!-- Pelapor -->
              <td class="px-6 py-4">
                <p class="font-semibold text-neutral-900 text-sm">{{ order.requester_name }}</p>
                <p class="text-sm text-neutral-500 mt-0.5">{{ order.requester_phone }}</p>
              </td>

              <!-- Info -->
              <td class="px-6 py-4 max-w-xs">
                <p v-if="order.location" class="text-sm text-neutral-700 line-clamp-1 flex items-start gap-1.5">
                  <Icon icon="lucide:map-pin" class="text-neutral-400 shrink-0 mt-0.5" />
                  <span>{{ order.location }}</span>
                </p>
                <p v-if="order.condition" class="text-sm text-neutral-500 line-clamp-1 mt-1">{{ order.condition }}</p>
                <p v-if="!order.location && !order.condition" class="text-sm text-neutral-300">—</p>
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <span :class="['inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded', statusClass(order.status)]">
                  {{ statusLabel(order.status) }}
                </span>
              </td>

              <!-- Aksi — dropdown trigger -->
              <td class="px-6 py-4">
                <div class="flex justify-end">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 focus:ring-4 focus:ring-neutral-100 focus:outline-none transition-colors"
                    @click.stop="toggleDropdown(order, $event)"
                  >
                    Aksi
                    <Icon icon="lucide:chevron-down" class="text-xs text-neutral-500" />
                  </button>
                </div>
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>

    <!-- Aksi dropdown (teleported to avoid overflow clipping) -->
    <Teleport to="body">
      <div
        v-if="dropdownOrder"
        class="fixed z-[99] w-52 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden"
        :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }"
        @click.stop
      >
        <!-- Status actions -->
        <div v-if="['pending','accepted','in_progress'].includes(dropdownOrder.status)" class="py-1">
          <p class="px-4 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tindakan</p>
          <template v-if="dropdownOrder.status === 'pending'">
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              :disabled="updating === dropdownOrder.id"
              @click="updateStatus(dropdownOrder.id, 'accepted'); dropdownOrder = null"
            >
              <Icon icon="lucide:check" class="text-green-600 text-base shrink-0" />
              Terima Pesanan
            </button>
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              :disabled="updating === dropdownOrder.id"
              @click="updateStatus(dropdownOrder.id, 'cancelled'); dropdownOrder = null"
            >
              <Icon icon="lucide:x" class="text-base shrink-0" />
              Tolak Pesanan
            </button>
          </template>
          <template v-else-if="dropdownOrder.status === 'accepted'">
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              :disabled="updating === dropdownOrder.id"
              @click="updateStatus(dropdownOrder.id, 'in_progress'); dropdownOrder = null"
            >
              <Icon icon="lucide:play" class="text-primary-600 text-base shrink-0" />
              Mulai Proses
            </button>
          </template>
          <template v-else-if="dropdownOrder.status === 'in_progress'">
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              @click="openComplete(dropdownOrder); dropdownOrder = null"
            >
              <Icon icon="lucide:check-circle" class="text-green-600 text-base shrink-0" />
              Tandai Selesai
            </button>
          </template>
        </div>

        <!-- Info actions -->
        <div class="border-t border-neutral-100 py-1">
          <p class="px-4 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Detail</p>
          <button
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="openDetail(dropdownOrder); dropdownOrder = null"
          >
            <Icon icon="lucide:info" class="text-neutral-500 text-base shrink-0" />
            Lihat Detail
          </button>
          <a
            v-if="dropdownOrder.requester_lat && dropdownOrder.requester_lng"
            :href="`https://www.google.com/maps?q=${dropdownOrder.requester_lat},${dropdownOrder.requester_lng}`"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="dropdownOrder = null"
          >
            <Icon icon="lucide:locate" class="text-neutral-500 text-base shrink-0" />
            Lihat Lokasi
          </a>
          <button
            v-if="dropdownOrder.photo_url"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="lightboxPhoto = assetUrl(dropdownOrder.photo_url); dropdownOrder = null"
          >
            <Icon icon="lucide:image" class="text-neutral-500 text-base shrink-0" />
            Lihat Foto
          </button>
        </div>

        <!-- Communication & report -->
        <div class="border-t border-neutral-100 py-1">
          <p class="px-4 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Lainnya</p>
          <button
            v-if="['pending','accepted','in_progress'].includes(dropdownOrder.status)"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="sendFollowUpWA(dropdownOrder); dropdownOrder = null"
          >
            <Icon icon="mdi:whatsapp" class="text-green-600 text-base shrink-0" />
            Follow Up WA
          </button>
          <button
            v-if="dropdownOrder.status === 'completed'"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="sendCompletionWA(dropdownOrder, dropdownOrder.handler_name, dropdownOrder.handling_notes); dropdownOrder = null"
          >
            <Icon icon="mdi:whatsapp" class="text-green-600 text-base shrink-0" />
            Kirim WA Selesai
          </button>
          <NuxtLink
            :to="`/unit/reports?ticket=${dropdownOrder.ticket_number}`"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="dropdownOrder = null"
          >
            <Icon icon="lucide:file-text" class="text-neutral-500 text-base shrink-0" />
            {{ hasReport(dropdownOrder.ticket_number) ? 'Lihat Laporan' : 'Buat Laporan' }}
          </NuxtLink>
        </div>
      </div>
    </Teleport>

    <!-- Photo lightbox -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="lightboxPhoto"
          class="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
          @click="lightboxPhoto = null"
        >
          <img
            :src="lightboxPhoto"
            class="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
            @click.stop
          />
          <button
            class="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            @click="lightboxPhoto = null"
          >
            <Icon icon="ion:close" class="text-white text-xl" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- Detail modal -->
    <UiModal v-model:open="showDetail" :title="detailOrder?.ticket_number ?? 'Detail Pesanan'">
      <template #trigger><span /></template>
      <div v-if="detailOrder" class="space-y-5 text-sm">
        <div class="flex items-center justify-between">
          <span :class="['inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded', statusClass(detailOrder.status)]">
            {{ statusLabel(detailOrder.status) }}
          </span>
          <span class="text-xs text-neutral-400">{{ formatDate(detailOrder.created_at) }}</span>
        </div>
        <div>
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Pelapor</p>
          <p class="font-semibold text-neutral-900">{{ detailOrder.requester_name }}</p>
          <p class="text-neutral-500 mt-0.5">{{ detailOrder.requester_phone }}</p>
        </div>
        <div v-if="detailOrder.location">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Lokasi</p>
          <p class="text-neutral-700">{{ detailOrder.location }}</p>
          <a
            v-if="detailOrder.requester_lat && detailOrder.requester_lng"
            :href="`https://www.google.com/maps?q=${detailOrder.requester_lat},${detailOrder.requester_lng}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mt-1 transition-colors"
          >
            <Icon icon="lucide:locate" class="text-xs" />
            Buka di Google Maps
          </a>
        </div>
        <div v-if="detailOrder.condition">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Kondisi</p>
          <p class="text-neutral-700">{{ detailOrder.condition }}</p>
        </div>
        <div v-if="detailOrder.handler_name">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Penanganan</p>
          <p class="text-neutral-900"><span class="font-medium">Petugas:</span> {{ detailOrder.handler_name }}</p>
          <p v-if="detailOrder.handling_notes" class="text-neutral-600 mt-1">{{ detailOrder.handling_notes }}</p>
        </div>
        <div v-if="detailOrder.photo_url">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Foto</p>
          <img
            :src="assetUrl(detailOrder.photo_url)"
            alt="Foto laporan"
            class="rounded-lg max-h-56 w-full object-cover cursor-pointer"
            @click="lightboxPhoto = assetUrl(detailOrder.photo_url)"
          />
        </div>
      </div>
    </UiModal>

    <!-- Complete modal -->
    <UiModal v-model:open="showComplete" title="Tandai Selesai" description="Isi informasi penanganan sebelum menyelesaikan pesanan.">
      <template #trigger><span /></template>
      <div class="space-y-4">
        <UiFormField label="Nama Petugas">
          <UiInput v-model="handlerName" placeholder="Nama petugas yang menangani..." />
        </UiFormField>
        <UiFormField label="Catatan Penanganan">
          <UiTextarea v-model="handlingNotes" :rows="3" placeholder="Ringkasan tindakan yang dilakukan..." />
        </UiFormField>
      </div>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showComplete = false">Batal</UiButton>
        <UiButton size="sm" :loading="completing" @click="submitComplete">
          <Icon icon="lucide:check-circle" class="text-sm" />
          Selesaikan & Kirim WA
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
