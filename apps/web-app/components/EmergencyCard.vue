<script setup lang="ts">
import type { Emergency } from "@butuhbantuan/types";
import { timeAgo } from "@butuhbantuan/utils";

defineProps<{ emergency: Emergency }>();

const statusVariant = {
  pending:     "warning",
  in_progress: "primary",
  resolved:    "success",
  cancelled:   "neutral",
} as const;

const statusLabel = {
  pending:     "Menunggu",
  in_progress: "Ditangani",
  resolved:    "Selesai",
  cancelled:   "Dibatalkan",
} as const;

const categoryIcon = {
  medical:          "🏥",
  fire:             "🔥",
  crime:            "🚨",
  accident:         "🚗",
  natural_disaster: "🌊",
  other:            "⚠️",
} as const;

const modalOpen = ref(false);
</script>

<template>
  <UiCard hoverable @click="modalOpen = true">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <span class="text-2xl">{{ categoryIcon[emergency.category] }}</span>
        <div class="min-w-0">
          <p class="truncate font-semibold text-neutral-900">{{ emergency.title }}</p>
          <p class="mt-0.5 line-clamp-2 text-sm text-neutral-500">
            {{ emergency.description }}
          </p>
        </div>
      </div>
      <UiBadge :variant="statusVariant[emergency.status]" dot class="shrink-0">
        {{ statusLabel[emergency.status] }}
      </UiBadge>
    </div>
    <p class="mt-3 text-xs text-neutral-400">{{ timeAgo(emergency.createdAt) }}</p>
  </UiCard>

  <UiModal
    v-model:open="modalOpen"
    :title="emergency.title"
    :description="emergency.description"
  >
    <dl class="space-y-2 text-sm">
      <div class="flex justify-between">
        <dt class="text-neutral-500">Kategori</dt>
        <dd class="font-medium text-neutral-800">{{ categoryIcon[emergency.category] }} {{ emergency.category }}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-neutral-500">Dilaporkan oleh</dt>
        <dd class="font-medium text-neutral-800">{{ emergency.reportedBy }}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-neutral-500">Koordinat</dt>
        <dd class="font-medium text-neutral-800">{{ emergency.latitude }}, {{ emergency.longitude }}</dd>
      </div>
    </dl>
    <template #footer>
      <UiButton variant="ghost" @click="modalOpen = false">Tutup</UiButton>
      <UiButton variant="primary">Lihat di Peta</UiButton>
    </template>
  </UiModal>
</template>
