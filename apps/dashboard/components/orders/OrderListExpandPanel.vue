<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { formatEta } from "~/utils/eta";
import { orderServiceDetailLine } from "~/utils/orderCard";

const props = withDefaults(
  defineProps<{
    order: any;
    variant: "admin" | "unit";
    detailPath: string;
    etaMinutes?: number | null;
  }>(),
  { etaMinutes: null },
);

const mapsUrl = computed(() => {
  const lat = Number(props.order?.requester_lat);
  const lng = Number(props.order?.requester_lng);
  if (!lat || !lng) return "";
  return `https://www.google.com/maps?q=${lat},${lng}`;
});

const regency = computed(() => {
  const o = props.order;
  return o?._emergency?.address?.regency || o?.regency || "—";
});

const detailLine = computed(() => orderServiceDetailLine(props.order));
</script>

<template>
  <div class="px-4 py-3.5 sm:px-5 sm:py-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
      <div>
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Telepon</p>
        <p class="mt-0.5 font-mono text-neutral-800">{{ order.requester_phone || "—" }}</p>
      </div>
      <div v-if="variant === 'admin'">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Wilayah</p>
        <p class="mt-0.5 text-neutral-800">{{ regency }}</p>
      </div>
      <div class="sm:col-span-2 lg:col-span-1">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Lokasi</p>
        <p class="mt-0.5 text-neutral-800 line-clamp-2">{{ order.location || "—" }}</p>
      </div>
      <div class="sm:col-span-2 lg:col-span-3">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Ringkasan</p>
        <p class="mt-0.5 text-neutral-700 leading-snug">{{ detailLine || "—" }}</p>
      </div>
      <div v-if="variant === 'admin' && order.unit_name" class="xl:hidden">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Unit</p>
        <p class="mt-0.5 font-medium text-neutral-900">{{ order.unit_name }}</p>
        <p v-if="order.previous_unit_name" class="mt-0.5 flex items-center gap-1 text-[11px] text-amber-700">
          <Icon icon="lucide:arrow-left" class="text-[10px] shrink-0" />
          dari {{ order.previous_unit_name }}
        </p>
      </div>
      <div v-if="order.previous_unit_name" class="sm:col-span-2 lg:col-span-2">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Dispatch trail</p>
        <p class="mt-0.5 text-neutral-800 flex items-center gap-1.5">
          <span class="text-neutral-500 line-through">{{ order.previous_unit_name }}</span>
          <Icon icon="lucide:arrow-right" class="text-neutral-400 text-xs shrink-0" />
          <span class="font-medium text-neutral-900">{{ order.unit_name || "—" }}</span>
          <span
            v-if="order.dispatch_round && order.dispatch_round > 1"
            class="ml-1 rounded-full bg-neutral-100 px-1.5 py-px text-[10px] font-medium text-neutral-600"
          >
            Round {{ order.dispatch_round }}
          </span>
        </p>
      </div>
      <div v-if="etaMinutes != null && etaMinutes > 0" class="md:hidden">
        <p class="text-[11px] font-medium uppercase tracking-wide text-neutral-400">ETA</p>
        <p class="mt-0.5 font-medium tabular-nums text-neutral-900">{{ formatEta(etaMinutes) }}</p>
      </div>
    </div>

    <div class="mt-3 pt-3 border-t border-neutral-200/80 flex flex-wrap items-center gap-2">
      <NuxtLink
        :to="detailPath"
        class="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        @click.stop
      >
        <Icon icon="lucide:external-link" class="text-sm" />
        Detail lengkap
      </NuxtLink>
      <a
        v-if="mapsUrl"
        :href="mapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        @click.stop
      >
        <Icon icon="lucide:map-pin" class="text-sm" />
        Google Maps
      </a>
      <slot name="actions" :order="order" />
    </div>
  </div>
</template>
