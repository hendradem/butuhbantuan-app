<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { Bar, Doughnut, Line } from "vue-chartjs";
import type { HeatPoint } from "~/components/analytics/HeatmapViz.vue";
import { buildJenisChartData, jenisPelayananLabel } from "~/utils/jenisPelayanan";

definePageMeta({ title: "Overview", keepalive: true });

const { get, authGet, baseUrl } = useApi();
const { token } = useAuth();

const PERIOD_VALUES = ["7", "30", "90"] as const;
const { tab: periodTab, setTab: setPeriodTab } = usePersistedTab("bb-overview-period", "30", PERIOD_VALUES, "period");
const period = computed(() => Number(periodTab.value) || 30);
function setPeriod(v: number) {
  setPeriodTab(String(v) as "7" | "30" | "90");
}
const periodOptions = [
  { label: "7 Hari", value: 7 },
  { label: "30 Hari", value: 30 },
  { label: "90 Hari", value: 90 },
];

const HM_VALUES = ["1", "7", "30", "180", "365"] as const;
const { tab: hmPeriodTab, setTab: setHmPeriodTab } = usePersistedTab("bb-overview-hm-period", "30", HM_VALUES, "hm");
const hmPeriod = computed(() => Number(hmPeriodTab.value) || 30);
function setHmPeriod(v: number) {
  setHmPeriodTab(String(v) as (typeof HM_VALUES)[number]);
}
const hmPeriodOptions = [
  { label: "Hari Ini", value: 1 },
  { label: "Minggu", value: 7 },
  { label: "Bulan", value: 30 },
  { label: "6 Bulan", value: 180 },
  { label: "1 Tahun", value: 365 },
];

const { data: emergencies } = await useAsyncData("emergencies-all", () =>
  get<{ data: any[] }>("/api/v1/emergency/")
);
const { data: types } = await useAsyncData("types-all", () =>
  get<{ data: any[] }>("/api/v1/emergency/type")
);
const { data: ordersData } = await useAsyncData(
  "overview-orders",
  () => authGet<{ data: any[] }>("/api/v1/admin/orders"),
  { server: false }
);

const { data: analyticsRaw, pending: analyticsPending } = await useAsyncData(
  computed(() => `overview-analytics-${period.value}`),
  () => $fetch<{ data: any }>(`${baseUrl}/api/v1/admin/analytics?period=${period.value}`, {
    headers: token.value ? { "X-Admin-Key": token.value } : {},
  }).then(r => r.data),
  {
    server: false,
    watch: [period],
    getCachedData: () => undefined,
  },
);

const { data: hmRaw, pending: hmPending, refresh: refreshHeatmapRaw } = await useAsyncData(
  computed(() => `overview-heatmap-${hmPeriod.value}`),
  () =>
    $fetch<{ data: HeatPoint[] }>(
      `${baseUrl}/api/v1/admin/analytics/heatmap?period=${hmPeriod.value}`,
      { headers: token.value ? { "X-Admin-Key": token.value } : {} },
    ).then((r) => r.data ?? []),
  {
    server: false,
    watch: [hmPeriod],
    // Nuxt 3.21 granular cache can reuse stale payload on watch — always refetch by period.
    getCachedData: () => undefined,
  },
);

const refreshHeatmap = useSoftRefresh(refreshHeatmapRaw);

watch(hmPeriod, () => {
  refreshHeatmap();
});

// Live: new orders / status changes → soft-refresh sebaran (popup tetap dari layout)
if (import.meta.client) {
  const onLiveOrder = () => refreshHeatmap();
  onMounted(() => {
    window.addEventListener("bb:admin-order-live", onLiveOrder);
  });
  onUnmounted(() => {
    window.removeEventListener("bb:admin-order-live", onLiveOrder);
  });
}

const orders = computed(() => ordersData.value?.data ?? []);

