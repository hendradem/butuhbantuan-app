<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { storeToRefs } from "pinia";
import { cityNameFormat } from "~/utils/cityNameFormat";
import { isComplianceComplete, isComplianceVerified } from "~/utils/complianceFilter";
import { partnerTierOf, type PartnerTier } from "~/utils/partnerTier";
import { compareUnitsSmart, displayEtaMinutes } from "~/utils/rankUnits";

const exploreSheet = useExploreSheetStore();
const emergencyStore = useEmergencyStore();
const userLocation = useUserLocationStore();
const leaflet = useLeafletStore();
const detailSheet = useDetailSheetStore();
const mapUrl = useMapUrl();
const { clearRoute } = useMapRouting();
const { share: shareMapLink } = useShareMapLink();
const { openEmergencyDetail } = useOpenUnit();
const { isLoading } = storeToRefs(emergencyStore);

const sheetData = computed(() => exploreSheet.sheetData);
const areaName = computed(() => cityNameFormat(userLocation.currentRegion.regency.name));
const scrollContainer = ref<HTMLElement | null>(null);

// ── Snap coordination ──────────────────────────────────────────────────────
// The list sheet has two heights: default (0.5vh) and tall (0.75vh). CoreSheet
// runs in content-drag mode: dragging the list moves the sheet until it's
// tall, then the list scrolls; pulling down from the top collapses it.
// Whenever the snap changes, the map is re-fit so the user marker + nearby
// unit pins stay visible above the sheet.
const SNAP_DEFAULT = 0;
const SNAP_TALL = 1;
const currentSnapIdx = ref(SNAP_DEFAULT);
// Baseline map zoom captured when the sheet opens; used as the anchor for
// `fitMapForSheet` so tall → default restores exactly (not `current - (-1)`).
let baseZoom: number | null = null;

const emergencyList = computed(() => {
  const typeName = sheetData.value?.emergencyType?.name;
  if (!typeName) return [];
  return emergencyStore.filteredEmergency.filter(
    (item: any) => item.emergencyData?.emergency_type?.name === typeName
  );
});

type ServiceMode = "all" | "emergency" | "transport" | "jenazah";
type SortMode = "smart" | "eta" | "distance";
type TierFilter = "all" | PartnerTier;

const serviceMode = ref<ServiceMode>("all");
const sortMode = ref<SortMode>("smart");
const tierFilter = ref<TierFilter>("all");
const only24h = ref(false);
const onlyAvailable = ref(false);
const onlyVerified = ref(false);
const onlyComplete = ref(false);

const filterOpen = ref(false);
const filterMenuRef = ref<HTMLElement | null>(null);

const showServiceFilter = computed(() => {
  const name = String(sheetData.value?.emergencyType?.name || "").toLowerCase();
  return name.includes("ambulance");
});

const showFilterMenu = computed(() => emergencyList.value.length > 0);

const showComplianceFilter = computed(() => {
  const name = String(sheetData.value?.emergencyType?.name || "").toLowerCase();
  return name.includes("ambulance") || name.includes("ambulans");
});

const activeFilterCount = computed(() => {
  let n = 0;
  if (showServiceFilter.value && serviceMode.value !== "all") n += 1;
  if (sortMode.value !== "smart") n += 1;
  if (tierFilter.value !== "all") n += 1;
  if (only24h.value) n += 1;
  if (onlyAvailable.value) n += 1;
  if (onlyVerified.value) n += 1;
  if (onlyComplete.value) n += 1;
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
    onlyVerified.value = false;
    onlyComplete.value = false;
    filterOpen.value = false;
  }
);

/**
 * Position the user marker in the centre of the visible map strip (the area
 * above the sheet). Optionally applies a zoom delta so we can zoom out when
 * the sheet expands so nearby unit markers stay in view.
 */
function fitMapForSheet(snapVh: number, zoomDelta = 0) {
  if (!import.meta.client || !leaflet.mapInstance || !userLocation.lat || !userLocation.long) return;
  const map = leaflet.mapInstance as any;
  if (baseZoom == null) baseZoom = map.getZoom() as number;
  const anchor = baseZoom ?? map.getZoom();
  const targetZoom = Math.max(10, anchor + zoomDelta);
  const H = window.innerHeight;
  // Visible strip = (1 - snapVh) * H at the top of the viewport. Place the
  // user marker ~1/3 down that strip so nearby unit pins still fit below it.
  const targetUserY = Math.round(((1 - snapVh) / 3) * H);
  const offset = Math.round(H / 2 - targetUserY);
  const userPx = map.project([userLocation.lat, userLocation.long], targetZoom);
  const centrePx = userPx.add([0, offset]);
  const centreLatLng = map.unproject(centrePx, targetZoom);
  map.setView(centreLatLng, targetZoom, {
    animate: true,
    duration: 0.42,
    easeLinearity: 0.2,
  });
}

function centerUserAboveSheet() {
  fitMapForSheet(0.5, 0);
}

watch(
  () => exploreSheet.isOpen,
  (open) => {
    if (!open) {
      filterOpen.value = false;
      currentSnapIdx.value = SNAP_DEFAULT;
      baseZoom = null;
      return;
    }
    baseZoom = null; // capture on first fit call
    centerUserAboveSheet();
  }
);

