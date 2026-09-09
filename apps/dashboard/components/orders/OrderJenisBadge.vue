<script setup lang="ts">
import { jenisPelayananMeta } from "~/utils/jenisPelayanan";

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "neutral" | "purple";

const props = withDefaults(
  defineProps<{
    code?: string | null;
    fallback?: string | null;
    showEmpty?: boolean;
    compact?: boolean;
  }>(),
  { showEmpty: false, compact: true, fallback: null },
);

const meta = computed(() => jenisPelayananMeta(props.code || props.fallback));

const variant = computed((): BadgeVariant => {
  const code = meta.value?.code ?? "";
  if (code === "emergency" || code === "pemadam") return "danger";
  if (code === "transport" || code === "pencarian dan pertolongan") return "primary";
  if (code === "jenazah") return "purple";
  return "neutral";
});
</script>

<template>
  <UiBadge v-if="meta" :variant="variant" :size="compact ? 'sm' : 'md'">
    {{ meta.label }}
  </UiBadge>
  <span v-else-if="showEmpty" class="text-xs text-neutral-400">—</span>
</template>
