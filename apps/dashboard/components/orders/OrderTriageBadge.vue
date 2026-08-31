<script setup lang="ts">
import { isEmergencyJenis } from "~/utils/jenisPelayanan";
import { triageMeta } from "~/utils/triage";

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "neutral" | "purple";

const props = withDefaults(
  defineProps<{
    acuity?: string | null;
    jenisPelayanan?: string | null;
    emergencyOnly?: boolean;
    hideEmpty?: boolean;
    compact?: boolean;
  }>(),
  { hideEmpty: true, emergencyOnly: false, compact: true },
);

const meta = computed(() => triageMeta(props.acuity));

const visible = computed(() => {
  if (!meta.value) return !props.hideEmpty;
  if (props.emergencyOnly && !isEmergencyJenis(props.jenisPelayanan)) return false;
  return true;
});

const variant = computed((): BadgeVariant => {
  const code = meta.value?.code;
  if (code === "red") return "danger";
  if (code === "yellow") return "warning";
  if (code === "green") return "success";
  return "neutral";
});
</script>

<template>
  <UiBadge
    v-if="meta && visible"
    :variant="variant"
    dot
    :size="compact ? 'sm' : 'md'"
  >
    Triase · {{ meta.label }}
  </UiBadge>
  <span v-else-if="!hideEmpty && visible" class="text-xs text-neutral-400">—</span>
</template>
