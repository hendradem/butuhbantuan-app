<script setup lang="ts">
/**
 * /landing — public marketing page.
 *
 * Visual language modelled after visitors.now: Inter typography with a
 * predominantly `font-medium` weight, compact `text-sm` body, subtle border
 * lines instead of drop shadows, layered neutral backgrounds, and a single
 * purple accent (#4B38D8). Live pulses + tickers signal that the platform
 * is running, not static marketing.
 */
import { Icon } from "@iconify/vue";
import type { Map as LeafletMap, TileLayer } from "leaflet";

definePageMeta({ layout: false });

useHead({
  title: "ButuhBantuan — Peta bantuan darurat warga Indonesia",
  meta: [
    {
      name: "description",
      content:
        "Peta unit ambulance, damkar, PMI, PSC 119, dan RS terdekat. Laporan cepat, live tracking petugas, dashboard operasional untuk unit emergency.",
    },
  ],
  htmlAttrs: { class: "bb-landing-root" },
});

// ── Live "activity" ticker (mock for now; wireable to /api later) ────────────

const activityFeed = [
  { time: "just now", label: "Ambulance PMI Bantul terima laporan asma anak", tone: "danger" },
  { time: "1m",       label: "PSC 119 Sleman — dispatch RS Sardjito", tone: "danger" },
  { time: "2m",       label: "Damkar Kota Yogya siaga di zona hijau", tone: "warn" },
  { time: "3m",       label: "Bantuan komunitas relawan Sleman aktif",  tone: "ok" },
  { time: "5m",       label: "PSC 119 Kulon Progo — arrival Wates",     tone: "danger" },
  { time: "6m",       label: "RSUP Sardjito — kapasitas IGD 78%",       tone: "warn" },
];
const activityIndex = ref(0);
let tickerTimer: ReturnType<typeof setInterval> | null = null;

