<script setup lang="ts">
import { Icon } from "@iconify/vue";

export interface HospitalOption {
  id: string;
  name: string;
  class?: string;
  address?: string;
  phone?: string;
  ownership?: string;
}

const props = defineProps<{
  modelValue: string;
  options: HospitalOption[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [id: string];
}>();

const open = ref(false);
const query = ref("");
const inputRef = ref<HTMLInputElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

const selected = computed(() =>
  props.options.find((h) => h.id === props.modelValue) ?? null,
);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options.filter((h) => h.name.toLowerCase().includes(q));
});

function pick(h: HospitalOption | null) {
  emit("update:modelValue", h?.id ?? "");
  open.value = false;
  query.value = "";
}

function openDropdown() {
  open.value = true;
  nextTick(() => inputRef.value?.focus());
}

function onOutside(e: MouseEvent) {
  if (!containerRef.value?.contains(e.target as Node)) {
    open.value = false;
    query.value = "";
  }
}

onMounted(() => document.addEventListener("mousedown", onOutside));
onUnmounted(() => document.removeEventListener("mousedown", onOutside));

const CLASS_BADGE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700 border-emerald-200",
  B: "bg-blue-100 text-blue-700 border-blue-200",
  C: "bg-amber-100 text-amber-700 border-amber-200",
  D: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

function classBadgeClass(cls?: string) {
  return CLASS_BADGE[cls?.toUpperCase() ?? ""] ?? "bg-neutral-100 text-neutral-500 border-neutral-200";
}
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- Loading skeleton -->
    <div v-if="loading" class="h-9 soft-skel rounded-lg" />

    <template v-else>
      <!-- Selected card -->
      <div
        v-if="selected"
        class="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5"
      >
        <Icon icon="lucide:hospital" class="text-neutral-400 text-base shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-medium text-neutral-900 truncate">{{ selected.name }}</p>
            <span
              v-if="selected.class"
              :class="['text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0', classBadgeClass(selected.class)]"
            >
              Kelas {{ selected.class }}
            </span>
          </div>
          <p v-if="selected.address" class="text-xs text-neutral-500 mt-0.5 line-clamp-1">
            {{ selected.address }}
          </p>
          <p v-if="selected.phone" class="text-xs text-neutral-400 mt-0.5">
            {{ selected.phone }}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
          title="Hapus pilihan"
          @click="pick(null)"
        >
          <Icon icon="lucide:x" class="text-xs" />
        </button>
      </div>

      <!-- Trigger button (nothing selected) -->
      <button
        v-else
        type="button"
        class="w-full flex items-center gap-2 h-9 px-3 rounded-lg border border-neutral-200 bg-white text-sm hover:border-neutral-300 transition-colors"
        @click="openDropdown"
      >
        <Icon icon="lucide:search" class="text-neutral-400 text-sm shrink-0" />
        <span class="flex-1 text-left text-neutral-400">Pilih rumah sakit rujukan…</span>
        <Icon icon="lucide:chevron-down" class="text-neutral-300 text-sm shrink-0" />
      </button>

      <!-- Dropdown -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95 origin-top"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95 origin-top"
      >
        <div
          v-if="open"
          class="absolute z-50 mt-1.5 w-full rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden"
        >
          <!-- Search -->
          <div class="flex items-center gap-2 px-3 py-2 border-b border-neutral-100">
            <Icon icon="lucide:search" class="text-neutral-400 text-sm shrink-0" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              placeholder="Cari nama rumah sakit…"
              class="flex-1 text-sm text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none"
            />
            <button
              v-if="query"
              type="button"
              class="text-neutral-400 hover:text-neutral-600 transition-colors"
              @click="query = ''"
            >
              <Icon icon="lucide:x" class="text-xs" />
            </button>
          </div>

          <!-- Options list -->
          <ul class="max-h-64 overflow-y-auto">
            <li>
              <button
                type="button"
                class="w-full text-left px-3.5 py-2.5 text-sm text-neutral-400 hover:bg-neutral-50 transition-colors border-b border-neutral-50"
                @click="pick(null)"
              >
                — Tidak dirujuk —
              </button>
            </li>
            <li
              v-if="!filtered.length"
              class="px-3.5 py-5 text-center text-sm text-neutral-400"
            >
              Tidak ada rumah sakit yang cocok
            </li>
            <li
              v-for="h in filtered"
              :key="h.id"
              class="border-t border-neutral-50 first:border-t-0"
            >
              <button
                type="button"
                class="w-full text-left px-3.5 py-2.5 hover:bg-neutral-50 transition-colors"
                @click="pick(h)"
              >
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-neutral-900 flex-1 truncate">{{ h.name }}</span>
                  <span
                    v-if="h.class"
                    :class="['text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0', classBadgeClass(h.class)]"
                  >
                    Kelas {{ h.class }}
                  </span>
                </div>
                <p v-if="h.address" class="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                  {{ h.address }}
                </p>
              </button>
            </li>
          </ul>
        </div>
      </Transition>

      <!-- Empty state hint -->
      <p
        v-if="!options.length && !loading"
        class="mt-1.5 text-xs text-neutral-400"
      >
        Belum ada data RS — sync dulu di halaman Rumah Sakit.
      </p>
    </template>
  </div>
</template>
