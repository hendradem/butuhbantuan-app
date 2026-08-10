<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Overview" });

const { get, authGet } = useApi();

const { data: emergencies } = await useAsyncData("emergencies-all", () =>
  get<{ data: any[] }>("/api/v1/emergency/")
);
const { data: types } = await useAsyncData("types-all", () =>
  get<{ data: any[] }>("/api/v1/emergency/type")
);
const { data: regions } = await useAsyncData("regions-all", () =>
  get<{ data: any[] }>("/api/v1/service/available-region")
);
const { data: feedbackStats } = await useAsyncData("feedback-stats", () =>
  get<{ data: { total: number; unit_helpful_rate: number; app_helpful_rate: number } }>("/api/v1/feedback/stats")
);
const { data: feedbackList } = await useAsyncData("feedback-list", () =>
  authGet<{ data: any[] }>("/api/v1/feedback/")
);
const { data: ordersData } = await useAsyncData("overview-orders", () =>
  authGet<{ data: any[] }>("/api/v1/admin/orders"),
  { server: false }
);
const orders = computed(() => ordersData.value?.data ?? []);

const emergencyMap = computed(() => {
  const m: Record<string, any> = {};
  for (const e of (emergencies.value?.data ?? [])) m[e.id] = e;
  return m;
});

const unitOrderCounts = computed(() => {
  const counts: Record<string, { emergency: any; pending: number; active: number; total: number }> = {};
  for (const o of orders.value) {
    const em = emergencyMap.value[o.emergency_uuid];
    if (!em) continue;
    const coords = em.coordinates as [string, string];
    const lat = parseFloat(coords[1]);
    const lng = parseFloat(coords[0]);
    if (!lat || !lng) continue;
    if (!counts[o.emergency_uuid]) counts[o.emergency_uuid] = { emergency: em, pending: 0, active: 0, total: 0 };
    counts[o.emergency_uuid].total++;
    if (o.status === "pending") counts[o.emergency_uuid].pending++;
    if (o.status === "accepted" || o.status === "in_progress") counts[o.emergency_uuid].active++;
  }
  return Object.values(counts);
});

// ── Map ───────────────────────────────────────────────────────────────────────
const mapEl = ref<HTMLDivElement | null>(null);
let mapInstance: any = null;
let markerLayer: any = null;

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
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(mapInstance);
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
      html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">${pulseHtml}<div style="width:${Math.round(size*0.55)}px;height:${Math.round(size*0.55)}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px ${color}80;position:relative;z-index:1;display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:700;">${entry.total}</div></div>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    });
    const marker = L.marker([lat, lng], { icon });
    marker.bindTooltip(
      `<div style="font-size:12px;line-height:1.5;"><strong>${entry.emergency.name}</strong><br>${entry.total} pesanan · ${entry.pending} pending · ${entry.active} diproses</div>`,
      { direction: "top", offset: [0, -size / 2] }
    );
    markerLayer.addLayer(marker);
  }
}

watch(mapEl, (el) => { if (el && !mapInstance) initMap(); });
watch(unitOrderCounts, async () => {
  if (mapInstance) { const L = (await import("leaflet")).default; updateMarkers(L); }
});
onBeforeUnmount(() => { if (mapInstance) { mapInstance.remove(); mapInstance = null; } });

const stats = computed(() => [
  {
    label: "Total Layanan",
    value: emergencies.value?.data?.length ?? 0,
    sub: "layanan terdaftar",
    icon: "lucide:shield-check",
    color: "text-primary-600 bg-primary-50",
    trend: null,
  },
  {
    label: "Jenis Layanan",
    value: types.value?.data?.length ?? 0,
    sub: "kategori aktif",
    icon: "lucide:tag",
    color: "text-violet-600 bg-violet-50",
    trend: null,
  },
  {
    label: "Wilayah Tercakup",
    value: regions.value?.data?.length ?? 0,
    sub: "kota/kabupaten",
    icon: "lucide:map-pin",
    color: "text-emerald-600 bg-emerald-50",
    trend: null,
  },
  {
    label: "Dispatcher",
    value: emergencies.value?.data?.filter((e: any) => e.is_dispatcher).length ?? 0,
    sub: "pusat panggilan",
    icon: "lucide:phone-call",
    color: "text-orange-600 bg-orange-50",
    trend: null,
  },
  {
    label: "Total Panggilan",
    value: feedbackStats.value?.data?.total ?? 0,
    sub: "dari pengguna",
    icon: "lucide:star",
    color: "text-yellow-600 bg-yellow-50",
    trend: null,
  },
]);

