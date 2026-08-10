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
    <UiEmptyState
      v-if="emergencyData.length === 0"
      image-src="/assets/illustration/not-found.svg"
      title="Tidak ada layanan di sekitarmu"
      description="Coba pindah ke area lain atau perluas jangkauan pencarian."
    >
      <button type="button" class="btn-dark text-xs py-2 px-4" @click="openSearch">
        Ubah lokasi
      </button>
      <button type="button" class="btn-base hover:bg-neutral-100 text-xs py-2 px-4" @click="exploreSheet.onClose()">
        Tutup
      </button>
    </UiEmptyState>

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
            <div class="flex mt-2 items-center text-gray-500 text-sm gap-1.5 flex-wrap">
              <span class="flex items-center gap-1 min-w-0 shrink truncate">
                <Icon icon="mingcute:location-fill" class="shrink-0" />
                <span class="leading-none truncate">
                  {{ cityNameFormat(item.emergencyData?.address?.regency ?? "") }}
                </span>
              </span>
              
              <span
                v-for="tipe in (item.emergencyData?.tipe_emergency ?? [])"
                :key="tipe"
                :class="['shrink-0 text-[10px] font-medium px-2 uppercase rounded-full tracking-wide', tipe === 'emergency' ? 'bg-red-50 text-neutral-600' : tipe === 'transport' ? 'bg-blue-50 text-neutral-600' : tipe === 'pemadam' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700']"
              >{{ tipe === 'pencarian dan pertolongan' ? 'SAR' : tipe }}</span>
            </div>
          </div>
        </div>
      </div>
    </div> 
  </div>
</template>