/** Keep last good analytics so period/refresh never blitzes the overview. */
const lastAnalytics = shallowRef<any>(null);
watch(
  analyticsRaw,
  (v) => {
    if (v != null) lastAnalytics.value = v;
  },
  { immediate: true },
);
const analytics = computed(() => analyticsRaw.value ?? lastAnalytics.value);
const showAnalyticsSkeleton = computed(
  () => analyticsPending.value && lastAnalytics.value == null,
);

const lastHeatmap = shallowRef<HeatPoint[]>([]);
watch(
  hmRaw,
  (v) => {
    if (v != null) lastHeatmap.value = v;
  },
  { immediate: true },
);

const summary = computed(() => analytics.value?.summary ?? {});
const heatmapPoints = computed(() => hmRaw.value ?? lastHeatmap.value);
const showHm = ref(true);

const inventoryStats = computed(() => [
  {
    label: "Layanan",
    value: emergencies.value?.data?.length ?? 0,
    icon: "lucide:shield-check",
    color: "text-primary-600 bg-primary-50",
  },
  {
    label: "Jenis",
    value: types.value?.data?.length ?? 0,
    icon: "lucide:tag",
    color: "text-violet-600 bg-violet-50",
  },
  {
    label: "Dispatcher",
    value: emergencies.value?.data?.filter((e: any) => e.is_dispatcher).length ?? 0,
    icon: "lucide:phone-call",
    color: "text-orange-600 bg-orange-50",
  },
  {
    label: "Pending",
    value: orders.value.filter((o: any) => o.status === "pending").length,
    icon: "lucide:clock",
    color: "text-emergency-600 bg-emergency-50",
  },
]);

const topUnits = computed(() => (analytics.value?.unit_performance ?? []).slice(0, 5));
const regionStats = computed(() => (analytics.value?.region_stats ?? []).slice(0, 5));

/** Slowest accept units (avg created→accepted) — ops heatmap-style insight without new API. */
const slowAcceptUnits = computed(() => {
  const list: any[] = analytics.value?.unit_performance ?? [];
  return [...list]
    .filter((u) => (u.total_orders ?? 0) >= 1 && (u.avg_response_sec ?? 0) > 0)
    .sort((a, b) => (b.avg_response_sec ?? 0) - (a.avg_response_sec ?? 0))
    .slice(0, 6);
});

const slowAcceptByType = computed(() => {
  const list: any[] = analytics.value?.unit_performance ?? [];
  const byType = new Map<string, { type: string; avg: number; n: number; worst: string }>();
  for (const u of list) {
    const type = String(u.emergency_type || "Lainnya").trim() || "Lainnya";
    const sec = Number(u.avg_response_sec) || 0;
    if (sec <= 0) continue;
    const cur = byType.get(type);
    if (!cur) {
      byType.set(type, { type, avg: sec, n: 1, worst: u.unit_name || "—" });
    } else {
      const nextN = cur.n + 1;
      const nextAvg = (cur.avg * cur.n + sec) / nextN;
      byType.set(type, {
        type,
        avg: nextAvg,
        n: nextN,
        worst: sec > cur.avg ? (u.unit_name || cur.worst) : cur.worst,
      });
    }
  }
  return [...byType.values()].sort((a, b) => b.avg - a.avg).slice(0, 5);
});

const peakHour = computed(() => {
  const hours: any[] = analytics.value?.by_hour ?? [];
  if (!hours.length) return null;
  let best = hours[0];
  for (const h of hours) {
    if ((h.count ?? 0) > (best.count ?? 0)) best = h;
  }
  if (!best || !best.count) return null;
  return best;
});

const busiestType = computed(() => {
  const list: any[] = analytics.value?.by_type ?? [];
  if (!list.length) return null;
  return [...list].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))[0] ?? null;
});

const topJenisPelayanan = computed(() => {
  const list: any[] = analytics.value?.by_jenis_pelayanan ?? [];
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  return sorted[0] ?? null;
});

