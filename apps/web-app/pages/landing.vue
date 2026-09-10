<script setup lang="ts">
/**
 * /landing — public marketing page.
 *
 * Fully responsive, Calendly-flavoured layout: airy hero, feature grids
 * for citizens & emergency units, coverage map (Leaflet + city list) and
 * a sponsorship / partnership call-out.
 *
 * No app chrome (bottom sheets, map main view). Uses its own header + footer
 * so it can stand alone on butuhbantuan.space/landing.
 */
import { Icon } from "@iconify/vue";
import type { Map as LeafletMap, TileLayer } from "leaflet";

definePageMeta({ layout: false });

useHead({
  title: "ButuhBantuan — Bantuan darurat lebih dekat",
  meta: [
    {
      name: "description",
      content:
        "Platform darurat warga Indonesia. Peta unit ambulance, damkar, PMI, PSC 119 & rumah sakit terdekat. Live tracking petugas, e-tiket digital, dan dashboard operasional untuk unit emergency.",
    },
    { property: "og:title", content: "ButuhBantuan — Bantuan darurat lebih dekat" },
    {
      property: "og:description",
      content:
        "Peta unit darurat, laporan cepat, live tracking petugas. Tersedia di seluruh Jawa dan kota-kota besar Indonesia.",
    },
  ],
});

// ── Feature data ─────────────────────────────────────────────────────────────

const citizenFeatures = [
  {
    icon: "lucide:map-pin",
    title: "Peta unit terdekat",
    body: "Lihat lokasi ambulance, damkar, PMI, PSC 119, dan rumah sakit di sekitarmu — real-time berdasar lokasi kamu.",
  },
  {
    icon: "lucide:siren",
    title: "Buat laporan cepat",
    body: "Isi triase Merah / Kuning / Hijau, tambah foto, pilih unit terbaik. Laporan langsung diterima posko.",
  },
  {
    icon: "lucide:navigation",
    title: "Live tracking petugas",
    body: "Ikuti posisi ambulance atau tim penyelamat di peta selama dalam perjalanan menuju lokasimu.",
  },
  {
    icon: "lucide:ticket",
    title: "E-tiket digital",
    body: "Setiap laporan menghasilkan tiket dengan nomor unik. Bisa dibagikan ke keluarga untuk update status.",
  },
  {
    icon: "lucide:users",
    title: "Bantuan komunitas",
    body: "Ketika unit resmi penuh, laporan bisa diteruskan ke grup komunitas relawan terdekat.",
  },
  {
    icon: "lucide:bookmark",
    title: "Simpan unit favorit",
    body: "Tandai puskesmas atau rumah sakit langgananmu supaya cepat diakses saat darurat.",
  },
  {
    icon: "lucide:message-square",
    title: "Review & rating",
    body: "Bagikan pengalamanmu setelah menerima bantuan supaya warga lain mendapat informasi akurat.",
  },
  {
    icon: "lucide:smartphone",
    title: "PWA installable",
    body: "Pasang di homescreen HP tanpa lewat Play Store. Push notifikasi untuk update tiket.",
  },
];

const unitFeatures = [
  {
    icon: "lucide:layout-dashboard",
    title: "Dashboard operasional",
    body: "Antrian order real-time, status setiap unit, timeline dispatch — dalam satu tampilan.",
  },
  {
    icon: "lucide:bell",
    title: "Notifikasi real-time",
    body: "SSE + Web Push mengirim order baru ke laptop dan HP petugas dalam hitungan detik.",
  },
  {
    icon: "lucide:users-round",
    title: "Community claim",
    body: "Rekrut relawan komunitas untuk merespon area yang belum tercover unit resmi.",
  },
  {
    icon: "lucide:list-todo",
    title: "Manajemen antrian",
    body: "Terima, tolak, atau eskalasi order dari satu inbox. Auto-escalation kalau SLA lewat.",
  },
  {
    icon: "lucide:shield-check",
    title: "Compliance tracking",
    body: "Template asesmen sesuai standar Kemenkes / PSC 119. Audit trail lengkap per tiket.",
  },
  {
    icon: "lucide:bar-chart-2",
    title: "Analytics unit",
    body: "Metrik waktu respons, jarak, jenis pelayanan, dan feedback warga — semua dalam grafik.",
  },
  {
    icon: "lucide:hospital",
    title: "Referensi RS",
    body: "Data RS Kemenkes SATUSEHAT terintegrasi. Rekomendasi rujukan berdasar spesialisasi + kapasitas.",
  },
  {
    icon: "lucide:mountain",
    title: "SAR mission",
    body: "Modul khusus untuk operasi SAR: shift, sektor karvak, GPS anggota, magic-link live track.",
  },
];

