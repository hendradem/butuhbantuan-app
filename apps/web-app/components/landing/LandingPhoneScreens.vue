<script setup lang="ts">
/**
 * The six citizen-app screens shown inside the phone on /landing, one per
 * feature step. Stylised, not pixel-perfect.
 *
 * Each screen is keyed by the parent, so it remounts on every step change —
 * that is what replays the `.ps-in` entrance stagger. All motion here is
 * decorative and is disabled globally by the reduced-motion rule in
 * landing.css.
 */
import { Icon } from "@iconify/vue";

defineProps<{ screen: number }>();

const hospitals = [
  { name: "RSUP Sardjito", dist: "1,2 km", open: true },
  { name: "RSUD Sleman", dist: "2,4 km", open: true },
  { name: "RS Bethesda", dist: "3,1 km", open: true },
  { name: "RS PKU Yogya", dist: "4,5 km", open: false },
];

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

    <!-- 0 — Map with nearby units -->
    <div v-if="screen === 0" class="h-full w-full bg-[#eceee8]">
      <svg viewBox="0 0 268 560" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="268" height="560" fill="#eceee8" />
        <path d="M168 8 h110 v96 h-72 Z" fill="#dfe8d6" />
        <path d="M-20 402 q60 -26 118 6 t150 -10 v182 h-268 Z" fill="#e4e7de" />
        <path d="M-10 120 q70 34 120 8 t160 26" stroke="#cfe0ea" stroke-width="13" fill="none" stroke-linecap="round" />
        <g stroke="#fff" fill="none" stroke-linecap="round">
          <path d="M-10 196 q96 -22 148 14 t140 -6" stroke-width="11" />
          <path d="M96 -10 q14 150 -10 260 t18 320" stroke-width="9" />
          <path d="M198 -10 q-10 180 14 300 t-6 280" stroke-width="6" />
          <path d="M-10 330 q80 16 150 -8 t138 18" stroke-width="6" />
          <path d="M-10 470 q110 -18 160 12 t128 -6" stroke-width="5" />
          <path d="M40 -10 q6 120 -18 200" stroke-width="3.5" />
          <path d="M148 210 q22 84 -4 150" stroke-width="3.5" />
        </g>
        <g fill="#e3e6dd">
          <rect x="16" y="226" width="38" height="26" rx="4" />
          <rect x="22" y="262" width="26" height="20" rx="4" />
          <rect x="118" y="248" width="30" height="22" rx="4" />
          <rect x="214" y="212" width="34" height="28" rx="4" />
          <rect x="126" y="420" width="40" height="24" rx="4" />
          <rect x="30" y="128" width="30" height="22" rx="4" />
        </g>
      </svg>

      <!-- Own position -->
      <div class="absolute left-1/2 top-[41%] -translate-x-1/2 -translate-y-1/2">
        <span class="ps-ping absolute left-1/2 top-1/2 h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/20" />
        <span class="absolute left-1/2 top-1/2 h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/15" />
        <span class="relative block h-[15px] w-[15px] rounded-full border-[3px] border-white bg-sky-500 shadow-[0_2px_8px_rgba(2,132,199,0.55)]" />
      </div>

      <!-- Nearby units -->
      <div class="ps-in absolute left-[16%] top-[22%] flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 shadow-[0_6px_16px_-6px_rgba(28,25,23,0.45)]" style="--d: 90ms">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#fef2f2]">
          <Icon icon="mynaui:ambulance-solid" class="text-[13px] text-[#DC2626]" />
        </span>
        <span class="text-[8.5px] font-bold">1,2 km</span>
      </div>
      <div class="ps-in absolute right-[10%] top-[31%] flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_6px_16px_-6px_rgba(28,25,23,0.45)]" style="--d: 180ms">
        <Icon icon="lucide:heart-pulse" class="text-[15px] text-rose-500" />
      </div>
      <div class="ps-in absolute bottom-[41%] left-[26%] flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_6px_16px_-6px_rgba(28,25,23,0.45)]" style="--d: 270ms">
        <Icon icon="lucide:flame" class="text-[15px] text-amber-500" />
      </div>

      <!-- Filter chips -->
      <div class="ps-in absolute inset-x-3 top-[52px] flex gap-1.5" style="--d: 60ms">
        <span class="rounded-full bg-[#1c1917] px-2.5 py-1 text-[8.5px] font-bold text-white shadow-sm">Semua</span>
        <span class="rounded-full bg-white/90 px-2.5 py-1 text-[8.5px] font-semibold text-stone-500 shadow-sm">Ambulans</span>
        <span class="rounded-full bg-white/90 px-2.5 py-1 text-[8.5px] font-semibold text-stone-500 shadow-sm">Damkar</span>
      </div>

      <!-- Nearest unit sheet -->
      <div class="ps-in absolute inset-x-3 bottom-3 rounded-[22px] bg-white p-3.5 shadow-[0_16px_36px_-14px_rgba(28,25,23,0.45)]" style="--d: 340ms">
        <span class="mx-auto mb-2.5 block h-[3px] w-8 rounded-full bg-stone-200" />
        <div class="mb-2 flex items-center gap-1.5">
          <span class="ps-blink h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span class="text-[9px] font-bold uppercase tracking-wide text-stone-400">Terdekat dari kamu</span>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fef2f2]">
            <Icon icon="mynaui:ambulance-solid" class="text-[17px] text-[#DC2626]" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[12.5px] font-bold">PSC 119 Sleman</div>
            <div class="text-[10px] text-stone-400">Ambulans · 1,2 km</div>
          </div>
          <span class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">3 mnt</span>
        </div>
        <div class="mt-3 flex h-9 items-center justify-center rounded-xl bg-[#DC2626] text-[11.5px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(220,38,38,0.8)]">
          Minta bantuan
        </div>
      </div>
    </div>

    <!-- 1 — Report form -->
    <div v-else-if="screen === 1" class="h-full w-full bg-white">
      <div class="ps-in px-5 pt-14">
        <div class="text-[10px] font-bold uppercase tracking-wide text-stone-400">Laporan baru</div>
        <h4 class="mt-1 text-[19px] font-bold tracking-[-0.03em]">Butuh ambulans</h4>
      </div>
      <div class="mt-4 space-y-2.5 px-5">
        <div class="ps-in rounded-2xl bg-stone-100/80 p-3" style="--d: 80ms">
          <div class="text-[9px] font-bold uppercase tracking-wider text-stone-400">Keadaan</div>
          <div class="mt-1 text-[12px] leading-snug">
            Kecelakaan motor, luka di kepala.<span class="ps-caret" />
          </div>
        </div>
        <div class="ps-in rounded-2xl bg-stone-100/80 p-3" style="--d: 160ms">
          <div class="flex items-center gap-1.5">
            <Icon icon="lucide:map-pin" class="text-[12px] text-[#DC2626]" />
            <div class="text-[9px] font-bold uppercase tracking-wider text-stone-400">Lokasi otomatis</div>
            <span class="ml-auto flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
              <Icon icon="lucide:check" class="text-[8px]" /> Terkunci
            </span>
          </div>
          <div class="mt-1 text-[12px] leading-snug">Jl. Kaliurang km 12, Sleman</div>
        </div>
        <div class="ps-in grid grid-cols-3 gap-2" style="--d: 240ms">
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
      <div class="ps-in absolute inset-x-5 bottom-6" style="--d: 320ms">
        <div class="mb-2 text-center text-[10px] text-stone-400">Tanpa daftar akun</div>
        <div class="flex h-11 items-center justify-center rounded-2xl bg-[#DC2626] text-[13px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(220,38,38,0.6)]">
          Kirim laporan
        </div>
      </div>
    </div>

    <!-- 2 — Live tracking -->
    <div v-else-if="screen === 2" class="h-full w-full bg-[#eceee8]">
      <svg viewBox="0 0 268 560" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="268" height="560" fill="#eceee8" />
        <path d="M-20 60 h130 v90 h-130 Z" fill="#dfe8d6" />
        <g stroke="#fff" fill="none" stroke-linecap="round">
          <path d="M-10 250 q120 -22 158 46 t130 34" stroke-width="11" />
          <path d="M62 -10 q16 180 -8 290 t14 290" stroke-width="8" />
          <path d="M206 -10 q-12 150 10 260" stroke-width="5" />
          <path d="M-10 430 q120 -20 164 14" stroke-width="5" />
        </g>
        <g fill="#e3e6dd">
          <rect x="150" y="300" width="34" height="26" rx="4" />
          <rect x="20" y="350" width="28" height="22" rx="4" />
          <rect x="190" y="430" width="36" height="26" rx="4" />
        </g>
        <!-- travelled vs remaining route -->
        <path d="M56 372 Q 104 270 138 208 T 208 92" stroke="#DC2626" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.25" />
        <path
          class="ps-route"
          d="M56 372 Q 104 270 138 208 T 208 92"
          stroke="#DC2626"
          stroke-width="4.5"
          stroke-linecap="round"
          fill="none"
        />
      </svg>

      <div class="absolute left-[21%] top-[66%]">
        <span class="ps-ping absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/20" />
        <span class="relative block h-[15px] w-[15px] rounded-full border-[3px] border-white bg-sky-500 shadow" />
      </div>
      <div class="ps-move absolute right-[19%] top-[13%] flex h-9 w-9 items-center justify-center rounded-full bg-[#DC2626] shadow-[0_8px_18px_-6px_rgba(220,38,38,0.7)]">
        <Icon icon="mynaui:ambulance-solid" class="text-[16px] text-white" />
      </div>

      <div class="ps-in absolute inset-x-3 top-[52px] flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 shadow-[0_8px_20px_-10px_rgba(28,25,23,0.4)]" style="--d: 60ms">
        <span class="ps-blink h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
        <span class="text-[9.5px] font-bold">Petugas dalam perjalanan</span>
        <span class="ml-auto lp-mono text-[9.5px] font-bold text-[#DC2626]">4 mnt</span>
      </div>

      <div class="ps-in absolute inset-x-3 bottom-3 rounded-[22px] bg-white p-4 shadow-[0_16px_36px_-14px_rgba(28,25,23,0.45)]" style="--d: 280ms">
        <div class="flex items-center gap-2.5">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fef2f2] text-[13px] font-bold text-[#b91c1c]">
            AP
          </span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[12.5px] font-bold">PSC 119 Sleman</div>
            <div class="text-[10px] text-stone-400">Andi P. · AB 1234 XY</div>
          </div>
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1917] text-white">
            <Icon icon="lucide:phone" class="text-[12px]" />
          </span>
        </div>
        <div class="mt-3.5 grid grid-cols-3 gap-1">
          <span class="h-1 rounded-full bg-[#DC2626]" />
          <span class="ps-grow h-1 origin-left rounded-full bg-[#DC2626]" />
          <span class="h-1 rounded-full bg-stone-200" />
        </div>
        <div class="mt-2 flex items-center justify-between text-[9.5px] text-stone-400">
          <span>Diterima</span>
          <span class="font-bold text-[#1c1917]">Menuju lokasi</span>
          <span>Tiba</span>
        </div>
      </div>
    </div>

    <!-- 3 — Status timeline -->
    <div v-else-if="screen === 3" class="h-full w-full bg-white">
      <div class="ps-in px-5 pt-14">
        <div class="text-[10px] font-bold uppercase tracking-wide text-stone-400">Status tiket</div>
        <h4 class="lp-mono mt-1 text-[18px] font-semibold tracking-[-0.02em]">TKT-2591</h4>
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
      <div class="ps-in mx-5 mt-7 rounded-2xl border border-dashed border-stone-200 p-3" style="--d: 440ms">
        <div class="flex items-center gap-2">
          <Icon icon="lucide:link-2" class="text-[13px] text-stone-400" />
          <span class="lp-mono truncate text-[9.5px] text-stone-500">butuhbantuan.space/ticket/2591</span>
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
          <div class="truncate text-[9.5px] text-white/60">PSC 119 Sleman · Andi P.</div>
        </div>
      </div>
    </div>

    <!-- 4 — ER contacts -->
    <div v-else-if="screen === 4" class="h-full w-full bg-[#fafaf9]">
      <div class="ps-in px-5 pt-14">
        <div class="text-[10px] font-bold uppercase tracking-wide text-stone-400">Rumah sakit terdekat</div>
        <h4 class="mt-1 text-[19px] font-bold tracking-[-0.03em]">Kontak IGD</h4>
      </div>
      <div class="mt-4 space-y-2 px-4">
        <div
          v-for="(rs, i) in hospitals"
          :key="rs.name"
          class="ps-in flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_0_0_1px_rgba(28,25,23,0.05)]"
          :style="{ '--d': `${80 + i * 80}ms` }"
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
      <div class="ps-in px-5 pt-14">
        <div class="lp-mono text-[10px] font-medium uppercase tracking-wide text-stone-400">Selesai · TKT-2591</div>
        <h4 class="mt-1 text-[19px] font-bold tracking-[-0.03em]">Beri rating petugas</h4>
      </div>
      <div class="mt-7 px-5 text-center">
        <div class="ps-in mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#fef2f2] text-[17px] font-bold text-[#b91c1c]" style="--d: 80ms">
          AP
        </div>
        <div class="ps-in mt-3 text-[13px] font-bold" style="--d: 140ms">Andi Pratama</div>
        <div class="ps-in text-[10px] text-stone-400" style="--d: 180ms">PSC 119 Sleman · Ambulans</div>
        <div class="mt-5 flex items-center justify-center gap-1.5">
          <!-- Solid star: lucide:star hard-codes fill="none" on its path, so an
               inherited fill cannot colour it in. -->
          <Icon
            v-for="s in 5"
            :key="s"
            icon="mdi:star"
            class="text-[26px]"
            :class="s <= 4 ? 'ps-star text-amber-400' : 'text-stone-200'"
            :style="{ '--d': `${240 + s * 110}ms` }"
          />
        </div>
        <div class="ps-in mt-2 text-[10px] font-bold uppercase tracking-wide text-stone-400" style="--d: 760ms">Sangat membantu</div>
        <div class="ps-in mt-5 rounded-2xl bg-stone-100/80 p-3 text-left" style="--d: 820ms">
          <div class="text-[9px] font-bold uppercase tracking-wide text-stone-400">Komentar</div>
          <div class="mt-1 text-[11px] leading-snug text-stone-600">
            Datang cepat, petugasnya tenang dan sigap. Terima kasih.
          </div>
        </div>
      </div>
      <div class="ps-in absolute inset-x-5 bottom-6" style="--d: 880ms">
        <div class="flex h-11 items-center justify-center rounded-2xl bg-[#1c1917] text-[13px] font-bold text-white">
          Kirim rating
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

.ps-grow {
  animation: ps-grow 2.8s var(--lp-ease) infinite;
}
@keyframes ps-grow {
  0% {
    transform: scaleX(0.1);
  }
  60%,
  100% {
    transform: scaleX(1);
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

/* Text caret in the report form, so the screen reads as "being filled in". */
.ps-caret {
  display: inline-block;
  width: 1.5px;
  height: 10px;
  margin-left: 2px;
  vertical-align: -1px;
  background: #dc2626;
  animation: ps-caret 1.1s steps(1) infinite;
}
@keyframes ps-caret {
  50% {
    opacity: 0;
  }
}
</style>
