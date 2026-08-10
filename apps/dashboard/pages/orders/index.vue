<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Pesanan Masuk" });

const { get, authGet } = useApi();

// ── Fetch ────────────────────────────────────────────────────────────────────
const { data: ordersData, pending: ordersPending, refresh } = await useAsyncData(
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

const orders = computed(() => ordersData.value?.data ?? []);
const emergencies = computed(() => emergencyData.value?.data ?? []);
const types = computed(() => typesData.value?.data ?? []);

// ── Filters ───────────────────────────────────────────────────────────────────
const filterStatus = ref("");
const filterType = ref("");
const filterProvince = ref("");
const search = ref("");
const page = ref(1);
const pageSize = ref(20);

// Build province list from emergency data
const provinces = computed(() => {
  const seen = new Set<string>();
  const result: { id: string; name: string }[] = [];
  for (const e of emergencies.value) {
    if (e.address?.province_id && !seen.has(e.address.province_id)) {
      seen.add(e.address.province_id);
      result.push({ id: e.address.province_id, name: e.address.province });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
});

// Emergency lookup map for map markers
const emergencyMap = computed(() => {
  const m: Record<string, any> = {};
  for (const e of emergencies.value) m[e.id] = e;
  return m;
});

// Orders enriched with emergency info
const enriched = computed(() =>
  orders.value.map((o: any) => ({
    ...o,
    _emergency: emergencyMap.value[o.emergency_uuid] ?? null,
  }))
);

const filtered = computed(() => {
  let list = enriched.value;
  if (filterStatus.value) list = list.filter((o: any) => o.status === filterStatus.value);
  if (filterType.value) list = list.filter((o: any) => String(o._emergency?.emergency_type?.id) === filterType.value);
  if (filterProvince.value) list = list.filter((o: any) => o._emergency?.address?.province_id === filterProvince.value);
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

watch([filterStatus, filterType, filterProvince, search], () => { page.value = 1; });

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = computed(() => ({
  total: orders.value.length,
  pending: orders.value.filter((o: any) => o.status === "pending").length,
  inProgress: orders.value.filter((o: any) => o.status === "accepted" || o.status === "in_progress").length,
  completed: orders.value.filter((o: any) => o.status === "completed").length,
  cancelled: orders.value.filter((o: any) => o.status === "cancelled").length,
}));

// ── Notification + auto-refresh ───────────────────────────────────────────────
useOrderNotification(computed(() => stats.value.pending), refresh);

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
  if (!import.meta.client) return false;
  return !!localStorage.getItem(`bb-report-${ticketNum}`);
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
</script>

<template>
  <div>
    <!-- Dropdown overlay -->
    <div v-if="dropdownOrder" class="fixed inset-0 z-[98]" @click="dropdownOrder = null" />

    <!-- Page header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-neutral-900">Pesanan Masuk</h1>
          <p class="text-sm text-neutral-500 mt-0.5">
            <span v-if="ordersPending">Memuat...</span>
            <span v-else>{{ filtered.length }} dari {{ orders.length }} pesanan</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="secondary" @click="exportCSV()">
            <Icon icon="lucide:download" class="text-sm" />
            Export CSV
          </UiButton>
          <UiButton variant="secondary" @click="refresh()">
            <Icon icon="lucide:refresh-cw" class="text-sm" />
            Refresh
          </UiButton>
        </div>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-5">

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="bg-white rounded-xl border border-neutral-200 p-4">
          <p class="text-xs text-neutral-500 font-medium">Total</p>
          <p class="text-2xl font-bold text-neutral-900 mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <p class="text-xs text-yellow-600 font-medium">Pending</p>
          <p class="text-2xl font-bold text-yellow-700 mt-1">{{ stats.pending }}</p>
        </div>
        <div class="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <p class="text-xs text-orange-600 font-medium">Diproses</p>
          <p class="text-2xl font-bold text-orange-700 mt-1">{{ stats.inProgress }}</p>
        </div>
        <div class="bg-green-50 rounded-xl border border-green-200 p-4">
          <p class="text-xs text-green-600 font-medium">Selesai</p>
          <p class="text-2xl font-bold text-green-700 mt-1">{{ stats.completed }}</p>
        </div>
        <div class="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
          <p class="text-xs text-neutral-500 font-medium">Dibatal</p>
          <p class="text-2xl font-bold text-neutral-600 mt-1">{{ stats.cancelled }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-4 sm:px-5 py-3 border-b border-neutral-100 flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[160px] max-w-xs">
            <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm z-10 pointer-events-none" />
            <UiInput v-model="search" placeholder="Cari nama, tiket, unit..." class="pl-8" />
          </div>
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
            <option value="">Semua Provinsi</option>
            <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
          </UiSelect>
          <p class="text-xs text-neutral-400 ml-auto shrink-0">{{ filtered.length }} hasil</p>
        </div>

        <!-- Table -->
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
                <th class="px-6 py-3.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-neutral-100 select-none transition-colors group" @click="sortBy('unit_name')">
                  <div class="flex items-center gap-1">Unit <Icon :icon="sortCol==='unit_name'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='unit_name'?'text-primary-500':'text-neutral-300 group-hover:text-neutral-400']" /></div>
                </th>
                <th class="px-6 py-3.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 select-none transition-colors group" @click="sortBy('status')">
                  <div class="flex items-center gap-1">Status <Icon :icon="sortCol==='status'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='status'?'text-primary-500':'text-neutral-300 group-hover:text-neutral-400']" /></div>
                </th>
                <th class="px-6 py-3.5 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr v-if="ordersPending" v-for="i in 4" :key="`skel-${i}`" class="animate-pulse">
                <td class="px-6 py-5">
                  <div class="h-4 bg-neutral-200 rounded w-32 mb-2" />
                  <div class="h-3 bg-neutral-100 rounded w-20" />
                </td>
                <td class="px-6 py-5">
                  <div class="h-4 bg-neutral-200 rounded w-36 mb-2" />
                  <div class="h-3 bg-neutral-100 rounded w-28" />
                </td>
                <td class="px-6 py-5 hidden md:table-cell">
                  <div class="h-4 bg-neutral-100 rounded w-28 mb-2" />
                  <div class="h-3 bg-neutral-100 rounded w-20" />
                </td>
                <td class="px-6 py-5">
                  <div class="h-6 bg-neutral-100 rounded w-20" />
                </td>
                <td class="px-6 py-5">
                  <div class="h-9 bg-neutral-100 rounded-lg w-20 ml-auto" />
                </td>
              </tr>
              <tr v-else-if="!paginated.length">
                <td colspan="5">
                  <UiEmptyState title="Tidak ada pesanan" description="Belum ada pesanan yang cocok dengan filter.">
                    <template #icon>
                      <Icon icon="lucide:inbox" class="text-neutral-400 text-2xl" />
                    </template>
                  </UiEmptyState>
                </td>
              </tr>
              <tr v-else v-for="order in paginated" :key="order.id" class="hover:bg-neutral-50 transition-colors">
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

                <!-- Unit -->
                <td class="px-6 py-4 hidden md:table-cell">
                  <p class="text-sm font-medium text-neutral-900">{{ order.unit_name }}</p>
                  <p v-if="order._emergency?.address?.regency" class="text-xs text-neutral-400 mt-0.5">
                    {{ order._emergency.address.regency }}
                  </p>
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <span :class="['inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded', statusClass(order.status)]">
                    {{ statusLabel(order.status) }}
                  </span>
                </td>

                <!-- Aksi -->
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

        <!-- Pagination -->
        <div v-if="!ordersPending && filtered.length" class="px-6 py-4 border-t border-neutral-200 bg-white">
          <UiPagination
            v-model:page="page"
            :total-pages="totalPages"
            :total="filtered.length"
            :page-size="pageSize"
          />
        </div>
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
      </div>
    </UiModal>

    <!-- Aksi dropdown (teleported to avoid overflow clipping) -->
    <Teleport to="body">
      <div
        v-if="dropdownOrder"
        class="fixed z-[99] w-52 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden"
        :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }"
        @click.stop
      >
        <!-- Info -->
        <div class="py-1">
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
            {{ hasReport(dropdownOrder.ticket_number) ? 'Lihat Laporan' : 'Buat Laporan' }}
          </NuxtLink>
        </div>
      </div>
    </Teleport>
  </div>
</template>

