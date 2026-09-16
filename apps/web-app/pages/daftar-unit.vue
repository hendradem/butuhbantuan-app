<script setup lang="ts">
/**
 * /daftar-unit — public "daftarkan unit kamu" form.
 *
 * Asks for the same fields the dashboard's create form does (see
 * components/emergencies/EmergencyForm.vue) so an admin approving the request
 * gets a unit that is ready to activate. A few fields carry a longer hint
 * because a partner filling this alone has no one to ask.
 *
 * Submitting does NOT create the service: it stores a pending request that an
 * admin reviews in the dashboard's "Request" tab.
 */
import { Icon } from "@iconify/vue";
import { PARTNER_TIER_OPTIONS } from "@butuhbantuan/utils";
import { DASHBOARD_URL } from "~/utils/landingContent";

definePageMeta({ layout: false });

const title = "Daftarkan unit darurat kamu";
const description =
  "Daftarkan ambulans, damkar, tim SAR, PMI, PSC 119, atau rumah sakit ke jaringan ButuhBantuan. Gratis, tanpa biaya pendaftaran.";

useHead({
  title: `${title} · ButuhBantuan`,
  meta: [
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ],
});

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

// ── Form state (mirrors the dashboard create form's defaults) ───────────────
const form = reactive({
  name: "",
  type_id: "",
  organization_name: "",
  organization_type: "",
  description: "",
  organization_logo: "",
  phone: "",
  whatsapp: "",
  email: "",
  province_id: "",
  regency_id: "",
  full_address: "",
  lat: "",
  lng: "",
  tipe_emergency: [] as string[],
  is_dispatcher: false,
  is_province_dispatcher: false,
  dashboard_access: true,
  partner_tier: "community",
  is_24_hours: false,
  open_time: "08:00",
  close_time: "17:00",
  total_units: 1,
});

/** Filled only by bots; the submit handler drops the submission when set. */
const honeypot = ref("");

const submitting = ref(false);
const sent = ref(false);
const submitError = ref("");
const errors = reactive<{ name?: string; type?: string; contact?: string; location?: string }>({});

// ── Emergency types ─────────────────────────────────────────────────────────
const { data: typesData } = useAsyncData("daftar-unit-types", () =>
  $fetch<{ data: any[] }>(`${baseUrl}/api/v1/emergency/type`),
);
const types = computed(() => typesData.value?.data ?? []);
const selectedTypeName = computed(
  () => types.value.find((t) => String(t.id) === String(form.type_id))?.name ?? "",
);

// ── Covered province / regency cascade (same allowlist the dashboard uses) ──
const provinces = ref<{ id: string; name: string }[]>([]);
const regencies = ref<{ id: string; name: string }[]>([]);
const loadingProvinces = ref(false);
const loadingRegencies = ref(false);

async function loadProvinces() {
  loadingProvinces.value = true;
  try {
    const res = await $fetch<{ data: any[] }>(`${baseUrl}/api/v1/service/province?covered_only=1`);
    provinces.value = res.data ?? [];
  } catch {
    provinces.value = [];
  } finally {
    loadingProvinces.value = false;
  }
}

async function loadRegencies(provinceId: string) {
  if (!provinceId) {
    regencies.value = [];
    return;
  }
  loadingRegencies.value = true;
  try {
    const res = await $fetch<{ data: any[] }>(
      `${baseUrl}/api/v1/service/regency?province_id=${encodeURIComponent(provinceId)}&covered_only=1`,
    );
    regencies.value = res.data ?? [];
  } catch {
    regencies.value = [];
  } finally {
    loadingRegencies.value = false;
  }
}

function onProvinceChange() {
  form.regency_id = "";
  void loadRegencies(form.province_id);
}

onMounted(loadProvinces);

// ── Address search → coordinates ────────────────────────────────────────────
const addressQuery = ref("");
const addressResults = ref<any[]>([]);
const searchingAddress = ref(false);
let addressTimer: ReturnType<typeof setTimeout> | undefined;

function onAddressInput() {
  clearTimeout(addressTimer);
  if (addressQuery.value.trim().length < 3) {
    addressResults.value = [];
    return;
  }
  addressTimer = setTimeout(searchAddress, 400);
}

async function searchAddress() {
  searchingAddress.value = true;
  try {
    const res = await $fetch<{ data: any[] }>(
      `${baseUrl}/api/v1/geocoding/search?q=${encodeURIComponent(addressQuery.value.trim())}`,
    );
    addressResults.value = (res.data ?? []).slice(0, 6);
  } catch {
    addressResults.value = [];
  } finally {
    searchingAddress.value = false;
  }
}

