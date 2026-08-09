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
    type_of_service: string;
  };
}>();

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const ic = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"; // kept for address search input only

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
    const res = await $fetch<{ data: any[] }>(`${baseUrl}/api/v1/service/province`);
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
      `${baseUrl}/api/v1/service/regency?province_id=${provinceId}`
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
  return {
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
  <div class="space-y-5 max-h-[65vh] overflow-y-auto pr-1">

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
              class="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
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
        <UiFormField label="Provinsi">
          <UiSelect
            v-model="selectedProvinceId"
            :disabled="provincesLoading"
            :placeholder="provincesLoading ? 'Memuat...' : 'Pilih provinsi'"
            @change="onProvinceChange"
          >
            <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
          </UiSelect>
        </UiFormField>
        <UiFormField label="Kabupaten / Kota">
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

      <!-- Full address -->
      <div class="mb-3">
        <UiFormField label="Alamat Lengkap">
          <UiInput v-model="form.full_address" placeholder="Jl. ..." />
        </UiFormField>
      </div>

      <!-- Address search for coordinates -->
      <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 mb-1.5">
          Cari Alamat <span class="font-normal text-neutral-400 text-xs">(untuk mengisi koordinat otomatis)</span>
        </label>
        <div class="relative">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none" />
          <input
            ref="addressInputRef"
            v-model="addressQuery"
            type="text"
            placeholder="Ketik alamat lengkap..."
            :class="ic.replace('px-3', 'pl-8 pr-3')"
            autocomplete="off"
            @input="onAddressInput"
            @blur="hideAddressDrop"
          />
          <Icon
            v-if="addressLoading"
            icon="lucide:loader-2"
            class="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm"
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
  </div>

</template>
