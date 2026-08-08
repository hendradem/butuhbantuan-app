<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Pengaturan" });

const { logout } = useAuth();
const config = useRuntimeConfig();
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <h1 class="text-lg font-semibold text-neutral-900">Pengaturan</h1>
      <p class="text-sm text-neutral-500 mt-0.5">Konfigurasi panel admin ButuhBantuan</p>
    </div>

    <div class="p-4 sm:p-6 max-w-2xl space-y-6">
      <!-- Account section -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100">
          <h2 class="text-sm font-semibold text-neutral-900">Akun</h2>
        </div>
        <div class="p-5 space-y-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Icon icon="lucide:user" class="text-primary-600 text-xl" />
            </div>
            <div>
              <p class="font-semibold text-neutral-900 text-sm">Admin</p>
              <p class="text-xs text-neutral-400">Administrator · Akses penuh</p>
            </div>
          </div>
          <div class="border-t border-neutral-100 pt-4">
            <UiButton variant="danger" size="sm" @click="logout()">
              <Icon icon="lucide:log-out" class="text-sm" />
              Keluar dari sesi ini
            </UiButton>
          </div>
        </div>
      </div>

      <!-- System info section -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100">
          <h2 class="text-sm font-semibold text-neutral-900">Informasi Sistem</h2>
        </div>
        <div class="divide-y divide-neutral-100">
          <div class="px-5 py-3 flex items-center justify-between">
            <span class="text-sm text-neutral-500">API Base URL</span>
            <code class="text-xs bg-neutral-100 px-2 py-1 rounded font-mono text-neutral-700">
              {{ config.public.apiBaseUrl || '—' }}
            </code>
          </div>
          <div class="px-5 py-3 flex items-center justify-between">
            <span class="text-sm text-neutral-500">Versi Aplikasi</span>
            <span class="text-xs text-neutral-600">1.0.0</span>
          </div>
        </div>
      </div>

      <!-- Navigation shortcuts -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100">
          <h2 class="text-sm font-semibold text-neutral-900">Navigasi Cepat</h2>
        </div>
        <div class="divide-y divide-neutral-100">
          <NuxtLink
            v-for="link in [
              { to: '/', label: 'Overview', icon: 'lucide:layout-dashboard' },
              { to: '/emergencies', label: 'Layanan Darurat', icon: 'lucide:shield-check' },
              { to: '/emergency-types', label: 'Jenis Layanan', icon: 'lucide:tag' },
              { to: '/regions', label: 'Wilayah Tercakup', icon: 'lucide:map-pin' },
            ]"
            :key="link.to"
            :to="link.to"
            class="px-5 py-3 flex items-center gap-3 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <Icon :icon="link.icon" class="text-neutral-400 text-base shrink-0" />
            {{ link.label }}
            <Icon icon="lucide:chevron-right" class="text-neutral-300 text-xs ml-auto" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
