<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { COMPLIANCE_TABS } from "@butuhbantuan/utils";
import {
  type ComplianceData,
  isAmbulanceType,
  verificationBadgeVariant,
  verificationLabel,
} from "~/utils/ambulanceCompliance";

const props = defineProps<{
  emergencyId: string;
  compliance?: ComplianceData | null;
  emergencyTypeName?: string;
}>();

const emit = defineEmits<{ saved: [] }>();

const activeTab = ref<(typeof COMPLIANCE_TABS)[number]["id"]>("alat");

const isAmbulance = computed(() => isAmbulanceType(props.emergencyTypeName));
const hasData = computed(() => !!props.compliance?.declared_category);
const pct = computed(() => props.compliance?.completeness_pct ?? 0);
const verification = computed(() => props.compliance?.verification);

const tabSections = computed(() => {
  const tab = COMPLIANCE_TABS.find((t) => t.id === activeTab.value);
  if (!tab || !props.compliance?.groups) return [];
  return props.compliance.groups.filter((g) => tab.groups.includes(g.code));
});

</script>

<template>
  <UiCard
    v-if="isAmbulance"
    padding="none"
    :title="hasData ? 'Kelengkapan Ambulans' : undefined"
    :description="hasData ? 'Pedoman Teknis Kemenkes 2019' : undefined"
  >
    <template v-if="hasData" #actions>
      <div class="text-right">
        <p class="text-lg font-bold text-neutral-900 leading-none tabular-nums">{{ pct }}%</p>
        <p class="text-[10px] text-neutral-400 mt-0.5">
          {{ compliance?.required_met }}/{{ compliance?.required_total }} wajib
        </p>
      </div>
    </template>

    <UiEmptyState
      v-if="!hasData"
      title="Belum ada data kelengkapan"
      description="Isi checklist di mode Edit untuk menampilkan kategori dan alat kesehatan."
    />

    <template v-else>
      <div class="px-5 pt-4 pb-2 space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <UiBadge variant="primary">{{ compliance?.category_label }}</UiBadge>
          <UiBadge :variant="verificationBadgeVariant(verification)">
            {{ verificationLabel(verification) }}
          </UiBadge>
        </div>
        <div
          v-if="verification?.is_verified && verification.verified_category_label"
          class="text-xs text-neutral-500"
        >
          Kategori terverifikasi: {{ verification.verified_category_label }}
        </div>
        <div class="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="pct >= 80 ? 'bg-emerald-500' : 'bg-amber-500'"
            :style="{ width: `${pct}%` }"
          />
        </div>
      </div>

      <div class="px-5 pb-4 border-b border-neutral-100">
        <AmbulanceComplianceVerify
          :emergency-id="emergencyId"
          :compliance="compliance"
          @saved="emit('saved')"
        />
      </div>

      <div class="px-5 pt-3">
        <div class="flex flex-wrap gap-1 border-b border-neutral-100 pb-2 mb-3">
          <button
            v-for="tab in COMPLIANCE_TABS"
            :key="tab.id"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            :class="
              activeTab === tab.id
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:bg-neutral-100'
            "
            @click="activeTab = tab.id"
          >
            <Icon :icon="tab.icon" class="text-sm" />
            {{ tab.label }}
          </button>
        </div>

        <div class="pb-5 space-y-4">
          <section v-for="group in tabSections" :key="group.code">
            <p class="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              {{ group.label }}
            </p>
            <ComplianceChecklistGrid :items="group.items" readonly />
          </section>

          <p class="m-0 text-[11px] text-neutral-400 leading-relaxed">
            {{ compliance?.disclaimer }}
          </p>
        </div>
      </div>
    </template>
  </UiCard>
</template>