function pickAddress(item: any) {
  form.lat = String(item.lat ?? "");
  form.lng = String(item.lon ?? "");
  form.full_address = item.display_name ?? addressQuery.value;
  addressQuery.value = item.display_name ?? addressQuery.value;
  addressResults.value = [];
}

function onAddressBlur() {
  // Let a result's mousedown land before the list disappears.
  setTimeout(() => (addressResults.value = []), 200);
}

// ── Submit ──────────────────────────────────────────────────────────────────
function validate() {
  errors.name = form.name.trim() ? undefined : "Nama layanan wajib diisi.";
  errors.type = form.type_id ? undefined : "Pilih jenis layanan.";
  errors.contact =
    form.phone.trim() || form.whatsapp.trim()
      ? undefined
      : "Isi minimal nomor telepon atau WhatsApp yang bisa dihubungi.";
  errors.location = form.lat && form.lng ? undefined : "Tandai lokasi unitmu di peta.";
  return !errors.name && !errors.type && !errors.contact && !errors.location;
}

async function submit() {
  submitError.value = "";
  // A human never sees this field; anything in it is a bot.
  if (honeypot.value.trim()) {
    sent.value = true;
    return;
  }
  if (!validate()) {
    submitError.value = "Masih ada isian yang perlu dilengkapi.";
    return;
  }

  submitting.value = true;
  try {
    await $fetch(`${baseUrl}/api/v1/partner-request/`, {
      method: "POST",
      body: {
        payload: {
          name: form.name.trim(),
          organization_name: form.organization_name.trim(),
          organization_type: form.organization_type.trim(),
          organization_logo: form.organization_logo.trim(),
          description: form.description.trim(),
          coordinates: [form.lng, form.lat],
          tipe_emergency: form.tipe_emergency,
          is_dispatcher: form.is_dispatcher,
          is_province_dispatcher: form.is_province_dispatcher,
          partner_tier: form.partner_tier,
          dashboard_access: form.dashboard_access,
          emergency_type: { id: Number(form.type_id) },
          contact: {
            phone: form.phone.trim(),
            whatsapp: form.whatsapp.trim(),
            email: form.email.trim(),
          },
          address: {
            province_id: form.province_id,
            regency_id: form.regency_id,
            full_address: form.full_address.trim(),
          },
          operational: {
            is_active: false,
            is_24_hours: form.is_24_hours,
            open_time: form.open_time,
            close_time: form.close_time,
          },
          // Availability per day is set by the unit once they are on the
          // dashboard; a new partner reports fleet size only.
          fleet: { total: Number(form.total_units) || 0, available: Number(form.total_units) || 0 },
        },
      },
    });
    sent.value = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err: any) {
    submitError.value =
      err?.data?.message ?? "Gagal mengirim permintaan. Coba lagi sebentar lagi.";
  } finally {
    submitting.value = false;
  }
}

const nextSteps: { icon: string; title: string; body: string }[] = [
  {
    icon: "lucide:clipboard-check",
    title: "Kami periksa datanya",
    body: "Tim mengecek jenis layanan, wilayah, dan kelengkapan kontak. Biasanya 1–2 hari kerja.",
  },
  {
    icon: "lucide:phone-call",
    title: "Admin menghubungi kamu",
    body: "Kami hubungi lewat WhatsApp atau telepon untuk verifikasi dan menanyakan detail operasional.",
  },
  {
    icon: "lucide:key-round",
    title: "Akun dashboard dibuat",
    body: "Setelah cocok, kami buatkan username dan password supaya unitmu bisa menerima laporan warga.",
  },
];
</script>

