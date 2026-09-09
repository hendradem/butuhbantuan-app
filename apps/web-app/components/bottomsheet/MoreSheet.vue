<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { getColorMode, setColorMode, type ColorMode } from "~/utils/colorMode";
import { recordServiceDemand } from "~/utils/serviceDemand";

const moreSheet = useMoreSheetStore();
const exploreSheet = useExploreSheetStore();
const emergencyStore = useEmergencyStore();
const colorMode = ref<ColorMode>("light");

onMounted(() => {
  colorMode.value = getColorMode();
});

function onColorModeChange(mode: ColorMode) {
  colorMode.value = mode;
  setColorMode(mode);
  if (import.meta.client) {
    window.dispatchEvent(
      new CustomEvent("bb-color-mode", { detail: { mode } }),
    );
  }
}

function selectOverflowService(service: any) {
  if (service?.name) recordServiceDemand(String(service.name));
  moreSheet.onClose();
  const filtered = emergencyStore.filteredEmergency.filter(
    (item: any) => item.emergencyData?.emergency_type?.name === service.name,
  );
  exploreSheet.setSheetData({ emergencyType: service, emergency: filtered });
  exploreSheet.onOpen();
}

const router = useRouter();

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

function openMyTickets() {
  moreSheet.onClose();
  router.push("/my-tickets");
}

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

const sheetSnap = computed(() => {
  const extra = moreSheet.overflowServices.length * 64;
  return [Math.min(560, 380 + extra), 0];
});

function openDetail(id: "about" | "support") {
  moreSheet.openDetail(id);
}
</script>

