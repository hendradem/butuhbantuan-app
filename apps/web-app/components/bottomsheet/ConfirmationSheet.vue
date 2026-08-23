<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { appToast } from "~/utils/appToast";
import { buildUnitWaMessage, openWhatsApp } from "~/utils/waContact";

const sheet = useConfirmationSheetStore();
const reviewSheet = useReviewSheetStore();
const ticketSheet = useTicketSheetStore();
const userLocation = useUserLocationStore();
const toast = appToast();

function onContactClick(e: Event) {
  e.stopPropagation();

  if (sheet.callType === "whatsapp") {
    const text = buildUnitWaMessage({
      unitName: sheet.unitName,
      ticketNumber: sheet.ticketNumber,
      address: userLocation.fullAddress,
      lat: userLocation.lat,
      lng: userLocation.long,
    });
    const opened = openWhatsApp(sheet.callNumber, text);
    if (opened) toast.success("Membuka WhatsApp…");
    else toast.error("Nomor WhatsApp tidak valid");
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

function openTicketStatus() {
  const n = String(sheet.ticketNumber || "").trim();
  if (!n) return;
  sheet.onClose();
  ticketSheet.open(n, {
    via: sheet.callType === "whatsapp" || sheet.callType === "phone" ? sheet.callType : undefined,
    to: sheet.callNumber || undefined,
  });
}
</script>

<template>
  <CoreSheet :is-open="sheet.isOpen" :snap-points="[400, 0]" is-overlay @close="sheet.onClose()">
    <template #header>
      <div class="ui-sheet-header">
        <h1 class="ui-sheet-title">Konfirmasi</h1>
        <button type="button" class="ui-close-btn" @click="sheet.onClose()">
          <Icon icon="ion:close" class="text-xl" />
        </button>
      </div>
    </template>

    <ConfirmationState
      size="xs"
      :title="`Anda akan diarahkan ke ${sheet.callType === 'phone' ? 'telfon seluler' : 'WhatsApp'}`"
      description="Gunakan hanya untuk keadaan darurat dan dilarang keras untuk menyalahgunakan nomor ini."
    >
      <div
        v-if="sheet.ticketNumber"
        class="mb-4 mx-2 px-3 py-2.5 text-center"
        style="background: var(--bb-bg-muted); border: 1px solid var(--bb-border); border-radius: var(--bb-radius-card)"
      >
        <p class="text-xs ui-text-secondary mb-0.5">Nomor Tiket Anda</p>
        <p class="text-base font-bold ui-text-primary tracking-wider">{{ sheet.ticketNumber }}</p>
        <button
          type="button"
          class="text-xs text-primary-600 underline mt-0.5 inline-block"
          @click="openTicketStatus"
        >
          Lihat status tiket
        </button>
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
