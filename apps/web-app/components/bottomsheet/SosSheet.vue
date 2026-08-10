<script setup lang="ts">
import { Icon } from "@iconify/vue";

const sosStore = useSosStore();
const location = useUserLocationStore();
const { submitSOS } = useSosApi();
const { fetchEmergencyTypes } = useEmergencyApi();
const config = useRuntimeConfig();

const name = ref("");
const phone = ref("");
const condition = ref("");
const selectedTypeId = ref<number | undefined>();

const { data: typesData } = useAsyncData("sos-emergency-types", fetchEmergencyTypes);
const emergencyTypes = computed(() => typesData.value?.data ?? []);

const { photoPreview, uploading: uploadingPhoto, uploadError, selectPhoto, uploadPhoto, removePhoto } = usePhotoUpload();

// Reset form whenever sheet opens
watch(() => sosStore.isOpen, (v) => {
  if (v) {
    name.value = "";
    phone.value = "";
    condition.value = "";
    selectedTypeId.value = undefined;
    removePhoto();
  }
});

async function submit() {
  if (!name.value || !phone.value) return;
  sosStore.setSubmitting(true);
  try {
    const photoUrl = await uploadPhoto(config.public.apiBaseUrl as string);
    const result = await submitSOS({
      name: name.value,
      phone: phone.value,
      lat: location.lat,
      lng: location.long,
      address: location.fullAddress,
      description: condition.value,
      photo_url: photoUrl ?? undefined,
      type_id: selectedTypeId.value,
      regency_id: location.currentRegion.regency.id,
      province_id: location.currentRegion.province.id,
    });

    sosStore.close();

    if (result?.ticket_number) {
      await navigateTo(`/ticket/${result.ticket_number}`);
    }
  } catch {
    sosStore.setError("Gagal mengirim permintaan darurat. Coba hubungi layanan langsung.");
  }
}
</script>

<template>
  <CoreSheet
    :is-open="sosStore.isOpen"
    :snap-points="[580, 0]"
    scrollable
    is-overlay
    @close="sosStore.close()"
  >
    <template #header>
      <div class="border-b py-3 px-4 bg-white border-neutral-100 rounded-t-[20px] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-emergency-600 flex items-center justify-center shrink-0">
            <Icon icon="lucide:siren" class="text-white text-sm" />
          </div>
          <h1 class="text-sm font-semibold text-neutral-800">Tombol Darurat (SOS)</h1>
        </div>
        <button
          class="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
          @click="sosStore.close()"
        >
          <Icon icon="ion:close" class="text-neutral-600 text-xl" />
        </button>
      </div>
    </template>

    <div class="px-4 py-4 space-y-4">
      <!-- Location indicator -->
      <div class="flex items-start gap-2 bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
        <Icon icon="lucide:map-pin" class="text-blue-500 mt-0.5 shrink-0 text-base" />
        <div class="min-w-0">
          <p class="font-semibold text-xs leading-none">Lokasi terdeteksi</p>
          <p class="text-xs mt-1 text-blue-600 leading-snug line-clamp-2">
            {{ location.fullAddress || `${location.lat.toFixed(5)}, ${location.long.toFixed(5)}` }}
          </p>
        </div>
      </div>

      <!-- Emergency type -->
      <div>
        <label class="block text-sm font-semibold text-neutral-800 mb-2">
          Jenis Darurat
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="t in emergencyTypes"
            :key="t.id"
            type="button"
            :class="[
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
              selectedTypeId === t.id
                ? 'bg-emergency-600 border-emergency-600 text-white'
                : 'border-neutral-200 text-neutral-600 bg-neutral-50 active:bg-neutral-100',
            ]"
            @click="selectedTypeId = selectedTypeId === t.id ? undefined : t.id"
          >
            <Icon v-if="t.icon" :icon="t.icon" class="text-base shrink-0" />
            {{ t.name }}
          </button>
        </div>
      </div>

      <!-- Name -->
      <div>
        <label class="block text-sm font-semibold text-neutral-800 mb-1.5">
          Nama <span class="text-emergency-600">*</span>
        </label>
        <input
          v-model="name"
          type="text"
          placeholder="Nama lengkap pelapor"
          class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emergency-400 focus:bg-white transition-colors"
        />
      </div>

      <!-- Phone -->
      <div>
        <label class="block text-sm font-semibold text-neutral-800 mb-1.5">
          No. HP <span class="text-emergency-600">*</span>
        </label>
        <input
          v-model="phone"
          type="tel"
          placeholder="08xxxxxxxxxx"
          class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emergency-400 focus:bg-white transition-colors"
        />
      </div>

      <!-- Condition -->
      <div>
        <label class="block text-sm font-semibold text-neutral-800 mb-1.5">Kondisi / Keterangan</label>
        <textarea
          v-model="condition"
          rows="3"
          placeholder="Jelaskan kondisi darurat secara singkat..."
          class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emergency-400 focus:bg-white resize-none transition-colors"
        />
      </div>

      <!-- Photo upload -->
      <div>
        <label class="block text-sm font-semibold text-neutral-800 mb-1.5">
          Foto Kondisi <span class="text-neutral-400 font-normal text-xs">(opsional)</span>
        </label>
        <div v-if="photoPreview" class="relative">
          <img :src="photoPreview" class="w-full h-36 object-cover rounded-xl border border-neutral-200" />
          <button
            type="button"
            class="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center"
            @click="removePhoto"
          >
            <Icon icon="ion:close" class="text-xs" />
          </button>
        </div>
        <label v-else class="flex items-center gap-2 w-full px-3 py-2.5 border border-dashed border-neutral-300 rounded-xl bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors">
          <Icon icon="lucide:camera" class="text-neutral-400 text-base shrink-0" />
          <span class="text-sm text-neutral-400">Pilih foto dari galeri</span>
          <input type="file" accept="image/*" class="sr-only" @change="selectPhoto" />
        </label>
        <p v-if="uploadError" class="text-xs text-red-500 mt-1">{{ uploadError }}</p>
      </div>

      <!-- Error -->
      <div
        v-if="sosStore.error"
        class="flex items-start gap-2 bg-emergency-50 rounded-xl p-3 text-sm text-emergency-700"
      >
        <Icon icon="lucide:alert-circle" class="shrink-0 mt-0.5" />
        <span>{{ sosStore.error }}</span>
      </div>

      <!-- Submit -->
      <button
        :disabled="!name || !phone || sosStore.isSubmitting || uploadingPhoto"
        class="w-full py-3 rounded-xl bg-emergency-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity active:bg-emergency-700"
        @click="submit"
      >
        <Icon v-if="sosStore.isSubmitting" icon="lucide:loader-2" class="animate-spin text-base" />
        <Icon v-else icon="lucide:siren" class="text-base" />
        {{ sosStore.isSubmitting ? 'Mengirim...' : 'Kirim Bantuan Darurat' }}
      </button>

      <button class="w-full text-xs text-neutral-400 py-1" @click="sosStore.close()">
        Batal
      </button>
    </div>
  </CoreSheet>
</template>
