<script setup lang="ts">
import { Icon } from "@iconify/vue";

defineProps<{
  emergencyTypeData: any;
  loading?: boolean;
}>();

const emit = defineEmits<{
  serviceClick: [service: any];
}>();

function openMore() {
  useMoreSheetStore().onOpen();
}
</script>

<template>
  <div>
    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-4 items-start mt-2">
      <div
        v-for="i in 4"
        :key="i"
        class="flex flex-col items-center justify-center animate-pulse"
      >
        <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <div class="w-6 h-6 rounded bg-red-200/70" />
        </div>
        <div class="mx-3 mt-1.5 w-14 h-3 bg-neutral-200 rounded" />
      </div>
    </div>

    <!-- List -->
    <div v-if="emergencyTypeData?.data" class="grid grid-cols-4 items-start">
      <button
        v-for="(service, i) in emergencyTypeData.data"
        :key="i"
        type="button"
        class="flex flex-col items-center justify-center group"
        @click="emit('serviceClick', service)"
      >
        <!-- Soft pink circle + red icon (ref style) -->
        <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center transition-transform group-active:scale-95">
          <Icon :icon="service.icon" class="text-red-500 text-[26px]" />
        </div>
        <div class="mx-2">
          <h3 class="text-center text-[13px] mt-1.5 text-neutral-600 font-medium leading-[1.3]">
            {{ service.name }}
          </h3>
        </div>
      </button>

      <!-- "Lainnya" -->
      <button
        type="button"
        class="flex flex-col items-center justify-center group"
        @click="openMore"
      >
        <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center transition-transform group-active:scale-95">
          <Icon icon="ph:dots-nine" class="text-red-500 text-[26px]" />
        </div>
        <div class="mx-2">
          <h3 class="text-center text-[13px] mt-1.5 text-neutral-600 font-medium leading-[1.3]">
            Lainnya
          </h3>
        </div>
      </button>
    </div>
  </div>
</template>