function onSnapChange(idx: number) {
  currentSnapIdx.value = idx;
  // Zoom out ~2 levels when tall so the user marker + emergency pins stay
  // peekable above the raised sheet; restore to base zoom on collapse.
  if (idx === SNAP_TALL) {
    fitMapForSheet(0.75, -2);
  } else {
    fitMapForSheet(0.5, 0);
  }
}

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
    if (serviceMode.value === "jenazah") return tos.includes("jenazah");
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

    const compliance = item.emergencyData?.compliance;
    if (onlyVerified.value && !isComplianceVerified(compliance)) return false;
    if (onlyComplete.value && !isComplianceComplete(compliance)) return false;

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
  openEmergencyDetail(item, { fromExplore: true });
  await nextTick();
  scrollSelectedCardToTop(idx);
}

/** Pin clicked list card to top of the sheet scroller with breathing room. */
const LIST_SCROLL_TOP_MARGIN = 16;

function scrollSelectedCardToTop(idx: number) {
  // Only the tall sheet scrolls; at default height the list is locked at top
  // and the tapped card is already on screen.
  if (currentSnapIdx.value !== SNAP_TALL) return;
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
  clearRoute();
  detailSheet.clearExploreReturn();
  detailSheet.onClose();
  exploreSheet.onClose();
  mapUrl.clearService();
}

async function shareResults() {
  const type = sheetData.value?.emergencyType;
  if (!type?.id) return;
  const label = String(type.name || "Layanan");
  const area = areaName.value ? ` di ${areaName.value}` : "";
  await shareMapLink({
    title: `${label}${area} — ButuhBantuan`,
    patch: { service: String(type.id) },
    remove: ["unit", "to", "place"],
  });
}

function resetFilters() {
  serviceMode.value = "all";
  sortMode.value = "smart";
  tierFilter.value = "all";
  only24h.value = false;
  onlyAvailable.value = false;
  onlyVerified.value = false;
  onlyComplete.value = false;
}

function chipClass(active: boolean) {
  return [
    "px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors",
    active
      ? "bg-neutral-900 text-white border-neutral-900"
      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300",
  ];
}
</script>

