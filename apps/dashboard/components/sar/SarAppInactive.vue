<script setup lang="ts">
import { Icon } from "@iconify/vue";

defineProps<{
  toggling?: boolean;
}>();

const emit = defineEmits<{
  enable: [];
}>();
</script>

<template>
  <div class="max-w-lg mx-auto pt-16 text-center space-y-5">
    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 mx-auto">
      <Icon icon="lucide:radar" class="text-2xl" />
    </div>
    <div>
      <h1 class="text-xl font-semibold text-neutral-900">SRU Mission Map</h1>
      <p class="text-sm text-neutral-600 mt-2 leading-relaxed">
        Modul SMC untuk tracking SRU via HT, karvak KML, history shift, dan cuaca lapangan.
        Default <strong>nonaktif</strong>. Setelah diaktifkan, Anda bisa melihat
        <strong>history ESAR lain</strong>, lalu onboarding misi sendiri jika belum.
      </p>
    </div>
    <div class="rounded-xl border border-neutral-200 bg-white px-5 py-4 text-left space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-neutral-900">Aktifkan aplikasi</p>
          <p class="text-xs text-neutral-500">Switch on → history ESAR → onboarding (jika perlu)</p>
        </div>
        <button
          type="button"
          class="relative inline-flex h-7 w-12 shrink-0 rounded-full bg-neutral-300 transition-colors disabled:opacity-50"
          :disabled="toggling"
          @click="emit('enable')"
        >
          <span class="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow" />
        </button>
      </div>
    </div>
  </div>
</template>
