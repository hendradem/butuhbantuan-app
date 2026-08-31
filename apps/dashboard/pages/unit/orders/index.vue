<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";
import { estimateEtaMinutes, formatEta } from "~/utils/eta";
import { placeAnchoredMenu, refineAnchoredMenuTop } from "~/utils/placeAnchoredMenu";
import { compareOrdersByAcuity, formatTriageSummary } from "~/utils/triage";
import { JENIS_PELAYANAN_FILTER_OPTIONS, matchesJenisPelayananFilter } from "~/utils/jenisPelayanan";
import UnitOpsStats from "~/components/unit/UnitOpsStats.vue";
import type { HeatPoint } from "~/components/analytics/HeatmapViz.vue";

definePageMeta({ layout: "unit", title: "Pesanan Masuk", keepalive: true });

const { unitHeaders, logout } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const webAppUrl = (config.public.webAppUrl as string) || "http://localhost:3000";

function openCreateTicket() {
  void navigateTo("/unit/orders/new");
}

const STATUS_VALUES = ["all", "pending", "in_progress", "completed"] as const;
const { tab: statusFilter, setTab: setStatusFilter } = usePersistedTab(
  "bb-unit-orders-status",
  "all",
  STATUS_VALUES,
  "status",
);

const VIEW_VALUES = ["map", "table"] as const;
const { tab: viewMode, setTab: setViewMode } = usePersistedTab(
  "bb-unit-orders-view",
  "map",
  VIEW_VALUES,
  "view",
);

