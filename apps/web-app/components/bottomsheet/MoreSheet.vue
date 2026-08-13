<script setup lang="ts">
import { Icon } from "@iconify/vue";

const moreSheet = useMoreSheetStore();

const links = [
  {
    id: "about" as const,
    title: "Tentang kami",
    desc: "Visi, misi, dan cara kerja ButuhBantuan",
    icon: "lucide:info",
  },
  {
    id: "support" as const,
    title: "Dukung kami",
    desc: "Sponsor, donasi, dan bergabung sebagai mitra",
    icon: "lucide:heart",
  },
];

const sponsors = [
  {
    name: "Mitra komunitas",
    blurb: "Unit ambulans & relawan lokal yang aktif di wilayah tercakup.",
  },
  {
    name: "PSC & institusi",
    blurb: "Pusat layanan darurat resmi yang menjadi jalur eskalasi kritis.",
  },
  {
    name: "Teknologi & peta",
    blurb: "Infrastruktur peta dan konektivitas yang membuat ETA & navigasi mungkin.",
  },
];

const waSupport =
  "https://wa.me/6280000000000?text=" +
  encodeURIComponent("Halo, saya ingin mendukung ButuhBantuan.");

const detailTitle = computed(() =>
  moreSheet.detail === "about" ? "Tentang kami" : "Dukung kami",
);

function openDetail(id: "about" | "support") {
  moreSheet.openDetail(id);
}
</script>

