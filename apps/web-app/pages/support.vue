<script setup lang="ts">
/**
 * /support — help centre: emergency numbers first, quick paths, searchable
 * FAQ grouped by audience, and a contact form. There is no support backend,
 * so the form composes a mailto: to SUPPORT_EMAIL.
 *
 * Deep links: `#privasi` opens the privacy FAQ tab; `#kerja-sama` lands on
 * the sponsorship packages; `?topik=unit#kontak` pre-selects a form topic.
 */
import { Icon } from "@iconify/vue";
import {
  EMERGENCY_NUMBERS,
  FAQ_CATEGORIES,
  FAQS,
  SUPPORT_EMAIL,
  type FaqCategory,
  type Tone,
} from "~/utils/landingContent";

definePageMeta({ layout: false });

const title = "Pusat bantuan";
const description =
  "Jawaban untuk warga dan unit emergency: cara melapor, cek status tiket, privasi data, dan cara menghubungi tim ButuhBantuan.";

useHead({
  title: `${title} · ButuhBantuan`,
  meta: [
    { name: "description", content: description },
    { property: "og:title", content: `${title} · ButuhBantuan` },
    { property: "og:description", content: description },
  ],
});

const route = useRoute();
const linkComponent = resolveComponent("NuxtLink");

// ── FAQ search + tabs ─────────────────────────────────────────────────────
const query = ref("");
const category = ref<FaqCategory | "semua">("semua");
const openFaq = ref<string | null>(null);

const tabs = [{ id: "semua" as const, label: "Semua" }, ...FAQ_CATEGORIES];

const filteredFaqs = computed(() => {
  const q = query.value.trim().toLowerCase();
  return FAQS.filter((f) => {
    if (!q && category.value !== "semua" && f.category !== category.value) return false;
    if (!q) return true;
    return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
  });
});

function toggleFaq(q: string) {
  openFaq.value = openFaq.value === q ? null : q;
}

function countFor(id: FaqCategory | "semua") {
  return id === "semua" ? FAQS.length : FAQS.filter((f) => f.category === id).length;
}

const faqSection = ref<HTMLElement | null>(null);

