<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  jenisPelayananOptionsForUnit,
  showJenisPelayananPicker,
} from "~/utils/jenisPelayanan";

const props = defineProps<{
  modelValue: string;
  emergencyTypeName?: string;
  unitModes?: string[];
  required?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const visible = computed(() => showJenisPelayananPicker(props.emergencyTypeName));
const options = computed(() =>
  jenisPelayananOptionsForUnit(props.unitModes, props.emergencyTypeName),
);

const singleMode = computed(() => options.value.length === 1);

watch(
  options,
  (opts) => {
    if (opts.length === 1 && !props.modelValue) {
      emit("update:modelValue", opts[0].code);
    }
    if (props.modelValue && !opts.some((o) => o.code === props.modelValue)) {
      emit("update:modelValue", opts.length === 1 ? opts[0].code : "");
    }
  },
  { immediate: true },
);

function select(code: string) {
  emit("update:modelValue", props.modelValue === code ? "" : code);
}
</script>

<template>
  <div v-if="visible && options.length" class="md:col-span-2">
    <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">
      Jenis pelayanan
      <span v-if="required && !singleMode" class="text-emergency-600">*</span>
    </label>
    <p v-if="!singleMode" class="text-xs text-neutral-500 mb-2.5">
      Pilih sesuai kebutuhan pelapor — menentukan checklist asesmen.
    </p>
    <div
      class="grid gap-2"
      :class="options.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'"
    >
      <button
        v-for="opt in options"
        :key="opt.code"
        type="button"
        class="flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors"
        :class="
          modelValue === opt.code
            ? 'border-primary-400 bg-primary-50/80 ring-1 ring-primary-200'
            : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/80'
        "
        @click="select(opt.code)"
      >
        <span
          class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          :class="modelValue === opt.code ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'"
        >
          <Icon :icon="opt.icon" class="text-base" />
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
