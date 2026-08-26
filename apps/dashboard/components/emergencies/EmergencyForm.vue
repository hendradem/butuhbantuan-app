<script setup lang="ts">
import { Icon } from "@iconify/vue";

const emit = defineEmits<{ openMapPicker: [] }>();

const props = defineProps<{
  types: any[];
  form: {
    name: string;
    organization_name: string;
    organization_type: string;
    organization_logo: string;
    description: string;
    type_id: string;
    phone: string;
    whatsapp: string;
    email: string;
    district_id: string;
    regency_id: string;
    province_id: string;
    regency_display: string;
    province_display: string;
    full_address: string;
    lat: string;
    lng: string;
    is_dispatcher: boolean;
    is_province_dispatcher: boolean;
    partner_tier: string;
    trained_driver: boolean;
    has_oxygen: boolean;
    has_stretcher: boolean;
    equipment_notes: string;
    type_of_service: string;
    tipe_emergency: string[];
    is_active: boolean;
    is_24_hours: boolean;
    open_time: string;
    close_time: string;
    total_units: number;
    available_units: number;
  };
}>();

const partnerTierOptions = [
  { value: "psc", title: "Resmi", desc: "PSC 119, Damkar, Basarnas, SPGDT — prioritas tertinggi" },
  { value: "verified", title: "Terverifikasi", desc: "Unit komunitas yang sudah diverifikasi (mis. PMI)" },
  { value: "community", title: "Komunitas", desc: "Unit informal / grup WA — default" },
] as const;

function setPartnerTier(value: string) {
  props.form.partner_tier = value;
}

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

// ── Auth ──────────────────────────────────────────────────────────────────────
const authToken = useCookie<string | null>("dashboard-token");

// ── Logo Upload ───────────────────────────────────────────────────────────────
const uploadingLogo = ref(false);
const uploadError = ref("");

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  uploadingLogo.value = true;
  uploadError.value = "";
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await $fetch<{ data: { url: string } }>(`${baseUrl}/api/v1/upload`, {
      method: "POST",
      body: fd,
      headers: authToken.value ? { "X-Admin-Key": authToken.value } : {},
    });
    props.form.organization_logo = baseUrl + res.data.url;
  } catch {
    uploadError.value = "Gagal mengupload gambar";
  } finally {
    uploadingLogo.value = false;
  }
}

// ── Province / Regency cascading select ──────────────────────────────────────
const provinces = ref<{ id: string; name: string }[]>([]);
const regencies = ref<{ id: string; province_id: string; name: string }[]>([]);
const provincesLoading = ref(false);
const regenciesLoading = ref(false);
const selectedProvinceId = ref(props.form.province_id || "");

onMounted(async () => {
  await fetchProvinces();
  if (selectedProvinceId.value) {
    await fetchRegenciesByProvince(selectedProvinceId.value);
  }
});

watch(() => props.form.province_id, async (v) => {
  if (v && v !== selectedProvinceId.value) {
    selectedProvinceId.value = v;
    await fetchRegenciesByProvince(v);
  } else if (!v) {
    selectedProvinceId.value = "";
    regencies.value = [];
  }
});

async function fetchProvinces() {
  provincesLoading.value = true;
  try {
    const res = await $fetch<{ data: any[] }>(
      `${baseUrl}/api/v1/service/province?covered_only=1`
    );
    provinces.value = res.data ?? [];
  } catch {
    provinces.value = [];
  } finally {
    provincesLoading.value = false;
  }
}

async function fetchRegenciesByProvince(provinceId: string) {
  if (!provinceId) return;
  regenciesLoading.value = true;
  try {
    const res = await $fetch<{ data: any[] }>(
      `${baseUrl}/api/v1/service/regency?province_id=${provinceId}&covered_only=1`
    );
    regencies.value = res.data ?? [];
  } catch {
    regencies.value = [];
  } finally {
    regenciesLoading.value = false;
  }
}

async function onProvinceChange() {
  props.form.province_id = selectedProvinceId.value;
  props.form.regency_id = "";
  props.form.regency_display = "";
  const prov = provinces.value.find((p) => p.id === selectedProvinceId.value);
  props.form.province_display = prov?.name ?? "";
  regencies.value = [];
  if (selectedProvinceId.value) {
    await fetchRegenciesByProvince(selectedProvinceId.value);
  }
}

function onRegencyChange() {
  const reg = regencies.value.find((r) => r.id === props.form.regency_id);
  props.form.regency_display = reg?.name ?? "";
}

