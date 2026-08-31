<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { jenisPelayananLabel, showJenisPelayananPicker } from "@butuhbantuan/utils";
import { toast } from "~/utils/appToast";

definePageMeta({ title: "Detail Layanan Darurat" });

const route = useRoute();
const { get, authGet, post, put, patch, del } = useApi();
const { goBack } = useSmartBack("/emergencies");

const id = computed(() => String(route.params.id));
const mode = ref<"view" | "edit">("view");

// ── Data ─────────────────────────────────────────────────────────────────────
const { data, pending, refresh: refreshItem } = await useAsyncData(
  `emergency-${id.value}`,
  () => get<{ data: any }>(`/api/v1/emergency/${id.value}`).then((r) => r.data),
  { server: false },
);
const item = computed(() => data.value);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

const editEmergencyTypeName = computed(() => {
  const fromForm = types.value?.find((t: any) => String(t.id) === String(editForm.type_id))?.name;
  return fromForm || item.value?.emergency_type?.name;
});

const { data: types } = await useAsyncData("emergency-types", () =>
  get<{ data: any[] }>("/api/v1/emergency/type").then((r) => r.data),
);

// ── Edit form ─────────────────────────────────────────────────────────────────
const editing = ref(false);
const editError = ref("");
const editForm = reactive({
  name: "", organization_name: "", organization_type: "", organization_logo: "",
  description: "", type_id: "",
  phone: "", whatsapp: "", email: "",
  district_id: "", regency_id: "", province_id: "",
  regency_display: "", province_display: "",
  full_address: "", lat: "", lng: "",
  is_dispatcher: false, is_province_dispatcher: false,
  partner_tier: "community",
  dashboard_access: true,
  type_of_service: "", tipe_emergency: [] as string[],
  is_active: true, is_24_hours: false,
  open_time: "08:00", close_time: "17:00",
  total_units: 0, available_units: 0,
});

function populateForm(e: any) {
  Object.assign(editForm, {
    name: e.name ?? "",
    organization_name: e.organization_name ?? "",
    organization_type: e.organization_type ?? "",
    organization_logo: e.organization_logo ?? "",
    description: e.description ?? "",
    type_id: String(e.emergency_type?.id ?? ""),
    phone: e.contact?.phone ?? "",
    whatsapp: e.contact?.whatsapp ?? "",
    email: e.contact?.email ?? "",
    district_id: e.address?.district_id ?? "",
    regency_id: e.address?.regency_id ?? "",
    province_id: e.address?.province_id ?? "",
    regency_display: e.address?.regency ?? "",
    province_display: e.address?.province ?? "",
    full_address: e.address?.full_address ?? "",
    lat: e.coordinates?.[1] ?? "",
    lng: e.coordinates?.[0] ?? "",
    is_dispatcher: e.is_dispatcher ?? false,
    is_province_dispatcher: e.is_province_dispatcher ?? false,
    partner_tier: e.partner_tier || "community",
    dashboard_access: e.dashboard_access !== false,
    type_of_service: e.type_of_service ?? "",
    tipe_emergency: Array.isArray(e.tipe_emergency) ? e.tipe_emergency : [],
    is_active: e.operational?.is_active ?? true,
    is_24_hours: e.operational?.is_24_hours ?? false,
    open_time: e.operational?.open_time ?? "08:00",
    close_time: e.operational?.close_time ?? "17:00",
    total_units: e.fleet?.total ?? 0,
    available_units: e.fleet?.available ?? 0,
  });
}

function startEdit() {
  if (item.value) populateForm(item.value);
  editError.value = "";
  mode.value = "edit";
}

function cancelEdit() {
  mode.value = "view";
  editError.value = "";
}

