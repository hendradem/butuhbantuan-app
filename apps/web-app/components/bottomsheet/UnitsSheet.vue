<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { emergencyLogoSrc, onEmergencyLogoError } from "~/utils/emergencyLogo";
import type { UnitChip } from "~/utils/savedUnits";

const sheet = useUnitsSheetStore();
const { items: savedItems } = useSavedUnits();
const { items: recentItems, clear: clearRecent } = useRecentUnits();
const { openUnit } = useOpenUnit();

const recentOnly = computed(() => {
  const savedIds = new Set(savedItems.value.map((u) => u.id));
  return recentItems.value.filter((u) => !savedIds.has(u.id));
});

const sections = computed(() => {
  const out: { key: string; title: string; items: UnitChip[]; clearable?: boolean }[] = [];
  if (savedItems.value.length) {
    out.push({ key: "saved", title: "Unit tersimpan", items: savedItems.value });
  }
  if (recentOnly.value.length) {
    out.push({
      key: "recent",
      title: "Baru dihubungi",
      items: recentOnly.value,
      clearable: true,
    });
  }
  return out;
});

watch(
  () => [sheet.isOpen, sections.value.length] as const,
  ([open, n]) => {
    if (open && n === 0) sheet.onClose();
  },
);

function pick(unit: UnitChip) {
  sheet.onClose();
  openUnit(unit);
}
</script>

<template>
  <CoreSheet
    :is-open="sheet.isOpen"
    :snap-points="[420, 0]"
    is-overlay
    scrollable
    @close="sheet.onClose()"
  >
    <template #header>
      <div class="ui-sheet-header px-4">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <div
            class="flex items-center justify-center w-8 h-8 shrink-0 ui-icon-well--danger"
            style="border-radius: 0.75rem"
          >
            <Icon icon="lucide:star" class="text-lg" />
          </div>
          <div class="min-w-0">
            <h1 class="ui-sheet-title">Unit kamu</h1>
            <p class="m-0 mt-0.5 text-[12px] ui-text-secondary truncate">
              Tersimpan dan baru dihubungi
            </p>
          </div>
        </div>
        <button type="button" class="ui-close-btn" @click="sheet.onClose()">
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>
    </template>

    <div class="px-4 pt-3 pb-5 space-y-4">
      <section v-for="sec in sections" :key="sec.key">
        <div class="flex items-center justify-between mb-2">
          <p class="m-0 text-[11px] font-semibold uppercase tracking-wide ui-text-secondary">
            {{ sec.title }}
          </p>
          <button
            v-if="sec.clearable"
            type="button"
            class="text-[11px] font-medium ui-text-secondary"
            @click="clearRecent"
          >
            Hapus
          </button>
        </div>
        <div class="space-y-2">
          <button
            v-for="u in sec.items"
            :key="`${sec.key}-${u.id}`"
            type="button"
            class="ui-card w-full flex items-center gap-3 px-3.5 py-3 text-left transition-opacity active:opacity-90"
            @click="pick(u)"
          >
            <div
              class="w-10 h-10 p-1.5 shrink-0 flex items-center justify-center"
              style="background: var(--bb-bg-muted); border-radius: 0.75rem"
            >
              <SkeletonImage
                v-if="u.logo"
                :src="emergencyLogoSrc({ organization_logo: u.logo })"
                :alt="u.name"
                wrapper-class="w-full h-full"
                img-class="w-full h-full object-contain"
                @error="onEmergencyLogoError($event, { organization_logo: u.logo })"
              />
              <Icon
                v-else
                :icon="u.typeIcon || 'lucide:building-2'"
                class="text-lg"
                style="color: var(--bb-text-secondary)"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="m-0 text-[13px] font-semibold ui-text-primary truncate">{{ u.name }}</p>
              <p class="m-0 mt-0.5 text-[11px] ui-text-secondary truncate">
                {{ u.typeName || "Unit" }}
              </p>
            </div>
            <Icon
              icon="lucide:chevron-right"
              class="text-base shrink-0"
              style="color: var(--bb-text-tertiary)"
            />
          </button>
        </div>
      </section>
    </div>
  </CoreSheet>
</template>
