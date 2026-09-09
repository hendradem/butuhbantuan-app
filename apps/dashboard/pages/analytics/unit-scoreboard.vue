<script setup lang="ts">
/**
 * Skor performa per unit. Admin melihat total tiket, response/arrival time,
 * completion & helpful rate. Sortable, dengan highlight untuk unit di bawah
 * threshold sehingga follow-up jadi jelas.
 */
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Skor Performa Unit" });

type ScoreEntry = {
  emergency_uuid: string;
  name: string;
  organization_name?: string;
  emergency_type?: string;
  regency?: string;
  province?: string;
  partner_tier?: string;
  is_active: boolean;
  total_orders: number;
  completed: number;
  cancelled: number;
  pending: number;
  in_progress: number;
  completion_rate: number;
  cancellation_rate: number;
  avg_response_sec: number;
  avg_arrival_sec: number;
  feedback_total: number;
  feedback_helpful: number;
  helpful_rate: number;
};

const { authGet } = useApi();

const periodOptions = [
  { value: 7, label: "7 hari" },
  { value: 30, label: "30 hari" },
  { value: 90, label: "90 hari" },
];
const period = ref(30);

// Thresholds ambang bawah untuk highlight — bisa disesuaikan nanti via config.
const THRESHOLD_RESPONSE_SEC = 300; // 5 menit
const THRESHOLD_COMPLETION_RATE = 70; // %
const THRESHOLD_HELPFUL_RATE = 60; // %

type SortKey =
  | "name"
  | "total_orders"
  | "completion_rate"
  | "cancellation_rate"
  | "avg_response_sec"
  | "avg_arrival_sec"
  | "helpful_rate";
const sortKey = ref<SortKey>("total_orders");
const sortDir = ref<"asc" | "desc">("desc");

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = key === "name" ? "asc" : "desc";
  }
}

const search = ref("");
const showOnlyBelow = ref(false);

const { data, pending, error, refresh } = await useAsyncData(
  "admin-unit-scoreboard",
  () =>
    authGet<{ data: { period_days: number; units: ScoreEntry[] } }>(
      `/api/v1/admin/analytics/unit-scoreboard`,
      { period: period.value },
    ),
  { watch: [period] },
);

const rows = computed<ScoreEntry[]>(() => data.value?.data?.units ?? []);

