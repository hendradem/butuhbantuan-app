<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";
import { estimateEtaMinutes, formatEta } from "~/utils/eta";
import { placeAnchoredMenu } from "~/utils/placeAnchoredMenu";
import UnitOpsStats from "~/components/unit/UnitOpsStats.vue";

definePageMeta({ layout: "unit", title: "Pesanan Masuk", keepalive: true });

const { unitHeaders, logout, emergencyUUID } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const webAppUrl = (config.public.webAppUrl as string) || "http://localhost:3000";
const showCreateTicket = ref(false);

const TAB_VALUES = ["pending", "in_progress", "completed"] as const;
const { tab: activeTab, setTab } = usePersistedTab("bb-unit-orders-tab", "pending", TAB_VALUES);

const { data, pending, error, refresh: refreshOrders } = await useAsyncData(
  "unit-orders",
  () => $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/orders`, { headers: unitHeaders() }),
  { server: false, lazy: false }
);

const refresh = useSoftRefresh(refreshOrders);
const showOrdersSkeleton = computed(() => isInitialPending(pending.value, data.value));

onActivated(() => {
  refreshOrders();
});

// Reuse layout-loaded profile for unit coordinates (ETA)
const { data: profile } = useNuxtData<any>("unit-profile");
const unitCoords = computed(() => {
  const coords = profile.value?.coordinates;
  if (!coords) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
});

function orderEta(order: any): number | null {
  if (!unitCoords.value) return null;
  return estimateEtaMinutes(
    unitCoords.value.lat,
    unitCoords.value.lng,
    Number(order.requester_lat) || 0,
    Number(order.requester_lng) || 0
  );
}

// Do NOT mark pending as "seen" just by viewing the list — that suppresses the
// mobile respond sheet. Seen/queue ownership lives in layouts/unit.vue.
// Redirect to login when token is invalid / expired
watch(error, (err: any) => {
  if (err?.status === 401 || err?.statusCode === 401) logout();
});

const fetchError = computed(() => error.value && (error.value as any)?.status !== 401);

const orders = computed(() => data.value?.data ?? []);

const search = usePersistedQueryParam("bb-unit-orders-q", "q", "", { syncQuery: false });

const {
  period: datePeriod,
  setPeriod: setDatePeriod,
  customFrom,
  customTo,
  presets: datePresets,
  isCustom: isCustomDate,
  filterByPeriod,
} = useOrderPeriodFilter("bb-unit-orders-v2", "range", "1");

const inPeriod = computed(() => filterByPeriod(orders.value));

const filtered = computed(() => {
  let base = inPeriod.value;
  if (activeTab.value === "in_progress") {
    base = base.filter((o: any) => o.status === "accepted" || o.status === "in_progress");
  } else if (activeTab.value === "completed") {
    base = base.filter((o: any) => o.status === "completed" || o.status === "cancelled");
  } else {
    base = base.filter((o: any) => o.status === "pending");
  }
  const q = search.value.trim().toLowerCase();
  if (!q) return base;
  return base.filter(
    (o: any) =>
      o.ticket_number?.toLowerCase().includes(q) ||
      o.requester_name?.toLowerCase().includes(q) ||
      o.requester_phone?.toLowerCase().includes(q) ||
      o.location?.toLowerCase().includes(q) ||
      o.condition?.toLowerCase().includes(q),
  );
});

type UnitSortCol = 'ticket_number' | 'requester_name' | 'created_at' | 'status';
const sortCol = ref<UnitSortCol>('created_at');
const sortDir = ref<'asc' | 'desc'>('desc');

function sortBy(col: UnitSortCol) {
  if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else { sortCol.value = col; sortDir.value = col === 'created_at' ? 'desc' : 'asc'; }
  page.value = 1;
}

const sortedFiltered = computed(() =>
  [...filtered.value].sort((a: any, b: any) => {
    const va = String(a[sortCol.value] ?? '');
    const vb = String(b[sortCol.value] ?? '');
    const cmp = va.localeCompare(vb);
    return sortDir.value === 'asc' ? cmp : -cmp;
  })
);

const page = ref(1);
const pageSize = ref(20);
watch([activeTab, search, datePeriod, customFrom, customTo], () => { page.value = 1; });
const totalPages = computed(() => Math.max(1, Math.ceil(sortedFiltered.value.length / pageSize.value)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return sortedFiltered.value.slice(start, start + pageSize.value);
});

const counts = computed(() => ({
  pending: inPeriod.value.filter((o: any) => o.status === "pending").length,
  in_progress: inPeriod.value.filter((o: any) => o.status === "accepted" || o.status === "in_progress").length,
  completed: inPeriod.value.filter((o: any) => o.status === "completed" || o.status === "cancelled").length,
}));

// ── Notification + auto-refresh ───────────────────────────────────────────────
// Alert pakai antrian live (semua pending), bukan filter periode
useOrderNotification(
  computed(() => orders.value.filter((o: any) => o.status === "pending").length),
  refresh,
  30_000,
  { sound: "none" },
);

// ── Update order ──────────────────────────────────────────────────────────────
const updating = ref<string | null>(null);
const { accept, reject, acting } = useOrderDispatch("unit");
const showReassign = ref(false);
const reassignOrder = ref<any>(null);
const showReject = ref(false);
const rejectTarget = ref<any>(null);

function openReassign(order: any) {
  reassignOrder.value = order;
  showReassign.value = true;
  dropdownOrder.value = null;
}

function openReassignFromDetail() {
  if (!detailOrder.value) return;
  openReassign(detailOrder.value);
}

function openReject(order: any) {
  rejectTarget.value = order;
  showReject.value = true;
  dropdownOrder.value = null;
}

async function doAccept(order: any) {
  dropdownOrder.value = null;
  if (await accept(order.id)) refresh();
}

async function onRejectConfirm(payload: { reason: string; note: string }) {
  if (!rejectTarget.value?.id) return;
  if (await reject(rejectTarget.value.id, payload)) refresh();
}

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
  const webUrl = `${webAppUrl.replace(/\/$/, "")}/ticket/${order.ticket_number}`;
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
  if (!import.meta.client || !ticketNum) return false;
  try {
    return !!localStorage.getItem(`bb-report-${ticketNum}`);
  } catch {
    return false;
  }
}

function orderHasReport(order: any): boolean {
  if (order?.has_incident_report) return true;
  return hasReport(order?.ticket_number);
}

// ── Photo lightbox ────────────────────────────────────────────────────────────
const lightboxPhoto = ref<string | null>(null);

// ── Detail modal ─────────────────────────────────────────────────────────────
const showDetail = ref(false);
const detailOrder = ref<any>(null);
const { items: historyItems, loading: historyLoading, load: loadHistory, reset: resetHistory } = useOrderHistory("unit");

function openDetail(order: any) {
  detailOrder.value = order;
  showDetail.value = true;
  loadHistory(order);
}

watch(showDetail, (v) => { if (!v) resetHistory(); });

// ── Row dropdown ──────────────────────────────────────────────────────────────
const dropdownOrder = ref<any>(null);
const dropdownPos = ref({ top: 0, right: 0, openUp: false });

function toggleDropdown(order: any, event: MouseEvent) {
  if (dropdownOrder.value?.id === order.id) {
    dropdownOrder.value = null;
    return;
  }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  const pos = placeAnchoredMenu(rect, { menuHeight: 280, alignRight: true });
  dropdownPos.value = { top: pos.top, right: pos.right, openUp: pos.openUp };
  dropdownOrder.value = order;
}

// ── WA follow-up (for active orders) ─────────────────────────────────────────
function sendFollowUpWA(order: any) {
  const webUrl = `${webAppUrl.replace(/\/$/, "")}/ticket/${order.ticket_number}`;
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
    <div class="page-subheader">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h1 class="page-subheader-title">Pesanan Masuk</h1>
          <p class="page-subheader-desc">
            <span v-if="showOrdersSkeleton">Memuat...</span>
            <span v-else>{{ filtered.length }} dari {{ inPeriod.length }} di periode</span>
          </p>
        </div>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <UiButton variant="primary" class="flex-1 sm:flex-none justify-center" @click="showCreateTicket = true">
            <Icon icon="lucide:ticket-plus" class="text-sm" />
            <span class="sm:inline">Buat E-Tiket</span>
          </UiButton>
          <UiButton
            variant="secondary"
            class="flex-1 sm:flex-none justify-center"
            :disabled="pending && !!data"
            @click="refresh()"
          >
            <Icon icon="lucide:refresh-cw" class="text-sm" :class="{ 'animate-spin': pending }" />
            Refresh
          </UiButton>
        </div>
      </div>
    </div>

    <UnitOpsStats :orders="orders" :loading="pending && !data" />

    <CreateOrderModal
      v-model:open="showCreateTicket"
      mode="unit"
      :emergency-uuid="emergencyUUID || undefined"
      :unit-name="(profile as any)?.name"
      @created="refresh()"
    />

    <!-- Fetch error banner (non-auth errors) -->
    <div v-if="fetchError" class="mx-4 mt-4 sm:mx-6 flex items-center gap-2 rounded-xl bg-emergency-50 border border-emergency-200 px-4 py-3 text-sm text-emergency-700">
      <Icon icon="lucide:alert-circle" class="text-base shrink-0" />
      <span class="flex-1">Gagal memuat pesanan. Pastikan koneksi ke server aktif.</span>
      <button class="text-emergency-600 underline text-sm" @click="refresh()">Coba lagi</button>
    </div>

    <!-- Dropdown overlay (click outside to close) -->
    <div v-if="dropdownOrder" class="fixed inset-0 z-[98]" @click="dropdownOrder = null" />

    <div class="p-4 sm:p-6">
      <UiTableCard>
        <template #toolbar>
          <div class="flex flex-col gap-2.5 w-full min-w-0">
            <div class="flex gap-1 overflow-x-auto -mx-0.5 px-0.5 pb-0.5 scrollbar-none">
              <button
                v-for="t in (['pending', 'in_progress', 'completed'] as const)"
                :key="t"
                type="button"
                :class="[
                  'shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                  activeTab === t
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50',
                ]"
                @click="setTab(t)"
              >
                {{ t === 'pending' ? 'Masuk' : t === 'in_progress' ? 'Diproses' : 'Selesai' }}
                <span
                  v-if="counts[t] > 0"
                  :class="[
                    'ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-bold',
                    activeTab === t ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-600',
                  ]"
                >{{ counts[t] }}</span>
              </button>
            </div>
            <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full min-w-0">
              <UiSearchInput
                v-model="search"
                placeholder="Cari tiket, nama, telepon..."
                class="w-full sm:flex-1 sm:min-w-[160px] sm:max-w-xs"
              />
              <OrderPeriodFilter
                compact
                class="w-full sm:w-auto"
                :period="datePeriod"
                :presets="datePresets"
                :is-custom="isCustomDate"
                :custom-from="customFrom"
                :custom-to="customTo"
                @update:period="setDatePeriod"
                @update:custom-from="customFrom = $event"
                @update:custom-to="customTo = $event"
              />
            </div>
          </div>
        </template>

        <!-- Mobile cards -->
        <div class="md:hidden divide-y divide-neutral-100">
          <template v-if="showOrdersSkeleton">
            <div v-for="i in 3" :key="`mskel-${i}`" class="p-4 space-y-3">
              <div class="flex justify-between items-start gap-2">
                <div class="soft-skel h-4 w-32" />
                <div class="soft-skel h-5 rounded-full w-16" />
              </div>
              <div class="soft-skel h-3.5 w-28" />
              <div class="soft-skel h-3 w-full" />
              <div class="flex gap-2">
                <div class="soft-skel h-9 rounded-lg flex-1" />
                <div class="soft-skel h-9 rounded-lg w-9" />
              </div>
            </div>
          </template>

          <div v-else-if="!filtered.length" class="py-2">
            <UiEmptyState title="Tidak ada pesanan" description="Belum ada pesanan di kategori ini.">
              <template #icon>
                <Icon icon="lucide:inbox" class="text-neutral-400 text-2xl" />
              </template>
            </UiEmptyState>
          </div>

          <div
            v-else
            v-for="order in paginated"
            :key="order.id"
            class="p-4 space-y-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <NuxtLink
                  :to="`/unit/orders/${order.ticket_number}`"
                  class="font-mono text-sm font-semibold text-primary-700 truncate hover:underline"
                  @click.stop
                >
                  {{ order.ticket_number }}
                </NuxtLink>
                <span
                  v-if="order.source === 'sos'"
                  class="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emergency-600 text-white uppercase tracking-wide animate-pulse shrink-0"
                >
                  <Icon icon="lucide:siren" class="text-[10px]" />
                  SOS
                </span>
              </div>
              <UiStatusBadge :status="order.status" class="shrink-0" />
            </div>
            <div>
              <p class="text-sm font-semibold text-neutral-900 truncate">{{ order.requester_name }}</p>
              <p class="text-sm text-neutral-500">{{ order.requester_phone }}</p>
            </div>
            <p v-if="order.location" class="text-sm text-neutral-600 line-clamp-2">{{ order.location }}</p>
            <p class="text-xs text-neutral-400">{{ formatDate(order.created_at) }}</p>
            <div class="flex gap-2">
              <NuxtLink
                :to="`/unit/orders/${order.ticket_number}`"
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-neutral-700 bg-white rounded-lg shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-colors"
              >
                <Icon icon="lucide:external-link" class="text-sm text-neutral-500" />
                Detail
              </NuxtLink>
              <button
                type="button"
                class="inline-flex items-center justify-center w-10 h-10 text-neutral-600 bg-white rounded-lg shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-colors"
                @click.stop="toggleDropdown(order, $event)"
              >
                <Icon icon="lucide:more-vertical" class="text-sm" />
              </button>
            </div>
          </div>
        </div>

        <!-- Desktop table -->
        <UiTable wrapper-class="hidden md:block">
            <thead>
              <tr>
                <th class="ui-th-sortable" @click="sortBy('created_at')">
                  <span class="ui-th-label">
                    Tiket
                    <Icon :icon="sortCol==='created_at'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='created_at'?'text-neutral-700':'text-neutral-300']" />
                  </span>
                </th>
                <th class="ui-th-sortable" @click="sortBy('requester_name')">
                  <span class="ui-th-label">
                    Pelapor
                    <Icon :icon="sortCol==='requester_name'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='requester_name'?'text-neutral-700':'text-neutral-300']" />
                  </span>
                </th>
                <th>Lokasi</th>
                <th class="hidden sm:table-cell">ETA</th>
                <th class="ui-th-sortable" @click="sortBy('status')">
                  <span class="ui-th-label">
                    Status
                    <Icon :icon="sortCol==='status'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='status'?'text-neutral-700':'text-neutral-300']" />
                  </span>
                </th>
                <th class="ui-th-right"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="showOrdersSkeleton" v-for="i in 4" :key="`skel-${i}`">
                <td>
                  <div class="soft-skel h-4 w-32 mb-2" />
                  <div class="soft-skel h-3.5 w-24" />
                </td>
                <td>
                  <div class="soft-skel h-4 w-36 mb-2" />
                  <div class="soft-skel h-3.5 w-28" />
                </td>
                <td>
                  <div class="soft-skel h-4 w-48 mb-2" />
                  <div class="soft-skel h-3.5 w-32" />
                </td>
                <td class="hidden sm:table-cell">
                  <div class="soft-skel h-4 w-14" />
                </td>
                <td>
                  <div class="soft-skel h-6 rounded-full w-20" />
                </td>
                <td class="ui-td-right">
                  <div class="inline-flex justify-end gap-1.5">
                    <div class="soft-skel h-8 rounded-lg w-8" />
                  </div>
                </td>
              </tr>

              <tr v-else-if="!filtered.length">
                <td colspan="6">
                  <UiEmptyState title="Tidak ada pesanan" description="Belum ada pesanan di kategori ini.">
                    <template #icon>
                      <Icon icon="lucide:inbox" class="text-neutral-400 text-2xl" />
                    </template>
                  </UiEmptyState>
                </td>
              </tr>

              <tr
                v-else
                v-for="order in paginated"
                :key="order.id"
              >
                <td>
                  <div class="flex items-center gap-2">
                    <NuxtLink
                      :to="`/unit/orders/${order.ticket_number}`"
                      class="ui-cell-mono hover:underline"
                    >
                      {{ order.ticket_number }}
                    </NuxtLink>
                    <span
                      v-if="order.source === 'sos'"
                      class="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-emergency-700 ring-1 ring-inset ring-emergency-200"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-emergency-500 animate-pulse" />
                      SOS
                    </span>
                  </div>
                  <p class="ui-cell-desc">{{ formatDate(order.created_at) }}</p>
                </td>

                <td>
                  <p class="ui-cell-title">{{ order.requester_name }}</p>
                  <p class="ui-cell-desc">{{ order.requester_phone }}</p>
                </td>

                <td class="max-w-xs">
                  <p v-if="order.location" class="ui-cell-title line-clamp-1">{{ order.location }}</p>
                  <p v-if="order.condition" class="ui-cell-desc line-clamp-1">{{ order.condition }}</p>
                  <p v-if="!order.location && !order.condition" class="text-sm text-neutral-400">—</p>
                </td>

                <td class="hidden sm:table-cell">
                  <p class="ui-cell-title tabular-nums">{{ formatEta(orderEta(order)) }}</p>
                  <p class="ui-cell-desc">ke lokasi</p>
                </td>

                <td>
                  <UiStatusBadge :status="order.status" />
                </td>

                <td class="ui-td-right">
                  <div class="inline-flex items-center justify-end gap-2">
                    <NuxtLink
                      :to="`/unit/orders/${order.ticket_number}`"
                      class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-neutral-700 bg-white rounded-lg shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-colors"
                    >
                      <Icon icon="lucide:external-link" class="text-sm text-neutral-500" />
                      Detail
                    </NuxtLink>
                    <button
                      type="button"
                      class="inline-flex items-center justify-center w-9 h-9 text-neutral-600 bg-white rounded-lg shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-colors"
                      @click.stop="toggleDropdown(order, $event)"
                    >
                      <Icon icon="lucide:more-vertical" class="text-sm" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
        </UiTable>

        <template v-if="sortedFiltered.length" #footer>
          <UiPagination
            v-model:page="page"
            :total-pages="totalPages"
            :total="sortedFiltered.length"
            :page-size="pageSize"
          />
        </template>
      </UiTableCard>
    </div>

    <!-- Aksi dropdown (teleported to avoid overflow clipping) -->
    <Teleport to="body">
      <div
        v-if="dropdownOrder"
        class="fixed z-[99] w-52 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden"
        :style="{
          top: dropdownPos.top + 'px',
          right: dropdownPos.right + 'px',
          transform: dropdownPos.openUp ? 'translateY(-100%)' : undefined,
        }"
        @click.stop
      >
        <!-- Status actions -->
        <div v-if="['pending','accepted','in_progress'].includes(dropdownOrder.status)" class="py-1">
          <p class="px-4 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tindakan</p>
          <template v-if="dropdownOrder.status === 'pending'">
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              :disabled="updating === dropdownOrder.id || acting === dropdownOrder.id"
              @click="doAccept(dropdownOrder)"
            >
              <Icon icon="lucide:check" class="text-green-600 text-base shrink-0" />
              Terima
            </button>
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              :disabled="updating === dropdownOrder.id || acting === dropdownOrder.id"
              @click="openReject(dropdownOrder)"
            >
              <Icon icon="lucide:x" class="text-base shrink-0" />
              Tidak bisa · cari unit lain
            </button>
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              @click="openReassign(dropdownOrder)"
            >
              <Icon icon="lucide:arrow-right-left" class="text-neutral-500 text-base shrink-0" />
              Pilih unit manual
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
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              @click="openReassign(dropdownOrder)"
            >
              <Icon icon="lucide:arrow-right-left" class="text-neutral-500 text-base shrink-0" />
              Alihkan ke Unit...
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
          <NuxtLink
            :to="`/unit/orders/${dropdownOrder.ticket_number}`"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="dropdownOrder = null"
          >
            <Icon icon="lucide:info" class="text-neutral-500 text-base shrink-0" />
            Lihat Detail
          </NuxtLink>
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
            {{ orderHasReport(dropdownOrder) ? 'Lihat Laporan' : 'Buat Laporan' }}
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
          <UiStatusBadge :status="detailOrder.status" />
          <span class="text-xs text-neutral-400">{{ formatDate(detailOrder.created_at) }}</span>
        </div>
        <ExhaustedPlaybook
          v-if="detailOrder.status === 'pending' && (detailOrder.dispatch_status === 'exhausted' || detailOrder.dispatch_status === 'escalated')"
          :unit-name="detailOrder.unit_name"
          :requester-phone="detailOrder.requester_phone"
          :dispatch-status="detailOrder.dispatch_status"
          :escalation-hotline="detailOrder.escalation_hotline"
          :escalation-label="detailOrder.escalation_label"
          show-reassign
          @reassign="openReassignFromDetail"
        />
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
        <div class="pt-2 border-t border-neutral-100">
          <OrderHistoryTimeline :items="historyItems" :loading="historyLoading" />
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

    <ReassignModal
      v-model:open="showReassign"
      :order="reassignOrder"
      mode="unit"
      @done="refresh()"
    />
    <RejectReasonModal
      v-model:open="showReject"
      :unit-name="rejectTarget?.unit_name"
      @confirm="onRejectConfirm"
    />
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
