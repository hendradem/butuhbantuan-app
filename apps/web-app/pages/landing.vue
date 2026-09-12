<script setup lang="ts">
/**
 * /landing — public marketing page.
 *
 * Clean, light layout (references: Linear, Amie, Vercel): white canvas,
 * warm-stone surfaces, brand red as the lead accent plus one supporting tone
 * per service family (see .lp-tone-* in landing.css). Sections: hero →
 * citizen walkthrough (sticky phone + scroll spy) → unit dashboard (sticky
 * browser + scroll spy) → bento → coverage → FAQ → CTA. Nav/footer/fonts
 * live in LandingShell so /tentang and /support share them.
 */
import { Icon } from "@iconify/vue";
import { DASHBOARD_URL, EMERGENCY_NUMBERS, FAQS, type Tone } from "~/utils/landingContent";

definePageMeta({ layout: false });

const title = "ButuhBantuan — Peta bantuan darurat warga Indonesia";
const description =
  "Cari ambulans, damkar, SAR, PMI, PSC 119, dan rumah sakit terdekat. Lapor dalam 30 detik, pantau petugas sampai tiba, dan kelola unit darurat dari satu dashboard.";

useHead({
  title,
  meta: [
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
  ],
});

const navVisible = useState("lp-nav-visible", () => true);
// While the dashboard section's sticky pill bar is docked under the nav,
// scrolling up must not pop the nav back over it — only once the section is
// fully scrolled past (either edge) does normal reveal-on-scroll-up resume.
const navSuppressed = useState("lp-nav-suppressed", () => false);
const dashboardSectionRef = ref<HTMLElement | null>(null);

function updateNavSuppression() {
  const el = dashboardSectionRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  // True exactly while the viewport's top edge sits inside the section — i.e.
  // the user has scrolled into it and hasn't come out the other side yet,
  // from either direction.
  navSuppressed.value = rect.top <= 0 && rect.bottom > 0;
}

// ── Citizen walkthrough (sticky phone + scroll spy) ────────────────────────
const features: { title: string; subtitle: string; tone: Tone }[] = [
  {
    title: "Lihat unit terdekat",
    subtitle: "Ambulans, damkar, SAR, PMI, dan PSC 119 di sekitarmu, lengkap dengan jarak dan perkiraan tiba.",
    tone: "red",
  },
  {
    title: "Lapor dalam 30 detik",
    subtitle: "Foto dan lokasi terisi otomatis. Tanpa perlu bikin akun.",
    tone: "rose",
  },
  {
    title: "Pantau petugas di peta",
    subtitle: "Lihat posisi petugas secara langsung sampai mereka tiba di lokasimu.",
    tone: "sky",
  },
  {
    title: "Kabar di setiap tahap",
    subtitle: "Laporan diterima, petugas berangkat, tiba, selesai — kamu tidak perlu menebak-nebak.",
    tone: "amber",
  },
  {
    title: "Nomor IGD 24 jam",
    subtitle: "Kontak IGD rumah sakit terdekat, tinggal ketuk untuk menelepon.",
    tone: "green",
  },
  {
    title: "Beri nilai petugas",
    subtitle: "Setelah selesai, beri bintang dan catatan. Masukanmu dibaca langsung oleh koordinator unit.",
    tone: "amber",
  },
];

const showcaseRef = ref<HTMLElement | null>(null);
const activeFeature = ref(0);
const stepProgress = ref(0);
let scrollRaf = 0;

function readActiveFromScroll() {
  const el = showcaseRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const range = rect.height - window.innerHeight;
  if (range <= 0) return;
  const progress = Math.max(0, Math.min(0.9999, -rect.top / range));
  const exact = progress * features.length;
  const idx = Math.min(features.length - 1, Math.floor(exact));
  if (activeFeature.value !== idx) activeFeature.value = idx;
  stepProgress.value = exact - idx;
}

function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    readActiveFromScroll();
    updateNavSuppression();
  });
}

function scrollToFeature(i: number) {
  const el = showcaseRef.value;
  if (!el) return;
  const range = el.offsetHeight - window.innerHeight;
  const top = el.getBoundingClientRect().top + window.scrollY + ((i + 0.15) / features.length) * range;
  window.scrollTo({ top, behavior: "smooth" });
}

function segmentFill(i: number) {
  if (i < activeFeature.value) return 1;
  if (i > activeFeature.value) return 0;
  return Math.max(0.04, stepProgress.value);
}

