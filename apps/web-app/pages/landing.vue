<script setup lang="ts">
/**
 * /landing — public marketing page.
 *
 * Layout & visual language ported verbatim from the FlowBoard template
 * provided by the user (purple #7B61FF accent, gradient text, grid-bg
 * hero, Kanban-style app mockup, feature grid with rounded borders,
 * dark CTA sections). Every string, mockup label, and card content
 * has been replaced with ButuhBantuan-specific data.
 */
import { Icon } from "@iconify/vue";

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
});

const openFaq = ref<number | null>(0);
function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i;
}

const faqs = [
  {
    q: "Apakah aplikasi ini gratis untuk warga?",
    a: "Ya. Semua fitur di butuhbantuan.space gratis. Tidak ada registrasi wajib, tidak ada iklan. Operasional didanai sponsor dan mitra pemerintah.",
  },
  {
    q: "Bagaimana unit emergency saya bergabung?",
    a: "Kirim email ke hello@butuhbantuan.space dengan nama unit, wilayah operasi, dan kontak koordinator. Kami bantu proses onboarding gratis.",
  },
  {
    q: "Data lokasi saya disimpan di mana?",
    a: "Koordinat GPS hanya dikirim saat kamu buat laporan atau share live location. Data disimpan di server Indonesia, dienkripsi HTTPS. Tidak dijual ke pihak ketiga.",
  },
  {
    q: "Kalau tidak ada unit terdekat, apa yang terjadi?",
    a: "Platform meneruskan order ke jaringan komunitas relawan terdekat. Kalau penuh, order dieskalasi ke unit di kabupaten tetangga. Estimasi realistis di setiap step.",
  },
];
</script>

