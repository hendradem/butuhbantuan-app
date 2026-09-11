<script setup lang="ts">
/**
 * /tentang — about page: why ButuhBantuan exists, how dispatch works,
 * principles (incl. the data-privacy summary linked from the footer as
 * /tentang#privasi), and who we work with.
 */
import { Icon } from "@iconify/vue";
import { SUPPORT_EMAIL, type Tone } from "~/utils/landingContent";

definePageMeta({ layout: false });

const title = "Tentang ButuhBantuan";
const description =
  "ButuhBantuan menghubungkan warga dengan unit ambulans, damkar, SAR, PMI, dan PSC 119 terdekat — gratis, tanpa akun, dan dibangun bersama komunitas.";

useHead({
  title: `${title} · ButuhBantuan`,
  meta: [
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ],
});

const problems: { title: string; body: string; tone: Tone }[] = [
  {
    title: "Tidak tahu harus menghubungi siapa",
    body: "Layanan darurat berbeda di tiap daerah. Di saat panik, kita sering tidak tahu unit mana yang paling dekat dan paling cepat datang.",
    tone: "red",
  },
  {
    title: "Unit komunitas tidak terlihat",
    body: "Banyak ambulans relawan dan unit komunitas yang siap membantu, tapi tidak tercatat di satu tempat yang mudah ditemukan.",
    tone: "amber",
  },
  {
    title: "Tidak ada kabar setelah melapor",
    body: "Setelah menelepon, kita jarang tahu apakah petugas sudah berangkat, di mana posisinya, dan kapan akan tiba.",
    tone: "sky",
  },
];

const steps: { icon: string; title: string; body: string; tone: Tone }[] = [
  {
    icon: "lucide:smartphone",
    title: "Warga melapor",
    body: "Pilih jenis bantuan. Foto dan lokasi terisi otomatis, tanpa perlu bikin akun.",
    tone: "rose",
  },
  {
    icon: "lucide:radar",
    title: "Sistem mencari unit",
    body: "Unit di sekitarmu diurutkan dari yang paling dekat dan sedang siaga.",
    tone: "sky",
  },
  {
    icon: "lucide:timer",
    title: "Unit merespons",
    body: "Petugas menerima laporan. Belum dijawab dalam 2 menit? Laporan dioper ke unit berikutnya.",
    tone: "amber",
  },
  {
    icon: "lucide:navigation",
    title: "Dilacak sampai tiba",
    body: "Posisi petugas terlihat langsung di peta. Setelah selesai, kamu bisa memberi nilai.",
    tone: "green",
  },
];

const principles: { icon: string; title: string; body: string; tone: Tone }[] = [
  {
    icon: "lucide:heart-handshake",
    title: "Gratis untuk warga",
    body: "Tanpa biaya dan tanpa iklan. Operasional didanai sponsor dan mitra pemerintah.",
    tone: "rose",
  },
  {
    icon: "lucide:user-round-x",
    title: "Tanpa akun",
    body: "Melapor tidak perlu registrasi. Nomor HP hanya dipakai untuk menghubungi dan verifikasi tiket.",
    tone: "sky",
  },
  {
    icon: "lucide:door-open",
    title: "Terbuka untuk semua unit",
    body: "Unit resmi maupun relawan, besar atau kecil, bisa bergabung tanpa biaya.",
    tone: "green",
  },
  {
    icon: "lucide:database",
    title: "Data yang bisa dipercaya",
    body: "Data rumah sakit diambil dari SATUSEHAT Kemenkes dan OpenStreetMap, lalu dirapikan dari duplikat.",
    tone: "amber",
  },
];

const privacyPoints = [
  "Lokasi GPS hanya dikirim saat kamu membuat laporan atau berbagi live location.",
  "Data disimpan di server Indonesia dan dikirim lewat koneksi terenkripsi (HTTPS).",
  "Laporan diteruskan ke unit yang ditugaskan dan koordinator wilayahnya.",
  "Data kamu tidak dijual atau dibagikan ke pihak ketiga untuk iklan.",
];

