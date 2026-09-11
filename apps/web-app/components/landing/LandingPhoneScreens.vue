<script setup lang="ts">
/**
 * The six citizen-app screens shown inside the phone on /landing, one per
 * feature step. Stylised, not pixel-perfect.
 */
import { Icon } from "@iconify/vue";

defineProps<{ screen: number }>();

const hospitals = [
  { name: "RSUP Sardjito", dist: "1,2 km", open: true },
  { name: "RSUD Sleman", dist: "2,4 km", open: true },
  { name: "RS Bethesda", dist: "3,1 km", open: true },
  { name: "RS PKU Yogya", dist: "4,5 km", open: false },
];
</script>

<template>
  <div class="relative h-full w-full text-[#1c1917]">
    <!-- Status bar -->
    <div class="absolute inset-x-0 top-0 z-10 flex h-11 items-center justify-between px-6 pt-3 text-[10px] font-semibold">
      <span>09:41</span>
      <span class="flex items-center gap-1">
        <Icon icon="lucide:signal" class="text-[11px]" />
        <Icon icon="lucide:battery-full" class="text-[12px]" />
      </span>
    </div>

    <!-- 0 — Map with nearby units -->
    <div v-if="screen === 0" class="h-full w-full bg-[#eef0ea]">
      <svg viewBox="0 0 268 560" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M-10 170 Q 90 150 150 190 T 290 170" stroke="#fff" stroke-width="10" fill="none" />
        <path d="M80 -10 Q 100 160 70 300 T 110 580" stroke="#fff" stroke-width="8" fill="none" />
        <path d="M190 -10 L 200 580" stroke="#fff" stroke-width="5" fill="none" />
        <rect x="120" y="60" width="50" height="40" rx="6" fill="#e2e6dc" />
        <rect x="16" y="220" width="40" height="56" rx="6" fill="#e2e6dc" />
      </svg>
      <div class="absolute left-1/2 top-[40%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/15" />
      <div class="absolute left-1/2 top-[40%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-sky-500 shadow" />
      <div class="absolute left-[24%] top-[24%] flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
        <Icon icon="mynaui:ambulance-solid" class="text-[15px] text-[#DC2626]" />
      </div>
      <div class="absolute right-[18%] top-[33%] flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
        <Icon icon="lucide:heart-pulse" class="text-[15px] text-rose-500" />
      </div>
      <div class="absolute bottom-[40%] left-[40%] flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
        <Icon icon="lucide:flame" class="text-[15px] text-amber-500" />
      </div>
      <div class="absolute inset-x-3 bottom-3 rounded-[22px] bg-white p-3.5 shadow-[0_12px_30px_-10px_rgba(28,25,23,0.3)]">
        <div class="mb-2 flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span class="text-[9.5px] font-semibold uppercase tracking-wide text-stone-500">Terdekat dari kamu</span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[12.5px] font-bold">PSC 119 Sleman</div>
            <div class="text-[10px] text-stone-500">Ambulans · 1,2 km</div>
          </div>
          <span class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">3 mnt</span>
        </div>
        <div class="mt-3 flex h-9 items-center justify-center rounded-xl bg-[#DC2626] text-[11.5px] font-bold text-white">
          Minta bantuan
        </div>
      </div>
    </div>

    <!-- 1 — Report form -->
    <div v-else-if="screen === 1" class="h-full w-full bg-white">
      <div class="px-5 pt-14">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Laporan baru</div>
        <h4 class="mt-1 text-[19px] font-bold tracking-[-0.03em]">Butuh ambulans</h4>
      </div>
      <div class="mt-4 space-y-2.5 px-5">
        <div class="rounded-2xl bg-stone-100/80 p-3">
          <div class="text-[9px] font-semibold uppercase tracking-wider text-stone-400">Keadaan</div>
          <div class="mt-1 text-[12px] leading-snug">Kecelakaan motor, luka di kepala.</div>
        </div>
        <div class="rounded-2xl bg-stone-100/80 p-3">
          <div class="flex items-center gap-1.5">
            <Icon icon="lucide:map-pin" class="text-[12px] text-[#DC2626]" />
            <div class="text-[9px] font-semibold uppercase tracking-wider text-stone-400">Lokasi otomatis</div>
          </div>
          <div class="mt-1 text-[12px] leading-snug">Jl. Kaliurang km 12, Sleman</div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-stone-200 to-stone-100">
            <Icon icon="lucide:image" class="text-[16px] text-stone-400" />
          </div>
          <div class="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-stone-200 to-stone-100">
            <Icon icon="lucide:image" class="text-[16px] text-stone-400" />
          </div>
          <div class="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-stone-200">
            <Icon icon="lucide:camera" class="text-[16px] text-stone-400" />
          </div>
        </div>
      </div>
      <div class="absolute inset-x-5 bottom-6">
        <div class="mb-2 text-center text-[10px] text-stone-400">Tanpa daftar akun</div>
        <div class="flex h-11 items-center justify-center rounded-2xl bg-[#DC2626] text-[13px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(220,38,38,0.6)]">
          Kirim laporan
        </div>
      </div>
    </div>

    <!-- 2 — Live tracking -->
    <div v-else-if="screen === 2" class="h-full w-full bg-[#eef0ea]">
      <svg viewBox="0 0 268 560" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M-10 250 Q 120 230 150 300 T 290 330" stroke="#fff" stroke-width="10" fill="none" />
        <path d="M60 360 Q 110 260 140 200 T 210 90" stroke="#DC2626" stroke-width="4" stroke-linecap="round" fill="none" stroke-dasharray="1 8" />
      </svg>
      <div class="absolute left-[20%] top-[62%] h-5 w-5 rounded-full border-[3px] border-white bg-sky-500 shadow" />
      <div class="absolute right-[19%] top-[13%] flex h-9 w-9 items-center justify-center rounded-full bg-[#DC2626] shadow-[0_6px_14px_-4px_rgba(220,38,38,0.6)]">
        <Icon icon="mynaui:ambulance-solid" class="text-[16px] text-white" />
      </div>
      <div class="absolute inset-x-3 bottom-3 rounded-[22px] bg-white p-4 shadow-[0_12px_30px_-10px_rgba(28,25,23,0.3)]">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-[9.5px] font-semibold uppercase tracking-wide text-emerald-600">Dalam perjalanan</span>
          <span class="text-[10px] font-semibold text-stone-500">ETA 4 mnt</span>
        </div>
        <div class="text-[13px] font-bold">PSC 119 Sleman</div>
        <div class="mt-3 grid grid-cols-3 gap-1">
          <span class="h-1 rounded-full bg-[#DC2626]" />
          <span class="h-1 rounded-full bg-[#DC2626]" />
          <span class="h-1 rounded-full bg-stone-200" />
        </div>
        <div class="mt-2 flex items-center justify-between text-[9.5px] text-stone-400">
          <span>Diterima</span>
          <span class="font-semibold text-[#1c1917]">Menuju lokasi</span>
          <span>Tiba</span>
        </div>
      </div>
    </div>

    <!-- 3 — Status timeline -->
    <div v-else-if="screen === 3" class="h-full w-full bg-white">
      <div class="px-5 pt-14">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Status tiket</div>
        <h4 class="mt-1 lp-mono text-[18px] font-semibold tracking-[-0.02em]">TKT-2591</h4>
      </div>
      <ol class="relative mt-6 space-y-5 px-6">
        <span class="absolute bottom-3 left-[37px] top-3 w-px bg-stone-200" aria-hidden="true" />
        <li class="relative flex items-start gap-3">
          <span class="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white">
            <Icon icon="lucide:check" class="text-[13px]" />
          </span>
          <div>
            <div class="text-[12px] font-bold">Petugas tiba</div>
            <div class="text-[10px] text-stone-400">Baru saja</div>
          </div>
        </li>
        <li class="relative flex items-start gap-3">
          <span class="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1c1917] text-white ring-4 ring-white">
            <Icon icon="lucide:navigation" class="text-[12px]" />
          </span>
          <div>
            <div class="text-[12px] font-bold">Menuju lokasi</div>
            <div class="text-[10px] text-stone-400">2 menit lalu</div>
          </div>
        </li>
        <li class="relative flex items-start gap-3">
          <span class="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 ring-4 ring-white">
            <Icon icon="lucide:phone-incoming" class="text-[12px]" />
          </span>
          <div>
            <div class="text-[12px] font-bold">Order diterima unit</div>
            <div class="text-[10px] text-stone-400">5 menit lalu</div>
          </div>
        </li>
        <li class="relative flex items-start gap-3">
          <span class="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 ring-4 ring-white">
            <Icon icon="lucide:send" class="text-[12px]" />
          </span>
          <div>
            <div class="text-[12px] font-bold">Laporan terkirim</div>
            <div class="text-[10px] text-stone-400">6 menit lalu</div>
          </div>
        </li>
      </ol>
      <div class="absolute inset-x-4 bottom-5 flex items-center gap-3 rounded-2xl bg-[#1c1917] p-3 text-white">
        <Icon icon="lucide:bell-ring" class="text-[16px]" />
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold">Petugas sudah tiba</div>
          <div class="truncate text-[9.5px] text-white/60">PSC 119 Sleman · Andi P.</div>
        </div>
      </div>
    </div>

    <!-- 4 — ER contacts -->
    <div v-else-if="screen === 4" class="h-full w-full bg-[#fafaf9]">
      <div class="px-5 pt-14">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Rumah sakit terdekat</div>
        <h4 class="mt-1 text-[19px] font-bold tracking-[-0.03em]">Kontak IGD</h4>
      </div>
      <div class="mt-4 space-y-2 px-4">
        <div
          v-for="rs in hospitals"
          :key="rs.name"
          class="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_0_0_1px_rgba(28,25,23,0.05)]"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Icon icon="lucide:hospital" class="text-[16px]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[12px] font-bold">{{ rs.name }}</div>
            <div class="flex items-center gap-1 text-[10px] text-stone-400">
              <span class="h-1.5 w-1.5 rounded-full" :class="rs.open ? 'bg-emerald-500' : 'bg-stone-300'" />
              IGD {{ rs.open ? "24 jam" : "tutup" }} · {{ rs.dist }}
            </div>
          </div>
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1c1917] text-white">
            <Icon icon="lucide:phone" class="text-[12px]" />
          </span>
        </div>
      </div>
    </div>

    <!-- 5 — Rating -->
    <div v-else class="h-full w-full bg-white">
      <div class="px-5 pt-14">
        <div class="lp-mono text-[10px] font-medium uppercase tracking-wide text-stone-400">Selesai · TKT-2591</div>
        <h4 class="mt-1 text-[19px] font-bold tracking-[-0.03em]">Beri rating petugas</h4>
      </div>
      <div class="mt-7 px-5 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#fef2f2] text-[17px] font-bold text-[#b91c1c]">
          AP
        </div>
        <div class="mt-3 text-[13px] font-bold">Andi Pratama</div>
        <div class="text-[10px] text-stone-400">PSC 119 Sleman · Ambulans</div>
        <div class="mt-5 flex items-center justify-center gap-1.5">
          <Icon
            v-for="s in 5"
            :key="s"
            icon="lucide:star"
            class="text-[24px]"
            :class="s <= 4 ? 'text-amber-400' : 'text-stone-200'"
            style="fill: currentColor"
          />
        </div>
        <div class="mt-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Sangat membantu</div>
        <div class="mt-5 rounded-2xl bg-stone-100/80 p-3 text-left">
          <div class="text-[9px] font-semibold uppercase tracking-wide text-stone-400">Komentar</div>
          <div class="mt-1 text-[11px] leading-snug text-stone-600">
            Datang cepat, petugasnya tenang dan sigap. Terima kasih.
          </div>
        </div>
      </div>
      <div class="absolute inset-x-5 bottom-6">
        <div class="flex h-11 items-center justify-center rounded-2xl bg-[#1c1917] text-[13px] font-bold text-white">
          Kirim rating
        </div>
      </div>
    </div>
  </div>
</template>
