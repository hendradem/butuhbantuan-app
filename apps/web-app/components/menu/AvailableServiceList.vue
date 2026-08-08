<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue-sonner";

defineProps<{
  emergencyTypeData: any;
  loading?: boolean;
}>();

const emit = defineEmits<{
  serviceClick: [service: any];
}>();

function handleUnavailable() {
  toast.error("Service coming soon", { duration: 1500 });
}
</script>

<template>
  <div>
    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-4 mt-2">
      <div
        v-for="i in 4"
        :key="i"
        class="w-24 flex flex-col items-center space-y-2 animate-pulse"
      >
        <div class="w-[50px] h-[50px] bg-red-100 rounded-full flex items-center justify-center">
          <div class="w-7 h-7 bg-red-300 rounded-md"></div>
        </div>
        <div class="w-16 h-3 bg-gray-300 rounded"></div>
      </div>
    </div>

    <!-- List -->
    <div v-if="emergencyTypeData?.data" class="grid grid-cols-4 items-start">
      <div
        v-for="(service, i) in emergencyTypeData.data"
        :key="i"
        class="flex flex-col cursor-pointer items-center justify-center"
        @click="emit('serviceClick', service)"
      >
        <div class="p-2.5 border-none rounded-full bg-red-50 shadow-sm">
          <Icon :icon="service.icon" class="text-red-500 text-[30px]" />
        </div>
        <div class="mx-3">
          <h3 class="text-center text-[13px] mt-1 text-neutral-600 font-medium leading-[1.3]">
            {{ service.name }}
          </h3>
        </div>
      </div>

      <!-- "Lainnya" button -->
      <div
        class="flex flex-col cursor-pointer items-center justify-center"
        @click="handleUnavailable"
      >
        <div class="p-2.5 border-none rounded-full bg-red-50 shadow-sm">
          <Icon icon="ph:dots-nine" class="text-red-500 text-[30px]" />
        </div>
        <div class="mx-3">
          <h3 class="text-center text-[13px] mt-1 text-neutral-600 font-medium leading-[1.3]">
            Lainnya
          </h3>
        </div>
      </div>
    </div>
  </div>
</template>