// ── Unit dashboard (sticky pills + sticky browser + scroll spy) ────────────
const dashboardFeatures: {
  icon: string;
  pillLabel: string;
  overline: string;
  title: string;
  description: string;
  tone: Tone;
  subs: { icon: string; title: string; description: string }[];
}[] = [
  {
    icon: "lucide:clipboard-list",
    pillLabel: "Order masuk",
    overline: "Semua laporan di satu tempat",
    title: "Laporan warga langsung jadi tiket yang siap dikerjakan",
    description:
      "Setiap laporan masuk ke papan tiket, diurutkan dari yang paling gawat. Ada hitung mundur di tiap tiket — kalau petugas belum merespons, laporannya otomatis dioper ke unit lain.",
    tone: "red",
    subs: [
      { icon: "lucide:layout-grid", title: "Papan 4 kolom", description: "Baru, menuju lokasi, di lokasi, selesai." },
      { icon: "lucide:alarm-clock", title: "Pengingat waktu respons", description: "Hitung mundur supaya tidak ada laporan yang terlewat." },
    ],
  },
  {
    icon: "lucide:map",
    pillLabel: "Peta langsung",
    overline: "Semua petugas dalam satu peta",
    title: "Lihat posisi petugas dan tiket yang sedang berjalan",
    description:
      "Peta real-time berisi posisi unit di lapangan, tiket aktif, dan area yang paling sering minta bantuan. Ketuk penanda untuk melihat detailnya.",
    tone: "sky",
    subs: [
      { icon: "lucide:navigation", title: "Posisi petugas", description: "Diperbarui berkala selama shift berjalan." },
      { icon: "lucide:layers", title: "Titik rawan", description: "Area dengan panggilan terbanyak dalam 24 jam." },
    ],
  },
  {
    icon: "lucide:bar-chart-3",
    pillLabel: "Kinerja",
    overline: "Angka yang membantu keputusan",
    title: "Tahu seberapa cepat tim merespons — dan apa kata warga",
    description:
      "Lihat rata-rata waktu respons, beban tiap unit, dan penilaian warga untuk setiap petugas. Rekapnya bisa diunduh untuk laporan bulanan.",
    tone: "green",
    subs: [
      { icon: "lucide:trophy", title: "Peringkat mingguan", description: "Unit tercepat dan paling disukai warga minggu ini." },
      { icon: "lucide:download", title: "Unduh rekap", description: "File CSV siap dikirim ke atasan atau dinas." },
    ],
  },
  {
    icon: "lucide:clipboard-check",
    pillLabel: "Cek armada",
    overline: "Ambulans selalu siap jalan",
    title: "Pastikan alat, obat, dan kru selalu lengkap",
    description:
      "Checklist rutin untuk setiap ambulans. Langsung kelihatan mana yang sudah lengkap dan mana yang perlu dilengkapi, dengan riwayat pengecekan yang tersimpan rapi.",
    tone: "amber",
    subs: [
      { icon: "lucide:shield-check", title: "Tanda terverifikasi", description: "Muncul setelah hasil pengecekan divalidasi." },
      { icon: "lucide:history", title: "Riwayat pengecekan", description: "Lengkap dengan foto di setiap item." },
    ],
  },
  {
    icon: "lucide:hospital",
    pillLabel: "Rumah sakit",
    overline: "Rujukan IGD terdekat",
    title: "Data rumah sakit yang selalu diperbarui",
    description:
      "Data RS diambil dari SATUSEHAT Kemenkes dan OpenStreetMap, dirapikan dari duplikat, lalu dipakai untuk menyarankan tujuan rujukan terdekat.",
    tone: "rose",
    subs: [
      { icon: "lucide:refresh-cw", title: "Sinkron SATUSEHAT", description: "Diperbarui berkala dari data Kemenkes." },
      { icon: "lucide:phone", title: "Kontak IGD", description: "Nomor IGD beserta status buka atau tutup." },
    ],
  },
];

const dashboardSlotEls: HTMLElement[] = [];
const activeDashboard = ref(0);
let dashboardIO: IntersectionObserver | null = null;

function setDashboardSlotRef(idx: number, el: unknown) {
  if (el instanceof HTMLElement) dashboardSlotEls[idx] = el;
}

function scrollToDashboardFeature(idx: number) {
  const el = dashboardSlotEls[idx];
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 140;
  window.scrollTo({ top, behavior: "smooth" });
}

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  readActiveFromScroll();
  updateNavSuppression();

  dashboardIO = new IntersectionObserver(
    (entries) => {
      let bestIdx = activeDashboard.value;
      let bestRatio = 0;
      for (const entry of entries) {
        const idx = Number((entry.target as HTMLElement).dataset.dashboardIdx);
        if (Number.isNaN(idx)) continue;
        if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio;
          bestIdx = idx;
        }
      }
      if (bestRatio > 0) activeDashboard.value = bestIdx;
    },
    // Only the middle band of the viewport counts, so a slot must be roughly
    // centred to become active.
    { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  for (const el of dashboardSlotEls) if (el) dashboardIO.observe(el);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  if (scrollRaf) cancelAnimationFrame(scrollRaf);
  dashboardIO?.disconnect();
  dashboardIO = null;
  navSuppressed.value = false;
});

// ── Coverage ───────────────────────────────────────────────────────────────
const stats: { value: string; label: string; note: string; tone: Tone }[] = [
  { value: "15+", label: "Provinsi", note: "Dari Sumatera sampai Papua.", tone: "red" },
  { value: "120+", label: "Kabupaten & kota", note: "Seluruh Jawa, plus kota-kota utama di luar Jawa.", tone: "amber" },
  { value: "250+", label: "Unit terhubung", note: "Dari instansi resmi sampai relawan.", tone: "sky" },
  { value: "2 mnt", label: "Batas tunggu respons", note: "Lewat dari itu, laporan dioper ke unit lain.", tone: "green" },
];

