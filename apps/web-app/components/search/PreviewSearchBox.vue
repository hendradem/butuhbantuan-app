<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { storeToRefs } from "pinia";

const searchSheet = useSearchSheetStore();
const userLocationStore = useUserLocationStore();
const leaflet = useLeafletStore();
const detailSheet = useDetailSheetStore();
const { loadEmergencyData } = useEmergencyApi();

const { fullAddress, isGetCurrentLocation, isAddressLoading, gpsLat, gpsLong } =
  storeToRefs(userLocationStore);

const displayAddress = computed(() => fullAddress.value || "Mendeteksi lokasi...");
const isLoading = computed(() => isGetCurrentLocation.value || isAddressLoading.value);

function handleSearchBoxClick() {
  if (isLoading.value) return;
  searchSheet.onOpen();
}

async function handleGetCurrentLocation(e: Event) {
  e.preventDefault();
  if (isGetCurrentLocation.value) return;

  userLocationStore.updateIsGetCurrentLocation(true);

  // gpsLat/gpsLong are always kept current by watchPosition (even in manual mode).
  // Use them directly — no second getCurrentPosition call needed.
  const lat = gpsLat.value || userLocationStore.lat;
  const long = gpsLong.value || userLocationStore.long;

  if (!lat || !long) {
    userLocationStore.updateIsGetCurrentLocation(false);
    return;
  }

  // Snap the visible marker back to the real GPS position
  userLocationStore.setManualLocation(false);
  userLocationStore.updateCoordinate(lat, long);
  leaflet.resetLeafletRouting();
  detailSheet.onClose();

  await loadEmergencyData(lat, long);

  userLocationStore.updateIsGetCurrentLocation(false);
}
</script>

<template>
  <div class="search-box relative w-full">
    <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none z-10">
      <Icon icon="ph:magnifying-glass" class="text-xl text-gray-400" />
    </div>

    <div
      :class="['searchbox', isLoading ? 'cursor-default' : 'cursor-pointer']"
      @click="handleSearchBoxClick"
    >
      <!-- Skeleton height matches text-sm line-height (h-5 = 1.25rem = 20px) -->
      <template v-if="isLoading">
        <div class="animate-pulse flex items-center w-full gap-2">
          <div class="h-5 bg-gray-200 rounded w-1/2" />
          <div class="h-5 bg-gray-100 rounded w-1/4" />
        </div>
      </template>
      <template v-else>
        <span class="truncate">{{ displayAddress }}</span>
      </template>
    </div>

    <div class="absolute inset-y-0 end-0 flex items-center mx-2">
      <button
        type="button"
        :disabled="isGetCurrentLocation"
        class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-opacity"
        @click="handleGetCurrentLocation"
      >
        <Icon
          :icon="isGetCurrentLocation ? 'line-md:loading-loop' : 'line-md:my-location-loop'"
          class="text-neutral-500 text-xl"
        />
      </button>
    </div>
  </div>
</template>