async function submitEdit() {
  if (!editForm.name || !editForm.type_id) return;
  editing.value = true;
  editError.value = "";
  try {
    await put(`/api/v1/emergency/${id.value}`, {
      name: editForm.name,
      organization_name: editForm.organization_name,
      organization_type: editForm.organization_type,
      organization_logo: editForm.organization_logo,
      description: editForm.description,
      emergency_type: { id: parseInt(editForm.type_id) },
      coordinates: [editForm.lng || "0", editForm.lat || "0"],
      contact: { phone: editForm.phone, whatsapp: editForm.whatsapp, email: editForm.email },
      address: {
        district_id: editForm.district_id,
        regency_id: editForm.regency_id,
        province_id: editForm.province_id,
        full_address: editForm.full_address,
      },
      is_dispatcher: editForm.is_dispatcher,
      is_province_dispatcher: editForm.is_province_dispatcher,
      partner_tier: editForm.partner_tier,
      dashboard_access: editForm.dashboard_access === true,
      type_of_service: editForm.type_of_service,
      tipe_emergency: editForm.tipe_emergency,
      operational: {
        is_active: editForm.is_active,
        is_24_hours: editForm.is_24_hours,
        open_time: editForm.open_time,
        close_time: editForm.close_time,
      },
      fleet: { total: editForm.total_units, available: editForm.available_units },
    });
    await refreshItem();
    mode.value = "view";
    toast.success("Perubahan berhasil disimpan");
  } catch (err: any) {
    editError.value = err?.data?.message ?? err?.message ?? "Gagal menyimpan perubahan";
    toast.error(editError.value);
  } finally {
    editing.value = false;
  }
}

// ── Toggle active (quick action in view mode) ─────────────────────────────────
const toggling = ref(false);
const showDeactivateConfirm = ref(false);

function requestToggleActive() {
  if (!item.value) return;
  if (item.value.operational?.is_active !== false) {
    showDeactivateConfirm.value = true;
  } else {
    doToggleActive();
  }
}

async function doToggleActive() {
  if (!item.value) return;
  showDeactivateConfirm.value = false;
  toggling.value = true;
  try {
    await patch(`/api/v1/emergency/${id.value}/active`, {
      is_active: !item.value.operational?.is_active,
    });
    await refreshItem();
    toast.success(`Layanan ${!item.value.operational?.is_active ? "diaktifkan" : "dinonaktifkan"}`);
  } catch {
    toast.error("Gagal mengubah status layanan");
  } finally {
    toggling.value = false;
  }
}

// ── Map picker ─────────────────────────────────────────────────────────────────
const showMapPicker = ref(false);

async function handleMapConfirm(lat: string, lng: string) {
  if (lat && lng) {
    editForm.lat = lat;
    editForm.lng = lng;
    try {
      const res = await get<{ data: any }>(`/api/v1/geocoding/reverse?latitude=${lat}&longitude=${lng}`);
      if (res?.data?.display_name) editForm.full_address = res.data.display_name;
    } catch { /* ignore */ }
  }
  showMapPicker.value = false;
}

// ── Credential panel ──────────────────────────────────────────────────────────
const credData = ref<{ username: string } | null | false>(false);
const credLoading = ref(false);
const credDisabling = ref(false);
const credFormOpen = ref(false);
const credFormUsername = ref("");
const credFormPassword = ref("");
const credFormConfirm = ref("");
const credFormError = ref("");
const credFormSaving = ref(false);

async function loadCred() {
  credLoading.value = true;
  credData.value = false;
  credFormOpen.value = false;
  credFormError.value = "";
  try {
    const res = await authGet<{ data: { username: string } }>(`/api/v1/admin/units/${id.value}/credentials`);
    credData.value = res?.data ?? null;
  } catch (err: any) {
    const status = err?.statusCode ?? err?.status ?? err?.response?.status ?? 0;
    credData.value = status === 404 ? null : false;
  } finally {
    credLoading.value = false;
  }
}

function openCredForm() {
  credFormUsername.value = credData.value ? (credData.value as any).username : "";
  credFormPassword.value = "";
  credFormConfirm.value = "";
  credFormError.value = "";
  credFormOpen.value = true;
}

function closeCredForm() {
  credFormOpen.value = false;
  credFormError.value = "";
}