function openCategory(id: FaqCategory) {
  query.value = "";
  category.value = id;
  faqSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function submitSearch() {
  faqSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Contact form (mailto) ─────────────────────────────────────────────────
const roles = ["Warga", "Unit emergency", "Pemerintah / Dinkes", "Sponsor / mitra", "Lainnya"];
const topics = [
  { id: "umum", label: "Pertanyaan umum" },
  { id: "bug", label: "Masalah di aplikasi" },
  { id: "unit", label: "Pendaftaran unit" },
  { id: "mitra", label: "Kemitraan / sponsor" },
  { id: "privasi", label: "Privasi data" },
];

const form = reactive({
  name: "",
  role: roles[0],
  topic: "umum",
  ticket: "",
  message: "",
});
const errors = reactive<{ name?: string; message?: string }>({});
const sent = ref(false);

function validate() {
  errors.name = form.name.trim() ? undefined : "Tulis nama kamu.";
  const msg = form.message.trim();
  errors.message = !msg
    ? "Tulis pesan yang ingin disampaikan."
    : msg.length < 15
      ? "Pesan terlalu singkat — ceritakan sedikit lebih detail."
      : undefined;
  return !errors.name && !errors.message;
}

const mailtoHref = computed(() => {
  const topic = topics.find((t) => t.id === form.topic)?.label ?? "Pertanyaan";
  const subject = `[${topic}] ${form.name.trim() || "Pesan dari pusat bantuan"}`;
  const lines = [
    form.message.trim(),
    "",
    "—",
    `Nama: ${form.name.trim()}`,
    `Sebagai: ${form.role}`,
    form.ticket.trim() ? `Nomor tiket: ${form.ticket.trim()}` : "",
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "");
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
});

function onSubmit() {
  if (!validate()) return;
  window.location.href = mailtoHref.value;
  sent.value = true;
}

const copied = ref(false);
async function copyEmail() {
  try {
    await navigator.clipboard.writeText(SUPPORT_EMAIL);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {
    /* clipboard blocked — the address is visible anyway */
  }
}

onMounted(() => {
  if (route.hash === "#privasi") category.value = "privasi";
  const t = String(route.query.topik ?? "");
  if (topics.some((x) => x.id === t)) {
    form.topic = t;
    if (t === "unit") form.role = "Unit emergency";
  }
});

const quickPaths: {
  icon: string;
  title: string;
  body: string;
  tone: Tone;
  to?: string;
  href?: string;
  category?: FaqCategory;
}[] = [
  {
    icon: "lucide:ticket",
    title: "Cek status tiket",
    body: "Masukkan nomor HP dan kode OTP untuk melihat laporanmu.",
    tone: "sky",
    to: "/my-tickets",
  },
  {
    icon: "mynaui:ambulance-solid",
    title: "Bantuan untuk unit",
    body: "Cara bergabung, batas waktu respons, dan dashboard unit.",
    tone: "red",
    category: "unit",
  },
  {
    icon: "lucide:handshake",
    title: "Kerja sama & sponsor",
    body: "Bantu biaya server dan perluasan layanan.",
    tone: "amber",
    href: "#kerja-sama",
  },
  {
    icon: "lucide:message-circle",
    title: "Hubungi tim",
    body: "Tidak menemukan jawabannya? Kirim pesan ke kami.",
    tone: "green",
    href: "#kontak",
  },
];

// ── Sponsorship ───────────────────────────────────────────────────────────
const fundedCosts: { icon: string; title: string; body: string; tone: Tone }[] = [
  {
    icon: "lucide:server",
    title: "Server & database",
    body: "Menjaga aplikasi tetap menyala 24 jam, termasuk saat trafik melonjak ketika bencana.",
    tone: "sky",
  },
  {
    icon: "lucide:map",
    title: "Peta & rute",
    body: "Pencarian alamat dan perhitungan rute untuk perkiraan waktu tiba.",
    tone: "green",
  },
  {
    icon: "lucide:bell-ring",
    title: "Notifikasi",
    body: "Kabar ke warga dan petugas di setiap tahap laporan.",
    tone: "amber",
  },
  {
    icon: "lucide:badge-check",
    title: "Onboarding unit",
    body: "Verifikasi dan pendampingan unit baru supaya data di peta bisa dipercaya.",
    tone: "rose",
  },
];

type Package = {
  id: string;
  icon: string;
  title: string;
  body: string;
  tone: Tone;
  featured?: boolean;
  benefits: string[];
};

const packages: Package[] = [
  {
    id: "infrastruktur",
    icon: "lucide:server",
    title: "Sponsor infrastruktur",
    body: "Tanggung biaya server, peta, atau notifikasi untuk periode tertentu.",
    tone: "sky",
    benefits: [
      "Logo di aplikasi (menu & halaman dukungan) dan website",
      "Laporan dampak bulanan: laporan tertangani & waktu respons",
      "Disebut di pengumuman dan media sosial kami",
    ],
  },
  {
    id: "wilayah",
    icon: "lucide:map-pinned",
    title: "Sponsor wilayah",
    body: "Danai perluasan layanan di satu kabupaten/kota: pendataan unit, verifikasi, dan edukasi warga.",
    tone: "red",
    featured: true,
    benefits: [
      "Semua benefit sponsor infrastruktur",
      "Disebut sebagai pendukung di wilayah tersebut",
      "Laporan dampak khusus wilayah",
      "Kampanye edukasi warga bersama",
    ],
  },
  {
    id: "in-kind",
    icon: "lucide:gift",
    title: "Mitra non-tunai",
    body: "Dukungan dalam bentuk kredit cloud, gateway SMS/WhatsApp, data, atau tenaga relawan.",
    tone: "green",
    benefits: [
      "Tercantum sebagai mitra teknologi",
      "Laporan pemakaian layanan yang didukung",
      "Ruang diskusi rutin dengan tim produk",
    ],
  },
];

const promises = [
  "Sponsor tidak memengaruhi urutan unit yang disarankan ke warga.",
  "Tidak ada iklan di alur darurat — logo hanya tampil di menu, halaman dukungan, dan website.",
  "Data warga tidak pernah dibagikan ke sponsor.",
];

function startPartnership(pkg: Package) {
  form.topic = "mitra";
  form.role = "Sponsor / mitra";
  if (!form.message.trim()) {
    form.message = `Halo, kami tertarik dengan paket ${pkg.title}. Boleh minta info lebih lanjut?`;
  }
  document.getElementById("kontak")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <LandingShell>
    <!-- ================= HERO + SEARCH ================= -->
    <section class="relative pb-14 pt-36 sm:pt-44">
      <div aria-hidden="true" class="support-backdrop pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div class="lp-container relative text-center">
        <span class="lp-eyebrow" data-reveal>Pusat bantuan</span>
        <h1 class="lp-display mx-auto mt-6 max-w-[14ch]" data-reveal style="--d: 80ms">Ada yang bisa kami bantu?</h1>
        <p class="lp-lead mx-auto mt-5 max-w-[48ch]" data-reveal style="--d: 160ms">
          Cari jawaban seputar laporan, tiket, unit, dan privasi data.
        </p>

        <form role="search" class="mx-auto mt-9 max-w-[560px]" data-reveal style="--d: 240ms" @submit.prevent="submitSearch">
          <label for="support-search" class="sr-only">Cari pertanyaan</label>
          <div class="search-box flex h-14 items-center gap-3 rounded-full bg-white pl-5 pr-2">
            <Icon icon="lucide:search" class="shrink-0 text-[19px] text-[var(--lp-faint)]" />
            <input
              id="support-search"
              v-model="query"
              type="search"
              autocomplete="off"
              placeholder="Contoh: lokasi tidak akurat"
              class="h-full min-w-0 flex-1 bg-transparent text-[15.5px] text-[var(--lp-ink)] placeholder:text-[var(--lp-faint)] focus:outline-none"
            />
            <button type="submit" class="lp-btn lp-btn--ink lp-btn--sm shrink-0">Cari</button>
          </div>
        </form>
      </div>
    </section>

    <!-- ================= EMERGENCY ================= -->
    <section class="pb-6">
      <div class="lp-container">
        <div class="emergency-card grid gap-6 rounded-[28px] p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-10" data-reveal>
          <div class="flex gap-4">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--lp-accent)] text-white">
              <Icon icon="lucide:siren" class="text-[22px]" />
            </span>
            <div>
              <h2 class="text-[19px] font-semibold">Sedang dalam keadaan darurat?</h2>
              <p class="mt-1 max-w-[52ch] text-[15px] leading-[1.6] text-[var(--lp-ink-2)]">
                Jangan menunggu balasan dari kami. Telepon nomor darurat sekarang,
                atau buka aplikasi untuk mencari unit terdekat.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 lg:justify-end">
            <a
              v-for="n in EMERGENCY_NUMBERS"
              :key="n.number"
              :href="`tel:${n.number}`"
              class="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13.5px] text-[var(--lp-ink-2)] shadow-[0_0_0_1px_rgba(220,38,38,0.15)] transition-colors hover:bg-red-50"
              :aria-label="`Telepon ${n.number}, ${n.label}`"
            >
              <Icon icon="lucide:phone" class="text-[13px] text-[var(--lp-accent)]" />
              <span class="lp-mono font-medium text-[var(--lp-ink)]">{{ n.number }}</span>
              {{ n.label }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= QUICK PATHS ================= -->
    <section class="pb-24 pt-6 lg:pb-32">
      <div class="lp-container">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <component
            :is="p.to ? linkComponent : p.href ? 'a' : 'button'"
            v-for="(p, i) in quickPaths"
            :key="p.title"
            :to="p.to"
            :href="p.href"
            :type="!p.to && !p.href ? 'button' : undefined"
            class="quick-path group flex flex-col rounded-[24px] bg-[var(--lp-surface)] p-6 text-left"
            :class="`lp-tone-${p.tone}`"
            data-reveal
            :style="{ '--d': `${i * 70}ms` }"
            @click="p.category && openCategory(p.category)"
          >
            <span class="lp-well">
              <Icon :icon="p.icon" class="text-[19px]" />
            </span>
            <span class="mt-8 flex items-center justify-between gap-2 text-[16.5px] font-semibold tracking-[-0.015em]">
              {{ p.title }}
              <Icon icon="lucide:arrow-right" class="quick-path-arrow text-[16px] text-[var(--lp-faint)]" />
            </span>
            <span class="mt-1.5 text-[14px] leading-[1.55] text-[var(--lp-muted)]">{{ p.body }}</span>
          </component>
        </div>
      </div>
    </section>

    <!-- ================= SPONSORSHIP ================= -->
    <section id="kerja-sama" class="border-t border-[var(--lp-line)] py-24 lg:py-32">
      <div class="lp-container">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div data-reveal>
            <span class="lp-eyebrow">Kerja sama</span>
            <h2 class="lp-h2 mt-4 max-w-[16ch]">Bantu layanan ini tetap gratis untuk semua orang.</h2>
          </div>
          <p class="lp-lead max-w-[46ch]" data-reveal style="--d: 100ms">
            ButuhBantuan gratis untuk warga — tapi server, peta, dan notifikasi
            tetap ada biayanya. Lewat kerja sama, perusahaan, komunitas, dan
            instansi bisa ikut menanggungnya.
          </p>
        </div>

        <!-- Where the money goes -->
        <h3 class="mt-14 text-[13px] font-semibold text-[var(--lp-muted)]" data-reveal>Ke mana dukunganmu dipakai</h3>
        <ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="(c, i) in fundedCosts"
            :key="c.title"
            class="lp-card lp-tint rounded-[24px] p-6"
            :class="`lp-tone-${c.tone}`"
            data-reveal
            :style="{ '--d': `${i * 70}ms` }"
          >
            <span class="lp-well bg-white"><Icon :icon="c.icon" class="text-[19px]" /></span>
            <h4 class="mt-6 text-[16px] font-semibold">{{ c.title }}</h4>
            <p class="mt-1.5 text-[14px] leading-[1.55] text-[var(--lp-muted)]">{{ c.body }}</p>
          </li>
        </ul>

        <!-- Packages -->
        <div class="mt-16 grid gap-4 lg:grid-cols-3">
          <article
            v-for="(pkg, i) in packages"
            :key="pkg.id"
            class="package relative flex flex-col rounded-[28px] bg-white p-7 sm:p-8"
            :class="[`lp-tone-${pkg.tone}`, pkg.featured && 'package--featured']"
            data-reveal
            :style="{ '--d': `${i * 80}ms` }"
          >
            <span v-if="pkg.featured" class="package-flag">Paling berdampak</span>
            <span class="lp-well"><Icon :icon="pkg.icon" class="text-[20px]" /></span>
            <h3 class="mt-6 text-[20px] font-semibold tracking-[-0.02em]">{{ pkg.title }}</h3>
            <p class="mt-2 text-[14.5px] leading-[1.6] text-[var(--lp-muted)]">{{ pkg.body }}</p>
            <ul class="mt-6 space-y-3 border-t border-[var(--lp-line)] pt-6">
              <li v-for="b in pkg.benefits" :key="b" class="flex gap-2.5 text-[14px] leading-[1.5]">
                <Icon icon="lucide:check" class="mt-[3px] shrink-0 text-[15px] text-[var(--tone)]" />
                {{ b }}
              </li>
            </ul>
            <button
              type="button"
              class="lp-btn mt-8 w-full"
              :class="pkg.featured ? 'lp-btn--accent' : 'lp-btn--ghost'"
              @click="startPartnership(pkg)"
            >
              Ajukan kerja sama
            </button>
          </article>
        </div>

        <!-- Promises -->
        <div class="mt-4 grid gap-6 rounded-[28px] bg-[var(--lp-ink)] p-7 text-white sm:p-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-center" data-reveal>
          <div class="flex items-center gap-4">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Icon icon="lucide:shield-check" class="text-[20px] text-emerald-400" />
            </span>
            <div class="text-[19px] font-semibold leading-snug tracking-[-0.02em]">
              <h3>Janji kami ke warga</h3>
            </div>
          </div>
          <ul class="space-y-3">
            <li v-for="pr in promises" :key="pr" class="flex gap-3 text-[14.5px] leading-[1.55] text-white/80">
              <Icon icon="lucide:check" class="mt-[3px] shrink-0 text-[15px] text-emerald-400" />
              {{ pr }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ================= FAQ ================= -->
    <section id="faq" ref="faqSection" class="border-t border-[var(--lp-line)] py-24 lg:py-32">
      <span id="privasi" aria-hidden="true" />
      <div class="lp-container grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div class="lg:sticky lg:top-28 lg:self-start">
          <span class="lp-eyebrow">FAQ</span>
          <h2 class="lp-h2 mt-4 max-w-[12ch]">Pertanyaan umum.</h2>

          <div class="mt-8 flex flex-wrap gap-1.5 lg:flex-col lg:items-start" role="tablist" aria-label="Kategori pertanyaan">
            <button
              v-for="t in tabs"
              :key="t.id"
              type="button"
              role="tab"
              :aria-selected="!query && category === t.id"
              class="flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium transition-colors duration-200"
              :class="
                !query && category === t.id
                  ? 'bg-[var(--lp-ink)] text-white'
                  : 'bg-[var(--lp-surface)] text-[var(--lp-muted)] hover:text-[var(--lp-ink)] lg:bg-transparent'
              "
              @click="(query = ''), (category = t.id)"
            >
              {{ t.label }}
              <span class="lp-mono text-[11.5px] opacity-60">{{ countFor(t.id) }}</span>
            </button>
          </div>
        </div>

        <div>
          <p v-if="query.trim()" class="mb-5 text-[14px] text-[var(--lp-muted)]" aria-live="polite">
            {{ filteredFaqs.length }} hasil untuk
            <span class="font-semibold text-[var(--lp-ink)]">“{{ query.trim() }}”</span>
            <button type="button" class="ml-2 underline underline-offset-4 hover:text-[var(--lp-ink)]" @click="query = ''">Hapus</button>
          </p>

          <div v-if="filteredFaqs.length" class="border-t border-[var(--lp-line)]">
            <div v-for="(f, i) in filteredFaqs" :key="f.q" class="border-b border-[var(--lp-line)]">
              <h3>
                <button
                  :id="`sfaq-q-${i}`"
                  type="button"
                  class="flex w-full items-start justify-between gap-6 py-6 text-left"
                  :aria-expanded="openFaq === f.q"
                  :aria-controls="`sfaq-a-${i}`"
                  @click="toggleFaq(f.q)"
                >
                  <span class="text-[16.5px] font-semibold tracking-[-0.015em] sm:text-[17.5px]">{{ f.q }}</span>
                  <span
                    class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--lp-surface)] transition-transform duration-300"
                    :class="openFaq === f.q && 'rotate-45'"
                  >
                    <Icon icon="lucide:plus" class="text-[15px]" />
                  </span>
                </button>
              </h3>
              <div
                :id="`sfaq-a-${i}`"
                role="region"
                :aria-labelledby="`sfaq-q-${i}`"
                class="lp-acc-body"
                :class="openFaq === f.q && 'lp-acc-body--open'"
              >
                <div>
                  <p class="lp-body max-w-[62ch] pb-6 pr-12 text-[15.5px]">{{ f.a }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="rounded-[24px] bg-[var(--lp-surface)] px-6 py-14 text-center">
            <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_0_0_1px_var(--lp-line)]">
              <Icon icon="lucide:search-x" class="text-[20px] text-[var(--lp-muted)]" />
            </span>
            <p class="mt-5 text-[16px] font-semibold">Belum ada jawaban untuk “{{ query.trim() }}”</p>
            <p class="lp-body mx-auto mt-1 max-w-[36ch]">Coba kata kunci lain, atau tanyakan langsung ke tim kami.</p>
            <a href="#kontak" class="lp-btn lp-btn--ghost lp-btn--sm mt-6">Tanya tim kami</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= CONTACT ================= -->
    <section id="kontak" class="bg-[var(--lp-surface)] py-24 lg:py-32">
      <div class="lp-container grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div data-reveal>
          <span class="lp-eyebrow">Kontak</span>
          <h2 class="lp-h2 mt-4 max-w-[12ch]">Hubungi tim kami.</h2>
          <p class="lp-body mt-5 max-w-[40ch] text-[16px]">
            Kami membalas di hari kerja. Untuk pendaftaran unit, sertakan nama
            unit, wilayah operasi, dan kontak koordinator.
          </p>

          <ul class="mt-10 space-y-3">
            <li class="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_0_0_1px_var(--lp-line)]">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lp-surface)]">
                <Icon icon="lucide:mail" class="text-[18px]" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="text-[12.5px] text-[var(--lp-muted)]">Email</div>
                <a :href="`mailto:${SUPPORT_EMAIL}`" class="block truncate text-[15px] font-semibold hover:underline">{{ SUPPORT_EMAIL }}</a>
              </div>
              <button
                type="button"
                class="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[var(--lp-muted)] transition-colors hover:bg-[var(--lp-surface)] hover:text-[var(--lp-ink)]"
                @click="copyEmail"
              >
                <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" class="text-[14px]" />
                {{ copied ? "Tersalin" : "Salin" }}
              </button>
            </li>
            <li class="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_0_0_1px_var(--lp-line)]">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lp-surface)]">
                <Icon icon="lucide:clock" class="text-[18px]" />
              </span>
              <div>
                <div class="text-[12.5px] text-[var(--lp-muted)]">Waktu balas</div>
                <div class="text-[15px] font-semibold">Hari kerja</div>
              </div>
            </li>
          </ul>
        </div>

        <form class="rounded-[28px] bg-white p-6 shadow-[0_0_0_1px_rgba(28,25,23,0.06),0_24px_48px_-28px_rgba(28,25,23,0.25)] sm:p-9" novalidate data-reveal style="--d: 100ms" @submit.prevent="onSubmit">
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="c-name" class="field-label">Nama</label>
              <input
                id="c-name"
                v-model="form.name"
                type="text"
                autocomplete="name"
                class="field"
                :aria-invalid="!!errors.name"
                :aria-describedby="errors.name ? 'c-name-err' : undefined"
                @input="errors.name = undefined"
              />
              <p v-if="errors.name" id="c-name-err" class="field-error">{{ errors.name }}</p>
            </div>

            <div>
              <label for="c-role" class="field-label">Kamu adalah</label>
              <div class="relative">
                <select id="c-role" v-model="form.role" class="field appearance-none pr-10">
                  <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                </select>
                <Icon icon="lucide:chevron-down" class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[16px] text-[var(--lp-faint)]" />
              </div>
            </div>

            <div>
              <label for="c-topic" class="field-label">Topik</label>
              <div class="relative">
                <select id="c-topic" v-model="form.topic" class="field appearance-none pr-10">
                  <option v-for="t in topics" :key="t.id" :value="t.id">{{ t.label }}</option>
                </select>
                <Icon icon="lucide:chevron-down" class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[16px] text-[var(--lp-faint)]" />
              </div>
            </div>

            <div class="sm:col-span-2">
              <label for="c-ticket" class="field-label">
                Nomor tiket <span class="font-normal text-[var(--lp-faint)]">(opsional)</span>
              </label>
              <input id="c-ticket" v-model="form.ticket" type="text" placeholder="TKT-0000" class="field lp-mono" />
            </div>

            <div class="sm:col-span-2">
              <label for="c-msg" class="field-label">Pesan</label>
              <textarea
                id="c-msg"
                v-model="form.message"
                rows="5"
                class="field resize-y py-3"
                :aria-invalid="!!errors.message"
                :aria-describedby="errors.message ? 'c-msg-err' : undefined"
                @input="errors.message = undefined"
              />
              <p v-if="errors.message" id="c-msg-err" class="field-error">{{ errors.message }}</p>
            </div>
          </div>

          <div class="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-[13px] leading-[1.5] text-[var(--lp-muted)]">
              Pesan dibuka di aplikasi email kamu.
            </p>
            <button type="submit" class="lp-btn lp-btn--ink">
              Kirim pesan
              <Icon icon="lucide:send" class="text-[15px]" />
            </button>
          </div>

          <p v-if="sent" class="mt-5 flex items-start gap-2 rounded-2xl bg-emerald-50 p-4 text-[13.5px] leading-[1.55] text-emerald-800" role="status">
            <Icon icon="lucide:check-circle-2" class="mt-[2px] shrink-0 text-[16px]" />
            <span>
              Draf email sudah dibuat. Kalau aplikasi email tidak terbuka, kirim
              pesanmu langsung ke <span class="font-semibold">{{ SUPPORT_EMAIL }}</span>.
            </span>
          </p>
        </form>
      </div>
    </section>
  </LandingShell>