<template>
  <!-- Menu Lainnya -->
  <CoreSheet
    :is-open="moreSheet.isOpen && !moreSheet.detail"
    :snap-points="[380, 0]"
    is-overlay
    scrollable
    @close="moreSheet.onClose()"
  >
    <template #header>
      <div class="border-b py-3 px-4 bg-white border-neutral-100 rounded-t-[20px] flex items-center justify-between">
        <h1 class="text-md font-semibold text-neutral-800">Lainnya</h1>
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
          @click="moreSheet.onClose()"
        >
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>
    </template>

    <div class="px-3 py-3 space-y-2">
      <button
        v-for="item in links"
        :key="item.id"
        type="button"
        class="w-full flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white px-3.5 py-3.5 text-left hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
        @click="openDetail(item.id)"
      >
        <div class="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
          <Icon :icon="item.icon" class="text-lg" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-neutral-900">{{ item.title }}</p>
          <p class="text-xs text-neutral-500 mt-0.5 leading-snug">{{ item.desc }}</p>
        </div>
        <Icon icon="lucide:chevron-right" class="text-neutral-300 shrink-0" />
      </button>

      <p class="text-center text-[11px] text-neutral-400 pt-2 pb-1">
        ButuhBantuan · bantuan darurat lebih dekat
      </p>
    </div>
  </CoreSheet>

  <!-- Detail full-height sheet (stacks above Lainnya) -->
  <CoreSheet
    :is-open="!!moreSheet.detail"
    :snap-points="[0.92, 0]"
    is-overlay
    scrollable
    @close="moreSheet.closeDetail()"
  >
    <template #header>
      <div class="border-b py-3 px-3 bg-white border-neutral-100 rounded-t-[20px] flex items-center gap-2">
        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-700 shrink-0"
          aria-label="Kembali"
          @click="moreSheet.closeDetail()"
        >
          <Icon icon="lucide:arrow-left" class="text-base" />
        </button>
        <h1 class="text-md font-semibold text-neutral-800 flex-1 truncate">{{ detailTitle }}</h1>
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 shrink-0"
          @click="moreSheet.onClose()"
        >
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>
    </template>

    <!-- Tentang kami -->
    <div v-if="moreSheet.detail === 'about'" class="px-4 py-5 space-y-5 pb-8">
      <div class="rounded-2xl bg-gradient-to-br from-red-50 to-white border border-red-100 p-5">
        <div class="w-12 h-12 rounded-xl bg-emergency-600 text-white flex items-center justify-center mb-3">
          <Icon icon="lucide:siren" class="text-xl" />
        </div>
        <h2 class="text-lg font-bold text-neutral-900">Bantuan darurat, lebih dekat</h2>
        <p class="text-sm text-neutral-600 mt-2 leading-relaxed">
          ButuhBantuan menghubungkan warga dengan unit layanan darurat terdekat —
          ambulans, pemadam, SAR, dan mitra komunitas — lewat peta, SOS, dan e-tiket langsung.
        </p>
      </div>

      <section>
        <h3 class="text-sm font-semibold text-neutral-900 mb-2">Cara kerja</h3>
        <ol class="space-y-2.5 text-sm text-neutral-700">
          <li class="flex gap-2.5">
            <span class="w-6 h-6 rounded-full bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <span>Tentukan lokasi Anda di peta</span>
          </li>
          <li class="flex gap-2.5">
            <span class="w-6 h-6 rounded-full bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <span>Pilih jenis layanan atau tekan SOS</span>
          </li>
          <li class="flex gap-2.5">
            <span class="w-6 h-6 rounded-full bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
            <span>Pantau status bantuan lewat e-tiket</span>
          </li>
        </ol>
      </section>

      <section class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <p class="text-sm font-semibold text-amber-950">Penting</p>
        <p class="text-xs text-amber-900/90 mt-1 leading-relaxed">
          Untuk kondisi mengancam nyawa di luar wilayah layanan, hubungi
          <a href="tel:119" class="font-semibold underline">PSC 119</a>,
          <a href="tel:113" class="font-semibold underline">113</a> (pemadam), atau
          <a href="tel:110" class="font-semibold underline">110</a> (polisi).
        </p>
      </section>
    </div>

    <!-- Dukung kami (+ sponsor) -->
    <div v-else-if="moreSheet.detail === 'support'" class="px-4 py-5 space-y-5 pb-8">
      <p class="text-sm text-neutral-600 leading-relaxed">
        Setiap wilayah baru butuh unit mitra, verifikasi, dan operasional.
        Dukungan Anda membantu warga mendapat bantuan lebih cepat.
      </p>

      <section>
        <h3 class="text-sm font-semibold text-neutral-900 mb-2.5">Sponsor & mitra</h3>
        <div class="space-y-2.5">
          <div
            v-for="(s, i) in sponsors"
            :key="i"
            class="rounded-2xl border border-neutral-200 bg-white px-4 py-3.5"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center shrink-0 text-sm font-bold">
                {{ i + 1 }}
              </div>
              <div>
                <p class="text-sm font-semibold text-neutral-900">{{ s.name }}</p>
                <p class="text-xs text-neutral-500 mt-1 leading-relaxed">{{ s.blurb }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-2.5">
        <h3 class="text-sm font-semibold text-neutral-900">Hubungi kami</h3>
        <a
          :href="waSupport"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5"
        >
          <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Icon icon="lucide:message-circle" class="text-lg" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-emerald-950">WhatsApp tim</p>
            <p class="text-xs text-emerald-800/80 mt-0.5">Sponsorship, kemitraan unit, atau donasi</p>
          </div>
        </a>
        <a
          href="mailto:hello@butuhbantuan.id?subject=Dukung%20ButuhBantuan"
          class="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5"
        >
          <div class="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 text-sm font-bold">
            @
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-neutral-900">Email</p>
            <p class="text-xs text-neutral-500 mt-0.5">hello@butuhbantuan.id</p>
          </div>
        </a>
      </section>

      <section class="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3.5">
        <p class="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Cara mendukung</p>
        <ul class="mt-2 space-y-1.5 text-sm text-neutral-600">
          <li>· Sponsori wilayah / kampanye kesadaran</li>
          <li>· Daftarkan unit layanan sebagai mitra</li>
          <li>· Sebarkan aplikasi ke komunitas Anda</li>
        </ul>
      </section>
    </div>
  </CoreSheet>
</template>
