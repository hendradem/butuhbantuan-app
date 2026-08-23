<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  PLACE_SLOTS,
  getSavedPlace,
  savedPlacesTick,
  type PlaceSlot,
  type SavedPlace,
} from "~/utils/savedPlaces";

type SheetTab = "search" | "favorites";

const config = useRuntimeConfig();
const searchSheet = useSearchSheetStore();
const searchData = useSearchDataStore();
const userLocation = useUserLocationStore();
const leaflet = useLeafletStore();
const detailSheet = useDetailSheetStore();
const exploreSheet = useExploreSheetStore();
const savePlaceSheet = useSavePlaceSheetStore();
const { loadEmergencyData } = useEmergencyApi();

const tab = ref<SheetTab>("search");
const query = ref("");
const results = ref<any[]>([]);
const loading = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const hasQuery = computed(() => query.value.trim().length > 0);
const noResults = computed(() => !loading.value && results.value.length === 0 && hasQuery.value);

const slots = computed(() => {
  void savedPlacesTick.value;
  return PLACE_SLOTS.map((meta) => ({
    ...meta,
    place: getSavedPlace(meta.slot),
  }));
});

watch(
  () => searchSheet.isOpen,
  (open) => {
    if (!open) return;
    tab.value = "search";
    query.value = "";
    results.value = [];
  },
);

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  if (!query.value.trim()) {
    results.value = [];
    return;
  }
  searchTimer = setTimeout(async () => {
    loading.value = true;
    try {
      const res = await $fetch<any>(
        `${config.public.apiBaseUrl}/api/v1/directions/geolocation?searchQuery=${encodeURIComponent(query.value)}`,
      );
      results.value = res?.data?.features || [];
    } finally {
      loading.value = false;
    }
  }, 400);
}

async function goToPoint(lat: number, lng: number, address?: string) {
  userLocation.setManualLocation(true);
  userLocation.updateCoordinate(lat, lng);
  if (address) userLocation.updateFullAddress(address);
  searchData.updateSearchCoordinate(lat, lng);
  leaflet.resetLeafletRouting();
  leaflet.requestDefaultView();
  detailSheet.onClose();
  exploreSheet.onClose();
  searchSheet.onClose();
  query.value = "";
  results.value = [];
  await loadEmergencyData(lat, lng);
}

async function handleSelect(item: any) {
  const lat = item.properties?.lat as number;
  const lng = item.properties?.lon as number;
  const address = item.properties?.formatted || item.properties?.name || "";
  await goToPoint(lat, lng, address);
}

async function handleSavedPlace(place: SavedPlace) {
  await goToPoint(place.lat, place.lng, place.address);
}

function openSave(slot: PlaceSlot) {
  searchSheet.onClose();
  nextTick(() => savePlaceSheet.openSave(slot));
}

function handleSearchOnMaps() {
  searchSheet.onClose();
}

watch(query, (val) => {
  if (!val) results.value = [];
});
</script>

