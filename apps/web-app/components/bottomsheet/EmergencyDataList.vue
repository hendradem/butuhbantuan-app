<script setup lang="ts">
import { cityNameFormat } from "~/utils/cityNameFormat";
import { formatDistance } from "~/utils/geo";
import { emergencyLogoSrc, onEmergencyLogoError } from "~/utils/emergencyLogo";
import { partnerTierBadgeClass, partnerTierLabel, partnerTierOf } from "~/utils/partnerTier";
import { Icon } from "@iconify/vue";

defineProps<{
  emergencyData: any[];
}>();

const emit = defineEmits<{
  select: [emergency: any];
}>();

const exploreSheet = useExploreSheetStore();
const searchSheet = useSearchSheetStore();
const emergencyStore = useEmergencyStore();
const { hotlines } = useOfflineCache();

const uncovered = computed(
  () => emergencyStore.coverageChecked && !emergencyStore.isCovered,
);
const hl = computed(() => hotlines());

function etaMinutes(duration?: number) {
  if (duration == null || Number.isNaN(duration)) return null;
  return Math.min(Math.floor(duration) * 2, 20);
}

function etaBadgeClass(mins: number | null) {
  if (mins == null) return "bg-neutral-50 text-neutral-700 border-neutral-200";
  if (mins <= 15) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (mins <= 18) return "bg-amber-50 text-amber-800 border-amber-200";
  if (mins <= 20) return "bg-red-50 text-red-800 border-red-200";
  return "bg-neutral-50 text-neutral-700 border-neutral-200";
}

function distanceBadgeClass(meters?: number) {
  const m = meters ?? 0;
  if (m <= 2000) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (m <= 5000) return "bg-amber-50 text-amber-800 border-amber-200";
  if (m <= 10000) return "bg-red-50 text-red-800 border-red-200";
  return "bg-neutral-50 text-neutral-700 border-neutral-200";
}

function openSearch() {
  exploreSheet.onClose();
  searchSheet.onOpen();
}
</script>

<template>
  <div>
    <!-- Out of coverage -->
    <div
      v-if="emergencyData.length === 0 && uncovered"
      class="mx-3 mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center space-y-3"
    >
      <div class="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
        <Icon icon="lucide:map-pin-off" class="text-amber-700 text-xl" />
      </div>
      <div>
        <p class="font-semibold text-amber-950 text-[15px]">Di luar wilayah layanan</p>
        <p class="text-sm text-amber-900/80 mt-1 leading-relaxed">
          <template v-if="emergencyStore.lastRegionName">
            {{ emergencyStore.lastRegionName }} belum tercakup ButuhBantuan.
          </template>
          <template v-else>
            Lokasi ini belum masuk cakupan.
          </template>
          Untuk darurat, hubungi hotline nasional atau pindah ke wilayah tercakup.
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <a
          :href="`tel:${hl.psc}`"
          class="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emergency-600 text-white text-sm font-semibold"
        >
          <Icon icon="lucide:phone" class="text-base" />
          Telepon {{ hl.label }}
        </a>
        <div class="flex flex-wrap justify-center gap-2">
          <a
            v-for="x in hl.extras || []"
            :key="x.tel"
            :href="`tel:${x.tel}`"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-amber-200 text-amber-900"
          >
            {{ x.label }} {{ x.tel }}
          </a>
        </div>
        <button type="button" class="btn-dark text-xs py-2 px-4" @click="openSearch">
          Cari lokasi di wilayah tercakup
        </button>
      </div>
    </div>

    <UiEmptyState
      v-else-if="emergencyData.length === 0"
      image-src="/assets/illustration/not-found.svg"
      title="Tidak ada unit di radius cepat"
      description="Wilayah tercakup, tapi belum ada unit dalam jangkauan ETA. Coba ubah lokasi atau hubungi PSC."
    >
      <a :href="`tel:${hl.psc}`" class="btn-dark text-xs py-2 px-4 inline-flex items-center gap-1.5">
        <Icon icon="lucide:phone" class="text-sm" />
        {{ hl.label }}
      </a>
      <button type="button" class="btn-base hover:bg-neutral-100 text-xs py-2 px-4" @click="openSearch">
        Ubah lokasi
      </button>
    </UiEmptyState>

    <button
      v-for="(item, idx) in emergencyData"
      :key="item.emergencyData?.id ?? idx"
      type="button"
      :data-item-idx="idx"
      class="mx-3 mb-2.5 w-[calc(100%-1.5rem)] text-left cursor-pointer"
      @click.stop="emit('select', item)"
    >
      <div class="p-4 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50/60 transition-colors">
        <div class="flex gap-3.5 items-start">
          <div class="w-11 h-11 rounded-lg bg-neutral-50 border border-neutral-200 p-1.5 flex items-center justify-center shrink-0">
            <img
              :src="emergencyLogoSrc(item.emergencyData)"
              :alt="item.emergencyData?.name"
              class="w-full h-full object-contain"
              @error="onEmergencyLogoError($event, item.emergencyData)"
            >
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-semibold text-[15px] leading-snug text-neutral-900 truncate min-w-0">
                {{ item.emergencyData?.name }}
              </h3>
              <span
                v-if="cityNameFormat(item.emergencyData?.address?.regency ?? '')"
                class="shrink-0 inline-flex items-center gap-1 text-xs text-neutral-500 leading-snug pt-0.5"
              >
                <Icon icon="mingcute:location-fill" class="text-xs" />
                {{ cityNameFormat(item.emergencyData?.address?.regency ?? "") }}
              </span>
            </div>

            <p class="mt-0.5 text-sm text-neutral-500 truncate">
              {{ item.emergencyData?.organization_name }}
            </p>

            <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span
                :class="[
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  partnerTierBadgeClass(partnerTierOf(item.emergencyData)),
                ]"
              >
                {{ partnerTierLabel(partnerTierOf(item.emergencyData)) }}
              </span>
              <span
                v-if="etaMinutes(item.trip?.duration) != null"
                :class="[
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  etaBadgeClass(etaMinutes(item.trip?.duration)),
                ]"
              >
                <Icon icon="heroicons:clock" class="text-sm" />
                {{ etaMinutes(item.trip?.duration) }} min
              </span>
              <span
                v-if="item.trip"
                :class="[
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  distanceBadgeClass(item.trip?.distance),
                ]"
              >
                <Icon icon="mingcute:route-fill" class="text-sm" />
                {{ formatDistance(item.trip?.distance ?? 0) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  </div>
</template>
