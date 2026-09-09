<script setup lang="ts">
import { Icon } from "@iconify/vue";

/**
 * Offline / stale-cache banner for citizen home.
 */
const { online, fromCache, hotlines } = useOfflineCache();
const searchSheet = useSearchSheetStore();

const hl = computed(() => hotlines());
const visible = computed(() => !online.value || fromCache.value);
</script>

<template>
  <Transition name="slide">
    <div
      v-if="visible"
      class="absolute top-0 inset-x-0 z-[120] px-3 pt-3 pointer-events-none"
    >
      <div
        class="pointer-events-auto px-3.5 py-3 flex gap-3 items-start"
        :class="
          !online
            ? 'bg-amber-50 text-amber-950'
            : 'bg-sky-50 text-sky-950'
        "
        :style="{
          borderRadius: 'var(--bb-radius-card)',
          border: !online ? '1px solid #fde68a' : '1px solid #bae6fd',
          boxShadow: 'var(--bb-shadow-soft)',
        }"
      >
        <Icon
          :icon="!online ? 'lucide:wifi-off' : 'lucide:database'"
          class="text-base shrink-0 mt-0.5"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold leading-snug">
            {{ !online ? "Mode offline" : "Menampilkan data tersimpan" }}
          </p>
          <p class="text-xs mt-0.5 leading-relaxed opacity-90">
            <template v-if="!online">
              Jaringan terputus. Gunakan hotline nasional di bawah, atau ubah lokasi saat online lagi.
            </template>
            <template v-else>
              Koneksi bermasalah — daftar layanan dari cache terakhir. Perbarui lokasi saat jaringan stabil.
            </template>
          </p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <a
              :href="`tel:${hl.psc}`"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/80 border border-black/10"
            >
              <Icon icon="lucide:phone" class="text-[12px]" />
              {{ hl.label }}
            </a>
            <a
              v-for="x in hl.extras || []"
              :key="x.tel"
              :href="`tel:${x.tel}`"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/60 border border-black/5"
            >
              {{ x.label }} {{ x.tel }}
            </a>
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/60 border border-black/5"
              @click="searchSheet.onOpen()"
            >
              <Icon icon="lucide:map-pin" class="text-[12px]" />
              Ubah lokasi
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