// ── FAQ ────────────────────────────────────────────────────────────────────
const faqs = FAQS.filter((f) => f.featured);
const openFaq = ref<number | null>(0);
function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i;
}

const unitFilters = ["Semua", "Ambulans", "Damkar", "SAR", "PMI", "RS"];
</script>

<template>
  <LandingShell>
    <!-- ================= HERO ================= -->
    <section class="relative pb-16 pt-32 sm:pt-40">
      <div aria-hidden="true" class="hero-backdrop pointer-events-none absolute inset-x-0 top-0 h-[720px]" />

      <div class="lp-container relative text-center">
        <a href="#cakupan" class="lp-chip transition-colors hover:bg-[var(--lp-surface)]" data-reveal>
          <span class="lp-live-dot" />
          Aktif di 15+ provinsi
          <Icon icon="lucide:arrow-right" class="text-[14px] text-[var(--lp-faint)]" />
        </a>

        <h1 class="lp-display mx-auto mt-7 max-w-[18ch]" data-reveal style="--d: 80ms">
          Bantuan darurat terdekat,<br class="hidden sm:block" /> <span class="text-[var(--lp-accent)]">dalam genggaman.</span>
        </h1>

        <p class="lp-lead mx-auto mt-6 max-w-[54ch]" data-reveal style="--d: 160ms">
          Cari ambulans, damkar, tim SAR, PMI, sampai rumah sakit terdekat
          langsung dari HP. Lapor dalam 30 detik, lalu pantau petugasnya sampai
          tiba.
        </p>

        <div class="mt-9 flex flex-wrap items-center justify-center gap-3" data-reveal style="--d: 240ms">
          <NuxtLink to="/" class="lp-btn lp-btn--accent">
            Buka aplikasi
            <Icon icon="lucide:arrow-right" class="lp-btn-arrow text-[16px]" />
          </NuxtLink>
          <a href="#fitur" class="lp-btn lp-btn--ghost">Lihat cara kerjanya</a>
        </div>

        <ul class="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13.5px] text-[var(--lp-muted)]" data-reveal style="--d: 320ms">
          <li v-for="t in ['Gratis', 'Tanpa daftar akun', 'Data tersimpan di Indonesia']" :key="t" class="flex items-center gap-1.5">
            <Icon icon="lucide:check" class="text-[15px] text-emerald-600" />
            {{ t }}
          </li>
        </ul>
      </div>

      <!-- Emergency numbers strip -->
      <div class="lp-container relative mt-20" data-reveal style="--d: 400ms">
        <div class="flex flex-col items-center gap-4 border-y border-[var(--lp-line)] py-6 text-center">
          <p class="text-[13.5px] text-[var(--lp-muted)]">
            <span class="font-semibold text-[var(--lp-ink)]">Kondisi gawat?</span>
            Jangan tunggu — telepon langsung:
          </p>
          <div class="flex flex-wrap justify-center gap-2" data-stagger>
            <a
              v-for="n in EMERGENCY_NUMBERS"
              :key="n.number"
              :href="`tel:${n.number}`"
              class="lp-chip pl-1.5 transition-colors hover:bg-[var(--lp-surface)]"
              :class="`lp-tone-${n.tone}`"
              :aria-label="`Telepon ${n.number}, ${n.label}`"
            >
              <span class="lp-well lp-well--sm"><Icon :icon="n.icon" class="text-[12px]" /></span>
              <span class="lp-mono text-[13.5px] font-medium text-[var(--lp-ink)]">{{ n.number }}</span>
              <span>{{ n.label }}</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= CITIZEN WALKTHROUGH (sticky phone) ================= -->
    <section id="fitur" ref="showcaseRef" class="relative" style="height: 520vh">
      <div class="sticky top-0 flex h-[100dvh] items-center">
        <div class="lp-container">
          <div class="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
            <!-- Left: step list (desktop) -->
            <div class="hidden lg:block">
              <span class="lp-eyebrow">Untuk warga</span>
              <h2 class="lp-h2 mt-4 max-w-[14ch]">Dari lapor sampai petugas tiba.</h2>

              <ol class="mt-10 min-h-[372px]">
                <li v-for="(f, i) in features" :key="f.title" class="relative" :class="`lp-tone-${f.tone}`">
                  <span class="absolute bottom-1 left-0 top-1 w-[2px] overflow-hidden rounded-full bg-[var(--lp-line)]" aria-hidden="true">
                    <span
                      class="block h-full w-full origin-top bg-[var(--tone)] transition-transform duration-150"
                      :style="{ transform: `scaleY(${segmentFill(i)})` }"
                    />
                  </span>
                  <button
                    type="button"
                    class="group flex w-full items-start gap-4 py-3 pl-6 text-left"
                    :aria-current="activeFeature === i ? 'step' : undefined"
                    @click="scrollToFeature(i)"
                  >
                    <span
                      class="lp-mono mt-[3px] text-[12px] transition-colors duration-300"
                      :class="activeFeature === i ? 'text-[var(--tone)]' : 'text-[var(--lp-faint)]'"
                    >
                      0{{ i + 1 }}
                    </span>
                    <span class="min-w-0 flex-1">
                      <span
                        class="block text-[17px] font-semibold tracking-[-0.02em] transition-colors duration-300"
                        :class="activeFeature === i ? 'text-[var(--lp-ink)]' : 'text-[var(--lp-faint)] group-hover:text-[var(--lp-muted)]'"
                      >
                        {{ f.title }}
                      </span>
                      <span class="lp-acc-body" :class="activeFeature === i && 'lp-acc-body--open'">
                        <span class="block overflow-hidden">
                          <span class="lp-body block max-w-[40ch] pt-1.5">{{ f.subtitle }}</span>
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              </ol>
            </div>

            <!-- Mobile caption -->
            <div class="text-center lg:hidden">
              <span class="lp-eyebrow">Langkah 0{{ activeFeature + 1 }} dari 06</span>
              <div class="relative mt-3 h-[88px]">
                <Transition name="caption">
                  <div :key="activeFeature" class="absolute inset-x-0 top-0">
                    <div class="text-[20px] font-bold tracking-[-0.03em]">{{ features[activeFeature]!.title }}</div>
                    <p class="lp-body mx-auto mt-1 max-w-[36ch] text-[14px]">{{ features[activeFeature]!.subtitle }}</p>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Right: phone on a stage tinted with the active step's tone -->
            <div class="phone-stage relative flex items-center justify-center">
              <div
                aria-hidden="true"
                class="phone-stage-bg absolute inset-0 hidden rounded-[40px] lg:block"
                :class="`lp-tone-${features[activeFeature]!.tone}`"
              />
              <div class="phone-scale relative">
                <div class="relative rounded-[48px] bg-[#1c1917] p-[7px] shadow-[0_40px_80px_-30px_rgba(28,25,23,0.55),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                  <div class="absolute left-1/2 top-[15px] z-20 h-[24px] w-[92px] -translate-x-1/2 rounded-full bg-[#1c1917]" />
                  <div class="relative h-[560px] w-[268px] overflow-hidden rounded-[41px] bg-white">
                    <Transition name="phone-fade">
                      <div :key="activeFeature" class="absolute inset-0">
                        <LandingPhoneScreens :screen="activeFeature" />
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>

              <!-- Mobile step dots -->
              <div class="absolute -bottom-7 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden" aria-hidden="true">
                <span
                  v-for="(f, i) in features"
                  :key="i"
                  class="h-1.5 rounded-full transition-all duration-300"
                  :class="[`lp-tone-${f.tone}`, activeFeature === i ? 'w-5 bg-[var(--tone)]' : 'w-1.5 bg-[var(--lp-line)]']"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= UNIT DASHBOARD (sticky browser) ================= -->
    <section
      id="dashboard"
      ref="dashboardSectionRef"
      class="relative bg-[var(--lp-surface)] pb-24 pt-24 lg:pb-32 lg:pt-32"
    >
      <div class="lp-container">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div data-reveal>
            <span class="lp-eyebrow">Untuk unit emergency</span>
            <h2 class="lp-h2 mt-4 max-w-[18ch]">Satu dashboard untuk seluruh kerja unit kamu.</h2>
          </div>
          <div data-reveal style="--d: 100ms">
            <p class="lp-lead max-w-[46ch]">
              Terima laporan, pantau petugas di peta, dan lihat kinerja tim dari
              satu layar — tanpa harus berkutat dengan spreadsheet.
            </p>
            <a :href="DASHBOARD_URL" class="lp-link mt-5">
              Masuk dashboard
              <Icon icon="lucide:arrow-up-right" class="lp-btn-arrow text-[16px]" />
            </a>
          </div>
        </div>
      </div>

      <!-- Sticky segmented control — docks under the nav while it's shown -->
      <div
        class="sticky z-30 mt-14 flex justify-center px-4 transition-[top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        :style="{ top: navVisible ? '84px' : '16px' }"
      >
        <div class="dashboard-pills flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-white/90 p-1.5 backdrop-blur-xl">
          <button
            v-for="(f, i) in dashboardFeatures"
            :key="f.pillLabel"
            type="button"
            class="dashboard-pill"
            :class="[`lp-tone-${f.tone}`, activeDashboard === i && 'dashboard-pill--active']"
            :aria-pressed="activeDashboard === i"
            @click="scrollToDashboardFeature(i)"
          >
            <Icon :icon="f.icon" class="dashboard-pill-icon text-[15px]" />
            <span>{{ f.pillLabel }}</span>
          </button>
        </div>
      </div>

      <div class="lp-container mt-10 lg:mt-14">
        <div class="grid gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <!-- Left: stacked slots -->
          <div class="flex flex-col gap-16 lg:gap-0">
            <section
              v-for="(f, i) in dashboardFeatures"
              :key="f.pillLabel"
              :ref="(el) => setDashboardSlotRef(i, el)"
              :data-dashboard-idx="i"
              class="dashboard-slot flex flex-col justify-center lg:min-h-[66vh] lg:py-8"
              :class="[`lp-tone-${f.tone}`, activeDashboard === i && 'dashboard-slot--active']"
            >
              <div class="flex items-center gap-3 text-[13px] text-[var(--lp-muted)]">
                <span class="lp-mono text-[var(--tone)]">0{{ i + 1 }}</span>
                <span class="h-px w-6 bg-[var(--lp-line)]" />
                {{ f.overline }}
              </div>
              <h3 class="mt-4 max-w-[22ch] text-[28px] font-bold leading-[1.15] sm:text-[34px]" style="text-wrap: balance">
                {{ f.title }}
              </h3>
              <p class="lp-body mt-5 max-w-[50ch] text-[16px]">{{ f.description }}</p>
              <div class="mt-8 grid gap-5 sm:grid-cols-2" data-stagger>
                <div v-for="sub in f.subs" :key="sub.title" class="flex items-start gap-3">
                  <span class="lp-well h-9 w-9 rounded-xl">
                    <Icon :icon="sub.icon" class="text-[16px]" />
                  </span>
                  <div class="min-w-0">
                    <h4 class="text-[15px] font-semibold">{{ sub.title }}</h4>
                    <p class="mt-0.5 text-[13.5px] leading-[1.55] text-[var(--lp-muted)]">{{ sub.description }}</p>
                  </div>
                </div>
              </div>

              <!-- Mobile: inline preview per slot -->
              <div class="browser-frame mt-8 lg:hidden">
                <div class="browser-chrome">
                  <div class="browser-dots"><span /><span /><span /></div>
                  <div class="browser-url">dashboard.butuhbantuan.space</div>
                </div>
                <div class="relative h-[320px] overflow-hidden">
                  <DashboardMock :variant="i" />
                </div>
              </div>
            </section>
          </div>

          <!-- Right: sticky browser (desktop) -->
          <div class="hidden lg:block">
            <div class="sticky" style="top: 160px">
              <div class="browser-frame">
                <div class="browser-chrome">
                  <div class="browser-dots"><span /><span /><span /></div>
                  <div class="browser-url">
                    <Icon icon="lucide:lock" class="text-[10px]" />
                    dashboard.butuhbantuan.space
                  </div>
                  <div class="w-12" />
                </div>
                <div class="relative h-[440px] overflow-hidden">
                  <Transition name="browser-fade">
                    <div :key="activeDashboard" class="absolute inset-0">
                      <DashboardMock :variant="activeDashboard" />
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= BENTO ================= -->
    <section class="lp-section">
      <div class="lp-container">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div data-reveal>
            <span class="lp-eyebrow">Kenapa ButuhBantuan</span>
            <h2 class="lp-h2 mt-4 max-w-[17ch]">Karena di saat darurat, tiap menit berharga.</h2>
          </div>
          <p class="lp-lead max-w-[46ch]" data-reveal style="--d: 100ms">
            Mencari unit, melapor, memantau petugas, sampai mengoper laporan —
            semuanya jalan di satu alur, jadi tidak ada waktu yang terbuang.
          </p>
        </div>

        <div class="mt-14 grid gap-4 lg:grid-cols-6">
          <!-- A: one map -->
          <article class="lp-feature lp-tone-sky relative min-h-[460px] lg:col-span-4" data-reveal="card">
            <span class="lp-feature-icon"><Icon icon="lucide:map" class="text-[20px]" /></span>
            <h3 class="lp-feature-head max-w-[24ch]">
              <span>Satu peta</span> untuk semua unit di sekitarmu.
            </h3>
            <ul class="lp-feature-list">
              <li><Icon icon="lucide:layers" class="text-[17px]" /> Ambulans, damkar, SAR, PMI, PSC 119, rumah sakit</li>
              <li><Icon icon="lucide:gauge" class="text-[17px]" /> Jarak dan perkiraan tiba tiap unit</li>
              <li><Icon icon="lucide:hand" class="text-[17px]" /> Minta bantuan tanpa pindah halaman</li>
            </ul>
            <NuxtLink to="/" class="lp-feature-link">
              Coba sekarang
              <Icon icon="lucide:chevron-right" class="text-[15px]" />
            </NuxtLink>
            <div class="lp-feature-preview">
              <div class="mb-5 flex flex-wrap gap-1.5">
                <span
                  v-for="(c, ci) in unitFilters"
                  :key="c"
                  class="rounded-full px-3 py-1.5 text-[12.5px] font-medium"
                  :class="ci === 0 ? 'bg-[var(--tone)] text-white' : 'bg-white text-[var(--lp-muted)]'"
                >
                  {{ c }}
                </span>
              </div>
            </div>
            <div class="lp-panel -mb-16 divide-y divide-[var(--lp-line)] sm:mr-16" data-stagger>
              <div
                v-for="u in [
                  { name: 'PSC 119 Sleman', kind: 'Ambulans', dist: '1,2 km', eta: '3 mnt', icon: 'mynaui:ambulance-solid', tone: 'red' },
                  { name: 'Damkar Yogyakarta', kind: 'Pemadam', dist: '2,8 km', eta: '7 mnt', icon: 'lucide:flame', tone: 'amber' },
                  { name: 'PMI Kota Yogyakarta', kind: 'PMI', dist: '3,4 km', eta: '9 mnt', icon: 'lucide:heart-pulse', tone: 'rose' },
                ]"
                :key="u.name"
                class="flex items-center gap-3 px-4 py-3.5"
                :class="`lp-tone-${u.tone}`"
              >
                <span class="lp-well h-9 w-9 rounded-xl"><Icon :icon="u.icon" class="text-[16px]" /></span>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-[14px] font-semibold">{{ u.name }}</div>
                  <div class="text-[12px] text-[var(--lp-muted)]">{{ u.kind }} · {{ u.dist }}</div>
                </div>
                <span class="lp-mono rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700">{{ u.eta }}</span>
              </div>
            </div>
          </article>

          <!-- B: report from the card -->
          <article class="lp-feature lp-tone-red min-h-[460px] lg:col-span-2" data-reveal="card" style="--d: 80ms">
            <span class="lp-feature-icon"><Icon icon="lucide:file-plus-2" class="text-[20px]" /></span>
            <h3 class="lp-feature-head max-w-[18ch]">
              <span>Lapor</span> langsung dari kartu unit.
            </h3>
            <ul class="lp-feature-list">
              <li><Icon icon="lucide:map-pin" class="text-[17px]" /> Lokasi terisi sendiri</li>
              <li><Icon icon="lucide:camera" class="text-[17px]" /> Foto langsung dari kamera</li>
              <li><Icon icon="lucide:send" class="text-[17px]" /> Terkirim ke unit terdekat</li>
            </ul>
            <div class="lp-feature-preview">
              <div class="lp-panel p-4">
                <div class="flex items-center justify-between">
                  <span class="lp-mono text-[11.5px] text-[var(--lp-muted)]">TKT-2591</span>
                  <span class="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Gawat</span>
                </div>
                <div class="mt-2 text-[15px] font-semibold">Sesak napas · anak 6 th</div>
                <div class="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--lp-muted)]">
                  <Icon icon="lucide:map-pin" class="text-[13px]" />
                  Ngaglik, Sleman
                </div>
              </div>
              <div class="mt-2 flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-[12.5px] text-[var(--lp-muted)]">
                <Icon icon="lucide:corner-down-right" class="text-[14px] text-[var(--tone)]" />
                Dikirim ke <span class="font-semibold text-[var(--lp-ink)]">PSC 119 Sleman</span>
              </div>
            </div>
          </article>

          <!-- C: automatic hand-off -->
          <article class="lp-feature lp-tone-amber min-h-[380px] lg:col-span-2" data-reveal="card">
            <span class="lp-feature-icon"><Icon icon="lucide:timer" class="text-[20px]" /></span>
            <h3 class="lp-feature-head max-w-[18ch]">
              <span>Belum dijawab?</span> Langsung dioper.
            </h3>
            <ul class="lp-feature-list">
              <li><Icon icon="lucide:alarm-clock" class="text-[17px]" /> Batas tunggu 2 menit</li>
              <li><Icon icon="lucide:repeat" class="text-[17px]" /> Diteruskan ke unit berikutnya</li>
            </ul>
            <div class="lp-feature-preview flex items-center gap-5">
              <div class="relative h-[104px] w-[104px] shrink-0">
                <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#fff" stroke-width="6" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="var(--tone)" stroke-width="6" stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="41" class="sla-ring" />
                </svg>
                <span class="lp-mono absolute inset-0 flex items-center justify-center text-[19px] font-medium">1:47</span>
              </div>
              <div class="min-w-0 text-[13px] leading-[1.6] text-[var(--lp-muted)]">
                <div class="font-semibold text-[var(--lp-ink)]">PSC 119 Sleman</div>
                belum merespons
                <div class="mt-2 flex items-center gap-1.5 font-medium text-[var(--tone)]">
                  <Icon icon="lucide:arrow-right" class="text-[14px]" />
                  PSC 119 Bantul
                </div>
              </div>
            </div>
          </article>

          <!-- D: PWA, no account -->
          <article class="lp-feature lp-tone-green relative min-h-[380px] lg:col-span-4" data-reveal="card" style="--d: 80ms">
            <div class="grid h-full gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
              <div class="max-w-[36ch] self-start">
                <span class="lp-feature-icon"><Icon icon="lucide:smartphone" class="text-[20px]" /></span>
                <h3 class="lp-feature-head max-w-[20ch]">
                  <span>Tanpa install,</span> tanpa akun.
                </h3>
                <ul class="lp-feature-list">
                  <li><Icon icon="lucide:globe" class="text-[17px]" /> Cukup buka dari browser</li>
                  <li><Icon icon="lucide:home" class="text-[17px]" /> Bisa ditambah ke layar utama</li>
                  <li><Icon icon="lucide:wifi-off" class="text-[17px]" /> Nomor darurat tetap ada saat offline</li>
                </ul>
                <div class="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px]">
                  <Icon icon="lucide:lock" class="text-[12px] text-[var(--tone)]" />
                  <span class="text-[var(--lp-ink)]">butuhbantuan.space</span>
                </div>
              </div>
              <div class="grid w-fit grid-cols-4 gap-3 self-end rounded-[28px] bg-white/70 p-4 sm:-mb-2" aria-hidden="true">
                <span v-for="n in 7" :key="n" class="h-12 w-12 rounded-[14px] bg-[var(--tone-soft)]" />
                <span class="relative flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--lp-accent)] shadow-[0_8px_18px_-6px_rgba(220,38,38,0.6)]">
                  <Icon icon="mynaui:ambulance-solid" class="text-[22px] text-white" />
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ================= COVERAGE ================= -->
    <section id="cakupan" class="pb-24 lg:pb-36">
      <div class="lp-container">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div data-reveal>
            <span class="lp-eyebrow">Cakupan</span>
            <h2 class="lp-h2 mt-4 max-w-[16ch]">Sudah ada di kota kamu.</h2>
          </div>
          <p class="lp-lead max-w-[46ch]" data-reveal style="--d: 100ms">
            Unit resmi dan relawan dari Sumatera sampai Papua. Seluruh kabupaten
            dan kota di Jawa sudah terjangkau.
          </p>
        </div>

        <dl class="mt-14 grid grid-cols-2 gap-y-8 border-t border-[var(--lp-line)] pt-8 lg:grid-cols-4">
          <div
            v-for="(s, i) in stats"
            :key="s.label"
            class="flex flex-col pr-6 lg:border-l lg:border-[var(--lp-line)] lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
            :class="`lp-tone-${s.tone}`"
            data-reveal
            :style="{ '--d': `${i * 70}ms` }"
          >
            <dd class="order-first text-[40px] font-bold leading-none tracking-[-0.04em] text-[var(--tone)] sm:text-[48px]" style="font-variant-numeric: tabular-nums">{{ s.value }}</dd>
            <dt class="mt-3 text-[14px] font-semibold">{{ s.label }}</dt>
            <p class="mt-1 text-[13px] leading-[1.5] text-[var(--lp-muted)]">{{ s.note }}</p>
          </div>
        </dl>

        <div class="lp-card relative isolate mt-12 p-2 sm:p-3" data-reveal>
          <CoverageMap />
          <div class="absolute bottom-6 left-6 z-[500] hidden flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-white/90 px-4 py-3 text-[12.5px] text-[var(--lp-ink-2)] shadow-[0_0_0_1px_rgba(28,25,23,0.06)] backdrop-blur sm:flex">
            <span class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-[3px] border border-red-500/50 bg-red-500/20" />
              Cakupan Jawa
            </span>
            <span class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-[#DC2626] ring-2 ring-white" />
              Kota utama
            </span>
            <span class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-[#1c1917] ring-2 ring-white" />
              Kab/kota di Jawa
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= FAQ ================= -->
    <section id="faq" class="lp-section border-t border-[var(--lp-line)]">
      <div class="lp-container grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div class="lg:sticky lg:top-28 lg:self-start" data-reveal>
          <span class="lp-eyebrow">FAQ</span>
          <h2 class="lp-h2 mt-4 max-w-[14ch]">Yang sering ditanyakan.</h2>
          <p class="lp-body mt-5 max-w-[38ch] text-[16px]">
            Belum ketemu jawabannya? Di pusat bantuan ada panduan lengkap untuk
            warga dan unit.
          </p>
          <NuxtLink to="/support" class="lp-link mt-6">
            Buka pusat bantuan
            <Icon icon="lucide:arrow-right" class="lp-btn-arrow text-[16px]" />
          </NuxtLink>
        </div>

        <div class="border-t border-[var(--lp-line)]">
          <div v-for="(f, i) in faqs" :key="f.q" class="border-b border-[var(--lp-line)]">
            <h3>
              <button
                :id="`faq-q-${i}`"
                type="button"
                class="flex w-full items-start justify-between gap-6 py-6 text-left"
                :aria-expanded="openFaq === i"
                :aria-controls="`faq-a-${i}`"
                @click="toggleFaq(i)"
              >
                <span class="text-[16.5px] font-semibold tracking-[-0.015em] sm:text-[17.5px]">{{ f.q }}</span>
                <span
                  class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-[transform,background-color,color] duration-300"
                  :class="openFaq === i ? 'rotate-45 bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]' : 'bg-[var(--lp-surface)] text-[var(--lp-ink)]'"
                >
                  <Icon icon="lucide:plus" class="text-[15px]" />
                </span>
              </button>
            </h3>
            <div
              :id="`faq-a-${i}`"
              role="region"
              :aria-labelledby="`faq-q-${i}`"
              class="lp-acc-body"
              :class="openFaq === i && 'lp-acc-body--open'"
            >
              <div>
                <p class="lp-body max-w-[62ch] pb-6 pr-12 text-[15.5px]">{{ f.a }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= CTA ================= -->
    <section class="pb-24 lg:pb-32">
      <div class="lp-container">
        <div class="lp-cta-panel relative overflow-hidden rounded-[36px] px-6 py-16 text-center sm:px-12 sm:py-24" data-reveal>
          <div class="relative">
            <h2 class="lp-h2 mx-auto max-w-[18ch]">Simpan sekarang, sebelum kamu membutuhkannya.</h2>
            <p class="lp-lead mx-auto mt-5 max-w-[48ch]">
              Buka butuhbantuan.space dan tambahkan ke layar utama. Punya unit
              darurat? Bergabung gratis.
            </p>
            <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
              <NuxtLink to="/" class="lp-btn lp-btn--light">
                Buka aplikasi
                <Icon icon="lucide:arrow-right" class="lp-btn-arrow text-[16px]" />
              </NuxtLink>
              <NuxtLink to="/support?topik=unit#kontak" class="lp-btn lp-btn--outline-light">Daftarkan unit kamu</NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </LandingShell>
</template>

<style scoped>
/* Hero: faint dot grid that fades out, with a whisper of brand red. */
.hero-backdrop {
  background-image:
    radial-gradient(ellipse 60% 45% at 50% 0%, rgba(220, 38, 38, 0.08), transparent 70%),
    radial-gradient(ellipse 30% 30% at 85% 25%, rgba(2, 132, 199, 0.06), transparent 70%),
    radial-gradient(ellipse 30% 30% at 12% 35%, rgba(217, 119, 6, 0.06), transparent 70%),
    radial-gradient(rgba(28, 25, 23, 0.1) 1px, transparent 1px);
  background-size:
    100% 100%,
    100% 100%,
    100% 100%,
    22px 22px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 20%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 20%, #000 30%, transparent 75%);
}

/* ── Walkthrough phone ─────────────────────────────────────────────────── */
.phone-stage {
  height: min(680px, calc(100dvh - 120px));
}
@media (max-width: 1023px) {
  .phone-stage {
    height: auto;
  }
}
.phone-stage-bg {
  background-color: var(--tone-soft);
  background-image: radial-gradient(rgba(28, 25, 23, 0.08) 1px, transparent 1px);
  background-size: 18px 18px;
  transition: background-color 0.6s var(--lp-ease);
}

/* Scale the 574px-tall phone to fit short viewports; negative margins give
   back the space the transform doesn't. */
.phone-scale {
  --s: 1;
  transform: scale(var(--s));
  margin-block: calc(287px * (var(--s) - 1));
}
@media (min-width: 1024px) and (max-height: 840px) {
  .phone-scale {
    --s: 0.86;
  }
}
@media (min-width: 1024px) and (max-height: 720px) {
  .phone-scale {
    --s: 0.74;
  }
}
@media (max-width: 1023px) {
  .phone-scale {
    --s: 0.74;
  }
}
@media (max-width: 1023px) and (max-height: 700px) {
  .phone-scale {
    --s: 0.62;
  }
}

.phone-fade-enter-active,
.phone-fade-leave-active {
  transition:
    opacity 0.45s var(--lp-ease),
    transform 0.45s var(--lp-ease);
}
.phone-fade-enter-from {
  opacity: 0;
  transform: translateY(14px);
}
.phone-fade-leave-to {
  opacity: 0;
  transform: translateY(-14px);
}

.caption-enter-active,
.caption-leave-active {
  transition:
    opacity 0.35s var(--lp-ease),
    transform 0.35s var(--lp-ease);
}
.caption-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.caption-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Dashboard showcase ────────────────────────────────────────────────── */
.dashboard-pills {
  scrollbar-width: none;
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.07),
    0 12px 30px -12px rgba(28, 25, 23, 0.2);
}
.dashboard-pills::-webkit-scrollbar {
  display: none;
}
.dashboard-pill {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding-inline: 14px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--lp-muted);
  transition:
    background-color 0.3s var(--lp-ease),
    color 0.3s var(--lp-ease);
}
.dashboard-pill-icon {
  color: var(--tone);
}
.dashboard-pill:hover {
  color: var(--lp-ink);
}
.dashboard-pill--active {
  background: var(--tone-soft);
  color: var(--lp-ink);
}

@media (min-width: 1024px) {
  .dashboard-slot {
    opacity: 0.4;
    transition: opacity 0.5s var(--lp-ease);
  }
  .dashboard-slot--active {
    opacity: 1;
  }
}

.browser-frame {
  overflow: hidden;
  border-radius: 18px;
  background: #fff;
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.07),
    0 40px 80px -40px rgba(28, 25, 23, 0.35);
}
.browser-chrome {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--lp-line);
  background: #fafaf9;
}
.browser-dots {
  display: flex;
  gap: 6px;
}
.browser-dots span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #e7e5e4;
}
.browser-url {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 260px;
  margin-inline: auto;
  padding: 4px 10px;
  border-radius: 8px;
  background: #fff;
  box-shadow: inset 0 0 0 1px var(--lp-line);
  font-size: 11px;
  color: var(--lp-muted);
}

.browser-fade-enter-active,
.browser-fade-leave-active {
  transition:
    opacity 0.45s var(--lp-ease),
    transform 0.45s var(--lp-ease);
}
.browser-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.browser-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ── Bento ─────────────────────────────────────────────────────────────── */
.sla-ring {
  animation: sla-tick 10s linear infinite;
}
@keyframes sla-tick {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: 276.5;
  }
}
</style>
