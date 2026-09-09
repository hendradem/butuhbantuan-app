<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    page: number;
    totalPages: number;
    total?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
  }>(),
  { pageSizeOptions: () => [] },
);
const emit = defineEmits<{
  "update:page": [page: number];
  "update:pageSize": [size: number];
}>();

const from = computed(() => props.total != null && props.pageSize ? (props.page - 1) * props.pageSize + 1 : null);
const to = computed(() => props.total != null && props.pageSize ? Math.min(props.page * props.pageSize, props.total) : null);

const showPageSize = computed(
  () => props.pageSizeOptions.length > 0 && props.pageSize != null,
);

function onPageSizeChange(e: Event) {
  const next = Number((e.target as HTMLSelectElement).value);
  if (!Number.isFinite(next) || next === props.pageSize) return;
  emit("update:pageSize", next);
}
</script>
<template>
  <div class="flex items-center justify-between flex-wrap gap-3">
    <p v-if="total != null && from != null" class="text-sm text-neutral-700">
      Menampilkan <span class="font-semibold">{{ from }}</span>–<span class="font-semibold">{{ to }}</span> dari <span class="font-semibold">{{ total }}</span>
    </p>
    <div class="flex items-center gap-2.5 ml-auto">
      <select
        v-if="showPageSize"
        :value="pageSize"
        class="h-8 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        @change="onPageSizeChange"
      >
        <option v-for="n in pageSizeOptions" :key="n" :value="n">
          {{ n }} / halaman
        </option>
      </select>
      <nav>
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
  </div>
</template>
