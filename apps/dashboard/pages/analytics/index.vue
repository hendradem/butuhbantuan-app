<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { Bar, Line, Doughnut } from "vue-chartjs";

definePageMeta({ title: "Analitik" });

const { authGet, baseUrl } = useApi();
const { token } = useAuth();

// ── Period selector ───────────────────────────────────────────────────────────
const period = ref(30);
const periodOptions = [
  { label: "7 Hari", value: 7 },
  { label: "30 Hari", value: 30 },
  { label: "90 Hari", value: 90 },
];

// ── Heatmap period ────────────────────────────────────────────────────────────
const hmPeriod = ref(30);
const hmPeriodOptions = [
  { label: "Hari Ini", value: 1 },
  { label: "Minggu", value: 7 },
  { label: "Bulan", value: 30 },
  { label: "6 Bulan", value: 180 },
  { label: "1 Tahun", value: 365 },
];

// ── Data fetches ──────────────────────────────────────────────────────────────
const { data: raw, pending, refresh } = await useAsyncData(
  "analytics",
  () => $fetch<{ data: any }>(`${baseUrl}/api/v1/admin/analytics?period=${period.value}`, {
    headers: token.value ? { "X-Admin-Key": token.value } : {},
  }).then(r => r.data),
  { server: false, watch: [period] }
);

interface HeatPoint { lat: number; lng: number; count: number; type: string }
const { data: hmRaw, pending: hmPending } = await useAsyncData(
  "analytics-heatmap",
  () => $fetch<{ data: HeatPoint[] }>(`${baseUrl}/api/v1/admin/analytics/heatmap?period=${hmPeriod.value}`, {
    headers: token.value ? { "X-Admin-Key": token.value } : {},
  }).then(r => r.data ?? []),
  { server: false, watch: [hmPeriod] }
);
const heatmapPoints = computed(() => hmRaw.value ?? []);

const analytics = computed(() => raw.value ?? null);
const summary = computed(() => analytics.value?.summary ?? {});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSec(sec: number): string {
  if (!sec || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)}d`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}j`;
}

function fmtPct(v: number): string {
  return v > 0 ? `${v.toFixed(1)}%` : "—";
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

// ── Chart data ────────────────────────────────────────────────────────────────
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

// Daily trend line chart
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
      pointRadius: 3,
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
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } },
  },
}));

// Status doughnut
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
  plugins: { legend: { display: true, position: "bottom" as const, labels: { font: { size: 11 }, boxWidth: 12 } } },
  cutout: "65%",
};

// By type bar chart
const typeData = computed(() => {
  const types: any[] = analytics.value?.by_type ?? [];
  return {
    labels: types.map((t: any) => t.type),
    datasets: [{
      label: "Pesanan",
      data: types.map((t: any) => t.count),
      backgroundColor: "#dc2626",
      borderRadius: 4,
    }],
  };
});
const typeOptions = computed(() => ({
  ...chartDefaults,
  indexAxis: "y" as const,
  plugins: { ...chartDefaults.plugins },
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } },
    y: { ticks: { font: { size: 11 } } },
  },
}));

