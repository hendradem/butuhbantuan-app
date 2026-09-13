<script setup lang="ts">
/**
 * Stylised mockups of the unit dashboard screens used by the /landing
 * showcase, one per feature:
 *   0 — Pesanan masuk, cycling through its peta / tabel / kanban views
 *   1 — Statistik
 *   2 — Kelengkapan ambulans
 *   3 — Feedback
 * Not pixel-perfect, just enough visual language to read as "this is that
 * screen". Motion is decorative; landing.css disables it under
 * prefers-reduced-motion, and the view cycle below opts out too.
 */
import { Icon } from "@iconify/vue";

const props = defineProps<{ variant: number }>();

const menu = [
  { id: "dashboard", label: "Dashboard", icon: "lucide:layout-dashboard" },
  { id: "statistik", label: "Statistik", icon: "lucide:bar-chart-3" },
  { id: "laporan", label: "Laporan", icon: "lucide:file-text" },
  { id: "rs", label: "Rumah Sakit", icon: "lucide:hospital" },
  { id: "feedback", label: "Feedback", icon: "lucide:message-circle-heart" },
  { id: "pengaturan", label: "Pengaturan", icon: "lucide:settings" },
];
const opsMenu = [
  { id: "antrian", label: "Antrian", icon: "lucide:columns-3" },
  { id: "sla", label: "SLA Breach", icon: "lucide:alarm-clock" },
  { id: "peta", label: "Peta Ops", icon: "lucide:map" },
];

/** Sidebar row highlighted per variant, and the breadcrumb it maps to. */
const ACTIVE_ROW = ["dashboard", "peta", "statistik", "pengaturan", "rs", "feedback"];
const CRUMB = ["Pesanan Masuk", "Peta Ops", "Statistik", "Pengaturan", "Rumah Sakit", "Feedback"];

const stats = [
  { label: "Menunggu", value: "0", tone: "amber" },
  { label: "Berjalan", value: "1", tone: "sky" },
  { label: "Selesai", value: "7", tone: "green" },
  { label: "Completion", value: "88%", tone: "ink" },
];

const orders = [
  { id: "BB-20260912-0006", name: "Ade Mahendra", place: "Gang Lempongsari 4, Sariharjo", status: "Selesai", tone: "green" },
  { id: "BB-20260912-0003", name: "Ahmad Heryawan", place: "Jalan Pakem-Turi, Harjobinangun", status: "Diterima", tone: "sky" },
];

const rows = [
  { id: "BB-20260912-0006", name: "Ade Mahendra", status: "Selesai", tone: "green" },
  { id: "BB-20260912-0003", name: "Ahmad Heryawan", status: "Diterima", tone: "sky" },
  { id: "BB-20260911-0018", name: "Siti Nurhaliza", status: "Selesai", tone: "green" },
  { id: "BB-20260911-0012", name: "Bagas Wicaksono", status: "Selesai", tone: "green" },
  { id: "BB-20260910-0009", name: "Rina Kusuma", status: "Diterima", tone: "sky" },
  { id: "BB-20260910-0004", name: "Yohanes Tampubolon", status: "Selesai", tone: "green" },
];

/** Unique per instance: the mock renders twice (mobile inline + desktop sticky),
 *  and two <linearGradient> nodes sharing one id is invalid markup. */
const gradientId = `dm-area-${useId()}`;

const columns = [
  { label: "Menunggu", note: "Belum diterima", count: 0, tone: "amber" },
  { label: "Diterima", note: "Menuju lokasi", count: 1, tone: "sky" },
  { label: "Di lokasi", note: "Sedang ditangani", count: 0, tone: "indigo" },
  { label: "Selesai", note: "Ditutup hari ini", count: 0, tone: "green" },
];

const statsKpi = [
  { label: "Total tiket", value: "38", note: "30 hari terakhir" },
  { label: "Completion", value: "78,4%", note: "Selesai vs batal", accent: "green" },
  { label: "Avg response", value: "53d", note: "Masuk → diterima" },
  { label: "Avg tiba", value: "13,0j", note: "Diterima → lokasi" },
];

const ambulanceTypes = [
  { label: "Transport Darat", note: "Tabel 1", icon: "lucide:truck" },
  { label: "Gawat Darurat", note: "Roda 4+", icon: "mynaui:ambulance-solid" },
  { label: "Roda 2", note: "Tabel 6-9", icon: "lucide:bike" },
];

const checklist = [
  { label: "Tensimeter", state: "ada" },
  { label: "Stetoskop", state: "ada" },
  { label: "Reflex hammer", state: "belum" },
  { label: "Senter halogen", state: "ada" },
  { label: "Termometer digital", state: "ada" },
  { label: "Alat gula darah", state: "tidak" },
];