function fmtSec(sec: number): string {
  if (!sec || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)}d`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}j`;
}

function fmtPct(v: number): string {
  return v > 0 ? `${v.toFixed(1)}%` : "—";
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    pending: "Menunggu", accepted: "Diterima", in_progress: "Diproses",
    completed: "Selesai", cancelled: "Dibatal",
  };
  return m[s] ?? s;
}

function statusColor(s: string): string {
  const m: Record<string, string> = {
    pending: "#f59e0b", accepted: "#3b82f6", in_progress: "#f97316",
    completed: "#22c55e", cancelled: "#9ca3af",
  };
  return m[s] ?? "#e5e7eb";
}

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

const trendData = computed(() => {
  const trend: any[] = analytics.value?.daily_trend ?? [];
  return {
    labels: trend.map((d: any) => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    }),
    datasets: [{
      label: "Pesanan",
      data: trend.map((d: any) => d.count),
      borderColor: "#dc2626",
      backgroundColor: "rgba(220,38,38,0.08)",
      borderWidth: 2,
      pointRadius: 2,
      pointBackgroundColor: "#dc2626",
      tension: 0.35,
      fill: true,
    }],
  };
});

const trendOptions = computed(() => ({
  ...chartDefaults,
  plugins: {
    ...chartDefaults.plugins,
    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.parsed.y} pesanan` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
  },
}));

const statusData = computed(() => {
  const breakdown: any[] = analytics.value?.status_breakdown ?? [];
  return {
    labels: breakdown.map((s: any) => statusLabel(s.status)),
    datasets: [{
      data: breakdown.map((s: any) => s.count),
      backgroundColor: breakdown.map((s: any) => statusColor(s.status)),
      borderWidth: 2,
      borderColor: "#fff",
    }],
  };
});

const doughnutOptions = {
  ...chartDefaults,
  plugins: {
    legend: {
      display: true,
      position: "bottom" as const,
      labels: { font: { size: 11 }, boxWidth: 10 },
    },
  },
  cutout: "68%",
};

const typeData = computed(() => {
  const list: any[] = analytics.value?.by_type ?? [];
  return {
    labels: list.map((t: any) => t.type),
    datasets: [{
      label: "Pesanan",
      data: list.map((t: any) => t.count),
      backgroundColor: "#dc2626",
      borderRadius: 4,
    }],
  };
});

const typeOptions = computed(() => ({
  ...chartDefaults,
  indexAxis: "y" as const,
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } },
    y: { ticks: { font: { size: 11 } } },
  },
}));

const jenisData = computed(() => buildJenisChartData(analytics.value?.by_jenis_pelayanan));

const jenisOptions = {
  ...chartDefaults,
  plugins: {
    legend: {
      display: true,
      position: "bottom" as const,
      labels: { font: { size: 11 }, boxWidth: 10 },
    },
  },
  cutout: "62%",
};

const hourData = computed(() => {
  const hours: any[] = analytics.value?.by_hour ?? [];
  const counts = Array(24).fill(0);
  hours.forEach((h: any) => { counts[h.hour] = h.count; });
  const maxVal = Math.max(...counts, 0);
  return {
    labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}`),
    datasets: [{
      label: "Pesanan",
      data: counts,
      backgroundColor: counts.map(c => (c === maxVal && maxVal > 0 ? "#dc2626" : "#fca5a5")),
      borderRadius: 3,
    }],
  };
});

const hourOptions = computed(() => ({
  ...chartDefaults,
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 0 } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
  },
}));

const funnelStages = computed(() => analytics.value?.dispatch_funnel ?? []);
const funnelDrops = computed(() => analytics.value?.funnel_drops ?? []);
const funnelMax = computed(() => Math.max(1, ...funnelStages.value.map((s: any) => s.count ?? 0)));
const accessChannels = computed(() => analytics.value?.access_channels ?? []);

