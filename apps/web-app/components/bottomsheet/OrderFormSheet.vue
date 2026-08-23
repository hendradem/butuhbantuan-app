<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { closeAllSheets } from "~/utils/closeAllSheets";
import { appToast } from "~/utils/appToast";

const orderSheet = useOrderSheetStore();
const userLocation = useUserLocationStore();
const config = useRuntimeConfig();
const toast = appToast();
const { name, phone, load: loadProfile, save: saveProfile } = useRequesterProfile();

const location = ref("");
const condition = ref("");
const submitting = ref(false);

const { photoPreview, uploading: uploadingPhoto, uploadError, selectPhoto, uploadPhoto, removePhoto, hasPhoto, photoFile } = usePhotoUpload();

watch(() => orderSheet.isOpen, (v) => {
  if (v) {
    loadProfile();
    location.value = userLocation.fullAddress ?? "";
    condition.value = "";
    removePhoto();
  }
});

async function submit() {
  if (!name.value || !phone.value) return;
  submitting.value = true;
  toast.loading("Membuat laporan...");
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
    const res = await $fetch<{ data: { ticket_number: string } }>(`${config.public.apiBaseUrl}/api/v1/order/`, {
      method: "POST",
      body: {
        emergency_uuid: orderSheet.emergencyUUID,
        unit_name: orderSheet.unitName,
        requester_name: name.value,
        requester_phone: phone.value,
        location: location.value,
        condition: condition.value,
        photo_url: photoUrl,
        requester_lat: userLocation.lat,
        requester_lng: userLocation.long,
      },
    });
    toast.dismiss();

    saveProfile();

    // Remember unit after successful report
    const live = useEmergencyStore().filteredEmergency.find(
      (item: any) => String(item?.emergencyData?.id) === String(orderSheet.emergencyUUID),
    );
    if (live) {
      useRecentUnits().rememberFromEmergency(live, "order");
    } else if (orderSheet.emergencyUUID) {
      useRecentUnits().rememberFromEmergency(
        {
          emergencyData: {
            id: orderSheet.emergencyUUID,
            name: orderSheet.unitName,
            address: {
              regency_id: userLocation.currentRegion.regency.id,
              regency: userLocation.currentRegion.regency.name,
            },
          },
        },
        "order",
      );
    }

    const ticketNumber = res.data?.ticket_number ?? "";
    if (!ticketNumber) {
      toast.error("Tiket dibuat tapi nomor tidak diterima. Coba lagi.");
      return;
    }

    closeAllSheets();
    toast.success("Laporan terkirim");
    useTicketSheetStore().open(ticketNumber);
  } catch {
    toast.error("Gagal membuat laporan");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <CoreSheet :is-open="orderSheet.isOpen" :snap-points="[580, 0]" scrollable is-overlay @close="orderSheet.onClose()">
    <template #header>
      <div class="ui-sheet-header">
        <h1 class="ui-sheet-title">Buat Laporan</h1>
        <button type="button" class="ui-close-btn" @click="orderSheet.onClose()">
          <Icon icon="ion:close" class="text-xl" />
        </button>
      </div>
    </template>

    <div class="px-4 py-4 space-y-4">
      <p class="text-sm ui-text-secondary leading-relaxed">
        Isi informasi berikut agar unit
        <span class="font-semibold ui-text-primary">{{ orderSheet.unitName }}</span>
        dapat segera merespons.
      </p>

      <!-- Name -->
      <div>
        <label class="ui-label">
          Nama <span style="color: var(--bb-danger)">*</span>
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
          No. HP <span style="color: var(--bb-danger)">*</span>
        </label>
        <input
          v-model="phone"
          type="tel"
          placeholder="08xxxxxxxxxx"
          class="ui-field"
        />
      </div>

      <!-- Location -->
      <div>
        <label class="ui-label">Lokasi Kejadian</label>
        <textarea
          v-model="location"
          rows="2"
          placeholder="Alamat atau deskripsi lokasi..."
          class="ui-field resize-none"
        />
      </div>

      <!-- Condition -->
      <div>
        <label class="ui-label">Kondisi / Keluhan</label>
        <textarea
          v-model="condition"
          rows="3"
          maxlength="500"
          placeholder="Jelaskan kondisi atau keluhan yang dialami..."
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
          class="flex items-center gap-2 w-full px-3 py-2.5 cursor-pointer transition-colors"
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

      <!-- Submit -->
      <button
        :disabled="!name || !phone || submitting || uploadingPhoto"
        class="ui-btn-primary"
        style="background: var(--bb-danger)"
        @click="submit"
      >
        <Icon v-if="submitting" icon="lucide:loader-2" class="animate-spin text-base" />
        <template v-else>
          <Icon icon="lucide:life-buoy" class="text-base" />
          Minta Bantuan
        </template>
      </button>
      <p class="m-0 text-center text-[11px] ui-text-secondary leading-snug">
        Tiket dibuat, lalu e-tiket terbuka di sini untuk pantau status.
      </p>

      <button type="button" class="w-full text-xs ui-text-secondary py-1" @click="orderSheet.onClose()">
        Batal
      </button>
    </div>
  </CoreSheet>
</template>
