<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { displayEtaMinutes } from "~/utils/rankUnits";

const detailSheet = useDetailSheetStore();
const exploreSheet = useExploreSheetStore();
const leaflet = useLeafletStore();
const userLocation = useUserLocationStore();

const data = computed(() => detailSheet.detailSheetData);
const emergencyData = computed(() => data.value?.emergency?.emergencyData);
const emergencyType = computed(() => data.value?.emergencyType);
const tripData = computed(() => data.value?.emergency?.trip);

const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const unitStatsPath = computed(() => {
  const id = emergencyData.value?.id;
  return id ? `/unit/${id}` : "";
});

/** Prefer live OSRM route (matches map bubble); else Matrix trip minutes. */
const etaMinutes = computed(() => {
  const sec = leaflet.routeTravel?.durationSec;
  if (sec != null && Number.isFinite(sec)) {
    return Math.max(1, Math.round(sec / 60));
  }
  return displayEtaMinutes(tripData.value?.duration);
});

function handleClose() {
  menuOpen.value = false;
  detailSheet.onClose();
  leaflet.resetLeafletRouting();
}

function onStatsNavigate() {
  menuOpen.value = false;
  detailSheet.onClose();
}

function onDocPointer(e: Event) {
  const el = menuRef.value;
  if (!el || !menuOpen.value) return;
  if (e.target instanceof Node && !el.contains(e.target)) {
    menuOpen.value = false;
  }
}

watch(
  () => detailSheet.isOpen,
  (open) => {
    if (!open) {
      menuOpen.value = false;
      if (detailSheet.fromExploreList) {
        detailSheet.clearExploreReturn();
        exploreSheet.onOpen();
      }
    }
  },
);

onMounted(() => {
  if (!import.meta.client) return;
  document.addEventListener("pointerdown", onDocPointer, true);
});
onBeforeUnmount(() => {
  if (!import.meta.client) return;
  document.removeEventListener("pointerdown", onDocPointer, true);
});
</script>

<template>
  <CoreSheet
    :is-open="detailSheet.isOpen"
    :snap-points="[330, 0]"
    scrollable
    @close="handleClose"
  >
    <template #header>
      <div
        v-if="emergencyData"
        class="relative py-3 px-3 flex items-center justify-between gap-2"
        style="border-bottom: 1px solid var(--bb-border); border-radius: var(--bb-radius-sheet) var(--bb-radius-sheet) 0 0"
      >
        <div class="flex gap-2 items-center min-w-0 flex-1">
          <div class="flex items-center justify-center w-8 h-8 shrink-0 ui-icon-well--danger" style="border-radius: 0.75rem">
            <Icon :icon="emergencyType?.icon || 'mynaui:ambulance-solid'" class="text-xl" />
          </div>
          <div class="min-w-0">
            <h1 class="text-md leading-none m-0 font-semibold truncate ui-text-primary">
              {{ emergencyData.name }}
            </h1>
            <p v-if="etaMinutes != null" class="m-0 mt-1 leading-none text-[13px] ui-text-secondary">
              ±{{ etaMinutes }} menit dari lokasimu
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <div v-if="unitStatsPath" ref="menuRef" class="relative">
            <button
              type="button"
              class="flex items-center justify-center w-8 h-8 ui-icon-well"
              title="Lainnya"
              aria-label="Lainnya"
              aria-haspopup="menu"
              :aria-expanded="menuOpen"
              @click.stop="menuOpen = !menuOpen"
            >
              <Icon icon="mdi:dots-vertical" class="text-xl" style="color: var(--bb-text-secondary)" />
            </button>

            <Transition name="filter-drop">
              <div
                v-if="menuOpen"
                class="ui-card absolute right-0 bottom-full mb-1.5 w-56 z-[80] overflow-hidden py-1"
                style="box-shadow: var(--bb-shadow-soft)"
                role="menu"
              >
                <NuxtLink
                  :to="unitStatsPath"
                  class="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium ui-text-primary hover:bg-neutral-50 active:bg-neutral-100"
                  role="menuitem"
                  @click="onStatsNavigate"
                >
                  <Icon icon="lucide:bar-chart-2" class="text-base shrink-0" style="color: var(--bb-text-secondary)" />
                  <span class="min-w-0 flex-1">Statistik publik</span>
                  <Icon icon="lucide:arrow-up-right" class="text-xs shrink-0" style="color: var(--bb-text-tertiary)" />
                </NuxtLink>
              </div>
            </Transition>
          </div>

          <button
            type="button"
            class="flex items-center justify-center w-8 h-8 shrink-0 ui-icon-well"
            @click="handleClose"
          >
            <Icon icon="ion:close" class="text-xl" style="color: var(--bb-text-secondary)" />
          </button>
        </div>
      </div>
    </template>

    <div class="pb-6" style="background: #fafafa">
      <EmergencyDataSingleList :data="data?.emergency" />
    </div>
  </CoreSheet>
</template>

<style scoped>
.filter-drop-enter-active,
.filter-drop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.filter-drop-enter-from,
.filter-drop-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
