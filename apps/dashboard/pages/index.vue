<script setup lang="ts">
import type { Emergency } from "@butuhbantuan/types";
import { timeAgo } from "@butuhbantuan/utils";

const stats = [
  { label: "Total Laporan",    value: 128,  trend: "up"      as const, trendLabel: "+12 minggu ini",  icon: "📋" },
  { label: "Sedang Ditangani", value: 7,    trend: "neutral" as const, trendLabel: "sama seperti kemarin", icon: "🔄" },
  { label: "Selesai Hari Ini", value: 24,   trend: "up"      as const, trendLabel: "+4 dari kemarin", icon: "✅" },
  { label: "Responder Aktif",  value: 15,   trend: "down"    as const, trendLabel: "-2 dari normal",  icon: "👷" },
];

const recentEmergencies: Emergency[] = [
  {
    id: "1",
    title: "Kecelakaan di Jl. Sudirman",
    description: "Tabrakan dua kendaraan.",
    latitude: -6.2088,
    longitude: 106.8456,
    status: "in_progress",
    category: "accident",
    reportedBy: "Budi S.",
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Kebakaran Rumah Warga",
    description: "Api menjalar ke atap.",
    latitude: -6.1944,
    longitude: 106.8229,
    status: "pending",
    category: "fire",
    reportedBy: "Sari W.",
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Warga Pingsan di Pasar",
    description: "Lansia butuh penanganan medis.",
    latitude: -6.2146,
    longitude: 106.8451,
    status: "resolved",
    category: "medical",
    reportedBy: "Andi P.",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const statusVariant = {
  pending:     "warning",
  in_progress: "primary",
  resolved:    "success",
  cancelled:   "neutral",
} as const;

const statusLabel = {
  pending:     "Menunggu",
  in_progress: "Ditangani",
  resolved:    "Selesai",
  cancelled:   "Dibatalkan",
} as const;

const confirmModalOpen = ref(false);
const selectedEmergency = ref<Emergency | null>(null);

function openConfirm(emergency: Emergency) {
  selectedEmergency.value = emergency;
  confirmModalOpen.value = true;
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 font-sans">
    <header class="border-b border-neutral-200 bg-white px-6 py-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-neutral-900">Dashboard Admin</h1>
          <p class="text-xs text-neutral-500">ButuhBantuan — Pusat Komando</p>
        </div>
        <div class="flex items-center gap-2">
          <UiBadge variant="success" dot>Sistem Aktif</UiBadge>
          <UiButton variant="secondary" size="sm">Export</UiButton>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-6 py-8 space-y-8">

      <!-- Stats grid -->
      <section>
        <h2 class="mb-4 font-semibold text-neutral-700">Ringkasan</h2>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            v-for="stat in stats"
            :key="stat.label"
            v-bind="stat"
          />
        </div>
      </section>

      <!-- Recent emergencies table -->
      <section>
        <h2 class="mb-4 font-semibold text-neutral-700">Laporan Terbaru</h2>
        <UiCard padding="none">
          <table class="w-full text-sm">
            <thead class="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th class="px-5 py-3">Kejadian</th>
                <th class="px-5 py-3">Pelapor</th>
                <th class="px-5 py-3">Waktu</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr
                v-for="e in recentEmergencies"
                :key="e.id"
                class="hover:bg-neutral-50"
              >
                <td class="px-5 py-3">
                  <p class="font-medium text-neutral-900">{{ e.title }}</p>
                  <p class="text-neutral-500">{{ e.description }}</p>
                </td>
                <td class="px-5 py-3 text-neutral-600">{{ e.reportedBy }}</td>
                <td class="px-5 py-3 text-neutral-500">{{ timeAgo(e.createdAt) }}</td>
                <td class="px-5 py-3">
                  <UiBadge :variant="statusVariant[e.status]" dot>
                    {{ statusLabel[e.status] }}
                  </UiBadge>
                </td>
                <td class="px-5 py-3">
                  <UiButton
                    v-if="e.status === 'pending'"
                    variant="primary"
                    size="sm"
                    @click="openConfirm(e)"
                  >
                    Tangani
                  </UiButton>
                </td>
              </tr>
            </tbody>
          </table>
        </UiCard>
      </section>

      <!-- UI showcase -->
      <section class="space-y-4">
        <h2 class="font-semibold text-neutral-700">Komponen UI</h2>
        <UiCard>
          <p class="mb-3 text-sm font-medium text-neutral-600">Tombol</p>
          <div class="flex flex-wrap gap-2">
            <UiButton variant="primary">Primary</UiButton>
            <UiButton variant="secondary">Secondary</UiButton>
            <UiButton variant="danger">Danger</UiButton>
            <UiButton variant="ghost">Ghost</UiButton>
          </div>
        </UiCard>

        <UiCard>
          <p class="mb-3 text-sm font-medium text-neutral-600">Badge</p>
          <div class="flex flex-wrap gap-2">
            <UiBadge variant="primary" dot>Primary</UiBadge>
            <UiBadge variant="success" dot>Success</UiBadge>
            <UiBadge variant="warning" dot>Warning</UiBadge>
            <UiBadge variant="danger" dot>Danger</UiBadge>
            <UiBadge variant="neutral">Neutral</UiBadge>
          </div>
        </UiCard>
      </section>
    </main>

    <!-- Confirm modal -->
    <UiModal
      v-if="selectedEmergency"
      v-model:open="confirmModalOpen"
      title="Tangani Laporan"
      :description="`Konfirmasi penanganan: ${selectedEmergency.title}`"
    >
      <p class="text-sm text-neutral-600">
        Apakah Anda yakin ingin menandai laporan ini sebagai <strong>sedang ditangani</strong>?
        Tindakan ini akan memberi tahu pelapor.
      </p>
      <template #footer>
        <UiButton variant="ghost" @click="confirmModalOpen = false">Batal</UiButton>
        <UiButton variant="primary" @click="confirmModalOpen = false">Ya, Tangani</UiButton>
      </template>
    </UiModal>
  </div>
</template>