</template>

<style scoped>
.support-backdrop {
  background-image:
    radial-gradient(ellipse 55% 50% at 50% 0%, rgba(220, 38, 38, 0.06), transparent 70%),
    radial-gradient(rgba(28, 25, 23, 0.09) 1px, transparent 1px);
  background-size:
    100% 100%,
    22px 22px;
  mask-image: radial-gradient(ellipse 65% 60% at 50% 15%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 65% 60% at 50% 15%, #000 30%, transparent 75%);
}

.search-box {
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.08),
    0 16px 40px -20px rgba(28, 25, 23, 0.25);
  transition: box-shadow 0.2s var(--lp-ease);
}
.search-box:focus-within {
  box-shadow:
    0 0 0 2px var(--lp-ink),
    0 16px 40px -20px rgba(28, 25, 23, 0.25);
}
.search-box input:focus-visible {
  outline: none;
}
.search-box input::-webkit-search-cancel-button {
  cursor: pointer;
}

.emergency-card {
  background: linear-gradient(180deg, #fef2f2, #fff5f5);
  box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.12);
}

.quick-path {
  transition:
    background-color 0.25s var(--lp-ease),
    transform 0.25s var(--lp-ease);
}
.quick-path:hover {
  background: var(--lp-surface-2);
}
.quick-path:active {
  transform: scale(0.985);
}
.quick-path-arrow {
  transition:
    transform 0.25s var(--lp-ease),
    color 0.25s var(--lp-ease);
}
.quick-path:hover .quick-path-arrow {
  transform: translateX(3px);
  color: var(--lp-ink);
}

