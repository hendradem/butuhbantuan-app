<script setup lang="ts">
import { Icon } from "@iconify/vue";

export type OrderHistoryItem = {
  id?: string;
  type?: string;
  message: string;
  actor?: string;
  from_unit?: string;
  to_unit?: string;
  dispatch_tier?: string;
  created_at: string;
};

function tierLabel(tier?: string) {
  switch (tier) {
    case "local":
      return "Unit lokal";
    case "kab_dispatcher":
      return "Dispatcher kab/kota";
    case "province":
      return "Dispatcher provinsi";
    default:
      return "";
  }
}

const props = withDefaults(
  defineProps<{
    items?: OrderHistoryItem[] | null;
    loading?: boolean;
    hideTitle?: boolean;
    /** Tighter spacing for secondary panels */
    compact?: boolean;
    /** plain = mock-style HH:mm + dots; default = icon rail */
    variant?: "default" | "plain";
  }>(),
  { variant: "default" },
);

const sorted = computed(() => {
  const list = [...(props.items ?? [])];
  return list.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
});

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatClock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function titleFor(ev: OrderHistoryItem) {
  return ev.message || "Peristiwa";
}

function descFor(ev: OrderHistoryItem) {
  const parts: string[] = [];
  if (ev.actor) parts.push(ev.actor);
  if (ev.from_unit && ev.to_unit) parts.push(`${ev.from_unit} → ${ev.to_unit}`);
  else if (ev.to_unit) parts.push(ev.to_unit);
  const tier = tierLabel(ev.dispatch_tier);
  if (tier) parts.push(tier);
  return parts.join(" · ");
}

function iconFor(type?: string) {
  switch (type) {
    case "created":
      return "lucide:inbox";
    case "offered":
      return "lucide:send";
    case "reassigned":
      return "lucide:arrow-right-left";
    case "accepted":
      return "lucide:check";
    case "rejected":
      return "lucide:x";
    case "in_progress":
      return "lucide:ambulance";
    case "arrived":
      return "lucide:map-pin-check";
    case "completed":
      return "lucide:check-circle";
    case "cancelled":
      return "lucide:ban";
    case "exhausted":
      return "lucide:hourglass";
    case "escalated_psc":
      return "lucide:phone-call";
    default:
      return "lucide:circle";
  }
}

function toneFor(type?: string) {
  switch (type) {
    case "accepted":
    case "completed":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
    case "rejected":
    case "cancelled":
    case "exhausted":
    case "escalated_psc":
      return "bg-emergency-50 text-emergency-700 ring-emergency-200";
    case "reassigned":
    case "offered":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "in_progress":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    case "arrived":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    default:
      return "bg-neutral-100 text-neutral-600 ring-neutral-200";
  }
}
</script>

<template>
  <div>
    <p v-if="!hideTitle" class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Riwayat Pesanan</p>

    <!-- Loading -->
    <div v-if="loading" class="space-y-0">
      <div
        v-for="i in 3"
        :key="i"
        class="relative flex gap-2.5"
        :class="compact || variant === 'plain' ? 'pb-2.5' : 'pb-5'"
      >
        <template v-if="variant === 'plain'">
          <div class="soft-skel w-11 h-3 shrink-0 mt-1" />
          <div class="flex flex-col items-center shrink-0 mr-1">
            <div class="soft-skel w-2 h-2 rounded-full mt-1.5" />
            <div v-if="i < 3" class="w-px flex-1 bg-neutral-100 mt-1 min-h-[12px]" />
          </div>
          <div class="flex-1 space-y-1.5 py-0.5">
            <div class="soft-skel h-3.5 w-36" />
            <div class="soft-skel h-2.5 w-24" />
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col items-center shrink-0">
            <div :class="compact ? 'soft-skel w-6 h-6 rounded-full' : 'soft-skel w-8 h-8 rounded-full'" />
            <div v-if="i < 3" class="w-px flex-1 bg-neutral-100 mt-1 min-h-[12px]" />
          </div>
          <div class="flex-1 space-y-1.5 py-0.5">
            <div class="soft-skel h-2 w-14" />
            <div class="soft-skel h-2.5 w-36" />
          </div>
        </template>
      </div>
    </div>

    <div v-else-if="!sorted.length" class="text-xs text-neutral-400 py-1.5">
      Belum ada riwayat untuk pesanan ini.
    </div>

    <!-- Plain mock-style timeline -->
    <ol v-else-if="variant === 'plain'" class="relative space-y-0">
      <li
        v-for="(ev, idx) in sorted"
        :key="ev.id || `${ev.type}-${ev.created_at}-${idx}`"
        class="flex gap-3 pb-4 last:pb-0"
      >
        <div class="w-11 shrink-0 text-xs tabular-nums text-neutral-400 pt-0.5">
          {{ formatClock(ev.created_at) }}
        </div>
        <div class="relative flex flex-col items-center mr-1">
          <span class="w-2 h-2 rounded-full bg-neutral-300 mt-1.5" />
          <span
            v-if="idx < sorted.length - 1"
            class="w-px flex-1 bg-neutral-200 mt-1"
          />
        </div>
        <div class="min-w-0 pb-1">
          <p class="text-sm font-medium text-neutral-900">{{ titleFor(ev) }}</p>
          <p v-if="descFor(ev)" class="text-xs text-neutral-500 mt-0.5">{{ descFor(ev) }}</p>
        </div>
      </li>
    </ol>

    <!-- Default icon rail -->
    <ol v-else class="relative space-y-0">
      <li
        v-for="(ev, idx) in sorted"
        :key="ev.id || `${ev.type}-${ev.created_at}-${idx}`"
        class="relative flex gap-2.5"
        :class="compact ? 'pb-2.5 last:pb-0' : 'pb-5 last:pb-0'"
      >
        <div class="flex flex-col items-center shrink-0">
          <div
            :class="[
              'rounded-full flex items-center justify-center ring-1',
              compact ? 'w-6 h-6' : 'w-8 h-8',
              toneFor(ev.type),
            ]"
          >
            <Icon :icon="iconFor(ev.type)" :class="compact ? 'text-[11px]' : 'text-sm'" />
          </div>
          <div
            v-if="idx < sorted.length - 1"
            class="w-px flex-1 bg-neutral-200 mt-1 min-h-[8px]"
          />
        </div>
        <div class="min-w-0" :class="compact ? 'pt-0' : 'pt-0.5'">
          <div class="flex items-center gap-1.5 flex-wrap">
            <p class="text-[10px] font-medium text-neutral-400 tabular-nums">
              {{ formatTime(ev.created_at) }}
            </p>
            <span
              v-if="tierLabel(ev.dispatch_tier)"
              class="text-[9px] font-medium px-1 py-0.5 rounded bg-neutral-100 text-neutral-600"
            >
              {{ tierLabel(ev.dispatch_tier) }}
            </span>
          </div>
          <p
            class="text-neutral-800 leading-snug"
            :class="compact ? 'text-xs mt-0' : 'text-sm mt-0.5'"
          >
            {{ ev.message }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>
