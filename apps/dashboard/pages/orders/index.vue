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
  return list;
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

// ── Map ───────────────────────────────────────────────────────────────────────
const mapEl = ref<HTMLDivElement | null>(null);
let mapInstance: any = null;
let markerLayer: any = null;

// Group active orders by emergency unit for map markers
const unitOrderCounts = computed(() => {
  const counts: Record<string, { emergency: any; pending: number; active: number; total: number }> = {};
  for (const o of orders.value) {
    const em = emergencyMap.value[o.emergency_uuid];
    if (!em) continue;
    const coords = em.coordinates as [string, string]; // [lng, lat]
    const lat = parseFloat(coords[1]);
    const lng = parseFloat(coords[0]);
    if (!lat || !lng) continue;
    if (!counts[o.emergency_uuid]) {
      counts[o.emergency_uuid] = { emergency: em, pending: 0, active: 0, total: 0 };
    }
    counts[o.emergency_uuid].total++;
    if (o.status === "pending") counts[o.emergency_uuid].pending++;
    if (o.status === "accepted" || o.status === "in_progress") counts[o.emergency_uuid].active++;
  }
  return Object.values(counts);
});

function markerColor(entry: { pending: number; active: number }) {
  if (entry.pending > 0) return "#ef4444";
  if (entry.active > 0) return "#f97316";
  return "#22c55e";
}

async function initMap() {
  if (!mapEl.value || mapInstance) return;
  const L = (await import("leaflet")).default;
  await import("leaflet/dist/leaflet.css");

  mapInstance = L.map(mapEl.value, { zoomControl: true, attributionControl: false }).setView([-7.6, 110.1], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors",
  }).addTo(mapInstance);
  markerLayer = L.layerGroup().addTo(mapInstance);
  updateMarkers(L);
}