const collabPillars = [
  {
    icon: "lucide:heart-handshake",
    title: "Donasi & Sponsor",
    body:
      "Dukung operasional platform: hosting, gateway SMS, integrasi peta, pelatihan relawan. Bisa individu atau CSR perusahaan.",
    cta: "Jadi sponsor",
  },
  {
    icon: "lucide:landmark",
    title: "Kolaborasi Pemerintah",
    body:
      "Integrasi dengan Dinkes, PSC 119 kabupaten/kota, Damkar daerah. Platform gratis untuk unit resmi Pemda.",
    cta: "Ajukan integrasi",
  },
  {
    icon: "lucide:handshake",
    title: "Volunteer partner",
    body:
      "Komunitas relawan (PMI cabang, ORARI, RAPI, komunitas ambulance) bisa ikut menerima order via jalur komunitas.",
    cta: "Gabung sebagai unit",
  },
];

// ── Coverage cities (island → list) ─────────────────────────────────────────

type Island = { key: string; label: string; full?: boolean; cities: Array<{ name: string; lat: number; lng: number }> };

const islands: Island[] = [
  {
    key: "jawa",
    label: "Jawa",
    full: true,
    cities: [
      { name: "Jakarta",    lat: -6.2088, lng: 106.8456 },
      { name: "Bandung",    lat: -6.9175, lng: 107.6191 },
      { name: "Semarang",   lat: -6.9667, lng: 110.4167 },
      { name: "Yogyakarta", lat: -7.8014, lng: 110.3644 },
      { name: "Surabaya",   lat: -7.2575, lng: 112.7521 },
      { name: "Malang",     lat: -7.9666, lng: 112.6326 },
      { name: "Solo",       lat: -7.5665, lng: 110.8317 },
      { name: "Cirebon",    lat: -6.7063, lng: 108.5570 },
      { name: "Bogor",      lat: -6.5950, lng: 106.8161 },
    ],
  },
  {
    key: "sumatra",
    label: "Sumatra",
    cities: [
      { name: "Medan",          lat: 3.5952,  lng: 98.6722  },
      { name: "Padang",         lat: -0.9471, lng: 100.4172 },
      { name: "Pekanbaru",      lat: 0.5071,  lng: 101.4478 },
      { name: "Palembang",      lat: -2.9909, lng: 104.7565 },
      { name: "Bandar Lampung", lat: -5.4295, lng: 105.2610 },
    ],
  },
  {
    key: "kalimantan",
    label: "Kalimantan",
    cities: [
      { name: "Pontianak",   lat: -0.0263, lng: 109.3425 },
      { name: "Banjarmasin", lat: -3.3186, lng: 114.5944 },
      { name: "Samarinda",   lat: -0.5017, lng: 117.1536 },
      { name: "Balikpapan",  lat: -1.2379, lng: 116.8529 },
    ],
  },
  {
    key: "sulawesi",
    label: "Sulawesi",
    cities: [
      { name: "Makassar", lat: -5.1477, lng: 119.4327 },
      { name: "Manado",   lat: 1.4748,  lng: 124.8421 },
      { name: "Palu",     lat: -0.9003, lng: 119.8779 },
      { name: "Kendari",  lat: -3.9985, lng: 122.5127 },
    ],
  },
  {
    key: "papua",
    label: "Papua",
    cities: [
      { name: "Jayapura", lat: -2.5337, lng: 140.7181 },
      { name: "Sorong",   lat: -0.8615, lng: 131.2558 },
    ],
  },
];

const coverageTotal = computed(() => {
  const jawa = 119; // all kab/kota
  const rest = islands
    .filter((i) => !i.full)
    .reduce((s, i) => s + i.cities.length, 0);
  return { jawa, rest };
});

// ── Coverage map (Leaflet, client-only) ─────────────────────────────────────

const mapEl = ref<HTMLElement | null>(null);
let map: LeafletMap | null = null;
let tileLayer: TileLayer | null = null;