async function saveCredential() {
  if (!credFormUsername.value || !credFormPassword.value) return;
  if (credFormPassword.value !== credFormConfirm.value) {
    credFormError.value = "Password tidak cocok";
    return;
  }
  credFormSaving.value = true;
  credFormError.value = "";
  try {
    await post(`/api/v1/admin/units/${id.value}/credentials`, {
      unit_name: item.value?.name ?? "",
      username: credFormUsername.value,
      password: credFormPassword.value,
    });
    credFormOpen.value = false;
    await loadCred();
    toast.success("Akses dashboard berhasil disimpan");
  } catch (err: any) {
    const msg = err?.data?.message ?? err?.message ?? "";
    credFormError.value = msg === "username already taken"
      ? "Username sudah digunakan unit lain"
      : (msg || "Gagal menyimpan akses");
  } finally {
    credFormSaving.value = false;
  }
}

const showDisableCredConfirm = ref(false);

async function disableCred() {
  showDisableCredConfirm.value = false;
  credDisabling.value = true;
  try {
    await del(`/api/v1/admin/units/${id.value}/credentials`);
    credData.value = null;
    toast.success("Akses dashboard dinonaktifkan");
  } catch {
    toast.error("Gagal menonaktifkan akses dashboard");
  } finally {
    credDisabling.value = false;
  }
}

