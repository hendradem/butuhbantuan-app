<script setup lang="ts">
/**
 * /landing — public marketing page.
 *
 * Clean, light layout (references: Linear, Amie, Vercel): white canvas,
 * warm-stone surfaces, brand red as the lead accent plus one supporting tone
 * per service family (see .lp-tone-* in landing.css). Sections: hero →
 * citizen walkthrough (sticky phone + scroll spy) → unit dashboard (sticky
 * browser + scroll spy) → bento → install-to-home-screen steps → coverage →
 * sponsors → FAQ → CTA. Nav/footer/fonts live in LandingShell so /tentang
 * and /support share them.
 */
import { Icon } from "@iconify/vue";
import {
  DASHBOARD_URL,
  EMERGENCY_NUMBERS,
  FAQS,
  HOW_IT_WORKS,
  TESTIMONIALS,
  type Tone,
} from "~/utils/landingContent";
import { SPONSORS, SPONSOR_INFO_PATH, SPONSOR_PLACEHOLDER_SLOTS } from "~/utils/sponsors";

definePageMeta({ layout: false });

const title = "ButuhBantuan · Peta bantuan darurat warga Indonesia";
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
    subtitle: "Laporan diterima, petugas berangkat, tiba, sampai selesai. Kamu tidak perlu menebak-nebak.",
    tone: "amber",
  },
  {
    title: "Beri nilai petugas",
    subtitle: "Setelah selesai, beri bintang dan catatan. Masukanmu dibaca langsung oleh koordinator unit.",
    tone: "amber",
  },
];

/**
 * Chips that float beside the phone, one set per step, so the stage says
 * something specific at each beat instead of only changing colour. Positions
 * are picked per screen to sit over sparse parts of it — the map area, the gap
 * between cards — rather than across a line of text.
 */
const stepChips: { icon: string; label: string; pos: string; tint: string }[][] = [
  [
    { icon: "mynaui:ambulance-solid", label: "1,2 km", pos: "-left-12 top-[30%]", tint: "bg-[#fce4f0] text-[#8b5cf6]" },
    { icon: "lucide:hospital", label: "IGD buka", pos: "-right-12 bottom-[30%]", tint: "bg-[#e6f0fb] text-[#4a90e2]" },
  ],
  [
    { icon: "lucide:map-pin", label: "Lokasi terkunci", pos: "-right-12 top-[11%]", tint: "bg-emerald-50 text-emerald-700" },
    { icon: "lucide:camera", label: "Foto siap", pos: "-left-12 bottom-[13%]", tint: "bg-[#fce4f0] text-[#8b5cf6]" },
  ],
  [
    { icon: "lucide:clock", label: "4 mnt", pos: "-right-12 top-[40%]", tint: "bg-emerald-50 text-emerald-700" },
    { icon: "lucide:route", label: "Rute aktif", pos: "-left-12 bottom-[28%]", tint: "bg-[#e6f0fb] text-[#4a90e2]" },
  ],
  [
    { icon: "lucide:bell-ring", label: "Petugas tiba", pos: "-left-12 top-[19%]", tint: "bg-amber-50 text-amber-700" },
    { icon: "lucide:link-2", label: "Link dibagikan", pos: "-right-12 bottom-[26%]", tint: "bg-[#fce4f0] text-[#8b5cf6]" },
  ],
  [
    { icon: "lucide:star", label: "5 bintang", pos: "-right-12 top-[26%]", tint: "bg-amber-50 text-amber-700" },
    { icon: "lucide:message-square", label: "Catatan dikirim", pos: "-left-12 bottom-[10%]", tint: "bg-[#fce8f3] text-[#db2777]" },
  ],
];

const showcaseRef = ref<HTMLElement | null>(null);
const activeFeature = ref(0);
let scrollRaf = 0;

// The phone also plays the flow on its own, like a looping demo, so a visitor
// who never scrolls still sees all six steps. Scrolling takes precedence: it
// sets the step and restarts the timer, which then resumes from wherever the
// reader left it.
const STEP_MS = 4200;
let stepTimer: ReturnType<typeof setInterval> | null = null;
let showcaseVisible = false;
let showcaseIO: IntersectionObserver | null = null;

/** Bumped whenever the beat restarts, so the auto-advance bar replays. */
const stepTick = ref(0);

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function stopStepLoop() {
  if (stepTimer !== null) {
    clearInterval(stepTimer);
    stepTimer = null;
  }
}

function startStepLoop() {
  stopStepLoop();
  if (!showcaseVisible || prefersReducedMotion()) return;
  stepTimer = setInterval(() => {
    activeFeature.value = (activeFeature.value + 1) % features.length;
    stepTick.value += 1;
  }, STEP_MS);
}

// ── Hero prototype ─────────────────────────────────────────────────────────
// The same self-playing demo, on the phone at the top of the page: it is the
// first thing a visitor sees, so it should not sit frozen on step one.
const HERO_STEP_MS = 3600;
const heroStageRef = ref<HTMLElement | null>(null);
const heroScreen = ref(0);
let heroTimer: ReturnType<typeof setInterval> | null = null;
let heroIO: IntersectionObserver | null = null;

function stopHeroLoop() {
  if (heroTimer !== null) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
}

