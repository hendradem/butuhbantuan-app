<script setup lang="ts">
/**
 * /landing — public marketing page.
 *
 * Visual language: sendr.ai-style bold Inter black headlines, Caveat cursive
 * microcopy, gradient eyebrows, chunky rounded CTAs. Feature mockups are
 * pixel-accurate reproductions of the real ButuhBantuan citizen app and the
 * unit dashboard — same icons (mynaui:ambulance-solid, mdi:fire-truck,
 * mdi:hospital-building, fa-solid:car-crash), same layout (icon well +
 * meta chips + action pills + tabs), same colour treatments.
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
        "Peta unit ambulance, damkar, SAR, PMI, PSC 119 & rumah sakit terdekat. Laporan darurat cepat, live tracking petugas, dashboard operasional untuk unit emergency.",
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
  { time: "just now", label: "Ambulance PMI Bantul terima laporan asma anak", tone: "danger" },
  { time: "1m",       label: "PSC 119 Sleman — dispatch RS Sardjito",         tone: "danger" },
  { time: "2m",       label: "Damkar Kota Yogya siaga di zona hijau",         tone: "warn" },
  { time: "3m",       label: "Relawan Sleman aktif via community claim",      tone: "ok" },
  { time: "5m",       label: "PSC 119 Kulon Progo — arrival Wates",           tone: "danger" },
  { time: "6m",       label: "RSUP Sardjito — kapasitas IGD 78%",             tone: "warn" },
];
const activityIndex = ref(0);
let tickerTimer: ReturnType<typeof setInterval> | null = null;

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
          <span>Dipakai warga di 119+ kabupaten/kota Jawa</span>
        </span>

        <h1 class="bb-h1">
          Bantuan darurat<br />
          <span class="bb-h1__line">dalam genggaman warga.</span>
        </h1>

        <p class="bb-hero__lede">
          Peta unit ambulance, damkar, SAR, PMI, PSC 119, dan rumah sakit terdekat —
          lengkap dengan jarak, ETA, dan status siaga. Dispatch ke unit terbaik
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
        <p class="bb-hero__note">Gratis untuk warga · Tanpa daftar</p>

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

        <!-- Partner strip -->
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
          <span class="bb-logos__item">Komunitas relawan</span>
        </div>
      </div>
    </section>

    <!-- Feature 1: Peta darurat (mockup right) -->
    <section id="warga" class="bb-feat">
      <div class="bb-feat__inner">
        <div class="bb-feat__copy">
          <span class="bb-eyebrow bb-eyebrow--red">TEMUKAN BANTUAN</span>
          <h2 class="bb-h2">Peta yang tahu unit terdekat.<br />Sebelum kamu bertanya.</h2>
          <p class="bb-feat__body">
            Aplikasi baca lokasi GPS-mu dan tampilkan ambulance, damkar, SAR, PMI, PSC 119,
            serta rumah sakit di sekitar — lengkap dengan ETA real-time dan status siaga.
          </p>
          <ul class="bb-feat__list">
            <li><Icon icon="lucide:check" class="text-[14px]" /> Marker per-kategori dengan warna dan icon berbeda</li>
            <li><Icon icon="lucide:check" class="text-[14px]" /> ETA + jarak dihitung real-time dari lokasimu</li>
            <li><Icon icon="lucide:check" class="text-[14px]" /> Save unit favorit untuk akses satu ketuk</li>
          </ul>
          <NuxtLink to="/" class="bb-btn bb-btn--black">
            <Icon icon="lucide:arrow-up-right" class="text-[14px]" />
            Buka peta darurat
          </NuxtLink>
        </div>

        <!-- Mockup: real peta with real icons + real detail sheet -->
        <div class="bb-mock bb-mock--browser">
          <div class="bb-mock__chrome">
            <span class="bb-mock__dot bb-mock__dot--r" />
            <span class="bb-mock__dot bb-mock__dot--y" />
            <span class="bb-mock__dot bb-mock__dot--g" />
            <span class="bb-mock__url">
              <Icon icon="lucide:lock" class="text-[10px]" /> butuhbantuan.space
            </span>
          </div>
          <div class="bb-mock__body">
            <div class="bb-map-mock">
              <span class="bb-map-mock__road bb-map-mock__road--a" />
              <span class="bb-map-mock__road bb-map-mock__road--b" />
              <span class="bb-map-mock__road bb-map-mock__road--c" />
              <!-- Real unit icons -->
              <span class="bb-map-mock__unit bb-map-mock__unit--amb" style="top:22%;left:26%">
                <Icon icon="mynaui:ambulance-solid" class="text-[12px]" />
              </span>
              <span class="bb-map-mock__unit bb-map-mock__unit--fire" style="top:34%;left:60%">
                <Icon icon="mdi:fire-truck" class="text-[11px]" />
              </span>
              <span class="bb-map-mock__unit bb-map-mock__unit--hosp" style="top:52%;left:72%">
                <Icon icon="mdi:hospital-building" class="text-[11px]" />
              </span>
              <span class="bb-map-mock__unit bb-map-mock__unit--sar" style="top:20%;left:54%">
                <Icon icon="fa-solid:car-crash" class="text-[10px]" />
              </span>
              <span class="bb-map-mock__unit bb-map-mock__unit--pmi" style="top:50%;left:42%">
                <Icon icon="mynaui:ambulance-solid" class="text-[11px]" />
              </span>
              <!-- User location -->
              <span class="bb-map-mock__user">
                <span class="bb-map-mock__user-ping" />
              </span>
              <!-- Floating dock buttons (like real app) -->
              <div class="bb-map-mock__dock">
                <button class="bb-map-mock__fab">
                  <Icon icon="lucide:bookmark" class="text-[13px]" />
                </button>
                <button class="bb-map-mock__fab">
                  <Icon icon="lucide:star" class="text-[13px]" />
                </button>
              </div>
            </div>
            <div class="bb-mock-sheet">
              <div class="bb-mock-sheet__handle" />
              <div class="bb-mock-sheet__head">
                <span class="bb-mock-sheet__logo">
                  <Icon icon="mynaui:ambulance-solid" class="text-[16px]" />
                </span>
                <div class="bb-mock-sheet__title-wrap">
                  <p class="bb-mock-sheet__title">Ambulance PMI Sleman</p>
                  <p class="bb-mock-sheet__sub">Palang Merah Indonesia</p>
                  <div class="bb-mock-sheet__meta">
                    <span class="bb-mock-sheet__chip-a">Komunitas</span>
                    <span class="bb-mock-sheet__meta-sep">·</span>
                    <span class="bb-mock-sheet__chip-b">3 min</span>
                    <span class="bb-mock-sheet__meta-sep">·</span>
                    <span class="bb-mock-sheet__chip-c">1.2 km</span>
                  </div>
                </div>
                <span class="bb-mock-sheet__x"><Icon icon="lucide:x" class="text-[12px]" /></span>
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
                <span class="bb-mock-sheet__pill">
                  <Icon icon="lucide:share-2" class="text-[11px]" /> Share
                </span>
              </div>
              <div class="bb-mock-sheet__tabs">
                <span class="bb-mock-sheet__tab bb-mock-sheet__tab--active">Detail</span>
                <span class="bb-mock-sheet__tab">Reviews</span>
                <span class="bb-mock-sheet__tab">About</span>
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
            Sistem triase warna sesuai standar Kemenkes: Merah untuk gawat, Kuning
            urgent, Hijau non-urgent. Foto kondisi opsional, unit terbaik otomatis
            dispatch. Nomor tiket digenerate untuk share ke keluarga.
          </p>
          <ul class="bb-feat__list">
            <li><Icon icon="lucide:check" class="text-[14px]" /> Template asesmen sesuai PSC 119 / Kemenkes</li>
            <li><Icon icon="lucide:check" class="text-[14px]" /> Multi-unit dispatch: auto-cascade kalau unit pertama tolak</li>
            <li><Icon icon="lucide:check" class="text-[14px]" /> E-tiket digital dengan nomor unik untuk tracking</li>
          </ul>
          <NuxtLink to="/" class="bb-btn bb-btn--black">
            <Icon icon="lucide:arrow-up-right" class="text-[14px]" />
            Coba buat laporan
          </NuxtLink>
        </div>

        <!-- Mockup: laporan form phone -->
        <div class="bb-mock bb-mock--phone-wrap">
          <div class="bb-phone">
            <div class="bb-phone__notch" />
            <div class="bb-phone__screen">
              <div class="bb-form-mock">
                <div class="bb-form-mock__topbar">
                  <span class="bb-form-mock__topbar-mark">
                    <Icon icon="lucide:clipboard-pen" class="text-[15px]" />
                  </span>
                  <div class="bb-form-mock__topbar-copy">
                    <p class="bb-form-mock__topbar-title">Buat laporan</p>
                    <p class="bb-form-mock__topbar-sub">Isi laporan dengan benar</p>
                  </div>
                  <span class="bb-form-mock__topbar-x">
                    <Icon icon="lucide:x" class="text-[12px]" />
                  </span>
                </div>

                <div class="bb-form-mock__hero">
                  <p class="bb-form-mock__hero-eyebrow">Permintaan bantuan</p>
                  <p class="bb-form-mock__hero-name">Ambulance MPD Peduli</p>
                  <div class="bb-form-mock__hero-chips">
                    <span class="bb-form-mock__hero-chip">
                      <Icon icon="mynaui:ambulance-solid" class="text-[10px]" /> Ambulance
                    </span>
                    <span class="bb-form-mock__hero-chip">
                      <Icon icon="lucide:clock" class="text-[10px]" /> 4 min
                    </span>
                  </div>
                </div>

                <div class="bb-form-mock__section">
                  <div class="bb-form-mock__row">
                    <Icon icon="lucide:user" class="text-[13px]" style="color:#737373" />
                    <div>
                      <p class="bb-form-mock__row-label">Pelapor</p>
                      <p class="bb-form-mock__row-value">Ade Mahendra · 0878...</p>
                    </div>
                    <Icon icon="lucide:chevron-right" class="text-[12px] ml-auto" style="color:#A3A3A3" />
                  </div>
                  <div class="bb-form-mock__divider" />
                  <div class="bb-form-mock__row">
                    <Icon icon="lucide:heart-pulse" class="text-[13px]" style="color:#737373" />
                    <div>
                      <p class="bb-form-mock__row-label">Kondisi korban</p>
                      <div class="bb-form-mock__triage">
                        <span class="bb-form-mock__triage-chip bb-form-mock__triage-chip--r">
                          <span class="bb-form-mock__triage-dot" /> Merah
                        </span>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" class="text-[12px] ml-auto" style="color:#A3A3A3" />
                  </div>
                  <div class="bb-form-mock__divider" />
                  <div class="bb-form-mock__row">
                    <Icon icon="lucide:image" class="text-[13px]" style="color:#737373" />
                    <div>
                      <p class="bb-form-mock__row-label">Foto</p>
                      <p class="bb-form-mock__row-value">1 foto</p>
                    </div>
                    <Icon icon="lucide:chevron-down" class="text-[12px] ml-auto" style="color:#A3A3A3" />
                  </div>
                </div>

                <div class="bb-form-mock__footer">
                  <div class="bb-form-mock__cta">
                    <Icon icon="lucide:send-horizontal" class="text-[13px]" /> Melaporkan
                  </div>
                  <div class="bb-form-mock__cta bb-form-mock__cta--ghost">
                    Batal
                  </div>
                </div>
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
            telepon berulang bertanya "sudah sampai mana?"
          </p>
          <ul class="bb-feat__list">
            <li><Icon icon="lucide:check" class="text-[14px]" /> Screen wake-lock supaya HP petugas tidak lock</li>
            <li><Icon icon="lucide:check" class="text-[14px]" /> Polling 5 detik — pelapor lihat marker bergerak realtime</li>
            <li><Icon icon="lucide:check" class="text-[14px]" /> Auto complete saat petugas tekan "Sudah sampai"</li>
          </ul>
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
            <span class="bb-mock__url">
              <Icon icon="lucide:lock" class="text-[10px]" /> butuhbantuan.space/track/…
            </span>
          </div>
          <div class="bb-mock__body">
            <div class="bb-track-mock">
              <span class="bb-track-mock__road bb-track-mock__road--main" />
              <span class="bb-track-mock__road bb-track-mock__road--cross" />
              <svg class="bb-track-mock__route" viewBox="0 0 400 260" preserveAspectRatio="none">
                <path d="M60 240 Q 130 200 160 160 T 260 90 T 340 40" fill="none" stroke="#F97316" stroke-width="6" stroke-linecap="round" opacity="0.35" />
                <path d="M60 240 Q 130 200 160 160 T 260 90 T 340 40" fill="none" stroke="#F97316" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 6" />
              </svg>
              <!-- Destination pin -->
              <span class="bb-track-mock__end">
                <span class="bb-track-mock__end-dot" />
              </span>
              <!-- Ambulance moving -->
              <span class="bb-track-mock__amb">
                <Icon icon="mynaui:ambulance-solid" class="text-[16px]" />
              </span>
              <!-- ETA badge -->
              <div class="bb-track-mock__eta">
                <p class="bb-track-mock__eta-num">4:32</p>
                <p class="bb-track-mock__eta-lbl">menit</p>
              </div>
              <!-- Live status -->
              <div class="bb-track-mock__status">
                <span class="bb-track-mock__dot bb-track-mock__dot--live" /> GPS live · updated 2s ago
              </div>
              <!-- Bottom sheet mini status -->
              <div class="bb-track-mock__sheet">
                <div class="bb-track-mock__sheet-row">
                  <span class="bb-track-mock__sheet-status">
                    <Icon icon="lucide:navigation" class="text-[10px]" /> En route
                  </span>
                  <span class="bb-track-mock__sheet-num">TKT-2591-A</span>
                </div>
                <p class="bb-track-mock__sheet-title">Ambulance PMI Sleman menuju lokasimu</p>
                <div class="bb-track-mock__sheet-actions">
                  <span class="bb-track-mock__sheet-btn"><Icon icon="ic:baseline-whatsapp" class="text-[10px]" /> WA petugas</span>
                  <span class="bb-track-mock__sheet-btn"><Icon icon="lucide:share-2" class="text-[10px]" /> Bagikan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 4: Dashboard (mockup left) -->
    <section id="unit" class="bb-feat bb-feat--dark bb-feat--rev">
      <div class="bb-feat__inner">
        <div class="bb-feat__copy">
          <span class="bb-eyebrow bb-eyebrow--orange">UNTUK UNIT EMERGENCY</span>
          <h2 class="bb-h2 bb-h2--light">Dashboard operasional<br />yang cukup satu kali buka.</h2>
          <p class="bb-feat__body bb-feat__body--light">
            Antrian order, status unit, timeline dispatch dalam satu tampilan.
            Notifikasi via SSE + Web Push dalam hitungan detik. Auto-eskalasi
            kalau SLA lewat. Compliance tracking otomatis sesuai standar Kemenkes.
          </p>
          <ul class="bb-feat__list bb-feat__list--light">
            <li><Icon icon="lucide:check" class="text-[14px]" /> Multi-user: admin, dispatcher, petugas lapangan</li>
            <li><Icon icon="lucide:check" class="text-[14px]" /> Analytics: SLA, response time, feedback warga</li>
            <li><Icon icon="lucide:check" class="text-[14px]" /> Referensi RS SATUSEHAT Kemenkes terintegrasi</li>
          </ul>
          <a href="https://dashboard.butuhbantuan.space" class="bb-btn bb-btn--white">
            <Icon icon="lucide:arrow-up-right" class="text-[14px]" />
            Buka dashboard
          </a>
        </div>

        <!-- Dashboard mockup -->
        <div class="bb-mock bb-mock--browser bb-mock--large">
          <div class="bb-mock__chrome">
            <span class="bb-mock__dot bb-mock__dot--r" />
            <span class="bb-mock__dot bb-mock__dot--y" />
            <span class="bb-mock__dot bb-mock__dot--g" />
            <span class="bb-mock__url">
              <Icon icon="lucide:lock" class="text-[10px]" /> dashboard.butuhbantuan.space
            </span>
          </div>
          <div class="bb-mock__body bb-mock__body--dash">
            <div class="bb-dash-mock">
              <!-- Sidebar -->
              <aside class="bb-dash-mock__side">
                <div class="bb-dash-mock__side-brand">
                  <span class="bb-dash-mock__side-mark">
                    <Icon icon="mynaui:ambulance-solid" class="text-[11px]" />
                  </span>
                  butuhbantuan
                </div>
                <div class="bb-dash-mock__side-group">
                  <p class="bb-dash-mock__side-h">Ops</p>
                  <div class="bb-dash-mock__side-row bb-dash-mock__side-row--active">
                    <Icon icon="lucide:list-todo" class="text-[11px]" /> Pesanan
                    <span class="bb-dash-mock__badge">12</span>
                  </div>
                  <div class="bb-dash-mock__side-row">
                    <Icon icon="lucide:map" class="text-[11px]" /> Ops map
                  </div>
                  <div class="bb-dash-mock__side-row">
                    <Icon icon="lucide:siren" class="text-[11px]" /> SOS
                    <span class="bb-dash-mock__badge bb-dash-mock__badge--red">2</span>
                  </div>
                </div>
                <div class="bb-dash-mock__side-group">
                  <p class="bb-dash-mock__side-h">Data</p>
                  <div class="bb-dash-mock__side-row">
                    <Icon icon="lucide:hospital" class="text-[11px]" /> Referensi RS
                  </div>
                  <div class="bb-dash-mock__side-row">
                    <Icon icon="lucide:bar-chart-2" class="text-[11px]" /> Statistik
                  </div>
                  <div class="bb-dash-mock__side-row">
                    <Icon icon="lucide:message-square" class="text-[11px]" /> Feedback
                  </div>
                </div>
              </aside>

              <!-- Main content -->
              <div class="bb-dash-mock__main">
                <!-- Subheader -->
                <div class="bb-dash-mock__subhead">
                  <div>
                    <p class="bb-dash-mock__title">Pesanan Masuk</p>
                    <p class="bb-dash-mock__desc">Antrian order darurat unit kamu · Auto-refresh</p>
                  </div>
                  <div class="bb-dash-mock__subhead-actions">
                    <span class="bb-dash-mock__btn bb-dash-mock__btn--primary">
                      <Icon icon="lucide:ticket-plus" class="text-[10px]" /> Buat tiket
                    </span>
                    <span class="bb-dash-mock__btn">
                      <Icon icon="lucide:download" class="text-[10px]" /> Export
                    </span>
                    <span class="bb-dash-mock__btn">
                      <Icon icon="lucide:refresh-cw" class="text-[10px]" />
                    </span>
                  </div>
                </div>

                <!-- KPIs -->
                <div class="bb-dash-mock__kpis">
                  <div class="bb-dash-mock__kpi">
                    <p class="bb-dash-mock__kpi-l">Pending</p>
                    <p class="bb-dash-mock__kpi-v">12</p>
                  </div>
                  <div class="bb-dash-mock__kpi">
                    <p class="bb-dash-mock__kpi-l">Dispatched</p>
                    <p class="bb-dash-mock__kpi-v">8</p>
                  </div>
                  <div class="bb-dash-mock__kpi">
                    <p class="bb-dash-mock__kpi-l">Selesai hari ini</p>
                    <p class="bb-dash-mock__kpi-v">34</p>
                  </div>
                  <div class="bb-dash-mock__kpi">
                    <p class="bb-dash-mock__kpi-l">Avg SLA</p>
                    <p class="bb-dash-mock__kpi-v" style="color:#059669">4m</p>
                  </div>
                </div>

                <!-- Order rows -->
                <div class="bb-dash-mock__rows">
                  <div class="bb-dash-mock__row">
                    <span class="bb-dash-mock__row-tone bb-dash-mock__row-tone--red" />
                    <div class="bb-dash-mock__row-body">
                      <p class="bb-dash-mock__row-title">
                        <span class="bb-dash-mock__row-pill bb-dash-mock__row-pill--red">Merah</span>
                        Asma anak · Sleman
                      </p>
                      <p class="bb-dash-mock__row-sub">2 min ago · TKT-2591 · Ade M.</p>
                    </div>
                    <span class="bb-dash-mock__row-cta">Accept</span>
                    <span class="bb-dash-mock__row-cta bb-dash-mock__row-cta--ghost">Reject</span>
                  </div>
                  <div class="bb-dash-mock__row">
                    <span class="bb-dash-mock__row-tone bb-dash-mock__row-tone--amber" />
                    <div class="bb-dash-mock__row-body">
                      <p class="bb-dash-mock__row-title">
                        <span class="bb-dash-mock__row-pill bb-dash-mock__row-pill--amber">Kuning</span>
                        Kecelakaan · Kota Yogyakarta
                      </p>
                      <p class="bb-dash-mock__row-sub">5 min ago · TKT-2590 · En-route (3 min ETA)</p>
                    </div>
                    <span class="bb-dash-mock__row-cta bb-dash-mock__row-cta--ghost">
                      <Icon icon="lucide:navigation" class="text-[10px]" /> Track
                    </span>
                  </div>
                  <div class="bb-dash-mock__row">
                    <span class="bb-dash-mock__row-tone bb-dash-mock__row-tone--green" />
                    <div class="bb-dash-mock__row-body">
                      <p class="bb-dash-mock__row-title">
                        <span class="bb-dash-mock__row-pill bb-dash-mock__row-pill--green">Hijau</span>
                        Transport rutin · Bantul
                      </p>
                      <p class="bb-dash-mock__row-sub">12 min ago · TKT-2588 · Completed</p>
                    </div>
                    <span class="bb-dash-mock__row-cta bb-dash-mock__row-cta--ghost">Detail</span>
                  </div>
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
          <span class="bb-eyebrow bb-eyebrow--red">JANGKAUAN</span>
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
 * Tokens
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
  --accent-red: #D93025;
  --accent-red-soft: rgba(217, 48, 37, 0.08);

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

/* ── Nav ─────────────────────────────────────────────────────────────── */

