<script setup lang="ts">
defineProps<{
  form: {
    name: string;
    regency_id: string;
    latitude: string;
    longitude: string;
  };
}>();

const inputClass = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-neutral-700 mb-1.5">
        Nama Tampilan <span class="text-emergency-600">*</span>
      </label>
      <input v-model="form.name" type="text" placeholder="mis. Kota Yogyakarta" :class="inputClass" />
    </div>
    <div>
      <label class="block text-sm font-medium text-neutral-700 mb-1.5">
        ID Regency (BPS) <span class="text-emergency-600">*</span>
      </label>
      <input v-model="form.regency_id" type="text" placeholder="34.71" :class="inputClass" />
      <p class="mt-1 text-xs text-neutral-400">Kode BPS kabupaten/kota, mis. <code class="bg-neutral-100 px-1 rounded">34.71</code></p>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1.5">Latitude</label>
        <input v-model="form.latitude" type="number" step="0.0001" placeholder="-7.7956" :class="inputClass" />
      </div>
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1.5">Longitude</label>
        <input v-model="form.longitude" type="number" step="0.0001" placeholder="110.3695" :class="inputClass" />
      </div>
    </div>
  </div>
</template>
