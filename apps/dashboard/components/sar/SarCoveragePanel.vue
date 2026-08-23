<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  COVERAGE_GAP_PCT,
  COVERAGE_PATTERNS,
  COVERAGE_SPACINGS_M,
  formatCoveragePct,
  isCoverageGap,
  type CoverageConfig,
  type SectorCoverage,
} from "~/utils/sarCoverage";

const props = defineProps<{
  coverage: CoverageConfig;
  sectorStats: SectorCoverage[];
  /** SRUs with roster size for people override (open-grid). */
  sruPeople: Array<{ sru: string; short: string; roster: number; color: string }>;
}>();

const emit = defineEmits<{
  setPeople: [sru: string, value: number | null];
}>();

const sortedStats = computed(() =>
  [...props.sectorStats].sort((a, b) => {
    const ga = isCoverageGap(a.pct, a.samples) ? 0 : 1;
    const gb = isCoverageGap(b.pct, b.samples) ? 0 : 1;
    if (ga !== gb) return ga - gb;
    return a.pct - b.pct || a.code.localeCompare(b.code);
  }),
);

const gapCount = computed(
  () => props.sectorStats.filter((s) => isCoverageGap(s.pct, s.samples)).length,
);

function onPeopleInput(sru: string, raw: string) {
  const t = raw.trim();
  if (!t) {
    emit("setPeople", sru, null);
    return;
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return;
  emit("setPeople", sru, n);
}

function peopleDisplay(sru: string): string {
  const v = props.coverage.peopleBySru[sru];
  return v != null ? String(v) : "";
}
</script>

<template>
  <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
    <div class="px-3 py-2.5 flex items-center justify-between gap-2 border-b border-neutral-100">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          Coverage
        </p>
        <p class="text-xs text-neutral-500 mt-0.5 leading-snug">
          Estimasi area tersisir dari jejak (bukan bukti visual).
        </p>
      </div>
      <label class="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 shrink-0 cursor-pointer">
        <input v-model="coverage.enabled" type="checkbox" class="rounded border-neutral-300">
        On
      </label>
    </div>

    <div v-if="coverage.enabled" class="p-3 space-y-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">Pola</p>
        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="p in COVERAGE_PATTERNS"
            :key="p.id"
            type="button"
            class="rounded-lg border px-2 py-2 text-left transition-colors"
            :class="coverage.pattern === p.id
              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400'
              : 'border-neutral-200 bg-white hover:bg-neutral-50'"
            :title="p.hint"
            @click="coverage.pattern = p.id"
          >
            <p class="text-xs font-semibold text-neutral-900">{{ p.short }}</p>
            <p class="text-[10px] text-neutral-500 mt-0.5 leading-snug">{{ p.hint }}</p>
          </button>
        </div>
      </div>

      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">
          Spacing
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="s in COVERAGE_SPACINGS_M"
            :key="s"
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums"
            :class="coverage.spacingM === s
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-400'
              : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'"
            @click="coverage.spacingM = s"
          >
            {{ s }} m
          </button>
        </div>
      </div>

      <div v-if="coverage.pattern === 'open_grid' && sruPeople.length">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">
          Orang / SRU
        </p>
        <p class="text-[10px] text-neutral-400 mb-1.5 leading-snug">
          Override lebar open-grid. Kosong = ukuran roster.
        </p>
        <ul class="rounded-lg border border-neutral-100 divide-y divide-neutral-100 overflow-hidden">
          <li
            v-for="row in sruPeople"
            :key="row.sru"
            class="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-50/80"
          >
            <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: row.color }" />
            <span class="text-xs font-semibold text-neutral-800 truncate flex-1">{{ row.short }}</span>
            <span class="text-[10px] text-neutral-400 tabular-nums shrink-0">roster {{ row.roster }}</span>
            <input
              type="number"
              min="1"
              max="40"
              step="1"
              class="w-12 rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-xs font-semibold tabular-nums text-center text-neutral-900"
              :placeholder="String(Math.max(1, row.roster))"
              :value="peopleDisplay(row.sru)"
              @change="onPeopleInput(row.sru, ($event.target as HTMLInputElement).value)"
            >
          </li>
        </ul>
      </div>

      <div v-if="sortedStats.length" class="rounded-lg border border-neutral-100 bg-neutral-50 px-2.5 py-2">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Karvak
          </p>
          <p v-if="gapCount" class="text-[10px] font-semibold text-amber-700">
            {{ gapCount }} gap &lt;{{ COVERAGE_GAP_PCT }}%
          </p>
        </div>
        <ul class="space-y-1 max-h-40 overflow-y-auto">
          <li
            v-for="s in sortedStats"
            :key="s.id"
            class="flex items-center justify-between gap-2 text-xs rounded-md px-1.5 py-1"
            :class="isCoverageGap(s.pct, s.samples) ? 'bg-amber-50 ring-1 ring-amber-200' : ''"
          >
            <span class="font-medium text-neutral-800 truncate flex items-center gap-1">
              <span
                v-if="isCoverageGap(s.pct, s.samples)"
                class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                title="Coverage gap"
              />
              {{ s.code }}
            </span>
            <span
              class="tabular-nums font-semibold"
              :class="s.pct >= 70 ? 'text-emerald-700' : s.pct >= COVERAGE_GAP_PCT ? 'text-amber-700' : 'text-amber-800'"
            >
              {{ formatCoveragePct(s.pct) }}
            </span>
          </li>
        </ul>
      </div>
      <p v-else class="text-[11px] text-neutral-400 flex items-start gap-1.5">
        <Icon icon="lucide:info" class="text-sm shrink-0 mt-0.5" />
        Butuh jejak SRU di peta untuk menghitung %.
      </p>
    </div>
  </div>
</template>
