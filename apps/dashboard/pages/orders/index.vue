<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { etaFromEmergency, formatEta } from "~/utils/eta";
import { placeAnchoredMenu } from "~/utils/placeAnchoredMenu";

definePageMeta({ title: "Pesanan Masuk", keepalive: true });

const { get, authGet } = useApi();
const showCreateTicket = ref(false);

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

onActivated(() => {
  rememberOrderDetailBack("/orders");
  refreshOrders();
});

onMounted(() => {
  rememberOrderDetailBack("/orders");
});

const orders = computed(() => ordersData.value?.data ?? []);
const emergencies = computed(() => emergencyData.value?.data ?? []);
const types = computed(() => typesData.value?.data ?? []);

// ── Filters (persisted so back dari detail tetap di filter terakhir) ───────────
const filterStatus = usePersistedQueryParam("bb-admin-orders-status", "status");
const filterType = usePersistedQueryParam("bb-admin-orders-type", "type");
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

watch([filterStatus, filterType, filterProvince, search, datePeriod, customFrom, customTo], () => { page.value = 1; });

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
    { header: "Kondisi", key: "condition" },
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
</script>

<template>
  <div>
    <!-- Dropdown overlay -->
    <div v-if="dropdownOrder" class="fixed inset-0 z-[98]" @click="dropdownOrder = null" />

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
          <UiButton variant="primary" @click="showCreateTicket = true">
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

    <CreateOrderModal
      v-model:open="showCreateTicket"
      mode="admin"
      :emergencies="emergencies"
      @created="refresh()"
    />

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

      <UiTableCard>
        <template #toolbar>
          <div class="flex flex-wrap items-center gap-2.5">
            <UiSearchInput
              v-model="search"
              placeholder="Cari nama, tiket, unit..."
              class="flex-1 min-w-[160px] max-w-xs"
            />
            <OrderPeriodFilter
              compact
              :period="datePeriod"
              :presets="datePresets"
              :is-custom="isCustomDate"
              :custom-from="customFrom"
              :custom-to="customTo"
              @update:period="setDatePeriod"
              @update:custom-from="customFrom = $event"
              @update:custom-to="customTo = $event"
            />
            <UiSelect v-model="filterStatus" class="!w-auto">
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Diterima</option>
              <option value="in_progress">Diproses</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatal</option>
            </UiSelect>
            <UiSelect v-model="filterType" class="!w-auto">
              <option value="">Semua Jenis</option>
              <option v-for="t in types" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
            </UiSelect>
            <UiSelect v-model="filterProvince" class="!w-auto">
              <option value="">Semua Provinsi (tercakup)</option>
              <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
            </UiSelect>
          </div>
        </template>

        <!-- Table -->
        <UiTable>
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
                <th class="ui-th-sortable hidden md:table-cell" @click="sortBy('unit_name')">
                  <span class="ui-th-label">
                    Unit
                    <Icon :icon="sortCol==='unit_name'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='unit_name'?'text-neutral-700':'text-neutral-300']" />
                  </span>
                </th>
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
                <td class="hidden md:table-cell">
                  <div class="soft-skel h-4 w-28 mb-2" />
                  <div class="soft-skel h-3.5 w-20" />
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
              <tr v-else-if="!paginated.length">
                <td colspan="6">
                  <UiEmptyState title="Tidak ada pesanan" description="Belum ada pesanan yang cocok dengan filter.">
                    <template #icon>
                      <Icon icon="lucide:inbox" class="text-neutral-400 text-2xl" />
                    </template>
                  </UiEmptyState>
                </td>
              </tr>
              <tr v-else v-for="order in paginated" :key="order.id">
                <td>
                  <div class="flex items-center gap-2">
                    <span class="ui-cell-mono">{{ order.ticket_number }}</span>
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

                <td class="hidden md:table-cell">
                  <p class="ui-cell-title">{{ order.unit_name || "—" }}</p>
                  <p v-if="order._emergency?.address?.regency" class="ui-cell-desc">
                    {{ order._emergency.address.regency }}
                  </p>
                </td>

                <td class="hidden sm:table-cell">
                  <p class="ui-cell-title tabular-nums">{{ formatEta(order._eta) }}</p>
                  <p class="ui-cell-desc">ke lokasi</p>
                </td>

                <td>
                  <UiStatusBadge :status="order.status" />
                </td>

                <td class="ui-td-right">
                  <div class="inline-flex items-center justify-end gap-2">
                    <NuxtLink
                      :to="`/orders/${order.ticket_number}`"
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
          <img :src="assetUrl(detailOrder.photo_url)" alt="Foto laporan" class="rounded-lg max-h-56 w-full object-cover" />
        </div>
        <div class="pt-2 border-t border-neutral-100">
          <OrderHistoryTimeline :items="historyItems" :loading="historyLoading" />
        </div>
      </div>
    </UiModal>

    <!-- Aksi dropdown (teleported to avoid overflow clipping) -->
    <Teleport to="body">
      <div
        v-if="dropdownOrder"
        class="fixed z-[99] w-56 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden"
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

