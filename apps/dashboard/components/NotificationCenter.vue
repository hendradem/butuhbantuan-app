<script setup lang="ts">
import { Icon } from "@iconify/vue";

const {
  notifications,
  unreadCount,
  markRead,
  markAllRead,
  clearAll,
} = useOpsAlerts();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

function onClickOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}
onMounted(() => document.addEventListener("mousedown", onClickOutside));
onUnmounted(() => document.removeEventListener("mousedown", onClickOutside));

function kindIcon(kind: string) {
  if (kind === "sos") return "lucide:siren";
  if (kind === "order") return "lucide:clipboard-list";
  if (kind === "arrived") return "lucide:map-pin-check";
  return "lucide:bell";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function onItemClick(id: string) {
  markRead(id);
  open.value = false;
}
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="relative w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
      title="Notifikasi"
      @click="open = !open"
    >
      <Icon icon="lucide:bell" class="text-[18px]" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emergency-600 text-white text-[9px] font-bold flex items-center justify-center"
      >
        {{ unreadCount > 99 ? "99+" : unreadCount }}
      </span>
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-neutral-200 shadow-lg z-[60] overflow-hidden"
      >
        <div class="px-3 py-2.5 border-b border-neutral-100 flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-neutral-900">Notifikasi</p>
            <p class="text-[11px] text-neutral-400">
              {{ unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca" }}
            </p>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="unreadCount > 0"
              type="button"
              class="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50"
              @click="markAllRead"
            >
              Tandai dibaca
            </button>
            <button
              v-if="notifications.length"
              type="button"
              class="text-[11px] text-neutral-400 hover:text-neutral-600 px-2 py-1 rounded-lg hover:bg-neutral-50"
              @click="clearAll"
            >
              Hapus
            </button>
          </div>
        </div>

        <div class="max-h-80 overflow-y-auto">
          <div v-if="!notifications.length" class="px-4 py-8 text-center">
            <Icon icon="lucide:bell-off" class="text-neutral-300 text-2xl mx-auto mb-2" />
            <p class="text-xs text-neutral-400">Belum ada notifikasi</p>
          </div>

          <NuxtLink
            v-for="n in notifications"
            :key="n.id"
            :to="n.href"
            class="flex items-start gap-2.5 px-3 py-2.5 border-b border-neutral-50 hover:bg-neutral-50 transition-colors"
            :class="!n.read ? 'bg-emergency-50/40' : ''"
            @click="onItemClick(n.id)"
          >
            <div
              :class="[
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                n.kind === 'sos' ? 'bg-emergency-100 text-emergency-600' : 'bg-primary-50 text-primary-600',
              ]"
            >
              <Icon :icon="kindIcon(n.kind)" class="text-sm" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs font-semibold text-neutral-900 leading-snug">{{ n.title }}</p>
                <span v-if="!n.read" class="w-1.5 h-1.5 rounded-full bg-emergency-500 shrink-0 mt-1" />
              </div>
              <p class="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">{{ n.body }}</p>
              <p class="text-[10px] text-neutral-400 mt-1">{{ formatTime(n.createdAt) }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active, .dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
