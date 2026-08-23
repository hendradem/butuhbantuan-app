<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  NEED_HELP_SITUATIONS,
  matchEmergencyType,
  type NeedHelpSituation,
} from "~/utils/needHelp";

const needHelp = useNeedHelpSheetStore();
const exploreSheet = useExploreSheetStore();
const emergencyStore = useEmergencyStore();
const sosStore = useSosStore();
const { hotlines } = useOfflineCache();
const { fetchEmergencyTypes } = useEmergencyApi();

const step = ref<"pick" | "result">("pick");
const selected = ref<NeedHelpSituation | null>(null);

const { data: typesData } = useAsyncData("need-help-types", fetchEmergencyTypes);
const emergencyTypes = computed(() => typesData.value?.data ?? []);

const matchedType = computed(() => {
  if (!selected.value) return null;
  return matchEmergencyType(selected.value, emergencyTypes.value);
});

const nearbyCount = computed(() => {
  const name = matchedType.value?.name;
  if (!name) return 0;
  return emergencyStore.filteredEmergency.filter(
    (item: any) => item.emergencyData?.emergency_type?.name === name,
  ).length;
});

const hl = computed(() => hotlines());

watch(
  () => needHelp.isOpen,
  (open) => {
    if (open) {
      step.value = "pick";
      selected.value = null;
    }
  },
);

function pick(s: NeedHelpSituation) {
  selected.value = s;
  step.value = "result";
}

function back() {
  step.value = "pick";
  selected.value = null;
}

function openUnits() {
  const t = matchedType.value;
  if (!t) return;
  const filtered = emergencyStore.filteredEmergency.filter(
    (item: any) => item.emergencyData?.emergency_type?.name === t.name,
  );
  needHelp.onClose();
  exploreSheet.setSheetData({ emergencyType: t, emergency: filtered });
  exploreSheet.onOpen();
}

function openSos() {
  needHelp.onClose();
  sosStore.open();
}

function close() {
  needHelp.onClose();
}
</script>

<template>
  <CoreSheet
    :is-open="needHelp.isOpen"
    :snap-points="[0.72, 0]"
    is-overlay
    scrollable
    @close="close"
  >
    <template #header>
      <div class="ui-sheet-header px-4">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <button
            v-if="step === 'result'"
            type="button"
            class="ui-close-btn"
            style="width: 2.25rem; height: 2.25rem"
            aria-label="Kembali"
            @click="back"
          >
            <Icon icon="lucide:arrow-left" class="text-base" />
          </button>
          <div class="min-w-0">
            <h1 class="ui-sheet-title">
              {{ step === "pick" ? "Saya butuh apa?" : selected?.title }}
            </h1>
            <p v-if="step === 'pick'" class="m-0 mt-0.5 text-[12px] ui-text-secondary truncate">
              Pilih situasi — kami arahkan ke layanan yang tepat
            </p>
          </div>
        </div>
        <button type="button" class="ui-close-btn" @click="close">
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>
    </template>

    <!-- Step 1: situations -->
    <div v-if="step === 'pick'" class="px-3 pb-6 pt-2">
      <div class="grid grid-cols-2 gap-2.5">
        <button
          v-for="s in NEED_HELP_SITUATIONS"
          :key="s.id"
          type="button"
          class="ui-card text-left p-3.5 transition-transform active:scale-[0.98]"
          @click="pick(s)"
        >
          <div
            class="w-9 h-9 flex items-center justify-center mb-2.5 ui-icon-well--danger"
            style="border-radius: 0.75rem"
          >
            <Icon :icon="s.icon" class="text-lg" />
          </div>
          <p class="m-0 text-[13px] font-semibold ui-text-primary leading-snug">
            {{ s.title }}
          </p>
          <p class="m-0 mt-1 text-[11px] ui-text-secondary leading-snug line-clamp-2">
            {{ s.subtitle }}
          </p>
        </button>
      </div>
    </div>

    <!-- Step 2: recommendation -->
    <div v-else-if="selected" class="px-4 pb-6 pt-2 space-y-3">
      <div class="ui-card p-4">
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 flex items-center justify-center shrink-0 ui-icon-well--danger"
            style="border-radius: 0.85rem"
          >
            <Icon :icon="selected.icon" class="text-xl" />
          </div>
          <div class="min-w-0">
            <p class="m-0 text-sm font-semibold ui-text-primary">Rekomendasi</p>
            <p class="m-0 mt-1 text-[13px] ui-text-secondary leading-relaxed">
              {{ selected.tip }}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <div class="ui-card p-3">
          <p class="m-0 text-[10px] font-semibold uppercase tracking-wide ui-text-secondary">
            Layanan
          </p>
          <p class="m-0 mt-1 text-[13px] font-semibold ui-text-primary truncate">
            {{ matchedType?.name || (selected.preferSos ? "SOS darurat" : "Unit terdekat") }}
          </p>
          <p v-if="matchedType" class="m-0 mt-0.5 text-[11px] ui-text-secondary">
            {{ nearbyCount }} unit di sekitar
          </p>
        </div>
        <div class="ui-card p-3">
          <p class="m-0 text-[10px] font-semibold uppercase tracking-wide ui-text-secondary">
            Hotline
          </p>
          <p class="m-0 mt-1 text-[13px] font-semibold ui-text-primary truncate">
            {{ selected.hotlineLabel || hl.label }}
          </p>
          <a
            :href="`tel:${selected.hotlineTel || hl.psc}`"
            class="m-0 mt-0.5 text-[11px] font-medium inline-block"
            style="color: var(--bb-danger)"
          >
            {{ selected.hotlineTel || hl.psc }}
          </a>
        </div>
      </div>

      <div class="space-y-2 pt-1">
        <button
          v-if="matchedType"
          type="button"
          class="ui-btn-primary"
          @click="openUnits"
        >
          <Icon icon="lucide:map-pin" class="text-base" />
          Lihat unit {{ matchedType.name }}
        </button>
        <button
          v-if="selected.preferSos || !matchedType"
          type="button"
          class="ui-btn-primary"
          style="background: var(--bb-danger)"
          @click="openSos"
        >
          <Icon icon="lucide:siren" class="text-base" />
          Kirim SOS
        </button>
        <a
          :href="`tel:${selected.hotlineTel || hl.psc}`"
          class="btn-call text-sm !mb-0 w-full"
        >
          <Icon icon="lucide:phone" class="w-4 h-4 mr-1.5" />
          Telepon {{ selected.hotlineLabel || hl.label }}
        </a>
      </div>
    </div>
  </CoreSheet>
</template>
