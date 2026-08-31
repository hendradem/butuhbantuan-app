<script setup lang="ts">
import { Icon } from "@iconify/vue";

const SEEN_KEY = "bb-units-recent-seen";

const sheet = useUnitsSheetStore();
const { items: savedItems } = useSavedUnits();
const { items: recentItems } = useRecentUnits();

const seenAt = ref(0);

onMounted(() => {
  if (!import.meta.client) return;
  try {
    seenAt.value = Number(localStorage.getItem(SEEN_KEY) || 0) || 0;
  } catch {
    seenAt.value = 0;
  }
});

const hasItems = computed(
  () => savedItems.value.length + recentItems.value.length > 0,
);

const latestRecentAt = computed(() =>
  recentItems.value.reduce((max, u) => Math.max(max, u.contactedAt || 0), 0),
);

/** Pulse while there is unread contact history. */
const showNipple = computed(
  () => latestRecentAt.value > 0 && latestRecentAt.value > seenAt.value,
);

function markSeen() {
  seenAt.value = Date.now();
  try {
    localStorage.setItem(SEEN_KEY, String(seenAt.value));
  } catch {
    /* ignore */
  }
}

function openSheet() {
  markSeen();
  sheet.onOpen();
}

watch(hasItems, (ok) => {
  if (!ok) sheet.onClose();
});
</script>

<template>
  <button
    v-if="hasItems"
    type="button"
    class="bb-map-fab shrink-0 relative w-11 h-11 flex items-center justify-center transition-opacity active:opacity-85"
    :aria-label="showNipple ? 'Unit kamu — ada yang baru dihubungi' : 'Unit kamu'"
    @click="openSheet"
  >
    <Icon icon="lucide:star" class="text-[18px]" />
    <span v-if="showNipple" class="bb-nipple" aria-hidden="true">
      <span class="bb-nipple-ping" />
      <span class="bb-nipple-dot" />
    </span>
  </button>
</template>

<style scoped>
.bb-nipple {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 12px;
  height: 12px;
  pointer-events: none;
}

.bb-nipple-dot {
  position: absolute;
  inset: 3px;
  border-radius: 9999px;
  background: var(--bb-danger);
  box-shadow: 0 0 0 1.5px var(--bb-bg-surface);
}

.bb-nipple-ping {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: var(--bb-danger);
  animation: bb-nipple-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes bb-nipple-ping {
  0% {
    transform: scale(0.55);
    opacity: 0.75;
  }
  100% {
    transform: scale(2.15);
    opacity: 0;
  }
}
</style>
