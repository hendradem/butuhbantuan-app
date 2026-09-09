<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { slaRemainingMs, slaUrgency } from "~/utils/slaBreach";

export type AttentionKind = "sla" | "exhausted" | "escalated" | "pending";

export type AttentionItem = {
  id: string;
  ticket_number: string;
  kind: AttentionKind;
  title: string;
  subtitle: string;
  href: string;
  created_at?: string;
};

const props = defineProps<{
  orders: any[];
  /** Max rows shown before "lihat semua" */
  limit?: number;
}>();

const KIND_META: Record<
  AttentionKind,
  { label: string; icon: string; class: string }
> = {
  sla: {
    label: "SLA breach",
    icon: "lucide:alarm-clock",
    class: "bg-emergency-50 text-emergency-700 border-emergency-200",
  },
  exhausted: {
    label: "Dispatch habis",
    icon: "lucide:hourglass",
    class: "bg-amber-50 text-amber-800 border-amber-200",
  },
  escalated: {
    label: "Eskalasi PSC",
    icon: "lucide:phone-call",
    class: "bg-violet-50 text-violet-800 border-violet-200",
  },
  pending: {
    label: "Pending lama",
    icon: "lucide:clock",
    class: "bg-yellow-50 text-yellow-800 border-yellow-200",
  },
};

const PENDING_OLD_MS = 5 * 60_000;

const items = computed<AttentionItem[]>(() => {
  const now = Date.now();
  const out: AttentionItem[] = [];
  const seen = new Set<string>();

  for (const o of props.orders ?? []) {
    if (!o?.id || o.status !== "pending") continue;
    const ticket = String(o.ticket_number || o.id);
    const href = `/orders/${ticket}`;

    const ds = String(o.dispatch_status || "");
    if (ds === "escalated") {
      seen.add(o.id);
      out.push({
        id: o.id,
        ticket_number: ticket,
        kind: "escalated",
        title: ticket,
        subtitle: o.unit_name ? `Terakhir: ${o.unit_name}` : "Butuh follow-up PSC",
        href,
        created_at: o.created_at,
      });
      continue;
    }
    if (ds === "exhausted") {
      seen.add(o.id);
      out.push({
        id: o.id,
        ticket_number: ticket,
        kind: "exhausted",
        title: ticket,
        subtitle: o.unit_name ? `Cascade habis · ${o.unit_name}` : "Cascade habis — alihkan / eskalasi",
        href,
        created_at: o.created_at,
      });
      continue;
    }

    const urg = slaUrgency(o, now);
    if (urg === "breached" || urg === "at_risk") {
      seen.add(o.id);
      const rem = slaRemainingMs(o.sla_deadline, now);
      const remLabel =
        rem == null
          ? "SLA"
          : rem <= 0
            ? `Lewat ${Math.ceil(Math.abs(rem) / 1000)}d`
            : `Sisa ${Math.ceil(rem / 1000)}d`;
      out.push({
        id: o.id,
        ticket_number: ticket,
        kind: "sla",
        title: ticket,
        subtitle: `${remLabel}${o.unit_name ? ` · ${o.unit_name}` : ""}`,
        href,
        created_at: o.created_at,
      });
      continue;
    }

    const age = now - new Date(o.created_at || 0).getTime();
    if (Number.isFinite(age) && age >= PENDING_OLD_MS) {
      seen.add(o.id);
      const mins = Math.floor(age / 60_000);
      out.push({
        id: o.id,
        ticket_number: ticket,
        kind: "pending",
        title: ticket,
        subtitle: `Menunggu ${mins} mnt${o.unit_name ? ` · ${o.unit_name}` : ""}`,
        href,
        created_at: o.created_at,
      });
    }
  }

  const rank: Record<AttentionKind, number> = {
    escalated: 0,
    exhausted: 1,
    sla: 2,
    pending: 3,
  };
  out.sort((a, b) => {
    const dr = rank[a.kind] - rank[b.kind];
    if (dr !== 0) return dr;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });
  return out;
});

const limit = computed(() => props.limit ?? 8);
const visible = computed(() => items.value.slice(0, limit.value));
const overflow = computed(() => Math.max(0, items.value.length - visible.value.length));

const counts = computed(() => {
  const c = { sla: 0, exhausted: 0, escalated: 0, pending: 0, total: items.value.length };
  for (const i of items.value) c[i.kind]++;
  return c;
});
</script>

<template>
  <div
    v-if="items.length"
    class="bg-white rounded-xl border border-neutral-200 overflow-hidden"
  >
    <div class="px-4 sm:px-5 py-3.5 border-b border-neutral-100 flex items-start justify-between gap-3 flex-wrap">
      <div>
        <p class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <Icon icon="lucide:inbox" class="text-emergency-600" />
          Perlu perhatian
        </p>
        <p class="text-xs text-neutral-400 mt-0.5">
          SLA · dispatch habis · eskalasi · pending &gt; 5 mnt
        </p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-if="counts.escalated"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-violet-50 text-violet-800 border-violet-200"
        >
          {{ counts.escalated }} PSC
        </span>
        <span
          v-if="counts.exhausted"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-amber-50 text-amber-800 border-amber-200"
        >
          {{ counts.exhausted }} habis
        </span>
        <span
          v-if="counts.sla"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-emergency-50 text-emergency-700 border-emergency-200"
        >
          {{ counts.sla }} SLA
        </span>
        <span
          v-if="counts.pending"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-yellow-50 text-yellow-800 border-yellow-200"
        >
          {{ counts.pending }} lama
        </span>
      </div>
    </div>

    <ul class="divide-y divide-neutral-50">
      <li v-for="item in visible" :key="item.id">
        <NuxtLink
          :to="item.href"
          class="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-neutral-50 transition-colors"
        >
          <span
            :class="[
              'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border shrink-0',
              KIND_META[item.kind].class,
            ]"
          >
            <Icon :icon="KIND_META[item.kind].icon" class="text-xs" />
            {{ KIND_META[item.kind].label }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-neutral-900 font-mono truncate">
              {{ item.title }}
            </p>
            <p class="text-xs text-neutral-500 truncate">{{ item.subtitle }}</p>
          </div>
          <Icon icon="lucide:chevron-right" class="text-neutral-300 shrink-0" />
        </NuxtLink>
      </li>
    </ul>

    <div
      v-if="overflow > 0"
      class="px-4 sm:px-5 py-2.5 border-t border-neutral-100 bg-neutral-50/80 flex items-center justify-between"
    >
      <p class="text-xs text-neutral-500">+{{ overflow }} tiket lain</p>
      <div class="flex gap-3">
        <NuxtLink to="/orders/sla" class="text-xs font-semibold text-primary-600 hover:text-primary-700">
          SLA
        </NuxtLink>
        <NuxtLink to="/orders/queue" class="text-xs font-semibold text-primary-600 hover:text-primary-700">
          Antrian
        </NuxtLink>
        <NuxtLink to="/orders" class="text-xs font-semibold text-primary-600 hover:text-primary-700">
          Semua
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