/** Units on shift, shown on the ops map. */
const fleet = [
  { name: "AMB-01 · Sleman", crew: "Andi P.", state: "Bertugas", tone: "sky" },
  { name: "AMB-04 · Ngaglik", crew: "Rina K.", state: "Siaga", tone: "green" },
  { name: "AMB-07 · Depok", crew: "Bagas W.", state: "Siaga", tone: "green" },
];

const hospitals = [
  { name: "RSUP Dr. Sardjito", type: "Rujukan nasional", dist: "1,2 km", open: true },
  { name: "RSUD Sleman", type: "Rujukan daerah", dist: "2,4 km", open: true },
  { name: "RS Bethesda", type: "Swasta", dist: "3,1 km", open: true },
  { name: "RS PKU Gamping", type: "Swasta", dist: "4,5 km", open: false },
];

const feedbackKpi = [
  { label: "Total feedback", value: "37" },
  { label: "Unit membantu", value: "95%", accent: "green" },
  { label: "Aplikasi berguna", value: "97%", accent: "green" },
];

const feedback = [
  { good: true, app: true, via: "Telepon", date: "12 Sep", quote: "Pelayanannya oke banget, terima kasih PSC Sleman." },
  { good: true, app: true, via: "WhatsApp", date: "2 Sep" },
  { good: false, app: false, via: "Lainnya", date: "2 Sep" },
  { good: true, app: true, via: "WhatsApp", date: "31 Agu" },
  { good: true, app: true, via: "Telepon", date: "29 Agu", quote: "Terima kasih PMI, cepat sampai." },
];