.bb-nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: saturate(160%) blur(10px);
}
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
  color: var(--ink); letter-spacing: -0.03em;
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

/* ── Buttons ─────────────────────────────────────────────────────────── */

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
  line-height: 0.98; font-weight: 900;
  letter-spacing: -0.045em; color: var(--ink);
  max-width: 12ch;
}
.bb-h1__line { display: inline; }
@media (min-width: 900px) { .bb-h1 { max-width: 14ch; } }

.bb-hero__lede {
  margin-top: 28px; max-width: 620px;
  font-size: 17px; line-height: 1.55;
  color: var(--ink-3); font-weight: 500; letter-spacing: -0.005em;
}
.bb-hero__ctas { margin-top: 32px; display: flex; flex-wrap: wrap; gap: 10px; }
.bb-hero__note {
  margin-top: 12px;
  font-family: "Caveat", cursive;
  font-size: 18px; font-weight: 500; color: var(--ink-4);
}

.bb-kpis {
  margin-top: 56px;
  display: grid; gap: 20px;
  grid-template-columns: repeat(2, 1fr);
  padding: 22px 26px;
  border: 1px solid var(--line);
  border-radius: 16px; background: #fff;
  max-width: 780px;
}
@media (min-width: 800px) {
  .bb-kpis { grid-template-columns: 1fr 1fr 1fr 1.5fr; gap: 0; }
  .bb-kpi + .bb-kpi { border-left: 1px solid var(--line); padding-left: 22px; }
}
.bb-kpi__value {
  font-size: 30px; font-weight: 800; letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums; line-height: 1;
}
.bb-kpi__value span { font-size: 16px; color: var(--ink-4); font-weight: 500; margin-left: 3px; }
.bb-kpi__label { font-size: 12px; color: var(--ink-4); font-weight: 500; margin-top: 6px; }

