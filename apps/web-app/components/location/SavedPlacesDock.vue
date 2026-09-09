<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  listSavedPlaces,
  savedPlacesTick,
  type SavedPlace,
} from "~/utils/savedPlaces";

const emit = defineEmits<{
  go: [place: SavedPlace];
}>();

const saveSheet = useSavePlaceSheetStore();

const STORAGE_KEY = "bb-saved-places-dock-v1";

const open = ref(false);

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "1") open.value = true;
    else if (raw === "0") open.value = false;
    else open.value = listSavedPlaces().length > 0;
  } catch {
    open.value = listSavedPlaces().length > 0;
  }
});

const places = computed(() => {
  void savedPlacesTick.value;
  return listSavedPlaces();
});

function toggle() {
  open.value = !open.value;
  try {
    localStorage.setItem(STORAGE_KEY, open.value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function addPlace() {
  saveSheet.openSave();
}

watch(
  places,
  (next, prev) => {
    if (!prev) return;
    if (next.length > prev.length) {
      open.value = true;
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  },
);
</script>

<template>
  <div class="flex items-center justify-end gap-2 w-full">
    <Transition name="dock">
      <div
        v-if="open"
        class="flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-none"
      >
        <button
          v-for="p in places"
          :key="p.id"
          type="button"
          class="chip-on shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-2 text-[12px] font-semibold"
          @click="emit('go', p)"
        >
          <Icon :icon="p.icon" class="text-[14px]" />
          {{ p.label }}
        </button>
        <button
          type="button"
          class="chip-off shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-2 text-[12px] font-semibold"
          @click="addPlace"
        >
          <Icon icon="lucide:plus" class="text-[14px]" />
          Simpan
        </button>
      </div>
    </Transition>

    <button
      type="button"
      class="bb-map-fab shrink-0 relative w-11 h-11 flex items-center justify-center transition-opacity active:opacity-85"
      :aria-expanded="open"
      :aria-label="open ? 'Tutup favorit' : 'Buka favorit'"
      @click="toggle"
    >
      <Icon :icon="open ? 'lucide:x' : 'lucide:bookmark'" class="text-[18px]" />
      <span
        v-if="!open && places.length"
        class="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white"
        style="background: var(--bb-danger); border-radius: 9999px"
      >
        {{ places.length }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  scrollbar-width: none;
}

.chip-on,
.chip-off {
  border-radius: 9999px;
  background: var(--bb-bg-surface);
  border: 1px solid var(--bb-border);
  box-shadow: 0 4px 14px rgba(26, 28, 46, 0.1);
  color: var(--bb-text);
}

.chip-off {
  color: var(--bb-text-secondary);
  border-style: dashed;
}

.dock-enter-active,
.dock-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dock-enter-from,
.dock-leave-to {
  opacity: 0;
  transform: translateX(8px);
}
</style>