// Live counters — small easing animation on mount.
const kpiTickets = ref(0);
const kpiUnits = ref(0);
const kpiAvgMin = ref(0);
function easeTo(target: number, ref_: { value: number }, ms = 900) {
  const start = performance.now();
  const from = ref_.value;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    ref_.value = Math.round(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Feature copy ─────────────────────────────────────────────────────────────

const citizenFeatures = [
  { icon: "lucide:map-pin",       title: "Peta unit terdekat",     body: "Ambulance, damkar, PMI, PSC 119, dan RS di sekitarmu — dengan jarak, ETA, dan status siaga.", span: 2 },
  { icon: "lucide:siren",         title: "Laporan darurat cepat",  body: "Triase Merah / Kuning / Hijau, foto kondisi, dispatch ke unit terbaik.", span: 1 },
  { icon: "lucide:navigation",    title: "Live tracking petugas",  body: "Ikuti posisi ambulance dan tim penyelamat selama dalam perjalanan.", span: 1 },
  { icon: "lucide:ticket",        title: "E-tiket digital",        body: "Setiap laporan menghasilkan tiket unik yang bisa dibagikan ke keluarga.", span: 1 },
  { icon: "lucide:users",         title: "Bantuan komunitas",      body: "Order diteruskan ke jaringan relawan terdekat kalau unit resmi penuh.", span: 1 },
  { icon: "lucide:bookmark",      title: "Unit favorit",           body: "Simpan puskesmas atau RS langgananmu untuk akses satu-ketuk.", span: 1 },
  { icon: "lucide:message-square",title: "Review & rating",        body: "Bagikan pengalamanmu agar warga lain memilih unit yang tepat.", span: 1 },
  { icon: "lucide:smartphone",    title: "PWA installable",        body: "Pasang di homescreen tanpa Play Store. Push notif untuk update tiket.", span: 2 },
];

const unitFeatures = [
  { icon: "lucide:layout-dashboard", title: "Dashboard operasional", body: "Antrian order, status unit, timeline dispatch dalam satu tampilan real-time." },
  { icon: "lucide:bell",             title: "Notifikasi real-time",  body: "SSE + Web Push mengirim order baru ke laptop / HP petugas dalam hitungan detik." },
  { icon: "lucide:users-round",      title: "Community claim",       body: "Rekrut relawan komunitas untuk merespons wilayah yang belum tercover." },
  { icon: "lucide:list-todo",        title: "Auto-escalation",       body: "Order yang tidak diterima dalam SLA auto-eskalasi ke unit terdekat berikutnya." },
  { icon: "lucide:shield-check",     title: "Compliance",            body: "Template asesmen standar Kemenkes / PSC 119, audit trail lengkap." },
  { icon: "lucide:bar-chart-2",      title: "Analytics",             body: "Waktu respons, jarak, feedback warga — semua dalam grafik trend." },
  { icon: "lucide:hospital",         title: "Referensi SATUSEHAT",   body: "Data RS Kemenkes terintegrasi. Rekomendasi rujukan berdasar spesialisasi." },
  { icon: "lucide:mountain",         title: "Modul SAR",             body: "Operasi SAR: shift, sektor karvak, GPS anggota, magic-link live track." },
];

const howSteps = [
  { n: "01", title: "Buka peta darurat",       body: "Aplikasi baca lokasi GPS-mu dan tampilkan unit terdekat di peta. Tidak perlu registrasi." },
  { n: "02", title: "Isi laporan 30 detik",    body: "Pilih unit, kondisi korban, foto opsional. Kirim — posko dan unit dispatch langsung dapat notifikasi." },
  { n: "03", title: "Track live sampai tiba",  body: "Lihat posisi unit di peta. E-tiket bisa dibagikan ke keluarga untuk update status." },
];

const collabPillars = [
  { icon: "lucide:heart-handshake", title: "Donasi & sponsor",       body: "Bantu operasional: hosting, SMS gateway, integrasi peta, pelatihan relawan.", cta: "Jadi sponsor" },
  { icon: "lucide:landmark",        title: "Kolaborasi pemerintah",  body: "Integrasi Dinkes, PSC 119 kab/kota, Damkar daerah. Gratis untuk unit resmi.",   cta: "Ajukan integrasi" },
  { icon: "lucide:handshake",       title: "Partner komunitas",      body: "PMI cabang, ORARI, RAPI, komunitas ambulance — masuk lewat jalur komunitas.",  cta: "Gabung sebagai unit" },
];

// ── Coverage cities ─────────────────────────────────────────────────────────

type Island = { key: string; label: string; full?: boolean; cities: Array<{ name: string; lat: number; lng: number }> };
const islands: Island[] = [
  { key: "jawa", label: "Jawa", full: true, cities: [
    { name: "Jakarta",    lat: -6.2088, lng: 106.8456 },
    { name: "Bandung",    lat: -6.9175, lng: 107.6191 },
    { name: "Semarang",   lat: -6.9667, lng: 110.4167 },
    { name: "Yogyakarta", lat: -7.8014, lng: 110.3644 },
    { name: "Surabaya",   lat: -7.2575, lng: 112.7521 },
    { name: "Malang",     lat: -7.9666, lng: 112.6326 },
    { name: "Solo",       lat: -7.5665, lng: 110.8317 },
    { name: "Cirebon",    lat: -6.7063, lng: 108.5570 },
    { name: "Bogor",      lat: -6.5950, lng: 106.8161 },
  ]},
  { key: "sumatra", label: "Sumatra", cities: [
    { name: "Medan",          lat: 3.5952,  lng: 98.6722  },
    { name: "Padang",         lat: -0.9471, lng: 100.4172 },
    { name: "Pekanbaru",      lat: 0.5071,  lng: 101.4478 },
    { name: "Palembang",      lat: -2.9909, lng: 104.7565 },
    { name: "Bandar Lampung", lat: -5.4295, lng: 105.2610 },
  ]},
  { key: "kalimantan", label: "Kalimantan", cities: [
    { name: "Pontianak",   lat: -0.0263, lng: 109.3425 },
    { name: "Banjarmasin", lat: -3.3186, lng: 114.5944 },
    { name: "Samarinda",   lat: -0.5017, lng: 117.1536 },
    { name: "Balikpapan",  lat: -1.2379, lng: 116.8529 },
  ]},
  { key: "sulawesi", label: "Sulawesi", cities: [
    { name: "Makassar", lat: -5.1477, lng: 119.4327 },
    { name: "Manado",   lat: 1.4748,  lng: 124.8421 },
    { name: "Palu",     lat: -0.9003, lng: 119.8779 },
    { name: "Kendari",  lat: -3.9985, lng: 122.5127 },
  ]},
  { key: "papua", label: "Papua", cities: [
    { name: "Jayapura", lat: -2.5337, lng: 140.7181 },
    { name: "Sorong",   lat: -0.8615, lng: 131.2558 },
  ]},
];

// ── Coverage map (Leaflet, client-only) ──────────────────────────────────────

const mapEl = ref<HTMLElement | null>(null);
let map: LeafletMap | null = null;
let tileLayer: TileLayer | null = null;

async function initMap() {
  if (!mapEl.value || map) return;
  const Lmod = await import("leaflet");
  const L = (Lmod as unknown as { default: typeof import("leaflet") }).default ?? Lmod;
  await import("leaflet/dist/leaflet.css");

  map = L.map(mapEl.value, {
    center: [-2.5, 118], zoom: 4, minZoom: 3, maxZoom: 9,
    zoomControl: false, attributionControl: false, scrollWheelZoom: false,
  });
  tileLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    { subdomains: ["a", "b", "c", "d"], maxZoom: 9 },
  ).addTo(map);

  const jawa = islands.find((i) => i.key === "jawa")!;
  for (const c of jawa.cities) {
    L.marker([c.lat, c.lng], { icon: pin(L, "#4B38D8", true) })
      .addTo(map).bindTooltip(c.name, { direction: "top", offset: [0, -6] });
  }
  for (const i of islands.filter((x) => !x.full)) {
    for (const c of i.cities) {
      L.marker([c.lat, c.lng], { icon: pin(L, "#0D0D0D", false) })
        .addTo(map).bindTooltip(c.name, { direction: "top", offset: [0, -6] });
    }
  }
  L.rectangle([[-8.85, 105.1], [-5.9, 114.7]], {
    color: "#4B38D8", weight: 0, fillOpacity: 0.06,
  }).addTo(map);
}

function pin(L: typeof import("leaflet"), color: string, filled: boolean) {
  const size = filled ? 12 : 10;
  return L.divIcon({
    className: "bb-cov-pin",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${filled ? color : "#fff"};border:2px solid ${color};box-shadow:0 1px 3px rgba(13,13,13,.2);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

onMounted(() => {
  if (typeof window === "undefined") return;
  void initMap();
  tickerTimer = setInterval(() => {
    activityIndex.value = (activityIndex.value + 1) % activityFeed.length;
  }, 2600);
  easeTo(148, kpiTickets);
  easeTo(892, kpiUnits);
  easeTo(4, kpiAvgMin);
});
onBeforeUnmount(() => {
  if (tickerTimer) clearInterval(tickerTimer);
  tileLayer = null;
  if (map) { map.remove(); map = null; }
});
</script>

<template>
  <div class="bb-landing">
    <!-- Nav -->
    <header class="bb-nav">
      <div class="bb-nav__inner">
        <NuxtLink to="/" class="bb-brand">
          <span class="bb-brand__mark">
            <Icon icon="mynaui:ambulance-solid" class="text-[16px]" />
          </span>
          <span>butuhbantuan</span>
          <span class="bb-brand__tld">.space</span>
        </NuxtLink>
        <nav class="bb-nav__links">
          <a href="#warga">Warga</a>
          <a href="#unit">Unit</a>
          <a href="#coverage">Jangkauan</a>
          <a href="#cara">Cara kerja</a>
          <a href="#dukung">Dukung</a>
        </nav>
        <div class="bb-nav__actions">
          <NuxtLink to="/" class="bb-btn bb-btn--ghost">Buka app</NuxtLink>
          <a href="https://dashboard.butuhbantuan.space" class="bb-btn bb-btn--primary">Login dashboard</a>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="bb-hero">
      <div class="bb-hero__inner">
        <div class="bb-hero__copy">
          <span class="bb-pulse-pill">
            <span class="bb-pulse-pill__dot"><span class="bb-pulse-pill__ping" /></span>
            Layanan berjalan · Yogyakarta, DKI, dan {{ islands[0].cities.length - 2 }}+ kota lain
          </span>

          <h1 class="bb-h1">
            Peta bantuan darurat, <br />
            <span class="bb-h1__accent">dalam genggaman warga.</span>
          </h1>

          <p class="bb-lede">
            Ambulance, damkar, PMI, PSC 119, dan RS terdekat — lengkap dengan
            jarak, ETA, dan status siaga. Laporan darurat 30 detik, live tracking
            petugas, e-tiket digital. Gratis untuk warga.
          </p>

          <div class="bb-hero__ctas">
            <NuxtLink to="/" class="bb-btn bb-btn--primary bb-btn--lg">
              Buka aplikasi warga
              <Icon icon="lucide:arrow-right" class="text-[14px]" />
            </NuxtLink>
            <a href="#unit" class="bb-btn bb-btn--ghost bb-btn--lg">
              Untuk unit emergency
            </a>
          </div>

          <!-- Live KPI strip -->
          <div class="bb-kpis">
            <div class="bb-kpi">
              <p class="bb-kpi__value">{{ kpiTickets }}</p>
              <p class="bb-kpi__label">Tiket 24 jam</p>
            </div>
            <div class="bb-kpi">
              <p class="bb-kpi__value">{{ kpiUnits }}</p>
              <p class="bb-kpi__label">Unit terdaftar</p>
            </div>
            <div class="bb-kpi">
              <p class="bb-kpi__value">± {{ kpiAvgMin }} <span>min</span></p>
              <p class="bb-kpi__label">Avg response</p>
            </div>
          </div>
        </div>

        <!-- Right: live activity ticker + phone mock -->
        <div class="bb-hero__visual">
          <div class="bb-live">
            <div class="bb-live__head">
              <span class="bb-live__title">
                <span class="bb-live__dot" /> Live activity
              </span>
              <span class="bb-live__meta">just now</span>
            </div>
            <Transition name="bb-live" mode="out-in">
              <div :key="activityIndex" class="bb-live__row">
                <span class="bb-live__tone" :class="`bb-live__tone--${activityFeed[activityIndex]!.tone}`" />
                <div class="bb-live__body">
                  <p class="bb-live__label">{{ activityFeed[activityIndex]!.label }}</p>
                  <p class="bb-live__time">{{ activityFeed[activityIndex]!.time }}</p>
                </div>
              </div>
            </Transition>
            <ul class="bb-live__list">
              <li
                v-for="(a, i) in activityFeed.slice(1, 4)"
                :key="i + '_' + a.label"
                class="bb-live__mini"
              >
                <span class="bb-live__tone" :class="`bb-live__tone--${a.tone}`" />
                <span>{{ a.label }}</span>
              </li>
            </ul>
          </div>

          <div class="bb-phone" aria-hidden="true">
            <div class="bb-phone__screen">
              <div class="bb-phone__map">
                <span class="bb-phone__pin bb-phone__pin--a" />
                <span class="bb-phone__pin bb-phone__pin--b" />
                <span class="bb-phone__pin bb-phone__pin--c" />
                <span class="bb-phone__user" />
              </div>
              <div class="bb-phone__sheet">
                <div class="bb-phone__handle" />
                <div class="bb-phone__row">
                  <span class="bb-phone__logo">
                    <Icon icon="mynaui:ambulance-solid" class="text-[13px]" />
                  </span>
                  <div class="bb-phone__lines">
                    <span class="bb-phone__line bb-phone__line--w" />
                    <span class="bb-phone__line bb-phone__line--n" />
                  </div>
                </div>
                <div class="bb-phone__pills">
                  <span class="bb-phone__pill bb-phone__pill--primary">Buat laporan</span>
                  <span class="bb-phone__pill">Telepon</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Untuk warga -->
    <section id="warga" class="bb-section">
      <div class="bb-section__inner">
        <div class="bb-shead">
          <span class="bb-eyebrow">Untuk warga</span>
          <h2 class="bb-h2">Semua yang kamu butuhkan saat detik pertama panik.</h2>
          <p class="bb-lede bb-lede--sm">
            Delapan fitur inti aplikasi warga. Semua gratis, tanpa registrasi berbelit.
          </p>
        </div>
        <div class="bb-bento">
          <article
            v-for="f in citizenFeatures"
            :key="f.title"
            class="bb-card"
            :class="f.span === 2 && 'bb-card--wide'"
          >
            <span class="bb-card__icon">
              <Icon :icon="f.icon" class="text-[16px]" />
            </span>
            <h3 class="bb-card__title">{{ f.title }}</h3>
            <p class="bb-card__body">{{ f.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Untuk unit -->
    <section id="unit" class="bb-section bb-section--tinted">
      <div class="bb-section__inner">
        <div class="bb-shead">
          <span class="bb-eyebrow">Untuk unit emergency</span>
          <h2 class="bb-h2">Dashboard yang ringan, cepat, bisa ditinggal jalan.</h2>
          <p class="bb-lede bb-lede--sm">
            Ambulance, damkar, PMI, PSC 119, SAR, komunitas relawan — semua masuk ke dashboard yang sama.
          </p>
        </div>
        <div class="bb-grid bb-grid--4">
          <article v-for="f in unitFeatures" :key="f.title" class="bb-card">
            <span class="bb-card__icon">
              <Icon :icon="f.icon" class="text-[16px]" />
            </span>
            <h3 class="bb-card__title">{{ f.title }}</h3>
            <p class="bb-card__body">{{ f.body }}</p>
          </article>
        </div>
        <div class="bb-section__foot">
          <a href="https://dashboard.butuhbantuan.space" class="bb-btn bb-btn--primary bb-btn--lg">
            Buka dashboard <Icon icon="lucide:arrow-right" class="text-[14px]" />
          </a>
          <a href="mailto:hello@butuhbantuan.space?subject=Onboarding unit" class="bb-btn bb-btn--outline bb-btn--lg">
            Ajukan onboarding
          </a>
        </div>
      </div>
    </section>

    <!-- Coverage -->
    <section id="coverage" class="bb-section">
      <div class="bb-section__inner">
        <div class="bb-shead">
          <span class="bb-eyebrow">Jangkauan</span>
          <h2 class="bb-h2">Hadir di seluruh Jawa. Meluas ke kota besar Indonesia.</h2>
          <p class="bb-lede bb-lede--sm">
            119+ kabupaten/kota di Jawa terhubung penuh. 15+ kota besar di luar Jawa dalam pilot.
          </p>
        </div>

        <div class="bb-map">
          <div ref="mapEl" class="bb-map__canvas" role="img" aria-label="Peta jangkauan Indonesia" />
          <div class="bb-map__legend">
            <span><span class="bb-map__dot bb-map__dot--full" /> Jawa · coverage penuh</span>
            <span><span class="bb-map__dot bb-map__dot--pilot" /> Kota besar · pilot</span>
          </div>
        </div>

        <div class="bb-islands">
          <article v-for="island in islands" :key="island.key" class="bb-island">
            <header class="bb-island__head">
              <h3>{{ island.label }}</h3>
              <span class="bb-badge" :class="island.full ? 'bb-badge--full' : 'bb-badge--pilot'">
                {{ island.full ? "Penuh" : "Pilot" }}
              </span>
            </header>
            <p class="bb-island__body">
              <template v-if="island.full">
                {{ island.cities.length }}+ kota utama on-boarded termasuk kabupaten sekitarnya.
              </template>
              <template v-else>
                Aktif di {{ island.cities.length }} kota besar. Ekspansi berjalan.
              </template>
            </p>
            <ul class="bb-island__cities">
              <li v-for="c in island.cities" :key="c.name">{{ c.name }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="cara" class="bb-section bb-section--tinted">
      <div class="bb-section__inner">
        <div class="bb-shead">
          <span class="bb-eyebrow">Cara kerja</span>
          <h2 class="bb-h2">Dari panik ke penanganan dalam 3 langkah.</h2>
        </div>
        <ol class="bb-steps">
          <li v-for="s in howSteps" :key="s.n" class="bb-step">
            <span class="bb-step__n">{{ s.n }}</span>
            <h3 class="bb-step__title">{{ s.title }}</h3>
            <p class="bb-step__body">{{ s.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Dukung -->
    <section id="dukung" class="bb-section">
      <div class="bb-section__inner">
        <div class="bb-shead">
          <span class="bb-eyebrow">Dukung</span>
          <h2 class="bb-h2">Bangun jaringan darurat sipil Indonesia bersama.</h2>
          <p class="bb-lede bb-lede--sm">
            Kami butuh sponsor, mitra pemerintah, dan komunitas relawan untuk menjaga platform tetap gratis dan andal.
          </p>
        </div>
        <div class="bb-grid bb-grid--3">
          <article v-for="p in collabPillars" :key="p.title" class="bb-card bb-card--collab">
            <span class="bb-card__icon"><Icon :icon="p.icon" class="text-[16px]" /></span>
            <h3 class="bb-card__title">{{ p.title }}</h3>
            <p class="bb-card__body">{{ p.body }}</p>
            <a class="bb-card__cta" href="mailto:hello@butuhbantuan.space?subject=Kolaborasi">
              {{ p.cta }}
              <Icon icon="lucide:arrow-up-right" class="text-[13px]" />
            </a>
          </article>
        </div>

        <div class="bb-band">
          <div>
            <p class="bb-band__title">Bantu tanpa donasi.</p>
            <p class="bb-band__body">Bagikan aplikasi ini ke keluarga & tetangga. Setiap install baru = satu tetangga lebih siap saat darurat.</p>
          </div>
          <NuxtLink to="/" class="bb-btn bb-btn--primary bb-btn--lg">Bagikan aplikasi</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bb-footer">
      <div class="bb-footer__inner">
        <div class="bb-footer__brand">
          <span class="bb-brand" style="color:#fff">
            <span class="bb-brand__mark bb-brand__mark--light">
              <Icon icon="mynaui:ambulance-solid" class="text-[16px]" />
            </span>
            <span>butuhbantuan</span>
            <span class="bb-brand__tld" style="color:rgba(255,255,255,.5)">.space</span>
          </span>
          <p class="bb-footer__tag">Platform darurat sipil Indonesia. Open, gratis, dibangun bersama komunitas.</p>
        </div>
        <div class="bb-footer__cols">
          <div>
            <p class="bb-footer__h">Warga</p>
            <ul>
              <li><NuxtLink to="/">Buka aplikasi</NuxtLink></li>
              <li><NuxtLink to="/my-tickets">Cek tiket saya</NuxtLink></li>
              <li><a href="#warga">Fitur</a></li>
            </ul>
          </div>
          <div>
            <p class="bb-footer__h">Unit</p>
            <ul>
              <li><a href="https://dashboard.butuhbantuan.space">Login dashboard</a></li>
              <li><a href="#unit">Fitur dashboard</a></li>
              <li><a href="mailto:hello@butuhbantuan.space?subject=Onboarding unit">Onboarding</a></li>
            </ul>
          </div>
          <div>
            <p class="bb-footer__h">Platform</p>
            <ul>
              <li><a href="#coverage">Jangkauan</a></li>
              <li><a href="#cara">Cara kerja</a></li>
              <li><a href="#dukung">Dukung</a></li>
              <li><a href="mailto:hello@butuhbantuan.space">Kontak</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="bb-footer__legal">
        © {{ new Date().getFullYear() }} ButuhBantuan · Dibangun untuk komunitas Indonesia.
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ────────────────────────────────────────────────────────────────────────
 * Landing tokens — visitors.now-inspired
 *   • Inter, font-weight 400/500 dominant (never bold in body)
 *   • text-sm baseline, tight letter-spacing
 *   • single purple accent, layered neutrals, subtle borders (not shadows)
 * ──────────────────────────────────────────────────────────────────────── */
.bb-landing {
  --ink-1: #0D0D0D;        /* primary text / darkest neutral */
  --ink-2: #33333B;
  --ink-3: #5A5A66;
  --ink-4: #8B8B95;
  --line: #E6E6EA;
  --line-2: #D6D6DC;
  --bg-0: #FDFDFD;
  --bg-1: #F7F7F8;
  --bg-2: #F0F0F2;
  --accent: #4B38D8;
  --accent-hover: #3A2AB8;
  --accent-soft: rgba(75, 56, 216, 0.08);

  background: var(--bg-0);
  color: var(--ink-1);
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
  font-size: 14px;
  letter-spacing: -0.005em;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}
.bb-landing :where(h1, h2, h3, h4, p, ul) { margin: 0; }
.bb-landing ul { list-style: none; padding: 0; }
.bb-landing a { color: inherit; text-decoration: none; }

/* ── Nav ─────────────────────────────────────────────────────────────── */

.bb-nav {
  position: sticky; top: 0; z-index: 40;
  background: rgba(253, 253, 253, 0.85);
  backdrop-filter: saturate(160%) blur(10px);
  border-bottom: 1px solid var(--line);
}
.bb-nav__inner {
  max-width: 1200px; margin: 0 auto;
  padding: 12px 20px;
  display: flex; align-items: center; gap: 20px;
}
.bb-brand {
  display: inline-flex; align-items: baseline; gap: 8px;
  font-weight: 600; font-size: 15px;
  color: var(--ink-1);
  letter-spacing: -0.02em;
}
.bb-brand__mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--accent-soft); color: var(--accent);
  transform: translateY(3px);
}
.bb-brand__mark--light { background: rgba(255,255,255,.15); color: #fff; }
.bb-brand__tld { color: var(--ink-4); font-weight: 500; }
.bb-nav__links {
  display: none; gap: 22px; margin-left: 16px;
}
.bb-nav__links a {
  font-size: 13px; font-weight: 500; color: var(--ink-3);
  transition: color 0.15s;
}
.bb-nav__links a:hover { color: var(--ink-1); }
.bb-nav__actions {
  margin-left: auto; display: flex; gap: 6px;
}
@media (min-width: 900px) { .bb-nav__links { display: flex; } }

/* ── Buttons ─────────────────────────────────────────────────────────── */

.bb-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  font-size: 13px; font-weight: 500;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: background 0.14s, border-color 0.14s, color 0.14s, transform 0.12s;
  letter-spacing: -0.005em;
  white-space: nowrap;
}
.bb-btn:active { transform: scale(0.98); }
.bb-btn--lg { padding: 10px 16px; font-size: 14px; }
.bb-btn--primary {
  background: var(--accent); color: #fff;
}
.bb-btn--primary:hover { background: var(--accent-hover); }
.bb-btn--ghost {
  background: transparent; color: var(--ink-1);
}
.bb-btn--ghost:hover { background: var(--bg-1); }
.bb-btn--outline {
  background: #fff; color: var(--ink-1); border-color: var(--line-2);
}
.bb-btn--outline:hover { border-color: var(--ink-4); }

/* ── Hero ────────────────────────────────────────────────────────────── */

.bb-hero {
  padding: 44px 20px 24px;
  background:
    radial-gradient(900px 320px at 15% -10%, var(--accent-soft), transparent 60%),
    linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 100%);
  border-bottom: 1px solid var(--line);
}
.bb-hero__inner {
  max-width: 1200px; margin: 0 auto;
  display: grid; gap: 44px; grid-template-columns: 1fr;
  align-items: center;
}
@media (min-width: 900px) {
  .bb-hero { padding: 80px 24px 60px; }
  .bb-hero__inner { grid-template-columns: 1.1fr 1fr; gap: 56px; }
}

.bb-pulse-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 12px 5px 8px;
  border-radius: 9999px;
  background: #fff;
  border: 1px solid var(--line);
  font-size: 12px; font-weight: 500; color: var(--ink-3);
}
.bb-pulse-pill__dot {
  position: relative;
  width: 8px; height: 8px; border-radius: 9999px;
  background: var(--accent);
}
.bb-pulse-pill__ping {
  position: absolute; inset: 0;
  border-radius: 9999px; background: var(--accent);
  animation: bb-ping 1.8s ease-out infinite;
}
@keyframes bb-ping {
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(2.6); opacity: 0; }
}

.bb-h1 {
  margin-top: 20px;
  font-size: clamp(32px, 5.2vw, 52px);
  line-height: 1.05;
  font-weight: 500;
  letter-spacing: -0.035em;
  color: var(--ink-1);
}
.bb-h1__accent { color: var(--accent); }

.bb-lede {
  margin-top: 18px;
  max-width: 520px;
  font-size: 15px; line-height: 1.55;
  color: var(--ink-3);
  font-weight: 500;
  letter-spacing: -0.005em;
}
.bb-lede--sm { max-width: 620px; font-size: 14.5px; }

.bb-hero__ctas {
  margin-top: 24px;
  display: flex; flex-wrap: wrap; gap: 8px;
}

.bb-kpis {
  margin-top: 36px;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  max-width: 460px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}
.bb-kpi__value {
  font-size: 20px; font-weight: 500;
  color: var(--ink-1); letter-spacing: -0.015em;
  font-variant-numeric: tabular-nums;
}
.bb-kpi__value span { font-size: 13px; color: var(--ink-4); font-weight: 500; margin-left: 2px; }
.bb-kpi__label {
  margin-top: 2px; font-size: 11.5px; color: var(--ink-4); font-weight: 500;
}
.bb-kpi + .bb-kpi { border-left: 1px solid var(--line); padding-left: 12px; }

/* ── Hero right (live + phone) ───────────────────────────────────────── */

.bb-hero__visual {
  display: grid; gap: 16px;
  grid-template-columns: 1fr;
  justify-items: center;
}
@media (min-width: 900px) {
  .bb-hero__visual {
    grid-template-columns: 1fr auto;
    align-items: center;
  }
}

.bb-live {
  width: 100%;
  max-width: 340px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  font-size: 13px;
}
.bb-live__head {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 12px; border-bottom: 1px solid var(--line);
}
.bb-live__title {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 500; color: var(--ink-3);
  letter-spacing: 0.01em; text-transform: uppercase;
}
.bb-live__dot {
  width: 6px; height: 6px; border-radius: 9999px; background: #10B981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}
.bb-live__meta { font-size: 11px; color: var(--ink-4); }

.bb-live__row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 0 4px;
}
.bb-live__tone {
  margin-top: 5px;
  width: 8px; height: 8px; border-radius: 9999px;
  flex-shrink: 0;
}
.bb-live__tone--danger { background: var(--accent); }
.bb-live__tone--warn   { background: #F59E0B; }
.bb-live__tone--ok     { background: #10B981; }
.bb-live__body { min-width: 0; flex: 1; }
.bb-live__label {
  font-size: 13.5px; color: var(--ink-1); font-weight: 500;
  line-height: 1.35;
}
.bb-live__time { margin-top: 2px; font-size: 11.5px; color: var(--ink-4); }

.bb-live__list {
  margin-top: 4px; padding-top: 10px; border-top: 1px dashed var(--line);
  display: flex; flex-direction: column; gap: 8px;
}
.bb-live__mini {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: var(--ink-4);
}

/* enter/leave for row */
.bb-live-enter-active, .bb-live-leave-active {
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.2s;
}
.bb-live-enter-from { transform: translateY(6px); opacity: 0; }
.bb-live-leave-to { transform: translateY(-6px); opacity: 0; }

/* Phone mock */
.bb-phone {
  width: 220px;
  aspect-ratio: 220 / 460;
  background: linear-gradient(135deg, #1B1B1F, #0D0D0D);
  border-radius: 30px;
  padding: 8px;
  border: 1px solid #2A2A32;
  position: relative;
  box-shadow: 0 30px 50px -20px rgba(13, 13, 13, 0.4);
}
.bb-phone::before {
  content: "";
  position: absolute; top: 14px; left: 50%;
  transform: translateX(-50%);
  width: 52px; height: 16px;
  border-radius: 9999px;
  background: #0D0D0D;
  z-index: 2;
}
.bb-phone__screen {
  position: relative; width: 100%; height: 100%;
  border-radius: 22px; overflow: hidden;
  background: #EDF2F0;
}
.bb-phone__map {
  position: absolute; inset: 0;
  background:
    radial-gradient(2px 2px at 30% 25%, #B0D8B0, transparent 60%),
    radial-gradient(2px 2px at 70% 40%, #B0D8B0, transparent 60%),
    linear-gradient(180deg, #DCECF6 0%, #E7F0E4 55%, #E0E6D0 100%);
}
.bb-phone__pin {
  position: absolute; width: 10px; height: 10px;
  border-radius: 9999px; border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(13, 13, 13, 0.3);
}
.bb-phone__pin--a { background: var(--accent); top: 20%; left: 30%; }
.bb-phone__pin--b { background: #F59E0B; top: 38%; left: 65%; }
.bb-phone__pin--c { background: var(--accent); top: 52%; left: 42%; }
.bb-phone__user {
  position: absolute; top: 66%; left: 50%;
  width: 10px; height: 10px; transform: translate(-50%, -50%);
  border-radius: 9999px; background: #2563eb; border: 2px solid #fff;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.15);
}
.bb-phone__sheet {
  position: absolute; inset: auto 0 0 0;
  padding: 6px 12px 14px;
  background: #fff; border-radius: 16px 16px 0 0;
}
.bb-phone__handle { width: 30px; height: 3px; border-radius: 9999px; background: var(--line-2); margin: 0 auto 8px; }
.bb-phone__row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.bb-phone__logo {
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
}
.bb-phone__lines { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.bb-phone__line { height: 6px; background: var(--line); border-radius: 9999px; }
.bb-phone__line--w { width: 70%; height: 8px; background: var(--line-2); }
.bb-phone__line--n { width: 50%; }
.bb-phone__pills { display: flex; gap: 4px; }
.bb-phone__pill {
  font-size: 8.5px; padding: 4px 8px; border-radius: 9999px;
  background: var(--bg-1); color: var(--ink-3); font-weight: 500;
}
.bb-phone__pill--primary { background: var(--accent); color: #fff; }

/* ── Sections ────────────────────────────────────────────────────────── */

.bb-section { padding: 64px 20px; }
.bb-section--tinted { background: var(--bg-1); border-block: 1px solid var(--line); }
.bb-section__inner { max-width: 1200px; margin: 0 auto; }
@media (min-width: 900px) { .bb-section { padding: 96px 24px; } }

.bb-shead { max-width: 640px; margin: 0 auto 40px; text-align: center; }
.bb-eyebrow {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11.5px; font-weight: 500;
  letter-spacing: 0.02em;
}
.bb-h2 {
  margin-top: 14px;
  font-size: clamp(24px, 3.2vw, 36px);
  line-height: 1.15;
  font-weight: 500;
  letter-spacing: -0.03em;
  color: var(--ink-1);
}

.bb-section__foot {
  margin-top: 40px;
  display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
}

/* ── Cards + grids ────────────────────────────────────────────────── */

.bb-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  transition: border-color 0.14s, background 0.14s;
}
.bb-card:hover { border-color: var(--line-2); }

.bb-card__icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--accent-soft); color: var(--accent);
  margin-bottom: 12px;
}
.bb-card__title {
  font-size: 15px; font-weight: 500;
  color: var(--ink-1); letter-spacing: -0.015em;
}
.bb-card__body {
  margin-top: 4px;
  font-size: 13.5px; line-height: 1.55;
  color: var(--ink-3); font-weight: 500;
}
.bb-card--collab { display: flex; flex-direction: column; }
.bb-card__cta {
  margin-top: 14px; padding-top: 12px;
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 13px; font-weight: 500;
  color: var(--accent);
  border-top: 1px dashed var(--line);
}
.bb-card__cta:hover { color: var(--accent-hover); }

.bb-grid { display: grid; gap: 14px; grid-template-columns: 1fr; }
@media (min-width: 640px) {
  .bb-grid--3 { grid-template-columns: repeat(2, 1fr); }
  .bb-grid--4 { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1000px) {
  .bb-grid--3 { grid-template-columns: repeat(3, 1fr); }
  .bb-grid--4 { grid-template-columns: repeat(4, 1fr); }
}

/* Bento (some wide cards) */
.bb-bento {
  display: grid; gap: 14px; grid-template-columns: 1fr;
}
@media (min-width: 700px) {
  .bb-bento {
    grid-template-columns: repeat(3, 1fr);
    grid-auto-flow: dense;
  }
  .bb-card--wide { grid-column: span 2; }
}

/* ── Coverage map ────────────────────────────────────────────────── */

.bb-map {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
.bb-map__canvas { height: 300px; background: var(--bg-1); }
@media (min-width: 800px) { .bb-map__canvas { height: 400px; } }
.bb-map__legend {
  display: flex; gap: 20px; flex-wrap: wrap;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  font-size: 12.5px; color: var(--ink-3);
}
.bb-map__legend span {
  display: inline-flex; align-items: center; gap: 8px;
}
.bb-map__dot { width: 8px; height: 8px; border-radius: 9999px; border: 2px solid; }
.bb-map__dot--full { background: var(--accent); border-color: var(--accent); }
.bb-map__dot--pilot { background: #fff; border-color: var(--ink-1); }

.bb-islands {
  margin-top: 24px;
  display: grid; gap: 14px; grid-template-columns: 1fr;
}
@media (min-width: 700px) { .bb-islands { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .bb-islands { grid-template-columns: repeat(3, 1fr); } }
.bb-island {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
}
.bb-island__head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 10px;
}
.bb-island__head h3 { font-size: 15px; font-weight: 500; letter-spacing: -0.015em; }
.bb-badge {
  font-size: 11px; font-weight: 500;
  padding: 3px 10px; border-radius: 9999px;
  letter-spacing: 0.01em;
}
.bb-badge--full  { background: var(--accent-soft); color: var(--accent); }
.bb-badge--pilot { background: var(--bg-2); color: var(--ink-3); }
.bb-island__body { font-size: 13px; color: var(--ink-3); line-height: 1.5; }
.bb-island__cities {
  margin-top: 10px;
  display: flex; flex-wrap: wrap; gap: 6px;
}
.bb-island__cities li {
  font-size: 11.5px; font-weight: 500;
  padding: 3px 10px; border-radius: 9999px;
  background: var(--bg-1); color: var(--ink-3);
  border: 1px solid var(--line);
}

/* ── Steps ────────────────────────────────────────────────────────── */

.bb-steps {
  display: grid; gap: 14px; grid-template-columns: 1fr;
  counter-reset: step;
}
@media (min-width: 800px) { .bb-steps { grid-template-columns: repeat(3, 1fr); } }
.bb-step {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
}
.bb-step__n {
  display: inline-block;
  font-size: 11.5px; font-weight: 500;
  padding: 3px 8px; border-radius: 6px;
  background: var(--accent-soft); color: var(--accent);
  letter-spacing: 0.02em;
  margin-bottom: 12px;
  font-variant-numeric: tabular-nums;
}
.bb-step__title { font-size: 15px; font-weight: 500; letter-spacing: -0.015em; }
.bb-step__body {
  margin-top: 4px; font-size: 13.5px; line-height: 1.55;
  color: var(--ink-3); font-weight: 500;
}

/* ── CTA band ────────────────────────────────────────────────────── */

.bb-band {
  margin-top: 40px;
  padding: 22px 24px;
  border: 1px solid var(--line);
  border-radius: 14px;
  display: grid; gap: 16px; grid-template-columns: 1fr;
  background: #fff;
}
@media (min-width: 800px) {
  .bb-band { grid-template-columns: 1fr auto; align-items: center; padding: 28px 32px; }
}
.bb-band__title { font-size: 18px; font-weight: 500; letter-spacing: -0.015em; }
.bb-band__body { margin-top: 4px; font-size: 13.5px; color: var(--ink-3); }

/* ── Footer ──────────────────────────────────────────────────────── */

.bb-footer {
  background: var(--ink-1);
  color: rgba(255, 255, 255, 0.6);
  padding: 48px 20px 20px;
}
.bb-footer__inner {
  max-width: 1200px; margin: 0 auto;
  display: grid; gap: 32px; grid-template-columns: 1fr;
}
@media (min-width: 800px) { .bb-footer__inner { grid-template-columns: 1.2fr 2fr; } }
.bb-footer__tag {
  margin-top: 12px;
  max-width: 320px;
  font-size: 13px; line-height: 1.55;
  color: rgba(255, 255, 255, 0.5);
}
.bb-footer__cols {
  display: grid; gap: 28px;
  grid-template-columns: repeat(3, 1fr);
}
.bb-footer__h {
  font-size: 11.5px; font-weight: 500; letter-spacing: 0.06em;
  text-transform: uppercase; color: #fff;
}
.bb-footer__cols ul {
  margin-top: 12px; display: flex; flex-direction: column; gap: 8px;
}
.bb-footer__cols a {
  font-size: 13px; color: rgba(255, 255, 255, 0.65);
  transition: color 0.12s;
}
.bb-footer__cols a:hover { color: #fff; }
.bb-footer__legal {
  max-width: 1200px; margin: 36px auto 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px; color: rgba(255, 255, 255, 0.4);
}
</style>
