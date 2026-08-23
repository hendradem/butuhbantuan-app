<script setup lang="ts">
import { Icon } from "@iconify/vue";

const appError = useAppErrorStore();

const errorContent = computed(() => {
  if (appError.errorMessage === "permission_denied") {
    return { title: "Aktifkan GPS", description: "Aktifkan GPS kamu untuk mendapatkan layanan." };
  }
  return { title: "Lokasi tidak terdeteksi", description: "Aktifkan GPS, Ganti Jaringan dan coba lagi." };
});

function handleRefresh() {
  window.location.href = "/";
}
</script>

<template>
  <CoreSheet :is-open="appError.isSheetOpen" :snap-points="[400, 0]" is-overlay @close="appError.onCloseSheet()">
    <template #header>
      <div class="ui-sheet-header">
        <h1 class="ui-sheet-title">Terjadi Masalah</h1>
        <button type="button" class="ui-close-btn" @click="appError.onCloseSheet()">
          <Icon icon="ion:close" class="text-xl" />
        </button>
      </div>
    </template>

    <div class="flex items-center justify-center px-8 py-3">
      <div class="text-center max-w-md">
        <div class="mb-3 flex items-center justify-center">
          <img src="/assets/illustration/not-found-2.svg" alt="Error" class="w-44" />
        </div>
        <h2 class="text-center ui-text-primary text-base font-semibold pb-1">
          {{ errorContent.title }}
        </h2>
        <p class="text-center ui-text-secondary text-sm font-normal pb-4">
          {{ errorContent.description }}
        </p>
        <button
          class="ui-btn-primary"
          style="border-radius: var(--bb-radius-pill)"
          @click="handleRefresh"
        >
          Reload Page
        </button>
      </div>
    </div>
  </CoreSheet>
</template>
