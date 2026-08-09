<script setup lang="ts">
defineProps<{
  form: {
    name: string;
    regency_id: string;
    latitude: string;
    longitude: string;
  };
}>();
</script>

<template>
  <div class="space-y-4">
    <UiFormField label="Nama Tampilan" required>
      <UiInput v-model="form.name" placeholder="mis. Kota Yogyakarta" />
    </UiFormField>

    <UiFormField label="ID Regency (BPS)" required hint="Kode BPS kabupaten/kota, mis. 34.71">
      <UiInput v-model="form.regency_id" placeholder="34.71" />
    </UiFormField>

    <div class="grid grid-cols-2 gap-3">
      <UiFormField label="Latitude">
        <UiInput v-model="form.latitude" type="number" step="0.0001" placeholder="-7.7956" />
      </UiFormField>
      <UiFormField label="Longitude">
        <UiInput v-model="form.longitude" type="number" step="0.0001" placeholder="110.3695" />
      </UiFormField>
    </div>
  </div>
</template>