const filtered = computed<ScoreEntry[]>(() => {
  const q = search.value.trim().toLowerCase();
  return rows.value.filter((r) => {
    if (q) {
      const hay = [r.name, r.organization_name, r.regency, r.province, r.emergency_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (showOnlyBelow.value && !isBelowThreshold(r)) return false;
    return true;
  });
});

const sorted = computed<ScoreEntry[]>(() => {
  const list = [...filtered.value];
  list.sort((a, b) => {
    const key = sortKey.value;
    const dir = sortDir.value === "asc" ? 1 : -1;
    if (key === "name") {
      return dir * (a.name || "").localeCompare(b.name || "");
    }
    return dir * ((a[key] ?? 0) - (b[key] ?? 0));
  });
  return list;
});

function isBelowThreshold(r: ScoreEntry): boolean {
  if (r.total_orders === 0) return false;
  if (r.avg_response_sec > THRESHOLD_RESPONSE_SEC) return true;
  if (r.completion_rate < THRESHOLD_COMPLETION_RATE) return true;
  if (r.feedback_total >= 3 && r.helpful_rate < THRESHOLD_HELPFUL_RATE) return true;
  return false;
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)} dtk`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return s > 0 ? `${m} mnt ${s} dtk` : `${m} mnt`;
  const h = Math.floor(m / 60);
  return `${h}j ${m % 60}m`;
}

function tierBadge(tier?: string): { label: string; class: string } | null {
  switch (tier) {
    case "psc": return { label: "PSC", class: "bg-red-50 text-red-700 ring-red-200" };
    case "verified": return { label: "Terverifikasi", class: "bg-blue-50 text-blue-700 ring-blue-200" };
    case "community": return { label: "Komunitas", class: "bg-neutral-100 text-neutral-700 ring-neutral-200" };
    default: return null;
  }
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return "lucide:chevrons-up-down";
  return sortDir.value === "asc" ? "lucide:chevron-up" : "lucide:chevron-down";
}

// Aggregate stats banner
const summary = computed(() => {
  const list = rows.value;
  if (!list.length) return null;
  const totalOrders = list.reduce((s, r) => s + r.total_orders, 0);
  const totalCompleted = list.reduce((s, r) => s + r.completed, 0);
  const totalFeedback = list.reduce((s, r) => s + r.feedback_total, 0);
  const totalHelpful = list.reduce((s, r) => s + r.feedback_helpful, 0);
  const below = list.filter(isBelowThreshold).length;
  return {
    activeUnits: list.length,
    totalOrders,
    totalCompleted,
    completionRate: totalOrders ? Math.round((totalCompleted / totalOrders) * 1000) / 10 : 0,
    helpfulRate: totalFeedback ? Math.round((totalHelpful / totalFeedback) * 1000) / 10 : 0,
    below,
  };
});
</script>

<template>
  <div class="p-4 sm:p-6 space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="page-subheader">Skor Performa Unit</h1>
        <p class="text-sm text-neutral-500 mt-1">
          Metrik operasional per unit (response time, completion, helpful rate).
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
          <button
            v-for="opt in periodOptions"
            :key="opt.value"
            type="button"
            :class="[
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
              period === opt.value ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900',
            ]"
            @click="period = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <UiButton size="sm" variant="secondary" :loading="pending" @click="refresh">
          <Icon icon="lucide:refresh-cw" class="text-sm" />
          Muat ulang
        </UiButton>
      </div>
    </header>

    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
      Gagal memuat skor unit. Coba muat ulang.
    </div>

    <!-- Summary strip -->
    <div v-if="summary" class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Unit aktif</p>
        <p class="mt-1 text-xl font-semibold text-neutral-900 tabular-nums">{{ summary.activeUnits }}</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Total tiket</p>
        <p class="mt-1 text-xl font-semibold text-neutral-900 tabular-nums">{{ summary.totalOrders }}</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Completion</p>
        <p class="mt-1 text-xl font-semibold text-neutral-900 tabular-nums">{{ summary.completionRate }}%</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Helpful rate</p>
        <p class="mt-1 text-xl font-semibold text-neutral-900 tabular-nums">
          {{ summary.helpfulRate }}%
          <span v-if="summary.below > 0" class="ml-2 text-[11px] font-medium text-amber-700">
            {{ summary.below }} di bawah threshold
          </span>
        </p>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 max-w-md">
        <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
        <input
          v-model="search"
          type="text"
          class="w-full rounded-lg border border-neutral-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
          placeholder="Cari unit, organisasi, wilayah…"
        >
      </div>
      <label class="inline-flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
        <input v-model="showOnlyBelow" type="checkbox" class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500">
        Hanya di bawah threshold
      </label>
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th class="text-left px-4 py-2.5">
                <button type="button" class="inline-flex items-center gap-1 font-semibold text-neutral-700" @click="toggleSort('name')">
                  Unit
                  <Icon :icon="sortIcon('name')" class="text-xs text-neutral-500" />
                </button>
              </th>
              <th class="text-right px-3 py-2.5">
                <button type="button" class="inline-flex items-center gap-1 font-semibold text-neutral-700" @click="toggleSort('total_orders')">
                  Tiket
                  <Icon :icon="sortIcon('total_orders')" class="text-xs text-neutral-500" />
                </button>
              </th>
              <th class="text-right px-3 py-2.5">
                <button type="button" class="inline-flex items-center gap-1 font-semibold text-neutral-700" @click="toggleSort('completion_rate')">
                  Completion
                  <Icon :icon="sortIcon('completion_rate')" class="text-xs text-neutral-500" />
                </button>
              </th>
              <th class="text-right px-3 py-2.5">
                <button type="button" class="inline-flex items-center gap-1 font-semibold text-neutral-700" @click="toggleSort('cancellation_rate')">
                  Cancel
                  <Icon :icon="sortIcon('cancellation_rate')" class="text-xs text-neutral-500" />
                </button>
              </th>
              <th class="text-right px-3 py-2.5">
                <button type="button" class="inline-flex items-center gap-1 font-semibold text-neutral-700" @click="toggleSort('avg_response_sec')">
                  Avg Terima
                  <Icon :icon="sortIcon('avg_response_sec')" class="text-xs text-neutral-500" />
                </button>
              </th>
              <th class="text-right px-3 py-2.5">
                <button type="button" class="inline-flex items-center gap-1 font-semibold text-neutral-700" @click="toggleSort('avg_arrival_sec')">
                  Avg Tiba
                  <Icon :icon="sortIcon('avg_arrival_sec')" class="text-xs text-neutral-500" />
                </button>
              </th>
              <th class="text-right px-3 py-2.5">
                <button type="button" class="inline-flex items-center gap-1 font-semibold text-neutral-700" @click="toggleSort('helpful_rate')">
                  Helpful
                  <Icon :icon="sortIcon('helpful_rate')" class="text-xs text-neutral-500" />
                </button>
              </th>
              <th class="text-right px-4 py-2.5 font-semibold text-neutral-700">
                Detail
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <template v-if="pending && !sorted.length">
              <tr v-for="n in 5" :key="n">
                <td class="px-4 py-3"><div class="soft-skel h-4 w-40" /></td>
                <td class="px-3 py-3"><div class="soft-skel h-4 w-10 ml-auto" /></td>
                <td class="px-3 py-3"><div class="soft-skel h-4 w-12 ml-auto" /></td>
                <td class="px-3 py-3"><div class="soft-skel h-4 w-12 ml-auto" /></td>
                <td class="px-3 py-3"><div class="soft-skel h-4 w-16 ml-auto" /></td>
                <td class="px-3 py-3"><div class="soft-skel h-4 w-16 ml-auto" /></td>
                <td class="px-3 py-3"><div class="soft-skel h-4 w-12 ml-auto" /></td>
                <td class="px-4 py-3"><div class="soft-skel h-4 w-6 ml-auto" /></td>
              </tr>
            </template>

            <tr v-else-if="!sorted.length">
              <td colspan="8" class="px-4 py-10">
                <UiEmptyState
                  title="Belum ada data"
                  description="Tidak ada unit dengan aktivitas pada periode ini."
                >
                  <template #icon>
                    <Icon icon="lucide:trophy" class="text-neutral-400 text-2xl" />
                  </template>
                </UiEmptyState>
              </td>
            </tr>

            <tr
              v-for="r in sorted"
              v-else
              :key="r.emergency_uuid"
              class="hover:bg-neutral-50 transition-colors"
              :class="isBelowThreshold(r) && 'bg-amber-50/40'"
            >
              <td class="px-4 py-3 align-top">
                <div class="flex items-start gap-2 min-w-0">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-neutral-900 truncate max-w-[16rem]">
                      {{ r.name }}
                    </p>
                    <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-500">
                      <span v-if="r.regency">{{ r.regency }}</span>
                      <span v-if="r.emergency_type">· {{ r.emergency_type }}</span>
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        v-if="tierBadge(r.partner_tier)"
                        class="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset"
                        :class="tierBadge(r.partner_tier)!.class"
                      >
                        {{ tierBadge(r.partner_tier)!.label }}
                      </span>
                      <span
                        v-if="!r.is_active"
                        class="inline-flex rounded-full bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-200 px-1.5 py-0.5 text-[10px] font-medium"
                      >
                        Nonaktif
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3 text-right tabular-nums text-neutral-900">
                {{ r.total_orders }}
                <div class="text-[10px] text-neutral-400 font-normal">
                  {{ r.completed }} sel · {{ r.pending }} tunggu
                </div>
              </td>
              <td class="px-3 py-3 text-right tabular-nums">
                <span
                  :class="
                    r.total_orders === 0
                      ? 'text-neutral-400'
                      : r.completion_rate < THRESHOLD_COMPLETION_RATE
                        ? 'text-red-600 font-semibold'
                        : 'text-neutral-800'
                  "
                >
                  {{ r.total_orders === 0 ? "—" : `${r.completion_rate}%` }}
                </span>
              </td>
              <td class="px-3 py-3 text-right tabular-nums text-neutral-600">
                {{ r.total_orders === 0 ? "—" : `${r.cancellation_rate}%` }}
              </td>
              <td class="px-3 py-3 text-right tabular-nums">
                <span
                  :class="
                    r.avg_response_sec === 0
                      ? 'text-neutral-400'
                      : r.avg_response_sec > THRESHOLD_RESPONSE_SEC
                        ? 'text-red-600 font-semibold'
                        : 'text-neutral-800'
                  "
                >
                  {{ formatDuration(r.avg_response_sec) }}
                </span>
              </td>
              <td class="px-3 py-3 text-right tabular-nums text-neutral-800">
                {{ formatDuration(r.avg_arrival_sec) }}
              </td>
              <td class="px-3 py-3 text-right tabular-nums">
                <template v-if="r.feedback_total === 0">
                  <span class="text-neutral-400">—</span>
                </template>
                <template v-else>
                  <span
                    :class="
                      r.feedback_total >= 3 && r.helpful_rate < THRESHOLD_HELPFUL_RATE
                        ? 'text-red-600 font-semibold'
                        : 'text-neutral-800'
                    "
                  >
                    {{ r.helpful_rate }}%
                  </span>
                  <div class="text-[10px] text-neutral-400 font-normal">
                    {{ r.feedback_helpful }}/{{ r.feedback_total }}
                  </div>
                </template>
              </td>
              <td class="px-4 py-3 text-right">
                <NuxtLink
                  :to="`/emergencies/${r.emergency_uuid}`"
                  class="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Buka
                  <Icon icon="lucide:chevron-right" class="text-xs" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-[11px] text-neutral-400 text-center">
      Threshold: response &gt; 5 mnt · completion &lt; 70% · helpful &lt; 60% (min 3 feedback).
    </p>
  </div>
</template>
