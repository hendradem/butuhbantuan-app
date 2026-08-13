<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Pengaturan" });

const { logout } = useAuth();
const config = useRuntimeConfig();
</script>

<template>
  <div>
    <div class="page-subheader">
      <h1 class="page-subheader-title">Pengaturan</h1>
      <p class="page-subheader-desc">Konfigurasi panel admin ButuhBantuan</p>
    </div>

    <div class="p-4 sm:p-6 max-w-2xl space-y-6">
      <UiCard title="Akun" description="Sesi administrator aktif">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <Icon icon="lucide:user" class="text-primary-600 text-xl" />
          </div>
          <div>
            <p class="text-sm font-medium text-neutral-900">Admin</p>
            <p class="text-sm text-neutral-500 mt-0.5">Administrator · Akses penuh</p>
          </div>
        </div>
        <div class="border-t border-neutral-200 mt-5 pt-5">
          <UiButton variant="danger" size="sm" @click="logout()">
            <Icon icon="lucide:log-out" class="text-sm" />
            Keluar dari sesi ini
          </UiButton>
        </div>
      </UiCard>

      <UiCard title="Informasi Sistem" padding="none">
        <div class="divide-y divide-neutral-200">
          <div class="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <span class="text-sm text-neutral-500">API Base URL</span>
            <code class="text-xs bg-neutral-100 px-2 py-1 rounded-md font-mono text-neutral-700">
              {{ config.public.apiBaseUrl || "—" }}
            </code>
          </div>
          <div class="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <span class="text-sm text-neutral-500">Versi Aplikasi</span>
            <span class="text-sm font-medium text-neutral-700">1.0.0</span>
          </div>
        </div>
      </UiCard>

      <UiCard
        title="Arsip"
        description="Laporan & feedback biasanya dari detail pesanan. Arsip untuk lihat semua."
        padding="none"
      >
        <div class="divide-y divide-neutral-200">
          <NuxtLink
            to="/feedback"
            class="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-neutral-50 transition-colors"
          >
            <Icon icon="lucide:message-square" class="text-neutral-500 text-base shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-neutral-900">Arsip feedback warga</p>
              <p class="text-sm text-neutral-500 mt-0.5">Penilaian per unit layanan</p>
            </div>
            <Icon icon="lucide:chevron-right" class="text-neutral-400 text-sm" />
          </NuxtLink>
          <NuxtLink
            to="/reports"
            class="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-neutral-50 transition-colors"
          >
            <Icon icon="lucide:file-text" class="text-neutral-500 text-base shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-neutral-900">Arsip laporan kejadian</p>
              <p class="text-sm text-neutral-500 mt-0.5">Daftar laporan per e-tiket</p>
            </div>
            <Icon icon="lucide:chevron-right" class="text-neutral-400 text-sm" />
          </NuxtLink>
        </div>
      </UiCard>

      <UiCard title="Navigasi Cepat" padding="none">
        <div class="divide-y divide-neutral-200">
          <NuxtLink
            v-for="link in [
              { to: '/', label: 'Overview', icon: 'lucide:layout-dashboard' },
              { to: '/emergencies', label: 'Layanan Darurat', icon: 'lucide:shield-check' },
              { to: '/emergency-types', label: 'Jenis Layanan', icon: 'lucide:tag' },
              { to: '/regions', label: 'Wilayah Tercakup', icon: 'lucide:map-pin' },
            ]"
            :key="link.to"
            :to="link.to"
            class="px-4 sm:px-6 py-3.5 flex items-center gap-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Icon :icon="link.icon" class="text-neutral-400 text-base shrink-0" />
            {{ link.label }}
            <Icon icon="lucide:chevron-right" class="text-neutral-300 text-sm ml-auto" />
          </NuxtLink>
        </div>
      </UiCard>
    </div>
  </div>
</template>