function startHeroLoop() {
  stopHeroLoop();
  if (prefersReducedMotion()) return;
  heroTimer = setInterval(() => {
    heroScreen.value = (heroScreen.value + 1) % features.length;
  }, HERO_STEP_MS);
}

function readActiveFromScroll() {
  const el = showcaseRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const range = rect.height - window.innerHeight;
  if (range <= 0) return;
  const progress = Math.max(0, Math.min(0.9999, -rect.top / range));
  const exact = progress * features.length;
  const idx = Math.min(features.length - 1, Math.floor(exact));
  if (activeFeature.value !== idx) {
    activeFeature.value = idx;
    startStepLoop();
  }
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
    pillLabel: "Pesanan masuk",
    overline: "Semua laporan di satu papan",
    title: "Laporan warga langsung jadi tiket yang siap dikerjakan",
    description:
      "Lihat laporan yang masuk dalam tiga tampilan: peta sebaran, tabel, dan papan kanban. Ada batas waktu respons di tiap tiket, jadi kalau petugas belum menerima, laporannya otomatis dioper ke unit lain.",
    tone: "red",
    subs: [
      { icon: "lucide:map", title: "Peta sebaran", description: "Marker tiap laporan plus heatmap titik rawan." },
      { icon: "lucide:layout-grid", title: "Tabel dan kanban", description: "Seret kartu untuk memajukan status." },
    ],
  },
  {
    icon: "lucide:map",
    pillLabel: "Peta ops",
    overline: "Semua petugas dalam satu peta",
    title: "Lihat posisi petugas dan tiket yang sedang berjalan",
    description:
      "Peta wilayah berisi posisi unit di lapangan, tiket aktif, dan area yang paling sering minta bantuan. Ketuk penanda untuk melihat detail unit maupun laporannya.",
    tone: "sky",
    subs: [
      { icon: "lucide:navigation", title: "Posisi petugas", description: "Diperbarui berkala selama shift berjalan." },
      { icon: "lucide:layers", title: "Titik rawan", description: "Area dengan panggilan terbanyak dalam 24 jam." },
    ],
  },
  {
    icon: "lucide:bar-chart-3",
    pillLabel: "Statistik",
    overline: "Angka yang membantu keputusan",
    title: "Tahu seberapa cepat tim merespons dan apa kata warga",
    description:
      "Tren tiket, waktu respons, waktu tiba, sampai tingkat pembatalan dalam 7, 30, atau 90 hari terakhir. Ringkasannya bisa dibagikan ke warga atau mitra.",
    tone: "green",
    subs: [
      { icon: "lucide:trending-up", title: "Tren harian", description: "Naik turun jumlah tiket sepanjang periode." },
      { icon: "lucide:pie-chart", title: "Status tiket", description: "Selesai, berjalan, dan dibatalkan." },
    ],
  },
  {
    icon: "lucide:clipboard-check",
    pillLabel: "Kelengkapan ambulans",
    overline: "Ambulans selalu siap jalan",
    title: "Checklist alat mengikuti Pedoman Teknis Kemenkes",
    description:
      "Tandai tiap alat Ada, Tidak, atau Belum dicek, lengkap dengan foto kondisinya. Persentase kesiapan langsung terhitung untuk tiap tipe ambulans.",
    tone: "amber",
    subs: [
      { icon: "mynaui:ambulance-solid", title: "Per tipe ambulans", description: "Transport darat, gawat darurat, roda dua." },
      { icon: "lucide:camera", title: "Bukti foto", description: "Tiap item bisa dilampiri foto kondisinya." },
    ],
  },
  {
    icon: "lucide:hospital",
    pillLabel: "Rumah sakit",
    overline: "Rujukan IGD terdekat",
    title: "Data rumah sakit yang selalu diperbarui",
    description:
      "Data RS diambil dari SATUSEHAT Kemenkes dan OpenStreetMap, dirapikan dari duplikat, lalu dipakai untuk menyarankan tujuan rujukan terdekat beserta kontak IGD-nya.",
    tone: "rose",
    subs: [
      { icon: "lucide:refresh-cw", title: "Sinkron SATUSEHAT", description: "Diperbarui berkala dari data Kemenkes." },
      { icon: "lucide:phone", title: "Kontak IGD", description: "Nomor IGD beserta status buka atau tutup." },
    ],
  },
  {
    icon: "lucide:message-circle-heart",
    pillLabel: "Feedback",
    overline: "Suara warga sampai ke unit",
    title: "Penilaian warga masuk langsung ke arsip unit",
    description:
      "Setiap laporan yang selesai bisa dinilai warga. Semua masukan terkumpul di satu arsip, lengkap dengan komentar dan kanal asalnya.",
    tone: "sky",
    subs: [
      { icon: "lucide:thumbs-up", title: "Membantu atau tidak", description: "Ringkasan persentase dari semua penilaian." },
      { icon: "lucide:quote", title: "Komentar warga", description: "Catatan asli dari pelapor, apa adanya." },
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

  // Only play the phone while the walkthrough is actually on screen.
  showcaseIO = new IntersectionObserver(
    ([entry]) => {
      showcaseVisible = !!entry?.isIntersecting;
      if (showcaseVisible) startStepLoop();
      else stopStepLoop();
    },
    { threshold: 0.15 },
  );
  if (showcaseRef.value) showcaseIO.observe(showcaseRef.value);

  // Same for the hero phone: play only while it is on screen.
  heroIO = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) startHeroLoop();
      else stopHeroLoop();
    },
    { threshold: 0.2 },
  );
  if (heroStageRef.value) heroIO.observe(heroStageRef.value);

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
  stopStepLoop();
  showcaseIO?.disconnect();
  showcaseIO = null;
  stopHeroLoop();
  heroIO?.disconnect();
  heroIO = null;
  dashboardIO?.disconnect();
  dashboardIO = null;
  navSuppressed.value = false;
});