<template>
  <CoreSheet
    :is-open="exploreSheet.isOpen"
    :snap-points="[0.5, 0.75]"
    :initial-snap="0"
    draggable
    no-swipe-dismiss
    scrollable
    content-drag
    @close="handleClose()"
    @snap-change="onSnapChange"
  >
    <template #header>
      <div
        v-if="sheetData?.emergencyType"
        class="relative py-2 px-4 flex items-center justify-between gap-2.5"
        style="background: #ffffff; border-bottom: 1px solid var(--bb-border); border-radius: var(--bb-radius-sheet) var(--bb-radius-sheet) 0 0"
      >
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center ui-icon-well--danger"
            style="border-radius: 0.65rem"
          >
            <Icon :icon="sheetData.emergencyType.icon" class="text-[18px]" />
          </div>
          <div class="min-w-0 flex-1">
            <h1
              class="m-0 truncate text-[16px] font-semibold leading-tight"
              style="color: #202124; letter-spacing: -0.01em"
            >
              {{ sheetData.emergencyType.name }}
            </h1>
            <p
              v-if="areaName"
              class="mt-0.5 truncate text-[12px] leading-tight"
              style="color: #5f6368"
            >
              <span style="color: #1a73e8; font-weight: 500">{{ filteredEmergencyList.length }} unit</span>
              <span style="color: #dadce0"> · </span>
              <span>{{ areaName }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Compact filter popover — opens into the sheet, not over the map -->
          <div v-if="showFilterMenu" ref="filterMenuRef" class="relative">
            <button
              type="button"
              class="relative flex items-center justify-center w-8 h-8 shrink-0 ui-icon-well"
              title="Filter"
              aria-label="Filter"
              @click.stop="filterOpen = !filterOpen"
            >
              <Icon icon="lucide:list-filter" class="text-lg" style="color: var(--bb-text-secondary)" />
              <span
                v-if="activeFilterCount > 0"
                class="absolute -top-0.5 -right-0.5 min-w-[12px] h-3 px-0.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center"
                style="background: var(--bb-danger)"
              >
                {{ activeFilterCount }}
              </span>
            </button>

            <Transition name="filter-drop">
              <div
                v-if="filterOpen"
                class="ui-card absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] z-[80] overflow-hidden"
                style="box-shadow: var(--bb-shadow-soft)"
              >
                <div class="px-2.5 py-2 border-b border-neutral-100 flex items-center justify-between gap-2">
                  <p class="text-xs font-semibold text-neutral-900">Filter</p>
                  <button
                    v-if="activeFilterCount > 0"
                    type="button"
                    class="text-[10px] font-medium text-neutral-500 hover:text-neutral-800 px-1 py-0.5"
                    @click="resetFilters"
                  >
                    Reset
                  </button>
                </div>

                <div class="px-2.5 py-2.5 space-y-2.5 max-h-[42vh] overflow-y-auto">
                  <!-- Layanan (ambulance only) -->
                  <div v-if="showServiceFilter">
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">
                      Jenis layanan
                    </p>
                    <div class="flex flex-wrap gap-1">
                      <button
                        v-for="opt in [
                          { id: 'all', label: 'Semua' },
                          { id: 'emergency', label: 'Darurat' },
                          { id: 'transport', label: 'Transport' },
                          { id: 'jenazah', label: 'Jenazah' },
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
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">
                      Urutkan
                    </p>
                    <div class="flex flex-wrap gap-1">
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
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">
                      Jenis mitra
                    </p>
                    <div class="flex flex-wrap gap-1">
                      <button
                        v-for="opt in [
                          { id: 'all', label: 'Semua' },
                          { id: 'psc', label: 'Resmi' },
                          { id: 'verified', label: 'Swasta' },
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

                  <!-- Kelengkapan (ambulance) -->
                  <div v-if="showComplianceFilter">
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">
                      Kelengkapan
                    </p>
                    <div class="space-y-1.5">
                      <button
                        type="button"
                        class="w-full flex items-center justify-between gap-3 px-0.5 py-0.5 text-left"
                        @click="onlyVerified = !onlyVerified"
                      >
                        <span class="text-xs text-neutral-800">Terverifikasi admin</span>
                        <span
                          class="w-8 h-[18px] rounded-full relative transition-colors"
                          :class="onlyVerified ? 'bg-neutral-900' : 'bg-neutral-200'"
                        >
                          <span
                            :class="[
                              'absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
                              onlyVerified ? 'translate-x-[14px]' : 'translate-x-0.5',
                            ]"
                          />
                        </span>
                      </button>
                      <button
                        type="button"
                        class="w-full flex items-center justify-between gap-3 px-0.5 py-0.5 text-left"
                        @click="onlyComplete = !onlyComplete"
                      >
                        <span class="text-xs text-neutral-800">Kelengkapan ≥80%</span>
                        <span
                          class="w-8 h-[18px] rounded-full relative transition-colors"
                          :class="onlyComplete ? 'bg-neutral-900' : 'bg-neutral-200'"
                        >
                          <span
                            :class="[
                              'absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
                              onlyComplete ? 'translate-x-[14px]' : 'translate-x-0.5',
                            ]"
                          />
                        </span>
                      </button>
                    </div>
                  </div>

                  <!-- Toggles -->
                  <div class="space-y-1.5 pt-0.5">
                    <button
                      type="button"
                      class="w-full flex items-center justify-between gap-3 px-0.5 py-0.5 text-left"
                      @click="only24h = !only24h"
                    >
                      <span class="text-xs text-neutral-800">Hanya 24 jam</span>
                      <span
                        class="w-8 h-[18px] rounded-full relative transition-colors"
                        :class="only24h ? 'bg-neutral-900' : 'bg-neutral-200'"
                      >
                        <span
                          :class="[
                            'absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
                            only24h ? 'translate-x-[14px]' : 'translate-x-0.5',
                          ]"
                        />
                      </span>
                    </button>
                    <button
                      type="button"
                      class="w-full flex items-center justify-between gap-3 px-0.5 py-0.5 text-left"
                      @click="onlyAvailable = !onlyAvailable"
                    >
                      <span class="text-xs text-neutral-800">Armada tersedia</span>
                      <span
                        class="w-8 h-[18px] rounded-full relative transition-colors"
                        :class="onlyAvailable ? 'bg-neutral-900' : 'bg-neutral-200'"
                      >
                        <span
                          :class="[
                            'absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
                            onlyAvailable ? 'translate-x-[14px]' : 'translate-x-0.5',
                          ]"
                        />
                      </span>
                    </button>
                  </div>
                </div>

                <div class="px-2.5 py-1.5 border-t border-neutral-100 bg-neutral-50">
                  <p class="text-[10px] text-neutral-500">
                    Menampilkan {{ filteredEmergencyList.length }} dari {{ emergencyList.length }} unit
                  </p>
                </div>
              </div>
            </Transition>
          </div>

          <button
            type="button"
            class="flex items-center justify-center w-8 h-8 shrink-0 ui-icon-well"
            title="Bagikan hasil"
            aria-label="Bagikan hasil pencarian"
            @click="shareResults()"
          >
            <Icon icon="lucide:share-2" class="text-lg" style="color: var(--bb-text-secondary)" />
          </button>

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
      <div v-if="isLoading" class="ui-list-stack animate-pulse">
        <div
          v-for="i in 6"
          :key="i"
          class="ui-list-card"
        >
          <div class="ui-list-card__row">
            <div class="w-11 h-11 rounded-[0.7rem] soft-skel shrink-0" />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="h-4 w-3/5 soft-skel rounded" />
                <div class="h-3 w-14 soft-skel rounded shrink-0" />
              </div>
              <div class="h-3 w-2/5 soft-skel rounded mt-1.5" />
              <div class="mt-2.5 flex flex-wrap gap-1.5">
                <div class="h-5 w-10 rounded-full soft-skel" />
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
  transform: translateY(-4px) scale(0.97);
}
</style>
