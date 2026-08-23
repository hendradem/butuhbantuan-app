<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { Bar, Doughnut, Line } from "vue-chartjs";
import UnitShareStatsLink from "~/components/unit/UnitShareStatsLink.vue";

definePageMeta({ layout: "unit", title: "Statistik", keepalive: true });

const { unitHeaders, emergencyUUID } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

const PERIOD_VALUES = ["7", "30", "90"] as const;
const { tab: periodTab, setTab: setPeriodTab } = usePersistedTab(
  "bb-unit-stats-period",
  "30",
  PERIOD_VALUES,
  "period",
);
const period = computed(() => Number(periodTab.value) || 30);
function setPeriod(v: number) {
  setPeriodTab(String(v) as "7" | "30" | "90");
}
const periodOptions = [
  { label: "7 Hari", value: 7 },
  { label: "30 Hari", value: 30 },
  { label: "90 Hari", value: 90 },
];

type UnitStats = {
  unit: {
    id: string;
    name: string;
    organization_name: string;
    emergency_type: string;
    regency: string;
    province: string;
    partner_tier: string;
    is_active: boolean;
    is_24_hours: boolean;
  };
  period_days: number;
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    pending: number;
    in_progress: number;
    completion_rate: number;
    cancellation_rate: number;
    avg_response_sec: number;
    avg_arrival_sec: number;
    show_rates: boolean;
  };
  feedback: {
    total: number;
    helpful_rate: number;
    show_rate: boolean;
    recent_quotes?: string[];
  };
  daily_trend?: { date: string; count: number }[];
  by_hour?: { hour: number; count: number }[];
  peak_hour?: { hour: number; count: number } | null;
  referrals?: { hospital_id: string; hospital_name: string; count: number }[];
};

const { data: statsRaw, pending, refresh: refreshRaw, error } = await useAsyncData(
  computed(() => `unit-own-stats-${period.value}`),
  () =>
    $fetch<{ data: UnitStats }>(`${baseUrl}/api/v1/unit/stats`, {
      headers: unitHeaders(),
      query: { period: period.value },
    }).then((r) => r.data),
  {
    server: false,
    watch: [period],
    getCachedData: () => undefined,
  },
);

const refresh = useSoftRefresh(refreshRaw);
const lastStats = shallowRef<UnitStats | null>(null);
watch(statsRaw, (v) => {
  if (v != null) lastStats.value = v;
}, { immediate: true });

const stats = computed(() => statsRaw.value ?? lastStats.value);
const showSkeleton = computed(() => pending.value && !stats.value);
const unit = computed(() => stats.value?.unit);
const orders = computed(() => stats.value?.orders);
const feedback = computed(() => stats.value?.feedback);
const peakHour = computed(() => stats.value?.peak_hour ?? null);

const referrals = computed(() => stats.value?.referrals ?? []);

const placeLabel = computed(() => {
  const parts = [unit.value?.regency, unit.value?.province].filter(Boolean);
  return parts.join(", ");
});

function fmtSec(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)}d`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}j`;
}