// ── Variant 0 cycles peta → tabel → kanban so the three views read as one
// interactive board rather than three separate screenshots.
const views = ["Peta", "Tabel", "Kanban"];
const view = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  if (props.variant !== 0) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  timer = setInterval(() => (view.value = (view.value + 1) % views.length), 2800);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div class="dm flex h-full w-full bg-[#fafaf9] text-[#1c1917]">
    <!-- ── Sidebar ───────────────────────────────────────────────────────── -->
    <aside class="hidden w-[142px] shrink-0 flex-col border-r border-[#ecebe8] bg-white p-3 md:flex">
      <div class="mb-5 flex items-center gap-2">
        <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-[#DC2626]">
          <Icon icon="lucide:siren" class="text-[12px] text-white" />
        </span>
        <span class="leading-tight">
          <span class="block text-[10px] font-bold tracking-tight">ButuhBantuan</span>
          <span class="block text-[8px] text-gray-400">Unit Panel</span>
        </span>
      </div>

      <div class="space-y-0.5">
        <div
          v-for="m in menu"
          :key="m.id"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px]"
          :class="m.id === ACTIVE_ROW[variant] ? 'bg-[#fef2f2] font-bold text-[#b91c1c]' : 'text-gray-500'"
        >
          <Icon :icon="m.icon" class="text-[12px]" />
          <span>{{ m.label }}</span>
        </div>
      </div>

      <div class="mt-4 px-2 text-[8px] font-bold uppercase tracking-[1.5px] text-gray-300">Ops wilayah</div>
      <div class="mt-1.5 space-y-0.5">
        <div
          v-for="m in opsMenu"
          :key="m.id"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px]"
          :class="m.id === ACTIVE_ROW[variant] ? 'bg-[#fef2f2] font-bold text-[#b91c1c]' : 'text-gray-500'"
        >
          <Icon :icon="m.icon" class="text-[12px]" />
          <span>{{ m.label }}</span>
        </div>
      </div>
    </aside>

    <!-- ── Main ──────────────────────────────────────────────────────────── -->
    <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Breadcrumb bar -->
      <div class="flex shrink-0 items-center justify-between border-b border-[#ecebe8] bg-white px-4 py-2.5">
        <div class="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Icon icon="lucide:panel-left" class="text-[12px]" />
          <span>Home</span>
          <Icon icon="lucide:chevron-right" class="text-[10px]" />
          <span class="font-bold text-[#1c1917]">{{ CRUMB[variant] }}</span>
        </div>
        <div class="flex items-center gap-2">
          <Icon icon="lucide:bell" class="text-[12px] text-gray-400" />
          <span class="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-[#fef2f2]">
              <Icon icon="lucide:user" class="text-[10px] text-[#b91c1c]" />
            </span>
            <span class="text-[10px] font-semibold">PMI Kab. Sleman</span>
          </span>
        </div>
      </div>

      <!-- ═══ 0 · Pesanan masuk ═══════════════════════════════════════════ -->
      <div v-if="variant === 0" class="flex min-h-0 flex-1 flex-col p-4">
        <div class="dm-in flex items-center justify-between">
          <div>
            <h4 class="text-[14px] font-bold tracking-[-0.3px]">Pesanan Masuk</h4>
            <div class="text-[9px] text-gray-400">9 dari 9 di periode</div>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-0.5 rounded-lg bg-[#f5f5f4] p-0.5">
              <span
                v-for="(v, i) in views"
                :key="v"
                class="rounded-md px-2 py-1 text-[9px] font-semibold transition-colors duration-300"
                :class="i === view ? 'bg-white text-[#1c1917] shadow-sm' : 'text-gray-400'"
              >
                {{ v }}
              </span>
            </div>
            <span class="rounded-lg bg-[#DC2626] px-2.5 py-1.5 text-[9px] font-bold text-white">Buat E-Tiket</span>
          </div>
        </div>

        <!-- KPI row -->
        <div class="dm-in mt-3 grid grid-cols-4 gap-2" style="--d: 70ms">
          <div v-for="s in stats" :key="s.label" class="rounded-lg border border-[#ecebe8] bg-white p-2">
            <div class="text-[8px] font-bold uppercase tracking-[1px] text-gray-400">{{ s.label }}</div>
            <div class="mt-0.5 text-[15px] font-bold leading-none" :class="`dm-num--${s.tone}`">{{ s.value }}</div>
          </div>
        </div>

        <!-- Views -->
        <div class="dm-in relative mt-2.5 min-h-0 flex-1 overflow-hidden rounded-xl border border-[#ecebe8] bg-white" style="--d: 140ms">
          <Transition name="dm-view">
            <!-- Peta -->
            <div v-if="view === 0" key="peta" class="absolute inset-0 flex">
              <div class="relative min-w-0 flex-1 bg-[#eceee8]">
                <svg viewBox="0 0 240 200" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <rect width="240" height="200" fill="#eceee8" />
                  <path d="M150 0 h90 v70 h-60 Z" fill="#dfe8d6" />
                  <g stroke="#fff" fill="none" stroke-linecap="round">
                    <path d="M-10 78 q80 -18 130 12 t130 -6" stroke-width="7" />
                    <path d="M74 -10 q12 100 -8 220" stroke-width="6" />
                    <path d="M176 -10 q-8 110 8 210" stroke-width="4" />
                    <path d="M-10 146 q90 -14 140 10" stroke-width="4" />
                  </g>
                  <path d="M-10 40 q60 26 110 4 t150 18" stroke="#cfe0ea" stroke-width="8" fill="none" />
                </svg>
                <span class="dm-heat absolute bottom-[14%] left-[44%] h-16 w-16 -translate-x-1/2 rounded-full" />
                <span class="dm-marker dm-marker--green" style="left: 30%; top: 30%">
                  <Icon icon="lucide:ticket" class="text-[9px]" />
                </span>
                <span class="dm-marker dm-marker--sky" style="left: 58%; top: 22%">
                  <Icon icon="lucide:ticket" class="text-[9px]" />
                </span>
                <span class="dm-marker dm-marker--green" style="left: 46%; top: 62%">
                  <Icon icon="lucide:ticket" class="text-[9px]" />
                </span>
                <span class="absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-[#1c1917]/85 px-2 py-1 text-[8px] font-medium text-white">
                  Klik marker untuk detail
                </span>
              </div>

              <div class="hidden w-[44%] shrink-0 space-y-1.5 border-l border-[#ecebe8] bg-white p-2 sm:block">
                <div v-for="(o, i) in orders" :key="o.id" class="dm-in rounded-lg border border-[#ecebe8] p-2" :style="{ '--d': `${160 + i * 90}ms` }">
                  <div class="flex items-center justify-between gap-1">
                    <span class="lp-mono truncate text-[8px] text-gray-400">{{ o.id }}</span>
                    <span class="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold" :class="`dm-chip--${o.tone}`">{{ o.status }}</span>
                  </div>
                  <div class="mt-1 text-[10px] font-bold">{{ o.name }}</div>
                  <div class="mt-1 flex gap-1">
                    <span class="rounded-full bg-[#fef2f2] px-1.5 py-0.5 text-[7px] font-bold text-[#b91c1c]">Darurat</span>
                    <span class="rounded-full bg-[#fef2f2] px-1.5 py-0.5 text-[7px] font-bold text-[#b91c1c]">Triase merah</span>
                  </div>
                  <div class="mt-1 truncate text-[8px] text-gray-400">{{ o.place }}</div>
                </div>
              </div>
            </div>

            <!-- Tabel -->
            <div v-else-if="view === 1" key="tabel" class="absolute inset-0 p-2">
              <div class="grid grid-cols-[1.3fr_1fr_0.8fr] gap-2 border-b border-[#ecebe8] px-1.5 pb-1.5 text-[8px] font-bold uppercase tracking-[1px] text-gray-400">
                <span>No. tiket</span><span>Pelapor</span><span>Status</span>
              </div>
              <div
                v-for="(o, i) in rows"
                :key="o.id"
                class="dm-in grid grid-cols-[1.3fr_1fr_0.8fr] items-center gap-2 border-b border-[#f4f3f1] px-1.5 py-[7px]"
                :style="{ '--d': `${i * 60}ms` }"
              >
                <span class="lp-mono truncate text-[9px] text-gray-500">{{ o.id }}</span>
                <span class="truncate text-[9px] font-semibold">{{ o.name }}</span>
                <span>
                  <span class="rounded-full px-1.5 py-0.5 text-[8px] font-bold" :class="`dm-chip--${o.tone}`">{{ o.status }}</span>
                </span>
              </div>
            </div>

            <!-- Kanban -->
            <div v-else key="kanban" class="absolute inset-0 grid grid-cols-4 gap-1.5 p-2">
              <div
                v-for="(c, i) in columns"
                :key="c.label"
                class="dm-in flex min-w-0 flex-col rounded-lg p-1.5"
                :class="`dm-col--${c.tone}`"
                :style="{ '--d': `${i * 70}ms` }"
              >
                <div class="flex items-center justify-between gap-1">
                  <span class="truncate text-[9px] font-bold">{{ c.label }}</span>
                  <span class="text-[9px] font-bold opacity-60">{{ c.count }}</span>
                </div>
                <span class="mt-0.5 truncate text-[7px] opacity-70">{{ c.note }}</span>
                <div v-if="c.count" class="mt-1.5 rounded-md bg-white p-1.5 shadow-sm">
                  <div class="truncate text-[8px] font-bold">Ade Mahendra</div>
                  <div class="lp-mono mt-0.5 truncate text-[7px] text-gray-400">BB-0003</div>
                </div>
                <div v-else class="mt-1.5 flex flex-1 items-center justify-center rounded-md border border-dashed border-current/20 text-[7px] opacity-50">
                  Kosong
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- ═══ 1 · Peta ops ════════════════════════════════════════════════ -->
      <div v-else-if="variant === 1" class="relative flex min-h-0 flex-1 flex-col">
        <div class="relative min-h-0 flex-1 overflow-hidden bg-[#eceee8]">
          <svg viewBox="0 0 420 260" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="420" height="260" fill="#eceee8" />
            <path d="M250 0 h170 v96 h-110 Z" fill="#dfe8d6" />
            <path d="M0 196 q80 -24 150 4 t170 -12 v72 H0 Z" fill="#e4e7de" />
            <path d="M-10 62 q90 34 160 8 t180 26" stroke="#cfe0ea" stroke-width="12" fill="none" stroke-linecap="round" />
            <g stroke="#fff" fill="none" stroke-linecap="round">
              <path d="M-10 118 q110 -24 176 14 t174 -8" stroke-width="10" />
              <path d="M126 -10 q16 118 -10 172 t14 108" stroke-width="8" />
              <path d="M296 -10 q-12 130 12 180" stroke-width="6" />
              <path d="M-10 196 q120 -18 190 12 t160 -6" stroke-width="5" />
            </g>
            <g fill="#e3e6dd">
              <rect x="40" y="140" width="44" height="28" rx="4" />
              <rect x="196" y="84" width="38" height="26" rx="4" />
              <rect x="330" y="162" width="46" height="30" rx="4" />
            </g>
          </svg>

          <span class="dm-heat absolute left-[38%] top-[58%] h-24 w-24 rounded-full" />

          <!-- Units on shift -->
          <span class="dm-unit dm-unit--drive" style="left: 26%; top: 34%">
            <Icon icon="mynaui:ambulance-solid" class="text-[10px]" />
          </span>
          <span class="dm-unit dm-unit--idle" style="left: 16%; top: 68%">
            <Icon icon="mynaui:ambulance-solid" class="text-[10px]" />
          </span>
          <span class="dm-unit dm-unit--idle" style="left: 72%; top: 66%">
            <Icon icon="mynaui:ambulance-solid" class="text-[10px]" />
          </span>
          <span class="dm-radar absolute left-[46%] top-[52%] h-5 w-5 rounded-full border-2 border-white bg-[#DC2626]" />

          <!-- Live badge -->
          <div class="dm-in absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 shadow-sm">
            <span class="dm-blink h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
            <span class="text-[9px] font-bold">Live · 3 unit bertugas</span>
          </div>

          <!-- Legend -->
          <div class="dm-in absolute bottom-3 left-3 rounded-lg bg-white/95 px-2.5 py-2 shadow-sm" style="--d: 160ms">
            <div class="text-[7px] font-bold uppercase tracking-[1px] text-gray-400">Status pesanan</div>
            <div class="mt-1 flex items-center gap-2.5">
              <span v-for="l in [{ c: 'bg-amber-500', t: 'Menunggu' }, { c: 'bg-blue-600', t: 'Diterima' }, { c: 'bg-emerald-600', t: 'Selesai' }]" :key="l.t" class="flex items-center gap-1 text-[8px] text-gray-500">
                <span class="h-1.5 w-1.5 rounded-full" :class="l.c" />
                {{ l.t }}
              </span>
            </div>
          </div>

          <!-- Fleet panel -->
          <div class="dm-in absolute right-3 top-3 hidden w-[42%] rounded-xl border border-[#ecebe8] bg-white p-2 shadow-sm sm:block" style="--d: 100ms">
            <div class="flex items-center justify-between">
              <span class="text-[9px] font-bold">Unit bertugas</span>
              <Icon icon="lucide:refresh-cw" class="dm-spin text-[9px] text-gray-400" />
            </div>
            <div class="mt-1.5 space-y-1">
              <div
                v-for="(f, i) in fleet"
                :key="f.name"
                class="dm-in flex items-center gap-1.5 rounded-lg bg-[#fafaf9] px-1.5 py-1"
                :style="{ '--d': `${200 + i * 80}ms` }"
              >
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white">
                  <Icon icon="mynaui:ambulance-solid" class="text-[9px] text-[#DC2626]" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[8px] font-bold">{{ f.name }}</span>
                  <span class="block truncate text-[7px] text-gray-400">{{ f.crew }}</span>
                </span>
                <span class="shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-bold" :class="`dm-chip--${f.tone}`">{{ f.state }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ 2 · Statistik ═══════════════════════════════════════════════ -->
      <div v-else-if="variant === 2" class="flex min-h-0 flex-1 flex-col p-4">
        <div class="dm-in flex items-center justify-between">
          <div>
            <h4 class="text-[14px] font-bold tracking-[-0.3px]">Statistik</h4>
            <div class="text-[9px] text-gray-400">Ringkasan performa unit</div>
          </div>
          <div class="flex items-center gap-0.5 rounded-lg bg-[#f5f5f4] p-0.5">
            <span v-for="(r, i) in ['7 Hari', '30 Hari', '90 Hari']" :key="r" class="rounded-md px-2 py-1 text-[9px] font-semibold" :class="i === 1 ? 'bg-white text-[#1c1917] shadow-sm' : 'text-gray-400'">
              {{ r }}
            </span>
          </div>
        </div>

        <div class="dm-in mt-3 grid grid-cols-4 gap-2" style="--d: 70ms">
          <div v-for="k in statsKpi" :key="k.label" class="rounded-lg border border-[#ecebe8] bg-white p-2">
            <div class="text-[8px] font-bold uppercase tracking-[1px] text-gray-400">{{ k.label }}</div>
            <div class="mt-0.5 text-[15px] font-bold leading-none" :class="k.accent === 'green' && 'text-emerald-600'">{{ k.value }}</div>
            <div class="mt-0.5 truncate text-[7px] text-gray-400">{{ k.note }}</div>
          </div>
        </div>

        <div class="mt-2.5 grid min-h-0 flex-1 grid-cols-[1.6fr_1fr] gap-2">
          <!-- Trend -->
          <div class="dm-in flex flex-col rounded-xl border border-[#ecebe8] bg-white p-2.5" style="--d: 140ms">
            <div class="text-[9px] font-bold">Tren Tiket · 30 hari</div>
            <svg viewBox="0 0 240 88" class="mt-1.5 min-h-0 flex-1 w-full" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#DC2626" stop-opacity="0.22" />
                  <stop offset="100%" stop-color="#DC2626" stop-opacity="0.02" />
                </linearGradient>
              </defs>
              <g stroke="#f4f3f1" stroke-width="1">
                <line x1="0" y1="22" x2="240" y2="22" />
                <line x1="0" y1="44" x2="240" y2="44" />
                <line x1="0" y1="66" x2="240" y2="66" />
              </g>
              <path
                d="M0 66 L34 40 L60 8 L86 58 L112 44 L138 56 L164 78 L190 62 L214 44 L240 66 L240 88 L0 88 Z"
                :fill="`url(#${gradientId})`"
              />
              <path
                class="dm-line"
                d="M0 66 L34 40 L60 8 L86 58 L112 44 L138 56 L164 78 L190 62 L214 44 L240 66"
                fill="none"
                stroke="#DC2626"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div class="mt-1 flex justify-between text-[7px] text-gray-400">
              <span>14 Agu</span><span>29 Agu</span><span>12 Sep</span>
            </div>
          </div>

          <!-- Donut -->
          <div class="dm-in flex flex-col rounded-xl border border-[#ecebe8] bg-white p-2.5" style="--d: 200ms">
            <div class="text-[9px] font-bold">Status Tiket</div>
            <div class="flex min-h-0 flex-1 items-center justify-center">
              <svg viewBox="0 0 42 42" class="h-[64px] w-[64px] -rotate-90" aria-hidden="true">
                <circle cx="21" cy="21" r="16" fill="none" stroke="#f4f3f1" stroke-width="7" />
                <circle class="dm-ring dm-ring--1" cx="21" cy="21" r="16" fill="none" stroke="#16a34a" stroke-width="7" stroke-dasharray="78 100" />
                <circle class="dm-ring dm-ring--2" cx="21" cy="21" r="16" fill="none" stroke="#2563eb" stroke-width="7" stroke-dasharray="5 100" stroke-dashoffset="-78" />
                <circle class="dm-ring dm-ring--3" cx="21" cy="21" r="16" fill="none" stroke="#a8a29e" stroke-width="7" stroke-dasharray="17 100" stroke-dashoffset="-83" />
              </svg>
            </div>
            <div class="space-y-0.5">
              <div v-for="l in [{ c: 'bg-emerald-600', t: 'Selesai' }, { c: 'bg-blue-600', t: 'Berjalan' }, { c: 'bg-stone-400', t: 'Dibatalkan' }]" :key="l.t" class="flex items-center gap-1.5 text-[8px] text-gray-500">
                <span class="h-1.5 w-1.5 rounded-full" :class="l.c" />
                {{ l.t }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ 3 · Kelengkapan ambulans ════════════════════════════════════ -->
      <div v-else-if="variant === 3" class="flex min-h-0 flex-1 flex-col p-4">
        <div class="dm-in flex items-end justify-between">
          <div>
            <h4 class="text-[14px] font-bold tracking-[-0.3px]">Kelengkapan Ambulans</h4>
            <div class="text-[9px] text-gray-400">Pedoman Teknis Kemenkes 2019</div>
          </div>
          <div class="text-right">
            <div class="text-[15px] font-bold leading-none">78%</div>
            <div class="text-[8px] text-gray-400">28/36 wajib</div>
          </div>
        </div>

        <div class="dm-in mt-1.5 h-1 overflow-hidden rounded-full bg-[#f4f3f1]" style="--d: 60ms">
          <span class="dm-bar block h-full rounded-full bg-[#DC2626]" />
        </div>

        <div class="dm-in mt-3 grid grid-cols-3 gap-2" style="--d: 110ms">
          <div
            v-for="(t, i) in ambulanceTypes"
            :key="t.label"
            class="flex items-center gap-1.5 rounded-lg border bg-white p-2"
            :class="i === 0 ? 'border-[#DC2626] bg-[#fffbfb]' : 'border-[#ecebe8]'"
          >
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" :class="i === 0 ? 'bg-[#fef2f2] text-[#DC2626]' : 'bg-[#f5f5f4] text-gray-500'">
              <Icon :icon="t.icon" class="text-[12px]" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-[9px] font-bold">{{ t.label }}</span>
              <span class="block truncate text-[7px] text-gray-400">{{ t.note }}</span>
            </span>
          </div>
        </div>

        <div class="dm-in mt-2.5 flex items-center gap-1.5" style="--d: 160ms">
          <span class="rounded-lg bg-[#1c1917] px-2 py-1 text-[8px] font-bold text-white">Kelengkapan</span>
          <span class="px-2 py-1 text-[8px] font-semibold text-gray-400">Interior</span>
          <span class="px-2 py-1 text-[8px] font-semibold text-gray-400">Eksterior</span>
        </div>

        <div class="mt-2 text-[7px] font-bold uppercase tracking-[1.5px] text-gray-300">Pemeriksaan umum</div>
        <div class="mt-1.5 grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-hidden">
          <div
            v-for="(c, i) in checklist"
            :key="c.label"
            class="dm-in rounded-lg border border-[#ecebe8] bg-white px-2 py-1.5"
            :style="{ '--d': `${200 + i * 60}ms` }"
          >
            <div class="truncate text-[9px] font-semibold">{{ c.label }}</div>
            <div class="mt-1 flex items-center gap-1">
              <span
                v-for="s in ['Ada', 'Tidak', 'Belum']"
                :key="s"
                class="rounded px-1.5 py-0.5 text-[7px] font-bold"
                :class="
                  s.toLowerCase() === c.state
                    ? s === 'Ada'
                      ? 'bg-[#DC2626] text-white'
                      : 'border border-[#DC2626] text-[#DC2626]'
                    : 'border border-[#ecebe8] text-gray-400'
                "
              >
                {{ s }}
              </span>
              <Icon icon="lucide:camera" class="ml-auto text-[9px] text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ 4 · Rumah sakit ═════════════════════════════════════════════ -->
      <div v-else-if="variant === 4" class="flex min-h-0 flex-1 flex-col p-4">
        <div class="dm-in flex items-start justify-between">
          <div>
            <h4 class="text-[14px] font-bold tracking-[-0.3px]">Rumah Sakit</h4>
            <div class="text-[9px] text-gray-400">Rujukan IGD terdekat dari lokasi unit</div>
          </div>
          <span class="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">
            <Icon icon="lucide:refresh-cw" class="dm-spin text-[8px]" />
            Sinkron 2 jam lalu
          </span>
        </div>

        <div class="dm-in mt-2.5 flex items-center gap-1.5" style="--d: 60ms">
          <span class="flex flex-1 items-center gap-1.5 rounded-lg border border-[#ecebe8] bg-white px-2 py-1.5">
            <Icon icon="lucide:search" class="text-[10px] text-gray-300" />
            <span class="text-[9px] text-gray-300">Cari rumah sakit</span>
          </span>
          <span class="rounded-lg bg-[#f5f5f4] px-2 py-1.5 text-[9px] font-semibold text-gray-500">Terdekat</span>
        </div>

        <div class="dm-in mt-1.5 flex items-center gap-1.5" style="--d: 110ms">
          <span class="rounded-full bg-sky-50 px-2 py-0.5 text-[7px] font-bold text-sky-700">SATUSEHAT Kemenkes</span>
          <span class="rounded-full bg-[#f5f5f4] px-2 py-0.5 text-[7px] font-bold text-gray-500">OpenStreetMap</span>
          <span class="text-[7px] text-gray-400">duplikat sudah dirapikan</span>
        </div>

        <div class="mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-hidden">
          <div
            v-for="(h, i) in hospitals"
            :key="h.name"
            class="dm-in flex items-center gap-2 rounded-lg border border-[#ecebe8] bg-white p-2"
            :style="{ '--d': `${160 + i * 80}ms` }"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Icon icon="lucide:hospital" class="text-[13px]" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[10px] font-bold">{{ h.name }}</span>
              <span class="flex items-center gap-1 text-[8px] text-gray-400">
                <span class="h-1.5 w-1.5 rounded-full" :class="h.open ? 'bg-emerald-500' : 'bg-stone-300'" />
                IGD {{ h.open ? "24 jam" : "tutup" }} · {{ h.type }} · {{ h.dist }}
              </span>
            </span>
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1c1917] text-white">
              <Icon icon="lucide:phone" class="text-[9px]" />
            </span>
          </div>
        </div>
      </div>

      <!-- ═══ 5 · Feedback ════════════════════════════════════════════════ -->
      <div v-else class="flex min-h-0 flex-1 flex-col p-4">
        <div class="dm-in">
          <h4 class="text-[14px] font-bold tracking-[-0.3px]">Arsip Feedback</h4>
          <div class="text-[9px] text-gray-400">Semua penilaian warga dari detail pesanan</div>
        </div>

        <div class="dm-in mt-3 grid grid-cols-3 gap-2" style="--d: 70ms">
          <div v-for="k in feedbackKpi" :key="k.label" class="rounded-lg border border-[#ecebe8] bg-white p-2 text-center">
            <div class="text-[8px] font-semibold text-gray-400">{{ k.label }}</div>
            <div class="mt-0.5 text-[16px] font-bold leading-none" :class="k.accent === 'green' && 'text-emerald-600'">{{ k.value }}</div>
          </div>
        </div>

        <div class="dm-in mt-2.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#ecebe8] bg-white" style="--d: 140ms">
          <div class="flex items-center justify-between border-b border-[#ecebe8] px-2.5 py-2">
            <span class="text-[9px] font-bold">Riwayat Feedback</span>
            <span class="rounded-full bg-[#f5f5f4] px-1.5 py-0.5 text-[8px] font-bold text-gray-500">37</span>
          </div>
          <div class="min-h-0 flex-1 divide-y divide-[#f4f3f1] overflow-hidden">
            <div v-for="(f, i) in feedback" :key="i" class="dm-in px-2.5 py-[7px]" :style="{ '--d': `${180 + i * 70}ms` }">
              <div class="flex items-center gap-1">
                <span class="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[7px] font-bold" :class="f.good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">
                  <Icon :icon="f.good ? 'lucide:thumbs-up' : 'lucide:thumbs-down'" class="text-[7px]" />
                  {{ f.good ? "Membantu" : "Tidak membantu" }}
                </span>
                <span class="rounded-full px-1.5 py-0.5 text-[7px] font-bold" :class="f.app ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'">
                  {{ f.app ? "Aplikasi berguna" : "Kurang berguna" }}
                </span>
                <span class="truncate text-[7px] text-gray-400">{{ f.via }}</span>
                <span class="ml-auto shrink-0 text-[7px] text-gray-300">{{ f.date }}</span>
              </div>
              <div v-if="f.quote" class="mt-1 truncate text-[8px] italic text-gray-500">“{{ f.quote }}”</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Entrance stagger; replays on variant change because the parent keys the
   mock, so each screen re-mounts. */
.dm-in {
  animation: dm-in 0.45s var(--lp-ease) both;
  animation-delay: var(--d, 0ms);
}
@keyframes dm-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

/* View switch inside the orders board. */
.dm-view-enter-active,
.dm-view-leave-active {
  transition:
    opacity 0.4s var(--lp-ease),
    transform 0.4s var(--lp-ease);
}
.dm-view-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.dm-view-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.dm-num--amber {
  color: #b45309;
}
.dm-num--sky {
  color: #0369a1;
}
.dm-num--green {
  color: #15803d;
}

.dm-chip--green {
  background: #ecfdf5;
  color: #047857;
}
.dm-chip--sky {
  background: #eff6ff;
  color: #1d4ed8;
}

.dm-col--amber {
  background: #fffbeb;
  color: #b45309;
}
.dm-col--sky {
  background: #eff6ff;
  color: #1d4ed8;
}
.dm-col--indigo {
  background: #eef2ff;
  color: #4338ca;
}
.dm-col--green {
  background: #ecfdf5;
  color: #047857;
}

/* Map markers + heat blob. */
.dm-marker {
  position: absolute;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 3px 8px -2px rgba(28, 25, 23, 0.45);
}
.dm-marker--green {
  background: #16a34a;
}
.dm-marker--sky {
  background: #2563eb;
}
.dm-heat {
  background: radial-gradient(circle, rgba(220, 38, 38, 0.55), rgba(251, 146, 60, 0.28) 45%, transparent 70%);
  animation: dm-heat 3.2s ease-in-out infinite;
}
@keyframes dm-heat {
  0%,
  100% {
    opacity: 0.65;
    transform: translateX(-50%) scale(0.92);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.08);
  }
}

/* Ops map: units on shift, the live dot and the sync spinner. */
.dm-unit {
  position: absolute;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 4px 10px -3px rgba(28, 25, 23, 0.5);
}
.dm-unit--idle {
  background: #16a34a;
}
.dm-unit--drive {
  background: #2563eb;
  animation: dm-drive 6s ease-in-out infinite;
}
@keyframes dm-drive {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(22px, 16px);
  }
}
.dm-radar::after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: rgba(220, 38, 38, 0.28);
  animation: dm-radar 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes dm-radar {
  0% {
    opacity: 0.8;
    transform: scale(0.5);
  }
  70%,
  100% {
    opacity: 0;
    transform: scale(2.1);
  }
}
.dm-blink {
  animation: dm-blink 1.6s ease-in-out infinite;
}
@keyframes dm-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}
.dm-spin {
  animation: dm-spin 4s linear infinite;
}
@keyframes dm-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Chart reveals. */
.dm-line {
  stroke-dasharray: 620;
  animation: dm-draw 1.6s var(--lp-ease) 0.2s both;
}
@keyframes dm-draw {
  from {
    stroke-dashoffset: 620;
  }
  to {
    stroke-dashoffset: 0;
  }
}
.dm-ring {
  animation: dm-ring 1.1s var(--lp-ease) both;
  transform-origin: center;
}
.dm-ring--1 {
  animation-delay: 0.25s;
}
.dm-ring--2 {
  animation-delay: 0.45s;
}
.dm-ring--3 {
  animation-delay: 0.6s;
}
@keyframes dm-ring {
  from {
    opacity: 0;
    stroke-dashoffset: 40;
  }
}

/* Readiness bar fills to the 78% shown above it. */
.dm-bar {
  width: 78%;
  animation: dm-bar 1.4s var(--lp-ease) 0.2s both;
}
@keyframes dm-bar {
  from {
    width: 0;
  }
}
</style>
