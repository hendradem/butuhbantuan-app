<script setup lang="ts">
const exploreSheet = useExploreSheetStore();
const emergencyStore = useEmergencyStore();

const { fetchEmergencyTypes } = useEmergencyApi();
const { data: emergencyTypeData, pending: loading } = useAsyncData(
  "emergency-types",
  fetchEmergencyTypes
);

function handleServiceClick(service: any) {
  const filtered = emergencyStore.filteredEmergency.filter(
    (item: any) => item.emergencyData?.emergency_type?.name === service.name
  );
  exploreSheet.setSheetData({ emergencyType: service, emergency: filtered });
  exploreSheet.onOpen();
}
</script>

<template>
  <div
    class="sticky bottom-0 left-0 z-50 w-full h-full py-5 rounded-t-xl bg-white border-t border-slate-200 bottom-menu-shadow"
  >
    <div class="sheet-header mx-4 flex items-center gap-3">
      <div class="flex-1 min-w-0 overflow-hidden">
        <PreviewSearchBox />
      </div>
      <SosButton />
    </div>
    <div class="sheet-body mt-4">
      <AvailableServiceList
        :emergency-type-data="emergencyTypeData"
        :loading="loading"
        @service-click="handleServiceClick"
      />
    </div>
  </div>
</template>
