<script setup lang="ts">
import { Icon } from "@iconify/vue";

const config = useRuntimeConfig();
const searchSheet = useSearchSheetStore();
const searchData = useSearchDataStore();
const userLocation = useUserLocationStore();
const leaflet = useLeafletStore();
const detailSheet = useDetailSheetStore();
const exploreSheet = useExploreSheetStore();
const { loadEmergencyData } = useEmergencyApi();

const query = ref("");
const results = ref<any[]>([]);
const loading = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const hasQuery = computed(() => query.value.trim().length > 0);
const noResults = computed(() => !loading.value && results.value.length === 0 && hasQuery.value);

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
        `${config.public.apiBaseUrl}/api/v1/directions/geolocation?searchQuery=${encodeURIComponent(query.value)}`
      );
      results.value = res?.data?.features || [];
    } finally {
      loading.value = false;
    }
  }, 400);
}

async function handleSelect(item: any) {
  const lat = item.properties?.lat as number;
  const lng = item.properties?.lon as number;
  const address = item.properties?.formatted || item.properties?.name || "";

  userLocation.setManualLocation(true);
  userLocation.updateCoordinate(lat, lng);
  userLocation.updateFullAddress(address); // show Geoapify address immediately
  searchData.updateSearchCoordinate(lat, lng);
  leaflet.resetLeafletRouting();
  detailSheet.onClose();
  exploreSheet.onClose();

  searchSheet.onClose();
  query.value = "";
  results.value = [];

  await loadEmergencyData(lat, lng);
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
      <div class="border-b py-3 px-3 bg-white border-neutral-100 rounded-t-[40px] flex items-center justify-between">
        <h1 class="text-md font-semibold text-neutral-800">Cari Lokasi</h1>
        <button
          class="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
          @click="searchSheet.onClose()"
        >
          <Icon icon="ion:close" class="text-neutral-600 text-xl" />
        </button>
      </div>
    </template>

    <div class="h-full flex flex-col overflow-y-auto">
      <div class="sticky top-0 bg-white px-3 pt-3 pb-2 z-10">
        <div class="relative">
          <Icon icon="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input
            v-model="query"
            type="text"
            placeholder="Cari lokasi, desa atau daerah terdekat"
            class="searchbox pl-9"
            @input="handleSearch"
          >
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <!-- Info state when empty -->
        <InfoState
          v-if="!loading && results.length === 0 && !hasQuery"
          size="xs"
          title="Cari bantuan di sekitarmu"
          description="Cari nama tempat, nama jalan, atau nama lokasi terdekatmu."
        />

        <!-- Loading skeleton -->
        <div v-if="loading" class="divide-y divide-gray-100">
          <div
            v-for="i in 4"
            :key="i"
            class="w-full px-4 py-3 flex items-start gap-3 animate-pulse"
          >
            <div class="w-4 h-4 bg-red-100 rounded-sm mt-0.5 shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-3.5 bg-neutral-200 rounded w-4/5" />
              <div class="h-3 bg-neutral-100 rounded w-1/2" />
            </div>
          </div>
        </div>

        <!-- Results -->
        <div v-if="!loading && results.length">
          <button
            v-for="(item, i) in results"
            :key="i"
            class="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 flex items-start gap-3"
            @click="handleSelect(item)"
          >
            <Icon icon="mingcute:location-fill" class="text-red-500 mt-0.5 shrink-0" />
            <span class="text-sm text-gray-700 leading-snug">{{ item.properties?.formatted }}</span>
          </button>
        </div>

        <!-- No results CTA -->
        <div v-if="noResults" class="px-4 py-8 text-center">
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
    </div>
  </CoreSheet>
</template>
