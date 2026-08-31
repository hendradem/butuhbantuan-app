<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { etaFromEmergency } from "~/utils/eta";
import { placeAnchoredMenu, refineAnchoredMenuTop } from "~/utils/placeAnchoredMenu";
import { triageMeta } from "~/utils/triage";
import { jenisPelayananLabel, JENIS_PELAYANAN_FILTER_OPTIONS, matchesJenisPelayananFilter } from "~/utils/jenisPelayanan";

definePageMeta({ title: "Pesanan Masuk", keepalive: true });

const { get, authGet } = useApi();

function openCreateTicket() {
  rememberOrderDetailBack("/orders");
  void navigateTo("/orders/new");
}

// ── Fetch ────────────────────────────────────────────────────────────────────
const { data: ordersData, pending: ordersPending, refresh: refreshOrders } = await useAsyncData(
  "admin-orders",
  () => authGet<{ data: any[] }>("/api/v1/admin/orders"),
  { server: false }
);
const { data: emergencyData } = await useAsyncData("emergencies-for-orders", () =>
  get<{ data: any[] }>("/api/v1/emergency/")
);
const { data: typesData } = await useAsyncData("types-for-orders", () =>
  get<{ data: any[] }>("/api/v1/emergency/type")
);

const refresh = useSoftRefresh(refreshOrders);
const showOrdersSkeleton = computed(() => isInitialPending(ordersPending.value, ordersData.value));

const VIEW_VALUES = ["orders", "sos"] as const;
const { tab: listView, setTab: setListView } = usePersistedTab(
  "bb-admin-orders-view",
  "orders",
  VIEW_VALUES,
  "view",
);
const { pendingSos } = useOpsAlerts();

function onAdminOrderLive() {
  void refresh();
}

onActivated(() => {
  rememberOrderDetailBack("/orders");
  refreshOrders();
});

onMounted(() => {
  rememberOrderDetailBack("/orders");
  if (import.meta.client) {
    window.addEventListener("bb:admin-order-live", onAdminOrderLive);
  }
});
onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener("bb:admin-order-live", onAdminOrderLive);
  }
});

const orders = computed(() => ordersData.value?.data ?? []);
const emergencies = computed(() => emergencyData.value?.data ?? []);
const types = computed(() => typesData.value?.data ?? []);

// ── Filters (persisted so back dari detail tetap di filter terakhir) ───────────
const filterStatus = usePersistedQueryParam("bb-admin-orders-status", "status");
const filterType = usePersistedQueryParam("bb-admin-orders-type", "type");
const filterJenis = usePersistedQueryParam("bb-admin-orders-jenis", "jenis");
const filterProvince = usePersistedQueryParam("bb-admin-orders-province", "province");
const search = usePersistedQueryParam("bb-admin-orders-q", "q", "", { syncQuery: false });
const page = ref(1);
const pageSize = ref(20);

const {
  period: datePeriod,
  setPeriod: setDatePeriod,
  customFrom,
  customTo,
  presets: datePresets,
  isCustom: isCustomDate,
  filterByPeriod,
} = useOrderPeriodFilter("bb-admin-orders-v2", "range", "1");

const { loadProvinces, provinces: coveredProvinces } = useCoveredWilayah();
await loadProvinces();

// Provinsi filter = wilayah tercakup (bukan hanya yang sudah punya unit)
const provinces = computed(() =>
  [...coveredProvinces.value].sort((a, b) => a.name.localeCompare(b.name)),
);

// Emergency lookup map for map markers
const emergencyMap = computed(() => {
  const m: Record<string, any> = {};
  for (const e of emergencies.value) m[e.id] = e;
  return m;
});

// Orders enriched with emergency info + ETA to requester
const enriched = computed(() =>
  orders.value.map((o: any) => ({
    ...o,
    _emergency: emergencyMap.value[o.emergency_uuid] ?? null,
    _eta: etaFromEmergency(emergencyMap.value[o.emergency_uuid], o.requester_lat, o.requester_lng),
  }))
);

