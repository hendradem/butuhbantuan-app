<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Pengaturan" });

const { logout } = useAuth();
const config = useRuntimeConfig();

const archiveLinks = [
  {
    to: "/feedback",
    icon: "lucide:message-square",
    label: "Arsip feedback warga",
    desc: "Penilaian per unit layanan",
  },
  {
    to: "/reports",
    icon: "lucide:file-text",
    label: "Arsip laporan kejadian",
    desc: "Daftar laporan per e-tiket",
  },
];

const navLinks = [
  { to: "/", label: "Overview", icon: "lucide:layout-dashboard" },
  { to: "/emergencies", label: "Layanan Darurat", icon: "lucide:shield-check" },
  { to: "/emergency-types", label: "Jenis Layanan", icon: "lucide:tag" },
  { to: "/regions", label: "Wilayah Tercakup", icon: "lucide:map-pin" },
];
</script>

<template>
  <div>
    <div class="page-subheader">
      <h1 class="page-subheader-title">Pengaturan</h1>
      <p class="page-subheader-desc">Konfigurasi panel admin ButuhBantuan</p>
    </div>

    <div class="p-4 sm:p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-6xl">
        <UiCard title="Akun" description="Sesi administrator aktif">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Icon icon="lucide:user" class="text-primary-600 text-xl" />
            </div>
            <div class="min-w-0">
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

        <UiCard title="Informasi Sistem" description="Endpoint dan versi yang sedang dipakai">
          <dl class="grid grid-cols-1 gap-3">
            <div class="rounded-lg border border-neutral-100 bg-neutral-50/80 px-3.5 py-3">
              <dt class="text-xs font-medium text-neutral-400">API Base URL</dt>
              <dd class="mt-1">
                <code class="text-xs font-mono text-neutral-800 break-all">
                  {{ config.public.apiBaseUrl || "—" }}
                </code>
              </dd>
            </div>
            <div class="rounded-lg border border-neutral-100 bg-neutral-50/80 px-3.5 py-3">
              <dt class="text-xs font-medium text-neutral-400">Versi aplikasi</dt>
              <dd class="mt-1 text-sm font-medium text-neutral-800">1.0.0</dd>
            </div>
          </dl>
        </UiCard>

        <UiCard title="Arsip" description="Laporan & feedback — biasanya dari detail pesanan" class="md:col-span-2 xl:col-span-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <NuxtLink
              v-for="link in archiveLinks"
              :key="link.to"
              :to="link.to"
              class="rounded-lg border border-neutral-200 px-3.5 py-3 hover:bg-neutral-50 transition-colors"
            >
              <div class="flex items-start gap-2.5">
                <Icon :icon="link.icon" class="text-neutral-500 text-base shrink-0 mt-0.5" />
                <div class="min-w-0">
                  <p class="text-sm font-medium text-neutral-900">{{ link.label }}</p>
                  <p class="text-xs text-neutral-500 mt-0.5">{{ link.desc }}</p>
                </div>
              </div>
            </NuxtLink>
          </div>
        </UiCard>

        <UiCard title="Navigasi cepat" description="Pintasan data master" class="md:col-span-2 xl:col-span-3">
          <div class="grid grid-cols-2 gap-2">
            <NuxtLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="rounded-lg border border-neutral-200 px-3.5 py-3 flex items-center gap-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Icon :icon="link.icon" class="text-neutral-400 text-base shrink-0" />
              <span class="min-w-0 truncate">{{ link.label }}</span>
            </NuxtLink>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