// Peak hours bar chart
const hourData = computed(() => {
  const hours: any[] = analytics.value?.by_hour ?? [];
  // Fill all 24 hours
  const counts = Array(24).fill(0);
  hours.forEach((h: any) => { counts[h.hour] = h.count; });
  return {
    labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`),
    datasets: [{
      label: "Pesanan",
      data: counts,
      backgroundColor: counts.map((c, i) => {
        const maxVal = Math.max(...counts);
        return c === maxVal && maxVal > 0 ? "#dc2626" : "#fca5a5";
      }),
      borderRadius: 4,
    }],
  };
});
const hourOptions = computed(() => ({
  ...chartDefaults,
  plugins: { ...chartDefaults.plugins },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } },
  },
}));

// ── Unit performance table ─────────────────────────────────────────────────────
const unitSearch = ref("");
const filteredUnits = computed(() => {
  const units: any[] = analytics.value?.unit_performance ?? [];
  if (!unitSearch.value) return units;
  const q = unitSearch.value.toLowerCase();
  return units.filter((u: any) =>
    u.unit_name.toLowerCase().includes(q) || u.emergency_type.toLowerCase().includes(q) || u.regency.toLowerCase().includes(q)
  );
});

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportUnitCSV() {
  const units: any[] = analytics.value?.unit_performance ?? [];
  const BOM = "﻿";
  const header = "Unit,Jenis Layanan,Wilayah,Total Pesanan,Selesai,Dibatal,Completion Rate,Avg Response,Helpful Rate";
  const rows = units.map((u: any) =>
    [
      u.unit_name, u.emergency_type, u.regency, u.total_orders, u.completed, u.cancelled,
      `${u.completion_rate.toFixed(1)}%`, fmtSec(u.avg_response_sec), `${u.helpful_rate.toFixed(1)}%`,
    ].join(",")
  );
  const blob = new Blob([BOM + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `analytics-unit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-xl font-semibold text-neutral-900">Analitik & Laporan</h1>
          <p class="text-sm text-neutral-500 mt-0.5">Data operasional layanan darurat</p>
        </div>
        <!-- Period selector -->
        <div class="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
          <button
            v-for="opt in periodOptions"
            :key="opt.value"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              period === opt.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
            ]"
            @click="period = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="pending" class="p-4 sm:p-6 space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 8" :key="i" class="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse">
          <div class="h-3 bg-neutral-100 rounded w-24 mb-3" />
          <div class="h-7 bg-neutral-200 rounded w-16" />
        </div>
      </div>
    </div>

    <div v-else-if="analytics" class="p-4 sm:p-6 space-y-6">

      <!-- ── KPI Cards ──────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Total Pesanan</p>
          <p class="text-3xl font-bold text-neutral-900 mt-2">{{ summary.total_orders?.toLocaleString() ?? 0 }}</p>
          <p class="text-sm text-neutral-500 mt-1">{{ summary.total_this_month ?? 0 }} bulan ini</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Completion Rate</p>
          <p class="text-3xl font-bold mt-2" :class="summary.completion_rate >= 70 ? 'text-green-600' : 'text-emergency-600'">
            {{ fmtPct(summary.completion_rate) }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">Selesai / (Selesai + Batal)</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Avg Response Time</p>
          <p class="text-3xl font-bold text-neutral-900 mt-2">{{ fmtSec(summary.avg_response_sec) }}</p>
          <p class="text-sm text-neutral-500 mt-1">Masuk → Diterima</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Avg Handling Time</p>
          <p class="text-3xl font-bold text-neutral-900 mt-2">{{ fmtSec(summary.avg_handling_sec) }}</p>
          <p class="text-sm text-neutral-500 mt-1">Diterima → Selesai</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Helpful Rate</p>
          <p class="text-3xl font-bold mt-2" :class="summary.helpful_rate >= 70 ? 'text-green-600' : 'text-yellow-600'">
            {{ fmtPct(summary.helpful_rate) }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">Feedback positif unit</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Cancellation Rate</p>
          <p class="text-3xl font-bold mt-2" :class="summary.cancellation_rate > 20 ? 'text-emergency-600' : 'text-neutral-900'">
            {{ fmtPct(summary.cancellation_rate) }}
          </p>
          <p class="text-sm text-neutral-500 mt-1">Pesanan dibatalkan</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Unit Aktif</p>
          <div class="flex items-baseline gap-2 mt-2">
            <p class="text-3xl font-bold text-green-600">{{ summary.active_units ?? 0 }}</p>
            <p class="text-sm text-neutral-400">/ {{ summary.total_units ?? 0 }}</p>
          </div>
          <p class="text-sm text-neutral-500 mt-1">Unit layanan online</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col justify-between">
          <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Periode</p>
          <p class="text-2xl font-bold text-neutral-900 mt-2">{{ period }} Hari</p>
          <button class="mt-2 text-xs text-primary-600 hover:text-primary-700 text-left flex items-center gap-1" @click="refresh()">
            <Icon icon="lucide:refresh-cw" class="text-xs" />
            Perbarui data
          </button>
        </div>
      </div>

      <!-- ── Daily Trend + Status Breakdown ────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Line chart -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-4">Tren Pesanan — {{ period }} Hari Terakhir</p>
          <ClientOnly>
            <div style="height: 220px">
              <Line :data="trendData" :options="trendOptions" />
            </div>
            <template #fallback>
              <div class="h-[220px] bg-neutral-50 rounded-lg animate-pulse" />
            </template>
          </ClientOnly>
        </div>
        <!-- Doughnut -->
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-4">Status Pesanan</p>
          <ClientOnly>
            <div style="height: 220px">
              <Doughnut :data="statusData" :options="doughnutOptions" />
            </div>
            <template #fallback>
              <div class="h-[220px] bg-neutral-50 rounded-lg animate-pulse" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- ── By Type + Peak Hours ───────────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- By emergency type -->
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-4">Pesanan per Jenis Layanan</p>
          <ClientOnly>
            <div :style="{ height: Math.max(160, (analytics?.by_type?.length ?? 1) * 36) + 'px' }">
              <Bar :data="typeData" :options="typeOptions" />
            </div>
            <template #fallback>
              <div class="h-48 bg-neutral-50 rounded-lg animate-pulse" />
            </template>
          </ClientOnly>
        </div>
        <!-- Peak hours -->
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-sm font-semibold text-neutral-900 mb-1">Peak Hours</p>
          <p class="text-xs text-neutral-400 mb-4">Distribusi pesanan per jam (00:00–23:00)</p>
          <ClientOnly>
            <div style="height: 180px">
              <Bar :data="hourData" :options="hourOptions" />
            </div>
            <template #fallback>
              <div class="h-48 bg-neutral-50 rounded-lg animate-pulse" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- ── Unit Performance Table ─────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p class="text-sm font-semibold text-neutral-900">Performa Unit</p>
            <p class="text-xs text-neutral-400 mt-0.5">{{ filteredUnits.length }} unit dengan data pesanan</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
              <input
                v-model="unitSearch"
                placeholder="Cari unit..."
                class="pl-8 pr-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 w-48"
              />
            </div>
            <UiButton variant="secondary" size="sm" @click="exportUnitCSV">
              <Icon icon="lucide:download" class="text-sm" />
              Export CSV
            </UiButton>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-neutral-100 bg-neutral-50">
                <th class="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Unit</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Jenis</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Wilayah</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Selesai</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Batal</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Completion</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Response</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Helpful</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-50">
              <tr v-if="!filteredUnits.length">
                <td colspan="9">
                  <UiEmptyState title="Tidak ada data" description="Belum ada unit dengan pesanan." >
                    <template #icon><Icon icon="lucide:bar-chart-2" class="text-neutral-400 text-2xl" /></template>
                  </UiEmptyState>
                </td>
              </tr>
              <tr
                v-for="(unit, idx) in filteredUnits"
                :key="unit.emergency_uuid"
                class="hover:bg-neutral-50 transition-colors"
              >
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-500 shrink-0">
                      {{ idx + 1 }}
                    </span>
                    <span class="font-medium text-neutral-900 line-clamp-1">{{ unit.unit_name || '—' }}</span>
                  </div>
                </td>
                <td class="px-5 py-3.5 hidden md:table-cell text-neutral-500 text-xs">{{ unit.emergency_type || '—' }}</td>
                <td class="px-5 py-3.5 hidden lg:table-cell text-neutral-500 text-xs">{{ unit.regency || '—' }}</td>
                <td class="px-5 py-3.5 text-right font-semibold text-neutral-900">{{ unit.total_orders }}</td>
                <td class="px-5 py-3.5 text-right text-green-600 font-medium hidden sm:table-cell">{{ unit.completed }}</td>
                <td class="px-5 py-3.5 text-right text-neutral-400 hidden sm:table-cell">{{ unit.cancelled }}</td>
                <td class="px-5 py-3.5 text-right">
                  <span :class="['inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full', unit.completion_rate >= 70 ? 'bg-green-50 text-green-700' : unit.completion_rate >= 40 ? 'bg-yellow-50 text-yellow-700' : 'bg-emergency-50 text-emergency-700']">
                    {{ unit.completion_rate > 0 ? unit.completion_rate.toFixed(1) + '%' : '—' }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right text-neutral-600 text-xs hidden md:table-cell">{{ fmtSec(unit.avg_response_sec) }}</td>
                <td class="px-5 py-3.5 text-right text-xs hidden lg:table-cell">
                  <span :class="unit.helpful_rate > 0 ? (unit.helpful_rate >= 70 ? 'text-green-600' : 'text-yellow-600') : 'text-neutral-400'">
                    {{ unit.helpful_rate > 0 ? unit.helpful_rate.toFixed(1) + '%' : '—' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Heatmap ────────────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p class="text-sm font-semibold text-neutral-900">Sebaran Pesanan (Heatmap)</p>
            <p class="text-xs text-neutral-400 mt-0.5">Kepadatan pesanan berdasarkan lokasi unit penanganan</p>
          </div>
          <!-- Heatmap period selector -->
          <div class="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
            <button
              v-for="opt in hmPeriodOptions"
              :key="opt.value"
              :class="[
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                hmPeriod === opt.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
              ]"
              @click="hmPeriod = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="p-4">
          <ClientOnly>
            <HeatmapViz :points="heatmapPoints" :loading="hmPending" />
            <template #fallback>
              <div class="rounded-xl bg-neutral-100 animate-pulse" style="height: 480px" />
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- ── Regional Distribution ──────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100">
          <p class="text-sm font-semibold text-neutral-900">Sebaran Pesanan per Wilayah</p>
          <p class="text-xs text-neutral-400 mt-0.5">Berdasarkan lokasi unit penanganan</p>
        </div>
        <div class="divide-y divide-neutral-50">
          <template v-if="analytics.region_stats?.length">
            <div
              v-for="(region, idx) in analytics.region_stats"
              :key="idx"
              class="px-5 py-3 flex items-center gap-4"
            >
              <span class="text-xs font-bold text-neutral-400 w-6 text-right shrink-0">{{ (idx as number) + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 mb-1">
                  <span class="text-sm font-semibold text-neutral-900 truncate">{{ region.regency || 'Tidak Diketahui' }}</span>
                  <span v-if="region.province" class="text-xs text-neutral-400 truncate hidden sm:inline">{{ region.province }}</span>
                </div>
                <div class="w-full bg-neutral-100 rounded-full h-1.5">
                  <div
                    class="h-1.5 rounded-full bg-emergency-500 transition-all"
                    :style="{ width: `${Math.round(region.count / (analytics.region_stats[0]?.count || 1) * 100)}%` }"
                  />
                </div>
              </div>
              <span class="text-sm font-bold text-neutral-700 shrink-0 w-12 text-right">{{ region.count }}</span>
            </div>
          </template>
          <div v-else class="px-5 py-8 text-center text-sm text-neutral-400">
            Belum ada data wilayah
          </div>
        </div>
      </div>

    </div>

    <!-- Empty / error state -->
    <div v-else class="flex items-center justify-center p-12">
      <UiEmptyState title="Data belum tersedia" description="Analytics hanya tersedia di mode MySQL.">
        <template #icon><Icon icon="lucide:bar-chart-2" class="text-neutral-400 text-3xl" /></template>
      </UiEmptyState>
    </div>
  </div>
</template>
