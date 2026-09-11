<script setup lang="ts">
import { appToast } from "~/utils/appToast";
import type { SavedPlace } from "~/utils/savedPlaces";
import { formatGeoAddress } from "~/utils/geo";
import { getSavedPlace } from "~/utils/savedPlaces";
import { hasMapView } from "~/utils/mapUrl";

const route = useRoute();
const onboardingStore = useOnboardingStore();
const { initUserLocation, readLastGeo, DIY_CENTER, reverseGeocode } = useGeolocation();
const { loadEmergencyData, ensureDeepLinkUnit } = useEmergencyApi();
const userLocation = useUserLocationStore();
const mapUrl = useMapUrl();
const { goToPlace } = usePlaceNavigation();

useMapUrlSync();
useViewportHeight();

if (import.meta.client) {
  mapUrl.seedFromUrl(mapUrl.read());
}

const shouldOnboarding = ref<boolean | null>(null);

onMounted(async () => {
  const stored = localStorage.getItem("onboarding");
  if (stored === "false") {
    shouldOnboarding.value = false;
    await boot();
  } else {
    shouldOnboarding.value = true;
  }
});

watch(
  () => onboardingStore.isOnboarding,
  async (v) => {
    if (!v) {
      shouldOnboarding.value = false;
      await boot();
    }
  },
);

async function boot() {
  const toast = appToast();
  const urlView = mapUrl.read();

  let hasUrlPin = hasMapView(urlView);
  let seed = hasUrlPin
    ? { lat: urlView.lat!, long: urlView.lng! }
    : readLastGeo() || DIY_CENTER;

  if (urlView.place) {
    const place = getSavedPlace(urlView.place);
    if (place) {
      userLocation.setManualLocation(true);
      userLocation.updateCoordinate(place.lat, place.lng);
      userLocation.updateFullAddress(place.address);
      seed = { lat: place.lat, long: place.lng };
      hasUrlPin = true;
    }
  }

  await loadEmergencyData(seed.lat, seed.long);

  if (urlView.unit || urlView.toLat != null) {
    await ensureDeepLinkUnit({
      unitId: urlView.unit,
      toLat: urlView.toLat,
      toLng: urlView.toLng,
    });
  }

  if (hasUrlPin && !urlView.place) {
    userLocation.setAddressLoading(true);
    try {
      const geo = await reverseGeocode(urlView.lng!, urlView.lat!);
      const formatted = formatGeoAddress(geo);
      userLocation.updateFullAddress(
        formatted || `${urlView.lat!.toFixed(5)}, ${urlView.lng!.toFixed(5)}`,
      );
    } finally {
      userLocation.setAddressLoading(false);
    }
  } else if (!hasUrlPin) {
    const fix = await initUserLocation();

    if (fix.errorCode === 1) {
      const appError = useAppErrorStore();
      appError.setErrorMessage("permission_denied");
      appError.onOpenSheet();
    }

    const moved =
      Math.abs(fix.lat - seed.lat) > 1e-5 || Math.abs(fix.long - seed.long) > 1e-5;
    if (fix.fromGps || moved) {
      await loadEmergencyData(fix.lat, fix.long);
    } else if (fix.errorCode !== 1) {
      toast.error("Tap ikon target untuk lokasi terkini (izinkan akses lokasi)", {
        duration: 4000,
      });
    }
  }

  mapUrl.finishHydration();
}

async function goToSavedPlace(place: SavedPlace) {
  await goToPlace(place);
}
</script>

<template>
  <div class="min-h-screen ui-page">
    <div class="max-w-md mx-auto ui-shell relative">
      <template v-if="shouldOnboarding === null">
        <div class="min-h-screen flex items-center justify-center">
          <div
            class="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style="border-color: var(--bb-accent); border-top-color: transparent"
          />
        </div>
      </template>

      <template v-else-if="shouldOnboarding">
        <AppOnboarding />
      </template>

      <template v-else>
        <!-- Map full-bleed; menu floats so rounded corners reveal map -->
        <div
          class="relative overflow-hidden bg-transparent"
          style="height: calc(var(--vh, 1vh) * 100)"
        >
          <AddToHomeScreenBanner />
          <OfflineBanner />
          <!-- Appears only while this device has a running report. -->
          <ActiveTicketIsland />

          <div class="absolute inset-0 z-0">
            <ClientOnly>
              <LeafletMap />
            </ClientOnly>
          </div>

          <div class="absolute bottom-0 left-0 right-0 z-[100] pointer-events-none">
            <div class="px-3 pb-2 flex flex-col items-end gap-2">
              <SavedPlacesDock @go="goToSavedPlace" />
              <UnitsDock />
            </div>
            <div class="pointer-events-auto">
              <BottomMenu />
            </div>
          </div>
        </div>

        <ExploreDetailSheet />
        <DetailSheet />
        <SearchSheet />
        <SavePlaceSheet />
        <OrderFormSheet />
        <ConfirmationSheet />
        <ReviewSheet />
        <ErrorSheet />
        <!-- SOS sheet kept for re-enable; entry points hidden (menu + NeedHelp). -->
        <!-- <SosSheet /> -->
        <MoreSheet />
        <NeedHelpSheet />
        <UnitsSheet />
      </template>
    </div>
  </div>
</template>
