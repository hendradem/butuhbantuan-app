<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { appToast } from "~/utils/appToast";
import { saveTicketAccess } from "~/utils/ticketAccess";
import { saveActiveTicket } from "~/utils/activeTicket";

const sosStore = useSosStore();
const location = useUserLocationStore();
const emergencyStore = useEmergencyStore();
const { submitSOS } = useSosApi();
const { fetchEmergencyTypes } = useEmergencyApi();
const config = useRuntimeConfig();
const toast = appToast();
const { name, phone, load: loadProfile, save: saveProfile } = useRequesterProfile();
const { hotlines } = useOfflineCache();

const uncovered = computed(
  () => emergencyStore.coverageChecked && !emergencyStore.isCovered,
);
const hl = computed(() => hotlines());

const condition = ref("");
const selectedTypeId = ref<number | undefined>();

const { data: typesData } = useAsyncData("sos-emergency-types", fetchEmergencyTypes);
const emergencyTypes = computed(() => typesData.value?.data ?? []);

const { photoPreview, uploading: uploadingPhoto, uploadError, selectPhoto, uploadPhoto, removePhoto, hasPhoto, photoFile } = usePhotoUpload();

// Prefill saved name/phone whenever sheet opens; reset one-shot fields only.
watch(() => sosStore.isOpen, (v) => {
  if (v) {
    loadProfile();
    condition.value = "";
    selectedTypeId.value = undefined;
    removePhoto();
  }
});

