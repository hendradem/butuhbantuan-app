<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { isUnitDispatcher, type UnitProfile } from "~/composables/useUnitOps";

definePageMeta({ layout: "unit", title: "Ops Wilayah" });

const { data: profile } = useNuxtData<UnitProfile>("unit-profile");

const dispatcher = computed(() => isUnitDispatcher(profile.value));

watch(
  dispatcher,
  (ok) => {
    if (import.meta.client && profile.value != null && !ok) {
      navigateTo("/unit/orders");
    }
  },
  { immediate: true },
);

const { getStats } = useUnitOpsFetch();

const { data: stats, pending, refresh: refreshRaw } = await useAsyncData(
  "unit-ops-stats",
  () => getStats().catch(() => null),
  { server: false },
);

const refresh = useSoftRefresh(refreshRaw);
const showSkeleton = computed(() => isInitialPending(pending.value, stats.value));

onActivated(() => {
  refreshRaw();
});

const cards = computed(() => {
  const s = stats.value ?? {};
  return [
    {
      label: "Menunggu",
      value: s.pending ?? 0,
      to: "/unit/ops/queue",
      tone: "text-amber-700",
      icon: "lucide:columns-3",
    },
    {
      label: "Fokus SLA",
      value: s.sla_focus ?? 0,
      to: "/unit/ops/sla",
      tone: "text-emergency-700",
      icon: "lucide:alarm-clock",
    },
    {
      label: "Exhausted",
      value: s.exhausted ?? 0,
      to: "/unit/ops/queue",
      tone: "text-amber-800",
      icon: "lucide:triangle-alert",
    },
    {
      label: "Unit aktif",
      value: `${s.units_active ?? 0}/${s.units_total ?? 0}`,
      to: "/unit/ops/map",
      tone: "text-neutral-800",
      icon: "lucide:map",
    },
  ];
});

const scopeLabel = computed(() => {
  const sc = stats.value?.scope;
  if (!sc) return "Wilayah Anda";
  if (sc.province_wide) return `Provinsi · ${sc.province_id || "—"}`;
  return `Kab/Kota · ${sc.regency_id || "—"}`;
});
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="page-subheader-title">Ops Wilayah</h1>
          <p class="page-subheader-desc">
            Ringkasan dispatch scoped · {{ scopeLabel }}
          </p>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors shrink-0"
          :disabled="pending && !!stats"
          @click="refresh()"
        >
          <Icon icon="lucide:refresh-cw" class="text-xs" :class="{ 'animate-spin': pending }" />
          Refresh
        </button>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-4">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <template v-if="showSkeleton">
          <div
            v-for="i in 4"
            :key="i"
            class="rounded-xl border border-neutral-200 bg-white px-4 py-3.5 space-y-2"
          >
            <div class="soft-skel h-2.5 w-16" />
            <div class="soft-skel h-7 w-12" />
          </div>
        </template>
        <NuxtLink
          v-for="c in cards"
          v-else
          :key="c.label"
          :to="c.to"
          class="rounded-xl border border-neutral-200 bg-white px-4 py-3.5 hover:border-neutral-300 transition-colors"
        >
          <div class="flex items-center gap-2">
            <Icon :icon="c.icon" class="text-neutral-400 text-sm" />
            <p class="text-xs text-neutral-500">{{ c.label }}</p>
          </div>
          <p :class="['text-2xl font-bold tabular-nums mt-1', c.tone]">{{ c.value }}</p>
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NuxtLink
          to="/unit/ops/queue"
          class="rounded-xl border border-neutral-200 bg-white px-4 py-4 flex items-center gap-3 hover:border-primary-300 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Icon icon="lucide:columns-3" class="text-primary-600" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-neutral-900">Antrian</p>
            <p class="text-xs text-neutral-500">Pending & exhausted wilayah</p>
          </div>
        </NuxtLink>
        <NuxtLink
          to="/unit/ops/sla"
          class="rounded-xl border border-neutral-200 bg-white px-4 py-4 flex items-center gap-3 hover:border-emergency-300 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-emergency-50 flex items-center justify-center">
            <Icon icon="lucide:alarm-clock" class="text-emergency-600" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-neutral-900">SLA Breach</p>
            <p class="text-xs text-neutral-500">Lewat / mendekati batas accept</p>
          </div>
        </NuxtLink>
        <NuxtLink
          to="/unit/ops/map"
          class="rounded-xl border border-neutral-200 bg-white px-4 py-4 flex items-center gap-3 hover:border-neutral-300 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
            <Icon icon="lucide:map" class="text-neutral-700" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-neutral-900">Peta Ops</p>
            <p class="text-xs text-neutral-500">Insiden & unit di wilayah</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