onMounted(() => {
  loadCred();
  if (route.query.edit) startEdit();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function typeBadgeColor(name: string) {
  const m: Record<string, string> = {
    Ambulance: "bg-red-100 text-red-800",
    Damkar: "bg-orange-100 text-orange-800",
    "Rumah Sakit": "bg-blue-100 text-blue-800",
    SAR: "bg-green-100 text-green-800",
  };
  return m[name] ?? "bg-neutral-100 text-neutral-700";
}

import { partnerTierBadgeClass, partnerTierLabel } from "~/utils/partnerTier";
</script>

<template>
  <div>
    <!-- Header -->
    <div class="page-subheader">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
          @click="goBack"
        >
          <Icon icon="lucide:arrow-left" class="text-base" />
          <span class="hidden sm:inline">Kembali</span>
        </button>

        <div class="h-5 w-px bg-neutral-200 shrink-0" />

        <div class="min-w-0 flex-1">
          <div v-if="showSkeleton" class="flex items-center gap-2">
            <div class="soft-skel h-5 w-48 rounded" />
            <div class="soft-skel h-5 w-20 rounded-full" />
          </div>
          <div v-else-if="item" class="flex flex-wrap items-center gap-2">
            <h1 class="page-subheader-title truncate">{{ item.name }}</h1>
            <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', typeBadgeColor(item.emergency_type?.name)]">
              {{ item.emergency_type?.name ?? '—' }}
            </span>
            <span :class="['inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', item.operational?.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500']">
              <span :class="['w-1.5 h-1.5 rounded-full', item.operational?.is_active !== false ? 'bg-green-500' : 'bg-neutral-400']" />
              {{ item.operational?.is_active !== false ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <template v-if="mode === 'view'">
            <UiButton variant="secondary" size="sm" :loading="toggling" @click="requestToggleActive">
              <Icon :icon="item?.operational?.is_active !== false ? 'lucide:power-off' : 'lucide:power'" class="text-sm" />
              <span class="hidden sm:inline">{{ item?.operational?.is_active !== false ? 'Nonaktifkan' : 'Aktifkan' }}</span>
            </UiButton>
            <UiButton size="sm" @click="startEdit">
              <Icon icon="lucide:pencil" class="text-sm" />
              Edit
            </UiButton>
          </template>
          <template v-else>
            <p v-if="editError" class="text-xs text-emergency-600 hidden sm:block">{{ editError }}</p>
            <UiButton variant="secondary" size="sm" :disabled="editing" @click="cancelEdit">Batal</UiButton>
            <UiButton size="sm" :loading="editing" :disabled="!editForm.name || !editForm.type_id" @click="submitEdit">
              <Icon icon="lucide:save" class="text-sm" />
              Simpan
            </UiButton>
          </template>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="p-4 sm:p-6 min-w-0 overflow-x-hidden">
      <!-- Skeleton -->
      <div v-if="showSkeleton" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-7 space-y-4">
          <div v-for="i in 4" :key="i" class="soft-skel h-28 rounded-xl" />
        </div>
        <div class="lg:col-span-5 space-y-4">
          <div v-for="i in 2" :key="i" class="soft-skel h-28 rounded-xl" />
        </div>
      </div>

      <div v-else-if="item" class="space-y-4">

        <!-- EDIT -->
        <div v-if="mode === 'edit'" class="grid grid-cols-1 min-w-0 gap-4">
          <div class="min-w-0 bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div class="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
              <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Edit Data Layanan</p>
            </div>
            <div class="p-5 min-w-0">
              <EmergencyForm
                :types="types ?? []"
                :form="editForm"
                @open-map-picker="showMapPicker = true"
              />
            </div>
          </div>
          <div class="min-w-0">
            <AmbulanceComplianceForm
              :emergency-id="id"
              :emergency-type-name="editEmergencyTypeName"
              :initial="item.compliance"
              @saved="refreshItem()"
            />
          </div>
        </div>

        <!-- VIEW -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden md:col-span-2 xl:col-span-3">
              <div class="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
                <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Identitas</p>
              </div>
              <div class="p-5">
                <div class="flex items-start gap-4">
                  <img
                    v-if="item.organization_logo"
                    :src="item.organization_logo"
                    :alt="item.name"
                    class="w-16 h-16 rounded-xl object-contain bg-neutral-100 p-2 shrink-0 border border-neutral-200"
                  />
                  <div v-else class="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
                    <Icon icon="lucide:shield" class="text-neutral-400 text-2xl" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-neutral-900 text-base">{{ item.name }}</p>
                    <p class="text-sm text-neutral-500 mt-0.5">{{ item.organization_name || '—' }}</p>
                    <p v-if="item.organization_type" class="text-xs text-neutral-400 mt-0.5">{{ item.organization_type }}</p>
                    <div class="flex flex-wrap gap-2 mt-2">
                      <span :class="['inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full', partnerTierBadgeClass(item.partner_tier)]">
                        {{ partnerTierLabel(item.partner_tier) }}
                      </span>
                      <span v-if="item.is_dispatcher" class="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        <Icon icon="lucide:phone-incoming" class="text-[10px]" />
                        Dispatcher
                      </span>
                      <span
                        v-if="item.dashboard_access === false"
                        class="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"
                      >
                        <Icon icon="lucide:message-circle" class="text-[10px]" />
                        WA only
                      </span>
                      <span v-if="item.is_province_dispatcher" class="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        Dispatcher Provinsi
                      </span>
                    </div>
                    <p v-if="item.description" class="text-xs text-neutral-500 mt-2 leading-relaxed">{{ item.description }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contact -->
            <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div class="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
                <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Kontak</p>
              </div>
              <div class="divide-y divide-neutral-100">
                <div class="flex items-center gap-3 px-5 py-3">
                  <Icon icon="lucide:phone" class="text-neutral-400 text-sm shrink-0" />
                  <div class="grid grid-cols-[80px_1fr] gap-x-3">
                    <span class="text-xs text-neutral-400">Telepon</span>
                    <span class="text-sm font-medium text-neutral-800">{{ item.contact?.phone || '—' }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3 px-5 py-3">
                  <Icon icon="lucide:message-circle" class="text-neutral-400 text-sm shrink-0" />
                  <div class="grid grid-cols-[80px_1fr] gap-x-3">
                    <span class="text-xs text-neutral-400">WhatsApp</span>
                    <span class="text-sm font-medium text-neutral-800">{{ item.contact?.whatsapp || '—' }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3 px-5 py-3">
                  <Icon icon="lucide:mail" class="text-neutral-400 text-sm shrink-0" />
                  <div class="grid grid-cols-[80px_1fr] gap-x-3">
                    <span class="text-xs text-neutral-400">Email</span>
                    <span class="text-sm font-medium text-neutral-800">{{ item.contact?.email || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Location -->
            <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div class="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
                <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Lokasi &amp; Operasional</p>
              </div>
              <div class="divide-y divide-neutral-100">
                <div class="flex items-start gap-3 px-5 py-3">
                  <Icon icon="lucide:map-pin" class="text-neutral-400 text-sm shrink-0 mt-0.5" />
                  <div>
                    <p class="text-xs text-neutral-400">Wilayah</p>
                    <p class="text-sm font-medium text-neutral-800">{{ item.address?.regency || '—' }}, {{ item.address?.province }}</p>
                    <p v-if="item.address?.full_address" class="text-xs text-neutral-500 mt-0.5">{{ item.address.full_address }}</p>
                    <p v-if="item.coordinates?.[0]" class="text-xs text-neutral-400 font-mono mt-0.5">
                      {{ item.coordinates[1] }}, {{ item.coordinates[0] }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3 px-5 py-3">
                  <Icon icon="lucide:clock" class="text-neutral-400 text-sm shrink-0" />
                  <div>
                    <p class="text-xs text-neutral-400">Jam Operasional</p>
                    <p class="text-sm font-medium text-neutral-800">
                      <template v-if="item.operational?.is_24_hours">24 Jam Non-Stop</template>
                      <template v-else-if="item.operational?.open_time">{{ item.operational.open_time }} – {{ item.operational.close_time }}</template>
                      <template v-else>—</template>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fleet -->
            <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div class="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
                <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Armada</p>
              </div>
              <div class="grid grid-cols-2 divide-x divide-neutral-100">
                <div class="px-5 py-4 text-center">
                  <p class="text-3xl font-bold text-neutral-900">{{ item.fleet?.total ?? 0 }}</p>
                  <p class="text-xs text-neutral-400 mt-1">Total Unit</p>
                </div>
                <div class="px-5 py-4 text-center">
                  <p class="text-3xl font-bold text-green-600">{{ item.fleet?.available ?? 0 }}</p>
                  <p class="text-xs text-neutral-400 mt-1">Tersedia</p>
                </div>
              </div>
            </div>

            <!-- Dashboard Access -->
            <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div class="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
                <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Akses Dashboard Unit</p>
                <UiSpinner v-if="credLoading" class="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <div class="px-5 py-4 space-y-3">
                <div v-if="credLoading" class="h-8 bg-neutral-100 rounded-lg animate-pulse" />

                <template v-else-if="credData">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <div>
                        <p class="text-sm font-semibold text-neutral-800">Aktif</p>
                        <p class="text-xs text-neutral-400 font-mono">{{ credData.username }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <UiButton variant="secondary" size="sm" @click="openCredForm">
                        <Icon icon="lucide:key" class="text-sm" />
                        Ubah
                      </UiButton>
                      <UiButton variant="secondary" size="sm" :loading="credDisabling" @click="showDisableCredConfirm = true">
                        <Icon icon="lucide:shield-off" class="text-sm" />
                      </UiButton>
                    </div>
                  </div>
                </template>

                <template v-else-if="credData === null">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-neutral-300 shrink-0" />
                      <p class="text-sm text-neutral-500">Belum aktif</p>
                    </div>
                    <UiButton v-if="!credFormOpen" size="sm" @click="openCredForm">
                      <Icon icon="lucide:shield-check" class="text-sm" />
                      Aktifkan
                    </UiButton>
                  </div>
                </template>

                <div v-else class="flex items-center gap-2 text-neutral-400">
                  <Icon icon="lucide:wifi-off" class="text-sm" />
                  <p class="text-xs flex-1">Gagal memuat</p>
                  <button class="text-xs text-primary-600 hover:underline" @click="loadCred">Coba lagi</button>
                </div>

                <div v-if="credFormOpen" class="pt-3 border-t border-neutral-100 space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-neutral-600 mb-1.5">Username <span class="text-emergency-500">*</span></label>
                    <UiInput v-model="credFormUsername" placeholder="Username..." autocomplete="off" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-neutral-600 mb-1.5">
                      {{ credData ? 'Password baru' : 'Password' }} <span class="text-emergency-500">*</span>
                    </label>
                    <UiInput v-model="credFormPassword" type="password" placeholder="Password..." autocomplete="new-password" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-neutral-600 mb-1.5">Konfirmasi <span class="text-emergency-500">*</span></label>
                    <UiInput v-model="credFormConfirm" type="password" placeholder="Ulangi password..." autocomplete="new-password" />
                  </div>
                  <p v-if="credFormError" class="text-xs text-emergency-600 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" class="text-sm" />
                    {{ credFormError }}
                  </p>
                  <div class="flex justify-end gap-2">
                    <UiButton variant="secondary" size="sm" @click="closeCredForm">Batal</UiButton>
                    <UiButton
                      size="sm"
                      :loading="credFormSaving"
                      :disabled="!credFormUsername || !credFormPassword || !credFormConfirm"
                      @click="saveCredential"
                    >
                      <Icon :icon="credData ? 'lucide:save' : 'lucide:shield-check'" class="text-sm" />
                      {{ credData ? 'Simpan' : 'Aktifkan' }}
                    </UiButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- Jenis pelayanan -->
            <div
              v-if="showJenisPelayananPicker(item.emergency_type?.name) && item.tipe_emergency?.length"
              class="bg-white rounded-xl border border-neutral-200 overflow-hidden"
            >
              <div class="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
                <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Jenis Pelayanan</p>
              </div>
              <div class="px-5 py-4 flex flex-wrap gap-2">
                <span
                  v-for="te in item.tipe_emergency"
                  :key="te"
                  class="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 ring-1 ring-primary-100"
                >
                  {{ jenisPelayananLabel(te) }}
                </span>
              </div>
            </div>

            <AmbulanceComplianceView
              class="md:col-span-2 xl:col-span-3"
              :emergency-id="id"
              :compliance="item.compliance"
              :emergency-type-name="item.emergency_type?.name"
              @saved="refreshItem()"
            />
        </div>
      </div>

      <!-- Not found -->
      <div v-else-if="!pending" class="py-20 text-center">
        <Icon icon="lucide:search-x" class="text-4xl text-neutral-300 mb-3" />
        <p class="text-neutral-500">Layanan tidak ditemukan</p>
        <UiButton class="mt-4" variant="secondary" size="sm" @click="goBack">Kembali</UiButton>
      </div>
    </div>

    <!-- Deactivate confirm -->
    <UiModal v-model:open="showDeactivateConfirm" size="sm" title="Nonaktifkan layanan?" description="Layanan tidak akan muncul sebagai opsi aktif untuk pelapor.">
      <template #featured>
        <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
          <Icon icon="lucide:power-off" class="text-orange-600 text-lg" />
        </div>
      </template>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showDeactivateConfirm = false">Batal</UiButton>
        <UiButton variant="danger" size="sm" :loading="toggling" @click="doToggleActive">Nonaktifkan</UiButton>
      </template>
    </UiModal>

    <!-- Disable cred confirm -->
    <UiModal v-model:open="showDisableCredConfirm" size="sm" title="Nonaktifkan akses dashboard?" description="Unit tidak lagi dapat login ke dashboard. Tindakan ini tidak dapat dibatalkan otomatis.">
      <template #featured>
        <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
          <Icon icon="lucide:shield-off" class="text-red-600 text-lg" />
        </div>
      </template>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showDisableCredConfirm = false">Batal</UiButton>
        <UiButton variant="danger" size="sm" :loading="credDisabling" @click="disableCred">Nonaktifkan</UiButton>
      </template>
    </UiModal>

    <!-- Map picker -->
    <MapPickerModal
      :is-open="showMapPicker"
      :initial-lat="editForm.lat"
      :initial-lng="editForm.lng"
      @confirm="handleMapConfirm"
    />
  </div>
</template>
