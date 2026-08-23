<script setup lang="ts">
/**
 * Ops stats cards for unit/admin order list.
 * Live queue from all orders; period metrics from `periodOrders`.
 */
import { Icon } from "@iconify/vue";

const props = withDefaults(
  defineProps<{
    orders: any[];
    /** Orders already filtered by page period — drives selesai / avg / completion */
    periodOrders?: any[];
    loading?: boolean;
  }>(),
  { periodOrders: undefined },
);

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

const live = computed(() => {
  const all = props.orders ?? [];
  return {
    pending: all.filter((o) => o.status === "pending").length,
    active: all.filter((o) => o.status === "accepted" || o.status === "in_progress").length,
    slaLate: all.filter(
      (o) =>
        o.status === "pending" &&
        o.sla_deadline &&
        new Date(o.sla_deadline).getTime() <= Date.now(),
    ).length,
  };
});

const periodStats = computed(() => {
  const inRange = props.periodOrders ?? props.orders ?? [];
  const completed = inRange.filter((o) => o.status === "completed").length;
  const cancelled = inRange.filter((o) => o.status === "cancelled").length;
  const closed = completed + cancelled;
  const responseSecs = inRange
    .map((o) => secBetween(o.created_at, o.accepted_at))
    .filter((s): s is number => s != null);
  const arrivalSecs = inRange
    .map((o) => secBetween(o.accepted_at, o.arrived_at))
    .filter((s): s is number => s != null);
  const avg = (secs: number[]) =>
    secs.length > 0 ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : null;
  return {
    completed,
    cancelled,
    volume: inRange.length,
    avgResponse: avg(responseSecs),
    avgArrival: avg(arrivalSecs),
    completionRate: closed > 0 ? Math.round((completed * 100) / closed) : 0,
  };
});

type StatCard = {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: string;
  iconWrap: string;
  iconTone: string;
  valueTone: string;
};

const items = computed<StatCard[]>(() => {
  const p = periodStats.value;
  const l = live.value;
  return [
    {
      key: "pending",
      label: "Menunggu",
      value: String(l.pending),
      hint: l.slaLate > 0 ? `${l.slaLate} lewat SLA` : "Antrian live",
      icon: "lucide:clock-3",
      iconWrap: l.slaLate > 0 ? "bg-rose-50" : "bg-amber-50",
      iconTone: l.slaLate > 0 ? "text-rose-600" : "text-amber-600",
      valueTone: l.slaLate > 0 ? "text-rose-700" : "text-amber-900",
    },
    {
      key: "active",
      label: "Berjalan",
      value: String(l.active),
      hint: "Diterima / OTW / di lokasi",
      icon: "lucide:siren",
      iconWrap: "bg-sky-50",
      iconTone: "text-sky-600",
      valueTone: "text-sky-900",
    },
    {
      key: "completed",
      label: "Selesai",
      value: String(p.completed),
      hint: `dari ${p.volume} di periode`,
      icon: "lucide:check-circle-2",
      iconWrap: "bg-emerald-50",
      iconTone: "text-emerald-600",
      valueTone: "text-emerald-900",
    },
    {
      key: "cancelled",
      label: "Dibatalkan",
      value: String(p.cancelled),
      hint: p.volume > 0 ? `${Math.round((p.cancelled * 100) / p.volume)}% volume` : "Periode aktif",
      icon: "lucide:x-circle",
      iconWrap: "bg-neutral-100",
      iconTone: "text-neutral-500",
      valueTone: "text-neutral-800",
    },
    {
      key: "response",
      label: "Avg respons",
      value: fmtSec(p.avgResponse),
      hint: "Buat → terima",
      icon: "lucide:timer",
      iconWrap: "bg-violet-50",
      iconTone: "text-violet-600",
      valueTone: "text-neutral-900",
    },
    {
      key: "arrival",
      label: "Avg tiba",
      value: fmtSec(p.avgArrival),
      hint: "Terima → di lokasi",
      icon: "lucide:map-pinned",
      iconWrap: "bg-indigo-50",
      iconTone: "text-indigo-600",
      valueTone: "text-neutral-900",
    },
    {
      key: "completion",
      label: "Completion",
      value: p.completionRate > 0 ? `${p.completionRate}%` : "—",
      hint: "Selesai / ditutup",
      icon: "lucide:percent",
      iconWrap: "bg-teal-50",
      iconTone: "text-teal-600",
      valueTone: "text-neutral-900",
    },
  ];
});
</script>

<template>
  <div class="px-4 sm:px-6 pt-3 pb-1">
    <div
      v-if="loading"
      class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2.5"
    >
      <div
        v-for="i in 7"
        :key="i"
        class="rounded-2xl bg-white ring-1 ring-black/[0.04] shadow-sm p-3.5 space-y-2.5"
      >
        <div class="soft-skel h-8 w-8 rounded-xl" />
        <div class="soft-skel h-3 w-16" />
        <div class="soft-skel h-7 w-12" />
        <div class="soft-skel h-2.5 w-20" />
      </div>
    </div>
    <div
      v-else
      class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2.5"
    >
      <div
        v-for="item in items"
        :key="item.key"
        class="rounded-2xl bg-white ring-1 ring-black/[0.04] shadow-sm p-3.5 min-w-0"
      >
        <div class="flex items-start justify-between gap-2 mb-2.5">
          <div
            :class="[
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
              item.iconWrap,
            ]"
          >
            <Icon :icon="item.icon" :class="['text-base', item.iconTone]" />
          </div>
        </div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 leading-none">
          {{ item.label }}
        </p>
        <p
          :class="[
            'mt-1.5 text-2xl font-bold tabular-nums tracking-tight leading-none',
            item.valueTone,
          ]"
        >
          {{ item.value }}
        </p>
        <p class="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
          {{ item.hint }}
        </p>
      </div>
    </div>
  </div>
</template>
