<script setup lang="ts">
import { Icon } from "@iconify/vue";

const sosStore = useSosStore();
</script>

<template>
  <button
    type="button"
    class="relative flex items-center gap-1.5 px-3 h-10 shrink-0 rounded-xl bg-emergency-600 text-white font-bold text-sm active:bg-emergency-700 transition-colors overflow-hidden"
    @click="sosStore.open()"
  >
    <span class="absolute inset-0 bg-white/20 animate-ping rounded-xl opacity-0 group-hover:opacity-100" />
    <Icon icon="lucide:siren" class="text-base shrink-0" />
    <span class="tracking-wide">SOS</span>
  </button>
</template>
