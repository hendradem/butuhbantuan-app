<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { emergencyLogoSrc, onEmergencyLogoError } from "~/utils/emergencyLogo";
import { partnerTierBadgeClass, partnerTierLabel, partnerTierOf } from "~/utils/partnerTier";
import { SOFT_LABEL } from "~/utils/softLabel";

definePageMeta({ layout: false });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;

const uuid = computed(() => {
  try {
    return decodeURIComponent(String(route.params.id || "")).trim();
  } catch {
    return String(route.params.id || "").trim();
  }
});
const period = computed(() => {
  const n = Number(route.query.period);
  return n === 7 || n === 90 ? n : 30;
});

type DailyStat = { date: string; count: number };
type HourStat = { hour: number; count: number };

type PublicUnitStats = {
  unit: {
    id: string;
    name: string;
    organization_name: string;
    organization_logo?: string;
    emergency_type: string;
    regency: string;
    province: string;
    partner_tier: string;
    is_active: boolean;
    is_24_hours: boolean;
  };
  period_days: number;
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    pending: number;
    in_progress: number;
    completion_rate: number;
    cancellation_rate: number;
    avg_response_sec: number;
    avg_arrival_sec: number;
    show_rates: boolean;
  };
  feedback: {
    total: number;
    helpful_rate: number;
    show_rate: boolean;
    recent_quotes?: string[];
  };
  daily_trend?: DailyStat[];
  by_hour?: HourStat[];
  peak_hour?: HourStat | null;
  referrals?: { hospital_id: string; hospital_name: string; count: number }[];
  generated_at: string;
};

const { data, pending, error, refresh } = await useAsyncData(
  `public-unit-stats-${uuid.value}-${period.value}`,
  async () => {
    if (!uuid.value) return null;
    try {
      const res = await $fetch<{ data: PublicUnitStats }>(
        `${apiBase}/api/v1/public/units/${encodeURIComponent(uuid.value)}/stats`,
        { query: { period: period.value } },
      );
      return res?.data ?? null;
    } catch {
      return null;
    }
  },
  { watch: [uuid, period] },
);

const unit = computed(() => data.value?.unit ?? null);
const orders = computed(() => data.value?.orders);
const feedback = computed(() => data.value?.feedback);
const trend = computed(() => data.value?.daily_trend ?? []);
const peakHour = computed(() => data.value?.peak_hour ?? null);

const tier = computed(() => partnerTierOf(unit.value));
const placeLabel = computed(() => {
  const parts = [unit.value?.regency, unit.value?.province].filter(Boolean);
  return parts.join(", ");
});

const logoSrc = computed(() =>
  emergencyLogoSrc({
    organization_logo: unit.value?.organization_logo,
    emergency_type: { name: unit.value?.emergency_type },
  }),
);

