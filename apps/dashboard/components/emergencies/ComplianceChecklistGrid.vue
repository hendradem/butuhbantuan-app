<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  STATUS_CHOICES,
  type ComplianceStatus,
  statusBadgeVariant,
  statusLabel,
} from "~/utils/ambulanceCompliance";

type Item = {
  code: string;
  label: string;
  required: boolean;
  status?: ComplianceStatus;
  photo_url?: string;
};

const props = defineProps<{
  items: Item[];
  readonly?: boolean;
  uploadingCode?: string;
}>();

const emit = defineEmits<{
  "update:status": [code: string, status: ComplianceStatus];
  upload: [code: string, event: Event];
  "clear-photo": [code: string];
}>();
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
    <div
      v-for="item in items"
      :key="item.code"
      class="rounded-lg border border-neutral-100 px-2.5 py-2"
      :class="readonly ? 'bg-neutral-50/60' : 'bg-white'"
    >
      <template v-if="readonly">
        <div class="flex items-start gap-2">
          <UiBadge :variant="statusBadgeVariant(item.status || 'tidak_diketahui')" class="shrink-0 mt-0.5">
            {{ statusLabel(item.status || 'tidak_diketahui') }}
          </UiBadge>
          <div class="min-w-0">
            <span class="text-xs text-neutral-700 leading-snug">
              {{ item.label }}
              <span v-if="!item.required" class="text-neutral-400"> (ops.)</span>
            </span>
            <a
              v-if="item.photo_url"
              :href="item.photo_url"
              target="_blank"
              rel="noopener"
              class="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-primary-600 hover:underline"
            >
              <Icon icon="lucide:image" class="text-xs" />
              Lihat foto
            </a>
          </div>
        </div>
      </template>

      <template v-else>
        <p class="m-0 text-xs text-neutral-800 leading-snug">
          {{ item.label }}
          <span v-if="item.required" class="text-emergency-600">*</span>
        </p>
        <div class="flex flex-wrap items-center gap-1 mt-1.5">
          <UiButton
            v-for="opt in STATUS_CHOICES"
            :key="opt.value"
            type="button"
            size="xs"
            :variant="
              item.status !== opt.value
                ? 'secondary'
                : opt.value === 'ada'
                  ? 'primary'
                  : opt.value === 'tidak'
                    ? 'danger-secondary'
                    : 'secondary'
            "
            @click="emit('update:status', item.code, opt.value)"
          >
            {{ opt.label }}
          </UiButton>
          <label
            class="inline-flex items-center justify-center w-7 h-7 rounded-md border border-neutral-200 bg-white cursor-pointer"
            :class="uploadingCode === item.code ? 'opacity-50 pointer-events-none' : ''"
          >
            <Icon
              :icon="item.photo_url ? 'lucide:image-check' : 'lucide:camera'"
              class="text-sm text-neutral-500"
            />
            <input
              type="file"
              accept="image/*"
              class="sr-only"
              @change="emit('upload', item.code, $event)"
            >
          </label>
          <button
            v-if="item.photo_url"
            type="button"
            class="text-[10px] text-neutral-400 hover:text-neutral-600 px-1"
            @click="emit('clear-photo', item.code)"
          >
            Hapus foto
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