// ── Install to home screen ──────────────────────────────────────────────────
const installSteps: { title: string; body: string; tone: Tone }[] = [
  {
    title: "Buka dari browser",
    body: "Kunjungi butuhbantuan.space lewat Chrome di Android atau Safari di iPhone. Tidak perlu unduh dari Play Store atau App Store.",
    tone: "sky",
  },
  {
    title: "Ketuk menu bagikan atau titik tiga",
    body: "Di Chrome, ketuk titik tiga di pojok kanan atas. Di Safari, ketuk ikon bagikan di bagian bawah layar.",
    tone: "amber",
  },
  {
    title: "Pilih “Tambahkan ke layar utama”",
    body: "Ikon ButuhBantuan langsung muncul di layar utama, siap dibuka kapan saja seperti aplikasi biasa.",
    tone: "green",
  },
];

// ── Coverage ───────────────────────────────────────────────────────────────
const stats: { value: string; label: string; note: string; tone: Tone; icon: string }[] = [
  { value: "15+", label: "Provinsi", note: "Dari Sumatera sampai Papua.", tone: "teal", icon: "lucide:map" },
  { value: "120+", label: "Kabupaten & kota", note: "Seluruh Jawa, plus kota-kota utama di luar Jawa.", tone: "sky", icon: "lucide:building-2" },
  { value: "250+", label: "Unit terhubung", note: "Dari instansi resmi sampai relawan.", tone: "violet", icon: "mynaui:ambulance-solid" },
  { value: "2 mnt", label: "Batas tunggu respons", note: "Lewat dari itu, laporan dioper ke unit lain.", tone: "amber", icon: "lucide:timer" },
];

