<script setup lang="ts">
import { Icon } from "@iconify/vue";

const detailSheet = useDetailSheetStore();
const leaflet = useLeafletStore();
const userLocation = useUserLocationStore();

const data = computed(() => detailSheet.detailSheetData);
const emergencyData = computed(() => data.value?.emergency?.emergencyData);
const emergencyType = computed(() => data.value?.emergencyType);
const tripData = computed(() => data.value?.emergency?.trip);

function handleClose() {
  detailSheet.onClose();
  leaflet.resetLeafletRouting();
  if (leaflet.mapInstance && userLocation.lat && userLocation.long) {
    leaflet.mapInstance.setView([userLocation.lat, userLocation.long], 13);
  }
}
</script>

<template>
  <CoreSheet
    :is-open="detailSheet.isOpen"
    :snap-points="[280, 0]"
    scrollable
    @close="handleClose"
  >
    <template #header>
      <div
        v-if="emergencyData"
        class="border-b py-3 px-3 bg-white border-neutral-100 rounded-t-[40px] flex items-center justify-between"
      >
        <div class="flex gap-2 items-center min-w-0">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 shrink-0">
            <Icon :icon="emergencyType?.icon || 'mynaui:ambulance-solid'" class="text-red-500 text-xl" />
          </div>
          <div class="min-w-0">
            <h1 class="text-md leading-none m-0 text-neutral-800 font-semibold truncate">
              {{ emergencyData.name }}
            </h1>
            <p v-if="tripData" class="m-0 mt-1 leading-none text-[13px] text-neutral-500">
              ±{{ Math.min(Math.floor(tripData.duration) * 2, 20) }} menit dari lokasimu
            </p>
          </div>
        </div>
        <button
          type="button"
          class="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full shrink-0 ml-2"
          @click="handleClose"
        >
          <Icon icon="ion:close" class="text-neutral-600 text-xl" />
        </button>
      </div>
    </template>

    <div class="mt-2 pb-6">
      <EmergencyDataSingleList :data="data?.emergency" />
    </div>
  </CoreSheet>
</template>