function formatDuration(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "—";
  const m = Math.round(sec / 60);
  if (m < 60) return `±${m} mnt`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `±${h} jam ${rem} mnt` : `±${h} jam`;
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function setPeriod(days: 7 | 30 | 90) {
  return navigateTo({
    path: route.path,
    query: days === 30 ? {} : { period: String(days) },
  });
}

async function shareOrCopy() {
  const url = import.meta.client ? window.location.href : "";
  if (!url) return;
  if (navigator.share) {
    try {
      await navigator.share({
        title: unit.value?.name || "Statistik unit",
        text: `Performa ${unit.value?.name || "unit"} di ButuhBantuan`,
        url,
      });
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    /* ignore */
  }
}

const statusParts = computed(() => {
  const o = orders.value;
  if (!o) return [];
  const parts = [
    { key: "completed", label: "Selesai", count: o.completed, color: "#16a34a" },
    { key: "progress", label: "Berjalan", count: o.in_progress, color: "#2563eb" },
    { key: "pending", label: "Menunggu", count: o.pending, color: "#d97706" },
    { key: "cancelled", label: "Batal", count: o.cancelled, color: "#e11d48" },
  ].filter((p) => p.count > 0);
  const total = parts.reduce((s, p) => s + p.count, 0) || 1;
  return parts.map((p) => ({ ...p, pct: Math.round((p.count * 100) / total) }));
});

const trendBars = computed(() => {
  const rows = trend.value;
  if (!rows.length) return [];
  const max = Math.max(...rows.map((r) => r.count), 1);
  return rows.map((r) => {
    const d = String(r.date || "");
    const label = d.length >= 10 ? d.slice(5) : d; // MM-DD
    return {
      label,
      count: r.count,
      h: Math.max(4, Math.round((r.count / max) * 100)),
    };
  });
});

const kpiCards = computed(() => {
  const o = orders.value;
  const f = feedback.value;
  return [
    {
      label: "Total tiket",
      value: String(o?.total ?? 0),
      hint: `${o?.completed ?? 0} selesai · ${o?.cancelled ?? 0} batal`,
      icon: "lucide:ticket",
      tone: "neutral",
    },
    {
      label: "Completion",
      value: o?.show_rates ? `${o.completion_rate}%` : "—",
      hint: o?.show_rates ? "Selesai vs dibatalkan" : "Min. 5 tiket",
      icon: "lucide:check-circle-2",
      tone: o?.show_rates && (o.completion_rate ?? 0) >= 70 ? "good" : "warn",
    },
    {
      label: "Avg respon",
      value: o?.show_rates ? formatDuration(o.avg_response_sec) : "—",
      hint: "Masuk → diterima",
      icon: "lucide:timer",
      tone: "info",
    },
    {
      label: "Avg tiba",
      value: o?.show_rates ? formatDuration(o.avg_arrival_sec) : "—",
      hint: "Diterima → lokasi",
      icon: "lucide:map-pin",
      tone: "info",
    },
    {
      label: "Terbantu",
      value: f?.show_rate ? `${f.helpful_rate}%` : "—",
      hint: `${f?.total ?? 0} feedback warga`,
      icon: "lucide:heart-handshake",
      tone: "rose",
    },
  ];
});

useHead({
  title: computed(() =>
    unit.value?.name ? `${unit.value.name} · Statistik` : "Statistik Unit",
  ),
});
</script>

<template>
  <div class="min-h-[100dvh] pub-stats" style="background: var(--bb-bg-page); color: var(--bb-text)">
    <header
      class="sticky top-0 z-20 border-b backdrop-blur-md"
      style="background: color-mix(in srgb, var(--bb-bg-surface) 88%, transparent); border-color: var(--bb-border)"
    >
      <div class="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between gap-3">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 text-sm font-medium"
          style="color: var(--bb-text-secondary)"
        >
          <Icon icon="lucide:arrow-left" class="text-base" />
          Beranda
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold"
          style="background: var(--bb-bg-muted); color: var(--bb-text)"
          @click="shareOrCopy"
        >
          <Icon icon="lucide:share" class="text-sm" />
          Bagikan
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-2xl px-4 py-6 space-y-4 pb-16">
      <template v-if="pending && !data">
        <div class="rounded-2xl p-5 space-y-4 pub-card">
          <div class="flex gap-3">
            <div class="w-14 h-14 rounded-2xl soft-skel" />
            <div class="flex-1 space-y-2 pt-1">
              <div class="h-4 w-2/3 soft-skel rounded" />
              <div class="h-3 w-1/2 soft-skel rounded" />
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div v-for="i in 5" :key="i" class="h-24 rounded-xl soft-skel" />
          </div>
          <div class="h-40 rounded-xl soft-skel" />
        </div>
      </template>

      <div v-else-if="error || !unit" class="rounded-2xl p-8 text-center space-y-3 pub-card">
        <div class="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center" style="background: var(--bb-bg-muted)">
          <Icon icon="lucide:building-2" class="text-xl" style="color: var(--bb-text-tertiary)" />
        </div>
        <p class="text-base font-semibold">Unit tidak ditemukan</p>
        <p class="text-sm" style="color: var(--bb-text-secondary)">
          Link statistik mungkin salah atau unit tidak ada di direktori.
        </p>
        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold"
          style="background: var(--bb-accent); color: var(--bb-accent-contrast)"
        >
          Kembali ke beranda
        </NuxtLink>
      </div>

      <template v-else>
        <!-- Hero -->
        <section class="rounded-2xl p-5 pub-card">
          <div class="flex items-start gap-3.5">
            <div
              class="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center"
              style="background: var(--bb-bg-muted); border: 1px solid var(--bb-border)"
            >
              <img
                :src="logoSrc"
                :alt="unit.name"
                class="w-full h-full object-contain p-1.5"
                @error="onEmergencyLogoError($event, { emergency_type: { name: unit.emergency_type } })"
              >
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <span :class="[SOFT_LABEL, partnerTierBadgeClass(tier)]">
                  {{ partnerTierLabel(tier) }}
                </span>
                <span
                  class="ui-status-pill"
                  :class="unit.is_active ? 'ui-status-pill--good' : 'ui-status-pill--muted'"
                >
                  {{ unit.is_active ? "Aktif" : "Nonaktif" }}
                </span>
                <span v-if="unit.is_24_hours" class="ui-status-pill ui-status-pill--info">24 jam</span>
              </div>
              <h1 class="text-xl font-bold tracking-tight leading-snug">
                {{ unit.name }}
              </h1>
              <p class="mt-0.5 text-sm" style="color: var(--bb-text-secondary)">
                {{ unit.organization_name || unit.emergency_type || "Unit layanan darurat" }}
                <template v-if="placeLabel"> · {{ placeLabel }}</template>
              </p>
            </div>
          </div>
        </section>

        <!-- Period -->
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">Overview performa</p>
            <p class="text-xs" style="color: var(--bb-text-tertiary)">
              {{ data?.period_days }} hari terakhir · agregat publik
            </p>
          </div>
          <div class="inline-flex p-0.5 rounded-full gap-0.5" style="background: var(--bb-bg-muted)">
            <button
              v-for="d in ([7, 30, 90] as const)"
              :key="d"
              type="button"
              class="px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors"
              :style="period === d
                ? { background: 'var(--bb-bg-surface)', color: 'var(--bb-text)', boxShadow: 'var(--bb-shadow-xs)' }
                : { color: 'var(--bb-text-secondary)' }"
              @click="setPeriod(d)"
            >
              {{ d }}h
            </button>
          </div>
        </div>

        <!-- KPI grid (dashboard-like) -->
        <section class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <article
            v-for="card in kpiCards"
            :key="card.label"
            class="rounded-2xl p-4 pub-card"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--bb-text-tertiary)">
                {{ card.label }}
              </p>
              <span class="pub-kpi-icon" :data-tone="card.tone">
                <Icon :icon="card.icon" class="text-sm" />
              </span>
            </div>
            <p class="text-2xl font-bold tracking-tight tabular-nums leading-none">{{ card.value }}</p>
            <p class="mt-1.5 text-[11px] leading-snug" style="color: var(--bb-text-secondary)">{{ card.hint }}</p>
          </article>
        </section>

        <!-- Insight strip -->
        <section class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <article class="rounded-2xl p-4 pub-card flex gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background: #fff7ed; color: #ea580c">
              <Icon icon="lucide:clock-3" class="text-base" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--bb-text-tertiary)">
                Jam tersibuk
              </p>
              <p class="text-xl font-bold tabular-nums mt-0.5">
                {{ peakHour ? fmtHour(peakHour.hour) : "—" }}
              </p>
              <p class="text-xs mt-0.5" style="color: var(--bb-text-secondary)">
                {{ peakHour ? `${peakHour.count} tiket di jam itu` : "Belum ada data" }}
              </p>
            </div>
          </article>
          <article class="rounded-2xl p-4 pub-card flex gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background: #fef2f2; color: #e11d48">
              <Icon icon="lucide:x-circle" class="text-base" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--bb-text-tertiary)">
                Cancellation
              </p>
              <p class="text-xl font-bold tabular-nums mt-0.5">
                {{ orders?.show_rates ? `${orders.cancellation_rate}%` : "—" }}
              </p>
              <p class="text-xs mt-0.5" style="color: var(--bb-text-secondary)">
                Dari total tiket periode
              </p>
            </div>
          </article>
        </section>

        <!-- Status composition -->
        <section class="rounded-2xl p-5 pub-card space-y-3">
          <div>
            <h2 class="text-sm font-bold">Komposisi status</h2>
            <p class="text-xs mt-0.5" style="color: var(--bb-text-secondary)">Distribusi tiket di periode ini</p>
          </div>
          <div v-if="statusParts.length" class="h-3 rounded-full overflow-hidden flex" style="background: var(--bb-bg-muted)">
            <div
              v-for="p in statusParts"
              :key="p.key"
              class="h-full transition-all"
              :style="{ width: `${p.pct}%`, background: p.color }"
              :title="`${p.label}: ${p.count}`"
            />
          </div>
          <div v-else class="h-3 rounded-full" style="background: var(--bb-bg-muted)" />
          <ul class="grid grid-cols-2 gap-2">
            <li
              v-for="p in statusParts"
              :key="p.key"
              class="flex items-center gap-2 text-xs"
              style="color: var(--bb-text-secondary)"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: p.color }" />
              <span class="truncate">{{ p.label }}</span>
              <span class="ml-auto font-semibold tabular-nums" style="color: var(--bb-text)">{{ p.count }}</span>
            </li>
          </ul>
        </section>

        <!-- Daily trend (CSS bars) -->
        <section class="rounded-2xl p-5 pub-card space-y-3">
          <div class="flex items-end justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold">Tren tiket</h2>
              <p class="text-xs mt-0.5" style="color: var(--bb-text-secondary)">
                Volume harian · {{ data?.period_days }} hari
              </p>
            </div>
            <p class="text-[11px] font-medium tabular-nums" style="color: var(--bb-text-tertiary)">
              {{ trendBars.reduce((s, b) => s + b.count, 0) }} total
            </p>
          </div>
          <div v-if="trendBars.length" class="flex items-end gap-0.5 sm:gap-1 h-28 pt-2">
            <div
              v-for="(b, i) in trendBars"
              :key="i"
              class="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1"
              :title="`${b.label}: ${b.count}`"
            >
              <div
                class="w-full rounded-t-sm pub-bar"
                :style="{ height: `${b.h}%` }"
              />
              <span
                v-if="trendBars.length <= 14 || i % Math.ceil(trendBars.length / 7) === 0"
                class="text-[9px] leading-none truncate w-full text-center"
                style="color: var(--bb-text-tertiary)"
              >
                {{ b.label }}
              </span>
              <span v-else class="h-2.5" />
            </div>
          </div>
          <p v-else class="text-xs py-6 text-center" style="color: var(--bb-text-tertiary)">
            Belum ada tren di periode ini
          </p>
        </section>

        <!-- Feedback -->
        <section class="rounded-2xl p-5 pub-card space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-bold">Penilaian warga</h2>
              <p class="mt-0.5 text-xs" style="color: var(--bb-text-secondary)">
                Setelah layanan selesai
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-2xl font-bold tracking-tight tabular-nums">
                {{ feedback?.show_rate ? `${feedback.helpful_rate}%` : "—" }}
              </p>
              <p class="text-[11px]" style="color: var(--bb-text-tertiary)">
                {{ feedback?.total ?? 0 }} ulasan
              </p>
            </div>
          </div>

          <div class="h-2.5 rounded-full overflow-hidden" style="background: var(--bb-bg-muted)">
            <div
              class="h-full rounded-full transition-all"
              style="background: #16a34a"
              :style="{ width: `${feedback?.show_rate ? feedback.helpful_rate : 0}%` }"
            />
          </div>

          <p
            v-if="!feedback?.show_rate"
            class="text-xs leading-relaxed"
            style="color: var(--bb-text-secondary)"
          >
            Belum cukup penilaian (min. 3) untuk menampilkan persentase kepuasan secara publik.
          </p>

          <ul v-else-if="feedback?.recent_quotes?.length" class="space-y-2">
            <li
              v-for="(q, i) in feedback.recent_quotes"
              :key="i"
              class="text-sm leading-snug rounded-xl px-3 py-2.5"
              style="background: var(--bb-bg-muted); color: var(--bb-text-secondary)"
            >
              “{{ q }}”
            </li>
          </ul>
        </section>

        <!-- RS Rujukan -->
        <section v-if="data?.referrals?.length" class="pub-card rounded-2xl p-4 space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--bb-text-tertiary)">
            RS Rujukan
          </p>
          <ul class="space-y-2">
            <li
              v-for="r in data.referrals"
              :key="r.hospital_id"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm flex-1 truncate" style="color: var(--bb-text-primary)">{{ r.hospital_name }}</span>
              <span class="text-sm font-semibold tabular-nums shrink-0" style="color: var(--bb-text-secondary)">{{ r.count }}×</span>
            </li>
          </ul>
        </section>

        <p class="text-center text-[11px] leading-relaxed px-2" style="color: var(--bb-text-tertiary)">
          Angka agregat — tanpa data pribadi pelapor.
          <button type="button" class="underline underline-offset-2" @click="refresh()">
            Muat ulang
          </button>
        </p>
      </template>
    </main>
  </div>
</template>

<style scoped>
.pub-card {
  background: var(--bb-bg-surface);
  box-shadow: var(--bb-shadow-soft);
  border: 1px solid var(--bb-border);
}
.pub-kpi-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bb-bg-muted);
  color: var(--bb-text-secondary);
}
.pub-kpi-icon[data-tone="good"] { background: #ecfdf5; color: #059669; }
.pub-kpi-icon[data-tone="warn"] { background: #fff7ed; color: #ea580c; }
.pub-kpi-icon[data-tone="info"] { background: #eff6ff; color: #2563eb; }
.pub-kpi-icon[data-tone="rose"] { background: #fff1f2; color: #e11d48; }
.pub-bar {
  background: linear-gradient(180deg, #60a5fa 0%, #2563eb 100%);
  min-height: 4px;
}
.soft-skel {
  background: linear-gradient(90deg, #ececf1 25%, #f5f5f8 37%, #ececf1 63%);
  background-size: 400% 100%;
  animation: soft-skel-shimmer 1.2s ease infinite;
}
@keyframes soft-skel-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
