<script setup lang="ts">
const onboardingStore = useOnboardingStore();
const { initUserLocation } = useGeolocation();
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
  }
);

async function boot() {
  // Sets initial map center and address from getCurrentPosition (fast, may be inaccurate).
  // Emergency data is NOT loaded here — watchPosition in LeafletMap handles the first
  // accurate GPS fix and triggers loadEmergencyData with the real coordinates.
  await initUserLocation();
}
</script>

<template>
  <div class="min-h-screen bg-neutral-200">
    <div class="max-w-md mx-auto bg-white relative">
      <template v-if="shouldOnboarding === null">
        <!-- splash -->
        <div class="min-h-screen flex items-center justify-center">
          <div class="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </template>

      <template v-else-if="shouldOnboarding">
        <AppOnboarding />
      </template>

      <template v-else>
        <!-- Main emergency view -->
        <div
          class="relative bg-white overflow-hidden"
          style="height: calc(var(--vh, 1vh) * 100)"
        >
          <AddToHomeScreenBanner />

          <!-- Map -->
          <div class="h-[78%] bg-neutral-100">
            <ClientOnly>
              <LeafletMap />
            </ClientOnly>
          </div>

          <!-- Bottom menu -->
          <div class="h-[22%] absolute bottom-0 left-0 right-0 z-[100]">
            <BottomMenu />
          </div>
        </div>

        <!-- Bottom sheets -->
        <ExploreDetailSheet />
        <DetailSheet />
        <SearchSheet />
        <OrderFormSheet />
        <ConfirmationSheet />
        <ReviewSheet />
        <ErrorSheet />
      </template>
    </div>
  </div>
</template>