// ── Address search (Geoapify → lat/lng) ──────────────────────────────────────
const addressQuery = ref("");
const addressResults = ref<any[]>([]);
const addressLoading = ref(false);
const showAddressDrop = ref(false);
const addressInputRef = ref<HTMLElement | null>(null);

// Fixed-position dropdown style computed from the input's viewport rect
const addrDropStyle = computed(() => {
  const el = addressInputRef.value;
  if (!el) return {};
  const rect = el.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < 220 && rect.top > spaceBelow;
  return openUp
    ? {
        bottom: `${window.innerHeight - rect.top + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      }
    : {
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      };
});

let addrTimer: ReturnType<typeof setTimeout>;

function onAddressInput() {
  clearTimeout(addrTimer);
  if (addressQuery.value.length < 3) {
    addressResults.value = [];
    showAddressDrop.value = false;
    return;
  }
  addrTimer = setTimeout(fetchAddresses, 400);
}

function hideAddressDrop() {
  setTimeout(() => {
    showAddressDrop.value = false;
  }, 200);
}

async function fetchAddresses() {
  addressLoading.value = true;
  try {
    const res = await $fetch<{ data: any[] }>(
      `${baseUrl}/api/v1/geocoding/search?q=${encodeURIComponent(addressQuery.value)}`
    );
    addressResults.value = res.data ?? [];
    showAddressDrop.value = addressResults.value.length > 0;
  } catch {
    addressResults.value = [];
  } finally {
    addressLoading.value = false;
  }
}

function selectAddress(item: any) {
  props.form.lat = String(item.lat ?? "");
  props.form.lng = String(item.lon ?? "");
  props.form.full_address = item.display_name ?? addressQuery.value;
  addressQuery.value = item.display_name ?? addressQuery.value;
  showAddressDrop.value = false;
}

</script>

<template>
  <div class="space-y-5 pr-1">

    <!-- Status Aktif (quick toggle) -->
    <label class="flex items-center gap-3 cursor-pointer w-fit">
      <div class="relative">
        <input v-model="form.is_active" type="checkbox" class="sr-only peer" />
        <div class="w-10 h-6 rounded-full transition-colors peer-checked:bg-green-500 bg-neutral-300" />
        <div class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <span :class="['text-sm font-medium', form.is_active ? 'text-green-700' : 'text-neutral-500']">
        {{ form.is_active ? 'Layanan Aktif' : 'Layanan Nonaktif' }}
      </span>
    </label>

    <!-- Basic Info -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <UiFormField label="Nama Layanan" required>
        <UiInput v-model="form.name" placeholder="mis. Ambulance RSUP Dr. Sardjito" />
      </UiFormField>
      <UiFormField label="Jenis" required>
        <UiSelect v-model="form.type_id" placeholder="Pilih jenis">
          <option v-for="t in types" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
        </UiSelect>
      </UiFormField>
      <UiFormField label="Nama Organisasi">
        <UiInput v-model="form.organization_name" placeholder="mis. RSUP Dr. Sardjito" />
      </UiFormField>
      <UiFormField label="Tipe Organisasi">
        <UiInput v-model="form.organization_type" placeholder="mis. Rumah Sakit Pemerintah" />
      </UiFormField>
      <div class="col-span-2 sm:col-span-1">
        <label class="block text-sm font-medium text-neutral-900 mb-2">Tipe Emergency</label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in ['emergency', 'transport', 'pencarian dan pertolongan']"
            :key="opt"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors"
            :class="form.tipe_emergency.includes(opt) ? 'bg-primary-50 border-primary-400 text-primary-700 font-medium' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'"
          >
            <input type="checkbox" :value="opt" v-model="form.tipe_emergency" class="hidden" />
            {{ opt.charAt(0).toUpperCase() + opt.slice(1) }}
          </label>
        </div>
      </div>
    </div>
    <UiFormField label="Deskripsi">
      <UiTextarea v-model="form.description" :rows="2" placeholder="Deskripsi singkat..." />
    </UiFormField>

    <!-- Logo -->
    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Logo / Gambar</p>
      <div class="flex items-start gap-3">
        <div class="w-16 h-16 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            v-if="form.organization_logo"
            :src="form.organization_logo"
            class="w-full h-full object-contain p-1"
            alt="logo"
            @error="form.organization_logo = ''"
          />
          <Icon v-else icon="lucide:image" class="text-2xl text-neutral-300" />
        </div>
        <div class="flex-1 space-y-2">
          <div>
            <label class="block text-xs text-neutral-500 mb-1">URL gambar</label>
            <UiInput v-model="form.organization_logo" type="url" placeholder="https://..." />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-neutral-400">atau</span>
            <label
              class="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 transition-colors"
              :class="uploadingLogo ? 'opacity-50 pointer-events-none' : ''"
            >
              <UiSpinner v-if="uploadingLogo" size="xs" />
              <Icon v-else icon="lucide:upload" class="text-sm" />
              {{ uploadingLogo ? 'Mengupload...' : 'Upload file' }}
              <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
            </label>
          </div>
          <p v-if="uploadError" class="text-xs text-emergency-600">{{ uploadError }}</p>
        </div>
      </div>
    </div>

    <!-- Contact -->
    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Kontak</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <UiFormField label="Telepon">
          <UiInput v-model="form.phone" placeholder="+62..." />
        </UiFormField>
        <UiFormField label="WhatsApp">
          <UiInput v-model="form.whatsapp" placeholder="+62..." />
        </UiFormField>
        <UiFormField label="Email">
          <UiInput v-model="form.email" type="email" placeholder="email@..." />
        </UiFormField>
      </div>
    </div>

    <!-- Location -->
    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Lokasi</p>

      <!-- Province → Regency cascade -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <UiFormField label="Provinsi (wilayah tercakup)">
          <UiSelect
            v-model="selectedProvinceId"
            :disabled="provincesLoading"
            :placeholder="provincesLoading ? 'Memuat...' : (provinces.length ? 'Pilih provinsi' : 'Belum ada wilayah tercakup')"
            @change="onProvinceChange"
          >
            <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
          </UiSelect>
        </UiFormField>
        <UiFormField label="Kabupaten / Kota (tercakup)">
          <UiSelect
            v-model="form.regency_id"
            :disabled="!selectedProvinceId || regenciesLoading"
            :placeholder="!selectedProvinceId ? 'Pilih provinsi dulu' : regenciesLoading ? 'Memuat...' : 'Pilih kabupaten/kota'"
            @change="onRegencyChange"
          >
            <option v-for="r in regencies" :key="r.id" :value="r.id">{{ r.name }}</option>
          </UiSelect>
        </UiFormField>
      </div>
      <p v-if="!provincesLoading && !provinces.length" class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
        Belum ada wilayah tercakup. Tambah kab/kota dulu di menu
        <NuxtLink to="/regions" class="font-semibold underline">Wilayah Tercakup</NuxtLink>.
      </p>

      <!-- Full address -->
      <div class="mb-3">
        <UiFormField label="Alamat Lengkap">
          <UiInput v-model="form.full_address" placeholder="Jl. ..." />
        </UiFormField>
      </div>

      <!-- Address search for coordinates -->
      <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-900 mb-2">
          Cari Alamat <span class="font-normal text-neutral-400 text-xs">(untuk mengisi koordinat otomatis)</span>
        </label>
        <div ref="addressInputRef" class="relative">
          <UiSearchInput
            v-model="addressQuery"
            placeholder="Ketik alamat lengkap..."
            autocomplete="off"
            @update:model-value="onAddressInput"
            @blur="hideAddressDrop"
          />
          <Icon
            v-if="addressLoading"
            icon="lucide:loader-2"
            class="animate-spin absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none z-10"
          />
        </div>
        <!-- Dropdown teleported outside overflow container -->
        <Teleport to="body">
          <div
            v-if="showAddressDrop && addressResults.length"
            :style="{ ...addrDropStyle, pointerEvents: 'auto' }"
            class="fixed z-[9999] bg-white border border-neutral-200 rounded-lg shadow-xl max-h-52 overflow-y-auto"
            @pointerdown.stop
          >
            <button
              v-for="(item, i) in addressResults.slice(0, 6)"
              :key="i"
              type="button"
              class="w-full text-left px-3 py-2.5 text-sm hover:bg-neutral-50 border-b border-neutral-100 last:border-0 transition-colors cursor-pointer"
              @mousedown.prevent="selectAddress(item)"
            >
              <div class="flex items-start gap-2">
                <Icon icon="lucide:map-pin" class="text-neutral-400 text-sm mt-0.5 shrink-0" />
                <span class="truncate">{{ item.display_name ?? 'Lokasi' }}</span>
              </div>
            </button>
          </div>
        </Teleport>
      </div>

      <!-- Lat/Lng + map picker -->
      <div class="grid grid-cols-2 gap-3">
        <UiFormField label="Latitude">
          <UiInput v-model="form.lat" placeholder="-7.7956" />
        </UiFormField>
        <UiFormField label="Longitude">
          <UiInput v-model="form.lng" placeholder="110.3695" />
        </UiFormField>
      </div>
      <button
        type="button"
        class="mt-2.5 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        @click="emit('openMapPicker')"
      >
        <Icon icon="lucide:map-pin" class="text-base" />
        Pilih lokasi di peta
      </button>
    </div>

    <!-- Config -->
    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Konfigurasi</p>
      <div class="space-y-2">
        <label class="flex items-center gap-2.5 cursor-pointer">
          <input
            v-model="form.is_dispatcher"
            type="checkbox"
            class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm text-neutral-700">Dispatcher (menerima panggilan darurat)</span>
        </label>
        <label class="flex items-center gap-2.5 cursor-pointer">
          <input
            v-model="form.is_province_dispatcher"
            type="checkbox"
            class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm text-neutral-700">Dispatcher tingkat provinsi</span>
        </label>
      </div>
    </div>

    <!-- Partner tier -->
    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tingkat Mitra</p>
      <p class="text-xs text-neutral-400 mb-3">Kualitas &amp; kepercayaan — terpisah dari peran dispatcher cascade.</p>
      <div class="space-y-2" role="radiogroup" aria-label="Tingkat mitra">
        <label
          v-for="opt in partnerTierOptions"
          :key="opt.value"
          class="flex items-start gap-2.5 cursor-pointer rounded-lg border px-3 py-2.5 transition-colors"
          :class="form.partner_tier === opt.value ? 'border-primary-300 bg-primary-50/60' : 'border-neutral-200 hover:bg-neutral-50'"
          @click.prevent="setPartnerTier(opt.value)"
        >
          <input
            type="radio"
            name="partner_tier"
            :value="opt.value"
            :checked="form.partner_tier === opt.value"
            class="mt-0.5 w-4 h-4 border-neutral-300 text-primary-600 focus:ring-primary-500 pointer-events-none"
            tabindex="-1"
          />
          <span>
            <span class="block text-sm font-medium text-neutral-800">{{ opt.title }}</span>
            <span class="block text-xs text-neutral-500 mt-0.5">{{ opt.desc }}</span>
          </span>
        </label>
      </div>
    </div>

    <!-- Readiness -->
    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Kesiapan di lapangan</p>
      <p class="text-xs text-neutral-400 mb-3">Dipakai untuk ranking kandidat dispatch.</p>
      <div class="space-y-2">
        <label class="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            :checked="form.trained_driver"
            @change="form.trained_driver = ($event.target as HTMLInputElement).checked"
          />
          <span class="text-sm text-neutral-700">Sopir terlatih / bersertifikat</span>
        </label>
        <label class="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            :checked="form.has_oxygen"
            @change="form.has_oxygen = ($event.target as HTMLInputElement).checked"
          />
          <span class="text-sm text-neutral-700">Tersedia oksigen</span>
        </label>
        <label class="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            :checked="form.has_stretcher"
            @change="form.has_stretcher = ($event.target as HTMLInputElement).checked"
          />
          <span class="text-sm text-neutral-700">Tersedia brankar / stretcher</span>
        </label>
      </div>
      <div class="mt-3">
        <UiFormField label="Catatan peralatan (opsional)">
          <UiInput v-model="form.equipment_notes" placeholder="Mis. AED, suction, incubator..." />
        </UiFormField>
      </div>
    </div>

    <!-- Operational Status -->
    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Status Operasional</p>
      <div class="space-y-3">
        <label class="flex items-center gap-2.5 cursor-pointer">
          <input
            v-model="form.is_24_hours"
            type="checkbox"
            class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm text-neutral-700">Beroperasi 24 jam</span>
        </label>
        <div v-if="!form.is_24_hours" class="grid grid-cols-2 gap-3">
          <UiFormField label="Jam Buka">
            <UiInput v-model="form.open_time" type="time" />
          </UiFormField>
          <UiFormField label="Jam Tutup">
            <UiInput v-model="form.close_time" type="time" />
          </UiFormField>
        </div>
      </div>
    </div>

    <!-- Fleet -->
    <div class="border-t border-neutral-100 pt-4">
      <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Ketersediaan Armada</p>
      <div class="grid grid-cols-2 gap-3">
        <UiFormField label="Total Unit">
          <UiInput v-model.number="form.total_units" type="number" min="0" placeholder="0" />
        </UiFormField>
        <UiFormField label="Unit Tersedia">
          <UiInput v-model.number="form.available_units" type="number" min="0" :max="form.total_units" placeholder="0" />
        </UiFormField>
      </div>
      <p class="text-xs text-neutral-400 mt-1.5">Unit dapat diperbarui secara real-time oleh operator unit dari panel mereka.</p>
    </div>
  </div>

</template>
