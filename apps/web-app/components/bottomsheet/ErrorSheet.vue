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
      <div class="border-b py-3 px-3 bg-white border-neutral-100 rounded-t-[40px] flex items-center justify-between">
        <h1 class="text-md font-semibold text-neutral-800">Terjadi Masalah</h1>
        <button
          class="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
          @click="appError.onCloseSheet()"
        >
          <Icon icon="ion:close" class="text-neutral-600 text-xl" />
        </button>
      </div>
    </template>

    <div class="bg-white flex items-center justify-center px-8 py-3">
      <div class="text-center max-w-md">
        <div class="mb-3 flex items-center justify-center">
          <img src="/assets/illustration/not-found-2.svg" alt="Error" class="w-44" />
        </div>
        <h2 class="text-center text-black text-base font-semibold pb-1">
          {{ errorContent.title }}
        </h2>
        <p class="text-center text-black text-sm font-normal pb-4">
          {{ errorContent.description }}
        </p>
        <button
          class="btn-dark rounded-full py-2.5 w-full"
          @click="handleRefresh"
        >
          Reload Page
        </button>
      </div>
    </div>
  </CoreSheet>
</template>
