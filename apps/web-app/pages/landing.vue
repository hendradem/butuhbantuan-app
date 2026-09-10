<script setup lang="ts">
/**
 * /landing — public marketing page.
 *
 * Layout patterns drawn from modern minimalist SaaS pages (single-column
 * centered hero, three-card feature grid, alternating deep-dive showcases,
 * Wall-of-Love style testimonial grid, accordion FAQ, multi-column footer).
 * Every string and mockup here is ButuhBantuan-specific.
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
        "Peta unit ambulance, damkar, SAR, PMI, PSC 119 & rumah sakit terdekat. Laporan darurat 30 detik, live tracking petugas, dashboard operasional untuk unit emergency.",
    },
  ],
  link: [
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&display=swap",
    },
  ],
});

// ── Live activity ticker + KPI counters ─────────────────────────────────────

const activityFeed = [
  "Ambulance PMI Bantul terima laporan · asma anak",
  "PSC 119 Sleman dispatch ke RSUP Sardjito",
  "Damkar Kota Yogyakarta siaga di zona hijau",
  "Community claim aktif · Relawan Sleman",
  "PSC 119 Kulon Progo arrival di Wates",
  "RSUP Sardjito · kapasitas IGD 78%",
];
const activityIndex = ref(0);
let tickerTimer: ReturnType<typeof setInterval> | null = null;

const kpiTickets = ref(0);
const kpiUnits = ref(0);
const kpiCoverage = ref(0);
const kpiAvgMin = ref(0);
function easeTo(target: number, r: { value: number }, ms = 1000) {
  const start = performance.now();
  const from = r.value;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    r.value = Math.round(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Feature cards ───────────────────────────────────────────────────────────

const primaryFeatures = [
  {
    icon: "lucide:map-pin",
    tint: "red",
    title: "Peta unit terdekat",
    body: "Ambulance, damkar, SAR, PMI, PSC 119, dan rumah sakit di sekitarmu — lengkap dengan jarak, ETA, dan status siaga real-time.",
  },
  {
    icon: "lucide:siren",
    tint: "purple",
    title: "Laporan darurat 30 detik",
    body: "Triase Merah / Kuning / Hijau sesuai standar Kemenkes, foto opsional, unit terbaik otomatis di-dispatch dengan nomor tiket unik.",
  },
  {
    icon: "lucide:navigation",
    tint: "teal",
    title: "Live tracking petugas",
    body: "Ikuti posisi unit di peta secara live. E-tiket digital bisa dibagikan ke keluarga untuk update status tanpa perlu telepon berulang.",
  },
];

// ── Deep-dive showcase sections ─────────────────────────────────────────────

const showcases = [
  {
    eyebrow: "Untuk warga",
    eyebrowTint: "red",
    title: "Bantuan yang tidak menunggu birokrasi.",
    body:
      "Semua fitur di aplikasi warga tersedia gratis, tanpa registrasi berbelit. Kamu buka, kasih izin lokasi, dan langsung lihat unit terdekat.",
    bullets: [
      "Marker per-kategori dengan warna dan icon berbeda",
      "Save unit favorit untuk akses satu ketuk",
      "PWA installable — tanpa Play Store, dapat push notifikasi",
      "Bantuan komunitas otomatis kalau unit resmi penuh",
    ],
    ctaLabel: "Buka peta darurat",
    ctaHref: "/",
  },
  {
    eyebrow: "Untuk unit emergency",
    eyebrowTint: "orange",
    title: "Dashboard yang ringan, cepat, bisa ditinggal jalan.",
    body:
      "Ambulance, damkar, PMI, PSC 119, SAR, sampai komunitas relawan — semua masuk ke dashboard yang sama.",
    bullets: [
      "SSE + Web Push kirim order dalam hitungan detik",
      "Auto-eskalasi kalau SLA lewat unit pertama",
      "Referensi RS SATUSEHAT Kemenkes terintegrasi",
      "Analytics: response time, SLA, feedback warga",
    ],
    ctaLabel: "Buka dashboard",
    ctaHref: "https://dashboard.butuhbantuan.space",
    reverse: true,
  },
];

// ── Community feedback (illustrative — represents typical themes) ──────────

const feedbackCards = [
  {
    initials: "AM",
    tint: "red",
    name: "Ade M.",
    role: "Warga · Sleman",
    quote:
      "Malam itu anak saya sesak nafas. Buka app, lihat ambulance PMI terdekat, langsung buat laporan. Petugas datang 4 menit.",
  },
  {
    initials: "PS",
    tint: "purple",
    name: "PSC 119 Sleman",
    role: "Dinkes Kabupaten Sleman",
    quote:
      "Dashboard-nya bersih, notifikasi push cepat, tim jadi tidak perlu buka aplikasi lain. Compliance tracking otomatis membantu audit.",
  },
  {
    initials: "RY",
    tint: "teal",
    name: "Rina Y.",
    role: "Relawan Komunitas",
    quote:
      "Kami relawan swasta bisa bantu warga via jalur komunitas. Tanpa harus daftar resmi Dinas, tetap ter-track lewat platform.",
  },
  {
    initials: "DK",
    tint: "orange",
    name: "Damkar Yogyakarta",
    role: "Unit resmi Pemda",
    quote:
      "Kirim tim ke kejadian jauh lebih cepat dibanding jalur radio konvensional. GPS live tracking juga membantu koordinasi tim di lapangan.",
  },
  {
    initials: "RA",
    tint: "pink",
    name: "Rio A.",
    role: "Warga · Bantul",
    quote:
      "Fitur simpan unit favorit sangat membantu. RS langganan langsung ada di homescreen aplikasi, tinggal ketuk saat butuh.",
  },
  {
    initials: "PM",
    tint: "blue",
    name: "PMI Cabang DIY",
    role: "Palang Merah Indonesia",
    quote:
      "Sebelum ini, laporan komunitas datang tersebar. Sekarang antrian di satu inbox, timeline dispatch jelas, dan warga tetap bisa akses.",
  },
];

// ── FAQ ─────────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: "Apakah aplikasi ini benar-benar gratis untuk warga?",
    a: "Ya. Semua fitur di butuhbantuan.space gratis. Tidak ada registrasi wajib, tidak ada iklan berbayar. Operasional platform didanai oleh sponsor dan mitra pemerintah.",
  },
  {
    q: "Bagaimana cara unit emergency saya bergabung?",
    a: "Kirim email ke hello@butuhbantuan.space dengan nama unit, wilayah operasi, dan kontak koordinator. Kami akan bantu proses onboarding + kirim panduan dashboard.",
  },
  {
    q: "Data lokasi saya disimpan di mana?",
    a: "Koordinat GPS hanya dikirim saat kamu buat laporan atau share live location. Data disimpan di server Indonesia, dienkripsi in-transit dengan HTTPS. Kami tidak jual data ke pihak ketiga.",
  },
  {
    q: "Kalau tidak ada unit terdekat, apa yang terjadi?",
    a: "Platform akan meneruskan order ke jaringan komunitas relawan terdekat. Kalau semua penuh, order dieskalasi ke unit di kabupaten tetangga. Kamu tetap dapat estimasi realistis di setiap step.",
  },
  {
    q: "Bagaimana jika saya di kota yang belum tercover?",
    a: "Peta tetap bisa dibuka, tapi belum ada unit terdaftar di area kamu. Kamu bisa bantu kami — hubungi Dinkes atau PSC 119 setempat untuk daftar sebagai unit. Kami handle setup gratis.",
  },
  {
    q: "Bisa integrasi dengan sistem 119 / 112 yang sudah ada?",
    a: "Bisa. Kami sudah punya adaptor untuk SATUSEHAT (Kemenkes) dan sedang eksplorasi integrasi dengan Command Center Kota (CCTV, panic button). Hubungi kami untuk diskusi lebih lanjut.",
  },
];

const openFaq = ref<number | null>(0);
function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i;
}

// ── Coverage cities ────────────────────────────────────────────────────────

type Island = { key: string; label: string; full?: boolean; cities: Array<{ name: string; lat: number; lng: number }> };
const islands: Island[] = [
  { key: "jawa", label: "Jawa", full: true, cities: [
    { name: "Jakarta", lat: -6.2088, lng: 106.8456 }, { name: "Bandung", lat: -6.9175, lng: 107.6191 },
    { name: "Semarang", lat: -6.9667, lng: 110.4167 }, { name: "Yogyakarta", lat: -7.8014, lng: 110.3644 },
    { name: "Surabaya", lat: -7.2575, lng: 112.7521 }, { name: "Malang", lat: -7.9666, lng: 112.6326 },
    { name: "Solo", lat: -7.5665, lng: 110.8317 }, { name: "Cirebon", lat: -6.7063, lng: 108.5570 },
    { name: "Bogor", lat: -6.5950, lng: 106.8161 },
  ]},
  { key: "sumatra", label: "Sumatra", cities: [
    { name: "Medan", lat: 3.5952, lng: 98.6722 }, { name: "Padang", lat: -0.9471, lng: 100.4172 },
    { name: "Pekanbaru", lat: 0.5071, lng: 101.4478 }, { name: "Palembang", lat: -2.9909, lng: 104.7565 },
    { name: "Bandar Lampung", lat: -5.4295, lng: 105.2610 },
  ]},
  { key: "kalimantan", label: "Kalimantan", cities: [
    { name: "Pontianak", lat: -0.0263, lng: 109.3425 }, { name: "Banjarmasin", lat: -3.3186, lng: 114.5944 },
    { name: "Samarinda", lat: -0.5017, lng: 117.1536 }, { name: "Balikpapan", lat: -1.2379, lng: 116.8529 },
  ]},
  { key: "sulawesi", label: "Sulawesi", cities: [
    { name: "Makassar", lat: -5.1477, lng: 119.4327 }, { name: "Manado", lat: 1.4748, lng: 124.8421 },
    { name: "Palu", lat: -0.9003, lng: 119.8779 }, { name: "Kendari", lat: -3.9985, lng: 122.5127 },
  ]},
  { key: "papua", label: "Papua", cities: [
    { name: "Jayapura", lat: -2.5337, lng: 140.7181 }, { name: "Sorong", lat: -0.8615, lng: 131.2558 },
  ]},
];

// ── Coverage map ────────────────────────────────────────────────────────────

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
    L.marker([c.lat, c.lng], { icon: pin(L, "#D93025", true) })
      .addTo(map).bindTooltip(c.name, { direction: "top", offset: [0, -6] });
  }
  for (const i of islands.filter((x) => !x.full)) {
    for (const c of i.cities) {
      L.marker([c.lat, c.lng], { icon: pin(L, "#0A0A0A", false) })
        .addTo(map).bindTooltip(c.name, { direction: "top", offset: [0, -6] });
    }
  }
  L.rectangle([[-8.85, 105.1], [-5.9, 114.7]], {
    color: "#D93025", weight: 0, fillOpacity: 0.06,
  }).addTo(map);
}

function pin(L: typeof import("leaflet"), color: string, filled: boolean) {
  const size = filled ? 12 : 10;
  return L.divIcon({
    className: "bb-cov-pin",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${filled ? color : "#fff"};border:2px solid ${color};box-shadow:0 1px 3px rgba(13,13,13,.2);"></span>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2],
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
  easeTo(119, kpiCoverage);
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
            <Icon icon="mynaui:ambulance-solid" class="text-[18px]" />
          </span>
          <span class="bb-brand__word">butuhbantuan</span>
        </NuxtLink>
        <nav class="bb-nav__links">
          <a href="#warga">Untuk warga</a>
          <a href="#unit">Untuk unit</a>
          <a href="#feedback">Testimoni</a>
          <a href="#coverage">Jangkauan</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div class="bb-nav__actions">
          <NuxtLink to="/" class="bb-btn bb-btn--white">Buka app</NuxtLink>
          <a href="https://dashboard.butuhbantuan.space" class="bb-btn bb-btn--black">
            Login
            <Icon icon="lucide:arrow-up-right" class="text-[13px]" />
          </a>
        </div>
      </div>
    </header>

    <!-- Hero (centered, single-column) -->
    <section class="bb-hero">
      <span class="bb-rating">
        <span class="bb-rating__badge">
          <Icon icon="lucide:heart-pulse" class="text-[13px]" />
        </span>
        Dipakai warga di 119+ kabupaten/kota
      </span>

      <h1 class="bb-h1">
        Bantuan darurat, <br />
        <span class="bb-h1__accent">dalam genggaman warga.</span>
      </h1>

      <p class="bb-hero__lede">
        Peta unit ambulance, damkar, SAR, PMI, PSC 119, dan rumah sakit terdekat.
        Laporan darurat 30 detik, live tracking petugas sampai tiba.
        Gratis untuk warga, tanpa registrasi.
      </p>

      <div class="bb-hero__ctas">
        <NuxtLink to="/" class="bb-btn bb-btn--black bb-btn--lg">
          Buka app warga <Icon icon="lucide:arrow-up-right" class="text-[15px]" />
        </NuxtLink>
        <a href="#unit" class="bb-btn bb-btn--white bb-btn--lg">
          Lihat demo dashboard <Icon icon="lucide:arrow-up-right" class="text-[15px]" />
        </a>
      </div>
      <p class="bb-hero__note">Tidak perlu kartu · Tidak perlu install</p>

      <!-- Product mockup below hero (like sendr / supahub / linear pattern) -->
      <div class="bb-hero__mock">
        <div class="bb-mock__chrome">
          <span class="bb-mock__dot bb-mock__dot--r" />
          <span class="bb-mock__dot bb-mock__dot--y" />
          <span class="bb-mock__dot bb-mock__dot--g" />
          <span class="bb-mock__url">
            <Icon icon="lucide:lock" class="text-[10px]" /> butuhbantuan.space
          </span>
        </div>
        <div class="bb-mock__body">
          <!-- Map background -->
          <div class="bb-hmap">
            <span class="bb-hmap__road bb-hmap__road--a" />
            <span class="bb-hmap__road bb-hmap__road--b" />
            <span class="bb-hmap__road bb-hmap__road--c" />
            <!-- Unit markers with real icons -->
            <span class="bb-hmap__unit" style="top:22%;left:22%;background:#D93025">
              <Icon icon="mynaui:ambulance-solid" class="text-[14px]" />
            </span>
            <span class="bb-hmap__unit" style="top:35%;left:52%;background:#EF4444">
              <Icon icon="mdi:fire-truck" class="text-[13px]" />
            </span>
            <span class="bb-hmap__unit" style="top:16%;left:64%;background:#F97316">
              <Icon icon="fa-solid:car-crash" class="text-[11px]" />
            </span>
            <span class="bb-hmap__unit" style="top:48%;left:72%;background:#8B5CF6">
              <Icon icon="mdi:hospital-building" class="text-[12px]" />
            </span>
            <span class="bb-hmap__unit" style="top:52%;left:38%;background:#EC4899">
              <Icon icon="mynaui:ambulance-solid" class="text-[12px]" />
            </span>
            <!-- User location -->
            <span class="bb-hmap__user">
              <span class="bb-hmap__ping" />
            </span>
            <!-- Floating docks -->
            <div class="bb-hmap__dock">
              <button class="bb-hmap__fab"><Icon icon="lucide:bookmark" class="text-[13px]" /></button>
              <button class="bb-hmap__fab"><Icon icon="lucide:star" class="text-[13px]" /></button>
              <button class="bb-hmap__fab"><Icon icon="lucide:locate-fixed" class="text-[13px]" /></button>
            </div>
          </div>
          <!-- Detail sheet peek -->
          <div class="bb-hmap__sheet">
            <div class="bb-hmap__sheet-handle" />
            <div class="bb-hmap__sheet-head">
              <span class="bb-hmap__sheet-logo">
                <Icon icon="mynaui:ambulance-solid" class="text-[15px]" />
              </span>
              <div class="bb-hmap__sheet-title-wrap">
                <p class="bb-hmap__sheet-title">Ambulance PMI Sleman</p>
                <p class="bb-hmap__sheet-sub">Palang Merah Indonesia</p>
                <div class="bb-hmap__sheet-meta">
                  <span style="color:#1a73e8">Komunitas</span>
                  <span class="bb-hmap__sheet-sep">·</span>
                  <span style="color:#10B981">3 min</span>
                  <span class="bb-hmap__sheet-sep">·</span>
                  <span style="color:#737373">1.2 km</span>
                </div>
              </div>
              <span class="bb-hmap__sheet-x"><Icon icon="lucide:x" class="text-[12px]" /></span>
            </div>
            <div class="bb-hmap__sheet-pills">
              <span class="bb-hmap__sheet-pill bb-hmap__sheet-pill--primary">
                <Icon icon="lucide:siren" class="text-[11px]" /> Buat laporan
              </span>
              <span class="bb-hmap__sheet-pill">
                <Icon icon="ic:baseline-whatsapp" class="text-[11px]" /> WA
              </span>
              <span class="bb-hmap__sheet-pill">
                <Icon icon="lucide:phone" class="text-[11px]" /> Telepon
              </span>
              <span class="bb-hmap__sheet-pill">
                <Icon icon="lucide:share-2" class="text-[11px]" /> Share
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Metric strip -->
      <div class="bb-metrics">
        <div class="bb-metric">
          <p class="bb-metric__v">{{ kpiTickets }}</p>
          <p class="bb-metric__l">Tiket 24 jam terakhir</p>
        </div>
        <div class="bb-metric">
          <p class="bb-metric__v">{{ kpiUnits }}</p>
          <p class="bb-metric__l">Unit terdaftar</p>
        </div>
        <div class="bb-metric">
          <p class="bb-metric__v">{{ kpiCoverage }}+</p>
          <p class="bb-metric__l">Kabupaten/kota Jawa</p>
        </div>
        <div class="bb-metric">
          <p class="bb-metric__v">±{{ kpiAvgMin }}<span>min</span></p>
          <p class="bb-metric__l">Avg response</p>
        </div>
      </div>

      <!-- Ticker strip -->
      <div class="bb-ticker">
        <span class="bb-ticker__dot"><span class="bb-ticker__ping" /></span>
        <span class="bb-ticker__label">Live</span>
        <Transition name="bb-tk" mode="out-in">
          <span :key="activityIndex" class="bb-ticker__text">
            {{ activityFeed[activityIndex] }}
          </span>
        </Transition>
      </div>
    </section>

    <!-- Feature cards (3-column grid) -->
    <section id="warga" class="bb-sec">
      <div class="bb-sec__inner">
        <div class="bb-sec__head">
          <p class="bb-eyebrow">Fitur inti</p>
          <h2 class="bb-h2">Semua yang dibutuhkan warga saat detik pertama panik.</h2>
          <p class="bb-sec__lede">
            Tiga alur utama aplikasi ButuhBantuan — dari menemukan unit, membuat
            laporan, sampai memastikan bantuan tiba.
          </p>
        </div>
        <div class="bb-cards">
          <article v-for="f in primaryFeatures" :key="f.title" class="bb-card">
            <span class="bb-card__icon" :class="`bb-card__icon--${f.tint}`">
              <Icon :icon="f.icon" class="text-[20px]" />
            </span>
            <h3 class="bb-card__title">{{ f.title }}</h3>
            <p class="bb-card__body">{{ f.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Deep-dive showcases -->
    <section v-for="(sc, i) in showcases" :key="sc.title" class="bb-sec bb-sec--tinted" :id="i === 1 ? 'unit' : undefined">
      <div class="bb-sec__inner">
        <div class="bb-showcase" :class="sc.reverse && 'bb-showcase--rev'">
          <div class="bb-showcase__copy">
            <span class="bb-eyebrow" :class="`bb-eyebrow--${sc.eyebrowTint}`">{{ sc.eyebrow }}</span>
            <h2 class="bb-h2 bb-h2--sm">{{ sc.title }}</h2>
            <p class="bb-showcase__body">{{ sc.body }}</p>
            <ul class="bb-showcase__list">
              <li v-for="b in sc.bullets" :key="b">
                <span class="bb-showcase__tick">
                  <Icon icon="lucide:check" class="text-[12px]" />
                </span>
                {{ b }}
              </li>
            </ul>
            <a
              :href="sc.ctaHref"
              class="bb-arrowlink"
              :target="sc.ctaHref.startsWith('http') ? '_blank' : undefined"
            >
              {{ sc.ctaLabel }}
              <Icon icon="lucide:arrow-right" class="text-[14px]" />
            </a>
          </div>

          <!-- Showcase mockup: citizen -->
          <div v-if="i === 0" class="bb-showcase__mock">
            <div class="bb-phone">
              <div class="bb-phone__notch" />
              <div class="bb-phone__screen">
                <div class="bb-hmap bb-hmap--phone">
                  <span class="bb-hmap__road bb-hmap__road--a" />
                  <span class="bb-hmap__road bb-hmap__road--b" />
                  <span class="bb-hmap__unit" style="top:18%;left:26%;background:#D93025;transform:translate(-50%,-100%) scale(.85)">
                    <Icon icon="mynaui:ambulance-solid" class="text-[12px]" />
                  </span>
                  <span class="bb-hmap__unit" style="top:26%;left:60%;background:#8B5CF6;transform:translate(-50%,-100%) scale(.85)">
                    <Icon icon="mdi:hospital-building" class="text-[11px]" />
                  </span>
                  <span class="bb-hmap__user" style="top:52%;left:44%;transform:translate(-50%,-50%) scale(.9)">
                    <span class="bb-hmap__ping" />
                  </span>
                </div>
                <div class="bb-hmap__sheet bb-hmap__sheet--phone">
                  <div class="bb-hmap__sheet-handle" />
                  <div class="bb-hmap__sheet-head">
                    <span class="bb-hmap__sheet-logo">
                      <Icon icon="mynaui:ambulance-solid" class="text-[14px]" />
                    </span>
                    <div class="bb-hmap__sheet-title-wrap">
                      <p class="bb-hmap__sheet-title">PSC 119 Sleman</p>
                      <p class="bb-hmap__sheet-sub">Dinkes Kab. Sleman</p>
                      <div class="bb-hmap__sheet-meta">
                        <span style="color:#1a73e8">Dispatcher Kab</span>
                        <span class="bb-hmap__sheet-sep">·</span>
                        <span style="color:#10B981">2 min</span>
                      </div>
                    </div>
                  </div>
                  <div class="bb-hmap__sheet-pills">
                    <span class="bb-hmap__sheet-pill bb-hmap__sheet-pill--primary">
                      <Icon icon="lucide:siren" class="text-[11px]" /> Buat laporan
                    </span>
                    <span class="bb-hmap__sheet-pill">
                      <Icon icon="lucide:phone" class="text-[11px]" /> Telepon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Showcase mockup: unit dashboard -->
          <div v-else class="bb-showcase__mock">
            <div class="bb-mock__chrome bb-mock__chrome--free">
              <span class="bb-mock__dot bb-mock__dot--r" />
              <span class="bb-mock__dot bb-mock__dot--y" />
              <span class="bb-mock__dot bb-mock__dot--g" />
              <span class="bb-mock__url">
                <Icon icon="lucide:lock" class="text-[10px]" /> dashboard.butuhbantuan.space
              </span>
            </div>
            <div class="bb-dash">
              <aside class="bb-dash__side">
                <div class="bb-dash__brand">
                  <span class="bb-dash__brand-mark">
                    <Icon icon="mynaui:ambulance-solid" class="text-[11px]" />
                  </span>
                  butuhbantuan
                </div>
                <p class="bb-dash__side-h">Ops</p>
                <div class="bb-dash__row bb-dash__row--active">
                  <Icon icon="lucide:list-todo" class="text-[11px]" /> Pesanan
                  <span class="bb-dash__bd">12</span>
                </div>
                <div class="bb-dash__row"><Icon icon="lucide:map" class="text-[11px]" /> Ops map</div>
                <div class="bb-dash__row">
                  <Icon icon="lucide:siren" class="text-[11px]" /> SOS
                  <span class="bb-dash__bd bb-dash__bd--red">2</span>
                </div>
                <p class="bb-dash__side-h">Data</p>
                <div class="bb-dash__row"><Icon icon="lucide:hospital" class="text-[11px]" /> Referensi RS</div>
                <div class="bb-dash__row"><Icon icon="lucide:bar-chart-2" class="text-[11px]" /> Statistik</div>
                <div class="bb-dash__row"><Icon icon="lucide:message-square" class="text-[11px]" /> Feedback</div>
              </aside>
              <div class="bb-dash__main">
                <div class="bb-dash__subhead">
                  <div>
                    <p class="bb-dash__title">Pesanan Masuk</p>
                    <p class="bb-dash__desc">Antrian order darurat unit kamu · Auto-refresh</p>
                  </div>
                  <div class="bb-dash__actions">
                    <span class="bb-dash__btn bb-dash__btn--primary">
                      <Icon icon="lucide:ticket-plus" class="text-[10px]" /> Buat tiket
                    </span>
                    <span class="bb-dash__btn"><Icon icon="lucide:download" class="text-[10px]" /></span>
                    <span class="bb-dash__btn"><Icon icon="lucide:refresh-cw" class="text-[10px]" /></span>
                  </div>
                </div>
                <div class="bb-dash__kpis">
                  <div class="bb-dash__kpi"><p class="bb-dash__kpi-l">Pending</p><p class="bb-dash__kpi-v">12</p></div>
                  <div class="bb-dash__kpi"><p class="bb-dash__kpi-l">Dispatched</p><p class="bb-dash__kpi-v">8</p></div>
                  <div class="bb-dash__kpi"><p class="bb-dash__kpi-l">Selesai</p><p class="bb-dash__kpi-v">34</p></div>
                  <div class="bb-dash__kpi"><p class="bb-dash__kpi-l">Avg SLA</p><p class="bb-dash__kpi-v" style="color:#059669">4m</p></div>
                </div>
                <div class="bb-dash__rows">
                  <div class="bb-dash__order">
                    <span class="bb-dash__order-tone bb-dash__order-tone--red" />
                    <div class="bb-dash__order-body">
                      <p class="bb-dash__order-title">
                        <span class="bb-dash__order-pill bb-dash__order-pill--red">Merah</span>
                        Asma anak · Sleman
                      </p>
                      <p class="bb-dash__order-sub">2 min ago · TKT-2591 · Ade M.</p>
                    </div>
                    <span class="bb-dash__order-cta">Accept</span>
                  </div>
                  <div class="bb-dash__order">
                    <span class="bb-dash__order-tone bb-dash__order-tone--amber" />
                    <div class="bb-dash__order-body">
                      <p class="bb-dash__order-title">
                        <span class="bb-dash__order-pill bb-dash__order-pill--amber">Kuning</span>
                        Kecelakaan · Yogyakarta
                      </p>
                      <p class="bb-dash__order-sub">5 min ago · En-route · 3 min ETA</p>
                    </div>
                    <span class="bb-dash__order-cta bb-dash__order-cta--ghost">Track</span>
                  </div>
                  <div class="bb-dash__order">
                    <span class="bb-dash__order-tone bb-dash__order-tone--green" />
                    <div class="bb-dash__order-body">
                      <p class="bb-dash__order-title">
                        <span class="bb-dash__order-pill bb-dash__order-pill--green">Hijau</span>
                        Transport rutin · Bantul
                      </p>
                      <p class="bb-dash__order-sub">12 min ago · Completed · TKT-2588</p>
                    </div>
                    <span class="bb-dash__order-cta bb-dash__order-cta--ghost">Detail</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Wall of feedback -->
    <section id="feedback" class="bb-sec">
      <div class="bb-sec__inner">
        <div class="bb-sec__head">
          <p class="bb-eyebrow">Suara komunitas</p>
          <h2 class="bb-h2">Warga, unit resmi, relawan — semua bergerak di satu platform.</h2>
          <p class="bb-sec__lede">
            Cerita dari lapangan sejak platform ini mulai dipakai di berbagai wilayah.
          </p>
        </div>
        <div class="bb-wall">
          <article v-for="f in feedbackCards" :key="f.name" class="bb-feedback">
            <div class="bb-feedback__head">
              <span class="bb-feedback__avatar" :class="`bb-feedback__avatar--${f.tint}`">{{ f.initials }}</span>
              <div>
                <p class="bb-feedback__name">{{ f.name }}</p>
                <p class="bb-feedback__role">{{ f.role }}</p>
              </div>
            </div>
            <p class="bb-feedback__quote">"{{ f.quote }}"</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Coverage -->
    <section id="coverage" class="bb-sec bb-sec--tinted">
      <div class="bb-sec__inner">
        <div class="bb-sec__head">
          <p class="bb-eyebrow">Jangkauan</p>
          <h2 class="bb-h2">Hadir di seluruh Jawa. Meluas ke kota besar Indonesia.</h2>
          <p class="bb-sec__lede">
            119+ kabupaten/kota di Jawa terhubung penuh. 15+ kota besar di
            Sumatra, Kalimantan, Sulawesi, dan Papua dalam pilot.
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

    <!-- FAQ accordion -->
    <section id="faq" class="bb-sec">
      <div class="bb-sec__inner bb-sec__inner--narrow">
        <div class="bb-sec__head">
          <p class="bb-eyebrow">FAQ</p>
          <h2 class="bb-h2">Pertanyaan yang sering muncul.</h2>
        </div>
        <div class="bb-faq">
          <div
            v-for="(f, i) in faqs"
            :key="f.q"
            class="bb-faq__item"
            :class="openFaq === i && 'bb-faq__item--open'"
          >
            <button type="button" class="bb-faq__q" @click="toggleFaq(i)" :aria-expanded="openFaq === i">
              <span>{{ f.q }}</span>
              <Icon
                icon="lucide:plus"
                class="text-[18px] bb-faq__chev"
                :class="openFaq === i && 'bb-faq__chev--open'"
              />
            </button>
            <div v-if="openFaq === i" class="bb-faq__a">{{ f.a }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA band -->
    <section class="bb-sec bb-sec--cta">
      <div class="bb-sec__inner bb-sec__inner--narrow">
        <div class="bb-final">
          <h2 class="bb-final__title">
            Bantu kami bangun jaringan darurat<br />
            sipil Indonesia bersama.
          </h2>
          <p class="bb-final__body">
            Kalau kamu warga, install aplikasi. Kalau kamu unit emergency, ajukan onboarding.
            Kalau kamu sponsor atau mitra pemerintah, hubungi kami.
          </p>
          <div class="bb-final__ctas">
            <NuxtLink to="/" class="bb-btn bb-btn--black bb-btn--lg">
              Buka app <Icon icon="lucide:arrow-up-right" class="text-[15px]" />
            </NuxtLink>
            <a href="mailto:hello@butuhbantuan.space" class="bb-btn bb-btn--white bb-btn--lg">
              Hubungi tim <Icon icon="lucide:arrow-up-right" class="text-[15px]" />
            </a>
          </div>
          <p class="bb-final__note">Setiap install baru = satu tetangga lebih siap saat darurat</p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bb-footer">
      <div class="bb-footer__inner">
        <div class="bb-footer__brand">
          <NuxtLink to="/" class="bb-brand" style="color:#fff">
            <span class="bb-brand__mark bb-brand__mark--light">
              <Icon icon="mynaui:ambulance-solid" class="text-[18px]" />
            </span>
            <span class="bb-brand__word">butuhbantuan</span>
          </NuxtLink>
          <p class="bb-footer__tag">
            Platform darurat sipil Indonesia.<br />
            Open, gratis, dibangun bersama komunitas.
          </p>
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
              <li><a href="#feedback">Testimoni</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p class="bb-footer__h">Kontak</p>
            <ul>
              <li><a href="mailto:hello@butuhbantuan.space">hello@butuhbantuan.space</a></li>
              <li><a href="mailto:hello@butuhbantuan.space?subject=Sponsor">Kolaborasi &amp; sponsor</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="bb-footer__legal">
        © {{ new Date().getFullYear() }} ButuhBantuan · Dibangun untuk komunitas Indonesia
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ────────────────────────────────────────────────────────────────────────
 * Tokens
 * ──────────────────────────────────────────────────────────────────────── */
