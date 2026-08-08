<script setup lang="ts">
defineProps<{
  types: any[];
  form: {
    name: string;
    organization_name: string;
    organization_type: string;
    description: string;
    type_id: string;
    phone: string;
    whatsapp: string;
    email: string;
    district_id: string;
    regency_id: string;
    province_id: string;
    full_address: string;
    lat: string;
    lng: string;
    is_dispatcher: boolean;
    is_province_dispatcher: boolean;
    type_of_service: string;
  };
}>();

const inputClass = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
</script>

<template>
  <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1.5">Nama Layanan <span class="text-emergency-600">*</span></label>
        <input v-model="form.name" type="text" placeholder="mis. Ambulance RSUP Dr. Sardjito" :class="inputClass" />
      </div>
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1.5">Jenis <span class="text-emergency-600">*</span></label>
        <select v-model="form.type_id" :class="inputClass">
          <option value="">Pilih jenis</option>
          <option v-for="t in types" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1.5">Nama Organisasi</label>
        <input v-model="form.organization_name" type="text" placeholder="mis. RSUP Dr. Sardjito" :class="inputClass" />
      </div>
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1.5">Tipe Organisasi</label>
        <input v-model="form.organization_type" type="text" placeholder="mis. Rumah Sakit Pemerintah" :class="inputClass" />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-neutral-700 mb-1.5">Deskripsi</label>
      <textarea v-model="form.description" rows="2" placeholder="Deskripsi singkat..." :class="inputClass + ' resize-none'" />
    </div>

    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Kontak</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Telepon</label>
          <input v-model="form.phone" type="text" placeholder="+62..." :class="inputClass" />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">WhatsApp</label>
          <input v-model="form.whatsapp" type="text" placeholder="+62..." :class="inputClass" />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
          <input v-model="form.email" type="email" placeholder="email@..." :class="inputClass" />
        </div>
      </div>
    </div>

    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Lokasi</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">ID Regency (BPS)</label>
          <input v-model="form.regency_id" type="text" placeholder="34.71" :class="inputClass" />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">ID Provinsi (BPS)</label>
          <input v-model="form.province_id" type="text" placeholder="34" :class="inputClass" />
        </div>
      </div>
      <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 mb-1.5">Alamat Lengkap</label>
        <input v-model="form.full_address" type="text" placeholder="Jl. ..." :class="inputClass" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Latitude</label>
          <input v-model="form.lat" type="number" step="0.0001" placeholder="-7.7956" :class="inputClass" />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Longitude</label>
          <input v-model="form.lng" type="number" step="0.0001" placeholder="110.3695" :class="inputClass" />
        </div>
      </div>
    </div>

    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Konfigurasi</p>
      <div class="space-y-2">
        <label class="flex items-center gap-2.5 cursor-pointer">
          <input v-model="form.is_dispatcher" type="checkbox" class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
          <span class="text-sm text-neutral-700">Dispatcher (menerima panggilan darurat)</span>
        </label>
        <label class="flex items-center gap-2.5 cursor-pointer">
          <input v-model="form.is_province_dispatcher" type="checkbox" class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
          <span class="text-sm text-neutral-700">Dispatcher tingkat provinsi</span>
        </label>
      </div>
    </div>
  </div>
</template>
