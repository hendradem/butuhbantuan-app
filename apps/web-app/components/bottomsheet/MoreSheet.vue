<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { getColorMode, setColorMode, type ColorMode } from "~/utils/colorMode";
import { recordServiceDemand } from "~/utils/serviceDemand";

const moreSheet = useMoreSheetStore();
const exploreSheet = useExploreSheetStore();
const emergencyStore = useEmergencyStore();
const colorMode = ref<ColorMode>("light");

onMounted(() => {
  colorMode.value = getColorMode();
});

function onColorModeChange(mode: ColorMode) {
  colorMode.value = mode;
  setColorMode(mode);
  if (import.meta.client) {
    window.dispatchEvent(
      new CustomEvent("bb-color-mode", { detail: { mode } }),
    );
  }
}

function selectOverflowService(service: any) {
  if (service?.name) recordServiceDemand(String(service.name));
  moreSheet.onClose();
  const filtered = emergencyStore.filteredEmergency.filter(
    (item: any) => item.emergencyData?.emergency_type?.name === service.name,
  );
  exploreSheet.setSheetData({ emergencyType: service, emergency: filtered });
  exploreSheet.onOpen();
}

const router = useRouter();

/** Both live on the public site, so there is one version of each to maintain. */
const links = [
  {
    to: "/tentang",
    title: "Tentang kami",
    desc: "Visi, misi, dan cara kerja ButuhBantuan",
    icon: "lucide:info",
  },
  {
    to: "/support",
    title: "Dukung kami",
    desc: "Sponsor, donasi, dan bergabung sebagai mitra",
    icon: "lucide:heart",
  },
];

function go(to: string) {
  moreSheet.onClose();
  router.push(to);
}

const sheetSnap = computed(() => {
  const extra = moreSheet.overflowServices.length * 64;
  return [Math.min(620, 470 + extra), 0];
});
</script>

<template>
  <!-- Menu Lainnya -->
  <CoreSheet
    :is-open="moreSheet.isOpen"
    :snap-points="sheetSnap"
    is-overlay
    scrollable
    @close="moreSheet.onClose()"
  >
    <template #header>
      <div class="ui-sheet-header px-4">
        <h1 class="ui-sheet-title">Lainnya</h1>
        <button type="button" class="ui-close-btn" @click="moreSheet.onClose()">
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>
    </template>

    <div class="px-3 py-3 space-y-2">
      <template v-if="moreSheet.overflowServices.length">
        <p class="m-0 px-0.5 text-[11px] font-semibold uppercase tracking-wide ui-text-secondary">
          Layanan
        </p>
        <button
          v-for="service in moreSheet.overflowServices"
          :key="service.id ?? service.name"
          type="button"
          class="ui-card w-full flex items-center gap-3 px-3.5 py-3 text-left transition-opacity active:opacity-90"
          @click="selectOverflowService(service)"
        >
          <div
            class="w-10 h-10 shrink-0 ui-icon-well--danger flex items-center justify-center"
            style="border-radius: var(--bb-radius-pill)"
          >
            <Icon :icon="(service.icon as string) || 'lucide:shield'" class="text-lg" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold ui-text-primary">{{ service.name }}</p>
            <p
              v-if="service.description"
              class="text-xs ui-text-secondary mt-0.5 leading-snug line-clamp-1"
            >
              {{ service.description }}
            </p>
          </div>
          <Icon icon="lucide:chevron-right" class="shrink-0" style="color: var(--bb-text-tertiary)" />
        </button>
        <div class="h-1" />
      </template>

      <div
        class="ui-card w-full flex items-center gap-3 px-3.5 py-3.5"
      >
        <div
          class="w-10 h-10 shrink-0 ui-icon-well flex items-center justify-center"
          style="border-radius: var(--bb-radius-pill)"
        >
          <Icon
            :icon="colorMode === 'dark' ? 'lucide:moon' : 'lucide:sun'"
            class="text-lg"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold ui-text-primary">Tampilan</p>
          <p class="text-xs ui-text-secondary mt-0.5 leading-snug">
            {{ colorMode === "dark" ? "Mode gelap" : "Mode terang" }}
          </p>
        </div>
        <div
          class="inline-flex p-0.5 shrink-0"
          style="
            background: var(--bb-bg-muted);
            border-radius: var(--bb-radius-pill);
            border: 1px solid var(--bb-border);
          "
          role="group"
          aria-label="Mode tampilan"
        >
          <button
            type="button"
            class="px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
            :style="
              colorMode === 'light'
                ? {
                    background: 'var(--bb-bg-surface)',
                    color: 'var(--bb-text)',
                    borderRadius: '9999px',
                    boxShadow: 'var(--bb-shadow-xs)',
                  }
                : { color: 'var(--bb-text-secondary)', borderRadius: '9999px' }
            "
            @click="onColorModeChange('light')"
          >
            Terang
          </button>
          <button
            type="button"
            class="px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
            :style="
              colorMode === 'dark'
                ? {
                    background: 'var(--bb-bg-surface)',
                    color: 'var(--bb-text)',
                    borderRadius: '9999px',
                    boxShadow: 'var(--bb-shadow-xs)',
                  }
                : { color: 'var(--bb-text-secondary)', borderRadius: '9999px' }
            "
            @click="onColorModeChange('dark')"
          >
            Gelap
          </button>
        </div>
      </div>

      <button
        type="button"
        class="ui-card w-full flex items-center gap-3 px-3.5 py-3.5 text-left transition-opacity active:opacity-90"
        @click="go('/my-tickets')"
      >
        <div class="w-10 h-10 shrink-0 ui-icon-well flex items-center justify-center" style="border-radius: var(--bb-radius-pill)">
          <Icon icon="lucide:ticket" class="text-lg" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold ui-text-primary">Tiket saya</p>
          <p class="text-xs ui-text-secondary mt-0.5 leading-snug">Cek tiket via HP atau paste link WhatsApp</p>
        </div>
        <Icon icon="lucide:chevron-right" class="shrink-0" style="color: var(--bb-text-tertiary)" />
      </button>

      <button
        v-for="item in links"
        :key="item.to"
        type="button"
        class="ui-card w-full flex items-center gap-3 px-3.5 py-3.5 text-left transition-opacity active:opacity-90"
        @click="go(item.to)"
      >
        <div class="w-10 h-10 shrink-0 ui-icon-well--danger flex items-center justify-center" style="border-radius: var(--bb-radius-pill)">
          <Icon :icon="item.icon" class="text-lg" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold ui-text-primary">{{ item.title }}</p>
          <p class="text-xs ui-text-secondary mt-0.5 leading-snug">{{ item.desc }}</p>
        </div>
        <Icon icon="lucide:chevron-right" class="shrink-0" style="color: var(--bb-text-tertiary)" />
      </button>

      <SponsorStrip class="px-0.5 pt-3" />

      <p class="text-center text-[11px] ui-text-secondary pt-2 pb-1">
        ButuhBantuan · bantuan darurat lebih dekat
      </p>
    </div>
  </CoreSheet>
</template>
