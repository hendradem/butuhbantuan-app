<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  PLACE_SLOTS,
  getSavedPlace,
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

const placeCount = computed(() => {
  void savedPlacesTick.value;
  return listSavedPlaces().length;
});

const slots = computed(() => {
  void savedPlacesTick.value;
  return PLACE_SLOTS.map((meta) => ({
    ...meta,
    place: getSavedPlace(meta.slot),
  }));
});

function toggle() {
  open.value = !open.value;
  try {
    localStorage.setItem(STORAGE_KEY, open.value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function onChip(place: SavedPlace | null, slot: SavedPlace["slot"] | "home" | "work") {
  if (place) {
    emit("go", place);
    return;
  }
  saveSheet.openSave(slot);
}
</script>

<template>
  <div class="flex items-center justify-end gap-2 w-full">
    <Transition name="dock">
      <div
        v-if="open"
        class="flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-none"
      >
        <button
          v-for="s in slots"
          :key="s.slot"
          type="button"
          class="shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-2 text-[12px] font-semibold"
          :class="s.place ? 'chip-on' : 'chip-off'"
          @click="onChip(s.place, s.slot)"
        >
          <Icon :icon="s.place ? s.icon : 'lucide:plus'" class="text-[14px]" />
          {{ s.label }}
        </button>
      </div>
    </Transition>

    <button
      type="button"
      class="dock-fab shrink-0 relative w-11 h-11 flex items-center justify-center transition-opacity active:opacity-85"
      :aria-expanded="open"
      :aria-label="open ? 'Tutup favorit' : 'Buka favorit'"
      @click="toggle"
    >
      <Icon :icon="open ? 'lucide:x' : 'lucide:bookmark'" class="text-[18px]" />
      <span
        v-if="!open && placeCount"
        class="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white"
        style="background: var(--bb-danger); border-radius: 9999px"
      >
        {{ placeCount }}
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

.dock-fab {
  background: var(--bb-bg-surface);
  border-radius: 9999px;
  border: 1px solid var(--bb-border);
  box-shadow: 0 4px 16px rgba(26, 28, 46, 0.12);
  color: var(--bb-text);
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
