<script setup lang="ts">
import type { Emergency } from "@butuhbantuan/types";

const emergencies: Emergency[] = [
  {
    id: "1",
    title: "Kecelakaan di Jl. Sudirman",
    description: "Tabrakan dua kendaraan, korban butuh pertolongan segera.",
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
    description: "Api menjalar ke atap, tiga rumah terancam terbakar.",
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
    description: "Lansia tiba-tiba pingsan, butuh penanganan medis.",
    latitude: -6.2146,
    longitude: 106.8451,
    status: "resolved",
    category: "medical",
    reportedBy: "Andi P.",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const reportModalOpen = ref(false);
</script>

<template>
  <div class="min-h-screen bg-neutral-50 font-sans">
    <header class="border-b border-neutral-200 bg-white px-4 py-4 shadow-sm">
      <div class="mx-auto flex max-w-2xl items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-neutral-900">ButuhBantuan</h1>
          <p class="text-xs text-neutral-500">Laporan darurat sekitar Anda</p>
        </div>
        <UiButton variant="danger" size="sm" @click="reportModalOpen = true">
          + Laporkan
        </UiButton>
      </div>
    </header>

    <main class="mx-auto max-w-2xl px-4 py-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-semibold text-neutral-700">Kejadian Aktif</h2>
        <UiBadge variant="danger" dot>{{ emergencies.filter(e => e.status !== 'resolved').length }} aktif</UiBadge>
      </div>

      <div class="space-y-3">
        <EmergencyCard
          v-for="emergency in emergencies"
          :key="emergency.id"
          :emergency="emergency"
        />
      </div>

      <!-- UI component showcase -->
      <section class="mt-10 space-y-4">
        <h2 class="font-semibold text-neutral-700">Komponen UI</h2>

        <UiCard>
          <p class="mb-3 text-sm font-medium text-neutral-600">Tombol</p>
          <div class="flex flex-wrap gap-2">
            <UiButton variant="primary">Primary</UiButton>
            <UiButton variant="secondary">Secondary</UiButton>
            <UiButton variant="danger">Danger</UiButton>
            <UiButton variant="ghost">Ghost</UiButton>
            <UiButton variant="primary" :loading="true">Loading</UiButton>
            <UiButton variant="primary" :disabled="true">Disabled</UiButton>
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

    <UiModal
      v-model:open="reportModalOpen"
      title="Laporkan Kejadian Darurat"
      description="Isi informasi kejadian di sekitar Anda."
    >
      <div class="space-y-3">
        <input
          type="text"
          placeholder="Judul kejadian"
          class="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
        <textarea
          rows="3"
          placeholder="Deskripsi singkat..."
          class="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="reportModalOpen = false">Batal</UiButton>
        <UiButton variant="danger">Kirim Laporan</UiButton>
      </template>
    </UiModal>
  </div>
</template>