function gpsCoverage(ch: { track_enabled?: number; gps_pinged?: number }): string {
  const en = Number(ch.track_enabled) || 0;
  const ping = Number(ch.gps_pinged) || 0;
  if (en <= 0) return "—";
  return `${Math.round((ping / en) * 100)}% GPS`;
}

function funnelPct(count: number, prev?: number): string {
  if (prev == null || prev <= 0) return count > 0 ? "100%" : "—";
  return `${Math.round((count / prev) * 100)}%`;
}

const FUNNEL_COLORS = ["#fecaca", "#fca5a5", "#f87171", "#ef4444", "#dc2626"];

const slaData = computed(() => {
  const response: any[] = analytics.value?.response_sla ?? [];
  const arrival: any[] = analytics.value?.arrival_sla ?? [];
  const labels = response.length
    ? response.map((b: any) => b.label)
    : arrival.map((b: any) => b.label);
  return {
    labels,
    datasets: [
      {
        label: "Respons (masuk→terima)",
        data: response.map((b: any) => b.count),
        backgroundColor: "#3b82f6",
        borderRadius: 4,
      },
      {
        label: "Tiba (terima→lokasi)",
        data: arrival.map((b: any) => b.count),
        backgroundColor: "#f97316",
        borderRadius: 4,
      },
    ],
  };
});

