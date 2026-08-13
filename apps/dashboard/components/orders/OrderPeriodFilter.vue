<script setup lang="ts">
import { Icon } from "@iconify/vue";
import type { OrderPeriodId } from "~/utils/orderPeriod";

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    period: OrderPeriodId;
    presets: readonly { id: OrderPeriodId; label: string }[];
    isCustom: boolean;
    customFrom: string;
    customTo: string;
    /** Compact select — for dense toolbars (unit). */
    compact?: boolean;
  }>(),
  { compact: false },
);

const emit = defineEmits<{
  "update:period": [OrderPeriodId];
  "update:customFrom": [string];
  "update:customTo": [string];
}>();

function onPeriodSelect(raw: string) {
  if (!raw) return;
  emit("update:period", raw as OrderPeriodId);
}
</script>

<template>
  <div class="min-w-0" v-bind="$attrs">
    <!-- Compact: UiSelect + optional dates — stacks on narrow screens -->
    <div
      v-if="compact"
      class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 min-w-0 w-full"
    >
      <UiSelect
        class="w-full sm:!w-auto sm:min-w-[8.5rem]"
        :model-value="period"
        @update:model-value="onPeriodSelect"
      >
        <option v-for="opt in presets" :key="opt.id" :value="opt.id">
          {{ opt.label }}
        </option>
      </UiSelect>

      <template v-if="isCustom">
        <div class="flex items-center gap-2 w-full sm:w-auto min-w-0">
          <UiInput
            type="date"
            class="flex-1 sm:!w-auto min-w-0"
            :model-value="customFrom"
            @update:model-value="emit('update:customFrom', $event)"
          />
          <span class="text-neutral-300 text-xs shrink-0">–</span>
          <UiInput
            type="date"
            class="flex-1 sm:!w-auto min-w-0"
            :model-value="customTo"
            :min="customFrom || undefined"
            @update:model-value="emit('update:customTo', $event)"
          />
        </div>
      </template>
    </div>

    <!-- Default: segmented control -->
    <div v-else class="flex flex-col gap-2 min-w-0">
      <div class="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 overflow-x-auto scrollbar-none">
        <button
          v-for="opt in presets"
          :key="opt.id"
          type="button"
          :class="[
            'px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0',
            period === opt.id
              ? 'bg-white text-neutral-950 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
          ]"
          @click="emit('update:period', opt.id)"
        >
          <span class="inline-flex items-center gap-1">
            <Icon v-if="opt.id === 'custom'" icon="lucide:calendar-range" class="text-[12px]" />
            {{ opt.label }}
          </span>
        </button>
      </div>

      <div v-if="isCustom" class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
        <label class="flex items-center gap-1.5 text-xs text-neutral-500 min-w-0">
          <span class="shrink-0">Dari</span>
          <UiInput
            type="date"
            class="flex-1 sm:!w-auto min-w-0"
            :model-value="customFrom"
            @update:model-value="emit('update:customFrom', $event)"
          />
        </label>
        <label class="flex items-center gap-1.5 text-xs text-neutral-500 min-w-0">
          <span class="shrink-0">Sampai</span>
          <UiInput
            type="date"
            class="flex-1 sm:!w-auto min-w-0"
            :model-value="customTo"
            :min="customFrom || undefined"
            @update:model-value="emit('update:customTo', $event)"
          />
        </label>
      </div>
    </div>
  </div>
</template>
