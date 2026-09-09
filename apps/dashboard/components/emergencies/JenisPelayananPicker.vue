<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  jenisPelayananOptions,
  sanitizeJenisPelayanan,
  showJenisPelayananPicker,
} from "@butuhbantuan/utils";

const props = defineProps<{
  modelValue: string[];
  emergencyTypeName?: string;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

const visible = computed(() => showJenisPelayananPicker(props.emergencyTypeName));
const options = computed(() => jenisPelayananOptions(props.emergencyTypeName));

function isSelected(code: string) {
  return props.modelValue.map((v) => v.toLowerCase()).includes(code.toLowerCase());
}

function toggle(code: string) {
  const set = new Set(props.modelValue.map((v) => v.toLowerCase()));
  if (set.has(code)) set.delete(code);
  else set.add(code);
  emit(
    "update:modelValue",
    sanitizeJenisPelayanan([...set], props.emergencyTypeName),
  );
}

watch(
  () => props.emergencyTypeName,
  () => {
    const next = sanitizeJenisPelayanan(props.modelValue, props.emergencyTypeName);
    if (next.join("|") !== props.modelValue.join("|")) {
      emit("update:modelValue", next);
    }
  },
);
</script>

<template>
  <div v-if="visible" class="col-span-full">
    <label class="block text-sm font-medium text-neutral-900 mb-2">Jenis pelayanan</label>
    <p class="text-xs text-neutral-500 mb-3">
      Mode layanan yang unit siap terima — bisa lebih dari satu.
    </p>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 min-w-0">
      <button
        v-for="opt in options"
        :key="opt.code"
        type="button"
        class="flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors"
        :class="
          isSelected(opt.code)
            ? 'border-primary-400 bg-primary-50/80 ring-1 ring-primary-200'
            : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/80'
        "
        @click="toggle(opt.code)"
      >
        <span
          class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
          :class="isSelected(opt.code) ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'"
        >
          <Icon :icon="opt.icon" class="text-lg" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-neutral-900">{{ opt.label }}</span>
          <span v-if="opt.description" class="block text-[11px] text-neutral-500 mt-0.5 leading-snug">
            {{ opt.description }}
          </span>
        </span>
      </button>
    </div>
  </div>
</template>
