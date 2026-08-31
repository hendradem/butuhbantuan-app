<script setup lang="ts">
const needHelp = useNeedHelpSheetStore();
const { openService, emergencyTypeData, loading } = useOpenUnit();
</script>

<template>
  <div class="ui-menu-panel sticky bottom-0 left-0 z-50 w-full py-3.5">
    <div class="sheet-header mx-4">
      <PreviewSearchBox />
    </div>
    <div class="sheet-body mt-3 mx-4">
      <AvailableServiceList
        :emergency-type-data="emergencyTypeData"
        :loading="loading"
        @service-click="openService"
        @need-help="needHelp.onOpen()"
      />
    </div>
  </div>
</template>