const OPS_STATS_KEY = "bb-unit-orders-show-stats";
const showOpsStats = ref(true);
onMounted(() => {
  try {
    const raw = sessionStorage.getItem(OPS_STATS_KEY);
    if (raw === "0") showOpsStats.value = false;
    if (raw === "1") showOpsStats.value = true;
  } catch {
    /* ignore */
  }
});
function toggleOpsStats() {
  showOpsStats.value = !showOpsStats.value;
  try {
    sessionStorage.setItem(OPS_STATS_KEY, showOpsStats.value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

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

// Reuse layout-loaded profile for unit coordinates (ETA + route)
const { data: profile } = useNuxtData<any>("unit-profile");
const unitCoords = computed(() => {
  const p = profile.value;
  if (!p) return null;
  const coords = p.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      return { lat, lng };
    }
  }
  const lat = Number(p.latitude ?? p.lat ?? p.address?.latitude);
  const lng = Number(p.longitude ?? p.lng ?? p.address?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }
  return null;
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
const sourceFilter = usePersistedQueryParam("bb-unit-orders-src", "src", "", { syncQuery: false });
const jenisFilter = usePersistedQueryParam("bb-unit-orders-jenis", "jenis", "", { syncQuery: false });
const gpsOnly = usePersistedQueryParam("bb-unit-orders-gps", "gps", "", { syncQuery: false });

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
  if (statusFilter.value === "pending") {
    base = base.filter((o: any) => o.status === "pending");
  } else if (statusFilter.value === "in_progress") {
    base = base.filter((o: any) => o.status === "accepted" || o.status === "in_progress");
  } else if (statusFilter.value === "completed") {
    base = base.filter((o: any) => o.status === "completed" || o.status === "cancelled");
  }
  if (sourceFilter.value === "sos") {
    base = base.filter((o: any) => o.source === "sos");
  } else if (sourceFilter.value === "regular") {
    base = base.filter((o: any) => o.source !== "sos");
  }
  if (gpsOnly.value === "1") {
    base = base.filter(
      (o: any) => Number(o.requester_lat) && Number(o.requester_lng),
    );
  }
  if (jenisFilter.value) {
    base = base.filter((o: any) => matchesJenisPelayananFilter(o.jenis_pelayanan, jenisFilter.value));
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

type UnitSortCol = "ticket_number" | "requester_name" | "created_at" | "status" | "assessment_acuity";
const sortCol = ref<UnitSortCol>("created_at");
const sortDir = ref<"asc" | "desc">("desc");

watch(
  statusFilter,
  (v) => {
    if (v === "pending") {
      sortCol.value = "assessment_acuity";
      sortDir.value = "asc";
    }
  },
  { immediate: true },
);

function sortBy(col: UnitSortCol) {
  if (sortCol.value === col) sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  else {
    sortCol.value = col;
    sortDir.value = col === "created_at" ? "desc" : "asc";
  }
  page.value = 1;
}

const sortedFiltered = computed(() =>
  [...filtered.value].sort((a: any, b: any) => {
    if (sortCol.value === "assessment_acuity") {
      const cmp = compareOrdersByAcuity(a, b);
      return sortDir.value === "asc" ? cmp : -cmp;
    }
    const va = String(a[sortCol.value] ?? "");
    const vb = String(b[sortCol.value] ?? "");
    const cmp = va.localeCompare(vb);
    return sortDir.value === "asc" ? cmp : -cmp;
  }),
);

const page = ref(1);
const pageSize = ref(20);
const mobileExpanded = ref<string | null>(null);
watch([statusFilter, search, datePeriod, customFrom, customTo, sourceFilter, jenisFilter, gpsOnly], () => {
  page.value = 1;
  mobileExpanded.value = null;
});
const totalPages = computed(() => Math.max(1, Math.ceil(sortedFiltered.value.length / pageSize.value)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return sortedFiltered.value.slice(start, start + pageSize.value);
});

const showHeat = ref(true);
const activeOffer = useState<any>("bb-unit-active-alert", () => null);

const focusTicket = computed(() =>
  viewMode.value === "map" ? (activeOffer.value?.ticket_number || null) : null,
);

watch(activeOffer, (o) => {
  if (!o?.ticket_number || viewMode.value !== "map") return;
  // Pastikan pin/kartu offer terlihat di sebaran
  if (statusFilter.value === "completed") setStatusFilter("all");
});

const hasExtraFilters = computed(
  () =>
    statusFilter.value !== "all" ||
    !!search.value.trim() ||
    !!sourceFilter.value ||
    !!jenisFilter.value ||
    gpsOnly.value === "1" ||
    datePeriod.value !== "1",
);

/** Filters that live inside the overflow menu (not the primary row). */
const moreFilterCount = computed(() => {
  let n = 0;
  if (sourceFilter.value) n += 1;
  if (jenisFilter.value) n += 1;
  if (gpsOnly.value === "1") n += 1;
  if (datePeriod.value === "custom") n += 1;
  return n;
});

const filterMenuOpen = ref(false);

watch(datePeriod, (v) => {
  if (v === "custom") filterMenuOpen.value = true;
});

function clearExtraFilters() {
  setStatusFilter("all");
  search.value = "";
  sourceFilter.value = "";
  jenisFilter.value = "";
  gpsOnly.value = "";
  setDatePeriod("1");
  filterMenuOpen.value = false;
}

/** Points for interactive sebaran — ikut filter status / sumber / GPS / cari */
const mapPoints = computed<HeatPoint[]>(() =>
  sortedFiltered.value.map((o: any) => ({
    lat: Number(o.requester_lat) || 0,
    lng: Number(o.requester_lng) || 0,
    count: 1,
    type: o.emergency_type || o.type_name || o.condition || "Pesanan",
    ticket_number: o.ticket_number,
    status: o.status,
    requester_name: o.requester_name,
    requester_phone: o.requester_phone,
    unit_name: o.unit_name,
    condition: o.condition,
    location: o.location,
    jenis_pelayanan: o.jenis_pelayanan,
    assessment_acuity: o.assessment_acuity,
    assessment: o.assessment,
    created_at: formatDate(o.created_at),
    regency: o.regency || "",
    province: o.province || "",
  })),
);

// ── Notification + auto-refresh ───────────────────────────────────────────────
// Alert pakai antrian live (semua pending), bukan filter periode
useOrderNotification(
  computed(() => orders.value.filter((o: any) => o.status === "pending").length),
  refresh,
  30_000,
  { sound: "none", browser: false },
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

async function doArrive(order: any) {
  if (!order?.id || updating.value) return;
  dropdownOrder.value = null;
  updating.value = order.id;
  try {
    await $fetch(`${baseUrl}/api/v1/unit/orders/${order.id}/arrive`, {
      method: "POST",
      headers: unitHeaders(),
    });
    await refresh();
    const ticket = order.ticket_number || "";
    toast.success(ticket ? `Tiba di lokasi · ${ticket}` : "Tiba di lokasi");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal menandai tiba");
  } finally {
    updating.value = null;
  }
}

async function updateStatus(id: string, status: string, handlerName = "", notes = "") {
  updating.value = id;
  const statusLabel: Record<string, string> = {
    accepted: "Terima pesanan",
    in_progress: "Penanganan dimulai",
    completed: "Selesai & laporan",
    cancelled: "Pesanan dibatalkan",
  };
  try {
    await $fetch(`${baseUrl}/api/v1/unit/orders/${id}`, {
      method: "PUT",
      headers: unitHeaders(),
      body: { status, handler_name: handlerName, handling_notes: notes },
    });
    await refresh();
    toast.success(statusLabel[status] ?? "Status diperbarui");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal memperbarui status pesanan");
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
const dropdownEl = ref<HTMLElement | null>(null);
const dropdownTriggerRect = ref<DOMRect | null>(null);

async function toggleDropdown(order: any, event: MouseEvent) {
  if (dropdownOrder.value?.id === order.id) {
    dropdownOrder.value = null;
    dropdownTriggerRect.value = null;
    return;
  }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  dropdownTriggerRect.value = rect;
  const pos = placeAnchoredMenu(rect, { menuHeight: 420, alignRight: true });
  dropdownPos.value = { top: pos.top, right: pos.right, openUp: pos.openUp };
  dropdownOrder.value = order;
  await nextTick();
  if (dropdownEl.value && dropdownTriggerRect.value) {
    const refined = refineAnchoredMenuTop(
      dropdownTriggerRect.value,
      dropdownEl.value,
      dropdownPos.value.openUp,
    );
    dropdownPos.value = {
      ...dropdownPos.value,
      top: refined.top,
      openUp: refined.openUp,
    };
  }
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
    formatTriageSummary(order.assessment, order.condition)
      ? `🚨 *Kondisi:* ${formatTriageSummary(order.assessment, order.condition)}`
      : null,
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
          <div class="flex items-center gap-1 bg-neutral-100 rounded-xl p-1 mr-auto sm:mr-0">
            <button
              type="button"
              :class="[
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
                viewMode === 'map' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
              ]"
              @click="setViewMode('map')"
            >
              <Icon icon="lucide:map" class="text-sm" />
              Peta
            </button>
            <button
              type="button"
              :class="[
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
                viewMode === 'table' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
              ]"
              @click="setViewMode('table')"
            >
              <Icon icon="lucide:table" class="text-sm" />
              Tabel
            </button>
          </div>
          <UiButton variant="primary" class="flex-1 sm:flex-none justify-center" @click="openCreateTicket">
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
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs font-medium hidden md:inline" :class="showOpsStats ? 'text-neutral-700' : 'text-neutral-400'">Statistik</span>
            <button
              type="button"
              role="switch"
              :aria-checked="showOpsStats"
              :title="showOpsStats ? 'Sembunyikan statistik' : 'Tampilkan statistik'"
              class="relative inline-flex h-5 w-9 shrink-0 items-center cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
              :class="showOpsStats ? 'bg-neutral-700' : 'bg-neutral-300'"
              @click="toggleOpsStats()"
            >
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
                :class="showOpsStats ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      class="ops-stats-panel"
      :class="{ 'ops-stats-panel--open': showOpsStats }"
      :aria-hidden="!showOpsStats"
    >
      <div class="ops-stats-panel__inner">
        <UnitOpsStats
          :orders="orders"
          :period-orders="inPeriod"
          :loading="pending && !data"
        />
      </div>
    </div>
    <!-- Fetch error banner (non-auth errors) -->
    <div v-if="fetchError" class="mx-4 mt-4 sm:mx-6 flex items-center gap-2 rounded-xl bg-emergency-50 border border-emergency-200 px-4 py-3 text-sm text-emergency-700">
      <Icon icon="lucide:alert-circle" class="text-base shrink-0" />
      <span class="flex-1">Gagal memuat pesanan. Pastikan koneksi ke server aktif.</span>
      <button class="text-emergency-600 underline text-sm" @click="refresh()">Coba lagi</button>
    </div>

    <!-- Dropdown overlay (click outside to close) -->
    <div v-if="dropdownOrder" class="fixed inset-0 z-[98]" @click="dropdownOrder = null" />

    <div class="p-4 sm:p-6">
      <UiTableCard
        :badge="filtered.length"
        :title="viewMode === 'map' ? 'Sebaran Pesanan' : 'Daftar Pesanan'"
        :description="viewMode === 'map'
          ? 'Sebaran live — panggilan masuk muncul di peta & kartu'
          : 'Daftar live — filter & periode sama dengan sebaran'"
      >
        <template #actions>
          <UiSearchInput
            v-model="search"
            placeholder="Cari..."
            class="w-28 sm:w-36 shrink-0"
          />
          <UiSelect v-model="statusFilter" class="!w-auto shrink-0">
            <option value="all">Semua</option>
            <option value="pending">Masuk</option>
            <option value="in_progress">Diproses</option>
            <option value="completed">Selesai</option>
          </UiSelect>
          <UiSelect
            class="!w-auto shrink-0"
            :model-value="datePeriod"
            @update:model-value="setDatePeriod"
          >
            <option v-for="opt in datePresets" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </UiSelect>

          <TableMoreFilters v-model:open="filterMenuOpen" :active-count="moreFilterCount">
            <div>
              <p class="text-[11px] font-medium text-neutral-400 mb-1.5">Jenis pelayanan</p>
              <UiSelect v-model="jenisFilter" class="w-full">
                <option value="">Semua jenis</option>
                <option
                  v-for="opt in JENIS_PELAYANAN_FILTER_OPTIONS"
                  :key="opt.code"
                  :value="opt.code"
                >
                  {{ opt.label }}
                </option>
                <option value="__empty__">Belum diisi</option>
              </UiSelect>
            </div>
            <div>
              <p class="text-[11px] font-medium text-neutral-400 mb-1.5">Sumber</p>
              <UiSelect v-model="sourceFilter" class="w-full">
                <option value="">Semua sumber</option>
                <option value="sos">SOS</option>
                <option value="regular">Non-SOS</option>
              </UiSelect>
            </div>
            <div>
              <p class="text-[11px] font-medium text-neutral-400 mb-1.5">Lokasi</p>
              <UiSelect v-model="gpsOnly" class="w-full">
                <option value="">Semua lokasi</option>
                <option value="1">Ada GPS</option>
              </UiSelect>
            </div>
            <div v-if="isCustomDate" class="space-y-2">
              <p class="text-[11px] font-medium text-neutral-400">Rentang kustom</p>
              <UiInput
                type="date"
                class="w-full"
                :model-value="customFrom"
                @update:model-value="customFrom = $event"
              />
              <UiInput
                type="date"
                class="w-full"
                :model-value="customTo"
                :min="customFrom || undefined"
                @update:model-value="customTo = $event"
              />
            </div>
            <template v-if="hasExtraFilters" #footer>
              <button
                type="button"
                class="w-full text-xs font-medium text-neutral-600 hover:text-neutral-900 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
                @click="clearExtraFilters"
              >
                Reset semua filter
              </button>
            </template>
          </TableMoreFilters>

          <div v-if="viewMode === 'map'" class="flex items-center gap-2 shrink-0">
            <span class="text-xs font-medium hidden lg:inline" :class="showHeat ? 'text-neutral-700' : 'text-neutral-400'">Heatmap</span>
            <button
              type="button"
              role="switch"
              :aria-checked="showHeat"
              :title="showHeat ? 'Sembunyikan heatmap' : 'Tampilkan heatmap'"
              class="relative inline-flex h-5 w-9 shrink-0 items-center cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
              :class="showHeat ? 'bg-neutral-700' : 'bg-neutral-300'"
              @click="showHeat = !showHeat"
            >
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
                :class="showHeat ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
          </div>
        </template>

        <!-- Map -->
        <div v-if="viewMode === 'map'">
          <ClientOnly>
            <HeatmapViz
              v-model:show-heat="showHeat"
              :points="mapPoints"
              :loading="showOrdersSkeleton"
              detail-base-path="/unit/orders"
              hide-region-filters
              hide-view-toggle
              hide-toolbar
              embedded
              live
              :unit-lat="unitCoords?.lat"
              :unit-lng="unitCoords?.lng"
              :focus-ticket="focusTicket"
            />
            <template #fallback>
              <div class="soft-skel h-[580px] rounded-none" />
            </template>
          </ClientOnly>
        </div>

        <!-- Table / mobile cards -->
        <template v-else>
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
            </div>
          </template>

          <div v-else-if="!paginated.length" class="py-2">
            <UiEmptyState title="Tidak ada pesanan" description="Belum ada pesanan di kategori ini.">
              <template #icon>
                <Icon icon="lucide:inbox" class="text-neutral-400 text-2xl" />
              </template>
            </UiEmptyState>
          </div>

          <template v-else>
            <div v-for="order in paginated" :key="order.id">
              <button
                type="button"
                class="w-full text-left p-3.5 flex items-start gap-2 hover:bg-neutral-50/80 transition-colors"
                @click="mobileExpanded = mobileExpanded === order.id ? null : order.id"
              >
                <Icon
                  icon="lucide:chevron-right"
                  class="mt-0.5 shrink-0 text-neutral-400 text-base transition-transform"
                  :class="mobileExpanded === order.id && 'rotate-90'"
                />
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-neutral-900 truncate">{{ order.requester_name }}</p>
                    <UiStatusBadge :status="order.status" size="sm" />
                  </div>
                  <p class="font-mono text-[11px] text-neutral-500">{{ order.ticket_number }}</p>
                  <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <OrderJenisBadge :code="order.jenis_pelayanan" fallback="emergency" show-empty compact />
                    <OrderTriageBadge
                      :acuity="order.assessment_acuity"
                      :jenis-pelayanan="order.jenis_pelayanan"
                      emergency-only
                      compact
                    />
                    <span
                      v-if="orderEta(order)"
                      class="text-[11px] font-medium tabular-nums text-neutral-600"
                    >
                      ETA {{ formatEta(orderEta(order)) }}
                    </span>
                  </div>
                  <p v-if="order.location" class="text-xs text-neutral-500 truncate pt-0.5">{{ order.location }}</p>
                </div>
              </button>
              <div v-if="mobileExpanded === order.id" class="border-t border-neutral-100 bg-neutral-50/50">
                <OrderListExpandPanel
                  :order="order"
                  variant="unit"
                  :detail-path="`/unit/orders/${order.ticket_number}`"
                  :eta-minutes="orderEta(order)"
                />
              </div>
            </div>
          </template>
        </div>

        <!-- Desktop table -->
        <OrdersExpandableTable
          wrapper-class="hidden md:block"
          :orders="paginated"
          :loading="showOrdersSkeleton"
          variant="unit"
          :sort-col="sortCol"
          :sort-dir="sortDir"
          detail-base-path="/unit/orders"
          :get-eta="orderEta"
          @sort="sortBy"
        >
          <template #row-actions="{ order }">
            <button
              type="button"
              class="inline-flex items-center justify-center w-8 h-8 text-neutral-500 rounded-lg hover:bg-neutral-100 hover:text-neutral-800 transition-colors opacity-70 group-hover:opacity-100"
              aria-label="Aksi lainnya"
              @click="toggleDropdown(order, $event)"
            >
              <Icon icon="lucide:more-horizontal" class="text-base" />
            </button>
          </template>
        </OrdersExpandableTable>
        </template>

        <template v-if="viewMode === 'table' && sortedFiltered.length" #footer>
          <UiPagination
            v-model:page="page"
            :total-pages="totalPages"
            :total="sortedFiltered.length"
            :page-size="pageSize"
          />
        </template>
      </UiTableCard>
    </div>
    <Teleport to="body">
      <template v-if="dropdownOrder">
        <div class="fixed inset-0 z-[10050]" @click="dropdownOrder = null" />
        <div
          ref="dropdownEl"
          class="fixed z-[10051] w-56 max-h-[min(70vh,28rem)] overflow-y-auto bg-white rounded-lg shadow-lg border border-neutral-200"
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
          <template v-else-if="dropdownOrder.status === 'accepted' || (dropdownOrder.status === 'in_progress' && !dropdownOrder.arrived_at)">
            <button
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              :disabled="updating === dropdownOrder.id"
              @click="doArrive(dropdownOrder)"
            >
              <Icon icon="lucide:map-pin-check" class="text-primary-600 text-base shrink-0" />
              Sampai lokasi
            </button>
            <button
              v-if="dropdownOrder.status === 'accepted'"
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              @click="openReassign(dropdownOrder)"
            >
              <Icon icon="lucide:arrow-right-left" class="text-neutral-500 text-base shrink-0" />
              Alihkan ke Unit...
            </button>
            <NuxtLink
              :to="`/unit/orders/${dropdownOrder.ticket_number}`"
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              @click="dropdownOrder = null"
            >
              <Icon icon="lucide:share-2" class="text-neutral-500 text-base shrink-0" />
              Bagikan lokasi (detail)
            </NuxtLink>
          </template>
          <template v-else-if="dropdownOrder.status === 'in_progress' && dropdownOrder.arrived_at">
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
      </template>
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
        <div v-if="detailOrder.assessment?.answers?.length || detailOrder.assessment_acuity || detailOrder.condition">
          <OrderAssessmentBlock
            compact
            :assessment="detailOrder.assessment"
            :acuity="detailOrder.assessment_acuity"
            :condition="detailOrder.condition"
          />
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

.ops-stats-panel {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.24s ease;
  pointer-events: none;
}

.ops-stats-panel--open {
  grid-template-rows: 1fr;
  opacity: 1;
  pointer-events: auto;
}

.ops-stats-panel__inner {
  overflow: hidden;
  min-height: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ops-stats-panel {
    transition: none;
  }
}
</style>
