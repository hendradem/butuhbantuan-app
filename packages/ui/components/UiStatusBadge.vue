<script setup lang="ts">
const STATUS: Record<string, { label: string; cls: string }> = {
  pending:     { label: "Menunggu",   cls: "bg-yellow-100 text-yellow-800" },
  accepted:    { label: "Diterima",   cls: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Diproses",   cls: "bg-orange-100 text-orange-800" },
  completed:   { label: "Selesai",    cls: "bg-green-100 text-green-800" },
  cancelled:   { label: "Dibatalkan", cls: "bg-neutral-100 text-neutral-600" },
};

const props = defineProps<{ status: string }>();
const cfg = computed(() => STATUS[props.status] ?? { label: props.status, cls: "bg-neutral-100 text-neutral-600" });
</script>

<template>
  <span :class="['inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded', cfg.cls]">
    {{ cfg.label }}
  </span>
</template>
