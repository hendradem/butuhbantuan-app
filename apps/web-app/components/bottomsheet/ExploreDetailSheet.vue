<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { storeToRefs } from "pinia";
import { cityNameFormat } from "~/utils/cityNameFormat";

const exploreSheet = useExploreSheetStore();
const emergencyStore = useEmergencyStore();
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
const serviceMode = ref<ServiceMode>("all");

const showServiceFilter = computed(() => {
  const name = String(sheetData.value?.emergencyType?.name || "").toLowerCase();
  return name.includes("ambulance");
});

watch(
  () => sheetData.value?.emergencyType?.name,
  () => { serviceMode.value = "all"; }
);

const filteredEmergencyList = computed(() => {
  if (!showServiceFilter.value || serviceMode.value === "all") return emergencyList.value;
  return emergencyList.value.filter((item: any) => {
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
  });
});

async function handleSelect(item: any) {
  const idx = filteredEmergencyList.value.indexOf(item);

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
  const el = scrollContainer.value?.querySelector(`[data-item-idx="${idx}"]`);
  (el as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleClose() {
  leaflet.resetLeafletRouting();
  detailSheet.onClose();
  exploreSheet.onClose();
}

function setMode(mode: ServiceMode, e: Event) {
  e.stopPropagation();
  serviceMode.value = mode;
}
</script>

<template>
  <CoreSheet :is-open="exploreSheet.isOpen" :snap-points="[280, 0]" scrollable @close="handleClose()">
    <template #header>
      <div
        v-if="sheetData?.emergencyType"
        class="border-b py-3 px-3 bg-white border-neutral-100 rounded-t-[40px] flex items-center justify-between gap-2"
      >
        <div class="flex gap-2 items-center min-w-0 flex-1">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 shrink-0">
            <Icon :icon="sheetData.emergencyType.icon" class="text-red-500 text-xl" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 min-w-0">
              <h1 class="text-md leading-none font-semibold text-neutral-800 truncate">
                {{ sheetData.emergencyType.name }}
              </h1>
              <!-- Filter inline, kanan judul Ambulance -->
              <div
                v-if="showServiceFilter && emergencyList.length > 0"
                class="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-neutral-100 shrink-0"
              >
                <button
                  v-for="opt in [
                    { id: 'all', label: 'Semua' },
                    { id: 'emergency', label: 'Darurat' },
                    { id: 'transport', label: 'Transport' },
                  ]"
                  :key="opt.id"
                  type="button"
                  :class="[
                    'px-2 py-0.5 text-[11px] font-medium rounded-full transition-colors',
                    serviceMode === opt.id
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700',
                  ]"
                  @click="setMode(opt.id as ServiceMode, $event)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <p v-if="areaName" class="m-0 mt-1 leading-none text-[13px] text-neutral-400 truncate">
              Di sekitar wilayah {{ areaName }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          @click="handleClose()"
        >
          <Icon icon="ion:close" class="text-neutral-600 text-xl" />
        </button>
      </div>
    </template>

    <div ref="scrollContainer" class="pt-2 pb-20">
      <div v-if="isLoading" class="space-y-2 px-0">
        <div v-for="i in 3" :key="i" class="mx-3 mb-2">
          <div class="p-3 shadow-sm rounded-[10px] bg-white w-full border border-neutral-200 animate-pulse">
            <div class="flex gap-2">
              <div class="w-10 h-10 bg-gray-200 rounded-lg shrink-0" />
              <div class="flex-1 space-y-2 pt-0.5">
                <div class="h-4 bg-gray-200 rounded w-2/3" />
                <div class="h-3 bg-gray-100 rounded w-1/2" />
                <div class="flex gap-2 mt-1">
                  <div class="h-3 bg-gray-100 rounded w-1/4" />
                  <div class="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EmergencyDataList
        v-else
        :emergency-data="filteredEmergencyList"
        @select="handleSelect"
      />
    </div>
  </CoreSheet>
</template>
