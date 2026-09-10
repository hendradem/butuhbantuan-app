<script setup lang="ts">
/**
 * /landing — public marketing page, sendr.ai visual language.
 *
 * Design cues carried over:
 *   • Inter black (900) for hero + section headings, tight leading.
 *   • Caveat cursive for microcopy ("Gratis untuk warga" etc).
 *   • Alternating full-bleed feature blocks with detailed pure-CSS
 *     mockups of real ButuhBantuan screens on one side.
 *   • Gradient eyebrows (purple→pink / blue→teal / orange→red) as the
 *     only splash of colour on a mostly monochrome canvas.
 *   • Chunky black CTAs with ↗ (arrow-up-right) icon.
 *   • Small logo strip under the hero divided by hairlines.
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
  link: [
    // Caveat (handwritten microcopy) alongside the site's existing Inter link.
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&display=swap",
    },
  ],
});

// ── Live activity ticker ────────────────────────────────────────────────────

const activityFeed = [
  { time: "just now", label: "Ambulance PMI Bantul terima laporan asma anak", tone: "danger" },
  { time: "1m",       label: "PSC 119 Sleman — dispatch RS Sardjito",         tone: "danger" },
  { time: "2m",       label: "Damkar Kota Yogya siaga di zona hijau",         tone: "warn" },
  { time: "3m",       label: "Relawan Sleman bantuan komunitas aktif",        tone: "ok" },
  { time: "5m",       label: "PSC 119 Kulon Progo — arrival Wates",           tone: "danger" },
  { time: "6m",       label: "RSUP Sardjito — kapasitas IGD 78%",             tone: "warn" },
];
const activityIndex = ref(0);
let tickerTimer: ReturnType<typeof setInterval> | null = null;

// Live KPI counters (mock — wire to real API endpoints later)
const kpiTickets = ref(0);
const kpiUnits = ref(0);
const kpiAvgMin = ref(0);
function easeTo(target: number, r: { value: number }, ms = 900) {
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
    L.marker([c.lat, c.lng], { icon: pin(L, "#EC4899", true) })
      .addTo(map).bindTooltip(c.name, { direction: "top", offset: [0, -6] });
  }
  for (const i of islands.filter((x) => !x.full)) {
    for (const c of i.cities) {
      L.marker([c.lat, c.lng], { icon: pin(L, "#0A0A0A", false) })
        .addTo(map).bindTooltip(c.name, { direction: "top", offset: [0, -6] });
    }
  }
  L.rectangle([[-8.85, 105.1], [-5.9, 114.7]], {
    color: "#EC4899", weight: 0, fillOpacity: 0.06,
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
          <span class="bb-brand__word">butuhbantuan<sup>™</sup></span>
        </NuxtLink>
        <nav class="bb-nav__links">
          <a href="#warga">Untuk warga</a>
          <a href="#unit">Untuk unit</a>
          <a href="#coverage">Jangkauan</a>
          <a href="#dukung">Dukung</a>
        </nav>
        <div class="bb-nav__actions">
          <NuxtLink to="/" class="bb-btn bb-btn--white">Buka app</NuxtLink>
          <a href="https://dashboard.butuhbantuan.space" class="bb-btn bb-btn--black">Login</a>
        </div>
      </div>
      <div class="bb-nav__rule" />
    </header>

    <!-- Hero -->
    <section class="bb-hero">
      <div class="bb-hero__inner">
        <span class="bb-rating">
          <span class="bb-rating__badge">
            <Icon icon="lucide:star" class="text-[13px]" />
          </span>
          <span>Dipakai warga di 119+ kabupaten/kota</span>
        </span>

        <h1 class="bb-h1">
          Bantuan darurat<br />
          <span class="bb-h1__line">dalam genggaman warga.</span>
        </h1>

        <p class="bb-hero__lede">
          Peta unit ambulance, damkar, PMI, PSC 119, dan RS terdekat lengkap
          dengan jarak, ETA, dan status siaga — dispatch ke unit terbaik
          dalam 30 detik, live tracking petugas sampai tiba.
        </p>

        <div class="bb-hero__ctas">
          <NuxtLink to="/" class="bb-btn bb-btn--black bb-btn--lg">
            <Icon icon="lucide:arrow-up-right" class="text-[15px]" />
            Buka app warga
          </NuxtLink>
          <a href="https://dashboard.butuhbantuan.space" class="bb-btn bb-btn--white bb-btn--lg">
            <Icon icon="lucide:arrow-up-right" class="text-[15px]" />
            Untuk unit emergency
          </a>
        </div>
        <p class="bb-hero__note">Gratis untuk warga · Tidak perlu daftar</p>

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
            <p class="bb-kpi__value">± {{ kpiAvgMin }}<span>min</span></p>
            <p class="bb-kpi__label">Avg response</p>
          </div>
          <div class="bb-kpi bb-kpi--live">
            <span class="bb-kpi__pulse"><span class="bb-kpi__ping" /></span>
            <div>
              <p class="bb-kpi__label bb-kpi__label--top">Live</p>
              <Transition name="bb-live" mode="out-in">
                <p :key="activityIndex" class="bb-kpi__ticker">
                  {{ activityFeed[activityIndex]!.label }}
                </p>
              </Transition>
            </div>
          </div>
        </div>

        <!-- Logo strip -->
        <div class="bb-logos">
          <span class="bb-logos__item">PMI</span>
          <span class="bb-logos__sep" />
          <span class="bb-logos__item">Damkar</span>
          <span class="bb-logos__sep" />
          <span class="bb-logos__item">PSC 119</span>
          <span class="bb-logos__sep" />
          <span class="bb-logos__item">RS SATUSEHAT</span>
          <span class="bb-logos__sep" />
          <span class="bb-logos__item">Basarnas</span>
          <span class="bb-logos__sep" />
          <span class="bb-logos__item">Komunitas Relawan</span>
        </div>
      </div>
    </section>

    <!-- Feature 1: Peta darurat (mockup right) -->
    <section id="warga" class="bb-feat">
      <div class="bb-feat__inner">
        <div class="bb-feat__copy">
          <span class="bb-eyebrow bb-eyebrow--pink">TEMUKAN BANTUAN</span>
          <h2 class="bb-h2">Peta yang tahu unit terdekat.<br />Sebelum kamu bertanya.</h2>
          <p class="bb-feat__body">
            Aplikasi baca lokasi GPS-mu dan tampilkan ambulance, damkar, PMI, PSC 119,
            dan RS di sekitar — lengkap dengan ETA real-time dan status siaga.
          </p>
          <NuxtLink to="/" class="bb-btn bb-btn--black">
            <Icon icon="lucide:arrow-up-right" class="text-[14px]" />
            Buka peta
          </NuxtLink>
        </div>

        <!-- Mockup: peta with unit pins + detail sheet -->
        <div class="bb-mock bb-mock--browser">
          <div class="bb-mock__chrome">
            <span class="bb-mock__dot bb-mock__dot--r" />
            <span class="bb-mock__dot bb-mock__dot--y" />
            <span class="bb-mock__dot bb-mock__dot--g" />
            <span class="bb-mock__url">butuhbantuan.space</span>
          </div>
          <div class="bb-mock__body">
            <div class="bb-map-mock">
              <span class="bb-map-mock__road bb-map-mock__road--a" />
              <span class="bb-map-mock__road bb-map-mock__road--b" />
              <span class="bb-map-mock__road bb-map-mock__road--c" />
              <span class="bb-map-mock__unit bb-map-mock__unit--amb" style="top:22%;left:25%">
                <Icon icon="mynaui:ambulance-solid" class="text-[12px]" />
              </span>
              <span class="bb-map-mock__unit bb-map-mock__unit--fire" style="top:32%;left:62%">
                <Icon icon="lucide:flame" class="text-[12px]" />
              </span>
              <span class="bb-map-mock__unit bb-map-mock__unit--pmi" style="top:52%;left:38%">
                <Icon icon="lucide:heart-pulse" class="text-[12px]" />
              </span>
              <span class="bb-map-mock__unit bb-map-mock__unit--hosp" style="top:48%;left:70%">
                <Icon icon="lucide:hospital" class="text-[12px]" />
              </span>
              <span class="bb-map-mock__user">
                <span class="bb-map-mock__user-ping" />
              </span>
            </div>
            <div class="bb-mock-sheet">
              <div class="bb-mock-sheet__handle" />
              <div class="bb-mock-sheet__head">
                <span class="bb-mock-sheet__logo">
                  <Icon icon="mynaui:ambulance-solid" class="text-[14px]" />
                </span>
                <div>
                  <p class="bb-mock-sheet__title">Ambulance PMI Sleman</p>
                  <p class="bb-mock-sheet__sub">Palang Merah Indonesia</p>
                </div>
                <span class="bb-mock-sheet__x"><Icon icon="lucide:x" class="text-[11px]" /></span>
              </div>
              <div class="bb-mock-sheet__meta">
                <span class="bb-mock-sheet__meta-a">Komunitas</span> ·
                <span class="bb-mock-sheet__meta-b">3 min</span> ·
                <span class="bb-mock-sheet__meta-c">1.2 km</span>
              </div>
              <div class="bb-mock-sheet__pills">
                <span class="bb-mock-sheet__pill bb-mock-sheet__pill--primary">
                  <Icon icon="lucide:siren" class="text-[11px]" /> Buat laporan
                </span>
                <span class="bb-mock-sheet__pill">
                  <Icon icon="ic:baseline-whatsapp" class="text-[11px]" /> WA
                </span>
                <span class="bb-mock-sheet__pill">
                  <Icon icon="lucide:phone" class="text-[11px]" /> Telepon
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 2: Buat laporan (mockup left) -->
    <section class="bb-feat bb-feat--tinted bb-feat--rev">
      <div class="bb-feat__inner">
        <div class="bb-feat__copy">
          <span class="bb-eyebrow bb-eyebrow--purple">LAPORAN 30 DETIK</span>
          <h2 class="bb-h2">Triase, foto, dispatch.<br />Semua dalam satu sheet.</h2>
          <p class="bb-feat__body">
            Isi kondisi korban dengan sistem triase Merah / Kuning / Hijau,
            tambah foto opsional, unit terbaik otomatis di-dispatch. Nomor tiket
            langsung digenerate untuk share ke keluarga.
          </p>
          <NuxtLink to="/" class="bb-btn bb-btn--black">
            <Icon icon="lucide:arrow-up-right" class="text-[14px]" />
            Coba buat laporan
          </NuxtLink>
        </div>

        <!-- Mockup: laporan form -->
        <div class="bb-mock bb-mock--phone">
          <div class="bb-phone">
            <div class="bb-phone__notch" />
            <div class="bb-phone__screen">
              <div class="bb-form-mock">
                <div class="bb-form-mock__head">
                  <span class="bb-form-mock__logo">
                    <Icon icon="lucide:clipboard-pen" class="text-[13px]" />
                  </span>
                  <div>
                    <p class="bb-form-mock__title">Buat laporan</p>
                    <p class="bb-form-mock__sub">Isi laporan dengan benar</p>
                  </div>
                </div>
                <div class="bb-form-mock__unit">
                  <p class="bb-form-mock__unit-label">Permintaan bantuan</p>
                  <p class="bb-form-mock__unit-name">Ambulance PMI Sleman</p>
                </div>
                <div class="bb-form-mock__section">
                  <p class="bb-form-mock__lbl">Kondisi korban</p>
                  <div class="bb-form-mock__triage">
                    <span class="bb-form-mock__triage-chip bb-form-mock__triage-chip--r">Merah</span>
                    <span class="bb-form-mock__triage-chip bb-form-mock__triage-chip--y">Kuning</span>
                    <span class="bb-form-mock__triage-chip bb-form-mock__triage-chip--g">Hijau</span>
                  </div>
                </div>
                <div class="bb-form-mock__section">
                  <p class="bb-form-mock__lbl">Foto (opsional)</p>
                  <div class="bb-form-mock__photo">
                    <Icon icon="lucide:image" class="text-[16px]" />
                  </div>
                </div>
                <div class="bb-form-mock__cta">Kirim laporan</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 3: Live tracking (mockup right) -->
    <section class="bb-feat">
      <div class="bb-feat__inner">
        <div class="bb-feat__copy">
          <span class="bb-eyebrow bb-eyebrow--teal">LIVE TRACKING</span>
          <h2 class="bb-h2">Lihat unit bergerak.<br />Sampai tiba di lokasi.</h2>
          <p class="bb-feat__body">
            Setelah dispatch, ambulance mulai kirim GPS setiap 5 detik. Kamu bisa
            lihat posisi mereka di peta, hitung mundur ETA otomatis, tanpa perlu
            telepon berulang untuk tanya "sudah sampai mana?"
          </p>
          <NuxtLink to="/my-tickets" class="bb-btn bb-btn--black">
            <Icon icon="lucide:arrow-up-right" class="text-[14px]" />
            Cek tiket saya
          </NuxtLink>
        </div>

        <div class="bb-mock bb-mock--browser">
          <div class="bb-mock__chrome">
            <span class="bb-mock__dot bb-mock__dot--r" />
            <span class="bb-mock__dot bb-mock__dot--y" />
            <span class="bb-mock__dot bb-mock__dot--g" />
            <span class="bb-mock__url">butuhbantuan.space/track/…</span>
          </div>
          <div class="bb-mock__body">
            <div class="bb-track-mock">
              <span class="bb-track-mock__road bb-track-mock__road--main" />
              <svg class="bb-track-mock__route" viewBox="0 0 400 260" preserveAspectRatio="none">
                <path d="M60 240 Q 130 200 160 160 T 260 90 T 340 40" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 6" />
              </svg>
              <span class="bb-track-mock__end">
                <span class="bb-track-mock__end-dot" />
              </span>
              <span class="bb-track-mock__amb">
                <Icon icon="mynaui:ambulance-solid" class="text-[16px]" />
              </span>
              <div class="bb-track-mock__eta">
                <p class="bb-track-mock__eta-num">4:32</p>
                <p class="bb-track-mock__eta-lbl">menit</p>
              </div>
              <div class="bb-track-mock__status">
                <span class="bb-track-mock__dot bb-track-mock__dot--live" /> GPS live · updated 2s ago
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 4: Dashboard (mockup left) -->
    <section id="unit" class="bb-feat bb-feat--tinted bb-feat--rev">
      <div class="bb-feat__inner">
        <div class="bb-feat__copy">
          <span class="bb-eyebrow bb-eyebrow--orange">UNTUK UNIT EMERGENCY</span>
          <h2 class="bb-h2">Dashboard operasional<br />yang cukup satu kali buka.</h2>
          <p class="bb-feat__body">
            Antrian order, status setiap unit, timeline dispatch dalam satu tampilan.
            Notifikasi via SSE + Web Push masuk dalam hitungan detik. Auto-eskalasi
            kalau SLA lewat. Compliance tracking otomatis sesuai standar Kemenkes / PSC 119.
          </p>
          <a href="https://dashboard.butuhbantuan.space" class="bb-btn bb-btn--black">
            <Icon icon="lucide:arrow-up-right" class="text-[14px]" />
            Buka dashboard
          </a>
        </div>

        <div class="bb-mock bb-mock--browser">
          <div class="bb-mock__chrome">
            <span class="bb-mock__dot bb-mock__dot--r" />
            <span class="bb-mock__dot bb-mock__dot--y" />
            <span class="bb-mock__dot bb-mock__dot--g" />
            <span class="bb-mock__url">dashboard.butuhbantuan.space</span>
          </div>
          <div class="bb-mock__body bb-mock__body--dash">
            <div class="bb-dash-mock">
              <div class="bb-dash-mock__side">
                <div class="bb-dash-mock__side-row bb-dash-mock__side-row--active">
                  <Icon icon="lucide:list-todo" class="text-[11px]" /> Antrian
                </div>
                <div class="bb-dash-mock__side-row">
                  <Icon icon="lucide:map" class="text-[11px]" /> Ops map
                </div>
                <div class="bb-dash-mock__side-row">
                  <Icon icon="lucide:bar-chart-2" class="text-[11px]" /> Statistik
                </div>
                <div class="bb-dash-mock__side-row">
                  <Icon icon="lucide:hospital" class="text-[11px]" /> Referensi RS
                </div>
              </div>
              <div class="bb-dash-mock__main">
                <div class="bb-dash-mock__kpis">
                  <div class="bb-dash-mock__kpi">
                    <p class="bb-dash-mock__kpi-v">12</p>
                    <p class="bb-dash-mock__kpi-l">Pending</p>
                  </div>
                  <div class="bb-dash-mock__kpi">
                    <p class="bb-dash-mock__kpi-v">8</p>
                    <p class="bb-dash-mock__kpi-l">Dispatched</p>
                  </div>
                  <div class="bb-dash-mock__kpi">
                    <p class="bb-dash-mock__kpi-v" style="color:#059669">4m</p>
                    <p class="bb-dash-mock__kpi-l">Avg SLA</p>
                  </div>
                </div>
                <div class="bb-dash-mock__row">
                  <span class="bb-dash-mock__pin bb-dash-mock__pin--red"><Icon icon="lucide:siren" class="text-[10px]" /></span>
                  <div class="bb-dash-mock__row-body">
                    <p class="bb-dash-mock__row-title">Merah · Asma anak · Sleman</p>
                    <p class="bb-dash-mock__row-sub">2 min ago · Waiting accept</p>
                  </div>
                  <span class="bb-dash-mock__row-cta">Accept</span>
                </div>
                <div class="bb-dash-mock__row">
                  <span class="bb-dash-mock__pin bb-dash-mock__pin--amber"><Icon icon="lucide:siren" class="text-[10px]" /></span>
                  <div class="bb-dash-mock__row-body">
                    <p class="bb-dash-mock__row-title">Kuning · Kecelakaan · Yogya</p>
                    <p class="bb-dash-mock__row-sub">5 min ago · En-route</p>
                  </div>
                  <span class="bb-dash-mock__row-cta bb-dash-mock__row-cta--ghost">Track</span>
                </div>
                <div class="bb-dash-mock__row">
                  <span class="bb-dash-mock__pin bb-dash-mock__pin--green"><Icon icon="lucide:check" class="text-[10px]" /></span>
                  <div class="bb-dash-mock__row-body">
                    <p class="bb-dash-mock__row-title">Hijau · Transport · Bantul</p>
                    <p class="bb-dash-mock__row-sub">12 min ago · Completed</p>
                  </div>
                  <span class="bb-dash-mock__row-cta bb-dash-mock__row-cta--ghost">Detail</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Coverage -->
    <section id="coverage" class="bb-feat bb-feat--center">
      <div class="bb-feat__inner">
        <div class="bb-shead">
          <span class="bb-eyebrow bb-eyebrow--pink">JANGKAUAN</span>
          <h2 class="bb-h2">Hadir di seluruh Jawa.<br />Meluas ke kota besar Indonesia.</h2>
          <p class="bb-feat__body bb-feat__body--wide">
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

    <!-- Dukung -->
    <section id="dukung" class="bb-feat bb-feat--tinted bb-feat--center">
      <div class="bb-feat__inner">
        <div class="bb-shead">
          <span class="bb-eyebrow bb-eyebrow--purple">DUKUNG</span>
          <h2 class="bb-h2">Bangun jaringan darurat<br />sipil Indonesia bersama.</h2>
          <p class="bb-feat__body bb-feat__body--wide">
            Kami butuh sponsor, mitra pemerintah, dan komunitas relawan untuk
            menjaga platform tetap gratis dan andal.
          </p>
        </div>

        <div class="bb-support">
          <article class="bb-support__card">
            <span class="bb-support__icon bb-support__icon--pink">
              <Icon icon="lucide:heart-handshake" class="text-[18px]" />
            </span>
            <h3>Donasi &amp; Sponsor</h3>
            <p>Bantu operasional: hosting, SMS gateway, integrasi peta, pelatihan relawan.</p>
            <a href="mailto:hello@butuhbantuan.space?subject=Sponsor">
              Jadi sponsor <Icon icon="lucide:arrow-up-right" class="text-[13px]" />
            </a>
          </article>
          <article class="bb-support__card">
            <span class="bb-support__icon bb-support__icon--blue">
              <Icon icon="lucide:landmark" class="text-[18px]" />
            </span>
            <h3>Kolaborasi Pemerintah</h3>
            <p>Integrasi Dinkes, PSC 119 kab/kota, Damkar daerah. Gratis untuk unit resmi.</p>
            <a href="mailto:hello@butuhbantuan.space?subject=Pemerintah">
              Ajukan integrasi <Icon icon="lucide:arrow-up-right" class="text-[13px]" />
            </a>
          </article>
          <article class="bb-support__card">
            <span class="bb-support__icon bb-support__icon--teal">
              <Icon icon="lucide:handshake" class="text-[18px]" />
            </span>
            <h3>Partner Komunitas</h3>
            <p>PMI cabang, ORARI, RAPI, komunitas ambulance — masuk lewat jalur komunitas.</p>
            <a href="mailto:hello@butuhbantuan.space?subject=Komunitas">
              Gabung sebagai unit <Icon icon="lucide:arrow-up-right" class="text-[13px]" />
            </a>
          </article>
        </div>

        <div class="bb-band">
          <div>
            <p class="bb-band__title">Bantu tanpa donasi.</p>
            <p class="bb-band__body">Bagikan aplikasi ini ke keluarga & tetangga. Setiap install baru = satu tetangga lebih siap saat darurat.</p>
          </div>
          <NuxtLink to="/" class="bb-btn bb-btn--black bb-btn--lg">
            <Icon icon="lucide:arrow-up-right" class="text-[14px]" />
            Bagikan aplikasi
          </NuxtLink>
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
            <span class="bb-brand__word">butuhbantuan<sup>™</sup></span>
          </NuxtLink>
          <p class="bb-footer__tag">
            Platform darurat sipil Indonesia.<br />
            Open, gratis, dibangun bersama komunitas.
          </p>
          <p class="bb-footer__caveat">Terima kasih sudah mampir</p>
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
              <li><a href="#dukung">Dukung</a></li>
              <li><a href="mailto:hello@butuhbantuan.space">Kontak</a></li>
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
 * Tokens — sendr.ai vibe: heavy Inter, Caveat cursive, mostly monochrome
 * with gradient eyebrows as the only real splashes of colour.
 * ──────────────────────────────────────────────────────────────────────── */