const recentEmergencies = computed(() => (emergencies.value?.data ?? []).slice(0, 8));

const typeBreakdown = computed(() =>
  (types.value?.data ?? []).map((t: any) => ({
    ...t,
    count: (emergencies.value?.data ?? []).filter((e: any) => e.emergency_type?.name === t.name).length,
  }))
);

function typeBadgeColor(name: string) {
  const m: Record<string, string> = {
    Ambulance:    "bg-red-100 text-red-800",
    Damkar:       "bg-orange-100 text-orange-800",
    "Rumah Sakit":"bg-blue-100 text-blue-800",
    SAR:          "bg-green-100 text-green-800",
  };
  return m[name] ?? "bg-neutral-100 text-neutral-700";
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="border-b border-neutral-200 bg-white px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-neutral-900">Overview</h1>
          <p class="text-sm text-neutral-500 mt-0.5">Ringkasan data sistem ButuhBantuan</p>
        </div>
        <UiBadge variant="success" dot>Sistem Aktif</UiBadge>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-6">
      <!-- Stats cards -->
      <div class="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <div v-for="stat in stats" :key="stat.label" class="bg-white rounded-xl border border-neutral-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-medium text-neutral-500 uppercase tracking-wide">{{ stat.label }}</p>
            <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', stat.color]">
              <Icon :icon="stat.icon" class="text-base" />
            </div>
          </div>
          <p class="text-3xl font-bold text-neutral-900">{{ stat.value }}</p>
          <p class="text-xs text-neutral-400 mt-1">{{ stat.sub }}</p>
        </div>
      </div>

      <!-- Map -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon icon="lucide:map" class="text-neutral-400 text-sm" />
            <p class="text-sm font-semibold text-neutral-900">Peta Sebaran Panggilan</p>
          </div>
          <div class="flex items-center gap-3 text-xs text-neutral-500">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Pending</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Diproses</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Selesai</span>
          </div>
        </div>
        <ClientOnly>
          <div ref="mapEl" class="w-full h-[300px] sm:h-[380px]" />
          <template #fallback>
            <div class="w-full h-[300px] sm:h-[380px] bg-neutral-50 flex items-center justify-center text-neutral-400 text-sm gap-2">
              <UiSpinner size="sm" />
              Memuat peta...
            </div>
          </template>
        </ClientOnly>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Recent table -->
        <div class="xl:col-span-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-semibold text-neutral-900">Layanan Terdaftar</h2>
              <p class="text-xs text-neutral-400 mt-0.5">8 layanan pertama</p>
            </div>
            <NuxtLink to="/emergencies" class="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Lihat semua
              <Icon icon="lucide:arrow-right" class="text-xs" />
            </NuxtLink>
          </div>
          <div class="divide-y divide-neutral-100">
            <div
              v-for="item in recentEmergencies"
              :key="item.id"
              class="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 transition-colors"
            >
              <img
                v-if="item.organization_logo"
                :src="item.organization_logo"
                :alt="item.name"
                class="w-8 h-8 rounded-lg object-contain bg-neutral-100 p-1 shrink-0"
              />
              <div v-else class="w-8 h-8 rounded-lg bg-neutral-100 shrink-0 flex items-center justify-center">
                <Icon icon="lucide:shield" class="text-neutral-400 text-sm" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ item.name }}</p>
                <p class="text-xs text-neutral-400 truncate">{{ item.address?.regency }}</p>
              </div>
              <span :class="['text-xs font-medium px-2.5 py-0.5 rounded', typeBadgeColor(item.emergency_type?.name)]">
                {{ item.emergency_type?.name ?? '-' }}
              </span>
            </div>
            <div v-if="!recentEmergencies.length" class="px-5 py-8 text-center text-sm text-neutral-400">
              Belum ada data
            </div>
          </div>
        </div>

        <!-- Type breakdown -->
        <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-neutral-100">
            <h2 class="text-sm font-semibold text-neutral-900">Breakdown per Jenis</h2>
            <p class="text-xs text-neutral-400 mt-0.5">Distribusi layanan aktif</p>
          </div>
          <div class="p-5 space-y-4">
            <div v-for="type in typeBreakdown" :key="type.id">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-sm font-medium text-neutral-700">{{ type.name }}</span>
                <span class="text-sm font-semibold text-neutral-900">{{ type.count }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  class="h-full rounded-full bg-primary-500 transition-all duration-500"
                  :style="{ width: `${Math.min(100, (type.count / Math.max(1, emergencies?.data?.length ?? 1)) * 100)}%` }"
                />
              </div>
            </div>
            <div v-if="!typeBreakdown.length" class="text-center text-sm text-neutral-400 py-4">
              Belum ada data
            </div>
          </div>
        </div>
      </div>

      <!-- Feedback section -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Rating summary -->
        <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-neutral-100">
            <h2 class="text-sm font-semibold text-neutral-900">Statistik Penilaian</h2>
            <p class="text-xs text-neutral-400 mt-0.5">Feedback dari pengguna aplikasi</p>
          </div>
          <div class="p-5 space-y-4">
            <div v-if="!feedbackStats?.data?.total" class="text-center text-sm text-neutral-400 py-6">
              Belum ada penilaian
            </div>
            <template v-else>
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-sm text-neutral-600">Unit membantu</span>
                  <span class="text-sm font-bold text-neutral-900">{{ Math.round(feedbackStats.data.unit_helpful_rate) }}%</span>
                </div>
                <div class="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-green-500 transition-all duration-500"
                    :style="{ width: `${feedbackStats.data.unit_helpful_rate}%` }"
                  />
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-sm text-neutral-600">Aplikasi berguna</span>
                  <span class="text-sm font-bold text-neutral-900">{{ Math.round(feedbackStats.data.app_helpful_rate) }}%</span>
                </div>
                <div class="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-primary-500 transition-all duration-500"
                    :style="{ width: `${feedbackStats.data.app_helpful_rate}%` }"
                  />
                </div>
              </div>
              <p class="text-xs text-neutral-400 pt-1">Dari {{ feedbackStats.data.total }} penilaian</p>
            </template>
          </div>
        </div>

        <!-- Recent feedback -->
        <div class="xl:col-span-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-neutral-100">
            <h2 class="text-sm font-semibold text-neutral-900">Penilaian Terbaru</h2>
            <p class="text-xs text-neutral-400 mt-0.5">100 entri terbaru</p>
          </div>
          <div class="divide-y divide-neutral-100">
            <div v-if="!(feedbackList?.data?.length)" class="px-5 py-8 text-center text-sm text-neutral-400">
              Belum ada penilaian
            </div>
            <div
              v-for="fb in (feedbackList?.data ?? []).slice(0, 8)"
              :key="fb.id"
              class="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 transition-colors"
            >
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center shrink-0', fb.unit_helpful ? 'bg-green-50' : 'bg-red-50']">
                <Icon :icon="fb.unit_helpful ? 'lucide:thumbs-up' : 'lucide:thumbs-down'" :class="['text-sm', fb.unit_helpful ? 'text-green-600' : 'text-red-500']" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ fb.unit_name || '—' }}</p>
                <p class="text-xs text-neutral-400">via {{ fb.call_type === 'whatsapp' ? 'WhatsApp' : 'Telepon' }}</p>
              </div>
              <span :class="['text-xs font-medium px-2.5 py-0.5 rounded', fb.app_helpful === true ? 'bg-primary-100 text-primary-800' : fb.app_helpful === false ? 'bg-red-100 text-red-800' : 'bg-neutral-100 text-neutral-600']">
                App: {{ fb.app_helpful === true ? 'Berguna' : fb.app_helpful === false ? 'Tidak' : 'Biasa' }}
              </span>
            </div>
          </div>
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
}
</style>
