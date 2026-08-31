<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  isAmbulanceServiceType,
  showJenisPelayananPicker,
} from "@butuhbantuan/utils";
import { toast } from "~/utils/appToast";

definePageMeta({ layout: "unit", title: "Pengaturan", keepalive: true });

const { unitHeaders } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

// ── Profile ───────────────────────────────────────────────────────────────────
const { data: profile, pending: profilePending, refresh: refreshProfile } = await useAsyncData(
  "unit-settings-profile",
  () => $fetch<{ data: any }>(`${baseUrl}/api/v1/unit/profile`, { headers: unitHeaders() })
    .then(r => r.data).catch(() => null),
  { server: false }
);

const refresh = useSoftRefresh(refreshProfile);
const showProfileSkeleton = computed(() => isInitialPending(profilePending.value, profile.value));

// ── Availability toggle ───────────────────────────────────────────────────────
const { isActive, toggling, toggle, initFromProfile } = useUnitAvailability();
watch(() => profile.value?.operational, (op) => { initFromProfile(op); }, { immediate: true });

async function handleToggle() {
  await toggle();
  toast.success(isActive.value ? "Layanan ditandai Aktif" : "Layanan ditandai Nonaktif");
}

// ── Fleet management ──────────────────────────────────────────────────────────
const fleet = reactive({ total: 0, available: 0 });
const updatingFleet = ref(false);
const fleetSaved = ref(false);

watch(() => profile.value?.fleet, (f) => {
  if (f) { fleet.total = f.total; fleet.available = f.available; }
}, { immediate: true });

async function saveFleet() {
  if (fleet.available > fleet.total) {
    toast.error("Armada tersedia tidak boleh melebihi total armada");
    return;
  }
  updatingFleet.value = true;
  try {
    await $fetch(`${baseUrl}/api/v1/unit/fleet`, {
      method: "PATCH",
      headers: { ...unitHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ total: fleet.total, available: fleet.available }),
    });
    fleetSaved.value = true;
    setTimeout(() => { fleetSaved.value = false; }, 2500);
    await refresh();
    toast.success("Ketersediaan armada berhasil disimpan");
  } catch (err: any) {
    toast.error(err?.data?.message ?? "Gagal menyimpan armada");
  } finally {
    updatingFleet.value = false;
  }
}

// ── Wilayah operasional ───────────────────────────────────────────────────────
const { get } = useApi();
const provinces = ref<{ id: string; name: string }[]>([]);
const regencies = ref<{ id: string; name: string }[]>([]);
const wilayah = reactive({
  province_id: "",
  province_name: "",
  regency_id: "",
  regency_name: "",
});
const savingWilayah = ref(false);
const wilayahSaved = ref(false);

const provinceOptions = computed(() => [
  { value: "", label: "Pilih provinsi" },
  ...provinces.value.map((p) => ({ value: p.id, label: p.name })),
]);

const regencyOptions = computed(() => [
  { value: "", label: wilayah.province_id ? "Pilih kabupaten" : "Pilih provinsi dulu" },
  ...regencies.value.map((r) => ({ value: r.id, label: r.name })),
]);

watch(
  () => profile.value,
  (p) => {
    if (!p) return;
    wilayah.province_id = String(p.address?.province_id || p.province_id || "");
    wilayah.province_name = String(p.address?.province || "");
    wilayah.regency_id = String(p.address?.regency_id || p.regency_id || "");
    wilayah.regency_name = String(p.address?.regency || "");
  },
  { immediate: true },
);

onMounted(async () => {
  try {
    const res = await get<{ data: any[] }>("/api/v1/service/province");
    provinces.value = (res.data ?? []).map((p: any) => ({ id: String(p.id), name: p.name }));
  } catch {
    provinces.value = [];
  }
  if (wilayah.province_id) await loadRegencies(wilayah.province_id);
});

async function loadRegencies(provinceId: string) {
  if (!provinceId) {
    regencies.value = [];
    return;
  }
  try {
    const res = await get<{ data: any[] }>(`/api/v1/service/regency?province_id=${provinceId}`);
    regencies.value = (res.data ?? []).map((r: any) => ({ id: String(r.id), name: r.name }));
  } catch {
    regencies.value = [];
  }
}

watch(
  () => wilayah.province_id,
  async (id, prev) => {
    if (id === prev) return;
    const p = provinces.value.find((x) => x.id === id);
    wilayah.province_name = p?.name || wilayah.province_name;
    if (prev !== undefined && prev !== "") {
      wilayah.regency_id = "";
      wilayah.regency_name = "";
    }
    await loadRegencies(id);
  },
);

watch(
  () => wilayah.regency_id,
  (id) => {
    const r = regencies.value.find((x) => x.id === id);
    if (r) wilayah.regency_name = r.name;
  },
);