<template>
  <CoreSheet
    :is-open="searchSheet.isOpen"
    :snap-points="[500, 0]"
    is-overlay
    scrollable
    @close="searchSheet.onClose()"
  >
    <template #header>
      <div
        class="pt-3 px-4"
        style="border-radius: var(--bb-radius-sheet) var(--bb-radius-sheet) 0 0"
      >
        <div class="flex items-center justify-between gap-3">
          <h1 class="ui-sheet-title">Lokasi</h1>
          <button type="button" class="ui-close-btn" @click="searchSheet.onClose()">
            <Icon icon="ion:close" class="text-xl" />
          </button>
        </div>

        <div class="flex gap-6 mt-4" role="tablist">
          <button
            v-for="t in ([
              { id: 'search', label: 'Cari' },
              { id: 'favorites', label: 'Favorit' },
            ] as const)"
            :key="t.id"
            type="button"
            role="tab"
            class="relative pb-3 text-[13px] font-semibold transition-colors"
            :style="{
              color: tab === t.id ? 'var(--bb-text)' : 'var(--bb-text-secondary)',
            }"
            :aria-selected="tab === t.id"
            @click="tab = t.id"
          >
            {{ t.label }}
            <span
              v-if="tab === t.id"
              class="absolute left-0 right-0 bottom-0 h-0.5"
              style="background: var(--bb-text); border-radius: 9999px"
            />
          </button>
        </div>
        <div style="height: 1px; background: var(--bb-border); margin: 0 -1rem" />
      </div>
    </template>

    <div class="h-full flex flex-col min-h-0">
      <!-- Tab: Cari -->
      <div v-if="tab === 'search'" class="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div class="px-4 pt-4 pb-3 shrink-0">
          <div class="relative">
            <Icon
              icon="ph:magnifying-glass"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
            />
            <input
              v-model="query"
              type="text"
              placeholder="Cari lokasi, desa atau daerah terdekat"
              class="searchbox pl-9"
              @input="handleSearch"
            >
          </div>
        </div>

        <InfoState
          v-if="!loading && results.length === 0 && !hasQuery"
          size="xs"
          title="Cari bantuan di sekitarmu"
          description="Cari nama tempat, nama jalan, atau nama lokasi terdekatmu."
        />

        <div v-if="loading" class="divide-y divide-gray-100">
          <div
            v-for="i in 4"
            :key="i"
            class="w-full px-4 py-3.5 flex items-start gap-3 animate-pulse"
          >
            <div class="w-4 h-4 bg-red-100 rounded-sm mt-0.5 shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-3.5 bg-neutral-200 rounded w-4/5" />
              <div class="h-3 bg-neutral-100 rounded w-1/2" />
            </div>
          </div>
        </div>

        <div v-if="!loading && results.length">
          <button
            v-for="(item, i) in results"
            :key="i"
            type="button"
            class="w-full px-4 py-3.5 text-left hover:bg-gray-50 border-b border-gray-100 flex items-start gap-3"
            @click="handleSelect(item)"
          >
            <Icon icon="mingcute:location-fill" class="text-red-500 mt-0.5 shrink-0" />
            <span class="text-sm text-gray-700 leading-snug">{{ item.properties?.formatted }}</span>
          </button>
        </div>

        <div v-if="noResults" class="px-4 py-10 text-center">
          <Icon icon="mingcute:search-line" class="text-gray-300 text-4xl mx-auto mb-3" />
          <p class="text-sm text-gray-500 mb-6">
            Lokasi "<span class="font-medium text-gray-700">{{ query }}</span>" tidak ditemukan.
          </p>
          <div class="flex flex-col gap-2">
            <button type="button" class="btn-dark" @click="handleSearchOnMaps">
              <Icon icon="mingcute:map-2-line" class="mr-2" />
              Cari alamat di maps
            </button>
            <button type="button" class="btn-base hover:bg-neutral-100" @click="searchSheet.onClose()">
              Tutup
            </button>
          </div>
        </div>
      </div>

      <!-- Tab: Favorit -->
      <div v-else class="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-3">
        <p class="m-0 text-[12px] ui-text-secondary leading-relaxed">
          Pin lokasi di peta, lalu simpan sebagai Rumah atau Kantor.
        </p>

        <div
          v-for="s in slots"
          :key="s.slot"
          class="ui-card flex items-center gap-3 px-3.5 py-3.5"
        >
          <div
            class="w-10 h-10 shrink-0 flex items-center justify-center"
            style="background: var(--bb-bg-muted); border-radius: 0.75rem"
          >
            <Icon :icon="s.icon" class="text-lg" style="color: var(--bb-text)" />
          </div>

          <button
            v-if="s.place"
            type="button"
            class="min-w-0 flex-1 text-left"
            @click="handleSavedPlace(s.place)"
          >
            <p class="m-0 text-[13px] font-semibold ui-text-primary">{{ s.label }}</p>
            <p class="m-0 mt-0.5 text-[11px] ui-text-secondary leading-snug line-clamp-2">
              {{ s.place.address }}
            </p>
          </button>
          <div v-else class="min-w-0 flex-1">
            <p class="m-0 text-[13px] font-semibold ui-text-primary">{{ s.label }}</p>
            <p class="m-0 mt-0.5 text-[11px] ui-text-secondary">Belum disimpan</p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="s.place"
              type="button"
              class="px-3 py-1.5 text-[11px] font-semibold"
              style="
                background: var(--bb-accent);
                color: var(--bb-accent-contrast);
                border-radius: var(--bb-radius-pill);
              "
              @click="handleSavedPlace(s.place)"
            >
              Buka
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-[11px] font-semibold"
              style="
                background: var(--bb-bg-muted);
                color: var(--bb-text);
                border-radius: var(--bb-radius-pill);
              "
              @click="openSave(s.slot)"
            >
              {{ s.place ? "Ganti" : "Simpan" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </CoreSheet>
</template>
