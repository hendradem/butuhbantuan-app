<script setup lang="ts">
const STATUS: Record<string, { label: string; cls: string }> = {
  pending:     { label: "Menunggu",   cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  accepted:    { label: "Diterima",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "Diproses",   cls: "bg-orange-100 text-orange-700 border-orange-200" },
  completed:   { label: "Selesai",    cls: "bg-green-100 text-green-700 border-green-200" },
  cancelled:   { label: "Dibatalkan", cls: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

const props = defineProps<{ status: string }>();
const cfg = computed(() => STATUS[props.status] ?? { label: props.status, cls: "bg-neutral-100 text-neutral-500 border-neutral-200" });
</script>

<template>
  <span :class="['inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border', cfg.cls]">
    {{ cfg.label }}
  </span>
</template>