.bb-kpi--live { display: flex; align-items: flex-start; gap: 10px; }
.bb-kpi__pulse {
  position: relative; margin-top: 4px;
  display: block; width: 8px; height: 8px; border-radius: 9999px;
  background: #10B981; flex-shrink: 0;
}
.bb-kpi__ping {
  position: absolute; inset: 0;
  border-radius: 9999px; background: #10B981;
  animation: bb-ping 1.8s ease-out infinite;
}
@keyframes bb-ping { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(2.6); opacity: 0; } }
.bb-kpi__label--top { text-transform: uppercase; letter-spacing: 0.04em; color: #10B981; font-size: 10.5px; margin-top: 0; }
.bb-kpi__ticker {
  font-size: 12.5px; color: var(--ink-2); font-weight: 500;
  margin-top: 3px; line-height: 1.35;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.bb-live-enter-active, .bb-live-leave-active {
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.22s;
}
.bb-live-enter-from { transform: translateY(6px); opacity: 0; }
.bb-live-leave-to { transform: translateY(-6px); opacity: 0; }

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
.bb-feat--dark { background: var(--ink); color: #fff; }
.bb-feat__inner {
  max-width: 1200px; margin: 0 auto;
  display: grid; gap: 40px; grid-template-columns: 1fr;
  align-items: center;
}
@media (min-width: 900px) {
  .bb-feat { padding: 128px 24px; }
  .bb-feat__inner { grid-template-columns: 0.95fr 1.1fr; gap: 72px; }
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
.bb-eyebrow--red { background-image: linear-gradient(90deg, #EF4444, #D93025); }
.bb-eyebrow--purple { background-image: linear-gradient(90deg, #8B5CF6, #6366F1); }
.bb-eyebrow--teal { background-image: linear-gradient(90deg, #06B6D4, #10B981); }
.bb-eyebrow--orange { background-image: linear-gradient(90deg, #F97316, #EF4444); }

.bb-h2 {
  margin-top: 18px;
  font-size: clamp(30px, 4.6vw, 52px);
  line-height: 1.02; font-weight: 900;
  letter-spacing: -0.035em; color: var(--ink);
}
.bb-h2--light { color: #fff; }
.bb-feat__body {
  margin-top: 22px; max-width: 500px;
  font-size: 16px; line-height: 1.6;
  color: var(--ink-3); font-weight: 500;
}
.bb-feat__body--light { color: rgba(255,255,255,0.65); }
.bb-feat__body--wide { max-width: 620px; margin: 22px auto 0; }
.bb-feat__list {
  margin-top: 20px; max-width: 500px;
  display: flex; flex-direction: column; gap: 8px;
}
.bb-feat__list li {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; color: var(--ink-2); font-weight: 500;
}
.bb-feat__list li .iconify { color: #10B981; flex-shrink: 0; }
.bb-feat__list--light li { color: rgba(255,255,255,0.75); }
.bb-feat__list--light li .iconify { color: #34D399; }
.bb-feat__copy .bb-btn { margin-top: 28px; }

/* ── Mockup: browser frame ───────────────────────────────────────────── */

.bb-mock {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 30px 60px -25px rgba(10, 10, 10, 0.2);
}
.bb-mock--large { box-shadow: 0 40px 80px -30px rgba(10, 10, 10, 0.35); }
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
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--ink-4); font-weight: 500;
  padding: 4px 14px; background: #fff; border-radius: 6px;
  border: 1px solid var(--line);
}
.bb-mock__body { position: relative; aspect-ratio: 5 / 3.4; background: #fff; }
.bb-mock__body--dash { aspect-ratio: 5 / 3.2; }

/* Map mock */
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
  position: absolute; background: #F5D0A9; transform-origin: 0 50%;
}
.bb-map-mock__road--a { top: 35%; left: -5%; width: 110%; height: 5px; transform: rotate(6deg); }
.bb-map-mock__road--b { top: 65%; left: -5%; width: 110%; height: 3px; transform: rotate(-4deg); background: #ECD5B2; }
.bb-map-mock__road--c { top: -10%; left: 45%; width: 4px; height: 130%; background: #ECD5B2; transform: rotate(15deg); }
.bb-map-mock__unit {
  position: absolute; width: 24px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; transform: translate(-50%, -100%);
  clip-path: polygon(50% 100%, 0 50%, 0 0, 100% 0, 100% 50%);
  border-radius: 50% 50% 8% 8% / 40% 40% 12% 12%;
  box-shadow: 0 3px 8px rgba(10, 10, 10, 0.3);
}
.bb-map-mock__unit--amb { background: #D93025; }
.bb-map-mock__unit--fire { background: #EF4444; }
.bb-map-mock__unit--hosp { background: #8B5CF6; }
.bb-map-mock__unit--sar { background: #F97316; }
.bb-map-mock__unit--pmi { background: #EC4899; }
.bb-map-mock__user {
  position: absolute; top: 68%; left: 40%;
  width: 12px; height: 12px; border-radius: 9999px;
  background: #2563EB; border: 3px solid #fff;
  box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.15);
  transform: translate(-50%, -50%);
}
.bb-map-mock__dock {
  position: absolute; right: 10px; bottom: 130px;
  display: flex; flex-direction: column; gap: 6px;
}
.bb-map-mock__fab {
  width: 32px; height: 32px; border-radius: 9999px;
  background: #fff; border: 1px solid var(--line);
  color: var(--ink-3);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 8px rgba(10, 10, 10, 0.08);
}

/* Detail sheet mock — closely matches the real DetailSheet */
.bb-mock-sheet {
  position: absolute; left: 0; right: 0; bottom: 0;
  background: #fff;
  padding: 8px 14px 12px;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -10px 20px rgba(10, 10, 10, 0.06);
}
.bb-mock-sheet__handle { width: 32px; height: 4px; border-radius: 9999px; background: var(--line-2); margin: 0 auto 10px; }
.bb-mock-sheet__head { display: flex; align-items: flex-start; gap: 10px; }
.bb-mock-sheet__logo {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(217, 48, 37, 0.1); color: var(--accent-red);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bb-mock-sheet__title-wrap { flex: 1; min-width: 0; }
.bb-mock-sheet__title { font-size: 14px; font-weight: 700; color: var(--ink); letter-spacing: -0.02em; line-height: 1.2; }
.bb-mock-sheet__sub { font-size: 11px; color: var(--ink-4); font-weight: 500; margin-top: 1px; }
.bb-mock-sheet__x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 9999px;
  background: var(--bg-chip); color: var(--ink-4);
  flex-shrink: 0;
}
.bb-mock-sheet__meta {
  margin-top: 4px;
  font-size: 11px; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
  flex-wrap: wrap;
}
.bb-mock-sheet__meta-sep { color: var(--ink-5); }
.bb-mock-sheet__chip-a { color: #1a73e8; }
.bb-mock-sheet__chip-b { color: #10B981; }
.bb-mock-sheet__chip-c { color: var(--ink-4); }
.bb-mock-sheet__pills {
  margin-top: 10px;
  display: flex; gap: 6px; overflow: hidden;
}
.bb-mock-sheet__pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 10px; border-radius: 9999px;
  font-size: 11px; font-weight: 600; color: var(--ink);
  border: 1px solid var(--line); background: #fff;
  white-space: nowrap;
}
.bb-mock-sheet__pill--primary { background: var(--accent-red); color: #fff; border-color: transparent; }
.bb-mock-sheet__tabs {
  margin-top: 10px; padding-top: 8px;
  border-top: 1px solid var(--line);
  display: flex; gap: 18px;
}
.bb-mock-sheet__tab {
  font-size: 11px; font-weight: 500; color: var(--ink-4);
  padding-bottom: 4px;
}
.bb-mock-sheet__tab--active { color: var(--accent-red); font-weight: 700; border-bottom: 2px solid var(--accent-red); }

/* ── Mockup: phone frame + form ──────────────────────────────────────── */

.bb-mock--phone-wrap {
  border: none; background: transparent; box-shadow: none;
  display: flex; justify-content: center;
}
.bb-phone {
  width: 310px;
  aspect-ratio: 310 / 640;
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
  width: 82px; height: 22px;
  border-radius: 9999px; background: #0A0A0A;
  z-index: 2;
}
.bb-phone__screen {
  position: relative; width: 100%; height: 100%;
  border-radius: 32px; overflow: hidden;
  background: #F7F7F8;
}

/* OrderFormSheet mockup — mirrors real UI */
.bb-form-mock {
  padding: 46px 14px 14px;
  height: 100%; display: flex; flex-direction: column; gap: 10px;
}
.bb-form-mock__topbar {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px 8px 8px;
  background: #fff; border-radius: 14px;
  border-bottom: 1px solid var(--line);
}
.bb-form-mock__topbar-mark {
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--accent-red-soft); color: var(--accent-red);
  display: flex; align-items: center; justify-content: center;
}
.bb-form-mock__topbar-copy { flex: 1; min-width: 0; }
.bb-form-mock__topbar-title { font-size: 13px; font-weight: 700; letter-spacing: -0.02em; }
.bb-form-mock__topbar-sub { font-size: 10.5px; color: var(--ink-4); font-weight: 500; margin-top: 1px; }
.bb-form-mock__topbar-x {
  width: 24px; height: 24px; border-radius: 9999px;
  background: var(--bg-chip); color: var(--ink-4);
  display: flex; align-items: center; justify-content: center;
}
.bb-form-mock__hero {
  padding: 12px; border-radius: 12px;
  background: #fff; text-align: center;
  border: 1px solid var(--line);
}
.bb-form-mock__hero-eyebrow { font-size: 10.5px; color: var(--ink-4); font-weight: 500; }
.bb-form-mock__hero-name {
  margin-top: 4px;
  font-size: 16px; font-weight: 800; letter-spacing: -0.025em;
}
.bb-form-mock__hero-chips {
  margin-top: 8px; display: flex; gap: 6px; justify-content: center;
}
.bb-form-mock__hero-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 9999px;
  font-size: 10px; font-weight: 600;
  background: var(--bg-chip); color: var(--ink-2);
  border: 1px solid var(--line);
}
.bb-form-mock__section {
  background: #fff; border-radius: 12px;
  border: 1px solid var(--line);
  overflow: hidden;
}
.bb-form-mock__row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
}
.bb-form-mock__row-label { font-size: 10px; color: var(--ink-4); font-weight: 500; }
.bb-form-mock__row-value { font-size: 12.5px; font-weight: 700; letter-spacing: -0.01em; }
.bb-form-mock__divider { height: 1px; background: var(--line); margin: 0 12px; }
.bb-form-mock__triage {
  display: flex; gap: 4px; margin-top: 2px;
}
.bb-form-mock__triage-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 9999px;
  font-size: 11px; font-weight: 700;
}
.bb-form-mock__triage-chip--r { background: rgba(217, 48, 37, 0.1); color: var(--accent-red); border: 1px solid rgba(217, 48, 37, 0.2); }
.bb-form-mock__triage-dot { width: 6px; height: 6px; border-radius: 9999px; background: var(--accent-red); }
.bb-form-mock__footer {
  margin-top: auto;
  display: grid; grid-template-columns: 1.5fr 1fr; gap: 6px;
}
.bb-form-mock__cta {
  padding: 10px; border-radius: 10px;
  background: var(--accent-red); color: #fff;
  font-size: 12px; font-weight: 600; text-align: center;
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
}
.bb-form-mock__cta--ghost {
  background: #fff; color: var(--ink); border: 1px solid var(--line);
}

/* ── Mockup: live tracking ────────────────────────────────────────────── */

.bb-track-mock {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, #DCECF6 0%, #E7F0E4 55%, #E0E6D0 100%);
  overflow: hidden;
}
.bb-track-mock__road--main {
  position: absolute; top: 55%; left: -5%; width: 110%; height: 4px;
  background: #F5D0A9; transform: rotate(-3deg);
}
.bb-track-mock__road--cross {
  position: absolute; top: -10%; left: 55%; width: 3px; height: 130%;
  background: #ECD5B2; transform: rotate(10deg);
}
.bb-track-mock__route { position: absolute; inset: 0; width: 100%; height: 100%; }
.bb-track-mock__end {
  position: absolute; top: 12%; left: 82%;
  width: 28px; height: 28px;
  border-radius: 8px 8px 8px 3px;
  background: var(--accent-red); transform: rotate(-45deg);
  box-shadow: 0 4px 12px rgba(217, 48, 37, 0.4);
}
.bb-track-mock__end-dot {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 10px; height: 10px; border-radius: 9999px; background: #fff;
}
.bb-track-mock__amb {
  position: absolute; top: 60%; left: 40%;
  width: 34px; height: 34px; border-radius: 10px;
  background: var(--accent-red); color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 16px rgba(217, 48, 37, 0.4);
  transform: translate(-50%, -50%);
  animation: bb-amb-move 4.5s ease-in-out infinite;
  z-index: 3;
}
@keyframes bb-amb-move {
  0%, 100% { top: 60%; left: 40%; }
  50%      { top: 42%; left: 60%; }
}
.bb-track-mock__eta {
  position: absolute; top: 16px; left: 16px;
  padding: 10px 14px; border-radius: 12px;
  background: #fff; border: 1px solid var(--line);
  box-shadow: 0 6px 14px rgba(10, 10, 10, 0.08);
}
.bb-track-mock__eta-num { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.bb-track-mock__eta-lbl { font-size: 10.5px; color: var(--ink-4); font-weight: 500; margin-top: 2px; }
.bb-track-mock__status {
  position: absolute; top: 16px; right: 16px;
  padding: 6px 12px; border-radius: 9999px;
  background: rgba(10, 10, 10, 0.8); color: #fff;
  font-size: 11px; font-weight: 500;
  display: inline-flex; align-items: center; gap: 8px;
}
.bb-track-mock__dot--live {
  width: 6px; height: 6px; border-radius: 9999px; background: #10B981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
}
.bb-track-mock__sheet {
  position: absolute; left: 12px; right: 12px; bottom: 12px;
  padding: 10px 12px;
  background: #fff; border-radius: 12px;
  border: 1px solid var(--line);
  box-shadow: 0 10px 20px rgba(10, 10, 10, 0.08);
}
.bb-track-mock__sheet-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}
.bb-track-mock__sheet-status {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 9999px;
  background: rgba(37, 99, 235, 0.1); color: #2563EB;
  font-size: 10.5px; font-weight: 700;
}
.bb-track-mock__sheet-num { font-size: 10.5px; font-weight: 500; color: var(--ink-4); font-variant-numeric: tabular-nums; }
.bb-track-mock__sheet-title { font-size: 12.5px; font-weight: 700; letter-spacing: -0.015em; }
.bb-track-mock__sheet-actions {
  margin-top: 8px; display: flex; gap: 6px;
}
.bb-track-mock__sheet-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 9999px;
  border: 1px solid var(--line); background: #fff;
  font-size: 10.5px; font-weight: 600;
}

/* ── Dashboard mockup ────────────────────────────────────────────────── */

.bb-dash-mock {
  position: absolute; inset: 0;
  display: grid; grid-template-columns: 132px 1fr;
  background: var(--bg-tint);
}
.bb-dash-mock__side {
  background: #fff; border-right: 1px solid var(--line);
  padding: 14px 10px;
  display: flex; flex-direction: column; gap: 14px;
}
.bb-dash-mock__side-brand {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; letter-spacing: -0.02em;
  padding: 4px 6px;
}
.bb-dash-mock__side-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--ink); color: #fff;
}
.bb-dash-mock__side-group {
  display: flex; flex-direction: column; gap: 2px;
}
.bb-dash-mock__side-h {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-4);
  padding: 0 6px 2px;
}
.bb-dash-mock__side-row {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 6px; border-radius: 6px;
  font-size: 11px; font-weight: 500; color: var(--ink-3);
}
.bb-dash-mock__side-row--active { background: var(--bg-chip); color: var(--ink); font-weight: 600; }
.bb-dash-mock__badge {
  margin-left: auto;
  min-width: 16px; height: 15px;
  padding: 0 4px; border-radius: 9999px;
  background: var(--ink); color: #fff;
  font-size: 9px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.bb-dash-mock__badge--red { background: var(--accent-red); }

.bb-dash-mock__main { padding: 14px; overflow: hidden; display: flex; flex-direction: column; gap: 10px; }
.bb-dash-mock__subhead {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px;
}
.bb-dash-mock__title { font-size: 15px; font-weight: 800; letter-spacing: -0.02em; }
.bb-dash-mock__desc { margin-top: 2px; font-size: 10.5px; color: var(--ink-4); font-weight: 500; }
.bb-dash-mock__subhead-actions { display: flex; gap: 4px; }
.bb-dash-mock__btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 8px; border-radius: 6px;
  background: #fff; border: 1px solid var(--line);
  font-size: 10px; font-weight: 600; color: var(--ink);
}
.bb-dash-mock__btn--primary { background: var(--ink); color: #fff; border-color: transparent; }

.bb-dash-mock__kpis {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
}
.bb-dash-mock__kpi {
  padding: 8px 10px; border-radius: 8px;
  background: #fff; border: 1px solid var(--line);
}
.bb-dash-mock__kpi-l { font-size: 9.5px; color: var(--ink-4); font-weight: 500; }
.bb-dash-mock__kpi-v { margin-top: 2px; font-size: 18px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }

.bb-dash-mock__rows { display: flex; flex-direction: column; gap: 6px; }
.bb-dash-mock__row {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px 8px 14px;
  background: #fff; border: 1px solid var(--line); border-radius: 8px;
}
.bb-dash-mock__row-tone {
  position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px;
  border-radius: 0 3px 3px 0;
}
.bb-dash-mock__row-tone--red { background: var(--accent-red); }
.bb-dash-mock__row-tone--amber { background: #F59E0B; }
.bb-dash-mock__row-tone--green { background: #10B981; }
.bb-dash-mock__row-body { min-width: 0; flex: 1; }
.bb-dash-mock__row-title {
  font-size: 11.5px; font-weight: 700; letter-spacing: -0.01em;
  display: inline-flex; align-items: center; gap: 6px;
}
.bb-dash-mock__row-sub { font-size: 9.5px; color: var(--ink-4); font-weight: 500; margin-top: 2px; }
.bb-dash-mock__row-pill {
  padding: 2px 6px; border-radius: 4px;
  font-size: 9px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.03em;
}
.bb-dash-mock__row-pill--red { background: rgba(217, 48, 37, 0.12); color: var(--accent-red); }
.bb-dash-mock__row-pill--amber { background: rgba(245, 158, 11, 0.15); color: #B45309; }
.bb-dash-mock__row-pill--green { background: rgba(16, 185, 129, 0.15); color: #047857; }
.bb-dash-mock__row-cta {
  padding: 4px 10px; border-radius: 6px;
  background: var(--ink); color: #fff;
  font-size: 10px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 4px;
}
.bb-dash-mock__row-cta--ghost {
  background: transparent; color: var(--ink-2);
  border: 1px solid var(--line);
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
.bb-map__dot--full { background: var(--accent-red); border-color: var(--accent-red); }
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
.bb-badge--full { background: var(--accent-red-soft); color: var(--accent-red); }
.bb-badge--pilot { background: var(--bg-chip); color: var(--ink-2); }
.bb-island__body { font-size: 13.5px; color: var(--ink-3); line-height: 1.55; }
.bb-island__cities { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
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
  font-size: 22px; color: rgba(255, 255, 255, 0.7);
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