function updateMarkers(L: any) {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  for (const entry of unitOrderCounts.value) {
    const coords = entry.emergency.coordinates as [string, string];
    const lat = parseFloat(coords[1]);
    const lng = parseFloat(coords[0]);
    if (!lat || !lng) continue;

    const color = markerColor(entry);
    const size = Math.min(20 + entry.total * 4, 44);
    const pulseHtml = entry.pending > 0 || entry.active > 0
      ? `<span class="pulse-ring" style="background:${color}20;animation:pulse-ring 1.6s ease-out infinite;"></span>`
      : "";
    const icon = L.divIcon({
      className: "",
      html: `<div class="pulse-marker" style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
        ${pulseHtml}
        <div style="width:${Math.round(size * 0.55)}px;height:${Math.round(size * 0.55)}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px ${color}80;position:relative;z-index:1;display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:700;">${entry.total}</div>
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    const marker = L.marker([lat, lng], { icon });
    marker.bindTooltip(
      `<div style="font-size:12px;line-height:1.5;">
        <strong>${entry.emergency.name}</strong><br>
        ${entry.total} pesanan · ${entry.pending} pending · ${entry.active} diproses
      </div>`,
      { direction: "top", offset: [0, -size / 2] }
    );
    markerLayer.addLayer(marker);
  }
}

watch(mapEl, (el) => {
  if (el && !mapInstance) initMap();
});

watch(unitOrderCounts, async () => {
  if (mapInstance) {
    const L = (await import("leaflet")).default;
    updateMarkers(L);
  }
});

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});

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
    pending: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    accepted: "bg-blue-50 text-blue-700 ring-blue-200",
    in_progress: "bg-orange-50 text-orange-700 ring-orange-200",
    completed: "bg-green-50 text-green-700 ring-green-200",
    cancelled: "bg-neutral-100 text-neutral-500 ring-neutral-200",
  };
  return m[s] ?? "bg-neutral-100 text-neutral-500 ring-neutral-200";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-lg font-semibold text-neutral-900">Pesanan Masuk</h1>
          <p class="text-sm text-neutral-500 mt-0.5">Semua pesanan dari seluruh unit layanan darurat</p>
        </div>
        <UiButton variant="secondary" size="sm" @click="refresh()">
          <Icon icon="lucide:refresh-cw" class="text-sm" />
          Refresh
        </UiButton>
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

      <!-- Map -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon icon="lucide:map" class="text-neutral-400 text-sm" />
            <p class="text-sm font-medium text-neutral-700">Peta Sebaran Panggilan</p>
          </div>
          <div class="flex items-center gap-3 text-xs text-neutral-500">
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Pending
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> Diproses
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Selesai
            </span>
          </div>
        </div>
        <ClientOnly>
          <div ref="mapEl" class="w-full h-[320px] sm:h-[400px]" />
          <template #fallback>
            <div class="w-full h-[320px] sm:h-[400px] bg-neutral-50 flex items-center justify-center text-neutral-400 text-sm gap-2">
              <UiSpinner size="sm" />
              Memuat peta...
            </div>
          </template>
        </ClientOnly>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-4 sm:px-5 py-3 border-b border-neutral-100 flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[160px] max-w-xs">
            <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari nama, tiket, unit..."
              class="w-full pl-8 pr-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white transition-colors"
            />
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
              <tr class="border-b border-neutral-100 bg-neutral-50">
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tiket / Waktu</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Pelapor</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Unit</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Lokasi / Kondisi</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr v-if="ordersPending">
                <td colspan="5" class="px-5 py-10 text-center">
                  <div class="flex items-center justify-center gap-2 text-neutral-400 text-sm">
                    <UiSpinner size="sm" />
                    Memuat data...
                  </div>
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
                <td class="px-4 sm:px-5 py-3.5">
                  <p class="font-mono text-xs font-medium text-primary-700">{{ order.ticket_number }}</p>
                  <p class="text-xs text-neutral-400 mt-0.5">{{ formatDate(order.created_at) }}</p>
                </td>
                <td class="px-4 sm:px-5 py-3.5">
                  <p class="font-medium text-neutral-900">{{ order.requester_name }}</p>
                  <p class="text-xs text-neutral-400">{{ order.requester_phone }}</p>
                </td>
                <td class="px-4 sm:px-5 py-3.5 hidden md:table-cell">
                  <p class="text-neutral-700 text-sm">{{ order.unit_name }}</p>
                  <p v-if="order._emergency?.address?.regency" class="text-xs text-neutral-400">
                    {{ order._emergency.address.regency }}
                  </p>
                </td>
                <td class="px-4 sm:px-5 py-3.5 hidden lg:table-cell max-w-xs">
                  <p v-if="order.location" class="text-xs text-neutral-600 line-clamp-1">
                    <Icon icon="lucide:map-pin" class="inline text-neutral-400 mr-0.5" />
                    {{ order.location }}
                  </p>
                  <p v-if="order.condition" class="text-xs text-neutral-400 line-clamp-1 mt-0.5">{{ order.condition }}</p>
                  <a
                    v-if="order.requester_lat && order.requester_lng"
                    :href="`https://www.google.com/maps?q=${order.requester_lat},${order.requester_lng}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 mt-1 transition-colors"
                  >
                    <Icon icon="lucide:locate" class="text-xs" />
                    Lihat Lokasi
                  </a>
                </td>
                <td class="px-4 sm:px-5 py-3.5">
                  <span :class="['inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1', statusClass(order.status)]">
                    {{ statusLabel(order.status) }}
                  </span>
                  <p v-if="order.handler_name" class="text-xs text-neutral-400 mt-0.5">{{ order.handler_name }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="!ordersPending && filtered.length" class="px-4 sm:px-5 py-3 border-t border-neutral-100 bg-neutral-50">
          <UiPagination
            v-model:page="page"
            :total-pages="totalPages"
            :total="filtered.length"
            :page-size="pageSize"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes pulse-ring {
  0%   { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}
.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  animation: pulse-ring 1.6s ease-out infinite;
}
</style>
