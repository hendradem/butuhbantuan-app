<script setup lang="ts">
/**
 * The five citizen-app screens shown inside the phone on /landing, one per
 * feature step. Stylised, not pixel-perfect.
 *
 * They follow the shipped app: violet for ambulance units, brand red for the
 * primary action, outline chips for tier / ETA / distance, and the pink-tinted
 * icon well the sheets use for their header. Faces, plates and addresses stay
 * invented.
 *
 * Each screen is keyed by the parent, so it remounts on every step change —
 * that is what replays the `.ps-in` entrance stagger. All motion here is
 * decorative and is disabled globally by the reduced-motion rule in
 * landing.css.
 */
import { Icon } from "@iconify/vue";

defineProps<{ screen: number }>();

const AMBULANCE = "#8b5cf6";

const timeline = [
  { icon: "lucide:check", title: "Petugas tiba", time: "Baru saja", state: "done" },
  { icon: "lucide:navigation", title: "Menuju lokasi", time: "2 menit lalu", state: "now" },
  { icon: "lucide:phone-incoming", title: "Order diterima unit", time: "5 menit lalu", state: "past" },
  { icon: "lucide:send", title: "Laporan terkirim", time: "6 menit lalu", state: "past" },
];
</script>

<template>
  <div class="relative h-full w-full text-[#1c1917]">
    <!-- Status bar -->
    <div class="absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-6 pt-3 text-[10px] font-semibold">
      <span>09:41</span>
      <span class="flex items-center gap-1">
        <Icon icon="lucide:signal" class="text-[11px]" />
        <Icon icon="lucide:battery-full" class="text-[12px]" />
      </span>
    </div>

    <!-- 0 — Nearest units: map with the unit sheet -->
    <div v-if="screen === 0" class="h-full w-full bg-[#eef1ea]">
      <svg viewBox="0 0 268 560" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="268" height="560" fill="#eef1ea" />
        <path d="M168 8 h110 v96 h-72 Z" fill="#dfe8d6" />
        <path d="M-20 402 q60 -26 118 6 t150 -10 v182 h-268 Z" fill="#e4e7de" />
        <path d="M-10 120 q70 34 120 8 t160 26" stroke="#cfe0ea" stroke-width="13" fill="none" stroke-linecap="round" />
        <g stroke="#fff" fill="none" stroke-linecap="round">
          <path d="M-10 196 q96 -22 148 14 t140 -6" stroke-width="11" />
          <path d="M96 -10 q14 150 -10 260 t18 320" stroke-width="9" />
          <path d="M198 -10 q-10 180 14 300 t-6 280" stroke-width="6" />
          <path d="M-10 330 q80 16 150 -8 t138 18" stroke-width="6" />
          <path d="M-10 470 q110 -18 160 12 t128 -6" stroke-width="5" />
        </g>
      </svg>

      <!-- Own position -->
      <div class="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
        <span class="ps-ping absolute left-1/2 top-1/2 h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2f80ed]/20" />
        <span class="relative block h-[15px] w-[15px] rounded-full border-[3px] border-white bg-[#2f80ed] shadow-[0_2px_8px_rgba(47,128,237,0.55)]" />
      </div>

      <!-- Nearby units — violet, the app's ambulance colour -->
      <div class="ps-in absolute left-[15%] top-[22%] flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 shadow-[0_6px_16px_-6px_rgba(28,25,23,0.45)]" style="--d: 90ms">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#fce4f0]">
          <Icon icon="mynaui:ambulance-solid" class="text-[13px]" :style="{ color: AMBULANCE }" />
        </span>
        <span class="text-[8.5px] font-bold">1,2 km</span>
      </div>
      <div class="ps-in absolute right-[12%] top-[29%] flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_6px_16px_-6px_rgba(28,25,23,0.45)]" style="--d: 180ms">
        <Icon icon="lucide:hospital" class="text-[14px] text-[#4a90e2]" />
      </div>

      <!-- Map tools -->
      <div class="ps-in absolute inset-x-3 top-[52px] flex gap-1.5" style="--d: 60ms">
        <span class="flex flex-1 items-center gap-1.5 rounded-full bg-white px-2.5 py-2 shadow-[0_8px_20px_-12px_rgba(28,25,23,0.5)]">
          <Icon icon="lucide:search" class="text-[11px] text-stone-400" />
          <span class="truncate text-[9px] text-stone-500">Sleman, Yogyakarta</span>
        </span>
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-12px_rgba(28,25,23,0.5)]">
          <Icon icon="lucide:sliders-horizontal" class="text-[12px] text-stone-500" />
        </span>
      </div>

      <!-- Unit sheet -->
      <div class="ps-in absolute inset-x-2.5 bottom-2.5 rounded-[24px] bg-white p-3.5 shadow-[0_20px_44px_-16px_rgba(28,25,23,0.5)]" style="--d: 300ms">
        <span class="mx-auto mb-3 block h-[3px] w-8 rounded-full bg-stone-200" />

        <div class="flex items-start gap-2.5">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fce4f0]">
            <Icon icon="mynaui:ambulance-solid" class="text-[17px]" :style="{ color: AMBULANCE }" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-bold leading-tight">Ambulance</div>
            <div class="mt-0.5 flex items-center gap-1.5 text-[9px]">
              <span class="font-semibold text-[#dc2626]">7 unit</span>
              <span class="text-stone-400">Sleman</span>
            </div>
          </div>
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100">
            <Icon icon="lucide:share-2" class="text-[11px] text-stone-500" />
          </span>
        </div>

        <div class="mt-2.5 divide-y divide-stone-100">
          <div v-for="(u, i) in [
            { name: 'PSC 119 YES', org: 'Dinkes Kota Yogyakarta', tier: 'Resmi', eta: '6 min', dist: '3,8 km' },
            { name: 'PMI DIY', org: 'Palang Merah Indonesia', tier: 'Swasta', eta: '7 min', dist: '4,3 km' },
          ]" :key="u.name" class="flex items-start gap-2.5 py-2.5" :style="{ '--d': `${360 + i * 80}ms` }">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fce4f0]">
              <Icon icon="mynaui:ambulance-solid" class="text-[13px]" :style="{ color: AMBULANCE }" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 text-[11.5px] font-bold leading-tight">
                <span class="truncate">{{ u.name }}</span>
                <Icon icon="mdi:check-decagram" class="shrink-0 text-[11px] text-[#2f80ed]" />
              </div>
              <div class="truncate text-[9px] text-stone-400">{{ u.org }}</div>
              <div class="mt-1.5 flex flex-wrap gap-1">
                <span class="ps-chip text-emerald-700">{{ u.tier }}</span>
                <span class="ps-chip text-emerald-700">
                  <Icon icon="lucide:clock" class="text-[9px]" />{{ u.eta }}
                </span>
                <span class="ps-chip text-amber-700">
                  <Icon icon="lucide:navigation" class="text-[9px]" />{{ u.dist }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 1 — Report form -->
    <div v-else-if="screen === 1" class="h-full w-full bg-[#f7f6f4]">
      <div class="rounded-b-[24px] bg-white px-4 pb-3 pt-[52px] shadow-[0_10px_24px_-18px_rgba(28,25,23,0.5)]">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#fce4f0]">
            <Icon icon="lucide:clipboard-pen" class="text-[16px]" :style="{ color: AMBULANCE }" />
          </span>
          <div class="min-w-0">
            <div class="text-[13.5px] font-bold leading-tight">Buat laporan</div>
            <div class="text-[9.5px] text-stone-400">Isi laporan dengan benar</div>
          </div>
          <span class="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-stone-100">
            <Icon icon="lucide:x" class="text-[11px] text-stone-500" />
          </span>
        </div>
      </div>

      <div class="ps-in px-4 pt-3.5 text-center" style="--d: 60ms">
        <div class="text-[10px] text-stone-400">Permintaan bantuan</div>
        <div class="mt-0.5 text-[16px] font-bold tracking-[-0.02em]">PSC 119 YES</div>
        <div class="mt-1.5 flex items-center justify-center gap-1.5">
          <span class="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[9.5px] font-semibold">
            <Icon icon="mynaui:ambulance-solid" class="text-[11px]" :style="{ color: AMBULANCE }" />Ambulance
          </span>
          <span class="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-700">
            <Icon icon="lucide:clock" class="text-[10px]" />±7 menit
          </span>
        </div>
      </div>

      <div class="ps-in mx-4 mt-3 rounded-2xl bg-white px-3 py-2.5" style="--d: 120ms">
        <div class="flex items-center gap-2">
          <Icon icon="lucide:siren" class="text-[12px] text-[#dc2626]" />
          <span class="text-[10px] font-semibold">Darurat</span>
          <Icon icon="lucide:check-circle-2" class="ml-auto text-[13px] text-[#dc2626]" />
        </div>
        <div class="text-[9px] text-stone-400">Gawat darurat &amp; respon cepat</div>
      </div>

      <div class="ps-in mx-4 mt-2 divide-y divide-stone-100 rounded-2xl bg-white px-3" style="--d: 180ms">
        <div v-for="row in [
          { label: 'Pelapor', value: 'Dewi Anggraini · 0812-3456-7890', chip: false },
          { label: 'Kondisi korban', value: 'Triase · Merah', chip: true },
          { label: 'Foto', value: 'Belum ada', chip: false },
        ]" :key="row.label" class="flex items-center gap-2 py-2.5">
          <div class="min-w-0 flex-1">
            <div class="text-[9px] text-stone-400">{{ row.label }}</div>
            <div
              v-if="row.chip"
              class="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold text-[#b91c1c] ring-1 ring-[#f8d0d0]"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />{{ row.value }}
            </div>
            <div v-else class="truncate text-[11.5px] font-semibold">{{ row.value }}</div>
          </div>
          <Icon icon="lucide:chevron-right" class="text-[13px] text-stone-300" />
        </div>
      </div>

      <div class="ps-in absolute inset-x-3 bottom-4 flex gap-2" style="--d: 240ms">
        <span class="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#dc2626] text-[12px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(220,38,38,0.75)]">
          <Icon icon="lucide:send" class="text-[13px]" />Melaporkan
        </span>
        <span class="flex h-10 w-[74px] items-center justify-center gap-1 rounded-full bg-white text-[12px] font-bold text-stone-600 ring-1 ring-stone-200">
          <Icon icon="lucide:x" class="text-[13px]" />Batal
        </span>
      </div>
    </div>

    <!-- 2 — Live tracking -->
    <div v-else-if="screen === 2" class="h-full w-full bg-[#eef1ea]">
      <svg viewBox="0 0 268 560" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="268" height="560" fill="#eef1ea" />
        <path d="M-20 60 h130 v90 h-130 Z" fill="#dfe8d6" />
        <g stroke="#fff" fill="none" stroke-linecap="round">
          <path d="M-10 250 q120 -22 158 46 t130 34" stroke-width="11" />
          <path d="M62 -10 q16 180 -8 290 t14 290" stroke-width="8" />
          <path d="M206 -10 q-12 150 10 260" stroke-width="5" />
          <path d="M-10 430 q120 -20 164 14" stroke-width="5" />
        </g>
        <!-- travelled vs remaining route -->
        <path d="M56 372 Q 104 270 138 208 T 208 146" stroke="#2f80ed" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.22" />
        <path class="ps-route" d="M56 372 Q 104 270 138 208 T 208 146" stroke="#2f80ed" stroke-width="5" stroke-linecap="round" fill="none" />
      </svg>

      <div class="absolute left-[21%] top-[66%]">
        <span class="ps-ping absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2f80ed]/20" />
        <span class="relative block h-[15px] w-[15px] rounded-full border-[3px] border-white bg-[#2f80ed] shadow" />
      </div>

      <!-- Unit marker with its label, the way the list ranks them. Sits clear of
           the status pill above it. -->
      <div class="absolute right-[10%] top-[21%] flex flex-col items-center">
        <span class="ps-in mb-1.5 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2 py-1 shadow-[0_10px_22px_-12px_rgba(28,25,23,0.6)]" style="--d: 140ms">
          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-[#fce4f0]">
            <Icon icon="mynaui:ambulance-solid" class="text-[11px]" :style="{ color: AMBULANCE }" />
          </span>
          <span class="text-[9px] font-bold">PSC 119 YES</span>
          <span class="text-[9px] font-semibold text-emerald-600">6 min</span>
        </span>
        <span class="ps-move flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_-6px_rgba(28,25,23,0.5)] ring-2 ring-[#8b5cf6]">
          <Icon icon="mynaui:ambulance-solid" class="text-[15px]" :style="{ color: AMBULANCE }" />
        </span>
      </div>

      <div class="ps-in absolute inset-x-3 top-[52px] flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 shadow-[0_8px_20px_-10px_rgba(28,25,23,0.4)]" style="--d: 60ms">
        <span class="ps-blink h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span class="text-[9.5px] font-bold">Petugas dalam perjalanan</span>
        <span class="ml-auto lp-mono text-[9.5px] font-bold text-[#dc2626]">4 mnt</span>
      </div>

      <!-- Active ticket card -->
      <div class="ps-in absolute inset-x-2.5 bottom-2.5 rounded-[24px] bg-white p-3.5 shadow-[0_20px_44px_-16px_rgba(28,25,23,0.5)]" style="--d: 260ms">
        <div class="flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span class="text-[8.5px] font-bold uppercase tracking-[0.08em] text-stone-400">Tiket aktif</span>
          <span class="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-stone-100">
            <Icon icon="lucide:x" class="text-[10px] text-stone-500" />
          </span>
        </div>

        <div class="mt-2.5 flex items-center gap-2.5">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fce4f0]">
            <Icon icon="mynaui:ambulance-solid" class="text-[17px]" :style="{ color: AMBULANCE }" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-[12.5px] font-bold leading-tight">Menuju lokasi…</div>
            <div class="text-[9px] text-stone-400">BB-20260917-0001</div>
          </div>
        </div>

        <div class="mt-2.5 flex gap-1">
          <span v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full" :class="i <= 3 ? 'bg-emerald-500' : 'bg-stone-200'" />
        </div>

        <div class="mt-2.5 flex items-center gap-2.5 border-t border-stone-100 pt-2.5">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-[#dc2626] ring-1 ring-[#f8d0d0]">119</span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[11px] font-bold">PSC 119 YES</div>
            <div class="truncate text-[9px] text-stone-400">PSC 119 YES · Andi P.</div>
          </div>
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1c1917] text-white">
            <Icon icon="lucide:phone" class="text-[12px]" />
          </span>
        </div>
      </div>
    </div>

    <!-- 3 — Status timeline -->
    <div v-else-if="screen === 3" class="h-full w-full bg-white">
      <div class="ps-in px-5 pt-14">
        <div class="text-[10px] font-bold uppercase tracking-wide text-stone-400">Status tiket</div>
        <h4 class="lp-mono mt-1 text-[18px] font-semibold tracking-[-0.02em]">BB-20260917-0001</h4>
      </div>

      <ol class="relative mt-6 space-y-5 px-6">
        <span class="absolute bottom-3 left-[37px] top-3 w-px bg-stone-200" aria-hidden="true" />
        <li
          v-for="(t, i) in timeline"
          :key="t.title"
          class="ps-in relative flex items-start gap-3"
          :style="{ '--d': `${80 + i * 90}ms` }"
        >
          <span
            class="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white"
            :class="{
              'bg-emerald-500 text-white': t.state === 'done',
              'bg-[#1c1917] text-white': t.state === 'now',
              'bg-stone-100 text-stone-500': t.state === 'past',
            }"
          >
            <Icon :icon="t.icon" class="text-[12px]" />
          </span>
          <div>
            <div class="text-[12px] font-bold">{{ t.title }}</div>
            <div class="text-[10px] text-stone-400">{{ t.time }}</div>
          </div>
        </li>
      </ol>

      <div class="ps-in mx-5 mt-6 rounded-2xl border border-dashed border-stone-200 p-3" style="--d: 440ms">
        <div class="flex items-center gap-2">
          <Icon icon="lucide:link-2" class="text-[13px] text-stone-400" />
          <span class="lp-mono truncate text-[9.5px] text-stone-500">butuhbantuan.space/ticket/93cfe6</span>
          <span class="ml-auto rounded-full bg-stone-100 px-2 py-1 text-[9px] font-bold text-stone-600">Salin</span>
        </div>
        <div class="mt-2 text-[9.5px] leading-snug text-stone-400">
          Bagikan link ini supaya keluarga bisa ikut memantau.
        </div>
      </div>

      <div class="ps-in absolute inset-x-4 bottom-5 flex items-center gap-3 rounded-2xl bg-[#1c1917] p-3 text-white" style="--d: 520ms">
        <Icon icon="lucide:bell-ring" class="ps-ring text-[16px]" />
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold">Petugas sudah tiba</div>
          <div class="truncate text-[9.5px] text-white/60">PSC 119 YES · Andi P.</div>
        </div>
      </div>
    </div>

    <!-- 4 — Rating -->
    <div v-else class="h-full w-full bg-[#f7f6f4]">
      <div class="ps-in px-4 pt-[52px]">
        <div class="flex items-center gap-2.5 rounded-2xl bg-white p-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fce4f0]">
            <Icon icon="mynaui:ambulance-solid" class="text-[17px]" :style="{ color: AMBULANCE }" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-[12.5px] font-bold leading-tight">Selesai</div>
            <div class="text-[9px] text-stone-400">BB-20260917-0001</div>
          </div>
        </div>
        <div class="mt-2 flex gap-1">
          <span v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full bg-emerald-500" />
        </div>
      </div>

      <div class="ps-in mx-4 mt-2.5 rounded-2xl bg-white p-3" style="--d: 80ms">
        <div class="text-[12.5px] font-bold">Bagaimana penanganannya?</div>
        <div class="mt-0.5 text-[9.5px] leading-snug text-stone-400">
          Penilaianmu membantu kami menjaga kualitas unit.
        </div>

        <div class="mt-3 flex gap-2">
          <span class="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#dc2626]/10 py-2 text-[11px] font-semibold text-[#b91c1c]">
            <Icon icon="lucide:thumbs-up" class="text-[12px]" />Terbantu
          </span>
          <span class="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-semibold text-stone-500 ring-1 ring-stone-200">
            <Icon icon="lucide:thumbs-down" class="text-[12px]" />Kurang
          </span>
        </div>

        <div class="mt-2.5 rounded-xl bg-[#f7f6f4] p-2.5 text-[10px] leading-snug text-stone-600">
          Terima kasih PSC 119 YES, respon cepat dan komunikatif.
        </div>
      </div>

      <div class="ps-in mx-4 mt-2.5 rounded-2xl bg-white p-3" style="--d: 140ms">
        <div class="text-[10px] font-bold uppercase tracking-wide text-stone-400">Petugas</div>
        <div class="mt-2 flex items-center gap-2.5">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fce4f0] text-[11px] font-bold text-[#7c3aed]">AP</span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[11.5px] font-bold">Andi Pratama</div>
            <div class="truncate text-[9px] text-stone-400">PSC 119 YES · Ambulans</div>
          </div>
          <span class="flex items-center gap-0.5">
            <Icon v-for="s in 5" :key="s" icon="mdi:star" class="text-[14px]" :class="s <= 4 ? 'ps-star text-amber-400' : 'text-stone-200'" :style="{ '--d': `${200 + s * 110}ms` }" />
          </span>
        </div>
      </div>

      <div class="ps-in absolute inset-x-4 bottom-5" style="--d: 800ms">
        <div class="flex h-11 items-center justify-center rounded-full bg-[#1c1917] text-[12.5px] font-bold text-white">
          Kirim penilaian
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Entrance stagger — each element opts in with .ps-in and its own --d. */
.ps-in {
  animation: ps-in 0.5s var(--lp-ease) both;
  animation-delay: var(--d, 0ms);
}
@keyframes ps-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

/* Outline chip for tier / ETA / distance, matching the app's list rows. */
.ps-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border-radius: 999px;
  padding: 1.5px 6px;
  font-size: 9px;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px currentColor;
}

