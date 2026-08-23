<script setup lang="ts">
import HospitalImportPanel from "~/components/hospitals/HospitalImportPanel.vue";

definePageMeta({ title: "Import RS", keepalive: true });
</script>

<template>
  <div class="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
    <div>
      <h1 class="text-xl font-bold text-neutral-900 tracking-tight">Master Rumah Sakit</h1>
      <p class="mt-1 text-sm text-neutral-500">
        Sync MSI SATUSEHAT (atau stub lokal) per kabupaten, lalu import selektif ke unit mitra.
      </p>
    </div>
    <HospitalImportPanel mode="admin" />
  </div>
</template>
