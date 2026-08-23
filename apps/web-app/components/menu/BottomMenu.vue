<script setup lang="ts">
import type { RecentUnit } from "~/utils/recentUnits";
import { recordServiceDemand } from "~/utils/serviceDemand";

const exploreSheet = useExploreSheetStore();
const emergencyStore = useEmergencyStore();
const emergencyDataStore = useEmergencyDataStore();
const detailSheet = useDetailSheetStore();
const userLocation = useUserLocationStore();
const leaflet = useLeafletStore();
const needHelp = useNeedHelpSheetStore();
const moreSheet = useMoreSheetStore();
const route = useRoute();
const router = useRouter();
const { items: recentItems, clear: clearRecent, refresh: refreshRecent } = useRecentUnits();
const { fetchEmergencyTypes } = useEmergencyApi();

const { data: emergencyTypeData, pending: loading } = useAsyncData(
  "emergency-types",
  fetchEmergencyTypes,
);

watch(
  () => userLocation.currentRegion.regency.id,
  () => refreshRecent(),
);

function handleServiceClick(service: any) {
  if (service?.name) recordServiceDemand(String(service.name));
  moreSheet.onClose();
  const filtered = emergencyStore.filteredEmergency.filter(
    (item: any) => item.emergencyData?.emergency_type?.name === service.name,
  );
  exploreSheet.setSheetData({ emergencyType: service, emergency: filtered });
  exploreSheet.onOpen();
}

function openRecent(unit: RecentUnit) {
  const live = emergencyStore.filteredEmergency.find(
    (item: any) => String(item.emergencyData?.id) === unit.id,
  );
  if (live) {
    emergencyDataStore.updateSelectedEmergencyData({
      selectedEmergencyData: live.emergencyData,
      selectedEmergencySource: "detail",
    });
    detailSheet.setDetailSheetData({
      emergencyType: live.emergencyData?.emergency_type,
      emergency: live,
    });
    detailSheet.onOpen();
    const coords = live.emergencyData?.coordinates;
    if (coords) {
      leaflet.updateLeafletRouting({
        startPoint: { lat: userLocation.lat, lng: userLocation.long },
        routeEndPoint: {
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0]),
        },
      });
    }
    return;
  }

  const typeName = unit.typeName;
  if (typeName && emergencyTypeData.value?.data) {
    const service = emergencyTypeData.value.data.find(
      (t: any) => t.name === typeName,
    );
    if (service) handleServiceClick(service);
  }
}

watch(
  [
    () => route.query.type_id,
    () => emergencyTypeData.value,
    () => emergencyStore.filteredEmergency.length,
  ],
  ([typeIdRaw, typesPayload]) => {
    const typeId = Number(typeIdRaw);
    if (!typeId || !typesPayload?.data?.length) return;

    const service = typesPayload.data.find((t: any) => Number(t.id) === typeId);
    if (!service) return;

    handleServiceClick(service);
    router.replace({ path: "/", query: {} });
  },
  { immediate: true },
);
</script>

<template>
  <div class="ui-menu-panel sticky bottom-0 left-0 z-50 w-full max-h-[min(52vh,460px)] py-3.5 overflow-y-auto">
    <div class="sheet-header mx-4 flex items-center gap-3">
      <div class="flex-1 min-w-0 overflow-hidden">
        <PreviewSearchBox />
      </div>
      <SosButton />
    </div>
    <div class="sheet-body mt-3 mx-4">
      <AvailableServiceList
        :emergency-type-data="emergencyTypeData"
        :loading="loading"
        :recent-units="recentItems"
        @service-click="handleServiceClick"
        @need-help="needHelp.onOpen()"
        @recent-select="openRecent"
        @recent-clear="clearRecent"
      />
    </div>
  </div>
</template>