<template>
  <LandingShell>
    <section class="pb-24 pt-32 sm:pt-40">
      <div class="lp-container">
        <!-- ================= HERO ================= -->
        <div class="lp-tone-red max-w-[46rem]" data-reveal>
          <span class="lp-eyebrow">Untuk unit emergency</span>
          <h1 class="lp-display mt-5 max-w-[18ch] text-[clamp(2.1rem,5vw,3.4rem)]">
            Daftarkan unitmu, terima laporan dari warga.
          </h1>
          <p class="lp-lead mt-6 max-w-[54ch]">
            Gratis, tanpa biaya pendaftaran. Isi data unitmu sekali, lalu tim kami
            yang menghubungi untuk mengaktifkan akses dashboard.
          </p>
        </div>

        <!-- ================= SUCCESS ================= -->
        <div v-if="sent" class="lp-card-static mx-auto mt-14 max-w-[42rem] p-8 text-center sm:p-12" data-reveal>
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <Icon icon="lucide:check" class="text-[26px] text-emerald-600" />
          </span>
          <h2 class="lp-h2 mt-6 text-[clamp(1.6rem,3.4vw,2.2rem)]">Permintaanmu sudah masuk.</h2>
          <p class="lp-lead mx-auto mt-4 max-w-[42ch]">
            Terima kasih. Admin akan menghubungi kamu lewat WhatsApp atau telepon
            untuk verifikasi, lalu membuatkan akun dashboard unit.
          </p>
          <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
            <NuxtLink to="/landing" class="lp-btn lp-btn--ghost">Kembali ke beranda</NuxtLink>
            <NuxtLink to="/" class="lp-btn lp-btn--accent">
              Buka aplikasi warga
              <Icon icon="lucide:arrow-right" class="lp-btn-arrow text-[16px]" />
            </NuxtLink>
          </div>
        </div>

        <div v-else class="mt-14 grid gap-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
          <!-- ================= WHAT HAPPENS NEXT ================= -->
          <aside class="lg:sticky lg:top-28 lg:self-start" data-reveal>
            <h2 class="text-[17px] font-semibold tracking-[-0.015em]">Setelah kamu kirim</h2>
            <ol class="mt-6 space-y-6">
              <li v-for="(s, i) in nextSteps" :key="s.title" class="flex gap-4">
                <span class="lp-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lp-surface)] text-[12.5px] text-[var(--lp-muted)]">
                  {{ i + 1 }}
                </span>
                <span class="min-w-0">
                  <span class="block text-[15px] font-semibold">{{ s.title }}</span>
                  <span class="lp-body mt-1 block">{{ s.body }}</span>
                </span>
              </li>
            </ol>

            <div class="mt-9 rounded-[22px] bg-[var(--lp-surface)] p-5">
              <p class="m-0 text-[14px] font-semibold">Sudah punya akun?</p>
              <p class="lp-body mt-1.5">
                Unit yang sudah terdaftar bisa langsung masuk ke dashboard.
              </p>
              <a :href="DASHBOARD_URL" class="lp-link mt-3 text-[14px]">
                Masuk dashboard
                <Icon icon="lucide:arrow-up-right" class="text-[15px]" />
              </a>
            </div>
          </aside>

          <!-- ================= FORM ================= -->
          <form class="min-w-0" novalidate @submit.prevent="submit">
            <!-- Layanan -->
            <fieldset class="lp-card-static min-w-0 p-6 sm:p-8">
              <legend class="sr-only">Data layanan</legend>
              <h2 class="lp-group-title">Layanan</h2>

              <div class="mt-6 grid gap-5 sm:grid-cols-2">
                <UiFormField label="Nama layanan" required :error="errors.name">
                  <UiInput v-model="form.name" placeholder="mis. Ambulans Relawan Sleman" />
                </UiFormField>
                <UiFormField
                  label="Jenis layanan"
                  required
                  :error="errors.type"
                  hint="Pilih yang paling mendekati. Admin bisa menyesuaikan nanti."
                >
                  <UiSelect v-model="form.type_id" placeholder="Pilih jenis">
                    <option v-for="t in types" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
                  </UiSelect>
                </UiFormField>
                <UiFormField label="Nama organisasi">
                  <UiInput v-model="form.organization_name" placeholder="mis. Yayasan Ambulans Sehat" />
                </UiFormField>
                <UiFormField
                  label="Tipe organisasi"
                  hint="Contoh: PSC 119, Dinas Pemadam Kebakaran, PMI, RS Swasta, komunitas relawan."
                >
                  <UiInput v-model="form.organization_type" placeholder="mis. Komunitas relawan" />
                </UiFormField>
                <UiJenisPelayananPicker
                  v-model="form.tipe_emergency"
                  :emergency-type-name="selectedTypeName"
                />
              </div>

              <div class="mt-5">
                <UiFormField label="Deskripsi singkat" hint="Satu-dua kalimat tentang unitmu dan wilayah kerjanya.">
                  <UiTextarea v-model="form.description" :rows="3" placeholder="Ceritakan singkat tentang unitmu..." />
                </UiFormField>
              </div>

              <div class="mt-5">
                <UiFormField
                  label="Link logo"
                  hint="Boleh dilewati. Tempel URL gambar logo unitmu (mis. dari Google Drive yang bisa diakses publik) — admin bisa menambahkan berkasnya nanti."
                >
                  <div class="flex items-center gap-3">
                    <span class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--lp-surface)]">
                      <img
                        v-if="form.organization_logo"
                        :src="form.organization_logo"
                        alt="Pratinjau logo"
                        class="h-full w-full object-contain p-1"
                        @error="form.organization_logo = ''"
                      >
                      <Icon v-else icon="lucide:image" class="text-[18px] text-[var(--lp-faint)]" />
                    </span>
                    <UiInput v-model="form.organization_logo" type="url" placeholder="https://…" />
                  </div>
                </UiFormField>
              </div>
            </fieldset>

            <!-- Kontak -->
            <fieldset class="mt-4 lp-card-static min-w-0 p-6 sm:p-8">
              <legend class="sr-only">Kontak</legend>
              <h2 class="lp-group-title">Kontak</h2>
              <p class="lp-body mt-2 max-w-[52ch]">
                Nomor ini yang kami hubungi untuk verifikasi. Minimal salah satu
                dari telepon atau WhatsApp harus diisi.
              </p>

              <div class="mt-6 grid gap-5 sm:grid-cols-3">
                <UiFormField label="Telepon">
                  <UiInput v-model="form.phone" placeholder="+62…" />
                </UiFormField>
                <UiFormField label="WhatsApp">
                  <UiInput v-model="form.whatsapp" placeholder="+62…" />
                </UiFormField>
                <UiFormField label="Email">
                  <UiInput v-model="form.email" type="email" placeholder="nama@email.com" />
                </UiFormField>
              </div>
              <p v-if="errors.contact" class="mt-3 text-[13px] text-[var(--lp-accent-ink)]">
                {{ errors.contact }}
              </p>
            </fieldset>

            <!-- Lokasi -->
            <fieldset class="mt-4 lp-card-static min-w-0 p-6 sm:p-8">
              <legend class="sr-only">Lokasi</legend>
              <h2 class="lp-group-title">Lokasi</h2>
              <p class="lp-body mt-2 max-w-[52ch]">
                Titik inilah yang dipakai warga untuk menghitung jarak dan rute,
                jadi usahakan tepat di pos siaga unitmu.
              </p>

              <div class="mt-6 grid gap-5 sm:grid-cols-2">
                <UiFormField
                  label="Provinsi"
                  hint="Hanya provinsi yang sudah masuk cakupan layanan yang bisa dipilih."
                >
                  <UiSelect
                    v-model="form.province_id"
                    :disabled="loadingProvinces"
                    :placeholder="loadingProvinces ? 'Memuat…' : 'Pilih provinsi'"
                    @change="onProvinceChange"
                  >
                    <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </UiSelect>
                </UiFormField>
                <UiFormField label="Kabupaten / kota">
                  <UiSelect
                    v-model="form.regency_id"
                    :disabled="!form.province_id || loadingRegencies"
                    :placeholder="!form.province_id ? 'Pilih provinsi dulu' : loadingRegencies ? 'Memuat…' : 'Pilih kabupaten/kota'"
                  >
                    <option v-for="r in regencies" :key="r.id" :value="r.id">{{ r.name }}</option>
                  </UiSelect>
                </UiFormField>
              </div>

              <div class="mt-5">
                <UiFormField
                  label="Cari alamat"
                  hint="Ketik nama jalan atau daerah, lalu pilih hasilnya — koordinat di bawah akan terisi sendiri."
                >
                  <UiInput
                    v-model="addressQuery"
                    placeholder="mis. Jl. Kaliurang, Sleman"
                    autocomplete="off"
                    @update:model-value="onAddressInput"
                    @blur="onAddressBlur"
                  />
                </UiFormField>
                <ul v-if="addressResults.length" class="mt-2 overflow-hidden rounded-xl bg-[var(--lp-surface)]">
                  <li v-for="(item, i) in addressResults" :key="i">
                    <button
                      type="button"
                      class="flex w-full items-start gap-2.5 px-3.5 py-3 text-left text-[14px] transition-colors hover:bg-[var(--lp-surface-2)]"
                      @mousedown.prevent="pickAddress(item)"
                    >
                      <Icon icon="lucide:map-pin" class="mt-0.5 shrink-0 text-[15px] text-[var(--lp-faint)]" />
                      <span>{{ item.display_name ?? "Lokasi" }}</span>
                    </button>
                  </li>
                </ul>
                <p v-if="searchingAddress" class="mt-2 text-[13px] text-[var(--lp-muted)]">Mencari alamat…</p>
              </div>

              <div class="mt-5">
                <UiFormField label="Alamat lengkap">
                  <UiTextarea v-model="form.full_address" :rows="2" placeholder="Nama jalan, nomor, kelurahan, kecamatan" />
                </UiFormField>
              </div>

              <div class="mt-5">
                <span class="lp-label">Titik lokasi unit</span>
                <LocationPicker
                  v-model:lat="form.lat"
                  v-model:lng="form.lng"
                  :hint="errors.location"
                  @update:address="form.full_address = $event"
                />
              </div>
            </fieldset>

            <!-- Operasional -->
            <fieldset class="mt-4 lp-card-static min-w-0 p-6 sm:p-8">
              <legend class="sr-only">Operasional</legend>
              <h2 class="lp-group-title">Operasional</h2>

              <div class="mt-6">
                <UiCheckbox v-model="form.is_24_hours" label="Beroperasi 24 jam" />
              </div>

              <div v-if="!form.is_24_hours" class="mt-5 grid gap-5 sm:grid-cols-2">
                <UiFormField label="Jam buka">
                  <UiInput v-model="form.open_time" type="time" />
                </UiFormField>
                <UiFormField label="Jam tutup">
                  <UiInput v-model="form.close_time" type="time" />
                </UiFormField>
              </div>

              <div class="mt-5 sm:max-w-[50%]">
                <UiFormField
                  label="Total unit"
                  hint="Jumlah kendaraan atau tim yang siap dikerahkan."
                >
                  <UiInput v-model.number="form.total_units" type="number" min="0" placeholder="0" />
                </UiFormField>
              </div>
            </fieldset>

            <!-- Peran & akses -->
            <fieldset class="mt-4 lp-card-static min-w-0 p-6 sm:p-8">
              <legend class="sr-only">Peran dan akses</legend>
              <h2 class="lp-group-title">Peran &amp; akses</h2>
              <p class="lp-body mt-2 max-w-[52ch]">
                Bagian ini menentukan bagaimana laporan warga sampai ke unitmu.
                Kalau ragu, biarkan seperti bawaan — admin akan memastikan saat
                verifikasi.
              </p>

              <div class="mt-6 space-y-4">
                <UiCheckbox
                  v-model="form.is_dispatcher"
                  label="Dispatcher"
                  description="Unitmu menerima dan meneruskan panggilan darurat dari warga di wilayahnya."
                />

                <UiCheckbox
                  v-model="form.is_province_dispatcher"
                  label="Dispatcher tingkat provinsi"
                  description="Mengoordinasi laporan untuk seluruh provinsi, biasanya PSC 119 atau dinas."
                />

                <UiCheckbox
                  v-model="form.dashboard_access"
                  label="Mau pakai dashboard unit"
                  description="Petugas menerima tugas lewat dashboard ini. Kalau dimatikan, laporan dikirim ke WhatsApp unit dalam bentuk tautan."
                />
              </div>

              <div class="mt-7">
                <span class="lp-label">Tingkat mitra</span>
                <p class="lp-hint">Menentukan prioritas dan label kepercayaan unitmu di peta warga.</p>
                <div class="mt-3 space-y-2" role="radiogroup" aria-label="Tingkat mitra">
                  <UiRadioCard
                    v-for="opt in PARTNER_TIER_OPTIONS"
                    :key="opt.value"
                    v-model="form.partner_tier"
                    name="partner_tier"
                    :value="opt.value"
                    :title="opt.title"
                    :description="opt.desc"
                  />
                </div>
              </div>
            </fieldset>

            <!-- Submit -->
            <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p class="lp-hint m-0 max-w-[40ch]">
                Dengan mengirim, kamu setuju data unit ini kami hubungi dan
                tampilkan di aplikasi setelah diverifikasi.
              </p>
              <UiButton type="submit" size="lg" :loading="submitting" class="shrink-0">
                <Icon v-if="!submitting" icon="lucide:send" class="text-[16px]" />
                {{ submitting ? "Mengirim…" : "Kirim permintaan" }}
              </UiButton>
            </div>

            <p
              v-if="submitError"
              class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] text-red-800"
              role="alert"
            >
              {{ submitError }}
            </p>

            <!-- Bot trap: hidden from people, irresistible to form-fillers. -->
            <div class="sr-only" aria-hidden="true">
              <UiFormField label="Nama perusahaan">
                <UiInput v-model="honeypot" tabindex="-1" autocomplete="off" />
              </UiFormField>
            </div>
          </form>
        </div>
      </div>
    </section>
  </LandingShell>
</template>

<style scoped>
/* Fieldset headings sit outside UiFormField, so they need the same voice. */
.lp-group-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.lp-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--lp-ink);
  margin-bottom: 8px;
}

.lp-hint {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--lp-muted);
}
</style>