/* Own-position radar. */
.ps-ping {
  animation: ps-ping 2.6s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes ps-ping {
  0% {
    opacity: 0.75;
    transform: translate(-50%, -50%) scale(0.35);
  }
  70%,
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1);
  }
}

.ps-blink {
  animation: ps-blink 1.6s ease-in-out infinite;
}
@keyframes ps-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

/* Route draws itself, then the ambulance creeps along it. */
.ps-route {
  stroke-dasharray: 8 10;
  animation: ps-route 1.4s linear infinite;
}
@keyframes ps-route {
  to {
    stroke-dashoffset: -18;
  }
}
.ps-move {
  animation: ps-move 4.5s ease-in-out infinite;
}
@keyframes ps-move {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-5px, 9px);
  }
}

.ps-ring {
  transform-origin: 50% 10%;
  animation: ps-ring 3s ease-in-out infinite;
}
@keyframes ps-ring {
  0%,
  70%,
  100% {
    transform: rotate(0);
  }
  75%,
  85% {
    transform: rotate(12deg);
  }
  80%,
  90% {
    transform: rotate(-12deg);
  }
}

.ps-star {
  animation: ps-star 0.45s var(--lp-ease) both;
  animation-delay: var(--d, 0ms);
}
@keyframes ps-star {
  0% {
    opacity: 0;
    transform: scale(0.4) rotate(-25deg);
  }
  70% {
    transform: scale(1.18) rotate(4deg);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
