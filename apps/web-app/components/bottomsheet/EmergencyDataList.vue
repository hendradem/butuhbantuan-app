<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { rankHintFor } from "~/utils/rankUnits";

defineProps<{
  emergencyData: any[];
  /** When true, show #1/#2/#3 smart-rank hints. */
  showRankHints?: boolean;
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
      class="mx-3 mb-4 px-4 py-5 text-center space-y-3"
      style="border-radius: var(--bb-radius-card); border: 1px solid #fde68a; background: #fffbeb"
    >
      <div class="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
        <Icon icon="lucide:map-pin-off" class="text-amber-700 text-xl" />
      </div>
      <div>
        <p class="font-semibold text-amber-950 text-[15px]">Di luar wilayah layanan</p>
        <p class="text-sm text-amber-900/80 mt-1 leading-relaxed">
          <template v-if="emergencyStore.lastRegionName">
            {{ emergencyStore.lastRegionName }} belum tercover.
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
          class="inline-flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white"
          style="background: var(--bb-danger); border-radius: var(--bb-radius-control)"
        >
          <Icon icon="lucide:phone" class="text-base" />
          Telepon {{ hl.label }}
        </a>
        <div class="flex flex-wrap justify-center gap-2">
          <a
            v-for="x in hl.extras || []"
            :key="x.tel"
            :href="`tel:${x.tel}`"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-900"
            style="border-radius: var(--bb-radius-control); background: #fff; border: 1px solid #fde68a"
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
      <button type="button" class="btn-base text-xs py-2 px-4" @click="openSearch">
        Ubah lokasi
      </button>
    </UiEmptyState>

    <div v-else class="ui-list-stack">
      <button
        v-for="(item, idx) in emergencyData"
        :key="item.emergencyData?.id ?? idx"
        type="button"
        :data-item-idx="idx"
        class="block w-full p-0 border-0 bg-transparent cursor-pointer"
        @click.stop="emit('select', item)"
      >
        <EmergencyListCard
          :emergency="item"
          :rank-hint="showRankHints ? rankHintFor(idx, item) : null"
        />
      </button>
    </div>
  </div>
</template>
