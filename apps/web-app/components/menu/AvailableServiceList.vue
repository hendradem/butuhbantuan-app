<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { splitMenuServices, serviceDemandTick } from "~/utils/serviceDemand";

const props = defineProps<{
  emergencyTypeData: any;
  loading?: boolean;
}>();

const emit = defineEmits<{
  serviceClick: [service: any];
  needHelp: [];
}>();

const moreSheet = useMoreSheetStore();

const split = computed(() => {
  void serviceDemandTick.value;
  return splitMenuServices(props.emergencyTypeData?.data || [], 2);
});

watch(
  split,
  (v) => {
    moreSheet.setOverflowServices(v.rest);
  },
  { immediate: true },
);

function openMore() {
  moreSheet.onOpen();
}
</script>

<template>
  <div>
    <!-- Skeleton: always 4 slots -->
    <div v-if="loading" class="grid grid-cols-4 items-start mt-2">
      <div
        v-for="i in 4"
        :key="i"
        class="flex flex-col items-center justify-center animate-pulse"
      >
        <div class="w-12 h-12 rounded-full ui-icon-well--danger flex items-center justify-center">
          <div class="w-6 h-6 rounded bg-red-200/70" />
        </div>
        <div class="mx-3 mt-1.5 w-14 h-3 soft-skel" />
      </div>
    </div>

    <!-- Fixed 4 slots: Butuh apa? · top2 demand · Lainnya -->
    <div v-else-if="emergencyTypeData?.data" class="grid grid-cols-4 items-start">
      <button
        type="button"
        class="flex flex-col items-center justify-center group"
        @click="emit('needHelp')"
      >
        <div class="w-12 h-12 rounded-full ui-icon-well--danger flex items-center justify-center transition-transform group-active:scale-95">
          <Icon icon="lucide:sparkles" class="text-[26px]" />
        </div>
        <div class="mx-2">
          <h3 class="text-center text-[13px] mt-1.5 ui-text-secondary font-medium leading-[1.3]">
            Butuh apa?
          </h3>
        </div>
      </button>

      <button
        v-for="service in split.pinned"
        :key="service.id ?? service.name"
        type="button"
        class="flex flex-col items-center justify-center group"
        @click="emit('serviceClick', service)"
      >
        <div class="w-12 h-12 rounded-full ui-icon-well--danger flex items-center justify-center transition-transform group-active:scale-95">
          <Icon :icon="(service.icon as string) || 'lucide:shield'" class="text-[26px]" />
        </div>
        <div class="mx-2">
          <h3 class="text-center text-[13px] mt-1.5 ui-text-secondary font-medium leading-[1.3]">
            {{ service.name }}
          </h3>
        </div>
      </button>

      <!-- Keep 4 columns if fewer than 2 types exist -->
      <div
        v-for="n in Math.max(0, 2 - split.pinned.length)"
        :key="`pad-${n}`"
        class="invisible"
        aria-hidden="true"
      />

      <button
        type="button"
        class="flex flex-col items-center justify-center group"
        @click="openMore"
      >
        <div class="w-12 h-12 rounded-full ui-icon-well flex items-center justify-center transition-transform group-active:scale-95">
          <Icon icon="ph:dots-nine" class="text-[26px] text-[color:var(--bb-text-secondary)]" />
        </div>
        <div class="mx-2">
          <h3 class="text-center text-[13px] mt-1.5 ui-text-secondary font-medium leading-[1.3]">
            Lainnya
          </h3>
        </div>
      </button>
    </div>
  </div>
</template>