.package {
  box-shadow: 0 0 0 1px var(--lp-line);
}
.package--featured {
  box-shadow:
    0 0 0 2px var(--tone),
    0 30px 60px -30px rgba(220, 38, 38, 0.35);
}
.package-flag {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--tone-soft);
  font-size: 12px;
  font-weight: 600;
  color: var(--tone);
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--lp-ink);
}
.field {
  display: block;
  width: 100%;
  min-height: 48px;
  padding-inline: 16px;
  border-radius: 14px;
  background: var(--lp-surface);
  font-size: 15px;
  color: var(--lp-ink);
  box-shadow: inset 0 0 0 1px transparent;
  transition:
    box-shadow 0.2s var(--lp-ease),
    background-color 0.2s var(--lp-ease);
}
.field::placeholder {
  color: var(--lp-faint);
}
.field:hover {
  background: var(--lp-surface-2);
}
.field:focus,
.field:focus-visible {
  outline: none;
  background: #fff;
  box-shadow: inset 0 0 0 2px var(--lp-ink);
}
.field[aria-invalid="true"] {
  background: #fff;
  box-shadow: inset 0 0 0 2px var(--lp-accent);
}
.field-error {
  margin-top: 6px;
  font-size: 13px;
  color: var(--lp-accent-ink);
}
</style>