<template>
  <!-- Menu Lainnya -->
  <CoreSheet
    :is-open="moreSheet.isOpen && !moreSheet.detail"
    :snap-points="sheetSnap"
    is-overlay
    scrollable
    @close="moreSheet.onClose()"
  >
    <template #header>
      <div class="ui-sheet-header px-4">
        <h1 class="ui-sheet-title">Lainnya</h1>
        <button type="button" class="ui-close-btn" @click="moreSheet.onClose()">
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>
    </template>

    <div class="px-3 py-3 space-y-2">
      <template v-if="moreSheet.overflowServices.length">
        <p class="m-0 px-0.5 text-[11px] font-semibold uppercase tracking-wide ui-text-secondary">
          Layanan
        </p>
        <button
          v-for="service in moreSheet.overflowServices"
          :key="service.id ?? service.name"
          type="button"
          class="ui-card w-full flex items-center gap-3 px-3.5 py-3 text-left transition-opacity active:opacity-90"
          @click="selectOverflowService(service)"
        >
          <div
            class="w-10 h-10 shrink-0 ui-icon-well--danger flex items-center justify-center"
            style="border-radius: var(--bb-radius-pill)"
          >
            <Icon :icon="(service.icon as string) || 'lucide:shield'" class="text-lg" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold ui-text-primary">{{ service.name }}</p>
            <p
              v-if="service.description"
              class="text-xs ui-text-secondary mt-0.5 leading-snug line-clamp-1"
            >
              {{ service.description }}
            </p>
          </div>
          <Icon icon="lucide:chevron-right" class="shrink-0" style="color: var(--bb-text-tertiary)" />
        </button>
        <div class="h-1" />
      </template>

      <div
        class="ui-card w-full flex items-center gap-3 px-3.5 py-3.5"
      >
        <div
          class="w-10 h-10 shrink-0 ui-icon-well flex items-center justify-center"
          style="border-radius: var(--bb-radius-pill)"
        >
          <Icon
            :icon="colorMode === 'dark' ? 'lucide:moon' : 'lucide:sun'"
            class="text-lg"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold ui-text-primary">Tampilan</p>
          <p class="text-xs ui-text-secondary mt-0.5 leading-snug">
            {{ colorMode === "dark" ? "Mode gelap" : "Mode terang" }}
          </p>
        </div>
        <div
          class="inline-flex p-0.5 shrink-0"
          style="
            background: var(--bb-bg-muted);
            border-radius: var(--bb-radius-pill);
            border: 1px solid var(--bb-border);
          "
          role="group"
          aria-label="Mode tampilan"
        >
          <button
            type="button"
            class="px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
            :style="
              colorMode === 'light'
                ? {
                    background: 'var(--bb-bg-surface)',
                    color: 'var(--bb-text)',
                    borderRadius: '9999px',
                    boxShadow: 'var(--bb-shadow-xs)',
                  }
                : { color: 'var(--bb-text-secondary)', borderRadius: '9999px' }
            "
            @click="onColorModeChange('light')"
          >
            Terang
          </button>
          <button
            type="button"
            class="px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
            :style="
              colorMode === 'dark'
                ? {
                    background: 'var(--bb-bg-surface)',
                    color: 'var(--bb-text)',
                    borderRadius: '9999px',
                    boxShadow: 'var(--bb-shadow-xs)',
                  }
                : { color: 'var(--bb-text-secondary)', borderRadius: '9999px' }
            "
            @click="onColorModeChange('dark')"
          >
            Gelap
          </button>
        </div>
      </div>

      <button
        type="button"
        class="ui-card w-full flex items-center gap-3 px-3.5 py-3.5 text-left transition-opacity active:opacity-90"
        @click="openMyTickets"
      >
        <div class="w-10 h-10 shrink-0 ui-icon-well flex items-center justify-center" style="border-radius: var(--bb-radius-pill)">
          <Icon icon="lucide:ticket" class="text-lg" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold ui-text-primary">Tiket saya</p>
          <p class="text-xs ui-text-secondary mt-0.5 leading-snug">Cek tiket darurat dengan nomor HP</p>
        </div>
        <Icon icon="lucide:chevron-right" class="shrink-0" style="color: var(--bb-text-tertiary)" />
      </button>

      <button
        v-for="item in links"
        :key="item.id"
        type="button"
        class="ui-card w-full flex items-center gap-3 px-3.5 py-3.5 text-left transition-opacity active:opacity-90"
        @click="openDetail(item.id)"
      >
        <div class="w-10 h-10 shrink-0 ui-icon-well--danger flex items-center justify-center" style="border-radius: var(--bb-radius-pill)">
          <Icon :icon="item.icon" class="text-lg" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold ui-text-primary">{{ item.title }}</p>
          <p class="text-xs ui-text-secondary mt-0.5 leading-snug">{{ item.desc }}</p>
        </div>
        <Icon icon="lucide:chevron-right" class="shrink-0" style="color: var(--bb-text-tertiary)" />
      </button>

      <p class="text-center text-[11px] ui-text-secondary pt-2 pb-1">
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
      <div class="ui-sheet-header">
        <button
          type="button"
          class="ui-close-btn"
          style="width: 2.25rem; height: 2.25rem"
          aria-label="Kembali"
          @click="moreSheet.closeDetail()"
        >
          <Icon icon="lucide:arrow-left" class="text-base" />
        </button>
        <h1 class="ui-sheet-title flex-1 truncate">{{ detailTitle }}</h1>
        <button type="button" class="ui-close-btn" @click="moreSheet.onClose()">
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>
    </template>

    <!-- Tentang kami -->
    <div v-if="moreSheet.detail === 'about'" class="px-4 py-5 space-y-5 pb-8">
      <div class="ui-card p-5">
        <div class="w-12 h-12 mb-3 flex items-center justify-center text-white" style="background: var(--bb-danger); border-radius: var(--bb-radius-control)">
          <Icon icon="lucide:siren" class="text-xl" />
        </div>
        <h2 class="text-lg font-bold ui-text-primary">Bantuan darurat, lebih dekat</h2>
        <p class="text-sm ui-text-secondary mt-2 leading-relaxed">
          ButuhBantuan menghubungkan warga dengan unit layanan darurat terdekat —
          ambulans, pemadam, SAR, dan mitra komunitas — lewat peta, SOS, dan e-tiket langsung.
        </p>
      </div>

      <section>
        <h3 class="text-sm font-semibold ui-text-primary mb-2">Cara kerja</h3>
        <ol class="space-y-2.5 text-sm" style="color: var(--bb-text)">
          <li class="flex gap-2.5">
            <span class="w-6 h-6 text-xs font-bold flex items-center justify-center shrink-0 ui-icon-well">1</span>
            <span>Tentukan lokasi Anda di peta</span>
          </li>
          <li class="flex gap-2.5">
            <span class="w-6 h-6 text-xs font-bold flex items-center justify-center shrink-0 ui-icon-well">2</span>
            <span>Pilih jenis layanan atau tekan SOS</span>
          </li>
          <li class="flex gap-2.5">
            <span class="w-6 h-6 text-xs font-bold flex items-center justify-center shrink-0 ui-icon-well">3</span>
            <span>Pantau status bantuan lewat e-tiket</span>
          </li>
        </ol>
      </section>

      <section class="px-4 py-3.5" style="border-radius: var(--bb-radius-card); border: 1px solid #fde68a; background: #fffbeb">
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
      <p class="text-sm ui-text-secondary leading-relaxed">
        Setiap wilayah baru butuh unit mitra, verifikasi, dan operasional.
        Dukungan Anda membantu warga mendapat bantuan lebih cepat.
      </p>

      <section>
        <h3 class="text-sm font-semibold ui-text-primary mb-2.5">Sponsor & mitra</h3>
        <div class="space-y-2.5">
          <div
            v-for="(s, i) in sponsors"
            :key="i"
            class="ui-card px-4 py-3.5"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 flex items-center justify-center shrink-0 text-sm font-bold ui-icon-well" style="border-radius: var(--bb-radius-control)">
                {{ i + 1 }}
              </div>
              <div>
                <p class="text-sm font-semibold ui-text-primary">{{ s.name }}</p>
                <p class="text-xs ui-text-secondary mt-1 leading-relaxed">{{ s.blurb }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-2.5">
        <h3 class="text-sm font-semibold ui-text-primary">Hubungi kami</h3>
        <a
          :href="waSupport"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 px-4 py-3.5"
          style="border-radius: var(--bb-radius-card); border: 1px solid #a7f3d0; background: #ecfdf5"
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
          class="ui-card flex items-center gap-3 px-4 py-3.5"
        >
          <div class="w-10 h-10 flex items-center justify-center shrink-0 text-sm font-bold ui-icon-well">
            @
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold ui-text-primary">Email</p>
            <p class="text-xs ui-text-secondary mt-0.5">hello@butuhbantuan.id</p>
          </div>
        </a>
      </section>

      <section class="px-4 py-3.5" style="background: var(--bb-bg-muted); border: 1px solid var(--bb-border); border-radius: var(--bb-radius-card)">
        <p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--bb-text)">Cara mendukung</p>
        <ul class="mt-2 space-y-1.5 text-sm ui-text-secondary">
          <li>· Sponsori wilayah / kampanye kesadaran</li>
          <li>· Daftarkan unit layanan sebagai mitra</li>
          <li>· Sebarkan aplikasi ke komunitas Anda</li>
        </ul>
      </section>
    </div>
  </CoreSheet>
</template>
