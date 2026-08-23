<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { closeAllSheets } from "~/utils/closeAllSheets";

const ticketSheet = useTicketSheetStore();

function requestClose() {
  ticketSheet.requestClose();
}

/** Confirmed dismiss: close e-ticket + every sheet + clear map routes. */
function confirmCloseHome() {
  ticketSheet.confirmCloseOpen = false;
  closeAllSheets();
}
</script>

<template>
  <CoreSheet
    :is-open="ticketSheet.isOpen"
    :snap-points="[1]"
    scrollable
    is-overlay
    square
    @close="requestClose"
  >
    <template #header>
      <div class="ui-sheet-header !pt-5 !pb-3.5 px-4">
        <h1 class="ui-sheet-title">E-Tiket Darurat</h1>
        <button type="button" class="ui-close-btn" @click="requestClose">
          <Icon icon="ion:close" class="text-xl" />
        </button>
      </div>
    </template>

    <div class="px-4 pb-8 pt-4">
      <ETicketCard
        v-if="ticketSheet.isOpen && ticketSheet.ticketNumber"
        :ticket-number="ticketSheet.ticketNumber"
        :via="ticketSheet.via"
        :to="ticketSheet.to"
        @close="requestClose"
      />
    </div>
  </CoreSheet>

  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="ticketSheet.confirmCloseOpen"
        class="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center p-4"
        style="background: var(--bb-overlay)"
        role="presentation"
        @click="ticketSheet.cancelCloseConfirm()"
      >
        <div
          class="ui-card w-full max-w-sm overflow-hidden"
          style="box-shadow: var(--bb-shadow-soft)"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-close-title"
          @click.stop
        >
          <div class="px-5 pt-5 pb-4 text-center">
            <div
              class="mx-auto w-11 h-11 flex items-center justify-center ui-icon-well"
              style="border-radius: var(--bb-radius-pill)"
            >
              <Icon icon="lucide:ticket" class="text-xl" />
            </div>
            <h2 id="ticket-close-title" class="mt-3 text-base font-semibold ui-text-primary">
              Tutup e-tiket?
            </h2>
            <p class="mt-1.5 text-sm ui-text-secondary leading-snug">
              Kamu bisa membuka lagi dari riwayat atau link tiket.
            </p>
          </div>
          <div class="px-4 pb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              class="py-2.5 text-sm font-semibold ui-text-primary"
              style="
                border-radius: var(--bb-radius-control);
                border: 1px solid var(--bb-border);
                background: var(--bb-bg-surface);
              "
              @click="ticketSheet.cancelCloseConfirm()"
            >
              Tetap di sini
            </button>
            <button
              type="button"
              class="ui-btn-primary py-2.5 text-sm"
              @click="confirmCloseHome"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
