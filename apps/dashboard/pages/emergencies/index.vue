<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Layanan Darurat" });

const { get, post, put, del } = useApi();

const search = ref("");
const selectedType = ref("");
const pageSize = ref(10);
const page = ref(1);

const { data, pending, refresh } = await useAsyncData("emergencies-list", () =>
  get<{ data: any[] }>("/api/v1/emergency/")
);
const { data: types } = await useAsyncData("types-filter", () =>
  get<{ data: any[] }>("/api/v1/emergency/type")
);

watch([search, selectedType], () => { page.value = 1; });

const filtered = computed(() => {
  let list = data.value?.data ?? [];
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter(
      (e: any) =>
        e.name?.toLowerCase().includes(q) ||
        e.organization_name?.toLowerCase().includes(q) ||
        e.address?.regency?.toLowerCase().includes(q)
    );
  }
  if (selectedType.value) {
    list = list.filter((e: any) => String(e.emergency_type?.id) === selectedType.value);
  }
  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

function typeBadgeColor(name: string) {
  const m: Record<string, string> = {
    Ambulance: "text-red-700 bg-red-50",
    Damkar: "text-orange-700 bg-orange-50",
    "Rumah Sakit": "text-blue-700 bg-blue-50",
    SAR: "text-green-700 bg-green-50",
  };
  return m[name] ?? "text-neutral-700 bg-neutral-100";
}

// ── Create ──────────────────────────────────────────────────────────────────
const showCreate = ref(false);
const creating = ref(false);
const createError = ref("");
const createForm = reactive({
  name: "", organization_name: "", organization_type: "",
  organization_logo: "",
  description: "", type_id: "",
  phone: "", whatsapp: "", email: "",
  district_id: "", regency_id: "", province_id: "",
  regency_display: "", province_display: "",
  full_address: "", lat: "", lng: "",
  is_dispatcher: false, is_province_dispatcher: false,
  type_of_service: "",
});

async function submitCreate() {
  if (!createForm.name || !createForm.type_id) return;
  creating.value = true;
  createError.value = "";
  try {
    await post("/api/v1/emergency/", {
      name: createForm.name,
      organization_name: createForm.organization_name,
      organization_type: createForm.organization_type,
      organization_logo: createForm.organization_logo,
      description: createForm.description,
      emergency_type: { id: parseInt(createForm.type_id) },
      coordinates: [createForm.lng || "0", createForm.lat || "0"],
      contact: { phone: createForm.phone, whatsapp: createForm.whatsapp, email: createForm.email },
      address: {
        district_id: createForm.district_id,
        regency_id: createForm.regency_id,
        province_id: createForm.province_id,
        full_address: createForm.full_address,
      },
      is_dispatcher: createForm.is_dispatcher,
      is_province_dispatcher: createForm.is_province_dispatcher,
      type_of_service: createForm.type_of_service,
    });
    showCreate.value = false;
    Object.assign(createForm, {
      name: "", organization_name: "", organization_type: "", organization_logo: "",
      description: "", type_id: "",
      phone: "", whatsapp: "", email: "", district_id: "", regency_id: "", province_id: "",
      regency_display: "", province_display: "",
      full_address: "", lat: "", lng: "", is_dispatcher: false, is_province_dispatcher: false, type_of_service: "",
    });
    await refresh();
  } catch (err: any) {
    createError.value = err?.data?.message ?? err?.message ?? "Gagal menyimpan layanan";
  } finally {
    creating.value = false;
  }
}

// ── Edit ─────────────────────────────────────────────────────────────────────
const showEdit = ref(false);
const editing = ref(false);
const editError = ref("");
const editTarget = ref<any>(null);
const editForm = reactive({
  name: "", organization_name: "", organization_type: "",
  organization_logo: "",
  description: "", type_id: "",
  phone: "", whatsapp: "", email: "",
  district_id: "", regency_id: "", province_id: "",
  regency_display: "", province_display: "",
  full_address: "", lat: "", lng: "",
  is_dispatcher: false, is_province_dispatcher: false,
  type_of_service: "",
});

function openEdit(item: any) {
  editError.value = "";
  editTarget.value = item;
  Object.assign(editForm, {
    name: item.name ?? "",
    organization_name: item.organization_name ?? "",
    organization_type: item.organization_type ?? "",
    organization_logo: item.organization_logo ?? "",
    description: item.description ?? "",
    type_id: String(item.emergency_type?.id ?? ""),
    phone: item.contact?.phone ?? "",
    whatsapp: item.contact?.whatsapp ?? "",
    email: item.contact?.email ?? "",
    district_id: item.address?.district_id ?? "",
    regency_id: item.address?.regency_id ?? "",
    province_id: item.address?.province_id ?? "",
    regency_display: item.address?.regency ?? "",
    province_display: item.address?.province ?? "",
    full_address: item.address?.full_address ?? "",
    lat: item.coordinates?.[1] ?? "",
    lng: item.coordinates?.[0] ?? "",
    is_dispatcher: item.is_dispatcher ?? false,
    is_province_dispatcher: item.is_province_dispatcher ?? false,
    type_of_service: item.type_of_service ?? "",
  });
  showEdit.value = true;
}

async function submitEdit() {
  if (!editTarget.value || !editForm.name || !editForm.type_id) return;
  editing.value = true;
  editError.value = "";
  try {
    await put(`/api/v1/emergency/${editTarget.value.id}`, {
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
      type_of_service: editForm.type_of_service,
    });
    showEdit.value = false;
    await refresh();
  } catch (err: any) {
    editError.value = err?.data?.message ?? err?.message ?? "Gagal menyimpan perubahan";
  } finally {
    editing.value = false;
  }
}

// ── Map Picker ────────────────────────────────────────────────────────────────
const showMapPicker = ref(false);
const activeMapForm = ref<"create" | "edit" | null>(null);

function handleOpenMapPicker(which: "create" | "edit") {
  activeMapForm.value = which;
  showMapPicker.value = true;
}

function handleMapConfirm(lat: string, lng: string) {
  if (lat && lng) {
    const form = activeMapForm.value === "edit" ? editForm : createForm;
    form.lat = lat;
    form.lng = lng;
  }
  showMapPicker.value = false;
  activeMapForm.value = null;
}

// ── Unit Credentials ──────────────────────────────────────────────────────────
const showCredential = ref(false);
const credentialTarget = ref<any>(null);

function openCredential(item: any) {
  credentialTarget.value = item;
  showCredential.value = true;
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deletingId = ref<string | null>(null);

async function deleteEmergency(id: string, name: string) {
  if (!confirm(`Hapus "${name}"?`)) return;
  deletingId.value = id;
  try {
    await del(`/api/v1/emergency/${id}`);
    await refresh();
  } finally {
    deletingId.value = null;
  }
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-lg font-semibold text-neutral-900">Layanan Darurat</h1>
          <p class="text-sm text-neutral-500 mt-0.5">
            <span v-if="pending">Memuat...</span>
            <span v-else>{{ filtered.length }} dari {{ data?.data?.length ?? 0 }} layanan</span>
          </p>
        </div>
        <UiButton size="sm" @click="showCreate = true; createError = ''">
          <Icon icon="lucide:plus" class="text-sm" />
          <span class="hidden sm:inline">Tambah Layanan</span>
        </UiButton>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="bg-white border-b border-neutral-100 px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
      <div class="relative flex-1 min-w-[150px] max-w-xs">
        <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nama, organisasi, wilayah..."
          class="w-full pl-8 pr-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white transition-colors"
        />
      </div>
      <UiSelect v-model="selectedType" class="!w-auto">
        <option value="">Semua Jenis</option>
        <option v-for="t in (types?.data ?? [])" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
      </UiSelect>
      <UiSelect v-model="pageSize" class="!w-auto" @change="page = 1">
        <option :value="10">10 / halaman</option>
        <option :value="25">25 / halaman</option>
        <option :value="50">50 / halaman</option>
      </UiSelect>
    </div>

    <!-- Table -->
    <div class="p-4 sm:p-6">
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-neutral-100 bg-neutral-50">
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Layanan</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Jenis</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Wilayah</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden xl:table-cell">Kontak</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th class="px-4 sm:px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr v-if="pending">
                <td colspan="6" class="px-5 py-10 text-center">
                  <div class="flex items-center justify-center gap-2 text-neutral-400 text-sm">
                    <UiSpinner size="sm" />
                    Memuat data...
                  </div>
                </td>
              </tr>
              <tr v-else-if="!paginated.length">
                <td colspan="6">
                  <UiEmptyState title="Tidak ada data yang cocok">
                    <template #icon>
                      <div class="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                        <Icon icon="lucide:search-x" class="text-neutral-400" />
                      </div>
                    </template>
                  </UiEmptyState>
                </td>
              </tr>
              <tr
                v-for="item in paginated"
                v-else
                :key="item.id"
                class="hover:bg-neutral-50 transition-colors"
              >
                <td class="px-4 sm:px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="item.organization_logo"
                      :src="item.organization_logo"
                      :alt="item.name"
                      class="w-9 h-9 rounded-lg object-contain bg-neutral-100 p-1 shrink-0"
                    />
                    <div v-else class="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                      <Icon icon="lucide:shield" class="text-neutral-400" />
                    </div>
                    <div class="min-w-0">
                      <p class="font-medium text-neutral-900 truncate max-w-[160px] sm:max-w-[200px]">{{ item.name }}</p>
                      <p class="text-xs text-neutral-400 truncate max-w-[160px] sm:max-w-[200px]">{{ item.organization_name }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 sm:px-5 py-3.5 hidden md:table-cell">
                  <span :class="['text-xs font-medium px-2 py-1 rounded-full', typeBadgeColor(item.emergency_type?.name)]">
                    {{ item.emergency_type?.name ?? '-' }}
                  </span>
                </td>
                <td class="px-4 sm:px-5 py-3.5 hidden lg:table-cell">
                  <p class="text-neutral-900 text-sm">{{ item.address?.regency ?? '-' }}</p>
                  <p class="text-xs text-neutral-400">{{ item.address?.province }}</p>
                </td>
                <td class="px-4 sm:px-5 py-3.5 text-xs text-neutral-500 space-y-0.5 hidden xl:table-cell">
                  <div v-if="item.contact?.phone" class="flex items-center gap-1">
                    <Icon icon="lucide:phone" class="text-neutral-400 text-[11px]" />
                    {{ item.contact.phone }}
                  </div>
                  <div v-if="item.contact?.whatsapp" class="flex items-center gap-1">
                    <Icon icon="lucide:message-circle" class="text-neutral-400 text-[11px]" />
                    {{ item.contact.whatsapp }}
                  </div>
                  <span v-if="!item.contact?.phone && !item.contact?.whatsapp" class="text-neutral-300">—</span>
                </td>
                <td class="px-4 sm:px-5 py-3.5 hidden sm:table-cell">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                      item.is_dispatcher ? 'bg-primary-50 text-primary-700' : 'bg-neutral-100 text-neutral-600',
                    ]"
                  >
                    <Icon :icon="item.is_dispatcher ? 'lucide:phone-incoming' : 'lucide:shield'" class="text-[11px]" />
                    {{ item.is_dispatcher ? 'Dispatcher' : 'Layanan' }}
                  </span>
                </td>
                <td class="px-4 sm:px-5 py-3.5 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                      title="Set Akun Unit"
                      @click="openCredential(item)"
                    >
                      <Icon icon="lucide:key-round" class="text-sm" />
                    </button>
                    <button
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Edit"
                      @click="openEdit(item)"
                    >
                      <Icon icon="lucide:pencil" class="text-sm" />
                    </button>
                    <button
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-emergency-600 hover:bg-emergency-50 transition-colors"
                      title="Hapus"
                      :disabled="deletingId === item.id"
                      @click="deleteEmergency(item.id, item.name)"
                    >
                      <UiSpinner v-if="deletingId === item.id" size="xs" class="text-emergency-500" />
                      <Icon v-else icon="lucide:trash-2" class="text-sm" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!pending && filtered.length" class="px-4 sm:px-5 py-3 border-t border-neutral-100 bg-neutral-50">
          <UiPagination
            v-model:page="page"
            :total-pages="totalPages"
            :total="filtered.length"
            :page-size="pageSize"
          />
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <UiModal v-model:open="showCreate" title="Tambah Layanan Darurat" description="Tambahkan layanan darurat baru ke dalam sistem.">
      <template #trigger><span /></template>
      <EmergencyForm :types="types?.data ?? []" :form="createForm" @open-map-picker="handleOpenMapPicker('create')" />
      <template #footer>
        <p v-if="createError" class="text-xs text-emergency-600 flex-1 text-left">{{ createError }}</p>
        <UiButton variant="secondary" size="sm" @click="showCreate = false">Batal</UiButton>
        <UiButton size="sm" :loading="creating" :disabled="!createForm.name || !createForm.type_id" @click="submitCreate">
          Simpan
        </UiButton>
      </template>
    </UiModal>

    <!-- Edit modal -->
    <UiModal v-model:open="showEdit" title="Edit Layanan Darurat" description="Ubah data layanan darurat.">
      <template #trigger><span /></template>
      <EmergencyForm :types="types?.data ?? []" :form="editForm" @open-map-picker="handleOpenMapPicker('edit')" />
      <template #footer>
        <p v-if="editError" class="text-xs text-emergency-600 flex-1 text-left">{{ editError }}</p>
        <UiButton variant="secondary" size="sm" @click="showEdit = false">Batal</UiButton>
        <UiButton size="sm" :loading="editing" :disabled="!editForm.name || !editForm.type_id" @click="submitEdit">
          Simpan Perubahan
        </UiButton>
      </template>
    </UiModal>
    <!-- Unit credential modal -->
    <UnitCredentialModal
      v-if="showCredential"
      :emergency-uuid="credentialTarget.id"
      :unit-name="credentialTarget.name"
      @close="showCredential = false"
      @success="showCredential = false"
    />

    <!-- Map picker — rendered outside all UiModal/DialogContent to avoid reka-ui focus trap -->
    <MapPickerModal
      :is-open="showMapPicker"
      :initial-lat="activeMapForm === 'edit' ? editForm.lat : createForm.lat"
      :initial-lng="activeMapForm === 'edit' ? editForm.lng : createForm.lng"
      @confirm="handleMapConfirm"
    />
  </div>
</template>