.bb-landing {
  --ink: #0A0A0A;
  --ink-2: #1F2937;
  --ink-3: #4B5563;
  --ink-4: #6B7280;
  --ink-5: #9CA3AF;
  --line: #E5E7EB;
  --line-2: #D1D5DB;
  --bg: #FFFFFF;
  --bg-tint: #FAFAFA;
  --bg-chip: #F3F4F6;
  --accent: #D93025;
  --accent-hover: #A52A1E;
  --accent-soft: rgba(217, 48, 37, 0.08);

  background: var(--bg);
  color: var(--ink);
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
  font-size: 15px;
  letter-spacing: -0.005em;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}
.bb-landing :where(h1, h2, h3, h4, p, ul) { margin: 0; }
.bb-landing ul { list-style: none; padding: 0; }
.bb-landing a { color: inherit; text-decoration: none; }

/* ── Nav ─────────────────────────────────────────────────────────────── */

.bb-nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--line);
}
.bb-nav__inner {
  max-width: 1200px; margin: 0 auto;
  padding: 14px 24px;
  display: flex; align-items: center; gap: 20px;
}
.bb-brand {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 700;
  color: var(--ink); letter-spacing: -0.025em;
}
.bb-brand__mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 8px;
  background: var(--ink); color: #fff;
}
.bb-brand__mark--light { background: #fff; color: var(--ink); }
.bb-nav__links { display: none; gap: 24px; margin-left: 20px; }
.bb-nav__links a {
  font-size: 14px; font-weight: 500; color: var(--ink-3);
  transition: color 0.15s;
}
.bb-nav__links a:hover { color: var(--ink); }
.bb-nav__actions { margin-left: auto; display: flex; gap: 8px; }
@media (min-width: 900px) { .bb-nav__links { display: flex; } }

/* ── Buttons ─────────────────────────────────────────────────────────── */

.bb-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  font-size: 13.5px; font-weight: 600;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: background 0.14s, border-color 0.14s, transform 0.12s;
  letter-spacing: -0.005em; white-space: nowrap;
}
.bb-btn:active { transform: scale(0.98); }
.bb-btn--lg { padding: 12px 20px; font-size: 15px; border-radius: 10px; }
.bb-btn--black { background: var(--ink); color: #fff; }
.bb-btn--black:hover { background: var(--ink-2); }
.bb-btn--white { background: #fff; color: var(--ink); border-color: var(--line-2); }
.bb-btn--white:hover { background: var(--bg-tint); }

/* ── Hero ────────────────────────────────────────────────────────────── */

.bb-hero {
  padding: 56px 24px 64px;
  text-align: center;
  max-width: 1200px; margin: 0 auto;
}
@media (min-width: 900px) { .bb-hero { padding: 96px 24px 80px; } }

.bb-rating {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 500; color: var(--ink-3);
  padding: 5px 12px 5px 5px;
  border: 1px solid var(--line);
  border-radius: 9999px;
  background: #fff;
  margin-bottom: 24px;
}
.bb-rating__badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 9999px;
  background: linear-gradient(135deg, #EF4444, #EC4899);
  color: #fff;
}

.bb-h1 {
  font-size: clamp(40px, 6.5vw, 72px);
  line-height: 1.02; font-weight: 800;
  letter-spacing: -0.035em; color: var(--ink);
  max-width: 20ch; margin: 0 auto;
}
.bb-h1__accent { color: var(--accent); }

.bb-hero__lede {
  margin-top: 24px; max-width: 620px; margin-left: auto; margin-right: auto;
  font-size: 16px; line-height: 1.55;
  color: var(--ink-3); font-weight: 500;
}

.bb-hero__ctas {
  margin-top: 32px;
  display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
}
.bb-hero__note {
  margin-top: 14px;
  font-family: "Caveat", cursive;
  font-size: 18px; font-weight: 500; color: var(--ink-4);
}

/* Hero mockup */
.bb-hero__mock {
  margin: 64px auto 0;
  max-width: 900px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 40px 80px -32px rgba(10, 10, 10, 0.25);
}
.bb-mock__chrome {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 16px;
  background: var(--bg-tint);
  border-bottom: 1px solid var(--line);
}
.bb-mock__chrome--free { background: var(--bg-tint); border-bottom: 1px solid var(--line); }
.bb-mock__dot { width: 10px; height: 10px; border-radius: 9999px; }
.bb-mock__dot--r { background: #FF605C; }
.bb-mock__dot--y { background: #FFBD44; }
.bb-mock__dot--g { background: #00CA4E; }
.bb-mock__url {
  margin: 0 auto;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--ink-4); font-weight: 500;
  padding: 4px 14px; background: #fff; border-radius: 6px;
  border: 1px solid var(--line);
}
.bb-mock__body { position: relative; aspect-ratio: 5 / 3.2; }

/* Map mockup (hero) */
.bb-hmap {
  position: absolute; inset: 0;
  background:
    radial-gradient(1.2px 1.2px at 20% 20%, #A7D3B4, transparent 60%),
    radial-gradient(1.2px 1.2px at 75% 35%, #A7D3B4, transparent 60%),
    radial-gradient(1.2px 1.2px at 55% 65%, #A7D3B4, transparent 60%),
    linear-gradient(180deg, #E1EEE6 0%, #E9EEDC 100%);
  overflow: hidden;
}
.bb-hmap--phone { inset: 0; height: 62%; position: absolute; }
.bb-hmap__road { position: absolute; background: #F5D0A9; }
.bb-hmap__road--a { top: 35%; left: -5%; width: 110%; height: 4px; transform: rotate(6deg); }
.bb-hmap__road--b { top: 65%; left: -5%; width: 110%; height: 3px; transform: rotate(-4deg); background: #ECD5B2; }
.bb-hmap__road--c { top: -10%; left: 45%; width: 3px; height: 130%; background: #ECD5B2; transform: rotate(15deg); }
.bb-hmap__unit {
  position: absolute; width: 26px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; transform: translate(-50%, -100%);
  clip-path: polygon(50% 100%, 0 50%, 0 0, 100% 0, 100% 50%);
  border-radius: 50% 50% 8% 8% / 40% 40% 12% 12%;
  box-shadow: 0 3px 8px rgba(10, 10, 10, 0.3);
}
.bb-hmap__user {
  position: absolute; top: 62%; left: 42%;
  width: 12px; height: 12px; border-radius: 9999px;
  background: #2563EB; border: 3px solid #fff;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.bb-hmap__ping {
  position: absolute; inset: -3px;
  border-radius: 9999px;
  border: 3px solid #2563EB;
  animation: bb-ping 1.8s ease-out infinite;
}
@keyframes bb-ping {
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(3); opacity: 0; }
}
.bb-hmap__dock {
  position: absolute; right: 12px; top: 12px;
  display: flex; flex-direction: column; gap: 6px;
}
.bb-hmap__fab {
  width: 34px; height: 34px; border-radius: 9999px;
  background: #fff; border: 1px solid var(--line);
  color: var(--ink-3);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 8px rgba(10, 10, 10, 0.06);
}

/* Detail sheet inside mockup */
.bb-hmap__sheet {
  position: absolute; left: 0; right: 0; bottom: 0;
  background: #fff;
  padding: 8px 16px 14px;
  border-radius: 18px 18px 0 0;
  box-shadow: 0 -10px 20px rgba(10, 10, 10, 0.06);
}
.bb-hmap__sheet--phone { padding: 6px 12px 10px; border-radius: 14px 14px 0 0; }
.bb-hmap__sheet-handle { width: 34px; height: 4px; border-radius: 9999px; background: var(--line-2); margin: 0 auto 10px; }
.bb-hmap__sheet-head { display: flex; align-items: flex-start; gap: 10px; }
.bb-hmap__sheet-logo {
  width: 40px; height: 40px; border-radius: 12px;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bb-hmap__sheet-title-wrap { flex: 1; min-width: 0; }
.bb-hmap__sheet-title { font-size: 14px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; }
.bb-hmap__sheet-sub { font-size: 11.5px; color: var(--ink-4); font-weight: 500; margin-top: 2px; }
.bb-hmap__sheet-meta {
  margin-top: 4px;
  font-size: 11px; font-weight: 600;
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
}
.bb-hmap__sheet-sep { color: var(--ink-5); }
.bb-hmap__sheet-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 9999px;
  background: var(--bg-chip); color: var(--ink-4);
  flex-shrink: 0;
}
.bb-hmap__sheet-pills {
  margin-top: 10px; display: flex; gap: 6px; overflow: hidden;
}
.bb-hmap__sheet-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 10px; border-radius: 9999px;
  font-size: 11px; font-weight: 600;
  border: 1px solid var(--line); background: #fff;
  white-space: nowrap;
}
.bb-hmap__sheet-pill--primary { background: var(--accent); color: #fff; border-color: transparent; }

/* ── Metrics + ticker ────────────────────────────────────────────────── */

.bb-metrics {
  margin: 48px auto 0;
  max-width: 900px;
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;
  padding: 20px 24px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  text-align: left;
}
@media (min-width: 800px) {
  .bb-metrics { grid-template-columns: repeat(4, 1fr); gap: 0; }
  .bb-metric + .bb-metric { border-left: 1px solid var(--line); padding-left: 24px; }
}
.bb-metric__v {
  font-size: 30px; font-weight: 800; letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums; line-height: 1;
}
.bb-metric__v span { font-size: 16px; color: var(--ink-4); font-weight: 500; margin-left: 3px; }
.bb-metric__l { margin-top: 6px; font-size: 12.5px; color: var(--ink-4); font-weight: 500; }

.bb-ticker {
  margin: 24px auto 0;
  max-width: 900px;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 10px 16px;
  border: 1px solid var(--line); border-radius: 9999px;
  background: #fff;
  font-size: 13px;
}
.bb-ticker__dot {
  position: relative;
  width: 8px; height: 8px; border-radius: 9999px; background: #10B981;
  flex-shrink: 0;
}
.bb-ticker__ping {
  position: absolute; inset: 0;
  border-radius: 9999px; background: #10B981;
  animation: bb-ping 1.8s ease-out infinite;
}
.bb-ticker__label {
  text-transform: uppercase; letter-spacing: 0.06em;
  font-size: 10.5px; font-weight: 700; color: #10B981;
}
.bb-ticker__text {
  font-size: 13px; font-weight: 500; color: var(--ink-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.bb-tk-enter-active, .bb-tk-leave-active {
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.22s;
}
.bb-tk-enter-from { transform: translateY(6px); opacity: 0; }
.bb-tk-leave-to { transform: translateY(-6px); opacity: 0; }

/* ── Sections ────────────────────────────────────────────────────────── */

.bb-sec { padding: 72px 24px; }
.bb-sec--tinted { background: var(--bg-tint); border-block: 1px solid var(--line); }
.bb-sec--cta { padding: 80px 24px; }
.bb-sec__inner { max-width: 1200px; margin: 0 auto; }
.bb-sec__inner--narrow { max-width: 800px; }
@media (min-width: 900px) { .bb-sec { padding: 112px 24px; } }

.bb-sec__head { max-width: 720px; margin: 0 auto 48px; text-align: center; }
.bb-eyebrow {
  display: inline-block;
  font-size: 12.5px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--accent);
}
.bb-eyebrow--red { color: var(--accent); }
.bb-eyebrow--purple {
  background: linear-gradient(90deg, #8B5CF6, #6366F1);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.bb-eyebrow--teal {
  background: linear-gradient(90deg, #06B6D4, #10B981);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.bb-eyebrow--orange {
  background: linear-gradient(90deg, #F97316, #EF4444);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}

.bb-h2 {
  margin-top: 14px;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.08; font-weight: 800;
  letter-spacing: -0.03em; color: var(--ink);
}
.bb-h2--sm { font-size: clamp(24px, 3.4vw, 36px); }
.bb-sec__lede {
  margin-top: 16px;
  font-size: 15.5px; line-height: 1.55;
  color: var(--ink-3); font-weight: 500;
}

/* ── Feature cards ───────────────────────────────────────────────────── */

.bb-cards {
  display: grid; gap: 16px;
  grid-template-columns: 1fr;
}
@media (min-width: 700px) { .bb-cards { grid-template-columns: repeat(3, 1fr); } }
.bb-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 28px 26px;
  transition: transform 0.16s, box-shadow 0.16s, border-color 0.16s;
}
.bb-card:hover {
  border-color: var(--line-2);
  box-shadow: 0 12px 30px -12px rgba(10, 10, 10, 0.08);
  transform: translateY(-2px);
}
.bb-card__icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 12px;
  margin-bottom: 18px; color: #fff;
}
.bb-card__icon--red { background: linear-gradient(135deg, #EF4444, #D93025); }
.bb-card__icon--purple { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.bb-card__icon--teal { background: linear-gradient(135deg, #06B6D4, #10B981); }
.bb-card__title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
.bb-card__body {
  margin-top: 8px;
  font-size: 14.5px; line-height: 1.55;
  color: var(--ink-3); font-weight: 500;
}

/* ── Showcases (deep-dive alt) ───────────────────────────────────────── */

.bb-showcase {
  display: grid; gap: 40px; grid-template-columns: 1fr;
  align-items: center;
}
@media (min-width: 900px) {
  .bb-showcase { grid-template-columns: 1fr 1.1fr; gap: 72px; }
  .bb-showcase--rev .bb-showcase__copy { order: 2; }
  .bb-showcase--rev .bb-showcase__mock { order: 1; }
}
.bb-showcase__body { margin-top: 20px; font-size: 16px; line-height: 1.6; color: var(--ink-3); max-width: 500px; }
.bb-showcase__list {
  margin-top: 20px; max-width: 500px;
  display: flex; flex-direction: column; gap: 10px;
}
.bb-showcase__list li {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 14.5px; font-weight: 500; color: var(--ink-2);
  line-height: 1.5;
}
.bb-showcase__tick {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 9999px;
  background: rgba(16, 185, 129, 0.12); color: #10B981;
  flex-shrink: 0; margin-top: 1px;
}
.bb-arrowlink {
  margin-top: 28px;
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 14.5px; font-weight: 600; color: var(--ink);
  padding-bottom: 2px; border-bottom: 1px solid var(--ink);
  transition: gap 0.14s;
}
.bb-arrowlink:hover { gap: 8px; }

.bb-showcase__mock {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 20px 40px -20px rgba(10, 10, 10, 0.15);
}
.bb-showcase__mock .bb-phone {
  border: none; background: transparent; box-shadow: none;
  width: 100%; padding: 30px;
  display: flex; justify-content: center;
}

/* Phone frame */
.bb-phone {
  width: 280px; aspect-ratio: 280 / 580;
  background: linear-gradient(135deg, #1a1a20, #0A0A0A);
  border-radius: 36px; padding: 8px;
  border: 1px solid #2A2A32; position: relative;
  box-shadow: 0 30px 60px -25px rgba(10, 10, 10, 0.5);
}
.bb-phone__notch {
  position: absolute; top: 20px; left: 50%;
  transform: translateX(-50%);
  width: 76px; height: 22px;
  border-radius: 9999px; background: #0A0A0A; z-index: 2;
}
.bb-phone__screen {
  position: relative; width: 100%; height: 100%;
  border-radius: 28px; overflow: hidden;
  background: #F7F7F8;
}

/* Dashboard mockup embedded */
.bb-dash {
  display: grid; grid-template-columns: 130px 1fr;
  background: var(--bg-tint);
  min-height: 340px;
}
@media (min-width: 900px) { .bb-dash { min-height: 420px; } }
.bb-dash__side {
  background: #fff; border-right: 1px solid var(--line);
  padding: 14px 10px;
  display: flex; flex-direction: column; gap: 4px;
}
.bb-dash__brand {
  display: flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 700; letter-spacing: -0.02em;
  padding: 4px 6px; margin-bottom: 8px;
}
.bb-dash__brand-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--ink); color: #fff;
}
.bb-dash__side-h {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-4);
  padding: 8px 6px 4px;
}
.bb-dash__row {
  display: flex; align-items: center; gap: 6px;
  padding: 6px; border-radius: 6px;
  font-size: 11px; font-weight: 500; color: var(--ink-3);
}
.bb-dash__row--active { background: var(--bg-chip); color: var(--ink); font-weight: 600; }
.bb-dash__bd {
  margin-left: auto;
  min-width: 16px; height: 15px;
  padding: 0 4px; border-radius: 9999px;
  background: var(--ink); color: #fff;
  font-size: 9px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.bb-dash__bd--red { background: var(--accent); }

.bb-dash__main {
  padding: 14px; overflow: hidden;
  display: flex; flex-direction: column; gap: 10px;
}
.bb-dash__subhead {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
}
.bb-dash__title { font-size: 15px; font-weight: 800; letter-spacing: -0.02em; }
.bb-dash__desc { margin-top: 2px; font-size: 10.5px; color: var(--ink-4); }
.bb-dash__actions { display: flex; gap: 4px; }
.bb-dash__btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 8px; border-radius: 6px;
  background: #fff; border: 1px solid var(--line);
  font-size: 10px; font-weight: 600;
}
.bb-dash__btn--primary { background: var(--ink); color: #fff; border-color: transparent; }

.bb-dash__kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.bb-dash__kpi {
  padding: 8px 10px; border-radius: 8px;
  background: #fff; border: 1px solid var(--line);
}
.bb-dash__kpi-l { font-size: 9.5px; color: var(--ink-4); font-weight: 500; }
.bb-dash__kpi-v { margin-top: 2px; font-size: 18px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }

.bb-dash__rows { display: flex; flex-direction: column; gap: 6px; }
.bb-dash__order {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px 8px 14px;
  background: #fff; border: 1px solid var(--line); border-radius: 8px;
}
.bb-dash__order-tone {
  position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px;
  border-radius: 0 3px 3px 0;
}
.bb-dash__order-tone--red { background: var(--accent); }
.bb-dash__order-tone--amber { background: #F59E0B; }
.bb-dash__order-tone--green { background: #10B981; }
.bb-dash__order-body { min-width: 0; flex: 1; }
.bb-dash__order-title {
  font-size: 11.5px; font-weight: 700; letter-spacing: -0.01em;
  display: inline-flex; align-items: center; gap: 6px;
}
.bb-dash__order-sub { font-size: 9.5px; color: var(--ink-4); font-weight: 500; margin-top: 2px; }
.bb-dash__order-pill {
  padding: 2px 6px; border-radius: 4px;
  font-size: 9px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.03em;
}
.bb-dash__order-pill--red { background: rgba(217, 48, 37, 0.12); color: var(--accent); }
.bb-dash__order-pill--amber { background: rgba(245, 158, 11, 0.15); color: #B45309; }
.bb-dash__order-pill--green { background: rgba(16, 185, 129, 0.15); color: #047857; }
.bb-dash__order-cta {
  padding: 4px 10px; border-radius: 6px;
  background: var(--ink); color: #fff;
  font-size: 10px; font-weight: 600;
}
.bb-dash__order-cta--ghost { background: transparent; color: var(--ink-2); border: 1px solid var(--line); }

/* ── Wall of feedback ───────────────────────────────────────────────── */

.bb-wall {
  display: grid; gap: 16px;
  grid-template-columns: 1fr;
}
@media (min-width: 700px) { .bb-wall { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .bb-wall { grid-template-columns: repeat(3, 1fr); } }
.bb-feedback {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 22px 22px 20px;
  transition: border-color 0.14s, transform 0.14s;
}
.bb-feedback:hover { border-color: var(--line-2); transform: translateY(-2px); }
.bb-feedback__head {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 14px;
}
.bb-feedback__avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 9999px;
  color: #fff;
  font-size: 13.5px; font-weight: 700; letter-spacing: 0.02em;
}
.bb-feedback__avatar--red { background: linear-gradient(135deg, #EF4444, #D93025); }
.bb-feedback__avatar--purple { background: linear-gradient(135deg, #8B5CF6, #6366F1); }
.bb-feedback__avatar--teal { background: linear-gradient(135deg, #06B6D4, #10B981); }
.bb-feedback__avatar--orange { background: linear-gradient(135deg, #F97316, #EF4444); }
.bb-feedback__avatar--pink { background: linear-gradient(135deg, #EC4899, #F472B6); }
.bb-feedback__avatar--blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
.bb-feedback__name { font-size: 14px; font-weight: 700; letter-spacing: -0.015em; }
.bb-feedback__role { font-size: 12px; color: var(--ink-4); font-weight: 500; margin-top: 1px; }
.bb-feedback__quote {
  font-size: 14.5px; line-height: 1.55;
  color: var(--ink-2);
}

/* ── Coverage map ────────────────────────────────────────────────────── */

.bb-map {
  margin-top: 40px;
  background: #fff; border: 1px solid var(--line);
  border-radius: 16px; overflow: hidden;
}
.bb-map__canvas { height: 300px; background: var(--bg-tint); }
@media (min-width: 800px) { .bb-map__canvas { height: 420px; } }
.bb-map__legend {
  display: flex; gap: 24px; flex-wrap: wrap;
  padding: 14px 18px; border-top: 1px solid var(--line);
  font-size: 13px; color: var(--ink-3);
  justify-content: center;
}
.bb-map__legend span { display: inline-flex; align-items: center; gap: 8px; }
.bb-map__dot { width: 10px; height: 10px; border-radius: 9999px; border: 2px solid; }
.bb-map__dot--full { background: var(--accent); border-color: var(--accent); }
.bb-map__dot--pilot { background: #fff; border-color: var(--ink); }

.bb-islands {
  margin-top: 24px;
  display: grid; gap: 14px; grid-template-columns: 1fr;
  text-align: left;
}
@media (min-width: 700px) { .bb-islands { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .bb-islands { grid-template-columns: repeat(3, 1fr); } }
.bb-island {
  background: #fff; border: 1px solid var(--line);
  border-radius: 14px; padding: 22px;
}
.bb-island__head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.bb-island__head h3 { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; }
.bb-badge {
  font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 9999px;
}
.bb-badge--full { background: var(--accent-soft); color: var(--accent); }
.bb-badge--pilot { background: var(--bg-chip); color: var(--ink-2); }
.bb-island__body { font-size: 13.5px; color: var(--ink-3); line-height: 1.55; }
.bb-island__cities { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
.bb-island__cities li {
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 9999px;
  background: var(--bg-chip); color: var(--ink-2);
}

/* ── FAQ accordion ───────────────────────────────────────────────────── */

.bb-faq {
  margin-top: 8px;
  border-top: 1px solid var(--line);
}
.bb-faq__item {
  border-bottom: 1px solid var(--line);
}
.bb-faq__q {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 20px 4px;
  background: transparent; border: none; cursor: pointer;
  font-family: inherit; font-size: 16px; font-weight: 600;
  letter-spacing: -0.015em; color: var(--ink);
  text-align: left;
  transition: color 0.15s;
}
.bb-faq__q:hover { color: var(--accent); }
.bb-faq__chev {
  color: var(--ink-4);
  transition: transform 0.2s ease, color 0.15s;
  flex-shrink: 0;
}
.bb-faq__chev--open { transform: rotate(45deg); color: var(--accent); }
.bb-faq__a {
  padding: 0 4px 20px;
  font-size: 14.5px; line-height: 1.6;
  color: var(--ink-3);
  max-width: 640px;
}

/* ── Final CTA ────────────────────────────────────────────────────────── */

.bb-final {
  text-align: center;
  padding: 48px 32px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: linear-gradient(180deg, #FFFFFF 0%, var(--bg-tint) 100%);
}
@media (min-width: 800px) { .bb-final { padding: 64px 48px; } }
.bb-final__title {
  font-size: clamp(26px, 3.6vw, 40px);
  line-height: 1.1; font-weight: 800;
  letter-spacing: -0.03em;
}
.bb-final__body {
  margin: 16px auto 0; max-width: 540px;
  font-size: 15.5px; line-height: 1.55;
  color: var(--ink-3);
}
.bb-final__ctas {
  margin-top: 28px;
  display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
}
.bb-final__note {
  margin-top: 16px;
  font-family: "Caveat", cursive;
  font-size: 18px; color: var(--ink-4);
}

/* ── Footer ──────────────────────────────────────────────────────────── */

.bb-footer {
  background: var(--ink);
  color: rgba(255, 255, 255, 0.6);
  padding: 56px 24px 24px;
}
.bb-footer__inner {
  max-width: 1200px; margin: 0 auto;
  display: grid; gap: 40px; grid-template-columns: 1fr;
}
@media (min-width: 900px) { .bb-footer__inner { grid-template-columns: 1.2fr 2fr; } }
.bb-footer__tag {
  margin-top: 14px; max-width: 320px;
  font-size: 13.5px; line-height: 1.55;
  color: rgba(255, 255, 255, 0.5);
}
.bb-footer__cols {
  display: grid; gap: 24px;
  grid-template-columns: repeat(2, 1fr);
}
@media (min-width: 800px) { .bb-footer__cols { grid-template-columns: repeat(4, 1fr); } }
.bb-footer__h {
  font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: #fff;
}
.bb-footer__cols ul {
  margin-top: 14px; display: flex; flex-direction: column; gap: 10px;
}
.bb-footer__cols a {
  font-size: 13.5px; color: rgba(255, 255, 255, 0.65);
  transition: color 0.12s;
}
.bb-footer__cols a:hover { color: #fff; }
.bb-footer__legal {
  max-width: 1200px; margin: 44px auto 0;
  padding-top: 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12.5px; color: rgba(255, 255, 255, 0.4);
}
</style>
