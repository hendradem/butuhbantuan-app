<script setup lang="ts">
/**
 * Stylised mockups of each dashboard tab used by the /landing showcase.
 * Not pixel-perfect — enough visual language to communicate "this is what
 * the {feature} screen looks like".
 */
import { Icon } from "@iconify/vue";

defineProps<{ variant: number }>();

const sidebarItems = [
  { label: "Overview", icon: "lucide:layout-dashboard" },
  { label: "Order masuk", icon: "lucide:clipboard-list" },
  { label: "Peta langsung", icon: "lucide:map" },
  { label: "Kinerja", icon: "lucide:bar-chart-3" },
  { label: "Cek armada", icon: "lucide:clipboard-check" },
  { label: "Rumah sakit", icon: "lucide:hospital" },
];

// Which sidebar row is highlighted per variant.
const activeIdxByVariant = [1, 2, 3, 4, 5];
</script>

<template>
  <div class="flex h-full w-full bg-[#fafaf9] text-[#1c1917]">
    <!-- Sidebar -->
    <aside class="hidden w-[172px] shrink-0 border-r border-[#ecebe8] bg-white p-3.5 md:block">
      <div class="mb-6 flex items-center gap-2">
        <div class="flex h-6 w-6 items-center justify-center rounded-md bg-[#DC2626]">
          <Icon icon="mynaui:ambulance-solid" class="text-[11px] text-white" />
        </div>
        <span class="text-[12px] font-bold tracking-tight">butuhbantuan</span>
      </div>
      <div class="space-y-0.5">
        <div
          v-for="(item, i) in sidebarItems"
          :key="i"
          class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px]"
          :class="
            i === activeIdxByVariant[variant]
              ? 'bg-[#fef2f2] font-semibold text-[#b91c1c]'
              : 'text-gray-500'
          "
        >
          <Icon :icon="item.icon" class="text-[13px]" />
          <span>{{ item.label }}</span>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="min-w-0 flex-1 overflow-hidden p-5">
      <!-- Variant 0: Pesanan (Kanban) -->
      <div v-if="variant === 0" class="flex h-full flex-col">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <div class="text-[9px] font-semibold uppercase tracking-[2px] text-gray-400">Order</div>
            <h4 class="mt-1 text-[16px] font-bold tracking-[-0.3px]">Order masuk</h4>
          </div>
          <button class="rounded-lg bg-[#DC2626] px-3 py-1.5 text-[10px] font-semibold text-white">
            + Buat tiket
          </button>
        </div>
        <div class="grid min-w-0 flex-1 grid-cols-4 gap-2.5">
          <div v-for="col in ['Baru', 'Menuju', 'Di lokasi', 'Selesai']" :key="col" class="min-w-0">
            <div class="mb-2 flex items-center gap-1.5">
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="{
                  'bg-red-500': col === 'Baru',
                  'bg-amber-500': col === 'Menuju',
                  'bg-blue-500': col === 'Di lokasi',
                  'bg-emerald-500': col === 'Selesai',
                }"
              />
              <span class="text-[10px] font-bold">{{ col }}</span>
              <span class="text-[9px] text-gray-400">{{ col === 'Baru' ? 4 : col === 'Menuju' ? 2 : col === 'Di lokasi' ? 3 : 8 }}</span>
            </div>
            <div class="space-y-1.5">
              <div v-for="n in 3" :key="n" class="rounded-lg border border-[#e7e5e4] bg-white p-2 shadow-sm">
                <div class="mb-1.5 flex items-center gap-1">
                  <span
                    class="rounded px-1 py-0.5 text-[7px] font-bold"
                    :class="n === 1 ? 'bg-red-100 text-red-700' : n === 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
                  >
                    {{ n === 1 ? 'MERAH' : n === 2 ? 'KUNING' : 'HIJAU' }}
                  </span>
                </div>
                <div class="mb-2 h-1 w-14 rounded-full bg-[#eeecea]" />
                <div class="mb-2 h-1 w-20 rounded-full bg-[#f3f2f0]" />
                <div class="flex items-center justify-between">
                  <span class="rounded bg-[#fef2f2] px-1.5 py-0.5 text-[7px] font-semibold text-[#b91c1c]">TKT-{{ 2500 + n }}</span>
                  <div class="flex h-4 w-4 items-center justify-center rounded-full bg-[#fecaca] text-[6px] font-bold">AM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Variant 1: Live Map -->
      <div v-else-if="variant === 1" class="flex h-full flex-col">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <div class="text-[9px] font-semibold uppercase tracking-[2px] text-gray-400">Langsung</div>
            <h4 class="mt-1 text-[16px] font-bold tracking-[-0.3px]">Peta Operasional</h4>
          </div>
          <div class="flex gap-1.5">
            <span class="rounded-md bg-[#fef2f2] px-2 py-1 text-[9px] font-semibold text-[#b91c1c]">Peta</span>
            <span class="rounded-md bg-white px-2 py-1 text-[9px] text-gray-500">List</span>
          </div>
        </div>
        <div class="relative flex-1 overflow-hidden rounded-xl bg-[#e6edee]">
          <!-- Fake map grid -->
          <svg viewBox="0 0 400 300" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#d3dcdc" stroke-width="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <!-- Roads -->
            <path d="M 0 200 Q 100 180 200 190 T 400 170" stroke="#b8c4c4" stroke-width="6" fill="none" />
            <path d="M 150 0 Q 160 100 145 200 T 130 300" stroke="#b8c4c4" stroke-width="6" fill="none" />
            <!-- Water -->
            <path d="M 300 0 L 400 0 L 400 100 Q 350 80 300 60 Z" fill="#c1d9e0" />
          </svg>
          <!-- Markers -->
          <div class="absolute left-[22%] top-[35%] flex h-8 w-8 items-center justify-center rounded-full bg-[#D93025] shadow-lg">
            <Icon icon="mynaui:ambulance-solid" class="text-[14px] text-white" />
          </div>
          <div class="absolute left-[55%] top-[55%] flex h-7 w-7 items-center justify-center rounded-full bg-[#0ea5e9] shadow-lg">
            <Icon icon="lucide:heart-pulse" class="text-[13px] text-white" />
          </div>
          <div class="absolute right-[15%] top-[25%] flex h-7 w-7 items-center justify-center rounded-full bg-[#f59e0b] shadow-lg">
            <Icon icon="lucide:flame" class="text-[13px] text-white" />
          </div>
          <div class="absolute right-[25%] bottom-[20%] flex h-7 w-7 items-center justify-center rounded-full bg-[#10b981] shadow-lg">
            <Icon icon="lucide:shield" class="text-[13px] text-white" />
          </div>
          <!-- Info card -->
          <div class="absolute right-3 top-3 w-52 rounded-xl border border-black/5 bg-white p-3 shadow-lg">
            <div class="mb-1.5 flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span class="text-[9px] font-bold uppercase tracking-wide text-gray-500">Bertugas</span>
            </div>
            <div class="text-[11px] font-bold">PSC 119 Sleman</div>
            <div class="text-[9px] text-gray-500">Menuju TKT-2591 · 4 min</div>
          </div>
        </div>
      </div>

      <!-- Variant 2: Kinerja -->
      <div v-else-if="variant === 2" class="flex h-full flex-col">
        <div class="mb-4">
          <div class="text-[9px] font-semibold uppercase tracking-[2px] text-gray-400">Kinerja</div>
          <h4 class="mt-1 text-[16px] font-bold tracking-[-0.3px]">Kinerja · 7 hari terakhir</h4>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div v-for="stat in [{ v: '4.2 min', l: 'Rata-rata respons' }, { v: '218', l: 'Tiket selesai' }, { v: '96%', l: 'Tepat waktu' }]" :key="stat.l" class="rounded-xl border border-[#e7e5e4] bg-white p-3">
            <div class="text-[9px] text-gray-400">{{ stat.l }}</div>
            <div class="mt-1 text-[16px] font-bold tracking-[-0.3px]">{{ stat.v }}</div>
          </div>
        </div>
        <div class="mt-3 flex-1 rounded-xl border border-[#e7e5e4] bg-white p-3">
          <div class="mb-3 flex items-center justify-between">
            <div class="text-[10px] font-bold">Waktu respons per jam</div>
            <div class="text-[9px] text-gray-400">7 hari</div>
          </div>
          <svg viewBox="0 0 400 150" class="h-32 w-full" preserveAspectRatio="none">
            <path d="M 0 120 L 40 100 L 80 110 L 120 70 L 160 85 L 200 55 L 240 65 L 280 40 L 320 55 L 360 30 L 400 45" stroke="#DC2626" stroke-width="2.5" fill="none" />
            <path d="M 0 120 L 40 100 L 80 110 L 120 70 L 160 85 L 200 55 L 240 65 L 280 40 L 320 55 L 360 30 L 400 45 L 400 150 L 0 150 Z" fill="#DC2626" fill-opacity="0.12" />
          </svg>
        </div>
        <div class="mt-3 rounded-xl border border-[#e7e5e4] bg-white p-3">
          <div class="mb-2 flex items-center gap-1.5">
            <Icon icon="lucide:trophy" class="text-[11px] text-[#f59e0b]" />
            <span class="text-[10px] font-bold">Top unit minggu ini</span>
          </div>
          <div class="space-y-1.5">
            <div v-for="u in ['PSC 119 Sleman', 'PMI Bantul', 'Damkar Yogya']" :key="u" class="flex items-center justify-between">
              <span class="text-[10px]">{{ u }}</span>
              <div class="h-1.5 w-24 rounded-full bg-[#fef2f2]">
                <div class="h-full rounded-full bg-[#DC2626]" :style="{ width: u === 'PSC 119 Sleman' ? '90%' : u === 'PMI Bantul' ? '72%' : '60%' }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Variant 3: Cek armada -->
      <div v-else-if="variant === 3" class="flex h-full flex-col">
        <div class="mb-4">
          <div class="text-[9px] font-semibold uppercase tracking-[2px] text-gray-400">Armada</div>
          <h4 class="mt-1 text-[16px] font-bold tracking-[-0.3px]">Kelengkapan ambulans</h4>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div class="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <div class="text-[9px] font-bold uppercase tracking-wide text-emerald-700">Lengkap</div>
            <div class="mt-1 text-[18px] font-bold text-emerald-800">42</div>
          </div>
          <div class="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <div class="text-[9px] font-bold uppercase tracking-wide text-amber-700">Perlu dicek</div>
            <div class="mt-1 text-[18px] font-bold text-amber-800">7</div>
          </div>
          <div class="rounded-xl border border-red-100 bg-red-50 p-3">
            <div class="text-[9px] font-bold uppercase tracking-wide text-red-700">Belum</div>
            <div class="mt-1 text-[18px] font-bold text-red-800">3</div>
          </div>
        </div>
        <div class="mt-3 flex-1 rounded-xl border border-[#e7e5e4] bg-white">
          <div class="border-b border-[#ecebe8] px-3 py-2 text-[10px] font-bold">Unit terverifikasi</div>
          <div v-for="(u, i) in ['PSC 119 Sleman', 'PMI Bantul', 'PSC 119 Yogya', 'Damkar Jogja Kota', 'Klinik Sardjito']" :key="i" class="flex items-center justify-between border-b border-[#f4f3f1] px-3 py-2 last:border-0">
            <div class="flex items-center gap-2">
              <div class="flex h-6 w-6 items-center justify-center rounded-md bg-[#fef2f2] text-[9px] font-bold text-[#b91c1c]">
                {{ u.slice(0, 2).toUpperCase() }}
              </div>
              <span class="text-[10px] font-semibold">{{ u }}</span>
              <Icon v-if="i < 3" icon="lucide:badge-check" class="text-[11px] text-sky-500" />
            </div>
            <div class="flex items-center gap-2">
              <div class="h-1.5 w-16 rounded-full bg-[#f4f3f1]">
                <div class="h-full rounded-full bg-emerald-500" :style="{ width: [92, 88, 85, 74, 62][i] + '%' }" />
              </div>
              <span class="text-[9px] font-bold text-gray-500">{{ [92, 88, 85, 74, 62][i] }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Variant 4: Rumah Sakit -->
      <div v-else class="flex h-full flex-col">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <div class="text-[9px] font-semibold uppercase tracking-[2px] text-gray-400">Rujukan</div>
            <h4 class="mt-1 text-[16px] font-bold tracking-[-0.3px]">Rumah Sakit — SATUSEHAT</h4>
          </div>
          <button class="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[9px] font-semibold text-gray-600 shadow-sm">
            <Icon icon="lucide:refresh-cw" class="text-[10px]" />
            Sync
          </button>
        </div>
        <div class="grid flex-1 grid-cols-2 gap-3">
          <div class="flex flex-col gap-2 rounded-xl border border-[#e7e5e4] bg-white p-3">
            <div v-for="(rs, i) in ['RSUP Sardjito', 'RSUD Sleman', 'RS Bethesda', 'RS PKU Yogya']" :key="i" class="rounded-lg border border-[#f4f3f1] p-2">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-[10px] font-bold">{{ rs }}</span>
                <Icon icon="lucide:badge-check" class="text-[10px] text-sky-500" />
              </div>
              <div class="flex items-center gap-1.5 text-[9px] text-gray-500">
                <Icon icon="lucide:phone" class="text-[10px]" />
                <span>IGD 24 jam</span>
                <span class="mx-0.5">·</span>
                <span>{{ [1.2, 2.4, 3.1, 4.5][i] }} km</span>
              </div>
            </div>
          </div>
          <div class="relative overflow-hidden rounded-xl bg-[#e6edee]">
            <svg viewBox="0 0 200 300" class="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="grid2" width="15" height="15" patternUnits="userSpaceOnUse">
                  <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#d3dcdc" stroke-width="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid2)" />
              <path d="M 0 120 Q 60 100 100 130 T 200 130" stroke="#b8c4c4" stroke-width="4" fill="none" />
            </svg>
            <div v-for="(pos, i) in [{ l: '25%', t: '18%' }, { l: '55%', t: '32%' }, { l: '30%', t: '55%' }, { l: '65%', t: '70%' }]" :key="i" :style="{ left: pos.l, top: pos.t }" class="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow">
              <Icon icon="lucide:hospital" class="text-[10px] text-[#D93025]" />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
