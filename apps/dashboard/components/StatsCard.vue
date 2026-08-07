<script setup lang="ts">
type Trend = "up" | "down" | "neutral";

defineProps<{
  label: string;
  value: string | number;
  trend?: Trend;
  trendLabel?: string;
  icon?: string;
}>();

const trendColor = {
  up:      "text-success-600",
  down:    "text-emergency-600",
  neutral: "text-neutral-500",
} as const;

const trendArrow = { up: "↑", down: "↓", neutral: "→" } as const;
</script>

<template>
  <UiCard>
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-neutral-500">{{ label }}</p>
        <p class="mt-1 text-2xl font-bold text-neutral-900">{{ value }}</p>
        <p v-if="trend && trendLabel" :class="['mt-1 text-xs font-medium', trendColor[trend]]">
          {{ trendArrow[trend] }} {{ trendLabel }}
        </p>
      </div>
      <span v-if="icon" class="text-3xl">{{ icon }}</span>
    </div>
  </UiCard>
</template>