const inPeriod = computed(() => filterByPeriod(enriched.value));

const filtered = computed(() => {
  let list = inPeriod.value;
  if (filterStatus.value) list = list.filter((o: any) => o.status === filterStatus.value);
  if (filterType.value) list = list.filter((o: any) => String(o._emergency?.emergency_type?.id) === filterType.value);
  if (filterJenis.value) list = list.filter((o: any) => matchesJenisPelayananFilter(o.jenis_pelayanan, filterJenis.value));
  if (filterProvince.value) {
    list = list.filter((o: any) =>
      o._emergency?.address?.province_id === filterProvince.value
      || o.province_id === filterProvince.value
    );
  }
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter((o: any) =>
      o.requester_name?.toLowerCase().includes(q) ||
      o.ticket_number?.toLowerCase().includes(q) ||
      o.unit_name?.toLowerCase().includes(q) ||
      o.location?.toLowerCase().includes(q)
    );
  }
  return [...list].sort((a: any, b: any) => {
    const va = String(a[sortCol.value] ?? '');
    const vb = String(b[sortCol.value] ?? '');
    const cmp = va.localeCompare(vb);
    return sortDir.value === 'asc' ? cmp : -cmp;
  });
});

watch([filterStatus, filterType, filterJenis, filterProvince, search, datePeriod, customFrom, customTo], () => { page.value = 1; });

const filterMenuOpen = ref(false);

const moreFilterCount = computed(() => {
  let n = 0;
  if (filterType.value) n += 1;
  if (filterJenis.value) n += 1;
  if (filterProvince.value) n += 1;
  if (isCustomDate.value) n += 1;
  return n;
});

const hasExtraFilters = computed(
  () =>
    !!filterType.value ||
    !!filterJenis.value ||
    !!filterProvince.value ||
    isCustomDate.value,
);

function clearExtraFilters() {
  filterType.value = "";
  filterJenis.value = "";
  filterProvince.value = "";
  setDatePeriod("1");
  filterMenuOpen.value = false;
}

