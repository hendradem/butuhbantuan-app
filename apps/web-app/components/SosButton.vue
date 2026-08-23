<script setup lang="ts">
import { Icon } from "@iconify/vue";

const sosStore = useSosStore();
</script>

<template>
  <button
    type="button"
    class="relative flex items-center gap-1.5 px-3.5 h-10 shrink-0 font-semibold text-sm text-white transition-transform active:scale-[0.98] overflow-hidden"
    style="background: var(--bb-danger); border-radius: var(--bb-radius-control)"
    @click="sosStore.open()"
  >
    <Icon icon="lucide:siren" class="text-base shrink-0" />
    <span class="tracking-wide">SOS</span>
  </button>
</template>
