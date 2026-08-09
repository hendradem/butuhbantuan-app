<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";
import { convertPhoneNumber } from "~/utils/convertPhoneNumber";

const sheet = useConfirmationSheetStore();
const reviewSheet = useReviewSheetStore();

function onContactClick(e: Event) {
  e.stopPropagation();
  const number = convertPhoneNumber(sheet.callNumber);

  if (sheet.callType === "whatsapp") {
    toast.success("Akan dihubungkan ke WhatsApp");
    window.open(`https://wa.me/${number}`, "_blank");
  } else {
    window.open(`tel:${sheet.callNumber}`, "_blank");
  }

  const { emergencyId, unitName, callType } = sheet;
  sheet.onClose();

  if (emergencyId) {
    setTimeout(() => {
      reviewSheet.open(emergencyId, unitName, callType as "whatsapp" | "phone");
    }, 1500);
  }
}
</script>

<template>
  <CoreSheet :is-open="sheet.isOpen" :snap-points="[400, 0]" is-overlay @close="sheet.onClose()">
    <template #header>
      <div class="border-b py-3 px-3 bg-white border-neutral-100 rounded-t-[40px] flex items-center justify-between">
        <h1 class="text-md font-semibold text-neutral-800">Konfirmasi</h1>
        <button
          class="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
          @click="sheet.onClose()"
        >
          <Icon icon="ion:close" class="text-neutral-600 text-xl" />
        </button>
      </div>
    </template>

    <ConfirmationState
      size="xs"
      :title="`Anda akan diarahkan ke ${sheet.callType === 'phone' ? 'telfon seluler' : 'WhatsApp'}`"
      description="Gunakan hanya untuk keadaan darurat dan dilarang keras untuk menyalahgunakan nomor ini."
    >
      <!-- Ticket info -->
      <div v-if="sheet.ticketNumber" class="mb-4 mx-2 px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-center">
        <p class="text-xs text-neutral-500 mb-0.5">Nomor Tiket Anda</p>
        <p class="text-base font-bold text-neutral-900 tracking-wider">{{ sheet.ticketNumber }}</p>
        <a
          :href="`/ticket/${sheet.ticketNumber}`"
          target="_blank"
          class="text-xs text-primary-600 underline mt-0.5 inline-block"
        >Lihat status tiket</a>
      </div>

      <div class="flex items-center justify-center gap-1">
        <button
          v-if="sheet.callType === 'whatsapp'"
          class="btn-whatsapp btn-base"
          @click="onContactClick"
        >
          <Icon icon="mingcute:chat-1-fill" class="w-5 h-5 mr-2" />
          Whatsapp
        </button>
        <button
          v-if="sheet.callType === 'phone'"
          class="btn-call btn-base"
          @click="onContactClick"
        >
          <Icon icon="mingcute:phone-call-fill" class="w-5 h-5 mr-2" />
          Telfon
        </button>
        <button class="btn-dark" @click="sheet.onClose()">Cancel</button>
      </div>
    </ConfirmationState>
  </CoreSheet>
</template>
