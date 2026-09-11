<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { DASHBOARD_URL, EMERGENCY_NUMBERS, SUPPORT_EMAIL } from "~/utils/landingContent";

const year = new Date().getFullYear();

const columns = [
  {
    title: "Produk",
    links: [
      { label: "Buka aplikasi", to: "/" },
      { label: "Cek tiket", to: "/my-tickets" },
      { label: "Fitur", to: "/landing#fitur" },
      { label: "Cakupan wilayah", to: "/landing#cakupan" },
    ],
  },
  {
    title: "Organisasi",
    links: [
      { label: "Tentang", to: "/tentang" },
      { label: "Support", to: "/support" },
      { label: "Privasi data", to: "/tentang#privasi" },
      { label: "Kerja sama & sponsor", to: "/support#kerja-sama" },
    ],
  },
  {
    title: "Unit emergency",
    links: [
      { label: "Masuk dashboard", href: DASHBOARD_URL },
      { label: "Fitur dashboard", to: "/landing#dashboard" },
      { label: "Daftarkan unit", to: "/support?topik=unit#kontak" },
    ],
  },
] as const;
</script>

<template>
  <footer class="relative border-t border-[var(--lp-line)] bg-white">
    <div class="lp-container pb-10 pt-16 sm:pt-20">
      <div class="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <NuxtLink to="/landing" class="inline-flex items-center gap-2.5">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--lp-accent)]">
              <Icon icon="mynaui:ambulance-solid" class="text-[17px] text-white" />
            </span>
            <span class="text-[17px] font-bold tracking-[-0.03em]">butuhbantuan</span>
          </NuxtLink>
          <p class="lp-body mt-5 max-w-[34ch]">
            Platform darurat sipil Indonesia. Gratis, terbuka, dan dibangun
            bersama komunitas.
          </p>
          <div class="mt-7 flex flex-wrap gap-2">
            <a
              v-for="n in EMERGENCY_NUMBERS.slice(0, 2)"
              :key="n.number"
              :href="`tel:${n.number}`"
              class="lp-chip transition-colors hover:bg-[var(--lp-surface)]"
            >
              <span class="lp-mono font-medium text-[var(--lp-ink)]">{{ n.number }}</span>
              <span class="text-[var(--lp-muted)]">{{ n.label }}</span>
            </a>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div v-for="col in columns" :key="col.title">
            <h2 class="text-[13px] font-semibold text-[var(--lp-ink)]">{{ col.title }}</h2>
            <ul class="mt-4 space-y-3 text-[14px]">
              <li v-for="l in col.links" :key="l.label">
                <NuxtLink
                  v-if="'to' in l"
                  :to="l.to"
                  class="text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-ink)]"
                >
                  {{ l.label }}
                </NuxtLink>
                <a
                  v-else
                  :href="l.href"
                  class="text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-ink)]"
                >
                  {{ l.label }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        class="pointer-events-none mt-16 select-none overflow-hidden whitespace-nowrap text-center text-[clamp(3rem,13.5vw,11rem)] font-extrabold leading-[0.9] tracking-[-0.06em] text-[var(--lp-surface-2)]"
      >
        butuhbantuan
      </div>

      <div class="mt-8 flex flex-col gap-3 border-t border-[var(--lp-line)] pt-6 text-[13px] text-[var(--lp-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>© {{ year }} ButuhBantuan · Dibangun untuk komunitas Indonesia</span>
        <a :href="`mailto:${SUPPORT_EMAIL}`" class="transition-colors hover:text-[var(--lp-ink)]">{{ SUPPORT_EMAIL }}</a>
      </div>
    </div>
  </footer>
</template>
