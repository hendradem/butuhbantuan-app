<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { storeToRefs } from "pinia";
import { appToast } from "~/utils/appToast";

const searchSheet = useSearchSheetStore();
const userLocationStore = useUserLocationStore();
const leaflet = useLeafletStore();
const detailSheet = useDetailSheetStore();
const appError = useAppErrorStore();
const { clearRoute } = useMapRouting();
const { loadEmergencyData } = useEmergencyApi();
const { getCurrentLocation, applyFix } = useGeolocation();
const toast = appToast();

const { fullAddress, isGetCurrentLocation, isAddressLoading } =
  storeToRefs(userLocationStore);

const displayAddress = computed(() => fullAddress.value || "Mendeteksi lokasi...");
const isLoading = computed(() => isGetCurrentLocation.value || isAddressLoading.value);

function handleSearchBoxClick() {
  if (isLoading.value) return;
  searchSheet.onOpen();
}

async function handleGetCurrentLocation(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  if (isGetCurrentLocation.value) return;

  userLocationStore.updateIsGetCurrentLocation(true);
  detailSheet.onClose();
  clearRoute();
  toast.loading("Mencari GPS...");
  let toastSettled = false;

  try {
    const fix = await getCurrentLocation({
      preferGps: true,
      onSample: (sample) => {
        void applyFix(sample, { force: true, skipGeocode: true });
        const m = sample.accuracyM;
        if (m != null && m <= 120) {
          toast.loading(`GPS ±${Math.round(m)} m...`);
        }
      },
    });

    if (fix.errorCode === 1 && !fix.fromGps) {
      toast.dismiss();
      toastSettled = true;
      appError.setErrorMessage("permission_denied");
      appError.onOpenSheet();
      return;
    }

    if (!fix.fromGps) {
      toast.error(
        "GPS belum dapat kunci. Geser pin biru di peta, atau coba lagi di HP (luar ruangan).",
        { duration: 5000 },
      );
      toastSettled = true;
      return;
    }

    // Unblock UI immediately — geocode + services run in background
    await applyFix(fix, { force: true, skipGeocode: true });
    leaflet.requestDefaultView();

    const meters = fix.accuracyM ?? 0;
    if (meters > 0 && meters <= 50) {
      toast.success(`Lokasi akurat ±${Math.round(meters)} m`, { duration: 2500 });
    } else if (meters > 50 && meters <= 120) {
      toast.success(
        `Lokasi ±${Math.round(meters)} m — geser pin biru jika belum tepat`,
        { duration: 4000 },
      );
    } else if (meters > 120) {
      toast.success(
        `Lokasi ±${Math.round(meters)} m — geser pin biru jika belum tepat`,
        { duration: 4000 },
      );
    } else {
      toast.success("Lokasi diperbarui", { duration: 2500 });
    }
    toastSettled = true;

    void loadEmergencyData(fix.lat, fix.long);
  } catch {
    toast.error("Gagal mengambil lokasi");
    toastSettled = true;
  } finally {
    userLocationStore.updateIsGetCurrentLocation(false);
    if (!toastSettled) toast.dismiss();
  }
}
</script>

<template>
  <div class="search-box relative w-full isolate h-10">
    <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none z-10">
      <Icon icon="ph:magnifying-glass" class="text-xl text-gray-400" />
    </div>

    <div
      :class="['searchbox', isLoading ? 'cursor-default' : 'cursor-pointer']"
      @click="handleSearchBoxClick"
    >
      <template v-if="isLoading">
        <div class="searchbox__skeleton animate-pulse" aria-hidden="true">
          <div class="searchbox__skeleton-bar w-1/2" />
          <div class="searchbox__skeleton-bar w-1/4 opacity-70" />
        </div>
      </template>
      <template v-else>
        <span class="truncate block w-full">{{ displayAddress }}</span>
      </template>
    </div>

    <div class="absolute inset-y-0 end-0 flex items-center mx-2 z-30">
      <button
        type="button"
        :disabled="isGetCurrentLocation"
        class="relative z-30 flex items-center justify-center w-9 h-9 disabled:opacity-50 transition-opacity"
        style="
          border-radius: var(--bb-radius-pill);
          background: var(--bb-bg-surface);
          border: 1px solid var(--bb-border);
          box-shadow: var(--bb-shadow-xs);
          color: var(--bb-text);
        "
        title="Lokasi terkini"
        aria-label="Ambil lokasi terkini"
        @click.stop.prevent="handleGetCurrentLocation"
      >
        <Icon
          :icon="isGetCurrentLocation ? 'line-md:loading-loop' : 'mdi:crosshairs-gps'"
          class="text-xl pointer-events-none"
        />
      </button>
    </div>
  </div>
</template>
