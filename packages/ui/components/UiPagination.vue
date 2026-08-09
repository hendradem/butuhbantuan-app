<script setup lang="ts">
const props = defineProps<{ page: number; totalPages: number; total?: number; pageSize?: number }>();
const emit = defineEmits<{ "update:page": [page: number] }>();

const from = computed(() => props.total != null && props.pageSize ? (props.page - 1) * props.pageSize + 1 : null);
const to = computed(() => props.total != null && props.pageSize ? Math.min(props.page * props.pageSize, props.total) : null);
</script>
<template>
  <div class="flex items-center justify-between gap-4 flex-wrap">
    <p v-if="total != null && from != null" class="text-xs text-neutral-500">
      {{ from }}–{{ to }} dari {{ total }}
    </p>
    <div class="flex items-center gap-1 ml-auto">
      <button
        :disabled="page <= 1"
        class="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200 border border-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        @click="emit('update:page', page - 1)"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <span class="text-xs text-neutral-600 px-2">{{ page }} / {{ totalPages }}</span>
      <button
        :disabled="page >= totalPages"
        class="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200 border border-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        @click="emit('update:page', page + 1)"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
  </div>
</template>