<template>
  <div class="bb-page">
    <!-- ================= NAVBAR ================= -->
    <header class="fixed top-0 z-50 w-full border-b border-black/[0.06] bg-white/90 backdrop-blur-xl">
      <div class="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7B61FF]">
            <Icon icon="mynaui:ambulance-solid" class="text-white text-[16px]" />
          </div>
          <span class="text-[19px] font-bold tracking-[-0.5px]">butuhbantuan</span>
        </NuxtLink>

        <nav class="hidden items-center gap-8 text-[14px] font-medium text-[#555666] lg:flex">
          <a href="#warga" class="transition hover:text-black">Untuk warga</a>
          <a href="#unit" class="transition hover:text-black">Untuk unit</a>
          <a href="#platform" class="transition hover:text-black">Platform</a>
          <a href="#faq" class="transition hover:text-black">FAQ</a>
        </nav>

        <div class="hidden items-center gap-5 lg:flex">
          <NuxtLink to="/" class="text-[14px] font-semibold text-[#444553] hover:text-black">
            Buka app
          </NuxtLink>
          <a
            href="https://dashboard.butuhbantuan.space"
            class="rounded-xl bg-[#7B61FF] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#684BEF]"
          >
            Login dashboard
          </a>
        </div>

        <button class="rounded-lg border border-gray-200 p-2 lg:hidden">
          <Icon icon="lucide:menu" class="h-5 w-5" />
        </button>
      </div>
    </header>

    <!-- ================= HERO ================= -->
    <section class="hero-gradient relative overflow-hidden pt-[150px]">
      <div class="absolute inset-0 grid-bg opacity-40" />
      <div class="relative mx-auto max-w-[1100px] px-5 text-center">
        <div
          class="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e7e3ff] bg-[#f7f5ff] px-4 py-2 text-[13px] font-semibold text-[#6651d9]"
        >
          <span class="h-2 w-2 rounded-full bg-[#7B61FF]" />
          Peta darurat warga Indonesia
        </div>

        <h1
          class="mx-auto max-w-[950px] text-[48px] font-bold leading-[1.04] tracking-[-2.8px] text-[#1d1e2c] sm:text-[62px] lg:text-[76px]"
        >
          Bantuan darurat
          <br />
          dalam
          <span class="gradient-text">genggaman warga</span>
        </h1>

        <p
          class="mx-auto mt-7 max-w-[720px] text-[18px] leading-8 text-[#666778] sm:text-[20px]"
        >
          Peta unit ambulance, damkar, SAR, PMI, PSC 119, dan rumah sakit
          terdekat. Laporan 30 detik, live tracking petugas sampai tiba.
        </p>

        <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <NuxtLink
            to="/"
            class="flex h-12 items-center justify-center rounded-xl bg-[#7B61FF] px-7 text-[15px] font-bold text-white shadow-lg shadow-purple-200 transition hover:-translate-y-0.5 hover:bg-[#684BEF]"
          >
            Buka app — gratis
          </NuxtLink>
          <a
            href="#unit"
            class="flex h-12 items-center justify-center rounded-xl border border-[#dddbea] bg-white px-7 text-[15px] font-semibold text-[#333444] transition hover:bg-[#fafaff]"
          >
            Untuk unit emergency
          </a>
        </div>

        <p class="mt-4 text-[12px] text-[#8a8997]">
          Tidak perlu daftar · Gratis untuk warga selamanya
        </p>

        <!-- HERO DASHBOARD MOCKUP -->
        <div class="relative mx-auto mt-20 max-w-[1120px]">
          <div class="absolute left-1/2 top-20 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[#7B61FF]/10 blur-[100px]" />

          <div class="relative overflow-hidden rounded-[22px] border border-[#dddbea] bg-white text-left shadow-soft">
            <div class="flex h-12 items-center border-b border-[#eceaf2] bg-[#fafafe] px-5">
              <div class="flex gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-[#dddbe7]" />
                <span class="h-2.5 w-2.5 rounded-full bg-[#dddbe7]" />
                <span class="h-2.5 w-2.5 rounded-full bg-[#dddbe7]" />
              </div>
              <div class="mx-auto hidden rounded-md bg-white px-24 py-1.5 text-[10px] text-gray-400 shadow-sm sm:block">
                dashboard.butuhbantuan.space/orders
              </div>
            </div>

            <div class="flex min-h-[530px] bg-[#f8f8fc]">
              <!-- Sidebar -->
              <aside class="hidden w-[190px] border-r border-[#e7e5ef] bg-white p-4 md:block">
                <div class="mb-7 flex items-center gap-2">
                  <div class="flex h-6 w-6 items-center justify-center rounded-md bg-[#7B61FF]">
                    <Icon icon="mynaui:ambulance-solid" class="text-white text-[12px]" />
                  </div>
                  <span class="text-[13px] font-bold">butuhbantuan</span>
                </div>

                <div class="space-y-1">
                  <div class="rounded-lg bg-[#f0edff] px-3 py-2 text-[11px] font-semibold text-[#6a51e8]">
                    Pesanan
                  </div>
                  <div class="px-3 py-2 text-[11px] text-gray-500">Ops map</div>
                  <div class="px-3 py-2 text-[11px] text-gray-500">SOS</div>
                  <div class="px-3 py-2 text-[11px] text-gray-500">Referensi RS</div>
                </div>

                <div class="mt-8">
                  <div class="mb-2 px-3 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    Unit
                  </div>
                  <div class="px-3 py-2 text-[11px] text-gray-500">PSC 119 Sleman</div>
                  <div class="px-3 py-2 text-[11px] text-gray-500">Damkar Yogya</div>
                  <div class="px-3 py-2 text-[11px] text-gray-500">PMI Cabang DIY</div>
                </div>
              </aside>

              <!-- Main -->
              <main class="min-w-0 flex-1 p-5">
                <div class="mb-5 flex items-center justify-between">
                  <div>
                    <div class="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                      Ops
                    </div>
                    <h3 class="mt-1 text-[18px] font-bold">Pesanan Masuk</h3>
                  </div>
                  <button class="rounded-lg bg-[#7B61FF] px-3 py-2 text-[10px] font-semibold text-white">
                    + Buat tiket
                  </button>
                </div>

                <div class="kanban-scroll overflow-x-auto">
                  <div class="grid min-w-[800px] grid-cols-4 gap-3">
                    <!-- BARU -->
                    <div>
                      <div class="mb-2 flex items-center gap-2">
                        <span class="h-2 w-2 rounded-full bg-gray-400" />
                        <span class="text-[11px] font-bold">Baru</span>
                        <span class="text-[10px] text-gray-400">4</span>
                      </div>

                      <div class="space-y-2">
                        <div class="rounded-xl border border-[#e7e5ee] bg-white p-3 shadow-sm">
                          <div class="mb-2 flex items-center gap-1.5">
                            <span class="rounded bg-[#fce8e8] px-1.5 py-0.5 text-[8px] font-bold text-[#D93025]">MERAH</span>
                            <span class="text-[11px] font-semibold">Asma anak</span>
                          </div>
                          <div class="mb-3 text-[9px] leading-4 text-gray-400">
                            Sleman · Jl. Kaliurang km 12
                          </div>
                          <div class="flex items-center justify-between">
                            <span class="rounded bg-[#f0edff] px-2 py-1 text-[8px] font-semibold text-[#7057ed]">
                              TKT-2591
                            </span>
                            <div class="flex h-5 w-5 items-center justify-center rounded-full bg-[#d9d5ff] text-[8px]">
                              AM
                            </div>
                          </div>
                        </div>

                        <div class="rounded-xl border border-[#e7e5ee] bg-white p-3 shadow-sm">
                          <div class="mb-2 flex items-center gap-1.5">
                            <span class="rounded bg-[#fef3c7] px-1.5 py-0.5 text-[8px] font-bold text-[#B45309]">KUNING</span>
                            <span class="text-[11px] font-semibold">Kecelakaan motor</span>
                          </div>
                          <div class="h-1.5 w-20 rounded-full bg-[#e8e6ef]" />
                        </div>

                        <div class="rounded-xl border border-[#e7e5ee] bg-white p-3 shadow-sm">
                          <div class="mb-2 text-[11px] font-semibold">Transport rutin</div>
                          <span class="text-[9px] text-gray-400">Bantul · non-urgent</span>
                        </div>
                      </div>
                    </div>

                    <!-- EN ROUTE -->
                    <div>
                      <div class="mb-2 flex items-center gap-2">
                        <span class="h-2 w-2 rounded-full bg-[#7B61FF]" />
                        <span class="text-[11px] font-bold">En route</span>
                        <span class="text-[10px] text-gray-400">3</span>
                      </div>

                      <div class="space-y-2">
                        <div class="rounded-xl border border-[#e7e5ee] bg-white p-3 shadow-sm">
                          <div class="mb-2 text-[11px] font-semibold">Ambulance PMI</div>
                          <div class="mb-3 h-1.5 rounded-full bg-[#eceaf5]">
                            <div class="h-1.5 w-[70%] rounded-full bg-[#7B61FF]" />
                          </div>
                          <div class="flex items-center justify-between">
                            <span class="text-[8px] font-semibold text-gray-400">ETA 3 min</span>
                            <div class="flex h-5 w-5 items-center justify-center rounded-full bg-[#d9d5ff] text-[8px]">
                              PM
                            </div>
                          </div>
                        </div>

                        <div class="rounded-xl border border-[#e7e5ee] bg-white p-3 shadow-sm">
                          <div class="mb-2 text-[11px] font-semibold">Damkar Yogya</div>
                          <div class="flex gap-1">
                            <span class="rounded bg-[#fff1f6] px-2 py-1 text-[8px] text-[#e05c91]">Urgent</span>
                            <span class="rounded bg-[#f0edff] px-2 py-1 text-[8px] text-[#7057ed]">GPS live</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- ON SITE -->
                    <div>
                      <div class="mb-2 flex items-center gap-2">
                        <span class="h-2 w-2 rounded-full bg-[#f0a34c]" />
                        <span class="text-[11px] font-bold">On site</span>
                        <span class="text-[10px] text-gray-400">2</span>
                      </div>

                      <div class="space-y-2">
                        <div class="rounded-xl border border-[#e7e5ee] bg-white p-3 shadow-sm">
                          <div class="mb-2 text-[11px] font-semibold">PSC 119 Sleman</div>
                          <div class="mb-3 text-[9px] text-gray-400">
                            Sedang menangani pasien
                          </div>
                          <div class="flex -space-x-1">
                            <div class="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#cfc7ff] text-[7px]">
                              A
                            </div>
                            <div class="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#ffd0df] text-[7px]">
                              J
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- SELESAI -->
                    <div>
                      <div class="mb-2 flex items-center gap-2">
                        <span class="h-2 w-2 rounded-full bg-[#42b883]" />
                        <span class="text-[11px] font-bold">Selesai</span>
                        <span class="text-[10px] text-gray-400">5</span>
                      </div>

                      <div class="space-y-2">
                        <div class="rounded-xl border border-[#e7e5ee] bg-white p-3 opacity-80 shadow-sm">
                          <div class="mb-2 text-[11px] font-semibold line-through">
                            TKT-2588 · Bantul
                          </div>
                          <div class="text-[9px] text-gray-400">Completed 12 min ago</div>
                        </div>

                        <div class="rounded-xl border border-[#e7e5ee] bg-white p-3 opacity-80 shadow-sm">
                          <div class="mb-2 text-[11px] font-semibold line-through">
                            TKT-2585 · Sleman
                          </div>
                          <div class="text-[9px] text-gray-400">Completed 22 min ago</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      <div class="h-28" />
    </section>

    <!-- ================= TRUST ================= -->
    <section class="border-y border-[#efedf5] bg-white py-10">
      <div class="mx-auto max-w-[1100px] px-5">
        <p class="text-center text-[12px] font-semibold uppercase tracking-[2px] text-[#9b99a7]">
          Dipakai unit resmi &amp; komunitas di seluruh Indonesia
        </p>

        <div class="mt-8 grid grid-cols-2 items-center gap-8 opacity-40 sm:grid-cols-3 lg:grid-cols-6">
          <div class="text-center text-[17px] font-bold">PMI</div>
          <div class="text-center text-[17px] font-bold">Damkar</div>
          <div class="text-center text-[17px] font-bold">PSC 119</div>
          <div class="text-center text-[17px] font-bold">SATUSEHAT</div>
          <div class="text-center text-[17px] font-bold">Basarnas</div>
          <div class="text-center text-[17px] font-bold">Relawan</div>
        </div>
      </div>
    </section>

    <!-- ================= INTRO ================= -->
    <section class="bg-white py-32">
      <div class="mx-auto max-w-[900px] px-5 text-center">
        <div class="text-[12px] font-bold uppercase tracking-[2px] text-[#7B61FF]">
          Satu platform terkoneksi
        </div>
        <h2 class="mt-5 text-[40px] font-bold leading-[1.1] tracking-[-1.8px] sm:text-[52px]">
          Peta darurat kamu terhubung
          <span class="gradient-text">dengan seluruh unit terdekat.</span>
        </h2>
        <p class="mx-auto mt-6 max-w-[680px] text-[17px] leading-8 text-[#6b6a78]">
          Ambulance, damkar, SAR, PMI, PSC 119, dan rumah sakit dalam satu peta —
          plus dashboard operasional untuk unit yang memproses order.
        </p>
      </div>
    </section>

    <!-- ================= FEATURE 1 ================= -->
    <section id="warga" class="overflow-hidden bg-[#faf9ff] py-24">
      <div class="mx-auto grid max-w-[1180px] items-center gap-16 px-5 lg:grid-cols-2">
        <div>
          <div class="mb-5 text-[12px] font-bold uppercase tracking-[2px] text-[#7B61FF]">
            Untuk warga
          </div>
          <h2 class="text-[38px] font-bold leading-[1.1] tracking-[-1.5px] sm:text-[48px]">
            Peta yang tahu unit terdekat
          </h2>
          <p class="mt-6 text-[17px] leading-8 text-[#6b6a78]">
            Buka aplikasi, kasih izin lokasi, langsung lihat ambulance, damkar,
            PMI, PSC 119, dan rumah sakit di sekitar — lengkap dengan ETA dan
            status siaga real-time.
          </p>

          <div class="mt-8 space-y-4">
            <div class="flex gap-4">
              <div class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ebe7ff] text-[#7B61FF]">
                <Icon icon="lucide:check" class="text-[14px]" />
              </div>
              <div>
                <h3 class="font-bold">Marker per-kategori</h3>
                <p class="mt-1 text-[14px] leading-6 text-gray-500">
                  Ambulance, damkar, SAR, hospital — warna dan icon berbeda.
                </p>
              </div>
            </div>

            <div class="flex gap-4">
              <div class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ebe7ff] text-[#7B61FF]">
                <Icon icon="lucide:check" class="text-[14px]" />
              </div>
              <div>
                <h3 class="font-bold">ETA + jarak real-time</h3>
                <p class="mt-1 text-[14px] leading-6 text-gray-500">
                  Dihitung otomatis dari lokasimu untuk setiap unit.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Visual: Status unit list -->
        <div class="relative">
          <div class="absolute -inset-10 rounded-full bg-[#7B61FF]/10 blur-3xl" />
          <div class="relative rounded-[25px] border border-[#e2dfef] bg-white p-4 shadow-card">
            <div class="mb-4 flex items-center justify-between">
              <div class="text-[12px] font-bold">Status unit sekitar</div>
              <div class="flex gap-1">
                <span class="rounded-md bg-[#f1eff7] px-2 py-1 text-[9px]">List</span>
                <span class="rounded-md bg-[#ebe7ff] px-2 py-1 text-[9px] font-semibold text-[#7057ed]">
                  Peta
                </span>
              </div>
            </div>

            <div class="space-y-3">
              <div class="rounded-xl bg-[#f8f7fb] p-4">
                <div class="mb-2 flex justify-between">
                  <span class="text-[10px] font-bold">PSC 119 Sleman</span>
                  <span class="text-[9px] text-gray-400">3 min · 1.2 km</span>
                </div>
                <div class="h-2 rounded-full bg-white">
                  <div class="h-2 w-[85%] rounded-full bg-[#7B61FF]" />
                </div>
              </div>

              <div class="rounded-xl bg-[#f8f7fb] p-4">
                <div class="mb-2 flex justify-between">
                  <span class="text-[10px] font-bold">PMI Bantul</span>
                  <span class="text-[9px] text-gray-400">5 min · 2.4 km</span>
                </div>
                <div class="h-2 rounded-full bg-white">
                  <div class="h-2 w-[62%] rounded-full bg-[#b49fff]" />
                </div>
              </div>

              <div class="rounded-xl bg-[#f8f7fb] p-4">
                <div class="mb-2 flex justify-between">
                  <span class="text-[10px] font-bold">Damkar Yogyakarta</span>
                  <span class="text-[9px] text-gray-400">7 min · 3.1 km</span>
                </div>
                <div class="h-2 rounded-full bg-white">
                  <div class="h-2 w-[90%] rounded-full bg-[#7B61FF]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= FEATURE 2 ================= -->
    <section class="bg-white py-28">
      <div class="mx-auto grid max-w-[1180px] items-center gap-16 px-5 lg:grid-cols-2">
        <div class="order-2 lg:order-1">
          <div class="relative rounded-[26px] border border-[#e5e2ef] bg-[#f8f7fc] p-5 shadow-card">
            <div class="rounded-2xl border border-[#e6e3ef] bg-white p-5">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-[9px] uppercase tracking-wider text-gray-400">
                    Order darurat
                  </div>
                  <div class="mt-1 text-[15px] font-bold">Asma anak · Sleman</div>
                </div>
                <span class="rounded-lg bg-[#fce8e8] px-3 py-1.5 text-[9px] font-semibold text-[#D93025]">
                  MERAH
                </span>
              </div>

              <div class="mt-6 grid grid-cols-2 gap-3">
                <div class="rounded-xl bg-[#f8f7fb] p-3">
                  <div class="text-[9px] text-gray-400">Pelapor</div>
                  <div class="mt-2 flex items-center gap-2">
                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-[#d8d0ff] text-[8px] font-bold">AM</div>
                    <span class="text-[10px] font-semibold">Ade M.</span>
                  </div>
                </div>

                <div class="rounded-xl bg-[#f8f7fb] p-3">
                  <div class="text-[9px] text-gray-400">Terima</div>
                  <div class="mt-2 text-[10px] font-semibold">2 min ago</div>
                </div>

                <div class="rounded-xl bg-[#f8f7fb] p-3">
                  <div class="text-[9px] text-gray-400">Tiket</div>
                  <div class="mt-2 text-[10px] font-semibold">TKT-2591</div>
                </div>

                <div class="rounded-xl bg-[#f8f7fb] p-3">
                  <div class="text-[9px] text-gray-400">Foto</div>
                  <div class="mt-2 text-[10px] font-semibold">1 foto</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="order-1 lg:order-2">
          <div class="mb-5 text-[12px] font-bold uppercase tracking-[2px] text-[#7B61FF]">
            Semua konteks
          </div>
          <h2 class="text-[38px] font-bold leading-[1.1] tracking-[-1.5px] sm:text-[48px]">
            Semua konteks langsung di kartu order
          </h2>
          <p class="mt-6 text-[17px] leading-8 text-[#6b6a78]">
            Data pelapor, triase, foto, timeline dispatch, dan komunikasi
            dengan warga — semua nempel di satu kartu order. Tidak perlu
            switch aplikasi.
          </p>
        </div>
      </div>
    </section>

    <!-- ================= FEATURE 3 ================= -->
    <section id="unit" class="bg-[#faf9ff] py-28">
      <div class="mx-auto grid max-w-[1180px] items-center gap-16 px-5 lg:grid-cols-2">
        <div>
          <div class="mb-5 text-[12px] font-bold uppercase tracking-[2px] text-[#7B61FF]">
            Untuk unit
          </div>
          <h2 class="text-[38px] font-bold leading-[1.1] tracking-[-1.5px] sm:text-[48px]">
            Auto-eskalasi kalau SLA lewat
          </h2>
          <p class="mt-6 text-[17px] leading-8 text-[#6b6a78]">
            Order yang tidak diterima dalam SLA otomatis dieskalasi ke unit
            berikutnya. Compliance tracking sesuai standar Kemenkes / PSC 119.
          </p>

          <div class="mt-8 rounded-2xl border border-[#e5e2ef] bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold">SLA window</span>
              <span class="rounded-md bg-[#fff0f0] px-2 py-1 text-[9px] font-bold text-[#dc5b5b]">
                90s / 90s
              </span>
            </div>
            <div class="mt-4 h-2 rounded-full bg-[#eeeaf8]">
              <div class="h-2 w-full rounded-full bg-[#ed7676]" />
            </div>
            <p class="mt-3 text-[10px] text-gray-400">
              SLA habis — order dieskalasi ke unit terdekat berikutnya.
            </p>
          </div>
        </div>

        <div>
          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-2xl border border-[#e6e3ef] bg-white p-5 shadow-sm">
              <div class="text-[28px] font-bold">±4<span class="text-[16px] text-gray-400">min</span></div>
              <p class="mt-1 text-[11px] text-gray-400">avg response time</p>
            </div>

            <div class="rounded-2xl border border-[#e6e3ef] bg-white p-5 shadow-sm">
              <div class="text-[28px] font-bold">3.2x</div>
              <p class="mt-1 text-[11px] text-gray-400">less telepon konfirmasi</p>
            </div>

            <div class="col-span-2 rounded-2xl bg-[#7B61FF] p-7 text-white">
              <div class="text-[13px] font-semibold opacity-80">SLA compliance</div>
              <div class="mt-2 text-[34px] font-bold">Excellent</div>
              <div class="mt-5 h-2 rounded-full bg-white/20">
                <div class="h-2 w-[92%] rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= CTA (dark) ================= -->
    <section class="relative overflow-hidden bg-[#181726] py-28 text-white">
      <div class="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#7B61FF]/20 blur-[120px]" />

      <div class="relative mx-auto max-w-[880px] px-5 text-center">
        <h2 class="text-[42px] font-bold leading-[1.08] tracking-[-1.8px] sm:text-[58px]">
          Bantuan darurat tidak menunggu.
          <br />
          Pastikan sampai tepat waktu.
        </h2>
        <p class="mx-auto mt-6 max-w-[620px] text-[17px] leading-8 text-white/60">
          Beri warga platform darurat yang lengkap. Beri unit dashboard
          operasional yang cepat.
        </p>

        <div class="mt-9">
          <NuxtLink
            to="/"
            class="inline-flex rounded-xl bg-white px-7 py-3.5 text-[15px] font-bold text-[#252334] transition hover:-translate-y-0.5"
          >
            Buka app sekarang
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ================= FEATURES GRID ================= -->
    <section class="bg-white py-32">
      <div class="mx-auto max-w-[1100px] px-5">
        <div class="mx-auto max-w-[700px] text-center">
          <div class="text-[12px] font-bold uppercase tracking-[2px] text-[#7B61FF]">
            Semua yang kamu butuhkan
          </div>
          <h2 class="mt-5 text-[40px] font-bold tracking-[-1.5px] sm:text-[50px]">
            Semua fitur darurat,
            <span class="gradient-text">built in.</span>
          </h2>
        </div>

        <div class="mt-16 grid gap-px overflow-hidden rounded-3xl border border-[#e7e4ef] bg-[#e7e4ef] md:grid-cols-2 lg:grid-cols-3">
          <div class="bg-white p-8 transition hover:bg-[#faf9ff]">
            <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eeeaff] text-[#7057ed]">
              <Icon icon="lucide:map-pin" class="text-[18px]" />
            </div>
            <h3 class="text-[17px] font-bold">Peta unit terdekat</h3>
            <p class="mt-3 text-[14px] leading-6 text-gray-500">
              Marker per-kategori untuk ambulance, damkar, SAR, PMI, PSC 119, dan RS.
            </p>
          </div>

          <div class="bg-white p-8 transition hover:bg-[#faf9ff]">
            <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eeeaff] text-[#7057ed]">
              <Icon icon="lucide:siren" class="text-[18px]" />
            </div>
            <h3 class="text-[17px] font-bold">Laporan 30 detik</h3>
            <p class="mt-3 text-[14px] leading-6 text-gray-500">
              Triase Merah / Kuning / Hijau, foto opsional, dispatch otomatis.
            </p>
          </div>

          <div class="bg-white p-8 transition hover:bg-[#faf9ff]">
            <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eeeaff] text-[#7057ed]">
              <Icon icon="lucide:navigation" class="text-[18px]" />
            </div>
            <h3 class="text-[17px] font-bold">Live tracking</h3>
            <p class="mt-3 text-[14px] leading-6 text-gray-500">
              GPS petugas kirim setiap 5 detik. Peta bergerak real-time.
            </p>
          </div>

          <div class="bg-white p-8 transition hover:bg-[#faf9ff]">
            <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eeeaff] text-[#7057ed]">
              <Icon icon="lucide:users" class="text-[18px]" />
            </div>
            <h3 class="text-[17px] font-bold">Community claim</h3>
            <p class="mt-3 text-[14px] leading-6 text-gray-500">
              Order diteruskan ke relawan komunitas kalau unit resmi penuh.
            </p>
          </div>

          <div class="bg-white p-8 transition hover:bg-[#faf9ff]">
            <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eeeaff] text-[#7057ed]">
              <Icon icon="lucide:smartphone" class="text-[18px]" />
            </div>
            <h3 class="text-[17px] font-bold">PWA installable</h3>
            <p class="mt-3 text-[14px] leading-6 text-gray-500">
              Pasang di homescreen tanpa Play Store. Push notif untuk update tiket.
            </p>
          </div>

          <div class="bg-white p-8 transition hover:bg-[#faf9ff]">
            <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eeeaff] text-[#7057ed]">
              <Icon icon="lucide:ticket" class="text-[18px]" />
            </div>
            <h3 class="text-[17px] font-bold">E-tiket digital</h3>
            <p class="mt-3 text-[14px] leading-6 text-gray-500">
              Nomor tiket unik yang bisa dibagikan ke keluarga untuk tracking.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= PLATFORM ================= -->
    <section id="platform" class="bg-[#faf9ff] py-32">
      <div class="mx-auto max-w-[1100px] px-5">
        <div class="mx-auto max-w-[700px] text-center">
          <div class="text-[12px] font-bold uppercase tracking-[2px] text-[#7B61FF]">
            Satu platform
          </div>
          <h2 class="mt-5 text-[40px] font-bold tracking-[-1.5px] sm:text-[52px]">
            Peta cuma
            <span class="gradient-text">awal saja.</span>
          </h2>
          <p class="mt-6 text-[17px] leading-8 text-gray-500">
            Semua fitur yang dibutuhkan warga dan unit — dari laporan sampai
            analytics — dalam satu platform terkoneksi.
          </p>
        </div>

        <div class="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl border border-[#e6e3ef] bg-white p-6">
            <div class="text-[22px] text-[#7B61FF]"><Icon icon="lucide:map" /></div>
            <h3 class="mt-5 font-bold">Peta darurat</h3>
            <p class="mt-2 text-[13px] leading-5 text-gray-500">Unit terdekat dalam satu peta.</p>
          </div>

          <div class="rounded-2xl border border-[#e6e3ef] bg-white p-6">
            <div class="text-[22px] text-[#7B61FF]"><Icon icon="lucide:clipboard-list" /></div>
            <h3 class="mt-5 font-bold">Buat laporan</h3>
            <p class="mt-2 text-[13px] leading-5 text-gray-500">Form triase 30 detik dengan foto.</p>
          </div>

          <div class="rounded-2xl border border-[#e6e3ef] bg-white p-6">
            <div class="text-[22px] text-[#7B61FF]"><Icon icon="lucide:navigation" /></div>
            <h3 class="mt-5 font-bold">Live tracking</h3>
            <p class="mt-2 text-[13px] leading-5 text-gray-500">GPS petugas realtime di peta.</p>
          </div>

          <div class="rounded-2xl border border-[#e6e3ef] bg-white p-6">
            <div class="text-[22px] text-[#7B61FF]"><Icon icon="lucide:bar-chart-2" /></div>
            <h3 class="mt-5 font-bold">Analytics</h3>
            <p class="mt-2 text-[13px] leading-5 text-gray-500">SLA, response, feedback warga.</p>
          </div>

          <div class="rounded-2xl border border-[#e6e3ef] bg-white p-6">
            <div class="text-[22px] text-[#7B61FF]"><Icon icon="ic:baseline-whatsapp" /></div>
            <h3 class="mt-5 font-bold">WA integration</h3>
            <p class="mt-2 text-[13px] leading-5 text-gray-500">Notifikasi otomatis via WhatsApp.</p>
          </div>

          <div class="rounded-2xl border border-[#e6e3ef] bg-white p-6">
            <div class="text-[22px] text-[#7B61FF]"><Icon icon="lucide:hospital" /></div>
            <h3 class="mt-5 font-bold">SATUSEHAT</h3>
            <p class="mt-2 text-[13px] leading-5 text-gray-500">Data RS Kemenkes terintegrasi.</p>
          </div>

          <div class="rounded-2xl border border-[#e6e3ef] bg-white p-6">
            <div class="text-[22px] text-[#7B61FF]"><Icon icon="lucide:zap" /></div>
            <h3 class="mt-5 font-bold">Auto-dispatch</h3>
            <p class="mt-2 text-[13px] leading-5 text-gray-500">SLA lewat → eskalasi otomatis.</p>
          </div>

          <div class="rounded-2xl border border-[#e6e3ef] bg-white p-6">
            <div class="text-[22px] text-[#7B61FF]"><Icon icon="lucide:mountain" /></div>
            <h3 class="mt-5 font-bold">Modul SAR</h3>
            <p class="mt-2 text-[13px] leading-5 text-gray-500">Shift, karvak, magic-link track.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= SECURITY ================= -->
    <section class="border-y border-[#eceaf2] bg-white py-20">
      <div class="mx-auto max-w-[1000px] px-5 text-center">
        <div class="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">
          Aman &amp; compliant
        </div>

        <div class="mt-8 flex flex-wrap justify-center gap-4">
          <div class="rounded-full border border-[#dedbe8] px-6 py-3 text-[11px] font-bold">HTTPS ENCRYPTED</div>
          <div class="rounded-full border border-[#dedbe8] px-6 py-3 text-[11px] font-bold">DATA LOKAL INDONESIA</div>
          <div class="rounded-full border border-[#dedbe8] px-6 py-3 text-[11px] font-bold">SATUSEHAT RESMI</div>
          <div class="rounded-full border border-[#dedbe8] px-6 py-3 text-[11px] font-bold">OPEN SOURCE</div>
        </div>
      </div>
    </section>

    <!-- ================= FAQ ================= -->
    <section id="faq" class="bg-white py-32">
      <div class="mx-auto max-w-[850px] px-5">
        <div class="text-center">
          <div class="text-[12px] font-bold uppercase tracking-[2px] text-[#7B61FF]">FAQ</div>
          <h2 class="mt-4 text-[40px] font-bold tracking-[-1.5px]">
            Pertanyaan yang sering muncul
          </h2>
        </div>

        <div class="mt-14 divide-y divide-[#e8e6ee]">
          <div v-for="(f, i) in faqs" :key="f.q" class="py-6">
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-between text-left text-[17px] font-bold"
              @click="toggleFaq(i)"
              :aria-expanded="openFaq === i"
            >
              {{ f.q }}
              <span
                class="text-xl transition-transform"
                :class="openFaq === i && 'rotate-45'"
              >
                +
              </span>
            </button>
            <p v-if="openFaq === i" class="mt-4 max-w-[700px] text-[15px] leading-7 text-gray-500">
              {{ f.a }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= FINAL CTA ================= -->
    <section class="relative overflow-hidden bg-[#181726] py-32 text-white">
      <div class="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#7B61FF]/20 blur-[120px]" />

      <div class="relative mx-auto max-w-[820px] px-5 text-center">
        <h2 class="text-[44px] font-bold leading-[1.05] tracking-[-2px] sm:text-[60px]">
          Bangun jaringan darurat.
          <br />
          Selamatkan lebih banyak nyawa.
        </h2>
        <p class="mx-auto mt-6 max-w-[580px] text-[17px] leading-8 text-white/60">
          Buka aplikasi kalau kamu warga. Ajukan onboarding kalau kamu unit.
          Hubungi kami kalau kamu ingin dukung.
        </p>

        <NuxtLink
          to="/"
          class="mt-9 inline-flex rounded-xl bg-white px-8 py-3.5 text-[15px] font-bold text-[#222130] transition hover:-translate-y-0.5"
        >
          Buka app — gratis
        </NuxtLink>
      </div>
    </section>

    <!-- ================= FOOTER ================= -->
    <footer class="bg-[#11101b] text-white">
      <div class="mx-auto max-w-[1180px] px-5 py-20">
        <div class="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div class="lg:col-span-2">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7B61FF]">
                <Icon icon="mynaui:ambulance-solid" class="text-white text-[16px]" />
              </div>
              <span class="text-[19px] font-bold">butuhbantuan</span>
            </div>
            <p class="mt-5 max-w-[340px] text-[14px] leading-6 text-white/50">
              Platform darurat sipil Indonesia. Open, gratis, dibangun bersama
              komunitas.
            </p>
          </div>

          <div>
            <h3 class="text-[12px] font-bold uppercase tracking-wider text-white/40">Warga</h3>
            <div class="mt-5 space-y-3 text-[13px] text-white/60">
              <NuxtLink to="/" class="block hover:text-white">Buka app</NuxtLink>
              <NuxtLink to="/my-tickets" class="block hover:text-white">Cek tiket</NuxtLink>
              <a href="#warga" class="block hover:text-white">Fitur</a>
              <a href="#platform" class="block hover:text-white">Platform</a>
            </div>
          </div>

          <div>
            <h3 class="text-[12px] font-bold uppercase tracking-wider text-white/40">Unit</h3>
            <div class="mt-5 space-y-3 text-[13px] text-white/60">
              <a href="https://dashboard.butuhbantuan.space" class="block hover:text-white">Login dashboard</a>
              <a href="#unit" class="block hover:text-white">Fitur dashboard</a>
              <a href="mailto:hello@butuhbantuan.space?subject=Onboarding" class="block hover:text-white">Onboarding</a>
              <a href="#faq" class="block hover:text-white">FAQ unit</a>
            </div>
          </div>

          <div>
            <h3 class="text-[12px] font-bold uppercase tracking-wider text-white/40">Kontak</h3>
            <div class="mt-5 space-y-3 text-[13px] text-white/60">
              <a href="mailto:hello@butuhbantuan.space" class="block hover:text-white">hello@butuhbantuan.space</a>
              <a href="mailto:hello@butuhbantuan.space?subject=Sponsor" class="block hover:text-white">Sponsor</a>
              <a href="mailto:hello@butuhbantuan.space?subject=Pemerintah" class="block hover:text-white">Kolaborasi Pemda</a>
            </div>
          </div>
        </div>

        <div class="mt-16 border-t border-white/10 pt-7 text-[12px] text-white/40">
          © {{ new Date().getFullYear() }} ButuhBantuan · Dibangun untuk komunitas Indonesia
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.bb-page {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: #1d1e2c;
  background: #fff;
  scroll-behavior: smooth;
}

.gradient-text {
  background: linear-gradient(100deg, #6d4aff 0%, #a56cff 45%, #ff71b7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-gradient {
  background:
    radial-gradient(circle at 50% 0%, rgba(123, 97, 255, 0.14), transparent 45%),
    #ffffff;
}

.grid-bg {
  background-image:
    linear-gradient(rgba(123, 97, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(123, 97, 255, 0.045) 1px, transparent 1px);
  background-size: 36px 36px;
}

.kanban-scroll::-webkit-scrollbar {
  height: 8px;
}
.kanban-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.kanban-scroll::-webkit-scrollbar-thumb {
  background: #d9d7e8;
  border-radius: 999px;
}

.shadow-soft {
  box-shadow: 0 20px 60px rgba(29, 30, 44, 0.1);
}
.shadow-card {
  box-shadow: 0 12px 40px rgba(29, 30, 44, 0.08);
}
</style>