function fmtPct(v?: number | null): string {
  if (v == null || !Number.isFinite(v) || v < 0) return "—";
  return `${Number(v).toFixed(1)}%`;
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

const inventoryStats = computed(() => [
  {
    label: "Jenis",
    value: unit.value?.emergency_type || "—",
    icon: "lucide:tag",
    color: "text-violet-600 bg-violet-50",
  },
  {
    label: "Status",
    value: unit.value?.is_active ? "Aktif" : "Nonaktif",
    icon: "lucide:activity",
    color: unit.value?.is_active ? "text-emerald-600 bg-emerald-50" : "text-neutral-500 bg-neutral-100",
  },
  {
    label: "Pending",
    value: orders.value?.pending ?? 0,
    icon: "lucide:clock",
    color: "text-amber-600 bg-amber-50",
  },
  {
    label: "Berjalan",
    value: orders.value?.in_progress ?? 0,
    icon: "lucide:siren",
    color: "text-sky-600 bg-sky-50",
  },
]);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

const trendData = computed(() => {
  const trend = stats.value?.daily_trend ?? [];
  return {
    labels: trend.map((d) => {
      const dt = new Date(d.date);
      return Number.isNaN(dt.getTime())
        ? d.date
        : dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    }),
    datasets: [{
      label: "Tiket",
      data: trend.map((d) => d.count),
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
    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.parsed.y} tiket` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
  },
}));

const statusData = computed(() => {
  const o = orders.value;
  const rows = [
    { status: "completed", count: o?.completed ?? 0 },
    { status: "in_progress", count: o?.in_progress ?? 0 },
    { status: "pending", count: o?.pending ?? 0 },
    { status: "cancelled", count: o?.cancelled ?? 0 },
  ].filter((r) => r.count > 0);
  const labels: Record<string, string> = {
    completed: "Selesai",
    in_progress: "Berjalan",
    pending: "Menunggu",
    cancelled: "Dibatalkan",
  };
  const colors: Record<string, string> = {
    completed: "#22c55e",
    in_progress: "#3b82f6",
    pending: "#f59e0b",
    cancelled: "#9ca3af",
  };
  return {
    labels: rows.map((r) => labels[r.status] || r.status),
    datasets: [{
      data: rows.map((r) => r.count),
      backgroundColor: rows.map((r) => colors[r.status] || "#e5e7eb"),
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

const hourData = computed(() => {
  const hours = stats.value?.by_hour ?? [];
  const counts = Array(24).fill(0);
  hours.forEach((h) => { counts[h.hour] = h.count; });
  const maxVal = Math.max(...counts, 0);
  return {
    labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}`),
    datasets: [{
      label: "Tiket",
      data: counts,
      backgroundColor: counts.map((c) => (c === maxVal && maxVal > 0 ? "#dc2626" : "#fca5a5")),
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
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="min-w-0">
          <h1 class="page-subheader-title">Statistik</h1>
          <p class="page-subheader-desc">
            Ringkasan performa unit · bagikan ke warga / mitra
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
            <button
              v-for="opt in periodOptions"
              :key="opt.value"
              type="button"
              :class="[
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                period === opt.value
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700',
              ]"
              @click="setPeriod(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <UiButton
            variant="secondary"
            :disabled="pending && !!stats"
            @click="refresh()"
          >
            <Icon icon="lucide:refresh-cw" class="text-sm" :class="{ 'animate-spin': pending }" />
            Refresh
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="showSkeleton" class="p-4 sm:p-6 space-y-6">
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
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 soft-skel rounded-xl h-[260px]" />
        <div class="soft-skel rounded-xl h-[260px]" />
      </div>
    </div>

    <div v-else class="p-4 sm:p-6 space-y-6">
      <div
        v-if="error && !stats"
        class="rounded-xl border border-emergency-200 bg-emergency-50 px-4 py-3 text-sm text-emergency-700"
      >
        Gagal memuat statistik. Pastikan API MySQL aktif, lalu refresh.
      </div>

      <!-- Unit strip -->
      <div
        v-if="unit"
        class="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3"
      >
        <div class="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
          <Icon icon="lucide:building-2" class="text-neutral-500" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-neutral-900 truncate">{{ unit.name }}</p>
          <p class="text-xs text-neutral-500 truncate">
            {{ unit.organization_name || unit.emergency_type }}
            <template v-if="placeLabel"> · {{ placeLabel }}</template>
          </p>
        </div>
        <span
          :class="[
            'text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0',
            unit.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500',
          ]"
        >
          {{ unit.is_active ? "Aktif" : "Nonaktif" }}
        </span>
      </div>

      <!-- Inventory -->
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
            <p class="text-lg font-bold text-neutral-900 tabular-nums leading-tight truncate">{{ stat.value }}</p>
          </div>
        </div>
      </div>

      <!-- KPI -->
      <div
        class="grid grid-cols-2 lg:grid-cols-4 gap-4"
        :class="{ 'opacity-60 pointer-events-none': pending && stats }"
      >
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Total Tiket</p>
          <p class="text-3xl font-bold text-neutral-900 mt-2 tabular-nums">{{ orders?.total ?? 0 }}</p>
          <p class="text-sm text-neutral-500 mt-1">{{ period }} hari terakhir</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Completion</p>
          <p
            class="text-3xl font-bold mt-2 tabular-nums"
            :class="(orders?.completion_rate ?? 0) >= 70 ? 'text-green-600' : 'text-emergency-600'"
          >
            {{ fmtPct(orders?.completion_rate) }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">Selesai vs dibatalkan</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Avg Response</p>
          <p class="text-3xl font-bold text-neutral-900 mt-2 tabular-nums">{{ fmtSec(orders?.avg_response_sec) }}</p>
          <p class="text-sm text-neutral-500 mt-1">Masuk → diterima</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Avg Tiba</p>
          <p class="text-3xl font-bold text-neutral-900 mt-2 tabular-nums">{{ fmtSec(orders?.avg_arrival_sec) }}</p>
          <p class="text-sm text-neutral-500 mt-1">Diterima → sampai lokasi</p>
        </div>
      </div>

      <!-- Insights -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            {{ peakHour ? `${peakHour.count} tiket di jam itu` : "Belum ada data" }}
          </p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon icon="lucide:heart-handshake" />
            </div>
            <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Helpful</p>
          </div>
          <p class="text-2xl font-bold text-neutral-900 tabular-nums">
            {{ fmtPct(feedback?.helpful_rate) }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">
            {{ feedback?.total ?? 0 }} feedback warga
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
            :class="(orders?.cancellation_rate ?? 0) > 20 ? 'text-emergency-600' : 'text-neutral-900'"
          >
            {{ fmtPct(orders?.cancellation_rate) }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">
            {{ orders?.cancelled ?? 0 }} dibatalkan dari total
          </p>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-4">Tren Tiket — {{ period }} hari</p>
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
          <p class="text-sm font-semibold text-neutral-900 mb-4">Status Tiket</p>
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

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div class="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col">
          <p class="text-sm font-semibold text-neutral-900 mb-1">Kutipan warga</p>
          <p class="text-xs text-neutral-400 mb-4">Feedback terbaru di periode ini</p>
          <ul v-if="feedback?.recent_quotes?.length" class="space-y-2 flex-1">
            <li
              v-for="(q, i) in feedback.recent_quotes"
              :key="i"
              class="text-sm text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2.5 leading-snug"
            >
              “{{ q }}”
            </li>
          </ul>
          <p v-else class="text-sm text-neutral-400 flex-1">Belum ada komentar di periode ini.</p>
          <NuxtLink
            to="/unit/feedback"
            class="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-neutral-800 hover:underline"
          >
            Arsip feedback
            <Icon icon="lucide:arrow-right" class="text-xs" />
          </NuxtLink>
        </div>
      </div>

      <!-- RS Rujukan -->
      <div class="bg-white rounded-xl border border-neutral-200 p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Icon icon="lucide:hospital" />
          </div>
          <div>
            <p class="text-sm font-semibold text-neutral-900">RS Rujukan</p>
            <p class="text-xs text-neutral-400">{{ period }} hari terakhir</p>
          </div>
        </div>
        <ul v-if="referrals.length" class="space-y-2">
          <li
            v-for="r in referrals"
            :key="r.hospital_id"
            class="flex items-center gap-3"
          >
            <span class="flex-1 text-sm text-neutral-800 truncate">{{ r.hospital_name }}</span>
            <span class="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">{{ r.count }}×</span>
          </li>
        </ul>
        <p v-else class="text-sm text-neutral-400">Belum ada data RS rujukan di periode ini.</p>
      </div>

      <!-- Share -->
      <div class="bg-white rounded-xl border border-neutral-200 p-5 max-w-2xl">
        <p class="text-sm font-semibold text-neutral-900">Bagikan statistik publik</p>
        <p class="text-xs text-neutral-400 mt-0.5 mb-4">
          Link warga — tanpa data pribadi pelapor. Di publik, rate baru tampil jika sampel cukup.
        </p>
        <UnitShareStatsLink
          :emergency-uuid="unit?.id || emergencyUUID"
          :unit-name="unit?.name"
        />
      </div>
    </div>
  </div>
</template>