const slaOptions = computed(() => ({
  ...chartDefaults,
  plugins: {
    legend: {
      display: true,
      position: "bottom" as const,
      labels: { font: { size: 11 }, boxWidth: 10 },
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
  },
}));
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="page-subheader-title">Overview</h1>
          <p class="page-subheader-desc">Ringkasan operasional & sebaran pesanan</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
            <button
              v-for="opt in periodOptions"
              :key="opt.value"
              type="button"
              :class="[
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                period === opt.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
              ]"
              @click="setPeriod(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <UiBadge variant="success" dot>Sistem Aktif</UiBadge>
        </div>
      </div>
    </div>

    <!-- Skeleton (initial load only) -->
    <div v-if="showAnalyticsSkeleton" class="p-4 sm:p-6 space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="i in 4" :key="`inv-${i}`" class="soft-skel rounded-xl h-[68px]" />
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="`kpi-${i}`" class="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
          <div class="soft-skel h-3 w-24" />
          <div class="soft-skel h-8 w-16" />
          <div class="soft-skel h-3 w-20" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="`ins-${i}`" class="soft-skel rounded-xl h-28" />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 soft-skel rounded-xl h-[260px]" />
        <div class="soft-skel rounded-xl h-[260px]" />
      </div>
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="soft-skel h-12 rounded-none" />
        <div class="soft-skel h-[580px] rounded-none" />
      </div>
    </div>

    <div v-else class="p-4 sm:p-6 space-y-6">
      <!-- Attention inbox -->
      <OpsAttentionInbox :orders="orders" />

      <!-- Inventory strip -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="stat in inventoryStats"
          :key="stat.label"
          class="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3"
        >
          <div :class="['w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stat.color]">
            <Icon :icon="stat.icon" class="text-base" />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-neutral-500">{{ stat.label }}</p>
            <p class="text-xl font-bold text-neutral-900 tabular-nums leading-tight">{{ stat.value }}</p>
          </div>
        </div>
      </div>

      <!-- Ops KPI -->
      <div
        class="grid grid-cols-2 lg:grid-cols-4 gap-4"
        :class="{ 'opacity-60 pointer-events-none': analyticsPending && analytics }"
      >
        <template v-if="analytics">
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Total Pesanan</p>
          <p class="text-3xl font-bold text-neutral-900 mt-2 tabular-nums">{{ summary.total_orders?.toLocaleString() ?? 0 }}</p>
          <p class="text-sm text-neutral-500 mt-1">{{ summary.total_this_month ?? 0 }} bulan ini</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Completion</p>
          <p
            class="text-3xl font-bold mt-2 tabular-nums"
            :class="summary.completion_rate >= 70 ? 'text-green-600' : 'text-emergency-600'"
          >
            {{ fmtPct(summary.completion_rate) }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">Selesai vs dibatalkan</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Avg Response</p>
          <p class="text-3xl font-bold text-neutral-900 mt-2 tabular-nums">{{ fmtSec(summary.avg_response_sec) }}</p>
          <p class="text-sm text-neutral-500 mt-1">Masuk → diterima</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Avg Tiba</p>
          <p class="text-3xl font-bold text-neutral-900 mt-2 tabular-nums">{{ fmtSec(summary.avg_arrival_sec) }}</p>
          <p class="text-sm text-neutral-500 mt-1">Diterima → sampai lokasi</p>
        </div>
        </template>
      </div>

      <!-- Insight highlights -->
      <div v-if="analytics" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon icon="lucide:clock-3" />
            </div>
            <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Jam tersibuk</p>
          </div>
          <p class="text-2xl font-bold text-neutral-900 tabular-nums">
            {{ peakHour ? fmtHour(peakHour.hour) : "—" }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">
            {{ peakHour ? `${peakHour.count} pesanan di jam itu` : "Belum ada data" }}
          </p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Icon icon="lucide:siren" />
            </div>
            <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Jenis tersibuk</p>
          </div>
          <p class="text-2xl font-bold text-neutral-900 truncate">
            {{ busiestType?.type || "—" }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">
            {{ busiestType ? `${busiestType.count} pesanan` : "Belum ada data" }}
          </p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Icon icon="lucide:layers" />
            </div>
            <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Jenis pelayanan</p>
          </div>
          <p class="text-2xl font-bold text-neutral-900 truncate">
            {{ topJenisPelayanan ? jenisPelayananLabel(topJenisPelayanan.code) : "—" }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">
            {{ topJenisPelayanan ? `${topJenisPelayanan.count} pesanan` : "Belum ada data" }}
          </p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center">
              <Icon icon="lucide:x-circle" />
            </div>
            <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Cancellation</p>
          </div>
          <p
            class="text-2xl font-bold tabular-nums"
            :class="summary.cancellation_rate > 20 ? 'text-emergency-600' : 'text-neutral-900'"
          >
            {{ fmtPct(summary.cancellation_rate) }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">
            Helpful {{ fmtPct(summary.helpful_rate) }} · Handling {{ fmtSec(summary.avg_handling_sec) }}
          </p>
        </div>
      </div>

      <!-- Charts -->
      <div v-if="analytics" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-4">Tren Pesanan — {{ period }} hari</p>
          <ClientOnly>
            <div style="height: 200px">
              <Line :data="trendData" :options="trendOptions" />
            </div>
            <template #fallback>
              <div class="soft-skel h-[200px] rounded-lg" />
            </template>
          </ClientOnly>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-4">Status Pesanan</p>
          <ClientOnly>
            <div style="height: 200px">
              <Doughnut :data="statusData" :options="doughnutOptions" />
            </div>
            <template #fallback>
              <div class="soft-skel h-[200px] rounded-lg" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <div v-if="analytics" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-1">Jenis Pelayanan</p>
          <p class="text-xs text-neutral-400 mb-4">Darurat · transport · jenazah — {{ period }} hari</p>
          <ClientOnly>
            <div v-if="(analytics?.by_jenis_pelayanan?.length ?? 0) > 0" style="height: 200px">
              <Doughnut :data="jenisData" :options="jenisOptions" />
            </div>
            <p v-else class="h-[200px] flex items-center justify-center text-sm text-neutral-400">
              Belum ada data jenis pelayanan
            </p>
            <template #fallback>
              <div class="soft-skel h-[200px] rounded-lg" />
            </template>
          </ClientOnly>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-4">Pesanan per Jenis Layanan</p>
          <ClientOnly>
            <div :style="{ height: Math.max(140, (analytics?.by_type?.length ?? 1) * 36) + 'px' }">
              <Bar :data="typeData" :options="typeOptions" />
            </div>
            <template #fallback>
              <div class="soft-skel h-40 rounded-lg" />
            </template>
          </ClientOnly>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-1">Peak Hours</p>
          <p class="text-xs text-neutral-400 mb-4">Distribusi 00:00–23:00</p>
          <ClientOnly>
            <div style="height: 180px">
              <Bar :data="hourData" :options="hourOptions" />
            </div>
            <template #fallback>
              <div class="soft-skel h-[180px] rounded-lg" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- Funnel + SLA -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-1">Funnel Dispatch</p>
          <p class="text-xs text-neutral-400 mb-4">{{ period }} hari · masuk → selesai</p>
          <div v-if="!funnelStages.length" class="h-40 flex items-center justify-center text-sm text-neutral-400">
            Belum ada data
          </div>
          <div v-else class="space-y-2.5">
            <div
              v-for="(stage, idx) in funnelStages"
              :key="stage.stage"
              class="flex items-center gap-3"
            >
              <div class="w-24 shrink-0">
                <p class="text-xs font-medium text-neutral-700">{{ stage.label }}</p>
                <p class="text-[10px] text-neutral-400 tabular-nums">
                  <template v-if="idx === 0">total periode</template>
                  <template v-else>{{ funnelPct(stage.count, funnelStages[(idx as number) - 1]?.count) }} lanjut</template>
                </p>
              </div>
              <div class="flex-1 min-w-0">
                <div class="h-8 rounded-lg bg-neutral-50 overflow-hidden flex items-center">
                  <div
                    class="h-full rounded-lg flex items-center justify-end px-2 min-w-[2rem] transition-all"
                    :style="{
                      width: `${Math.max(8, Math.round((stage.count / funnelMax) * 100))}%`,
                      background: FUNNEL_COLORS[idx as number] ?? '#dc2626',
                    }"
                  >
                    <span class="text-xs font-bold text-white tabular-nums drop-shadow-sm">{{ stage.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="funnelDrops.length" class="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap gap-2">
            <div
              v-for="drop in funnelDrops"
              :key="drop.key"
              class="px-2.5 py-1.5 rounded-lg bg-neutral-50 border border-neutral-100"
            >
              <p class="text-[10px] text-neutral-400 leading-none mb-0.5">{{ drop.label }}</p>
              <p class="text-sm font-semibold text-neutral-800 tabular-nums">{{ drop.count }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-1">SLA Distribution</p>
          <p class="text-xs text-neutral-400 mb-4">{{ period }} hari · bucket waktu respons & tiba</p>
          <ClientOnly>
            <div style="height: 220px">
              <Bar :data="slaData" :options="slaOptions" />
            </div>
            <template #fallback>
              <div class="soft-skel h-[220px] rounded-lg" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- Access channel: WA-only vs dashboard -->
      <div class="bg-white rounded-xl border border-neutral-200 p-5">
        <p class="text-sm font-semibold text-neutral-900 mb-1">Kanal unit</p>
        <p class="text-xs text-neutral-400 mb-4">
          {{ period }} hari · WA only vs dashboard login · accept rate &amp; waktu penanganan
        </p>
        <div v-if="!accessChannels.length" class="h-24 flex items-center justify-center text-sm text-neutral-400">
          Belum ada data
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="ch in accessChannels"
            :key="ch.key"
            class="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4 space-y-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-neutral-900">{{ ch.label }}</p>
                <p class="text-xs text-neutral-400 mt-0.5 tabular-nums">
                  {{ ch.orders }} tiket · accept {{ fmtPct(ch.accept_rate) }}
                </p>
              </div>
              <span
                class="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                :class="ch.key === 'wa_only'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-sky-100 text-sky-800'"
              >
                {{ ch.key === 'wa_only' ? 'WA' : 'Dash' }}
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-lg bg-white border border-neutral-100 px-2 py-2">
                <p class="text-[10px] text-neutral-400">Terima</p>
                <p class="text-sm font-semibold text-neutral-900 tabular-nums">{{ fmtSec(ch.avg_accept_sec) }}</p>
              </div>
              <div class="rounded-lg bg-white border border-neutral-100 px-2 py-2">
                <p class="text-[10px] text-neutral-400">Tiba</p>
                <p class="text-sm font-semibold text-neutral-900 tabular-nums">{{ fmtSec(ch.avg_arrive_sec) }}</p>
              </div>
              <div class="rounded-lg bg-white border border-neutral-100 px-2 py-2">
                <p class="text-[10px] text-neutral-400">Selesai</p>
                <p class="text-sm font-semibold text-neutral-900 tabular-nums">{{ fmtSec(ch.avg_complete_sec) }}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500 tabular-nums">
              <span>Diterima {{ ch.accepted }}</span>
              <span>Tiba {{ ch.arrived }}</span>
              <span>Selesai {{ ch.completed }}</span>
              <span>{{ gpsCoverage(ch) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sebaran pesanan (HeatmapViz) — full width -->
      <div>
        <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div>
            <p class="text-sm font-semibold text-neutral-900">Sebaran Pesanan</p>
            <p class="text-xs text-neutral-400 mt-0.5">
              Lokasi pemohon + densitas — filter wilayah/jenis, klik marker atau card untuk detail
            </p>
          </div>
          <div class="flex items-center gap-3 ml-auto">
            <!-- Heatmap layer toggle -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium" :class="showHm ? 'text-neutral-700' : 'text-neutral-400'">Heatmap</span>
              <button
                type="button"
                role="switch"
                :aria-checked="showHm"
                :title="showHm ? 'Sembunyikan densitas' : 'Tampilkan densitas'"
                class="relative inline-flex h-5 w-9 shrink-0 items-center cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                :class="showHm ? 'bg-emergency-500' : 'bg-neutral-300'"
                @click="showHm = !showHm"
              >
                <span
                  aria-hidden="true"
                  class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
                  :class="showHm ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>
            <!-- Period selector -->
            <div class="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
              <button
                v-for="opt in hmPeriodOptions"
                :key="opt.value"
                type="button"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  hmPeriod === opt.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
                ]"
                @click="setHmPeriod(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
        <ClientOnly>
          <HeatmapViz
            :points="heatmapPoints"
            :loading="hmPending && lastHeatmap.length === 0"
            :show-heat="showHm"
            live
            @update:show-heat="showHm = $event"
          />
          <template #fallback>
            <div class="rounded-xl border border-neutral-200 overflow-hidden">
              <div class="soft-skel h-12 rounded-none" />
              <div class="soft-skel h-[580px] rounded-none" />
            </div>
          </template>
        </ClientOnly>
      </div>

      <!-- Slow accept insight -->
      <div
        v-if="slowAcceptUnits.length || slowAcceptByType.length"
        class="grid grid-cols-1 xl:grid-cols-2 gap-4"
      >
        <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-neutral-100">
            <p class="text-sm font-semibold text-neutral-900">Unit lambat accept</p>
            <p class="text-xs text-neutral-400 mt-0.5">
              {{ period }} hari · rata-rata masuk → diterima (tertinggi dulu)
            </p>
          </div>
          <div class="divide-y divide-neutral-50">
            <div
              v-if="!slowAcceptUnits.length"
              class="px-5 py-8 text-center text-sm text-neutral-400"
            >
              Belum ada data respons
            </div>
            <div
              v-for="(unit, idx) in slowAcceptUnits"
              :key="unit.emergency_uuid"
              class="px-5 py-3 flex items-center gap-3"
            >
              <span
                class="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                :class="idx < 3 ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-500'"
              >
                {{ idx + 1 }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ unit.unit_name || "—" }}</p>
                <p class="text-xs text-neutral-400 truncate">
                  {{ unit.emergency_type || "—" }} · {{ unit.regency || "—" }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p
                  class="text-sm font-semibold tabular-nums"
                  :class="unit.avg_response_sec >= 900 ? 'text-emergency-600' : 'text-neutral-900'"
                >
                  {{ fmtSec(unit.avg_response_sec) }}
                </p>
                <p class="text-[11px] text-neutral-400 tabular-nums">{{ unit.total_orders }} tiket</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-neutral-100">
            <p class="text-sm font-semibold text-neutral-900">Accept lambat per jenis</p>
            <p class="text-xs text-neutral-400 mt-0.5">Agregat rata-rata respons antar unit sejenis</p>
          </div>
          <div class="divide-y divide-neutral-50">
            <div
              v-if="!slowAcceptByType.length"
              class="px-5 py-8 text-center text-sm text-neutral-400"
            >
              Belum ada data
            </div>
            <div
              v-for="row in slowAcceptByType"
              :key="row.type"
              class="px-5 py-3 flex items-center gap-3"
            >
              <div class="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Icon icon="lucide:timer" class="text-sm" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ row.type }}</p>
                <p class="text-xs text-neutral-400 truncate">
                  {{ row.n }} unit · paling lambat: {{ row.worst }}
                </p>
              </div>
              <p class="text-sm font-semibold text-neutral-900 tabular-nums shrink-0">
                {{ fmtSec(row.avg) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Top units + regions -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-neutral-100">
            <p class="text-sm font-semibold text-neutral-900">Top unit</p>
            <p class="text-xs text-neutral-400 mt-0.5">{{ period }} hari · by volume</p>
          </div>
          <div class="divide-y divide-neutral-50" :class="{ 'opacity-60': analyticsPending && analytics }">
            <div v-if="!topUnits.length" class="px-5 py-8 text-center text-sm text-neutral-400">Belum ada data</div>
            <div
              v-for="(unit, idx) in topUnits"
              :key="unit.emergency_uuid"
              class="px-5 py-3 flex items-center gap-3"
            >
              <span class="w-6 h-6 rounded-full bg-neutral-100 text-xs font-bold text-neutral-500 flex items-center justify-center shrink-0">
                {{ (idx as number) + 1 }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ unit.unit_name || "—" }}</p>
                <p class="text-xs text-neutral-400 truncate">{{ unit.regency || "—" }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-semibold text-neutral-900 tabular-nums">{{ unit.total_orders }}</p>
                <p class="text-[11px] text-neutral-400 tabular-nums">
                  {{ fmtPct(unit.completion_rate) }} · tiba {{ fmtSec(unit.avg_arrival_sec) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-neutral-100">
            <p class="text-sm font-semibold text-neutral-900">Wilayah aktif</p>
            <p class="text-xs text-neutral-400 mt-0.5">Volume pesanan tertinggi</p>
          </div>
          <div class="divide-y divide-neutral-50" :class="{ 'opacity-60': analyticsPending && analytics }">
            <div v-if="!regionStats.length" class="px-5 py-8 text-center text-sm text-neutral-400">Belum ada data</div>
            <div
              v-for="(region, idx) in regionStats"
              :key="idx"
              class="px-5 py-3"
            >
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ region.regency || "Tidak diketahui" }}</p>
                <span class="text-sm font-semibold text-neutral-700 tabular-nums shrink-0">{{ region.count }}</span>
              </div>
              <div class="w-full bg-neutral-100 rounded-full h-1.5">
                <div
                  class="h-1.5 rounded-full bg-emergency-500"
                  :style="{ width: `${Math.round(region.count / (regionStats[0]?.count || 1) * 100)}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