const stats: { value: string; label: string; tone: Tone }[] = [
  { value: "15+", label: "Provinsi", tone: "red" },
  { value: "120+", label: "Kabupaten & kota", tone: "amber" },
  { value: "250+", label: "Unit terhubung", tone: "sky" },
  { value: "2 mnt", label: "Batas tunggu respons", tone: "green" },
];

const partners: {
  icon: string;
  title: string;
  body: string;
  tone: Tone;
  cta: { label: string; to?: string; href?: string };
}[] = [
  {
    icon: "lucide:users-round",
    title: "Warga",
    body: "Temukan bantuan terdekat dan pantau petugas sampai tiba. Gratis, kapan saja.",
    tone: "sky",
    cta: { label: "Buka aplikasi", to: "/" },
  },
  {
    icon: "mynaui:ambulance-solid",
    title: "Unit emergency",
    body: "Ambulans, PSC 119, damkar, SAR, PMI, dan relawan. Terima laporan, atur tim, lihat kinerja.",
    tone: "red",
    cta: { label: "Daftarkan unit", to: "/support?topik=unit#kontak" },
  },
  {
    icon: "lucide:landmark",
    title: "Pemerintah daerah & Dinkes",
    body: "Data waktu respons dan kesiapan unit di tiap wilayah, untuk merencanakan layanan darurat.",
    tone: "green",
    cta: { label: "Ajak kolaborasi", href: `mailto:${SUPPORT_EMAIL}?subject=Kolaborasi%20Pemda` },
  },
  {
    icon: "lucide:hand-coins",
    title: "Sponsor & mitra",
    body: "Bantu biaya server dan operasional supaya layanan ini tetap gratis untuk semua warga.",
    tone: "amber",
    cta: { label: "Lihat paket kerja sama", to: "/support#kerja-sama" },
  },
];
</script>