async function saveWilayah() {
  if (!wilayah.province_id || !wilayah.regency_id) {
    toast.error("Pilih provinsi dan kabupaten");
    return;
  }
  // Pastikan nama terisi dari opsi terpilih (jaga-jaga watch belum jalan).
  const prov = provinces.value.find((p) => p.id === wilayah.province_id);
  const reg = regencies.value.find((r) => r.id === wilayah.regency_id);
  if (prov) wilayah.province_name = prov.name;
  if (reg) wilayah.regency_name = reg.name;

  savingWilayah.value = true;
  try {
    await $fetch(`${baseUrl}/api/v1/unit/wilayah`, {
      method: "PATCH",
      headers: { ...unitHeaders(), "Content-Type": "application/json" },
      body: {
        province_id: wilayah.province_id,
        province_name: wilayah.province_name,
        regency_id: wilayah.regency_id,
        regency_name: wilayah.regency_name,
      },
    });
    wilayahSaved.value = true;
    setTimeout(() => { wilayahSaved.value = false; }, 2500);
    await refresh();
    toast.success("Wilayah operasional disimpan");
  } catch (err: any) {
    const msg =
      err?.data?.message ||
      err?.data?.error ||
      err?.statusMessage ||
      err?.message ||
      "Gagal menyimpan wilayah";
    toast.error(msg);
  } finally {
    savingWilayah.value = false;
  }
}

const savingJenis = ref(false);
const jenisSaved = ref(false);
const jenisPelayanan = ref<string[]>([]);

watch(
  () => profile.value?.tipe_emergency,
  (v) => {
    jenisPelayanan.value = Array.isArray(v) ? [...v] : [];
  },
  { immediate: true },
);

const emergencyTypeName = computed(() => String(profile.value?.emergency_type || ""));
const showJenisPicker = computed(() => showJenisPelayananPicker(emergencyTypeName.value));
const isAmbulance = computed(() => isAmbulanceServiceType(emergencyTypeName.value));
const emergencyId = computed(() => String(profile.value?.emergency_uuid || ""));

async function saveJenisPelayanan() {
  savingJenis.value = true;
  try {
    await $fetch(`${baseUrl}/api/v1/unit/jenis-pelayanan`, {
      method: "PATCH",
      headers: { ...unitHeaders(), "Content-Type": "application/json" },
      body: { tipe_emergency: jenisPelayanan.value },
    });
    jenisSaved.value = true;
    setTimeout(() => { jenisSaved.value = false; }, 2500);
    await refresh();
    toast.success("Jenis pelayanan disimpan");
  } catch (err: any) {
    toast.error(err?.data?.message ?? "Gagal menyimpan jenis pelayanan");
  } finally {
    savingJenis.value = false;
  }
}

