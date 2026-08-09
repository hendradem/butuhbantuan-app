<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";
import { convertPhoneNumber } from "~/utils/convertPhoneNumber";

const orderSheet = useOrderSheetStore();
const userLocation = useUserLocationStore();
const config = useRuntimeConfig();

const name = ref("");
const phone = ref("");
const location = ref("");
const condition = ref("");
const submitting = ref(false);

watch(() => orderSheet.isOpen, (v) => {
  if (v) {
    name.value = "";
    phone.value = "";
    location.value = userLocation.fullAddress ?? "";
    condition.value = "";
  }
});

async function submit() {
  if (!name.value || !phone.value) return;
  submitting.value = true;
  const toastId = toast.loading("Membuat laporan...");
  try {
    const res = await $fetch<{ data: { ticket_number: string } }>(`${config.public.apiBaseUrl}/api/v1/order/`, {
      method: "POST",
      body: {
        emergency_uuid: orderSheet.emergencyUUID,
        unit_name: orderSheet.unitName,
        requester_name: name.value,
        requester_phone: phone.value,
        location: location.value,
        condition: condition.value,
        requester_lat: userLocation.lat,
        requester_lng: userLocation.long,
      },
    });
    toast.dismiss(toastId);

    const ticketNumber = res.data?.ticket_number ?? "";
    const callType = orderSheet.callType;
    const callNumber = orderSheet.callNumber;

    orderSheet.onClose();

    const params = new URLSearchParams();
    if (callType) params.set("via", callType);
    if (callNumber) params.set("to", convertPhoneNumber(callNumber));
    await navigateTo(`/ticket/${ticketNumber}?${params.toString()}`);
  } catch {
    toast.error("Gagal membuat laporan", { id: toastId });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <CoreSheet :is-open="orderSheet.isOpen" :snap-points="[580, 0]" scrollable is-overlay @close="orderSheet.onClose()">
    <template #header>
      <div class="border-b py-3 px-3 bg-white border-neutral-100 rounded-t-[40px] flex items-center justify-between">
        <h1 class="text-md font-semibold text-neutral-800">Buat Laporan</h1>
        <button
          class="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
          @click="orderSheet.onClose()"
        >
          <Icon icon="ion:close" class="text-neutral-600 text-xl" />
        </button>
      </div>
    </template>

    <div class="px-4 py-4 space-y-4">
      <p class="text-sm text-neutral-500 leading-relaxed">
        Isi informasi berikut agar unit
        <span class="font-semibold text-neutral-800">{{ orderSheet.unitName }}</span>
        dapat segera merespons.
      </p>

      <!-- Name -->
      <div>
        <label class="block text-sm font-semibold text-neutral-800 mb-1.5">
          Nama <span class="text-red-500">*</span>
        </label>
        <input
          v-model="name"
          type="text"
          placeholder="Nama lengkap pelapor"
          class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition-colors"
        />
      </div>

      <!-- Phone -->
      <div>
        <label class="block text-sm font-semibold text-neutral-800 mb-1.5">
          No. HP <span class="text-red-500">*</span>
        </label>
        <input
          v-model="phone"
          type="tel"
          placeholder="08xxxxxxxxxx"
          class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition-colors"
        />
      </div>

      <!-- Location -->
      <div>
        <label class="block text-sm font-semibold text-neutral-800 mb-1.5">Lokasi Kejadian</label>
        <textarea
          v-model="location"
          rows="2"
          placeholder="Alamat atau deskripsi lokasi..."
          class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white resize-none transition-colors"
        />
      </div>

      <!-- Condition -->
      <div>
        <label class="block text-sm font-semibold text-neutral-800 mb-1.5">Kondisi / Keluhan</label>
        <textarea
          v-model="condition"
          rows="3"
          maxlength="500"
          placeholder="Jelaskan kondisi atau keluhan yang dialami..."
          class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white resize-none transition-colors"
        />
      </div>

      <!-- Submit -->
      <button
        :disabled="!name || !phone || submitting"
        class="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
        @click="submit"
      >
        <Icon v-if="submitting" icon="lucide:loader-2" class="animate-spin text-base" />
        <template v-else>
          <Icon v-if="orderSheet.callType === 'whatsapp'" icon="mingcute:chat-1-fill" class="text-base" />
          <Icon v-else icon="mdi:phone" class="text-base" />
          {{ orderSheet.callType === 'whatsapp' ? 'Kirim via WhatsApp' : 'Lanjutkan & Telfon' }}
        </template>
      </button>

      <button class="w-full text-xs text-neutral-400 py-1" @click="orderSheet.onClose()">
        Batal
      </button>
    </div>
  </CoreSheet>
</template>
