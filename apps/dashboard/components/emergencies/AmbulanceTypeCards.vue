<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { AMBULANCE_TYPE_CARDS } from "@butuhbantuan/utils";

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function select(code: string) {
  if (code !== props.modelValue) emit("update:modelValue", code);
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 min-w-0">
    <button
      v-for="card in AMBULANCE_TYPE_CARDS"
      :key="card.code"
      type="button"
      class="rounded-xl border px-3 py-3 text-left transition-colors min-w-0"
      :class="
        modelValue === card.code
          ? 'border-primary-400 bg-primary-50/80 ring-1 ring-primary-200'
          : 'border-neutral-200 bg-white hover:border-neutral-300'
      "
      @click="select(card.code)"
    >
      <div class="flex items-start gap-2.5">
        <span
          class="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          :class="modelValue === card.code ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'"
        >
          <Icon :icon="card.icon" class="text-xl" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-neutral-900 leading-snug">{{ card.label }}</span>
          <span class="block text-[10px] font-medium text-neutral-400 mt-0.5">{{ card.tableRef }}</span>
          <span class="block text-[11px] text-neutral-500 mt-1 leading-snug">{{ card.description }}</span>
        </span>
      </div>
    </button>
  </div>
</template>
