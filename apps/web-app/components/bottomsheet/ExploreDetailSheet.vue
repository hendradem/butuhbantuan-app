<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { storeToRefs } from "pinia";
import { cityNameFormat } from "~/utils/cityNameFormat";
import { partnerTierOf, type PartnerTier } from "~/utils/partnerTier";
import { compareUnitsSmart, displayEtaMinutes } from "~/utils/rankUnits";

const exploreSheet = useExploreSheetStore();
const emergencyStore = useEmergencyStore();
const emergencyDataStore = useEmergencyDataStore();
const userLocation = useUserLocationStore();
const leaflet = useLeafletStore();
const detailSheet = useDetailSheetStore();
const { isLoading } = storeToRefs(emergencyStore);

const sheetData = computed(() => exploreSheet.sheetData);
const areaName = computed(() => cityNameFormat(userLocation.currentRegion.regency.name));
const scrollContainer = ref<HTMLElement | null>(null);

const emergencyList = computed(() => {
  const typeName = sheetData.value?.emergencyType?.name;
  if (!typeName) return [];
  return emergencyStore.filteredEmergency.filter(
    (item: any) => item.emergencyData?.emergency_type?.name === typeName
  );
});

type ServiceMode = "all" | "emergency" | "transport";
type SortMode = "smart" | "eta" | "distance";
type TierFilter = "all" | PartnerTier;

const serviceMode = ref<ServiceMode>("all");
const sortMode = ref<SortMode>("smart");
const tierFilter = ref<TierFilter>("all");
const only24h = ref(false);
const onlyAvailable = ref(false);

const filterOpen = ref(false);
const filterMenuRef = ref<HTMLElement | null>(null);

const showServiceFilter = computed(() => {
  const name = String(sheetData.value?.emergencyType?.name || "").toLowerCase();
  return name.includes("ambulance");
});

const showFilterMenu = computed(() => emergencyList.value.length > 0);

const activeFilterCount = computed(() => {
  let n = 0;
  if (showServiceFilter.value && serviceMode.value !== "all") n += 1;
  if (sortMode.value !== "smart") n += 1;
  if (tierFilter.value !== "all") n += 1;
  if (only24h.value) n += 1;
  if (onlyAvailable.value) n += 1;
  return n;
});

watch(
  () => sheetData.value?.emergencyType?.name,
  () => {
    serviceMode.value = "all";
    sortMode.value = "smart";
    tierFilter.value = "all";
    only24h.value = false;
    onlyAvailable.value = false;
    filterOpen.value = false;
  }
);

watch(
  () => exploreSheet.isOpen,
  (open) => {
    if (!open) filterOpen.value = false;
  }
);

function etaMinutes(duration?: number) {
  const m = displayEtaMinutes(duration);
  return m == null ? Number.POSITIVE_INFINITY : m;
}

function matchesService(item: any): boolean {
  if (!showServiceFilter.value || serviceMode.value === "all") return true;
  const tipes: string[] = (item.emergencyData?.tipe_emergency ?? []).map((t: string) =>
    String(t).toLowerCase()
  );
  if (!tipes.length) {
    const tos = String(item.emergencyData?.type_of_service || "").toLowerCase();
    if (serviceMode.value === "emergency") return tos.includes("emergency") || tos.includes("darurat");
    if (serviceMode.value === "transport") return tos.includes("transport");
    return true;
  }
  return tipes.includes(serviceMode.value);
}

const filteredEmergencyList = computed(() => {
  let list = emergencyList.value.filter((item: any) => {
    if (!matchesService(item)) return false;

    if (tierFilter.value !== "all") {
      if (partnerTierOf(item.emergencyData) !== tierFilter.value) return false;
    }

    if (only24h.value && !item.emergencyData?.operational?.is_24_hours) return false;

    if (onlyAvailable.value) {
      const fleet = item.emergencyData?.fleet;
      const available = Number(fleet?.available ?? 0);
      if (!(available > 0 || item.emergencyData?.operational?.is_active)) return false;
    }

    return true;
  });

  list = [...list].sort((a: any, b: any) => {
    if (sortMode.value === "distance") {
      return (a.trip?.distance ?? Infinity) - (b.trip?.distance ?? Infinity);
    }
    if (sortMode.value === "eta") {
      return etaMinutes(a.trip?.duration) - etaMinutes(b.trip?.duration);
    }
    return compareUnitsSmart(a, b);
  });

  return list;
});

function onClickOutside(e: MouseEvent) {
  if (filterMenuRef.value && !filterMenuRef.value.contains(e.target as Node)) {
    filterOpen.value = false;
  }
}
onMounted(() => document.addEventListener("mousedown", onClickOutside));
onUnmounted(() => document.removeEventListener("mousedown", onClickOutside));

