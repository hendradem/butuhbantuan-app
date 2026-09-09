<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { COMPLIANCE_TABS } from "@butuhbantuan/utils";

type ComplianceItem = {
  code: string;
  label: string;
  required: boolean;
  status: "ada" | "tidak" | "tidak_diketahui";
};

type ComplianceGroup = {
  code: string;
  label: string;
  items: ComplianceItem[];
};

type Compliance = {
  category_label: string;
  completeness_pct: number;
  required_total: number;
  required_met: number;
  groups: ComplianceGroup[];
  disclaimer: string;
  verification?: {
    status: string;
    is_verified: boolean;
    verified_category_label?: string;
    expires_at?: string;
  };
};

const props = defineProps<{
  compliance?: Compliance | null;
  emergencyTypeName?: string;
  /** Full-bleed di dalam list card — hanya border atas/bawah */
  embedded?: boolean;
}>();

const expanded = ref(false);
const activeTab = ref<(typeof COMPLIANCE_TABS)[number]["id"]>("alat");

const isAmbulance = computed(() => {
  const n = String(props.emergencyTypeName || "").toLowerCase();
  return n.includes("ambulance") || n.includes("ambulans");
});

const hasData = computed(() => !!props.compliance?.category_label);

const tabGroups = computed(() => {
  const tab = COMPLIANCE_TABS.find((t) => t.id === activeTab.value);
  if (!tab || !props.compliance?.groups) return [];
  return props.compliance.groups.filter((g) => tab.groups.includes(g.code));
});

function statusLabel(status: string) {
  if (status === "ada") return "Ada";
  if (status === "tidak") return "Tidak";
  return "Belum";
}

function statusClass(status: string) {
  if (status === "ada") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "tidak") return "bg-neutral-100 text-neutral-500 border-neutral-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}
</script>

<template>
  <section
    v-if="isAmbulance && hasData"
    class="ambulance-compliance-block"
    :class="{ 'ambulance-compliance-block--embedded': embedded }"
  >
    <button
      type="button"
      class="ambulance-compliance-block__header"
      @click="expanded = !expanded"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="m-0 text-[11px] font-semibold uppercase tracking-wide ui-text-secondary">
            Kelengkapan
          </p>
          <p class="m-0 mt-1 text-[13px] font-semibold ui-text-primary leading-snug">
            {{ compliance?.category_label }}
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="m-0 text-lg font-bold ui-text-primary leading-none tabular-nums">
            {{ compliance?.completeness_pct }}%
          </p>
          <p class="m-0 mt-0.5 text-[10px] ui-text-secondary">
            {{ compliance?.required_met }}/{{ compliance?.required_total }} wajib
          </p>
        </div>
      </div>

      <div class="mt-2.5 h-1.5 rounded-full overflow-hidden" style="background: var(--bb-bg-muted)">
        <div
          class="h-full rounded-full transition-all"
          :style="{
            width: `${compliance?.completeness_pct ?? 0}%`,
            background:
              (compliance?.completeness_pct ?? 0) >= 80
                ? 'var(--bb-success, #16a34a)'
                : 'var(--bb-warning, #d97706)',
          }"
        />
      </div>
    </button>

    <div v-if="expanded" class="ambulance-compliance-block__body">
      <div class="flex flex-wrap gap-1 mt-3 mb-2">
        <button
          v-for="tab in COMPLIANCE_TABS"
          :key="tab.id"
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
          :class="activeTab === tab.id ? 'bg-neutral-900 text-white' : 'ui-text-secondary'"
          :style="activeTab === tab.id ? {} : { background: 'var(--bb-bg-muted)' }"
          @click.stop="activeTab = tab.id"
        >
          <Icon :icon="tab.icon" class="text-xs" />
          {{ tab.label }}
        </button>
      </div>

      <div v-for="group in tabGroups" :key="group.code" class="mt-3 first:mt-0">
        <p class="m-0 mb-2 text-[10px] font-semibold uppercase tracking-wide ui-text-secondary">
          {{ group.label }}
        </p>
        <div class="grid grid-cols-2 gap-1.5">
          <div
            v-for="item in group.items"
            :key="item.code"
            class="flex items-start gap-1.5 rounded-lg px-2 py-1.5"
            style="background: var(--bb-bg-muted)"
          >
            <span
              class="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded border"
              :class="statusClass(item.status)"
            >
              {{ statusLabel(item.status) }}
            </span>
            <span class="text-[11px] ui-text-primary leading-snug line-clamp-2">
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>

      <p class="m-0 mt-3 text-[10px] ui-text-secondary leading-relaxed">
        {{ compliance?.disclaimer }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.ambulance-compliance-block {
  margin-top: 0.65rem;
  border-top: 1px solid var(--bb-border);
  border-bottom: 1px solid var(--bb-border);
  background: transparent;
}

.ambulance-compliance-block--embedded {
  margin-inline: calc(-1 * var(--compliance-flush-gutter, 1.4rem));
  width: calc(100% + 2 * var(--compliance-flush-gutter, 1.4rem));
}

.ambulance-compliance-block__header {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.65rem 0.9rem;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.ambulance-compliance-block__body {
  padding: 0 0.9rem 0.75rem;
  border-top: 1px solid var(--bb-border);
}
</style>
