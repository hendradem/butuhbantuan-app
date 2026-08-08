<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { storeToRefs } from "pinia";
import { cityNameFormat } from "~/utils/cityNameFormat";

const exploreSheet = useExploreSheetStore();
const emergencyStore = useEmergencyStore();
const userLocation = useUserLocationStore();
const leaflet = useLeafletStore();
const detailSheet = useDetailSheetStore();
const { isLoading } = storeToRefs(emergencyStore);

const sheetData = computed(() => exploreSheet.sheetData);
const areaName = computed(() => cityNameFormat(userLocation.currentRegion.regency.name));
const scrollContainer = ref<HTMLElement | null>(null);

// Reactive: always reflects the latest filteredEmergency for the open type
const emergencyList = computed(() => {
  const typeName = sheetData.value?.emergencyType?.name;
  if (!typeName) return [];
  return emergencyStore.filteredEmergency.filter(
    (item: any) => item.emergencyData?.emergency_type?.name === typeName
  );
});

async function handleSelect(item: any) {
  const idx = emergencyList.value.indexOf(item);

  detailSheet.setDetailSheetData({
    emergencyType: item.emergencyData?.emergency_type,
    emergency: item,
  });
  detailSheet.onOpen();

  const coords = item.emergencyData?.coordinates;
  if (coords) {
    leaflet.updateLeafletRouting({
      startPoint: { lat: userLocation.lat, lng: userLocation.long },
      routeEndPoint: { lat: parseFloat(coords[1]), lng: parseFloat(coords[0]) },
    });
  }

  await nextTick();
  const el = scrollContainer.value?.querySelector(`[data-item-idx="${idx}"]`);
  (el as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleClose() {
  leaflet.resetLeafletRouting();
  detailSheet.onClose();
  exploreSheet.onClose();
}
</script>

<template>
  <CoreSheet :is-open="exploreSheet.isOpen" :snap-points="[280, 0]" @close="handleClose()">
    <template #header>
      <div
        v-if="sheetData?.emergencyType"
        class="border-b py-3 px-3 bg-white border-neutral-100 rounded-t-[40px] flex items-center justify-between"
      >
        <div class="flex gap-2 items-center">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 shrink-0">
            <Icon :icon="sheetData.emergencyType.icon" class="text-red-500 text-xl" />
          </div>
          <div>
            <h1 class="text-md leading-none font-semibold text-neutral-800">
              {{ sheetData.emergencyType.name }}
            </h1>
            <p v-if="areaName" class="m-0 mt-1 leading-none text-[13px] text-neutral-400">
              Di sekitar wilayah {{ areaName }}
            </p>
          </div>
        </div>
        <button
          class="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          @click="handleClose()"
        >
          <Icon icon="ion:close" class="text-neutral-600 text-xl" />
        </button>
      </div>
    </template>

    <div ref="scrollContainer" class="max-h-[280px] pt-3 pb-[80px] overflow-y-auto">
      <!-- Loading skeleton while emergency data is being refetched -->
      <div v-if="isLoading" class="space-y-2 px-0">
        <div
          v-for="i in 3"
          :key="i"
          class="mx-3 mb-2"
        >
          <div class="p-3 shadow-sm rounded-[10px] bg-white w-full border border-neutral-200 animate-pulse">
            <div class="flex gap-2">
              <div class="w-10 h-10 bg-gray-200 rounded-lg shrink-0" />
              <div class="flex-1 space-y-2 pt-0.5">
                <div class="h-4 bg-gray-200 rounded w-2/3" />
                <div class="h-3 bg-gray-100 rounded w-1/2" />
                <div class="flex gap-2 mt-1">
                  <div class="h-3 bg-gray-100 rounded w-1/4" />
                  <div class="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EmergencyDataList
        v-else
        :emergency-data="emergencyList"
        @select="handleSelect"
      />
    </div>
  </CoreSheet>
</template>