async function initMap() {
  if (!mapEl.value || map) return;
  const Lmod = await import("leaflet");
  const L = (Lmod as unknown as { default: typeof import("leaflet") }).default ?? Lmod;
  await import("leaflet/dist/leaflet.css");

  map = L.map(mapEl.value, {
    center: [-2.5, 118],
    zoom: 4,
    minZoom: 3,
    maxZoom: 9,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
  });

  tileLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    { subdomains: ["a", "b", "c", "d"], maxZoom: 9 },
  ).addTo(map);

  const jawa = islands.find((i) => i.key === "jawa")!;
  // Java: highlighted "full" markers (red)
  for (const c of jawa.cities) {
    L.marker([c.lat, c.lng], { icon: pin(L, "#d93025", true) })
      .addTo(map)
      .bindTooltip(c.name, { permanent: false, direction: "top", offset: [0, -6] });
  }
  // Other islands: outlined dots
  for (const i of islands.filter((x) => !x.full)) {
    for (const c of i.cities) {
      L.marker([c.lat, c.lng], { icon: pin(L, "#0f766e", false) })
        .addTo(map)
        .bindTooltip(c.name, { permanent: false, direction: "top", offset: [0, -6] });
    }
  }

  // Java coverage haze
  L.rectangle(
    [
      [-8.85, 105.1],
      [-5.9, 114.7],
    ],
    { color: "#d93025", weight: 0, fillOpacity: 0.05 },
  ).addTo(map);
}

