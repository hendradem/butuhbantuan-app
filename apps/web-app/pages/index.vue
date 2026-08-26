<script setup lang="ts">
import { appToast } from "~/utils/appToast";
import type { SavedPlace } from "~/utils/savedPlaces";

const route = useRoute();
const onboardingStore = useOnboardingStore();
const { initUserLocation, readLastGeo, DIY_CENTER } = useGeolocation();
const { loadEmergencyData } = useEmergencyApi();
const userLocation = useUserLocationStore();
const leaflet = useLeafletStore();
const detailSheet = useDetailSheetStore();
const exploreSheet = useExploreSheetStore();
const ticketSheet = useTicketSheetStore();
useViewportHeight();

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

/** Deep link: `/?ticket=NUMBER` (+ optional via/to) opens e-ticket sheet on home. */
async function openTicketFromQuery() {
  const n = String(route.query.ticket || "").trim();
  if (!n) return;
  const via = String(route.query.via || "");
  const to = String(route.query.to || "");
  const nextQuery = { ...route.query };
  delete nextQuery.ticket;
  delete nextQuery.via;
  delete nextQuery.to;
  // Land on `/` first so the store can pushState `/ticket/…` without remounting home.
  await navigateTo({ path: "/", query: nextQuery }, { replace: true });
  ticketSheet.open(n, { via, to });
}

watch(
  () => [shouldOnboarding.value, route.query.ticket] as const,
  ([ready, ticket]) => {
    if (ready === false && ticket) void openTicketFromQuery();
  },
  { immediate: true },
);

async function boot() {
  const toast = appToast();
  const seed = readLastGeo() || DIY_CENTER;

  // 1) Paint services ASAP so map is not stuck grey while GPS resolves
  void loadEmergencyData(seed.lat, seed.long);

  // 2) Resolve GPS (short attempts) and refresh if we got a real fix
  const fix = await initUserLocation();

  if (fix.errorCode === 1) {
    const appError = useAppErrorStore();
    appError.setErrorMessage("permission_denied");
    appError.onOpenSheet();
  }

  if (fix.fromGps) {
    await loadEmergencyData(fix.lat, fix.long);
  } else if (fix.errorCode !== 1) {
    toast.error("Tap ikon target untuk lokasi terkini (izinkan akses lokasi)", {
      duration: 4000,
    });
  }
}

async function goToSavedPlace(place: SavedPlace) {
  userLocation.setManualLocation(true);
  userLocation.updateCoordinate(place.lat, place.lng);
  userLocation.updateFullAddress(place.address);
  leaflet.resetLeafletRouting();
  leaflet.requestDefaultView();
  detailSheet.clearExploreReturn();
  detailSheet.onClose();
  exploreSheet.onClose();
  await loadEmergencyData(place.lat, place.lng);
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

          <div class="absolute inset-0 z-0">
            <ClientOnly>
              <LeafletMap />
            </ClientOnly>
          </div>

          <div class="absolute bottom-0 left-0 right-0 z-[100] pointer-events-none">
            <div class="pointer-events-auto px-3 pb-2 flex justify-end">
              <SavedPlacesDock @go="goToSavedPlace" />
            </div>
            <div class="pointer-events-auto max-h-[min(52vh,460px)]">
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
        <SosSheet />
        <MoreSheet />
        <NeedHelpSheet />
        <TicketSheet />
      </template>
    </div>
  </div>
</template>
