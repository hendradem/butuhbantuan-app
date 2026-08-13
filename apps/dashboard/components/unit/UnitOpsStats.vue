<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    orders: any[];
    loading?: boolean;
    title?: string;
    storageKey?: string;
  }>(),
  {
    title: "Statistik unit",
    storageKey: "bb-unit-ops-period",
  },
);

const PERIODS = [
  { id: "1", label: "Hari ini" },
  { id: "7", label: "7 hari" },
  { id: "30", label: "30 hari" },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

function readPeriod(): PeriodId {
  if (!import.meta.client) return "1";
  try {
    const v = sessionStorage.getItem(props.storageKey);
    if (v === "1" || v === "7" || v === "30") return v;
  } catch {
    /* ignore */
  }
  return "1";
}

const period = ref<PeriodId>(readPeriod());

watch(period, (v) => {
  if (!import.meta.client) return;
  try {
    sessionStorage.setItem(props.storageKey, v);
  } catch {
    /* ignore */
  }
});

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function inPeriod(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (days <= 1) return t >= startOfDay().getTime();
  return t >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function secBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 1000);
}

function fmtSec(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  if (sec < 60) return `${sec}d`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}j`;
}

function fmtPct(v: number): string {
  return v > 0 ? `${v.toFixed(0)}%` : "—";
}

const days = computed(() => Number(period.value) || 1);

const stats = computed(() => {
  const all = props.orders ?? [];
  const d = days.value;

  const pending = all.filter((o) => o.status === "pending").length;
  const active = all.filter((o) => o.status === "accepted" || o.status === "in_progress").length;
  const slaLate = all.filter(
    (o) =>
      o.status === "pending" &&
      o.sla_deadline &&
      new Date(o.sla_deadline).getTime() <= Date.now(),
  ).length;

  const inRange = all.filter((o) => inPeriod(o.created_at, d));
  const completed = inRange.filter((o) => o.status === "completed").length;
  const cancelled = inRange.filter((o) => o.status === "cancelled").length;
  const closed = completed + cancelled;
  const completionRate = closed > 0 ? (completed * 100) / closed : 0;

  const responseSecs = inRange
    .map((o) => secBetween(o.created_at, o.accepted_at))
    .filter((s): s is number => s != null);
  const arrivalSecs = inRange
    .map((o) => secBetween(o.accepted_at, o.arrived_at))
    .filter((s): s is number => s != null);

  const avgResponse =
    responseSecs.length > 0
      ? Math.round(responseSecs.reduce((a, b) => a + b, 0) / responseSecs.length)
      : null;
  const avgArrival =
    arrivalSecs.length > 0
      ? Math.round(arrivalSecs.reduce((a, b) => a + b, 0) / arrivalSecs.length)
      : null;

  return {
    pending,
    active,
    slaLate,
    completed,
    completionRate,
    avgResponse,
    avgArrival,
    volume: inRange.length,
  };
});

const cards = computed(() => [
  {
    key: "pending",
    label: "Menunggu",
    value: String(stats.value.pending),
    hint: "antrian sekarang",
    shell: "bg-amber-50/80 border-amber-100",
    labelCls: "text-amber-700/80",
    valueCls: "text-amber-900",
    hintCls: "text-amber-700/60",
  },
  {
    key: "active",
    label: "Berjalan",
    value: String(stats.value.active),
    hint: "diterima / diproses",
    shell: "bg-sky-50/80 border-sky-100",
    labelCls: "text-sky-700/80",
    valueCls: "text-sky-900",
    hintCls: "text-sky-700/60",
  },
  {
    key: "completed",
    label: "Selesai",
    value: String(stats.value.completed),
    hint: period.value === "1" ? "hari ini" : `${period.value} hari`,
    shell: "bg-emerald-50/80 border-emerald-100",
    labelCls: "text-emerald-700/80",
    valueCls: "text-emerald-900",
    hintCls: "text-emerald-700/60",
  },
  {
    key: "response",
    label: "Avg respons",
    value: fmtSec(stats.value.avgResponse),
    hint: "masuk → terima",
    shell: "bg-violet-50/80 border-violet-100",
    labelCls: "text-violet-700/80",
    valueCls: "text-violet-900",
    hintCls: "text-violet-700/60",
  },
  {
    key: "arrival",
    label: "Avg tiba",
    value: fmtSec(stats.value.avgArrival),
    hint: "terima → lokasi",
    shell: "bg-orange-50/80 border-orange-100",
    labelCls: "text-orange-700/80",
    valueCls: "text-orange-900",
    hintCls: "text-orange-700/60",
  },
  {
    key: "completion",
    label: "Completion",
    value: fmtPct(stats.value.completionRate),
    hint: stats.value.slaLate > 0 ? `${stats.value.slaLate} lewat SLA` : "selesai vs batal",
    shell:
      stats.value.slaLate > 0
        ? "bg-rose-50/80 border-rose-100"
        : "bg-teal-50/80 border-teal-100",
    labelCls: stats.value.slaLate > 0 ? "text-rose-700/80" : "text-teal-700/80",
    valueCls: stats.value.slaLate > 0 ? "text-rose-900" : "text-teal-900",
    hintCls: stats.value.slaLate > 0 ? "text-rose-700/60" : "text-teal-700/60",
  },
]);
</script>

<template>
  <div class="px-4 sm:px-6 pt-3 sm:pt-4 pb-1">
    <div class="flex items-center justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-neutral-900 truncate">{{ title }}</p>
        <p class="text-xs text-neutral-400 mt-0.5 truncate">
          <template v-if="loading">Memuat…</template>
          <template v-else>{{ stats.volume }} pesanan di periode</template>
        </p>
      </div>
      <div class="inline-flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5 shrink-0 overflow-x-auto scrollbar-none max-w-[55%] sm:max-w-none">
        <button
          v-for="p in PERIODS"
          :key="p.id"
          type="button"
          :class="[
            'shrink-0 px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs sm:text-sm font-medium rounded-md transition-colors',
            period === p.id
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
          ]"
          @click="period = p.id"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="soft-skel rounded-lg sm:rounded-xl h-12 sm:h-[72px]"
      />
    </div>
    <div
      v-else
      class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3"
    >
      <div
        v-for="card in cards"
        :key="card.key"
        :class="[
          'rounded-lg sm:rounded-xl border px-2.5 py-2 sm:px-4 sm:py-3',
          card.shell,
        ]"
      >
        <p :class="['text-[11px] sm:text-sm font-medium leading-tight', card.labelCls]">
          {{ card.label }}
        </p>
        <p
          :class="[
            'text-base sm:text-xl font-semibold tabular-nums mt-0.5 sm:mt-1 leading-none',
            card.valueCls,
          ]"
        >
          {{ card.value }}
        </p>
        <p
          :class="[
            'hidden sm:block text-sm mt-1.5 truncate',
            card.hintCls,
          ]"
        >
          {{ card.hint }}
        </p>
      </div>
    </div>
  </div>
</template>