function pin(L: typeof import("leaflet"), color: string, filled: boolean) {
  const size = filled ? 12 : 10;
  const border = filled ? color : color;
  const fill = filled ? color : "#ffffff";
  return L.divIcon({
    className: "bb-coverage-pin-wrap",
    html: `<span style="
      display:block;width:${size}px;height:${size}px;border-radius:9999px;
      background:${fill};border:2px solid ${border};box-shadow:0 1px 4px rgba(15,23,42,.25);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

onMounted(() => {
  if (typeof window === "undefined") return;
  void initMap();
});
onBeforeUnmount(() => {
  tileLayer = null;
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <div class="bb-landing">
    <!-- Nav -->
    <header class="bb-nav">
      <div class="bb-nav__inner">
        <NuxtLink to="/" class="bb-brand" aria-label="ButuhBantuan">
          <span class="bb-brand__mark">
            <Icon icon="mynaui:ambulance-solid" class="text-[20px]" />
          </span>
          <span class="bb-brand__word">ButuhBantuan</span>
        </NuxtLink>
        <nav class="bb-nav__links">
          <a href="#warga" class="bb-nav__link">Untuk warga</a>
          <a href="#unit" class="bb-nav__link">Untuk unit</a>
          <a href="#coverage" class="bb-nav__link">Jangkauan</a>
          <a href="#dukung" class="bb-nav__link">Dukung</a>
        </nav>
        <div class="bb-nav__actions">
          <NuxtLink to="/" class="bb-btn bb-btn--ghost">Buka app</NuxtLink>
          <a href="https://dashboard.butuhbantuan.space" class="bb-btn bb-btn--primary">
            Login dashboard
          </a>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="bb-hero">
      <div class="bb-hero__inner">
        <div class="bb-hero__copy">
          <span class="bb-hero__eyebrow">
            <span class="bb-hero__eyebrow-dot" /> Bantuan darurat sipil, lebih dekat
          </span>
          <h1 class="bb-hero__title">
            Setiap detik berharga.
            <span class="bb-hero__accent">Bantuan terdekat dalam genggaman.</span>
          </h1>
          <p class="bb-hero__lede">
            Peta unit ambulance, damkar, PMI, PSC 119, dan rumah sakit di sekitarmu.
            Laporan cepat, live tracking petugas, e-tiket digital — semua gratis untuk warga.
          </p>
          <div class="bb-hero__cta">
            <NuxtLink to="/" class="bb-btn bb-btn--primary bb-btn--lg">
              <Icon icon="lucide:map-pin" class="text-[18px]" />
              Buka aplikasi warga
            </NuxtLink>
            <a href="#unit" class="bb-btn bb-btn--outline bb-btn--lg">
              <Icon icon="lucide:building-2" class="text-[18px]" />
              Untuk unit emergency
            </a>
          </div>
          <div class="bb-hero__meta">
            <div class="bb-hero__meta-item">
              <p class="bb-hero__meta-value">119+</p>
              <p class="bb-hero__meta-label">Kab/kota di Jawa</p>
            </div>
            <div class="bb-hero__meta-item">
              <p class="bb-hero__meta-value">15+</p>
              <p class="bb-hero__meta-label">Kota besar luar Jawa</p>
            </div>
            <div class="bb-hero__meta-item">
              <p class="bb-hero__meta-value">Gratis</p>
              <p class="bb-hero__meta-label">Untuk warga & unit resmi</p>
            </div>
          </div>
        </div>

        <div class="bb-hero__visual" aria-hidden="true">
          <div class="bb-hero__phone">
            <div class="bb-hero__phone-screen">
              <div class="bb-hero__mock-map">
                <span class="bb-hero__mock-pin bb-hero__mock-pin--a" />
                <span class="bb-hero__mock-pin bb-hero__mock-pin--b" />
                <span class="bb-hero__mock-pin bb-hero__mock-pin--c" />
                <span class="bb-hero__mock-user" />
              </div>
              <div class="bb-hero__mock-sheet">
                <div class="bb-hero__mock-handle" />
                <div class="bb-hero__mock-row">
                  <span class="bb-hero__mock-logo">
                    <Icon icon="mynaui:ambulance-solid" class="text-[15px]" />
                  </span>
                  <div class="bb-hero__mock-lines">
                    <span class="bb-hero__mock-line bb-hero__mock-line--title" />
                    <span class="bb-hero__mock-line bb-hero__mock-line--sub" />
                  </div>
                </div>
                <div class="bb-hero__mock-pills">
                  <span class="bb-hero__mock-pill bb-hero__mock-pill--primary">Buat laporan</span>
                  <span class="bb-hero__mock-pill">Telepon</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CITIZEN FEATURES -->
    <section id="warga" class="bb-section">
      <div class="bb-section__inner">
        <div class="bb-section__head">
          <p class="bb-eyebrow">Untuk warga</p>
          <h2 class="bb-section__title">Bantuan yang tidak menunggu birokrasi.</h2>
          <p class="bb-section__lede">
            Semua fitur di bawah tersedia gratis di aplikasi web/PWA. Tanpa registrasi berbelit.
          </p>
        </div>
        <div class="bb-grid bb-grid--3">
          <article v-for="f in citizenFeatures" :key="f.title" class="bb-card">
            <span class="bb-card__icon bb-card__icon--danger">
              <Icon :icon="f.icon" class="text-[20px]" />
            </span>
            <h3 class="bb-card__title">{{ f.title }}</h3>
            <p class="bb-card__body">{{ f.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- UNIT DASHBOARD FEATURES -->
    <section id="unit" class="bb-section bb-section--dark">
      <div class="bb-section__inner">
        <div class="bb-section__head">
          <p class="bb-eyebrow bb-eyebrow--light">Untuk unit emergency</p>
          <h2 class="bb-section__title bb-section__title--light">
            Dashboard operasional yang ringan, cepat, bisa ditinggal jalan.
          </h2>
          <p class="bb-section__lede bb-section__lede--light">
            Ambulance, damkar, PMI, PSC 119, SAR, komunitas relawan — semua bisa masuk ke dashboard yang sama.
          </p>
        </div>
        <div class="bb-grid bb-grid--3">
          <article v-for="f in unitFeatures" :key="f.title" class="bb-card bb-card--dark">
            <span class="bb-card__icon bb-card__icon--light">
              <Icon :icon="f.icon" class="text-[20px]" />
            </span>
            <h3 class="bb-card__title bb-card__title--light">{{ f.title }}</h3>
            <p class="bb-card__body bb-card__body--light">{{ f.body }}</p>
          </article>
        </div>
        <div class="bb-section__foot">
          <a href="https://dashboard.butuhbantuan.space" class="bb-btn bb-btn--primary bb-btn--lg">
            <Icon icon="lucide:layout-dashboard" class="text-[18px]" />
            Buka dashboard
          </a>
          <a href="mailto:hello@butuhbantuan.space?subject=Onboarding unit" class="bb-btn bb-btn--ghost bb-btn--lg bb-btn--ghost-light">
            Ajukan onboarding unit
          </a>
        </div>
      </div>
    </section>

    <!-- COVERAGE -->
    <section id="coverage" class="bb-section">
      <div class="bb-section__inner">
        <div class="bb-section__head">
          <p class="bb-eyebrow">Jangkauan</p>
          <h2 class="bb-section__title">Hadir di seluruh Jawa. Terus meluas ke kota besar Indonesia.</h2>
          <p class="bb-section__lede">
            {{ coverageTotal.jawa }}+ kabupaten/kota di Jawa terhubung penuh.
            Ekspansi bertahap ke {{ coverageTotal.rest }}+ kota besar di luar Jawa.
          </p>
        </div>

        <div class="bb-coverage">
          <div ref="mapEl" class="bb-coverage__map" role="img" aria-label="Peta jangkauan Indonesia" />
          <div class="bb-coverage__legend">
            <span class="bb-coverage__legend-item">
              <span class="bb-coverage__dot bb-coverage__dot--full" />
              Jawa · coverage penuh
            </span>
            <span class="bb-coverage__legend-item">
              <span class="bb-coverage__dot bb-coverage__dot--pilot" />
              Kota besar luar Jawa · pilot
            </span>
          </div>
        </div>

        <div class="bb-coverage__islands">
          <article v-for="island in islands" :key="island.key" class="bb-island">
            <header class="bb-island__head">
              <h3 class="bb-island__name">{{ island.label }}</h3>
              <span
                class="bb-island__badge"
                :class="island.full ? 'bb-island__badge--full' : 'bb-island__badge--pilot'"
              >
                {{ island.full ? "Coverage penuh" : "Pilot" }}
              </span>
            </header>
            <p class="bb-island__body">
              <template v-if="island.full">
                Seluruh {{ island.cities.length }}+ kota utama sudah on-boarded. Termasuk kabupaten kecil di sekitarnya.
              </template>
              <template v-else>
                Aktif di {{ island.cities.length }} kota besar. Ekspansi terus berjalan.
              </template>
            </p>
            <ul class="bb-island__cities">
              <li v-for="c in island.cities" :key="c.name">{{ c.name }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- COLLABORATION -->
    <section id="dukung" class="bb-section bb-section--tinted">
      <div class="bb-section__inner">
        <div class="bb-section__head">
          <p class="bb-eyebrow">Dukung</p>
          <h2 class="bb-section__title">Bantu kami membangun jaringan darurat sipil.</h2>
          <p class="bb-section__lede">
            Kami butuh sponsor, mitra pemerintah, dan komunitas relawan untuk menjaga ini tetap gratis dan andal.
          </p>
        </div>
        <div class="bb-grid bb-grid--3">
          <article v-for="pillar in collabPillars" :key="pillar.title" class="bb-card bb-card--collab">
            <span class="bb-card__icon bb-card__icon--accent">
              <Icon :icon="pillar.icon" class="text-[22px]" />
            </span>
            <h3 class="bb-card__title">{{ pillar.title }}</h3>
            <p class="bb-card__body">{{ pillar.body }}</p>
            <a
              href="mailto:hello@butuhbantuan.space?subject=Kolaborasi"
              class="bb-card__cta"
            >
              {{ pillar.cta }}
              <Icon icon="lucide:arrow-right" class="text-[14px]" />
            </a>
          </article>
        </div>

        <div class="bb-cta-band">
          <div class="bb-cta-band__copy">
            <h3 class="bb-cta-band__title">Mau bantu tapi tidak tahu bagaimana?</h3>
            <p class="bb-cta-band__lede">
              Cukup bagikan aplikasi ini ke keluarga & tetangga. Setiap install baru berarti satu tetangga lebih siap saat darurat.
            </p>
          </div>
          <NuxtLink to="/" class="bb-btn bb-btn--primary bb-btn--lg">
            Bagikan aplikasi
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bb-footer">
      <div class="bb-footer__inner">
        <div class="bb-footer__brand">
          <span class="bb-brand">
            <span class="bb-brand__mark">
              <Icon icon="mynaui:ambulance-solid" class="text-[20px]" />
            </span>
            <span class="bb-brand__word">ButuhBantuan</span>
          </span>
          <p class="bb-footer__tagline">Bantuan darurat sipil Indonesia. Open, gratis, dibangun bersama komunitas.</p>
        </div>
        <div class="bb-footer__cols">
          <div>
            <p class="bb-footer__heading">Warga</p>
            <ul class="bb-footer__list">
              <li><NuxtLink to="/">Buka aplikasi</NuxtLink></li>
              <li><NuxtLink to="/my-tickets">Cek tiket saya</NuxtLink></li>
              <li><a href="#warga">Fitur</a></li>
            </ul>
          </div>
          <div>
            <p class="bb-footer__heading">Unit emergency</p>
            <ul class="bb-footer__list">
              <li><a href="https://dashboard.butuhbantuan.space">Login dashboard</a></li>
              <li><a href="#unit">Fitur dashboard</a></li>
              <li>
                <a href="mailto:hello@butuhbantuan.space?subject=Onboarding unit">
                  Onboarding
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p class="bb-footer__heading">Platform</p>
            <ul class="bb-footer__list">
              <li><a href="#coverage">Jangkauan</a></li>
              <li><a href="#dukung">Dukung</a></li>
              <li><a href="mailto:hello@butuhbantuan.space">Kontak</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="bb-footer__legal">
        <span>© {{ new Date().getFullYear() }} ButuhBantuan</span>
        <span class="bb-footer__legal-sep">·</span>
        <span>Dibangun untuk komunitas Indonesia.</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ────────────────────────────────────────────────────────────────────────
 * Landing — self-contained styles. No dependency on the app shell CSS
 * (bb-user-pin etc). Uses a small, Calendly-flavoured palette.
 * ──────────────────────────────────────────────────────────────────────── */

.bb-landing {
  --bg: #ffffff;
  --bg-tinted: #faf7f6;
  --bg-dark: #101828;
  --text: #101828;
  --text-2: #475467;
  --text-3: #667085;
  --line: #eaecf0;
  --line-2: #d0d5dd;
  --accent: #d93025;
  --accent-hover: #a52a1e;
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.05);
  --shadow-md: 0 8px 24px -8px rgba(16, 24, 40, 0.08);
  --shadow-lg: 0 20px 48px -12px rgba(16, 24, 40, 0.15);

  background: var(--bg);
  color: var(--text);
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: -0.005em;
  min-height: 100vh;
}

/* Reset padding on landing pages */
.bb-landing :where(h1, h2, h3, h4, p, ul) { margin: 0; }
.bb-landing ul { list-style: none; padding: 0; }
.bb-landing a { color: inherit; text-decoration: none; }

/* ── Nav ─────────────────────────────────────────────────────────────── */

.bb-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(160%) blur(10px);
  border-bottom: 1px solid var(--line);
}
.bb-nav__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.bb-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16px;
  color: var(--text);
  letter-spacing: -0.02em;
}
.bb-brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(217, 48, 37, 0.1);
  color: var(--accent);
}
.bb-brand__word { line-height: 1; }
.bb-nav__links {
  display: none;
  gap: 22px;
  margin-left: 18px;
}
.bb-nav__link {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
  transition: color 0.15s;
}
.bb-nav__link:hover { color: var(--text); }
.bb-nav__actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

@media (min-width: 900px) {
  .bb-nav__links { display: flex; }
}

/* ── Buttons ─────────────────────────────────────────────────────────── */

.bb-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 9999px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.12s, background 0.12s, border-color 0.12s;
  white-space: nowrap;
  letter-spacing: -0.01em;
}
.bb-btn:active { transform: scale(0.97); }
.bb-btn--lg { padding: 12px 22px; font-size: 15px; }
.bb-btn--primary { background: var(--accent); color: #fff; }
.bb-btn--primary:hover { background: var(--accent-hover); }
.bb-btn--outline {
  background: #fff;
  color: var(--text);
  border-color: var(--line-2);
}
.bb-btn--outline:hover { border-color: var(--text-2); }
.bb-btn--ghost { background: transparent; color: var(--text); }
.bb-btn--ghost:hover { background: rgba(16, 24, 40, 0.04); }
.bb-btn--ghost-light { color: #fff; }
.bb-btn--ghost-light:hover { background: rgba(255, 255, 255, 0.1); }

/* ── Hero ────────────────────────────────────────────────────────────── */

.bb-hero {
  padding: 56px 20px 40px;
  background: radial-gradient(1200px 400px at 15% -20%, rgba(217, 48, 37, 0.08), transparent 60%);
}
.bb-hero__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 40px;
  grid-template-columns: 1fr;
  align-items: center;
}
@media (min-width: 900px) {
  .bb-hero { padding: 88px 24px 72px; }
  .bb-hero__inner { grid-template-columns: 1.15fr 1fr; gap: 60px; }
}

.bb-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 9999px;
  background: rgba(217, 48, 37, 0.08);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.bb-hero__eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--accent);
  animation: bb-pulse 2s ease-in-out infinite;
}
@keyframes bb-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(1.3); }
}
.bb-hero__title {
  margin-top: 20px;
  font-size: clamp(34px, 5vw, 54px);
  line-height: 1.05;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text);
}
.bb-hero__accent {
  display: block;
  color: var(--accent);
}
.bb-hero__lede {
  margin-top: 20px;
  font-size: clamp(15px, 1.6vw, 18px);
  line-height: 1.55;
  color: var(--text-2);
  max-width: 560px;
  font-weight: 500;
}
.bb-hero__cta {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.bb-hero__meta {
  margin-top: 44px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 480px;
}
.bb-hero__meta-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}
.bb-hero__meta-label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-3);
  font-weight: 500;
}

/* Hero phone mockup */
.bb-hero__visual {
  display: flex;
  justify-content: center;
  align-items: center;
}
.bb-hero__phone {
  width: min(320px, 80vw);
  aspect-ratio: 320 / 640;
  background: linear-gradient(135deg, #1f2937, #101828);
  border-radius: 44px;
  padding: 12px;
  box-shadow: var(--shadow-lg);
  position: relative;
}
.bb-hero__phone::before {
  content: "";
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 74px;
  height: 22px;
  border-radius: 9999px;
  background: #101828;
  z-index: 2;
}
.bb-hero__phone-screen {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 34px;
  overflow: hidden;
  background: #f2f4f7;
}
.bb-hero__mock-map {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(3px 3px at 30% 25%, #b0d8b0 55%, transparent 60%),
    radial-gradient(3px 3px at 70% 40%, #b0d8b0 55%, transparent 60%),
    radial-gradient(3px 3px at 50% 60%, #b0d8b0 55%, transparent 60%),
    linear-gradient(180deg, #dcecf6 0%, #e7f0e4 55%, #e0e6d0 100%);
}
.bb-hero__mock-pin {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.4);
}
.bb-hero__mock-pin--a { background: #d93025; top: 25%; left: 30%; }
.bb-hero__mock-pin--b { background: #ea580c; top: 40%; left: 65%; }
.bb-hero__mock-pin--c { background: #d93025; top: 55%; left: 45%; }
.bb-hero__mock-user {
  position: absolute;
  top: 68%;
  left: 50%;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  background: #2563eb;
  border: 3px solid #fff;
  box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.15);
}
.bb-hero__mock-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 8px 16px 20px;
  box-shadow: 0 -8px 20px rgba(15, 23, 42, 0.08);
}
.bb-hero__mock-handle {
  width: 40px;
  height: 4px;
  border-radius: 9999px;
  background: #d0d5dd;
  margin: 0 auto 12px;
}
.bb-hero__mock-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}
.bb-hero__mock-logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(217, 48, 37, 0.1);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.bb-hero__mock-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bb-hero__mock-line {
  height: 8px;
  background: #eaecf0;
  border-radius: 9999px;
}
.bb-hero__mock-line--title { width: 70%; height: 10px; background: #d0d5dd; }
.bb-hero__mock-line--sub { width: 50%; }
.bb-hero__mock-pills {
  display: flex;
  gap: 6px;
}
.bb-hero__mock-pill {
  font-size: 10px;
  padding: 5px 10px;
  border-radius: 9999px;
  background: #f2f4f7;
  color: #667085;
  font-weight: 600;
}
.bb-hero__mock-pill--primary {
  background: var(--accent);
  color: #fff;
}

/* ── Sections ────────────────────────────────────────────────────────── */

.bb-section {
  padding: 72px 20px;
}
.bb-section__inner {
  max-width: 1200px;
  margin: 0 auto;
}
.bb-section--dark {
  background: var(--bg-dark);
  color: #fff;
}
.bb-section--tinted {
  background: var(--bg-tinted);
}
@media (min-width: 900px) {
  .bb-section { padding: 104px 24px; }
}

.bb-section__head {
  max-width: 680px;
  margin: 0 auto 48px;
  text-align: center;
}
.bb-section__title {
  font-size: clamp(26px, 3.4vw, 40px);
  line-height: 1.15;
  letter-spacing: -0.025em;
  font-weight: 700;
  color: var(--text);
  margin-top: 12px;
}
.bb-section__title--light { color: #fff; }
.bb-section__lede {
  margin-top: 16px;
  font-size: clamp(15px, 1.4vw, 17px);
  line-height: 1.55;
  color: var(--text-2);
  font-weight: 500;
}
.bb-section__lede--light { color: rgba(255, 255, 255, 0.75); }
.bb-eyebrow {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.bb-eyebrow--light { color: #fca5a5; }

.bb-section__foot {
  margin-top: 40px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

/* ── Grid + Cards ────────────────────────────────────────────────────── */

.bb-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .bb-grid--3 { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1000px) {
  .bb-grid--3 { grid-template-columns: repeat(3, 1fr); }
}

.bb-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 22px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.16s, box-shadow 0.16s;
}
.bb-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.bb-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  margin-bottom: 14px;
}
.bb-card__icon--danger {
  background: rgba(217, 48, 37, 0.08);
  color: var(--accent);
}
.bb-card__icon--light {
  background: rgba(255, 255, 255, 0.08);
  color: #fca5a5;
}
.bb-card__icon--accent {
  background: rgba(217, 48, 37, 0.1);
  color: var(--accent);
}
.bb-card__title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--text);
}
.bb-card__title--light { color: #fff; }
.bb-card__body {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-2);
  font-weight: 500;
}
.bb-card__body--light { color: rgba(255, 255, 255, 0.7); }

.bb-card--dark {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}
.bb-card--dark:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}
.bb-card--collab {
  display: flex;
  flex-direction: column;
}
.bb-card__cta {
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}
.bb-card__cta:hover { color: var(--accent-hover); }

/* ── Coverage ────────────────────────────────────────────────────────── */

.bb-coverage {
  position: relative;
  margin-top: 8px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}
.bb-coverage__map {
  height: 320px;
  background: #f2f4f7;
}
@media (min-width: 800px) {
  .bb-coverage__map { height: 420px; }
}
.bb-coverage__legend {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  padding: 14px 18px;
  border-top: 1px solid var(--line);
  background: #ffffff;
}
.bb-coverage__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-2);
}
.bb-coverage__dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  border: 2px solid;
}
.bb-coverage__dot--full { background: var(--accent); border-color: var(--accent); }
.bb-coverage__dot--pilot { background: #fff; border-color: #0f766e; }

.bb-coverage__islands {
  margin-top: 32px;
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr;
}
@media (min-width: 700px) {
  .bb-coverage__islands { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1100px) {
  .bb-coverage__islands { grid-template-columns: repeat(3, 1fr); }
}
.bb-island {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 22px;
}
.bb-island__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.bb-island__name {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.015em;
}
.bb-island__badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  letter-spacing: 0.01em;
}
.bb-island__badge--full {
  background: rgba(217, 48, 37, 0.1);
  color: var(--accent);
}
.bb-island__badge--pilot {
  background: #ecfdf5;
  color: #047857;
}
.bb-island__body {
  font-size: 13.5px;
  color: var(--text-2);
  line-height: 1.5;
}
.bb-island__cities {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.bb-island__cities li {
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 9999px;
  background: var(--bg-tinted);
  color: var(--text-2);
}

/* ── CTA band ────────────────────────────────────────────────────────── */

.bb-cta-band {
  margin-top: 48px;
  padding: 28px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 20px;
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr;
  align-items: center;
  box-shadow: var(--shadow-sm);
}
@media (min-width: 800px) {
  .bb-cta-band {
    grid-template-columns: 1fr auto;
    padding: 32px 40px;
  }
}
.bb-cta-band__title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
}
.bb-cta-band__lede {
  margin-top: 6px;
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.5;
}

/* ── Footer ──────────────────────────────────────────────────────────── */

.bb-footer {
  background: var(--bg-dark);
  color: rgba(255, 255, 255, 0.7);
  padding: 56px 20px 24px;
}
.bb-footer__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 40px;
  grid-template-columns: 1fr;
}
@media (min-width: 800px) {
  .bb-footer__inner { grid-template-columns: 1.2fr 2fr; }
}
.bb-footer__brand .bb-brand { color: #fff; }
.bb-footer__brand .bb-brand__mark {
  background: rgba(217, 48, 37, 0.2);
  color: #fca5a5;
}
.bb-footer__tagline {
  margin-top: 14px;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.55;
  max-width: 320px;
}
.bb-footer__cols {
  display: grid;
  gap: 32px;
  grid-template-columns: repeat(3, 1fr);
}
.bb-footer__heading {
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.bb-footer__list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bb-footer__list a {
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.7);
  transition: color 0.12s;
}
.bb-footer__list a:hover { color: #fff; }

.bb-footer__legal {
  max-width: 1200px;
  margin: 40px auto 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}
.bb-footer__legal-sep { opacity: 0.4; }
</style>