.bb-landing {
  --ink: #0A0A0A;
  --ink-2: #262626;
  --ink-3: #525252;
  --ink-4: #737373;
  --ink-5: #A3A3A3;
  --line: #E5E5E5;
  --line-2: #D4D4D4;
  --bg: #FFFFFF;
  --bg-tint: #F7F7F7;
  --bg-chip: #F5F5F5;

  background: var(--bg);
  color: var(--ink);
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
  font-size: 15px;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}
.bb-landing :where(h1, h2, h3, h4, p, ul) { margin: 0; }
.bb-landing ul { list-style: none; padding: 0; }
.bb-landing a { color: inherit; text-decoration: none; }

.bb-caveat {
  font-family: "Caveat", cursive;
  font-weight: 500;
}

/* ── Nav ─────────────────────────────────────────────────────────────── */

.bb-nav { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.9); backdrop-filter: saturate(160%) blur(10px); }
.bb-nav__inner {
  max-width: 1200px; margin: 0 auto;
  padding: 18px 24px;
  display: flex; align-items: center; gap: 24px;
}
.bb-nav__rule {
  max-width: 1200px; margin: 0 auto;
  height: 1px; background: var(--line);
}
.bb-brand {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 17px; font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.03em;
}
.bb-brand__mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--ink); color: #fff;
}
.bb-brand__mark--light { background: #fff; color: var(--ink); }
.bb-brand__word sup { font-size: 9px; margin-left: 1px; opacity: 0.75; }
.bb-nav__links { display: none; gap: 26px; margin-left: 20px; }
.bb-nav__links a {
  font-size: 14px; font-weight: 500; color: var(--ink-2);
  transition: color 0.15s;
}
.bb-nav__links a:hover { color: var(--ink); }
.bb-nav__actions { margin-left: auto; display: flex; gap: 8px; }
@media (min-width: 900px) { .bb-nav__links { display: flex; } }

/* ── Buttons (chunky rounded) ────────────────────────────────────────── */

.bb-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px;
  font-size: 14px; font-weight: 600;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: background 0.14s, border-color 0.14s, transform 0.12s;
  letter-spacing: -0.01em; white-space: nowrap;
}
.bb-btn:active { transform: scale(0.98); }
.bb-btn--lg { padding: 12px 18px; font-size: 15px; border-radius: 12px; }
.bb-btn--black { background: var(--ink); color: #fff; }
.bb-btn--black:hover { background: var(--ink-2); }
.bb-btn--white { background: #fff; color: var(--ink); border-color: var(--line-2); }
.bb-btn--white:hover { background: var(--bg-tint); }

/* ── Hero ────────────────────────────────────────────────────────────── */

.bb-hero { padding: 64px 24px 72px; }
.bb-hero__inner { max-width: 1200px; margin: 0 auto; }
@media (min-width: 900px) { .bb-hero { padding: 100px 24px 88px; } }

.bb-rating {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 13.5px; font-weight: 500; color: var(--ink-3);
  margin-bottom: 20px;
}
.bb-rating__badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 9999px;
  background: linear-gradient(135deg, #EC4899, #A855F7);
  color: #fff;
}

.bb-h1 {
  font-size: clamp(44px, 8vw, 96px);
  line-height: 0.98;
  font-weight: 900;
  letter-spacing: -0.045em;
  color: var(--ink);
  max-width: 12ch;
}
.bb-h1__line { display: inline; }
@media (min-width: 900px) {
  .bb-h1 { max-width: 14ch; }
}

.bb-hero__lede {
  margin-top: 28px;
  max-width: 620px;
  font-size: 17px; line-height: 1.55;
  color: var(--ink-3);
  font-weight: 500;
  letter-spacing: -0.005em;
}

.bb-hero__ctas {
  margin-top: 32px;
  display: flex; flex-wrap: wrap; gap: 10px;
}

.bb-hero__note {
  margin-top: 12px;
  font-family: "Caveat", cursive;
  font-size: 18px; font-weight: 500;
  color: var(--ink-4);
}

.bb-kpis {
  margin-top: 56px;
  display: grid; gap: 20px;
  grid-template-columns: repeat(2, 1fr);
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  max-width: 720px;
}
@media (min-width: 800px) {
  .bb-kpis { grid-template-columns: repeat(4, 1fr); gap: 0; padding: 22px 26px; }
  .bb-kpi + .bb-kpi { border-left: 1px solid var(--line); padding-left: 22px; }
}
.bb-kpi__value {
  font-size: 30px; font-weight: 800; letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.bb-kpi__value span { font-size: 16px; color: var(--ink-4); font-weight: 500; margin-left: 3px; }
.bb-kpi__label { font-size: 12px; color: var(--ink-4); font-weight: 500; margin-top: 2px; }

.bb-kpi--live { display: flex; align-items: flex-start; gap: 10px; }
.bb-kpi__pulse {
  position: relative;
  margin-top: 6px;
  display: block; width: 8px; height: 8px; border-radius: 9999px;
  background: #10B981; flex-shrink: 0;
}
.bb-kpi__ping {
  position: absolute; inset: 0;
  border-radius: 9999px; background: #10B981;
  animation: bb-ping 1.8s ease-out infinite;
}
@keyframes bb-ping { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(2.6); opacity: 0; } }
.bb-kpi__label--top { text-transform: uppercase; letter-spacing: 0.04em; color: #10B981; }
.bb-kpi__ticker {
  font-size: 12.5px; color: var(--ink-2); font-weight: 500;
  margin-top: 2px; line-height: 1.35;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;
}

.bb-live-enter-active, .bb-live-leave-active {
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.22s;
}
.bb-live-enter-from { transform: translateY(6px); opacity: 0; }
.bb-live-leave-to { transform: translateY(-6px); opacity: 0; }

/* Logo strip */
.bb-logos {
  margin-top: 56px;
  display: flex; align-items: center; justify-content: center; flex-wrap: wrap;
  gap: 22px 20px;
  padding-top: 32px; border-top: 1px solid var(--line);
}
.bb-logos__item {
  font-size: 14px; font-weight: 600; color: var(--ink-5);
  letter-spacing: -0.01em;
}
.bb-logos__sep { width: 1px; height: 18px; background: var(--line); }

/* ── Feature sections ────────────────────────────────────────────────── */

.bb-feat { padding: 72px 24px; }
.bb-feat--tinted { background: var(--bg-tint); }
.bb-feat__inner {
  max-width: 1200px; margin: 0 auto;
  display: grid; gap: 40px; grid-template-columns: 1fr;
  align-items: center;
}
@media (min-width: 900px) {
  .bb-feat { padding: 128px 24px; }
  .bb-feat__inner { grid-template-columns: 1fr 1.05fr; gap: 80px; }
  .bb-feat--rev .bb-feat__copy { order: 2; }
  .bb-feat--rev .bb-mock { order: 1; }
}
.bb-feat--center .bb-feat__inner { grid-template-columns: 1fr; text-align: center; }

.bb-shead { max-width: 720px; margin: 0 auto; text-align: center; }

.bb-eyebrow {
  display: inline-block;
  font-size: 13px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  background-clip: text; -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.bb-eyebrow--pink { background-image: linear-gradient(90deg, #EC4899, #A855F7); }
.bb-eyebrow--purple { background-image: linear-gradient(90deg, #8B5CF6, #6366F1); }
.bb-eyebrow--teal { background-image: linear-gradient(90deg, #06B6D4, #10B981); }
.bb-eyebrow--orange { background-image: linear-gradient(90deg, #F97316, #EF4444); }

.bb-h2 {
  margin-top: 18px;
  font-size: clamp(30px, 4.6vw, 52px);
  line-height: 1.02;
  font-weight: 900;
  letter-spacing: -0.035em;
  color: var(--ink);
}

.bb-feat__body {
  margin-top: 22px; max-width: 480px;
  font-size: 16px; line-height: 1.6;
  color: var(--ink-3);
  font-weight: 500;
}
.bb-feat__body--wide { max-width: 620px; margin: 22px auto 0; }
.bb-feat__copy .bb-btn { margin-top: 28px; }

/* ── Mockup: browser frame ───────────────────────────────────────────── */

.bb-mock {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 30px 60px -25px rgba(10, 10, 10, 0.18);
}
.bb-mock__chrome {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 16px;
  background: #F5F5F5;
  border-bottom: 1px solid var(--line);
}
.bb-mock__dot { width: 10px; height: 10px; border-radius: 9999px; }
.bb-mock__dot--r { background: #FF605C; }
.bb-mock__dot--y { background: #FFBD44; }
.bb-mock__dot--g { background: #00CA4E; }
.bb-mock__url {
  margin: 0 auto;
  font-size: 12px; color: var(--ink-4); font-weight: 500;
  padding: 3px 12px; background: #fff; border-radius: 6px;
  border: 1px solid var(--line);
}
.bb-mock__body { position: relative; aspect-ratio: 5 / 3.4; background: #fff; }
.bb-mock__body--dash { aspect-ratio: 5 / 3.4; }

/* Map mock inside browser */
.bb-map-mock {
  position: absolute; inset: 0;
  background:
    radial-gradient(1.2px 1.2px at 20% 20%, #A7D3B4, transparent 60%),
    radial-gradient(1.2px 1.2px at 75% 35%, #A7D3B4, transparent 60%),
    radial-gradient(1.2px 1.2px at 55% 65%, #A7D3B4, transparent 60%),
    linear-gradient(180deg, #E1EEE6 0%, #E9EEDC 100%);
  overflow: hidden;
}
.bb-map-mock__road {
  position: absolute;
  background: #F5D0A9;
  transform-origin: 0 50%;
}
.bb-map-mock__road--a { top: 35%; left: -5%; width: 110%; height: 5px; transform: rotate(6deg); }
.bb-map-mock__road--b { top: 65%; left: -5%; width: 110%; height: 3px; transform: rotate(-4deg); background: #ECD5B2; }
.bb-map-mock__road--c { top: -10%; left: 45%; width: 4px; height: 130%; background: #ECD5B2; transform: rotate(15deg); }
.bb-map-mock__unit {
  position: absolute; width: 22px; height: 22px;
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 6px rgba(10, 10, 10, 0.25);
}
.bb-map-mock__unit--amb { background: #EF4444; }
.bb-map-mock__unit--fire { background: #F97316; }
.bb-map-mock__unit--pmi { background: #EC4899; }
.bb-map-mock__unit--hosp { background: #8B5CF6; }
.bb-map-mock__user {
  position: absolute; top: 68%; left: 40%;
  width: 12px; height: 12px; border-radius: 9999px;
  background: #2563EB; border: 3px solid #fff;
  box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.15);
  transform: translate(-50%, -50%);
}

/* Bottom sheet mock inside browser */
.bb-mock-sheet {
  position: absolute; left: 0; right: 0; bottom: 0;
  background: #fff;
  padding: 8px 16px 14px;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -10px 20px rgba(10, 10, 10, 0.06);
}
.bb-mock-sheet__handle { width: 32px; height: 4px; border-radius: 9999px; background: var(--line-2); margin: 0 auto 10px; }
.bb-mock-sheet__head { display: flex; align-items: center; gap: 10px; }
.bb-mock-sheet__logo {
  width: 30px; height: 30px; border-radius: 9px;
  background: rgba(239, 68, 68, 0.1); color: #EF4444;
  display: flex; align-items: center; justify-content: center;
}
.bb-mock-sheet__title { font-size: 14px; font-weight: 700; color: var(--ink); letter-spacing: -0.02em; line-height: 1.2; }
.bb-mock-sheet__sub { font-size: 11px; color: var(--ink-4); font-weight: 500; margin-top: 2px; }
.bb-mock-sheet__x {
  margin-left: auto;
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 9999px; background: var(--bg-chip); color: var(--ink-4);
}
.bb-mock-sheet__meta {
  margin-top: 6px;
  font-size: 11.5px; font-weight: 600; color: var(--ink-3);
}
.bb-mock-sheet__meta-a { color: #1a73e8; }
.bb-mock-sheet__meta-b { color: #10B981; }
.bb-mock-sheet__meta-c { color: var(--ink-4); }
.bb-mock-sheet__pills {
  margin-top: 10px;
  display: flex; gap: 6px;
}
.bb-mock-sheet__pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 9999px;
  font-size: 11px; font-weight: 600; color: var(--ink);
  border: 1px solid var(--line);
  background: #fff;
}
.bb-mock-sheet__pill--primary { background: #EF4444; color: #fff; border-color: transparent; }

/* ── Mockup: phone frame ─────────────────────────────────────────────── */

.bb-mock--phone {
  border: none;
  box-shadow: none;
  background: transparent;
  display: flex; justify-content: center;
}
.bb-phone {
  width: 300px;
  aspect-ratio: 300 / 620;
  background: linear-gradient(135deg, #1a1a20, #0A0A0A);
  border-radius: 40px;
  padding: 10px;
  border: 1px solid #2A2A32;
  position: relative;
  box-shadow: 0 40px 80px -30px rgba(10, 10, 10, 0.5);
}
.bb-phone__notch {
  position: absolute; top: 22px; left: 50%;
  transform: translateX(-50%);
  width: 76px; height: 22px;
  border-radius: 9999px; background: #0A0A0A;
  z-index: 2;
}
.bb-phone__screen {
  position: relative; width: 100%; height: 100%;
  border-radius: 32px; overflow: hidden;
  background: #F7F7F8;
}

/* Form mock inside phone */
.bb-form-mock {
  padding: 46px 16px 16px;
  height: 100%; display: flex; flex-direction: column; gap: 12px;
}
.bb-form-mock__head { display: flex; align-items: center; gap: 10px; }
.bb-form-mock__logo {
  width: 28px; height: 28px; border-radius: 8px;
  background: rgba(139, 92, 246, 0.12); color: #8B5CF6;
  display: flex; align-items: center; justify-content: center;
}
.bb-form-mock__title { font-size: 14px; font-weight: 700; letter-spacing: -0.02em; }
.bb-form-mock__sub { font-size: 10.5px; color: var(--ink-4); }
.bb-form-mock__unit {
  padding: 10px 12px; border-radius: 10px;
  background: #fff; border: 1px solid var(--line);
}
.bb-form-mock__unit-label { font-size: 10px; color: var(--ink-4); font-weight: 500; }
.bb-form-mock__unit-name { font-size: 13px; font-weight: 700; letter-spacing: -0.015em; }
.bb-form-mock__section {
  padding: 10px 12px; border-radius: 10px;
  background: #fff; border: 1px solid var(--line);
}
.bb-form-mock__lbl { font-size: 10px; color: var(--ink-4); font-weight: 500; margin-bottom: 6px; }
.bb-form-mock__triage { display: flex; gap: 6px; }
.bb-form-mock__triage-chip {
  padding: 5px 10px; border-radius: 9999px;
  font-size: 11px; font-weight: 700; letter-spacing: -0.01em;
}
.bb-form-mock__triage-chip--r { background: #EF4444; color: #fff; }
.bb-form-mock__triage-chip--y { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
.bb-form-mock__triage-chip--g { background: #F0FDF4; color: #166534; border: 1px solid #BBF7D0; }
.bb-form-mock__photo {
  height: 60px; border-radius: 8px;
  background: #F5F5F5; border: 1px dashed var(--line-2);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-5);
}
.bb-form-mock__cta {
  margin-top: auto;
  padding: 12px; border-radius: 12px;
  background: var(--ink); color: #fff;
  font-size: 13px; font-weight: 600; text-align: center;
}

/* ── Mockup: live tracking inside browser ────────────────────────────── */

.bb-track-mock {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, #DCECF6 0%, #E7F0E4 55%, #E0E6D0 100%);
  overflow: hidden;
}
.bb-track-mock__road--main {
  position: absolute; top: 55%; left: -5%; width: 110%; height: 4px;
  background: #F5D0A9; transform: rotate(-3deg);
}
.bb-track-mock__route {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
.bb-track-mock__end {
  position: absolute; top: 15%; left: 82%;
  width: 26px; height: 26px;
  border-radius: 8px 8px 8px 3px;
  background: #EF4444; transform: rotate(-45deg);
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
}
.bb-track-mock__end-dot {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg);
  width: 10px; height: 10px; border-radius: 9999px; background: #fff;
}
.bb-track-mock__amb {
  position: absolute; top: 60%; left: 40%;
  width: 32px; height: 32px; border-radius: 10px;
  background: #EF4444; color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 14px rgba(239, 68, 68, 0.4);
  transform: translate(-50%, -50%);
  animation: bb-amb-move 4s ease-in-out infinite;
}
@keyframes bb-amb-move {
  0%, 100% { top: 60%; left: 40%; }
  50%      { top: 45%; left: 58%; }
}
.bb-track-mock__eta {
  position: absolute; top: 16px; left: 16px;
  padding: 10px 14px; border-radius: 12px;
  background: #fff; border: 1px solid var(--line);
  box-shadow: 0 6px 14px rgba(10, 10, 10, 0.08);
}
.bb-track-mock__eta-num { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; color: var(--ink); font-variant-numeric: tabular-nums; }
.bb-track-mock__eta-lbl { font-size: 10.5px; color: var(--ink-4); font-weight: 500; }
.bb-track-mock__status {
  position: absolute; bottom: 16px; left: 16px;
  padding: 6px 12px; border-radius: 9999px;
  background: rgba(10, 10, 10, 0.8); color: #fff;
  font-size: 11px; font-weight: 500;
  display: inline-flex; align-items: center; gap: 8px;
}
.bb-track-mock__dot--live {
  width: 6px; height: 6px; border-radius: 9999px; background: #10B981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
}

/* ── Mockup: dashboard inside browser ────────────────────────────────── */

.bb-dash-mock {
  position: absolute; inset: 0;
  display: grid; grid-template-columns: 110px 1fr;
  background: var(--bg-tint);
}
.bb-dash-mock__side {
  padding: 14px 8px;
  background: #fff; border-right: 1px solid var(--line);
  display: flex; flex-direction: column; gap: 4px;
}
.bb-dash-mock__side-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 8px;
  font-size: 11px; font-weight: 500; color: var(--ink-3);
}
.bb-dash-mock__side-row--active { background: var(--bg-chip); color: var(--ink); font-weight: 600; }
.bb-dash-mock__main { padding: 14px; overflow: hidden; }
.bb-dash-mock__kpis {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  margin-bottom: 12px;
}
.bb-dash-mock__kpi {
  padding: 10px 12px; border-radius: 10px;
  background: #fff; border: 1px solid var(--line);
}
.bb-dash-mock__kpi-v { font-size: 20px; font-weight: 800; letter-spacing: -0.03em; }
.bb-dash-mock__kpi-l { font-size: 10.5px; color: var(--ink-4); font-weight: 500; margin-top: 1px; }
.bb-dash-mock__row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  background: #fff; border: 1px solid var(--line);
  margin-bottom: 8px;
}
.bb-dash-mock__pin {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 6px; color: #fff;
}
.bb-dash-mock__pin--red { background: #EF4444; }
.bb-dash-mock__pin--amber { background: #F59E0B; }
.bb-dash-mock__pin--green { background: #10B981; }
.bb-dash-mock__row-body { min-width: 0; flex: 1; }
.bb-dash-mock__row-title { font-size: 12px; font-weight: 700; letter-spacing: -0.01em; }
.bb-dash-mock__row-sub { font-size: 10.5px; color: var(--ink-4); }
.bb-dash-mock__row-cta {
  padding: 5px 12px; border-radius: 9999px;
  background: var(--ink); color: #fff;
  font-size: 10.5px; font-weight: 600;
}
.bb-dash-mock__row-cta--ghost { background: transparent; color: var(--ink-2); border: 1px solid var(--line); }

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
.bb-map__dot--full { background: #EC4899; border-color: #EC4899; }
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
.bb-badge--full { background: rgba(236, 72, 153, 0.1); color: #BE185D; }
.bb-badge--pilot { background: var(--bg-chip); color: var(--ink-2); }
.bb-island__body { font-size: 13.5px; color: var(--ink-3); line-height: 1.55; }
.bb-island__cities {
  margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px;
}
.bb-island__cities li {
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 9999px;
  background: var(--bg-chip); color: var(--ink-2);
}

/* ── Support / dukung ────────────────────────────────────────────────── */

.bb-support {
  margin-top: 40px;
  display: grid; gap: 14px;
  grid-template-columns: 1fr;
  text-align: left;
}
@media (min-width: 800px) { .bb-support { grid-template-columns: repeat(3, 1fr); } }
.bb-support__card {
  padding: 24px; border-radius: 16px;
  background: #fff; border: 1px solid var(--line);
  display: flex; flex-direction: column;
  transition: border-color 0.14s, transform 0.14s;
}
.bb-support__card:hover { border-color: var(--line-2); transform: translateY(-2px); }
.bb-support__icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 16px; color: #fff;
}
.bb-support__icon--pink { background: linear-gradient(135deg, #EC4899, #A855F7); }
.bb-support__icon--blue { background: linear-gradient(135deg, #6366F1, #3B82F6); }
.bb-support__icon--teal { background: linear-gradient(135deg, #06B6D4, #10B981); }
.bb-support__card h3 { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; }
.bb-support__card p { margin-top: 6px; font-size: 14px; color: var(--ink-3); line-height: 1.55; }
.bb-support__card a {
  margin-top: 18px; padding-top: 14px;
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 13.5px; font-weight: 600; color: var(--ink);
  border-top: 1px solid var(--line);
}

.bb-band {
  margin-top: 40px;
  padding: 26px;
  background: #fff; border: 1px solid var(--line);
  border-radius: 16px;
  display: grid; gap: 16px; grid-template-columns: 1fr;
  text-align: left;
}
@media (min-width: 800px) {
  .bb-band { grid-template-columns: 1fr auto; align-items: center; padding: 32px 36px; }
}
.bb-band__title { font-size: 22px; font-weight: 800; letter-spacing: -0.025em; }
.bb-band__body { margin-top: 4px; font-size: 14px; color: var(--ink-3); }

/* ── Footer ──────────────────────────────────────────────────────────── */

.bb-footer {
  background: var(--ink);
  color: rgba(255, 255, 255, 0.6);
  padding: 64px 24px 24px;
}
.bb-footer__inner {
  max-width: 1200px; margin: 0 auto;
  display: grid; gap: 40px; grid-template-columns: 1fr;
}
@media (min-width: 800px) { .bb-footer__inner { grid-template-columns: 1.2fr 2fr; } }
.bb-footer__tag {
  margin-top: 14px; max-width: 320px;
  font-size: 14px; line-height: 1.55;
  color: rgba(255, 255, 255, 0.5);
}
.bb-footer__caveat {
  margin-top: 16px;
  font-family: "Caveat", cursive;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.7);
}
.bb-footer__cols {
  display: grid; gap: 32px;
  grid-template-columns: repeat(3, 1fr);
}
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
