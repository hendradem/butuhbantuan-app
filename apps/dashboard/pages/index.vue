<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Overview" });

const { get } = useApi();

const { data: emergencies } = await useAsyncData("emergencies-all", () =>
  get<{ data: any[] }>("/api/v1/emergency/")
);
const { data: types } = await useAsyncData("types-all", () =>
  get<{ data: any[] }>("/api/v1/emergency/type")
);
const { data: regions } = await useAsyncData("regions-all", () =>
  get<{ data: any[] }>("/api/v1/service/available-region")
);

const stats = computed(() => [
  {
    label: "Total Layanan",
    value: emergencies.value?.data?.length ?? 0,
    sub: "layanan terdaftar",
    icon: "lucide:shield-check",
    color: "text-primary-600 bg-primary-50",
    trend: null,
  },
  {
    label: "Jenis Layanan",
    value: types.value?.data?.length ?? 0,
    sub: "kategori aktif",
    icon: "lucide:tag",
    color: "text-violet-600 bg-violet-50",
    trend: null,
  },
  {
    label: "Wilayah Tercakup",
    value: regions.value?.data?.length ?? 0,
    sub: "kota/kabupaten",
    icon: "lucide:map-pin",
    color: "text-emerald-600 bg-emerald-50",
    trend: null,
  },
  {
    label: "Dispatcher",
    value: emergencies.value?.data?.filter((e: any) => e.is_dispatcher).length ?? 0,
    sub: "pusat panggilan",
    icon: "lucide:phone-call",
    color: "text-orange-600 bg-orange-50",
    trend: null,
  },
]);

const recentEmergencies = computed(() => (emergencies.value?.data ?? []).slice(0, 8));

const typeBreakdown = computed(() =>
  (types.value?.data ?? []).map((t: any) => ({
    ...t,
    count: (emergencies.value?.data ?? []).filter((e: any) => e.emergency_type?.name === t.name).length,
  }))
);

function typeBadgeColor(name: string) {
  const m: Record<string, string> = {
    Ambulance: "text-red-700 bg-red-50",
    Damkar: "text-orange-700 bg-orange-50",
    "Rumah Sakit": "text-blue-700 bg-blue-50",
    SAR: "text-green-700 bg-green-50",
  };
  return m[name] ?? "text-neutral-700 bg-neutral-100";
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="border-b border-neutral-200 bg-white px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-neutral-900">Overview</h1>
          <p class="text-sm text-neutral-500 mt-0.5">Ringkasan data sistem ButuhBantuan</p>
        </div>
        <UiBadge variant="success" dot>Sistem Aktif</UiBadge>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-6">
      <!-- Stats cards -->
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="stat in stats" :key="stat.label" class="bg-white rounded-xl border border-neutral-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-medium text-neutral-500 uppercase tracking-wide">{{ stat.label }}</p>
            <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', stat.color]">
              <Icon :icon="stat.icon" class="text-base" />
            </div>
          </div>
          <p class="text-3xl font-bold text-neutral-900">{{ stat.value }}</p>
          <p class="text-xs text-neutral-400 mt-1">{{ stat.sub }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Recent table -->
        <div class="xl:col-span-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-semibold text-neutral-900">Layanan Terdaftar</h2>
              <p class="text-xs text-neutral-400 mt-0.5">8 layanan pertama</p>
            </div>
            <NuxtLink to="/emergencies" class="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Lihat semua
              <Icon icon="lucide:arrow-right" class="text-xs" />
            </NuxtLink>
          </div>
          <div class="divide-y divide-neutral-100">
            <div
              v-for="item in recentEmergencies"
              :key="item.id"
              class="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 transition-colors"
            >
              <img
                v-if="item.organization_logo"
                :src="item.organization_logo"
                :alt="item.name"
                class="w-8 h-8 rounded-lg object-contain bg-neutral-100 p-1 shrink-0"
              />
              <div v-else class="w-8 h-8 rounded-lg bg-neutral-100 shrink-0 flex items-center justify-center">
                <Icon icon="lucide:shield" class="text-neutral-400 text-sm" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-900 truncate">{{ item.name }}</p>
                <p class="text-xs text-neutral-400 truncate">{{ item.address?.regency }}</p>
              </div>
              <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', typeBadgeColor(item.emergency_type?.name)]">
                {{ item.emergency_type?.name ?? '-' }}
              </span>
            </div>
            <div v-if="!recentEmergencies.length" class="px-5 py-8 text-center text-sm text-neutral-400">
              Belum ada data
            </div>
          </div>
        </div>

        <!-- Type breakdown -->
        <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-neutral-100">
            <h2 class="text-sm font-semibold text-neutral-900">Breakdown per Jenis</h2>
            <p class="text-xs text-neutral-400 mt-0.5">Distribusi layanan aktif</p>
          </div>
          <div class="p-5 space-y-4">
            <div v-for="type in typeBreakdown" :key="type.id">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-sm font-medium text-neutral-700">{{ type.name }}</span>
                <span class="text-sm font-semibold text-neutral-900">{{ type.count }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  class="h-full rounded-full bg-primary-500 transition-all duration-500"
                  :style="{ width: `${Math.min(100, (type.count / Math.max(1, emergencies?.data?.length ?? 1)) * 100)}%` }"
                />
              </div>
            </div>
            <div v-if="!typeBreakdown.length" class="text-center text-sm text-neutral-400 py-4">
              Belum ada data
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