<template>
  <LandingShell>
    <!-- ================= HERO ================= -->
    <section class="relative overflow-hidden pb-20 pt-36 sm:pb-28 sm:pt-44">
      <div aria-hidden="true" class="about-backdrop pointer-events-none absolute inset-0" />
      <div class="lp-container relative">
        <span class="lp-eyebrow" data-reveal>Tentang kami</span>
        <h1 class="lp-display mt-6 max-w-[16ch]" data-reveal style="--d: 80ms">
          Jalan pintas menuju
          <span class="lp-muted-ink">bantuan terdekat.</span>
        </h1>
        <div class="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-20" data-reveal style="--d: 160ms">
          <p class="lp-lead max-w-[48ch]">
            ButuhBantuan adalah platform darurat sipil yang menghubungkan warga
            dengan unit ambulans, damkar, SAR, PMI, PSC 119, dan rumah sakit
            terdekat — resmi maupun komunitas — dalam satu peta.
          </p>
          <p class="lp-body max-w-[48ch] text-[16px] lg:pt-1">
            Kami percaya bantuan seharusnya bisa ditemukan secepat kita
            membuka ponsel. Karena itu platform ini gratis untuk warga, tidak
            butuh akun, dan dibangun bersama komunitas yang setiap hari turun
            ke lapangan.
          </p>
        </div>
      </div>
    </section>

    <!-- ================= WHY ================= -->
    <section class="lp-section border-t border-[var(--lp-line)]">
      <div class="lp-container grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div class="lg:sticky lg:top-28 lg:self-start" data-reveal>
          <span class="lp-eyebrow">Kenapa kami ada</span>
          <h2 class="lp-h2 mt-4 max-w-[16ch]">Saat darurat, menit terbuang untuk mencari.</h2>
        </div>
        <ol class="border-t border-[var(--lp-line)]">
          <li
            v-for="(p, i) in problems"
            :key="p.title"
            class="grid gap-3 border-b border-[var(--lp-line)] py-8 sm:grid-cols-[64px_1fr]"
            :class="`lp-tone-${p.tone}`"
            data-reveal
            :style="{ '--d': `${i * 80}ms` }"
          >
            <span class="lp-mono text-[13px] text-[var(--tone)]">0{{ i + 1 }}</span>
            <div>
              <h3 class="lp-h3">{{ p.title }}</h3>
              <p class="lp-body mt-2 max-w-[52ch] text-[16px]">{{ p.body }}</p>
            </div>
          </li>
          <li class="pt-8" data-reveal>
            <p class="max-w-[52ch] text-[18px] font-medium leading-[1.55] tracking-[-0.01em] sm:pl-16">
              ButuhBantuan menyatukan ketiganya: satu peta untuk semua unit,
              satu alur laporan, dan kabar di setiap langkah.
            </p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ================= HOW IT WORKS ================= -->
    <section class="bg-[var(--lp-surface)] py-24 lg:py-32">
      <div class="lp-container">
        <div class="max-w-[640px]" data-reveal>
          <span class="lp-eyebrow">Cara kerja</span>
          <h2 class="lp-h2 mt-4">Dari laporan sampai petugas tiba.</h2>
        </div>

        <ol class="relative mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="(s, i) in steps"
            :key="s.title"
            class="relative rounded-[24px] bg-white p-6 shadow-[0_0_0_1px_rgba(28,25,23,0.05)]"
            :class="`lp-tone-${s.tone}`"
            data-reveal
            :style="{ '--d': `${i * 90}ms` }"
          >
            <div class="flex items-center justify-between">
              <span class="lp-well">
                <Icon :icon="s.icon" class="text-[20px]" />
              </span>
              <span class="lp-mono text-[12px] text-[var(--lp-faint)]">0{{ i + 1 }} / 04</span>
            </div>
            <h3 class="mt-8 text-[17px] font-semibold">{{ s.title }}</h3>
            <p class="mt-2 text-[14.5px] leading-[1.6] text-[var(--lp-muted)]">{{ s.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ================= PRINCIPLES ================= -->
    <section class="lp-section">
      <div class="lp-container">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div data-reveal>
            <span class="lp-eyebrow">Prinsip kami</span>
            <h2 class="lp-h2 mt-4 max-w-[15ch]">Hal-hal yang tidak akan kami tawar.</h2>
          </div>
          <p class="lp-lead max-w-[44ch]" data-reveal style="--d: 100ms">
            Platform darurat harus bisa dipakai siapa saja, dalam kondisi apa
            saja, tanpa membuat warga ragu.
          </p>
        </div>

        <div class="mt-14 grid gap-4 lg:grid-cols-3">
          <!-- Privacy (tall) -->
          <article
            id="privasi"
            class="relative flex flex-col overflow-hidden rounded-[28px] bg-[var(--lp-ink)] p-7 text-white sm:p-9 lg:row-span-2"
            data-reveal
          >
            <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Icon icon="lucide:lock-keyhole" class="text-[20px]" />
            </span>
            <div class="mt-8 text-[22px] font-semibold leading-[1.25] tracking-[-0.02em]">
              <h3>Privasi data dijaga</h3>
            </div>
            <p class="mt-2 text-[15px] leading-[1.6] text-white/60">
              Data darurat itu sensitif. Ini cara kami memperlakukannya.
            </p>
            <ul class="mt-8 space-y-4">
              <li v-for="pt in privacyPoints" :key="pt" class="flex gap-3 text-[14.5px] leading-[1.55] text-white/85">
                <Icon icon="lucide:check" class="mt-[3px] shrink-0 text-[15px] text-emerald-400" />
                {{ pt }}
              </li>
            </ul>
            <NuxtLink to="/support#privasi" class="mt-auto inline-flex items-center gap-1.5 pt-10 text-[14px] font-semibold text-white/90 hover:text-white">
              Pertanyaan soal data
              <Icon icon="lucide:arrow-right" class="text-[15px]" />
            </NuxtLink>
          </article>

          <article
            v-for="(p, i) in principles"
            :key="p.title"
            class="lp-card lp-tint p-7 sm:p-8"
            :class="`lp-tone-${p.tone}`"
            data-reveal
            :style="{ '--d': `${(i % 2) * 80}ms` }"
          >
            <span class="lp-well bg-white">
              <Icon :icon="p.icon" class="text-[20px]" />
            </span>
            <h3 class="mt-8 text-[18px] font-semibold">{{ p.title }}</h3>
            <p class="lp-body mt-2">{{ p.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ================= NUMBERS ================= -->
    <section class="border-y border-[var(--lp-line)]">
      <div class="lp-container">
        <dl class="grid grid-cols-2 lg:grid-cols-4">
          <div
            v-for="(s, i) in stats"
            :key="s.label"
            class="flex flex-col border-[var(--lp-line)] py-10 max-lg:px-5 max-lg:[&:nth-child(odd)]:border-r max-lg:[&:nth-child(odd)]:pl-0 lg:border-l lg:px-8 lg:first:border-l-0 lg:first:pl-0"
            :class="[`lp-tone-${s.tone}`, i < 2 && 'max-lg:border-b']"
            data-reveal
            :style="{ '--d': `${i * 70}ms` }"
          >
            <dt class="mt-3 text-[13.5px] text-[var(--lp-muted)]">{{ s.label }}</dt>
            <dd class="order-first text-[40px] font-bold leading-none tracking-[-0.04em] text-[var(--tone)] sm:text-[52px]" style="font-variant-numeric: tabular-nums">
              {{ s.value }}
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- ================= PARTNERS ================= -->
    <section class="lp-section">
      <div class="lp-container grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div class="lg:sticky lg:top-28 lg:self-start" data-reveal>
          <span class="lp-eyebrow">Bekerja bersama</span>
          <h2 class="lp-h2 mt-4 max-w-[14ch]">Jaring bantuan dibangun bersama.</h2>
          <p class="lp-body mt-5 max-w-[40ch] text-[16px]">
            Setiap pihak punya peran supaya bantuan datang lebih cepat.
          </p>
        </div>
        <ul class="border-t border-[var(--lp-line)]">
          <li
            v-for="(p, i) in partners"
            :key="p.title"
            class="group grid gap-4 border-b border-[var(--lp-line)] py-7 sm:grid-cols-[48px_1fr_auto] sm:items-center sm:gap-6"
            :class="`lp-tone-${p.tone}`"
            data-reveal
            :style="{ '--d': `${i * 70}ms` }"
          >
            <span class="lp-well h-12 w-12">
              <Icon :icon="p.icon" class="text-[21px]" />
            </span>
            <div>
              <h3 class="text-[18px] font-semibold">{{ p.title }}</h3>
              <p class="mt-1 max-w-[48ch] text-[14.5px] leading-[1.6] text-[var(--lp-muted)]">{{ p.body }}</p>
            </div>
            <NuxtLink v-if="p.cta.to" :to="p.cta.to" class="lp-link text-[14px]">
              {{ p.cta.label }}
              <Icon icon="lucide:arrow-right" class="lp-btn-arrow text-[15px]" />
            </NuxtLink>
            <a v-else :href="p.cta.href" class="lp-link text-[14px]">
              {{ p.cta.label }}
              <Icon icon="lucide:arrow-up-right" class="lp-btn-arrow text-[15px]" />
            </a>
          </li>
        </ul>
      </div>
    </section>

    <!-- ================= CTA ================= -->
    <section class="pb-24 lg:pb-32">
      <div class="lp-container">
        <div class="lp-cta-panel grid items-center gap-8 rounded-[36px] px-7 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1fr_auto]" data-reveal>
          <div>
            <h2 class="lp-h2 max-w-[18ch]">Mari buat bantuan datang lebih cepat.</h2>
            <p class="lp-lead mt-4 max-w-[46ch]">
              Punya unit, data, atau ide yang bisa membantu? Kami senang
              mendengarnya.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <NuxtLink to="/support#kontak" class="lp-btn lp-btn--light">
              Hubungi kami
              <Icon icon="lucide:arrow-right" class="lp-btn-arrow text-[16px]" />
            </NuxtLink>
            <NuxtLink to="/support#kerja-sama" class="lp-btn lp-btn--outline-light">Jadi sponsor</NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </LandingShell>
</template>

<style scoped>
.about-backdrop {
  background-image:
    radial-gradient(ellipse 45% 55% at 85% 10%, rgba(220, 38, 38, 0.07), transparent 70%),
    radial-gradient(rgba(28, 25, 23, 0.09) 1px, transparent 1px);
  background-size:
    100% 100%,
    22px 22px;
  mask-image: radial-gradient(ellipse 60% 70% at 80% 10%, #000 20%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 60% 70% at 80% 10%, #000 20%, transparent 70%);
}
</style>