// ── Sponsors ───────────────────────────────────────────────────────────────
const sortedSponsors = computed(() =>
  [...SPONSORS].sort((a, b) => Number(b.tier === "utama") - Number(a.tier === "utama")),
);

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
    <section class="relative overflow-hidden pb-16 pt-24 sm:pt-28">
      <div aria-hidden="true" class="hero-backdrop pointer-events-none absolute inset-x-0 top-0 h-[880px]" />

      <div class="lp-container relative">
        <div class="grid items-center gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div class="text-center lg:text-left">
            <a href="#cakupan" class="lp-chip transition-colors hover:bg-[var(--lp-surface)]" data-reveal>
              <span class="lp-live-dot" />
              Aktif di 15+ provinsi
              <Icon icon="lucide:arrow-right" class="text-[14px] text-[var(--lp-faint)]" />
            </a>

            <h1 class="lp-display lp-display--compact mx-auto mt-6 max-w-[20ch] lg:mx-0" data-reveal style="--d: 80ms">
              Bantuan darurat terdekat,<br class="hidden sm:block" /> <span class="text-[var(--lp-accent)]">dalam genggaman.</span>
            </h1>

            <p class="lp-lead mx-auto mt-6 max-w-[54ch] lg:mx-0" data-reveal style="--d: 160ms">
              Cari ambulans, damkar, tim SAR, PMI, sampai rumah sakit terdekat
              langsung dari HP. Lapor dalam 30 detik, lalu pantau petugasnya sampai
              tiba.
            </p>

            <div class="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start" data-reveal style="--d: 240ms">
              <NuxtLink to="/" class="lp-btn lp-btn--accent">
                Buka aplikasi
                <Icon icon="lucide:arrow-right" class="lp-btn-arrow text-[16px]" />
              </NuxtLink>
              <a href="#fitur" class="lp-btn lp-btn--ghost">Lihat cara kerjanya</a>
            </div>

            <ul class="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13.5px] text-[var(--lp-muted)] lg:justify-start" data-reveal style="--d: 320ms">
              <li v-for="t in ['Gratis', 'Tanpa daftar akun', 'Data tersimpan di Indonesia']" :key="t" class="flex items-center gap-1.5">
                <Icon icon="lucide:check" class="text-[15px] text-emerald-600" />
                {{ t }}
              </li>
            </ul>
          </div>

          <!-- Product: the map screen a warga actually opens, then the flow
               plays itself on through the rest of the steps. -->
          <div ref="heroStageRef" class="hero-stage relative" data-reveal style="--d: 200ms">
            <div class="phone-scale relative lp-tone-sky">
              <div aria-hidden="true" class="hero-pad" />
              <LandingPhone>
                <Transition name="phone-fade">
                  <div :key="heroScreen" class="absolute inset-0">
                    <LandingPhoneScreens :screen="heroScreen" />
                  </div>
                </Transition>
              </LandingPhone>
            </div>
          </div>
        </div>
      </div>

      <!-- Emergency numbers strip -->
      <div class="lp-container relative mt-10" data-reveal style="--d: 400ms">
        <div class="flex flex-col items-center gap-4 border-y border-[var(--lp-line)] py-6 text-center">
          <p class="text-[13.5px] text-[var(--lp-muted)]">
            <span class="font-semibold text-[var(--lp-ink)]">Kondisi gawat?</span>
            Jangan tunggu, telepon langsung:
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
    <section id="fitur" ref="showcaseRef" class="relative" style="height: 440vh">
      <div class="sticky top-0 flex h-[100dvh] items-center">
        <div class="lp-container">
          <div class="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
            <!-- Left: the steps, the active one taking the floor -->
            <div class="hidden lg:block">
              <span class="lp-eyebrow">Untuk warga</span>
              <h2 class="lp-h2 mt-4 max-w-[14ch]">Dari lapor sampai petugas tiba.</h2>

              <ol class="mt-8 space-y-1" :style="{ '--step-ms': `${STEP_MS}ms` }">
                <li v-for="(f, i) in features" :key="f.title" :class="`lp-tone-${f.tone}`">
                  <button
                    type="button"
                    class="grid w-full grid-cols-[68px_1fr] items-start gap-4 rounded-[22px] px-4 py-3 text-left transition-colors duration-300"
                    :class="activeFeature === i ? 'lp-tint' : 'hover:bg-[var(--lp-surface)]'"
                    :aria-current="activeFeature === i ? 'step' : undefined"
                    @click="scrollToFeature(i)"
                  >
                    <span
                      class="lp-mono text-[36px] font-bold leading-[0.9] tracking-[-0.05em] transition-colors duration-300"
                      :class="activeFeature === i ? 'text-[var(--tone)]' : 'text-[var(--lp-faint)] opacity-50'"
                    >
                      0{{ i + 1 }}
                    </span>
                    <span class="min-w-0 pt-1">
                      <span
                        class="block text-[16.5px] font-semibold tracking-[-0.02em] transition-colors duration-300"
                        :class="activeFeature === i ? 'text-[var(--lp-ink)]' : 'text-[var(--lp-muted)]'"
                      >
                        {{ f.title }}
                      </span>
                      <!-- Reserved two lines, so switching steps never shifts the list -->
                      <span
                        v-if="activeFeature === i"
                        class="mt-1.5 block min-h-[42px] text-[14px] leading-[1.55] text-[var(--lp-ink-2)]"
                      >
                        {{ f.subtitle }}
                      </span>
                      <!-- The beat, made visible. Restarts when the beat does. -->
                      <span
                        v-if="activeFeature === i"
                        class="mt-2.5 block h-[3px] w-full overflow-hidden rounded-full bg-[var(--tone-line)]"
                        aria-hidden="true"
                      >
                        <span :key="stepTick" class="lp-beat block h-full w-full origin-left rounded-full bg-[var(--tone)]" />
                      </span>
                    </span>
                  </button>
                </li>
              </ol>
            </div>

            <!-- Mobile caption -->
            <div class="text-center lg:hidden">
              <span class="lp-eyebrow">Langkah 0{{ activeFeature + 1 }} dari 0{{ features.length }}</span>
              <div class="relative mt-3 h-[88px]">
                <Transition name="caption">
                  <div :key="activeFeature" class="absolute inset-x-0 top-0">
                    <div class="text-[20px] font-bold tracking-[-0.03em]">{{ features[activeFeature]!.title }}</div>
                    <p class="lp-body mx-auto mt-1 max-w-[36ch] text-[14px]">{{ features[activeFeature]!.subtitle }}</p>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Right: the phone on a stage that takes the step's colour -->
            <div class="phone-stage relative flex items-center justify-center">
              <div
                class="phone-stage-panel"
                :class="`lp-tone-${features[activeFeature]!.tone}`"
                aria-hidden="true"
              >
                <span class="phone-stage-grid absolute inset-0" />
                <span class="phone-stage-wash absolute inset-0" />
              </div>

              <div class="phone-scale relative z-10" :class="`lp-tone-${features[activeFeature]!.tone}`">
                <LandingPhone>
                  <Transition name="phone-fade">
                    <div :key="activeFeature" class="absolute inset-0">
                      <LandingPhoneScreens :screen="activeFeature" />
                    </div>
                  </Transition>
                </LandingPhone>

                <!-- Ornaments: what just happened, beside the device -->
                <span
                  v-for="(c, ci) in stepChips[activeFeature]"
                  :key="`${stepTick}-${ci}`"
                  class="lp-float absolute z-20 flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-[0_0_0_1px_rgba(28,25,23,0.05),0_14px_26px_-14px_rgba(28,25,23,0.5)]"
                  :class="c.pos"
                  :style="{ '--d': `${ci * 140}ms` }"
                >
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" :class="c.tint">
                    <Icon :icon="c.icon" class="text-[13px]" />
                  </span>
                  <span class="whitespace-nowrap text-[12px] font-semibold">{{ c.label }}</span>
                </span>
              </div>

              <!-- Mobile step dots -->
              <div class="absolute -bottom-7 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 lg:hidden" aria-hidden="true">
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

    <!-- ================= CARA KERJA ================= -->
    <section class="py-24 lg:py-32">
      <div class="lp-container">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div class="lp-tone-sky" data-reveal>
            <span class="lp-eyebrow">Cara kerja</span>
            <h2 class="lp-h2 mt-4 max-w-[17ch]">Tiga langkah dari lapor sampai petugas tiba.</h2>
          </div>
          <p class="lp-lead max-w-[46ch]" data-reveal style="--d: 100ms">
            Tidak ada langkah yang harus kamu tebak. Setiap tahap punya kabar,
            jadi kamu tahu bantuan sedang dalam perjalanan.
          </p>
        </div>

        <ol class="how-steps relative mt-14 grid gap-4 sm:grid-cols-3">
          <li
            v-for="(s, i) in HOW_IT_WORKS"
            :key="s.title"
            class="lp-tint flex flex-col rounded-[24px] p-6 sm:p-7"
            :class="`lp-tone-${s.tone}`"
            data-reveal
            :style="{ '--d': `${i * 90}ms` }"
          >
            <div class="flex items-center justify-between">
              <span class="lp-well"><Icon :icon="s.icon" class="text-[20px]" /></span>
              <span class="lp-mono text-[12px] text-[var(--tone)]">0{{ i + 1 }}</span>
            </div>
            <h3 class="mt-7 text-[17px] font-semibold tracking-[-0.015em]">{{ s.title }}</h3>
            <p class="lp-body mt-2">{{ s.body }}</p>
          </li>
        </ol>
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
          <div class="lp-tone-green" data-reveal>
            <span class="lp-eyebrow">Untuk unit emergency</span>
            <h2 class="lp-h2 mt-4 max-w-[18ch]">Satu dashboard untuk seluruh kerja unit kamu.</h2>
          </div>
          <div data-reveal style="--d: 100ms">
            <p class="lp-lead max-w-[46ch]">
              Terima laporan, pantau petugas di peta, dan lihat kinerja tim dari
              satu layar, tanpa harus berkutat dengan spreadsheet.
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <NuxtLink to="/daftar-unit" class="lp-btn lp-btn--accent">
                Daftarkan unit kamu
                <Icon icon="lucide:arrow-right" class="lp-btn-arrow text-[16px]" />
              </NuxtLink>
              <a :href="DASHBOARD_URL" class="lp-link text-[14px]">
                Masuk dashboard
                <Icon icon="lucide:arrow-up-right" class="lp-btn-arrow text-[15px]" />
              </a>
            </div>
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
        <div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-16">
          <div class="lp-tone-teal" data-reveal>
            <span class="lp-pill">
              Kenapa ButuhBantuan
              <Icon icon="lucide:arrow-right" class="text-[14px]" />
            </span>
            <h2 class="lp-h2 mt-5 max-w-[17ch]">Karena di saat darurat, tiap menit berharga.</h2>
          </div>
          <p class="lp-lead max-w-[46ch]" data-reveal style="--d: 100ms">
            Mencari unit, melapor, memantau petugas, sampai menilai pelayanannya —
            semuanya jalan di satu alur, jadi tidak ada waktu yang terbuang.
          </p>
        </div>

        <div class="mt-14 grid gap-6 lg:grid-cols-6">
          <!-- A: one map for every unit -->
          <article class="lp-card-soft lp-tone-teal lg:col-span-4" data-reveal="card">
            <div class="lp-card-top">
              <div class="flex items-start gap-3">
                <Icon icon="lucide:map" class="mt-0.5 shrink-0 text-[20px] text-[var(--tone)]" />
                <h3 class="lp-card-title max-w-[26ch]">Satu peta untuk semua unit di sekitarmu</h3>
              </div>
              <span class="lp-card-arrow" aria-hidden="true"><Icon icon="lucide:arrow-right" class="text-[15px]" /></span>
            </div>
            <p class="lp-card-sub">
              Ambulans, damkar, SAR, PMI, PSC 119, sampai rumah sakit — diurutkan dari
              yang paling dekat, lengkap dengan perkiraan tibanya.
            </p>
            <div class="lp-card-mock"><AppScreenMock variant="units" /></div>
          </article>

          <!-- B: report without an account -->
          <article class="lp-card-soft lp-tone-red lg:col-span-2" data-reveal="card" style="--d: 80ms">
            <div class="lp-card-top">
              <div class="flex items-start gap-3">
                <Icon icon="lucide:file-plus-2" class="mt-0.5 shrink-0 text-[20px] text-[var(--tone)]" />
                <h3 class="lp-card-title max-w-[18ch]">Lapor tanpa bikin akun</h3>
              </div>
              <span class="lp-card-arrow" aria-hidden="true"><Icon icon="lucide:arrow-right" class="text-[15px]" /></span>
            </div>
            <p class="lp-card-sub">
              Lokasi dan foto terisi sendiri. Satu ketukan, laporan langsung sampai ke
              unit terdekat.
            </p>
            <div class="lp-card-mock"><AppScreenMock variant="trip" /></div>
          </article>

          <!-- C: triage -->
          <article class="lp-card-soft lp-tone-amber lg:col-span-2" data-reveal="card">
            <div class="lp-card-top">
              <div class="flex items-start gap-3">
                <Icon icon="lucide:clipboard-list" class="mt-0.5 shrink-0 text-[20px] text-[var(--tone)]" />
                <h3 class="lp-card-title max-w-[18ch]">Pertanyaan yang mengarahkan</h3>
              </div>
              <span class="lp-card-arrow" aria-hidden="true"><Icon icon="lucide:arrow-right" class="text-[15px]" /></span>
            </div>
            <p class="lp-card-sub">
              Beberapa pertanyaan singkat membantu petugas menyiapkan tindakan sebelum
              tiba di lokasi.
            </p>
            <div class="lp-card-mock"><AppScreenMock variant="triage" /></div>
          </article>

          <!-- D: search and categories -->
          <article class="lp-card-soft lp-tone-violet lg:col-span-2" data-reveal="card" style="--d: 80ms">
            <div class="lp-card-top">
              <div class="flex items-start gap-3">
                <Icon icon="lucide:search" class="mt-0.5 shrink-0 text-[20px] text-[var(--tone)]" />
                <h3 class="lp-card-title max-w-[18ch]">Cari lokasi, bukan alamat panjang</h3>
              </div>
              <span class="lp-card-arrow" aria-hidden="true"><Icon icon="lucide:arrow-right" class="text-[15px]" /></span>
            </div>
            <p class="lp-card-sub">
              Ketik nama jalan atau pakai lokasi sekarang, lalu pilih layanan yang kamu
              butuhkan langsung dari peta.
            </p>
            <div class="lp-card-mock"><AppScreenMock variant="dock" /></div>
          </article>

          <!-- E: rating -->
          <article class="lp-card-soft lp-tone-rose lg:col-span-2" data-reveal="card" style="--d: 160ms">
            <div class="lp-card-top">
              <div class="flex items-start gap-3">
                <Icon icon="lucide:star" class="mt-0.5 shrink-0 text-[20px] text-[var(--tone)]" />
                <h3 class="lp-card-title max-w-[18ch]">Nilai setelah selesai</h3>
              </div>
              <span class="lp-card-arrow" aria-hidden="true"><Icon icon="lucide:arrow-right" class="text-[15px]" /></span>
            </div>
            <p class="lp-card-sub">
              Masukanmu dibaca langsung oleh koordinator unit, supaya kualitas layanan
              terjaga.
            </p>
            <div class="lp-card-mock"><AppScreenMock variant="rating" /></div>
          </article>
        </div>
      </div>
    </section>

    <!-- ================= TESTIMONI ================= -->
    <section v-if="TESTIMONIALS.length" class="lp-band lp-tone-amber py-24 lg:py-32">
      <div class="lp-container">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div class="lp-tone-amber" data-reveal>
            <span class="lp-eyebrow">Kata warga</span>
            <h2 class="lp-h2 mt-4 max-w-[18ch]">Dipakai di menit-menit yang paling penting.</h2>
          </div>
          <p class="lp-lead max-w-[46ch]" data-reveal style="--d: 100ms">
            Dari laporan pertama sampai penilaian terakhir, ini yang warga
            rasakan saat memakai ButuhBantuan.
          </p>
        </div>

        <ul class="mt-14 grid gap-4 lg:grid-cols-3" data-stagger>
          <li
            v-for="t in TESTIMONIALS"
            :key="t.name"
            class="flex flex-col rounded-[26px] bg-white p-7 shadow-[0_0_0_1px_rgba(28,25,23,0.06),0_18px_36px_-26px_rgba(28,25,23,0.3)]"
            :class="`lp-tone-${t.tone}`"
          >
            <Icon icon="lucide:quote" class="text-[22px] text-[var(--tone)]" />
            <p class="mt-5 text-[16px] font-medium leading-[1.6] tracking-[-0.01em] text-[var(--lp-ink-2)]">
              {{ t.quote }}
            </p>
            <div class="mt-auto flex items-center gap-3 pt-7">
              <span class="lp-mono flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--tone-soft)] text-[14px] font-semibold text-[var(--tone)]">
                {{ t.initials }}
              </span>
              <span class="min-w-0">
                <span class="block text-[14.5px] font-semibold">{{ t.name }}</span>
                <span class="block text-[13px] text-[var(--lp-muted)]">{{ t.city }}</span>
              </span>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- ================= INSTALL TO HOME SCREEN ================= -->
    <section class="bg-[var(--lp-surface)] py-24 lg:py-32">
      <div class="lp-container">
        <div class="lp-tone-sky max-w-[640px]" data-reveal>
          <span class="lp-eyebrow">Tanpa app store</span>
          <h2 class="lp-h2 mt-4">Add to Home Screen, biar makin cepat dibuka.</h2>
          <p class="lp-lead mt-5 max-w-[48ch]">
            Cuma butuh beberapa detik. Sekali dipasang, ikonnya muncul seperti
            aplikasi biasa, dan nomor darurat tetap bisa diakses saat offline.
          </p>
        </div>

        <ol class="relative mt-14 grid gap-4 md:grid-cols-3">
          <li
            v-for="(s, i) in installSteps"
            :key="s.title"
            class="install-card lp-tint relative flex flex-col rounded-[24px] p-3 shadow-[0_0_0_1px_rgba(28,25,23,0.05)]"
            :class="`lp-tone-${s.tone}`"
            data-reveal="card"
            :style="{ '--d': `${i * 90}ms` }"
          >
            <InstallMock :variant="i" />
            <div class="flex flex-1 flex-col p-4 pt-5">
              <div class="flex items-center gap-2.5">
                <span class="install-step">{{ i + 1 }}</span>
                <h3 class="text-[16.5px] font-semibold tracking-[-0.015em]">{{ s.title }}</h3>
              </div>
              <p class="mt-2.5 text-[14px] leading-[1.6] text-[var(--lp-muted)]">{{ s.body }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- ================= COVERAGE ================= -->
    <section id="cakupan" class="lp-band lp-tone-teal py-24 lg:py-32">
      <div class="lp-container">
        <div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-16">
          <div class="lp-tone-teal" data-reveal>
            <span class="lp-eyebrow">Cakupan</span>
            <h2 class="lp-h2 mt-4 max-w-[16ch]">Sudah ada di kota kamu.</h2>
          </div>
          <p class="lp-lead max-w-[46ch]" data-reveal style="--d: 100ms">
            Unit resmi dan relawan dari Sumatera sampai Papua. Seluruh kabupaten
            dan kota di Jawa sudah terjangkau.
          </p>
        </div>

        <div class="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div
            v-for="(s, i) in stats"
            :key="s.label"
            class="lp-card-soft"
            :class="`lp-tone-${s.tone}`"
            data-reveal="card"
            :style="{ '--d': `${i * 70}ms` }"
          >
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-[var(--tone)]">
              <Icon :icon="s.icon" class="text-[17px]" />
            </span>
            <p
              class="mt-6 text-[36px] font-bold leading-none tracking-[-0.04em] text-[var(--tone)] sm:text-[42px]"
              style="font-variant-numeric: tabular-nums"
            >
              {{ s.value }}
            </p>
            <p class="mt-2.5 text-[14.5px] font-semibold">{{ s.label }}</p>
            <p class="mt-1 text-[13px] leading-[1.5] text-[var(--lp-ink-2)]">{{ s.note }}</p>
          </div>
        </div>

        <figure
          class="mt-6 rounded-[30px] bg-white p-2.5 shadow-[0_0_0_1px_rgba(28,25,23,0.05),0_30px_60px_-40px_rgba(28,25,23,0.45)] sm:p-3"
          data-reveal
        >
          <CoverageMap />
          <figcaption class="flex flex-wrap items-center gap-x-5 gap-y-2 px-2.5 py-3.5 text-[12.5px] text-[var(--lp-ink-2)]">
            <span class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-[#0d9488] ring-2 ring-white" />
              Kota terjangkau
            </span>
            <span class="flex items-center gap-2">
              <span class="h-3.5 w-3.5 rounded-full bg-[#0d9488]/20" />
              Wilayah padat layanan
            </span>
            <span class="ml-auto hidden text-[var(--lp-muted)] sm:block">
              Bertambah seiring unit mitra baru terverifikasi.
            </span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- ================= SPONSORS ================= -->
    <section class="border-t border-[var(--lp-line)] py-24 lg:py-32">
      <div class="lp-container">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div class="lp-tone-rose" data-reveal>
            <span class="lp-eyebrow">Didukung oleh</span>
            <h2 class="lp-h2 mt-4 max-w-[18ch]">Bisa gratis untuk warga, berkat mereka.</h2>
          </div>
          <div data-reveal style="--d: 100ms">
            <p class="lp-lead max-w-[46ch]">
              Pendanaan infrastruktur layanan, termasuk server, peta, dan sistem notifikasi, berasal dari sponsor dan mitra kerja sama, bukan dari masyarakat yang membutuhkan bantuan.
            </p>
            <NuxtLink :to="SPONSOR_INFO_PATH" class="lp-link mt-5">
              Jadi sponsor
              <Icon icon="lucide:arrow-right" class="lp-btn-arrow text-[16px]" />
            </NuxtLink>
          </div>
        </div>

        <ul class="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-stagger>
          <template v-if="sortedSponsors.length">
            <li
              v-for="s in sortedSponsors"
              :key="s.name"
              class="sponsor-slot flex h-20 items-center justify-center rounded-2xl bg-[var(--lp-surface)] p-4"
            >
              <component
                :is="s.href ? 'a' : 'span'"
                :href="s.href"
                :target="s.href ? '_blank' : undefined"
                :rel="s.href ? 'noopener noreferrer sponsored' : undefined"
                class="flex h-full w-full items-center justify-center"
              >
                <img :src="s.logo" :alt="s.name" class="sponsor-logo" loading="lazy" decoding="async" />
              </component>
            </li>
          </template>
          <template v-else>
            <li
              v-for="i in SPONSOR_PLACEHOLDER_SLOTS"
              :key="i"
              class="sponsor-slot flex h-20 items-center justify-center rounded-2xl border border-dashed border-[var(--lp-line)] text-[12px] font-medium text-[var(--lp-faint)]"
            >
              Logo sponsor
            </li>
          </template>
        </ul>
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
              <NuxtLink to="/daftar-unit" class="lp-btn lp-btn--outline-light">Daftarkan unit kamu</NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </LandingShell>
</template>

<style scoped>
/* Hero: a soft mesh of the service-family colours over a faint dot grid, so the
   first screen carries colour without a saturated block. The wash sits left,
   where the copy is; the phone on the right keeps the cooler tone. */
.hero-backdrop {
  background-image:
    radial-gradient(ellipse 52% 42% at 24% 6%, rgba(220, 38, 38, 0.11), transparent 72%),
    radial-gradient(ellipse 34% 32% at 80% 16%, rgba(2, 132, 199, 0.1), transparent 72%),
    radial-gradient(ellipse 30% 28% at 6% 34%, rgba(217, 119, 6, 0.09), transparent 72%),
    radial-gradient(ellipse 28% 26% at 60% 48%, rgba(5, 150, 105, 0.07), transparent 74%),
    radial-gradient(rgba(28, 25, 23, 0.1) 1px, transparent 1px);
  background-size:
    100% 100%,
    100% 100%,
    100% 100%,
    100% 100%,
    22px 22px;
  mask-image: radial-gradient(ellipse 74% 62% at 46% 20%, #000 28%, transparent 78%);
  -webkit-mask-image: radial-gradient(ellipse 74% 62% at 46% 20%, #000 28%, transparent 78%);
}

/* Hero product stage: a tinted pad hugging the device, so the phone reads as a
   product shot rather than an icon floating on white. */
.hero-pad {
  position: absolute;
  inset: -34px -56px;
  border-radius: 60px;
  background-color: #fff;
  background-image:
    radial-gradient(ellipse 70% 60% at 50% 12%, var(--tone-soft), transparent 72%),
    radial-gradient(rgba(28, 25, 23, 0.07) 1px, transparent 1px);
  background-size:
    100% 100%,
    18px 18px;
  box-shadow: inset 0 0 0 1px rgba(28, 25, 23, 0.05);
}
@media (max-width: 1023px) {
  .hero-pad {
    inset: -22px -30px;
    border-radius: 44px;
  }
}

/* Dashed connector between the three steps. It is painted behind the cards, so
   it only shows in the gaps between them and reads as one flow. */
.how-steps::before {
  content: "";
  position: absolute;
  top: 46px;
  left: 0;
  right: 0;
  height: 2px;
  background-image: repeating-linear-gradient(90deg, var(--lp-line) 0 6px, transparent 6px 14px);
}
@media (min-width: 640px) {
  .how-steps::before {
    top: 50px;
  }
}
@media (max-width: 639px) {
  .how-steps::before {
    display: none;
  }
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

/* The hero's column is only as tall as the device itself. The walkthrough needs
   a fixed-height stage because it is sticky and centres within it; in the hero
   that extra height pushed the emergency-numbers strip below the fold. */
.hero-stage {
  display: flex;
  align-items: center;
  justify-content: center;
}
/* The stage the phone stands on: one tinted panel per step, with a dot grid and
   a colour wash, so the device sits in a scene instead of floating on the page.
   It bleeds past the column so the phone reads as placed on it, not inside it. */
.phone-stage-panel {
  position: absolute;
  inset: -24px;
  border-radius: 40px;
  background-color: var(--tone-soft, var(--lp-surface));
  box-shadow: inset 0 0 0 1px var(--tone-line, var(--lp-line));
  transition:
    background-color 0.6s var(--lp-ease),
    box-shadow 0.6s var(--lp-ease);
}
@media (max-width: 1023px) {
  .phone-stage-panel {
    inset: -16px -10px;
    border-radius: 32px;
  }
}

.phone-stage-grid {
  border-radius: inherit;
  background-image: radial-gradient(rgba(28, 25, 23, 0.08) 1px, transparent 1px);
  background-size: 20px 20px;
  mask-image: radial-gradient(ellipse 72% 68% at 50% 50%, #000 32%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse 72% 68% at 50% 50%, #000 32%, transparent 80%);
}

.phone-stage-wash {
  border-radius: inherit;
  background: radial-gradient(ellipse 58% 44% at 50% 10%, var(--tone, var(--lp-accent)), transparent 72%);
  opacity: 0.18;
  transition: background 0.6s var(--lp-ease);
}

/* The auto-advance bar: fills over one beat and restarts when the beat does, so
   the loop reads as a deliberate demo rather than random movement. */
.lp-beat {
  animation: lp-beat var(--step-ms, 4200ms) linear both;
}
@keyframes lp-beat {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* Chips that float beside the device as each step comes up. */
.lp-float {
  animation: lp-float 0.5s var(--lp-ease) both;
  animation-delay: var(--d, 0ms);
}
@keyframes lp-float {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.94);
  }
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

/* Screens cross-fade: the incoming one takes slightly longer than the
   outgoing one so there is never a blank frame between steps. */
.phone-fade-enter-active {
  transition:
    opacity 0.55s var(--lp-ease),
    transform 0.55s var(--lp-ease);
}
.phone-fade-leave-active {
  transition:
    opacity 0.35s var(--lp-ease),
    transform 0.35s var(--lp-ease);
}
.phone-fade-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}
.phone-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.99);
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

/* ── Install steps ─────────────────────────────────────────────────────── */
.install-step {
  display: inline-flex;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tone-soft);
  color: var(--tone);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* ── Sponsors ──────────────────────────────────────────────────────────── */
.sponsor-slot {
  transition: background-color 0.25s var(--lp-ease);
}
.sponsor-logo {
  max-height: 32px;
  max-width: 100%;
  object-fit: contain;
  filter: grayscale(1);
  opacity: 0.65;
  transition:
    filter 0.2s ease,
    opacity 0.2s ease;
}
.sponsor-slot:hover .sponsor-logo {
  filter: none;
  opacity: 1;
}
</style>
