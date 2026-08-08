<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { cityNameFormat } from "~/utils/cityNameFormat";
import { formatDistance } from "~/utils/geo";

const props = defineProps<{
  emergencyData: any[];
}>();

const emit = defineEmits<{
  select: [emergency: any];
}>();

const exploreSheet = useExploreSheetStore();
const searchSheet = useSearchSheetStore();

function badgeClass(duration: number): string {
  if (duration <= 15) return "bg-green-500 text-white";
  if (duration <= 18) return "bg-orange-500 text-white";
  if (duration <= 20) return "bg-red-500 text-white";
  return "bg-black text-white";
}

function openSearch() {
  exploreSheet.onClose();
  searchSheet.onOpen();
}
</script>

<template>
  <div>
    <!-- Empty state -->
    <div
      v-if="emergencyData.length === 0"
      class="flex flex-col items-center justify-center py-6 px-6 text-center"
    >
      <img
        src="/assets/illustration/not-found.svg"
        alt="Tidak ada data"
        class="w-28 mb-3 opacity-80"
      />
      <p class="text-sm font-semibold text-neutral-700">Tidak ada layanan di sekitarmu</p>
      <p class="text-xs text-neutral-400 mt-1">
        Coba pindah ke area lain atau perluas jangkauan pencarian.
      </p>
      <div class="flex gap-2 mt-4">
        <button type="button" class="btn-dark text-xs py-2 px-4" @click="openSearch">
          Ubah lokasi
        </button>
        <button type="button" class="btn-base hover:bg-neutral-100 text-xs py-2 px-4" @click="exploreSheet.onClose()">
          Tutup
        </button>
      </div>
    </div>

    <div
      v-for="(item, idx) in emergencyData"
      :key="idx"
      :data-item-idx="idx"
      class="mx-3 mb-2 cursor-pointer"
      @click="emit('select', item)"
    >
      <div class="p-3 border shadow-sm rounded-[10px] bg-white w-full border-neutral-100">
        <div class="flex">
          <div class="w-[15%]">
            <div class="w-10 h-10 bg-white border border-neutral-100 p-1.5 rounded-lg flex items-center justify-center">
              <img
                :src="item.emergencyData?.organization_logo"
                :alt="item.emergencyData?.name"
                class="w-full h-full object-contain"
              />
            </div>
          </div>
          <div class="w-[85%]">
            <div class="flex justify-between items-center gap-2">
              <h3 class="font-semibold leading-none text-gray-900 truncate min-w-0 flex-1">
                {{ item.emergencyData?.name?.slice(0, 18) }}
              </h3>
              <div class="flex items-center gap-1 shrink-0">
                <span
                  v-if="item.emergencyData?.is_dispatcher"
                  class="badge badge-icon border-0 shadow-none bg-blue-500 text-white text-[11px] rounded-full px-1"
                >
                  <Icon icon="fluent:person-call-16-filled" class="text-[15px]" />
                </span>
                <span
                  :class="['badge badge-icon border-0 shadow-none text-[11px]', badgeClass(Math.floor(item.trip?.duration) * 2)]"
                >
                  <Icon icon="heroicons:clock" class="mr-1 text-[15px]" />
                  {{ Math.min(Math.floor(item.trip?.duration) * 2, 20) }} min
                </span>
                <span class="badge badge-icon border-0 shadow-none text-[11px] bg-neutral-100 text-neutral-600">
                  <Icon icon="mingcute:route-fill" class="mr-1 text-[15px]" />
                  {{ formatDistance(item.trip?.distance ?? 0) }}
                </span>
              </div>
            </div>
            <p class="text-gray-500 leading-normal truncate text-sm">
              {{ item.emergencyData?.organization_name?.slice(0, 30) }}
            </p>
            <div class="flex mt-2 items-center text-gray-500 text-sm gap-2 truncate">
              <span class="flex items-center gap-1">
                <Icon icon="mingcute:location-fill" />
                <span class="leading-none">
                  {{ cityNameFormat(item.emergencyData?.address?.regency ?? "") }}
                </span>
              </span>
              <span class="flex items-center gap-1">
                <Icon icon="mdi:circle-outline" />
                <span class="leading-none">{{ item.emergencyData?.type_of_service }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA when list is shown -->
    <div v-if="emergencyData?.length" class="flex items-center justify-center mt-2">
      <button type="button" class="btn-dark" @click="openSearch">Ubah pencarian</button>
      <button type="button" class="btn-base hover:bg-neutral-100" @click="exploreSheet.onClose()">
        Cari di maps
      </button>
    </div>
  </div>
</template>