async function handleSelect(item: any) {
  filterOpen.value = false;
  const idx = filteredEmergencyList.value.indexOf(item);

  emergencyDataStore.updateSelectedEmergencyData({
    selectedEmergencyData: item.emergencyData,
    selectedEmergencySource: "detail",
  });

  detailSheet.setDetailSheetData({
    emergencyType: item.emergencyData?.emergency_type ?? sheetData.value?.emergencyType,
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
  scrollSelectedCardToTop(idx);
}

/** Pin clicked list card to top of the sheet scroller with breathing room. */
const LIST_SCROLL_TOP_MARGIN = 16;

function scrollSelectedCardToTop(idx: number) {
  const el = scrollContainer.value?.querySelector(
    `[data-item-idx="${idx}"]`,
  ) as HTMLElement | null;
  if (!el) return;

  let scroller: HTMLElement | null = el.parentElement;
  while (scroller && scroller !== document.body) {
    const { overflowY } = getComputedStyle(scroller);
    if (overflowY === "auto" || overflowY === "scroll") break;
    scroller = scroller.parentElement;
  }
  if (!scroller) {
    el.style.scrollMarginTop = `${LIST_SCROLL_TOP_MARGIN}px`;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const delta =
    el.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top -
    LIST_SCROLL_TOP_MARGIN;
  scroller.scrollTo({
    top: Math.max(0, scroller.scrollTop + delta),
    behavior: "smooth",
  });
}

function handleClose() {
  filterOpen.value = false;
  leaflet.resetLeafletRouting();
  detailSheet.onClose();
  exploreSheet.onClose();
}

function resetFilters() {
  serviceMode.value = "all";
  sortMode.value = "smart";
  tierFilter.value = "all";
  only24h.value = false;
  onlyAvailable.value = false;
}

function chipClass(active: boolean) {
  return [
    "px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors",
    active
      ? "bg-neutral-900 text-white border-neutral-900"
      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300",
  ];
}
</script>

<template>
  <CoreSheet :is-open="exploreSheet.isOpen" :snap-points="[300, 0]" scrollable @close="handleClose()">
    <template #header>
      <div
        v-if="sheetData?.emergencyType"
        class="relative py-3 px-3 flex items-center justify-between gap-2"
        style="border-bottom: 1px solid var(--bb-border); border-radius: var(--bb-radius-sheet) var(--bb-radius-sheet) 0 0"
      >
        <div class="flex gap-2 items-center min-w-0 flex-1">
          <div class="flex items-center justify-center w-8 h-8 shrink-0 ui-icon-well--danger" style="border-radius: 0.75rem">
            <Icon :icon="sheetData.emergencyType.icon" class="text-xl" />
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="text-md leading-none font-semibold truncate ui-text-primary">
              {{ sheetData.emergencyType.name }}
            </h1>
            <p v-if="areaName" class="m-0 mt-1 leading-none text-[13px] ui-text-secondary truncate">
              Dalam jangkauan · {{ areaName }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Dotted filter menu -->
          <div v-if="showFilterMenu" ref="filterMenuRef" class="relative">
            <button
              type="button"
              class="relative flex items-center justify-center w-8 h-8 ui-icon-well"
              title="Filter"
              aria-label="Filter"
              @click.stop="filterOpen = !filterOpen"
            >
              <Icon icon="mdi:dots-vertical" class="text-xl" style="color: var(--bb-text-secondary)" />
              <span
                v-if="activeFilterCount > 0"
                class="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                style="background: var(--bb-danger)"
              >
                {{ activeFilterCount }}
              </span>
            </button>

            <Transition name="filter-drop">
              <div
                v-if="filterOpen"
                class="ui-card absolute right-0 bottom-full mb-1.5 w-72 max-w-[calc(100vw-1.5rem)] z-[80] overflow-hidden"
                style="box-shadow: var(--bb-shadow-soft)"
              >
                <div class="px-3 py-2.5 border-b border-neutral-100 flex items-center justify-between gap-2">
                  <p class="text-sm font-semibold text-neutral-900">Filter</p>
                  <button
                    v-if="activeFilterCount > 0"
                    type="button"
                    class="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 px-1.5 py-0.5"
                    @click="resetFilters"
                  >
                    Reset
                  </button>
                </div>

                <div class="px-3 py-3 space-y-3.5 max-h-[55vh] overflow-y-auto">
                  <!-- Layanan (ambulance only) -->
                  <div v-if="showServiceFilter">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">
                      Jenis layanan
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="opt in [
                          { id: 'all', label: 'Semua' },
                          { id: 'emergency', label: 'Darurat' },
                          { id: 'transport', label: 'Transport' },
                        ]"
                        :key="opt.id"
                        type="button"
                        :class="chipClass(serviceMode === opt.id)"
                        @click="serviceMode = opt.id as ServiceMode"
                      >
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>

                  <!-- Urutan -->
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">
                      Urutkan
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        :class="chipClass(sortMode === 'smart')"
                        @click="sortMode = 'smart'"
                      >
                        Paling masuk akal
                      </button>
                      <button
                        type="button"
                        :class="chipClass(sortMode === 'eta')"
                        @click="sortMode = 'eta'"
                      >
                        Tercepat
                      </button>
                      <button
                        type="button"
                        :class="chipClass(sortMode === 'distance')"
                        @click="sortMode = 'distance'"
                      >
                        Terdekat
                      </button>
                    </div>
                  </div>

                  <!-- Mitra -->
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">
                      Jenis mitra
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="opt in [
                          { id: 'all', label: 'Semua' },
                          { id: 'psc', label: 'Resmi' },
                          { id: 'verified', label: 'Terverifikasi' },
                          { id: 'community', label: 'Komunitas' },
                        ]"
                        :key="opt.id"
                        type="button"
                        :class="chipClass(tierFilter === opt.id)"
                        @click="tierFilter = opt.id as TierFilter"
                      >
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>

                  <!-- Toggles -->
                  <div class="space-y-2 pt-0.5">
                    <button
                      type="button"
                      class="w-full flex items-center justify-between gap-3 px-1 py-1 text-left"
                      @click="only24h = !only24h"
                    >
                      <span class="text-sm text-neutral-800">Hanya 24 jam</span>
                      <span
                        :class="[
                          'w-9 h-5 rounded-full relative transition-colors',
                          only24h ? 'bg-neutral-900' : 'bg-neutral-200',
                        ]"
                      >
                        <span
                          :class="[
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                            only24h ? 'translate-x-4' : 'translate-x-0.5',
                          ]"
                        />
                      </span>
                    </button>
                    <button
                      type="button"
                      class="w-full flex items-center justify-between gap-3 px-1 py-1 text-left"
                      @click="onlyAvailable = !onlyAvailable"
                    >
                      <span class="text-sm text-neutral-800">Armada tersedia</span>
                      <span
                        :class="[
                          'w-9 h-5 rounded-full relative transition-colors',
                          onlyAvailable ? 'bg-neutral-900' : 'bg-neutral-200',
                        ]"
                      >
                        <span
                          :class="[
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                            onlyAvailable ? 'translate-x-4' : 'translate-x-0.5',
                          ]"
                        />
                      </span>
                    </button>
                  </div>
                </div>

                <div class="px-3 py-2 border-t border-neutral-100 bg-neutral-50">
                  <p class="text-[11px] text-neutral-500">
                    Menampilkan {{ filteredEmergencyList.length }} dari {{ emergencyList.length }} unit
                  </p>
                </div>
              </div>
            </Transition>
          </div>

          <button
            type="button"
            class="flex items-center justify-center w-8 h-8 shrink-0 ui-icon-well"
            @click="handleClose()"
          >
            <Icon icon="ion:close" class="text-xl" style="color: var(--bb-text-secondary)" />
          </button>
        </div>
      </div>
    </template>

    <div ref="scrollContainer" class="pb-20" style="background: #fafafa">
      <div v-if="isLoading" class="ui-list-stack">
        <div v-for="i in 3" :key="i" class="ui-list-card animate-pulse">
          <div class="ui-list-card__row">
            <div class="w-11 h-11 rounded-[0.7rem] soft-skel shrink-0" />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="h-4 w-3/5 soft-skel" />
                <div class="h-3 w-14 soft-skel shrink-0" />
              </div>
              <div class="h-3.5 w-2/5 soft-skel mt-1.5" />
              <div class="mt-2.5 flex flex-wrap gap-1.5">
                <div class="h-5 w-16 rounded-full soft-skel" />
                <div class="h-5 w-14 rounded-full soft-skel" />
                <div class="h-5 w-16 rounded-full soft-skel" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <EmergencyDataList
        v-else
        :emergency-data="filteredEmergencyList"
        :show-rank-hints="sortMode === 'smart'"
        @select="handleSelect"
      />
    </div>
  </CoreSheet>
</template>

<style scoped>
.filter-drop-enter-active,
.filter-drop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.filter-drop-enter-from,
.filter-drop-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.97);
}
</style>
