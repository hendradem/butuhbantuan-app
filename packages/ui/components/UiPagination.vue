<script setup lang="ts">
const props = defineProps<{ page: number; totalPages: number; total?: number; pageSize?: number }>();
const emit = defineEmits<{ "update:page": [page: number] }>();

const from = computed(() => props.total != null && props.pageSize ? (props.page - 1) * props.pageSize + 1 : null);
const to = computed(() => props.total != null && props.pageSize ? Math.min(props.page * props.pageSize, props.total) : null);
</script>
<template>
  <div class="flex items-center justify-between flex-wrap gap-3">
    <p v-if="total != null && from != null" class="text-sm text-neutral-700">
      Menampilkan <span class="font-semibold">{{ from }}</span>–<span class="font-semibold">{{ to }}</span> dari <span class="font-semibold">{{ total }}</span>
    </p>
    <nav class="ml-auto">
      <ul class="inline-flex -space-x-px text-sm">
        <li>
          <button
            :disabled="page <= 1"
            class="flex items-center justify-center px-3 h-8 leading-tight text-neutral-500 bg-white border border-neutral-300 rounded-s-lg hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            @click="emit('update:page', page - 1)"
          >
            Prev
          </button>
        </li>
        <li>
          <span class="flex items-center justify-center px-4 h-8 leading-tight text-neutral-600 bg-white border border-neutral-300 text-sm">
            {{ page }} / {{ totalPages }}
          </span>
        </li>
        <li>
          <button
            :disabled="page >= totalPages"
            class="flex items-center justify-center px-3 h-8 leading-tight text-neutral-500 bg-white border border-neutral-300 rounded-e-lg hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            @click="emit('update:page', page + 1)"
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>