const archiveLinks = [
  { to: "/unit/hospitals", icon: "lucide:hospital", label: "Import RS wilayah", desc: "Sync & import rumah sakit per kabupaten" },
  { to: "/unit/stats", icon: "lucide:bar-chart-2", label: "Statistik & bagikan link", desc: "Performa unit + link publik" },
  { to: "/unit/feedback", icon: "lucide:message-square", label: "Arsip feedback warga", desc: "Semua penilaian untuk unit Anda" },
  { to: "/unit/reports", icon: "lucide:file-text", label: "Arsip laporan kejadian", desc: "Daftar laporan per e-tiket" },
];
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-4 w-full">
        <div class="min-w-0">
          <h1 class="page-subheader-title">Pengaturan</h1>
          <p class="page-subheader-desc">Konfigurasi layanan dan armada unit</p>
        </div>
        <div class="flex items-center gap-2.5 shrink-0">
          <span
            class="hidden sm:inline text-xs font-medium"
            :class="isActive ? 'text-emerald-700' : 'text-neutral-500'"
          >
            {{ isActive ? "Layanan aktif" : "Layanan nonaktif" }}
          </span>
          <button
            type="button"
            role="switch"
            :aria-checked="isActive"
            :aria-label="isActive ? 'Nonaktifkan layanan' : 'Aktifkan layanan'"
            :disabled="toggling || showProfileSkeleton"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="isActive ? 'bg-emerald-600' : 'bg-neutral-300'"
            @click="handleToggle"
          >
            <span
              aria-hidden="true"
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
              :class="isActive ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>
        </div>
      </div>
    </div>

    <div class="p-4 sm:p-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UiCard
          compact-header
          padding="sm"
          title="Ketersediaan Armada"
          description="Jumlah armada siap bertugas"
        >
          <div v-if="showProfileSkeleton" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-2">
                <div class="soft-skel h-3 w-20" />
                <div class="soft-skel h-8 rounded-lg" />
              </div>
              <div class="space-y-2">
                <div class="soft-skel h-3 w-28" />
                <div class="soft-skel h-8 rounded-lg" />
              </div>
            </div>
            <div class="soft-skel h-2 rounded-full w-full" />
            <div class="soft-skel h-8 rounded-lg w-full" />
          </div>
          <template v-else>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1.5">Total Armada</label>
                <UiInput
                  :model-value="String(fleet.total)"
                  type="number"
                  min="0"
                  class="text-center font-semibold"
                  @update:model-value="fleet.total = Number($event) || 0"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1.5">Armada Tersedia</label>
                <UiInput
                  :model-value="String(fleet.available)"
                  type="number"
                  min="0"
                  :max="fleet.total"
                  class="text-center font-semibold"
                  @update:model-value="fleet.available = Number($event) || 0"
                />
              </div>
            </div>

            <div v-if="fleet.total > 0" class="space-y-1.5 mt-4">
              <div class="flex justify-between text-sm">
                <span class="text-neutral-500">Kapasitas terpakai</span>
                <span :class="['font-medium', fleet.available > 0 ? 'text-green-600' : 'text-emergency-600']">
                  {{ fleet.available }} / {{ fleet.total }} tersedia
                </span>
              </div>
              <div class="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                <div
                  :style="{ width: `${Math.min(100, Math.round((fleet.available / fleet.total) * 100))}%` }"
                  :class="['h-2 rounded-full transition-all duration-300', fleet.available > 0 ? 'bg-green-500' : 'bg-emergency-500']"
                />
              </div>
            </div>

            <UiButton class="w-full mt-4" :loading="updatingFleet" @click="saveFleet">
              <Icon v-if="fleetSaved" icon="lucide:check-circle" class="text-sm" />
              <Icon v-else icon="lucide:save" class="text-sm" />
              {{ fleetSaved ? "Tersimpan!" : "Simpan Perubahan" }}
            </UiButton>
          </template>
        </UiCard>

        <UiCard
          compact-header
          padding="sm"
          title="Wilayah Operasional"
          description="Kabupaten operasi & import RS"
        >
          <div v-if="showProfileSkeleton" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="soft-skel h-10 rounded-lg" />
            <div class="soft-skel h-10 rounded-lg" />
          </div>
          <template v-else>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UiFormField label="Provinsi" required>
                <UiSelect
                  v-model="wilayah.province_id"
                  placeholder="Pilih provinsi"
                  searchable
                  :options="provinceOptions"
                />
              </UiFormField>
              <UiFormField label="Kabupaten / Kota" required>
                <UiSelect
                  v-model="wilayah.regency_id"
                  placeholder="Pilih kabupaten"
                  searchable
                  :disabled="!wilayah.province_id"
                  :options="regencyOptions"
                />
              </UiFormField>
            </div>
            <p
              v-if="wilayah.regency_name"
              class="text-xs text-neutral-500 mt-3"
            >
              Saat ini: <span class="font-medium text-neutral-700">{{ wilayah.regency_name }}</span>
              <template v-if="wilayah.province_name">, {{ wilayah.province_name }}</template>
            </p>
            <UiButton class="w-full mt-4" :loading="savingWilayah" @click="saveWilayah">
              <Icon v-if="wilayahSaved" icon="lucide:check-circle" class="text-sm" />
              <Icon v-else icon="lucide:map-pin" class="text-sm" />
              {{ wilayahSaved ? "Tersimpan!" : "Simpan Wilayah" }}
            </UiButton>
          </template>
        </UiCard>

        <UiCard
          v-if="showJenisPicker"
          compact-header
          padding="sm"
          class="lg:col-span-2"
          title="Jenis Pelayanan"
          description="Mode layanan yang unit siap terima dari warga"
        >
          <JenisPelayananPicker
            v-model="jenisPelayanan"
            :emergency-type-name="emergencyTypeName"
          />
          <UiButton class="w-full mt-4" :loading="savingJenis" @click="saveJenisPelayanan">
            <Icon v-if="jenisSaved" icon="lucide:check-circle" class="text-sm" />
            <Icon v-else icon="lucide:save" class="text-sm" />
            {{ jenisSaved ? "Tersimpan!" : "Simpan jenis pelayanan" }}
          </UiButton>
        </UiCard>

        <div v-if="isAmbulance && emergencyId" class="lg:col-span-2">
          <AmbulanceComplianceForm
            :emergency-id="emergencyId"
            :emergency-type-name="emergencyTypeName"
            :initial="profile?.compliance"
            unit-mode
            @saved="refresh()"
          />
        </div>

        <UiCard
          compact-header
          padding="sm"
          title="Arsip"
          description="Feedback, laporan, statistik, dan import RS"
          class="lg:col-span-2"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <NuxtLink
              v-for="link in archiveLinks"
              :key="link.to"
              :to="link.to"
              class="rounded-lg border border-neutral-200 px-3.5 py-3 hover:bg-neutral-50 transition-colors"
            >
              <div class="flex items-start gap-2.5">
                <Icon :icon="link.icon" class="text-neutral-500 text-base shrink-0 mt-0.5" />
                <div class="min-w-0">
                  <p class="text-sm font-medium text-neutral-900">{{ link.label }}</p>
                  <p class="text-xs text-neutral-500 mt-0.5">{{ link.desc }}</p>
                </div>
              </div>
            </NuxtLink>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