watch(datePeriod, (v) => {
  if (v === "custom") filterMenuOpen.value = true;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

// ── Notification + auto-refresh ───────────────────────────────────────────────
// Live pending for alerts — jangan ikut filter periode (antrian lama tetap perlu alert)
useOrderNotification(
  computed(() => orders.value.filter((o: any) => o.status === "pending").length),
  refresh,
  30_000,
  { sound: "none" },
);
// Emergency MP3 only on unit layout; admin uses toast / notification center.

// ── Sort ──────────────────────────────────────────────────────────────────────
type SortCol = 'ticket_number' | 'requester_name' | 'unit_name' | 'created_at' | 'status';
const sortCol = ref<SortCol>('created_at');
const sortDir = ref<'asc' | 'desc'>('desc');

function sortBy(col: SortCol) {
  if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else { sortCol.value = col; sortDir.value = col === 'created_at' ? 'desc' : 'asc'; }
  page.value = 1;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusLabel(s: string) {
  const m: Record<string, string> = {
    pending: "Pending", accepted: "Diterima", in_progress: "Diproses",
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return baseUrl + url;
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV() {
  const cols = [
    { header: "No. Tiket", key: "ticket_number" },
    { header: "Tanggal", key: "created_at" },
    { header: "Pelapor", key: "requester_name" },
    { header: "No. HP", key: "requester_phone" },
    { header: "Unit", key: "unit_name" },
    { header: "Lokasi", key: "location" },
    { header: "Jenis", key: "jenis_pelayanan" },
    { header: "Kondisi", key: "condition" },
    { header: "Triase", key: "assessment_acuity" },
    { header: "Status", key: "status" },
    { header: "Petugas", key: "handler_name" },
    { header: "Catatan", key: "handling_notes" },
    { header: "Sumber", key: "source" },
  ];
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = cols.map(c => escape(c.header)).join(",");
  const rows = filtered.value.map((o: any) =>
    cols.map(c => {
      if (c.key === "created_at") return escape(formatDate(o[c.key]));
      if (c.key === "status") return escape(statusLabel(o[c.key]));
      if (c.key === "assessment_acuity") return escape(triageMeta(o[c.key])?.label ?? "");
      if (c.key === "jenis_pelayanan") return escape(jenisPelayananLabel(o[c.key] || ""));
      return escape(o[c.key]);
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pesanan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Detail modal ─────────────────────────────────────────────────────────────
const showDetail = ref(false);
const detailOrder = ref<any>(null);
const { items: historyItems, loading: historyLoading, load: loadHistory, reset: resetHistory } = useOrderHistory("admin");

function openDetail(order: any) {
  detailOrder.value = order;
  showDetail.value = true;
  loadHistory(order);
}

watch(showDetail, (v) => { if (!v) resetHistory(); });

// ── Dispatch actions (accept / reject / reassign) ─────────────────────────────
const { accept, reject, escalatePsc, cancel, acting } = useOrderDispatch("admin");
const showReassign = ref(false);
const reassignOrder = ref<any>(null);
const showReject = ref(false);
const rejectTarget = ref<any>(null);
const showCancel = ref(false);
const cancelTarget = ref<any>(null);
const cancelling = ref(false);

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

function openCancel(order: any) {
  cancelTarget.value = order;
  showCancel.value = true;
  dropdownOrder.value = null;
}

async function confirmCancel() {
  if (!cancelTarget.value?.id || cancelling.value) return;
  cancelling.value = true;
  try {
    if (await cancel(cancelTarget.value.id)) {
      showCancel.value = false;
      cancelTarget.value = null;
      await refresh();
    }
  } finally {
    cancelling.value = false;
  }
}

async function doEscalateFromDetail() {
  if (!detailOrder.value?.id) return;
  if (await escalatePsc(detailOrder.value.id)) {
    await refresh();
    openDetail(detailOrder.value);
  }
}

async function doAccept(order: any) {
  dropdownOrder.value = null;
  if (await accept(order.id)) refresh();
}

async function onRejectConfirm(payload: { reason: string; note: string }) {
  if (!rejectTarget.value?.id) return;
  if (await reject(rejectTarget.value.id, payload)) refresh();
}

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
  // Tall when pending (dispatch actions) — toast stack is z-9999 on the right
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
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="page-subheader">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="page-subheader-title">Pesanan Masuk</h1>
          <p class="page-subheader-desc">
            <template v-if="listView === 'sos'">Log SOS warga — penanganan di tab Pesanan</template>
            <template v-else>
              <span v-if="showOrdersSkeleton">Memuat...</span>
              <span v-else>{{ filtered.length }} dari {{ inPeriod.length }} pesanan</span>
            </template>
          </p>
        </div>
        <div v-if="listView === 'orders'" class="flex items-center gap-2">
          <UiButton variant="primary" @click="openCreateTicket">
            <Icon icon="lucide:ticket-plus" class="text-sm" />
            Buat E-Tiket
          </UiButton>
          <UiButton variant="secondary" @click="exportCSV()">
            <Icon icon="lucide:download" class="text-sm" />
            Export CSV
          </UiButton>
          <UiButton variant="secondary" :disabled="ordersPending && !!ordersData" @click="refresh()">
            <Icon icon="lucide:refresh-cw" class="text-sm" :class="{ 'animate-spin': ordersPending }" />
            Refresh
          </UiButton>
        </div>
      </div>

      <!-- Pesanan | SOS -->
      <div class="flex gap-1 mt-3 -mb-3">
        <button
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            listView === 'orders'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700',
          ]"
          @click="setListView('orders')"
        >
          Pesanan
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-1.5',
            listView === 'sos'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700',
          ]"
          @click="setListView('sos')"
        >
          <Icon icon="lucide:siren" class="text-sm" />
          Log SOS
          <span
            v-if="pendingSos > 0"
            class="min-w-[18px] h-[18px] px-1 rounded-full bg-emergency-600 text-white text-[10px] font-bold inline-flex items-center justify-center"
          >
            {{ pendingSos > 99 ? "99+" : pendingSos }}
          </span>
        </button>
      </div>
    </div>

    <div v-if="listView === 'sos'" class="p-4 sm:p-6">
      <SosAlertsPanel :orders="orders" @go-orders="setListView('orders')" />
    </div>

    <div v-else>
      <UnitOpsStats
        :orders="orders"
        :period-orders="inPeriod"
        :loading="showOrdersSkeleton"
      />

      <div class="p-4 sm:p-6 space-y-5">

      <UiTableCard
        title="Daftar Pesanan"
        :badge="filtered.length"
        description="Daftar live — filter & periode mengikuti statistik di atas"
      >
        <template #actions>
          <UiSearchInput
            v-model="search"
            placeholder="Cari..."
            class="w-28 sm:w-36 shrink-0"
          />
          <UiSelect v-model="filterStatus" class="!w-auto shrink-0">
            <option value="">Semua</option>
            <option value="pending">Pending</option>
            <option value="accepted">Diterima</option>
            <option value="in_progress">Diproses</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatal</option>
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
              <p class="text-[11px] font-medium text-neutral-400 mb-1.5">Jenis layanan</p>
              <UiSelect v-model="filterType" class="w-full">
                <option value="">Semua layanan</option>
                <option v-for="t in types" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
              </UiSelect>
            </div>
            <div>
              <p class="text-[11px] font-medium text-neutral-400 mb-1.5">Jenis pelayanan</p>
              <UiSelect v-model="filterJenis" class="w-full">
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
              <p class="text-[11px] font-medium text-neutral-400 mb-1.5">Provinsi</p>
              <UiSelect v-model="filterProvince" class="w-full">
                <option value="">Semua provinsi</option>
                <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
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
                Reset filter tambahan
              </button>
            </template>
          </TableMoreFilters>
        </template>

        <!-- Table -->
        <OrdersExpandableTable
          :orders="paginated"
          :loading="showOrdersSkeleton"
          variant="admin"
          :sort-col="sortCol"
          :sort-dir="sortDir"
          detail-base-path="/orders"
          :get-eta="(o) => o._eta"
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

        <template v-if="filtered.length" #footer>
          <UiPagination
            v-model:page="page"
            :total-pages="totalPages"
            :total="filtered.length"
            :page-size="pageSize"
          />
        </template>
      </UiTableCard>
      </div>
    </div>

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
        <ExhaustedPlaybook
          v-if="detailOrder.status === 'pending' && (detailOrder.dispatch_status === 'exhausted' || detailOrder.dispatch_status === 'escalated')"
          :unit-name="detailOrder.unit_name"
          :requester-phone="detailOrder.requester_phone"
          :dispatch-status="detailOrder.dispatch_status"
          :escalation-hotline="detailOrder.escalation_hotline"
          :escalation-label="detailOrder.escalation_label"
          show-reassign
          show-escalate
          :escalating="acting === detailOrder.id"
          @reassign="openReassignFromDetail"
          @escalate="doEscalateFromDetail"
        />
        <div>
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Pelapor</p>
          <p class="font-semibold text-neutral-900">{{ detailOrder.requester_name }}</p>
          <p class="text-neutral-500 mt-0.5">{{ detailOrder.requester_phone }}</p>
        </div>
        <div v-if="detailOrder.unit_name">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Unit Layanan</p>
          <p class="text-neutral-900 font-medium">{{ detailOrder.unit_name }}</p>
          <p v-if="detailOrder._emergency?.address?.regency" class="text-neutral-400 text-xs mt-0.5">
            {{ detailOrder._emergency.address.regency }}, {{ detailOrder._emergency.address.province }}
          </p>
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
          <img :src="assetUrl(detailOrder.photo_url)" alt="Foto laporan" class="rounded-lg max-h-56 w-full object-cover" />
        </div>
        <div class="pt-2 border-t border-neutral-100">
          <OrderHistoryTimeline :items="historyItems" :loading="historyLoading" />
        </div>
      </div>
    </UiModal>

    <!-- Aksi dropdown: above toast stack (z-9999) so menus stay usable when pesanan masuk -->
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
        <div v-if="['pending', 'accepted'].includes(dropdownOrder.status)" class="py-1">
          <p class="px-4 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Dispatch</p>
          <button
            v-if="dropdownOrder.status === 'pending'"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
            :disabled="acting === dropdownOrder.id"
            @click="doAccept(dropdownOrder)"
          >
            <Icon icon="lucide:check" class="text-base shrink-0" />
            Terima
          </button>
          <button
            v-if="dropdownOrder.status === 'pending'"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-emergency-700 hover:bg-emergency-50 transition-colors disabled:opacity-50"
            :disabled="acting === dropdownOrder.id"
            @click="openReject(dropdownOrder)"
          >
            <Icon icon="lucide:x" class="text-base shrink-0" />
            Tolak & Alihkan Otomatis
          </button>
          <button
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="openReassign(dropdownOrder)"
          >
            <Icon icon="lucide:arrow-right-left" class="text-neutral-500 text-base shrink-0" />
            Alihkan ke Unit...
          </button>
        </div>

        <!-- Info -->
        <div class="py-1" :class="['pending', 'accepted'].includes(dropdownOrder.status) ? 'border-t border-neutral-100' : ''">
          <p class="px-4 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Detail</p>
          <NuxtLink
            :to="`/orders/${dropdownOrder.ticket_number}`"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="dropdownOrder = null"
          >
            <Icon icon="lucide:external-link" class="text-neutral-500 text-base shrink-0" />
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
          <p v-if="!dropdownOrder.requester_lat && !dropdownOrder.requester_lng" class="px-4 py-2 text-xs text-neutral-400 italic">Lokasi tidak tersedia</p>
        </div>

        <!-- Laporan -->
        <div class="border-t border-neutral-100 py-1">
          <p class="px-4 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Lainnya</p>
          <NuxtLink
            :to="`/reports?ticket=${dropdownOrder.ticket_number}`"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            @click="dropdownOrder = null"
          >
            <Icon icon="lucide:file-text" class="text-neutral-500 text-base shrink-0" />
            {{ orderHasReport(dropdownOrder) ? 'Lihat Laporan' : 'Buat Laporan' }}
          </NuxtLink>
          <button
            v-if="!['completed', 'cancelled'].includes(dropdownOrder.status)"
            type="button"
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-emergency-700 hover:bg-emergency-50 transition-colors disabled:opacity-50"
            :disabled="acting === dropdownOrder.id"
            @click="openCancel(dropdownOrder)"
          >
            <Icon icon="lucide:ban" class="text-base shrink-0" />
            Batalkan kejadian
          </button>
        </div>
        </div>
      </template>
    </Teleport>

    <ReassignModal
      v-model:open="showReassign"
      :order="reassignOrder"
      mode="admin"
      @done="refresh()"
    />
    <RejectReasonModal
      v-model:open="showReject"
      :unit-name="rejectTarget?.unit_name"
      @confirm="onRejectConfirm"
    />
    <UiModal
      v-model:open="showCancel"
      title="Batalkan kejadian?"
      description="Tiket akan ditutup sebagai dibatalkan. Pelapor tidak lagi menunggu unit."
    >
      <template #trigger><span /></template>
      <p class="text-sm text-neutral-600">
        Tiket
        <span class="font-mono font-semibold text-neutral-900">{{ cancelTarget?.ticket_number }}</span>
        · {{ cancelTarget?.requester_name || "Pelapor" }}
      </p>
      <template #footer>
        <UiButton variant="secondary" size="sm" :disabled="cancelling" @click="showCancel = false">Batal</UiButton>
        <UiButton variant="danger" size="sm" :loading="cancelling" @click="confirmCancel">
          <Icon icon="lucide:ban" class="text-sm" />
          Ya, batalkan
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

