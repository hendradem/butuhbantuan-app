<script setup lang="ts">
/**
 * Order status badge — soft full-rounded border pills.
 */
const STATUS: Record<string, { label: string; cls: string }> = {
  pending:     { label: "Menunggu",   cls: "bg-amber-50 text-amber-800 border-amber-200" },
  accepted:    { label: "Diterima",   cls: "bg-blue-50 text-blue-800 border-blue-200" },
  in_progress: { label: "Diproses",   cls: "bg-orange-50 text-orange-800 border-orange-200" },
  completed:   { label: "Selesai",    cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  cancelled:   { label: "Dibatalkan", cls: "bg-neutral-50 text-neutral-600 border-neutral-200" },
};

const props = defineProps<{ status: string; label?: string }>();
const cfg = computed(
  () =>
    STATUS[props.status] ?? {
      label: props.label || props.status,
      cls: "bg-neutral-50 text-neutral-600 border-neutral-200",
    },
);
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      cfg.cls,
    ]"
  >
    {{ label || cfg.label }}
  </span>
</template>