async function submit() {
  if (!name.value || !phone.value || !selectedTypeId.value) return;
  sosStore.setSubmitting(true);
  toast.loading("Mengirim SOS...");
  try {
    let photoUrl: string | undefined;
    if (hasPhoto.value || photoFile.value) {
      const uploaded = await uploadPhoto(config.public.apiBaseUrl as string);
      if (!uploaded) {
        toast.dismiss();
        toast.error(uploadError.value || "Gagal mengunggah foto — coba foto lain (JPG/PNG)");
        return;
      }
      photoUrl = uploaded;
    }
    const result = await submitSOS({
      name: name.value,
      phone: phone.value,
      lat: location.lat,
      lng: location.long,
      address: location.fullAddress,
      description: condition.value,
      photo_url: photoUrl,
      type_id: selectedTypeId.value,
      regency_id: location.currentRegion.regency.id,
      province_id: location.currentRegion.province.id,
    });

    saveProfile();
    closeAllSheets();
    toast.dismiss();

    if (result?.public_token) {
      saveTicketAccess(result.public_token, phone.value);
      saveActiveTicket({
        token: result.public_token,
        ticketNumber: result.ticket_number ?? "",
        unitName: result.unit_name ?? "",
      });
      if (result.reused) {
        toast.success("Tiket aktif ditemukan — membuka e-tiket");
      }
      await navigateTo(`/ticket/${result.public_token}`);
    } else if (result?.ticket_number) {
      toast.error("Tiket dibuat tapi link tidak tersedia");
    }
  } catch {
    toast.error("Gagal mengirim permintaan darurat");
    sosStore.setError("Gagal mengirim permintaan darurat. Coba hubungi layanan langsung.");
  } finally {
    sosStore.setSubmitting(false);
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
      <div class="ui-sheet-header">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-emergency-600 flex items-center justify-center shrink-0">
            <Icon icon="lucide:siren" class="text-white text-sm" />
          </div>
          <h1 class="ui-sheet-title">Tombol Darurat (SOS)</h1>
        </div>
        <button type="button" class="ui-close-btn" @click="sosStore.close()">
          <Icon icon="ion:close" class="text-xl" />
        </button>
      </div>
    </template>

    <div class="px-4 py-4 space-y-4">
      <!-- Out of coverage warning -->
      <div
        v-if="uncovered"
        class="p-3 space-y-2"
        style="border-radius: var(--bb-radius-card); border: 1px solid #fde68a; background: #fffbeb"
      >
        <div class="flex items-start gap-2 text-sm text-amber-950">
          <Icon icon="lucide:triangle-alert" class="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p class="font-semibold text-xs">Di luar wilayah layanan</p>
            <p class="text-xs mt-0.5 text-amber-800/90 leading-snug">
              SOS tetap bisa dikirim, tapi unit lokal mungkin tidak tersedia.
              Utamakan hotline nasional.
            </p>
          </div>
        </div>
        <a
          :href="`tel:${hl.psc}`"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-emergency-700"
        >
          <Icon icon="lucide:phone" class="text-sm" />
          {{ hl.label }} sekarang
        </a>
      </div>

      <!-- Location indicator -->
      <div
        class="flex items-start gap-2 p-3 text-sm"
        style="background: var(--bb-bg-muted); border-radius: var(--bb-radius-card); color: var(--bb-text)"
      >
        <Icon icon="lucide:map-pin" class="mt-0.5 shrink-0 text-base" style="color: var(--bb-text-secondary)" />
        <div class="min-w-0">
          <p class="font-semibold text-xs leading-none">Lokasi terdeteksi</p>
          <p class="text-xs mt-1 ui-text-secondary leading-snug line-clamp-2">
            {{ location.fullAddress || `${location.lat.toFixed(5)}, ${location.long.toFixed(5)}` }}
          </p>
        </div>
      </div>

      <!-- Emergency type -->
      <div>
        <label class="ui-label">
          Jenis Darurat <span class="text-emergency-600">*</span>
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="t in emergencyTypes"
            :key="t.id"
            type="button"
            :class="[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
              selectedTypeId === t.id
                ? 'bg-emergency-600 border-emergency-600 text-white'
                : 'ui-text-secondary',
            ]"
            :style="
              selectedTypeId === t.id
                ? { borderRadius: 'var(--bb-radius-control)', border: '1px solid transparent' }
                : {
                    borderRadius: 'var(--bb-radius-control)',
                    border: '1px solid var(--bb-border)',
                    background: 'var(--bb-bg-muted)',
                  }
            "
            @click="selectedTypeId = t.id"
          >
            <Icon v-if="t.icon" :icon="t.icon" class="text-base shrink-0" />
            {{ t.name }}
          </button>
        </div>
        <p v-if="!selectedTypeId" class="text-[11px] ui-text-secondary mt-1.5">
          Pilih jenis darurat agar kami menghubungkan ke unit yang tepat.
        </p>
      </div>

      <!-- Name -->
      <div>
        <label class="ui-label">
          Nama <span class="text-emergency-600">*</span>
        </label>
        <input
          v-model="name"
          type="text"
          placeholder="Nama lengkap pelapor"
          class="ui-field"
        />
      </div>

      <!-- Phone -->
      <div>
        <label class="ui-label">
          No. HP <span class="text-emergency-600">*</span>
        </label>
        <input
          v-model="phone"
          type="tel"
          placeholder="08xxxxxxxxxx"
          class="ui-field"
        />
      </div>

      <!-- Condition -->
      <div>
        <label class="ui-label">Kondisi / Keterangan</label>
        <textarea
          v-model="condition"
          rows="3"
          placeholder="Jelaskan kondisi darurat secara singkat..."
          class="ui-field resize-none"
        />
      </div>

      <!-- Photo upload -->
      <div>
        <label class="ui-label">
          Foto Kondisi <span class="font-normal text-xs ui-text-secondary">(opsional)</span>
        </label>
        <div v-if="photoPreview" class="relative">
          <SkeletonImage
            :src="photoPreview"
            alt="Preview foto"
            wrapper-class="w-full h-36 ui-card overflow-hidden"
            img-class="w-full h-36 object-cover"
          />
          <button
            type="button"
            class="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center"
            @click="removePhoto"
          >
            <Icon icon="ion:close" class="text-xs" />
          </button>
        </div>
        <label
          v-else
          class="flex items-center gap-2 w-full px-3 py-2.5 cursor-pointer"
          style="
            border: 1px dashed var(--bb-border-strong);
            border-radius: var(--bb-radius-control);
            background: var(--bb-bg-muted);
          "
        >
          <Icon icon="lucide:camera" class="text-base shrink-0 ui-text-secondary" />
          <span class="text-sm ui-text-secondary">Ambil / pilih foto (JPG, PNG)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/*" class="sr-only" @change="selectPhoto" />
        </label>
        <p v-if="uploadError" class="text-xs mt-1" style="color: var(--bb-danger)">{{ uploadError }}</p>
      </div>

      <!-- Error -->
      <div
        v-if="sosStore.error"
        class="flex items-start gap-2 p-3 text-sm text-emergency-700"
        style="background: var(--bb-danger-soft); border-radius: var(--bb-radius-card)"
      >
        <Icon icon="lucide:alert-circle" class="shrink-0 mt-0.5" />
        <span>{{ sosStore.error }}</span>
      </div>

      <!-- Submit -->
      <button
        :disabled="!name || !phone || !selectedTypeId || sosStore.isSubmitting || uploadingPhoto"
        class="ui-btn-primary"
        style="background: var(--bb-danger)"
        @click="submit"
      >
        <Icon v-if="sosStore.isSubmitting" icon="lucide:loader-2" class="animate-spin text-base" />
        <Icon v-else icon="lucide:siren" class="text-base" />
        {{ sosStore.isSubmitting ? 'Mengirim...' : 'Kirim Bantuan Darurat' }}
      </button>

      <button type="button" class="w-full text-xs ui-text-secondary py-1" @click="sosStore.close()">
        Batal
      </button>
    </div>
  </CoreSheet>
</template>
