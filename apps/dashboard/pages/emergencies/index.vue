<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";

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

type EmSortCol = 'name' | 'organization_name' | 'type' | 'status';
const sortCol = ref<EmSortCol>('name');
const sortDir = ref<'asc' | 'desc'>('asc');

function sortBy(col: EmSortCol) {
  if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else { sortCol.value = col; sortDir.value = 'asc'; }
  page.value = 1;
}

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
  return [...list].sort((a: any, b: any) => {
    let va = '', vb = '';
    if (sortCol.value === 'type') { va = a.emergency_type?.name ?? ''; vb = b.emergency_type?.name ?? ''; }
    else if (sortCol.value === 'status') { va = String(a.operational?.is_active ?? true); vb = String(b.operational?.is_active ?? true); }
    else { va = a[sortCol.value] ?? ''; vb = b[sortCol.value] ?? ''; }
    const cmp = va.localeCompare(vb);
    return sortDir.value === 'asc' ? cmp : -cmp;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

function typeBadgeColor(name: string) {
  const m: Record<string, string> = {
    Ambulance:    "bg-red-100 text-red-800",
    Damkar:       "bg-orange-100 text-orange-800",
    "Rumah Sakit":"bg-blue-100 text-blue-800",
    SAR:          "bg-green-100 text-green-800",
  };
  return m[name] ?? "bg-neutral-100 text-neutral-700";
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
  type_of_service: "", tipe_emergency: [] as string[],
  is_active: true, is_24_hours: false,
  open_time: "08:00", close_time: "17:00",
  total_units: 0, available_units: 0,
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
      tipe_emergency: createForm.tipe_emergency,
      operational: {
        is_active: createForm.is_active,
        is_24_hours: createForm.is_24_hours,
        open_time: createForm.open_time,
        close_time: createForm.close_time,
      },
      fleet: { total: createForm.total_units, available: createForm.available_units },
    });
    showCreate.value = false;
    Object.assign(createForm, {
      name: "", organization_name: "", organization_type: "", organization_logo: "",
      description: "", type_id: "",
      phone: "", whatsapp: "", email: "", district_id: "", regency_id: "", province_id: "",
      regency_display: "", province_display: "",
      full_address: "", lat: "", lng: "", is_dispatcher: false, is_province_dispatcher: false,
      type_of_service: "", tipe_emergency: [],
      is_active: true, is_24_hours: false, open_time: "08:00", close_time: "17:00",
      total_units: 0, available_units: 0,
    });
    await refresh();
    toast.success("Layanan berhasil ditambahkan");
  } catch (err: any) {
    createError.value = err?.data?.message ?? err?.message ?? "Gagal menyimpan layanan";
    toast.error(createError.value);
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
  type_of_service: "", tipe_emergency: [] as string[],
  is_active: true, is_24_hours: false,
  open_time: "08:00", close_time: "17:00",
  total_units: 0, available_units: 0,
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
    tipe_emergency: Array.isArray(item.tipe_emergency) ? item.tipe_emergency : [],
    is_active: item.operational?.is_active ?? true,
    is_24_hours: item.operational?.is_24_hours ?? false,
    open_time: item.operational?.open_time ?? "08:00",
    close_time: item.operational?.close_time ?? "17:00",
    total_units: item.fleet?.total ?? 0,
    available_units: item.fleet?.available ?? 0,
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
      tipe_emergency: editForm.tipe_emergency,
      operational: {
        is_active: editForm.is_active,
        is_24_hours: editForm.is_24_hours,
        open_time: editForm.open_time,
        close_time: editForm.close_time,
      },
      fleet: { total: editForm.total_units, available: editForm.available_units },
    });
    showEdit.value = false;
    await refresh();
    toast.success("Perubahan berhasil disimpan");
  } catch (err: any) {
    editError.value = err?.data?.message ?? err?.message ?? "Gagal menyimpan perubahan";
    toast.error(editError.value);
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

async function handleMapConfirm(lat: string, lng: string) {
  if (lat && lng) {
    const form = activeMapForm.value === "edit" ? editForm : createForm;
    form.lat = lat;
    form.lng = lng;
    try {
      const res = await get<{ data: any }>(`/api/v1/geocoding/reverse?latitude=${lat}&longitude=${lng}`);
      if (res?.data?.display_name) {
        form.full_address = res.data.display_name;
      }
    } catch { /* silently ignore — user can fill manually */ }
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

// ── Toggle active ─────────────────────────────────────────────────────────────
const togglingId = ref<string | null>(null);

async function toggleActive(item: any) {
  togglingId.value = item.id;
  try {
    await put(`/api/v1/emergency/${item.id}/active`, { is_active: !item.operational?.is_active });
    await refresh();
    toast.success(`Layanan ${!item.operational?.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
  } catch {
    toast.error("Gagal mengubah status layanan");
  } finally {
    togglingId.value = null;
  }
}

// ── Detail ───────────────────────────────────────────────────────────────────
const showDetail = ref(false);
const detailItem = ref<any>(null);
function openDetail(item: any) {
  detailItem.value = item;
  showDetail.value = true;
}

// ── Row dropdown ──────────────────────────────────────────────────────────────
const dropdownItem = ref<any>(null);
const dropdownPos = ref({ top: 0, right: 0 });
function toggleDropdown(item: any, event: MouseEvent) {
  if (dropdownItem.value?.id === item.id) { dropdownItem.value = null; return; }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right };
  dropdownItem.value = item;
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deletingId = ref<string | null>(null);
const showDeleteConfirm = ref(false);
const deleteTarget = ref<{ id: string; name: string } | null>(null);

function confirmDelete(id: string, name: string) {
  deleteTarget.value = { id, name };
  showDeleteConfirm.value = true;
}

async function executeDelete() {
  if (!deleteTarget.value) return;
  deletingId.value = deleteTarget.value.id;
  showDeleteConfirm.value = false;
  try {
    await del(`/api/v1/emergency/${deleteTarget.value.id}`);
    await refresh();
    toast.success(`"${deleteTarget.value.name}" berhasil dihapus`);
  } catch {
    toast.error("Gagal menghapus layanan");
  } finally {
    deletingId.value = null;
    deleteTarget.value = null;
  }
}
</script>

<template>
  <div>
    <!-- Dropdown overlay -->
    <div v-if="dropdownItem" class="fixed inset-0 z-[98]" @click="dropdownItem = null" />

    <!-- Page header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-neutral-900">Layanan Darurat</h1>
          <p class="text-sm text-neutral-500 mt-0.5">
            <span v-if="pending">Memuat...</span>
            <span v-else>{{ filtered.length }} dari {{ data?.data?.length ?? 0 }} layanan terdaftar</span>
          </p>
        </div>
        <UiButton @click="showCreate = true; createError = ''">
          <Icon icon="lucide:plus" class="text-sm" />
          Tambah Layanan
        </UiButton>
      </div>
    </div>

    <!-- Table card -->
    <div class="p-4 sm:p-6">
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">

        <!-- Toolbar inside card -->
        <div class="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3 border-b border-neutral-200">
          <div class="relative flex-1 min-w-[160px] max-w-sm">
            <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none" />
            <UiInput v-model="search" placeholder="Cari nama, organisasi, wilayah..." class="pl-9" />
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
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                <th class="px-6 py-4 text-left cursor-pointer hover:bg-neutral-100 select-none transition-colors group" @click="sortBy('name')">
                  <div class="flex items-center gap-1.5">Layanan <Icon :icon="sortCol==='name'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='name'?'text-primary-500':'text-neutral-300 group-hover:text-neutral-400']" /></div>
                </th>
                <th class="px-6 py-4 text-left hidden md:table-cell cursor-pointer hover:bg-neutral-100 select-none transition-colors group" @click="sortBy('type')">
                  <div class="flex items-center gap-1.5">Jenis <Icon :icon="sortCol==='type'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='type'?'text-primary-500':'text-neutral-300 group-hover:text-neutral-400']" /></div>
                </th>
                <th class="px-6 py-4 text-left hidden lg:table-cell">Wilayah</th>
                <th class="px-6 py-4 text-left hidden sm:table-cell cursor-pointer hover:bg-neutral-100 select-none transition-colors group" @click="sortBy('status')">
                  <div class="flex items-center gap-1.5">Status <Icon :icon="sortCol==='status'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='status'?'text-primary-500':'text-neutral-300 group-hover:text-neutral-400']" /></div>
                </th>
                <th class="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <!-- Skeleton -->
              <tr v-if="pending" v-for="i in 5" :key="`skel-${i}`" class="animate-pulse">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-neutral-200 rounded-lg shrink-0" />
                    <div class="space-y-2 flex-1">
                      <div class="h-3.5 bg-neutral-200 rounded w-36" />
                      <div class="h-3 bg-neutral-100 rounded w-24" />
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 hidden md:table-cell"><div class="h-6 bg-neutral-100 rounded-full w-20" /></td>
                <td class="px-6 py-4 hidden lg:table-cell"><div class="h-3.5 bg-neutral-100 rounded w-28" /></td>
                <td class="px-6 py-4 hidden sm:table-cell"><div class="h-6 bg-neutral-100 rounded-full w-16" /></td>
                <td class="px-6 py-4"><div class="h-9 bg-neutral-100 rounded-lg w-24 ml-auto" /></td>
              </tr>

              <!-- Empty -->
              <tr v-else-if="!paginated.length">
                <td colspan="5">
                  <UiEmptyState title="Tidak ada layanan yang cocok">
                    <template #icon>
                      <Icon icon="lucide:search-x" class="text-neutral-400 text-2xl" />
                    </template>
                  </UiEmptyState>
                </td>
              </tr>

              <!-- Data rows -->
              <tr v-else v-for="item in paginated" :key="item.id" class="hover:bg-neutral-50 transition-colors">
                <!-- Layanan -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="item.organization_logo"
                      :src="item.organization_logo"
                      :alt="item.name"
                      class="w-10 h-10 rounded-lg object-contain bg-neutral-100 p-1 shrink-0"
                    />
                    <div v-else class="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                      <Icon icon="lucide:shield" class="text-neutral-400 text-lg" />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-semibold text-neutral-900 text-sm">{{ item.name }}</p>
                        <span
                          v-if="item.is_dispatcher"
                          class="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0"
                        >
                          <Icon icon="lucide:phone-incoming" class="text-[10px]" />
                          Dispatcher
                        </span>
                      </div>
                      <p class="text-xs text-neutral-400 mt-0.5 truncate max-w-[200px]">{{ item.organization_name }}</p>
                    </div>
                  </div>
                </td>

                <!-- Jenis -->
                <td class="px-6 py-4 hidden md:table-cell">
                  <span :class="['text-xs font-medium px-2.5 py-1 rounded-full', typeBadgeColor(item.emergency_type?.name)]">
                    {{ item.emergency_type?.name ?? '—' }}
                  </span>
                </td>

                <!-- Wilayah -->
                <td class="px-6 py-4 hidden lg:table-cell">
                  <p class="text-sm font-medium text-neutral-900">{{ item.address?.regency ?? '—' }}</p>
                  <p class="text-xs text-neutral-400 mt-0.5">{{ item.address?.province }}</p>
                </td>

                <!-- Status -->
                <td class="px-6 py-4 hidden sm:table-cell">
                  <button
                    :disabled="togglingId === item.id"
                    :class="[
                      'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors',
                      item.operational?.is_active !== false
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        : 'bg-neutral-100 border-neutral-200 text-neutral-500 hover:bg-neutral-200',
                      togglingId === item.id && 'opacity-50 cursor-not-allowed',
                    ]"
                    @click.stop="toggleActive(item)"
                  >
                    <span :class="['w-1.5 h-1.5 rounded-full shrink-0', item.operational?.is_active !== false ? 'bg-green-500' : 'bg-neutral-400']" />
                    {{ item.operational?.is_active !== false ? 'Aktif' : 'Nonaktif' }}
                  </button>
                  <p class="text-xs text-neutral-400 mt-1.5">
                    <template v-if="item.operational?.is_24_hours">24 Jam</template>
                    <template v-else-if="item.operational?.open_time">{{ item.operational.open_time }}–{{ item.operational.close_time }}</template>
                  </p>
                </td>

                <!-- Aksi -->
                <td class="px-6 py-4 text-right">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-neutral-900 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-neutral-100 transition-colors"
                    @click.stop="toggleDropdown(item, $event)"
                  >
                    Aksi
                    <Icon icon="lucide:chevron-down" class="text-xs text-neutral-500" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="!pending && filtered.length" class="px-6 py-4 border-t border-neutral-200">
          <UiPagination
            v-model:page="page"
            :total-pages="totalPages"
            :total="filtered.length"
            :page-size="pageSize"
          />
        </div>
      </div>
    </div>

    <!-- Row dropdown (teleported) -->
    <Teleport to="body">
      <div
        v-if="dropdownItem"
        class="fixed z-[99] w-52 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden py-1"
        :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }"
        @click.stop
      >
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="openDetail(dropdownItem); dropdownItem = null"
        >
          <Icon icon="lucide:info" class="text-neutral-500 text-base shrink-0" />
          Lihat Detail
        </button>
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="toggleActive(dropdownItem); dropdownItem = null"
        >
          <Icon
            :icon="dropdownItem?.operational?.is_active !== false ? 'lucide:power-off' : 'lucide:power'"
            :class="['text-base shrink-0', dropdownItem?.operational?.is_active !== false ? 'text-orange-500' : 'text-green-600']"
          />
          {{ dropdownItem?.operational?.is_active !== false ? 'Nonaktifkan' : 'Aktifkan' }}
        </button>
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="openCredential(dropdownItem); dropdownItem = null"
        >
          <Icon icon="lucide:key-round" class="text-purple-500 text-base shrink-0" />
          Set Akun Unit
        </button>
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="openEdit(dropdownItem); dropdownItem = null"
        >
          <Icon icon="lucide:pencil" class="text-neutral-500 text-base shrink-0" />
          Edit
        </button>
        <div class="border-t border-neutral-100 mt-1 pt-1">
          <button
            class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            @click="confirmDelete(dropdownItem.id, dropdownItem.name); dropdownItem = null"
          >
            <Icon icon="lucide:trash-2" class="text-base shrink-0" />
            Hapus
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Detail modal -->
    <UiModal v-model:open="showDetail" title="Detail Layanan Darurat" description="Informasi lengkap layanan darurat.">
      <template #trigger><span /></template>
      <div v-if="detailItem" class="space-y-5">
        <!-- Identity -->
        <div class="flex items-start gap-4">
          <img
            v-if="detailItem.organization_logo"
            :src="detailItem.organization_logo"
            :alt="detailItem.name"
            class="w-16 h-16 rounded-xl object-contain bg-neutral-100 p-2 shrink-0 border border-neutral-200"
          />
          <div v-else class="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
            <Icon icon="lucide:shield" class="text-neutral-400 text-2xl" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base font-semibold text-neutral-900">{{ detailItem.name }}</h3>
              <span
                v-if="detailItem.is_dispatcher"
                class="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700"
              >
                <Icon icon="lucide:phone-incoming" class="text-[10px]" />
                Dispatcher
              </span>
            </div>
            <p class="text-sm text-neutral-500 mt-0.5">{{ detailItem.organization_name }}</p>
            <div class="flex flex-wrap gap-2 mt-2">
              <span :class="['text-xs font-medium px-2.5 py-1 rounded-full', typeBadgeColor(detailItem.emergency_type?.name)]">
                {{ detailItem.emergency_type?.name ?? '—' }}
              </span>
              <span :class="['inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', detailItem.operational?.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500']">
                <span :class="['w-1.5 h-1.5 rounded-full', detailItem.operational?.is_active !== false ? 'bg-green-500' : 'bg-neutral-400']" />
                {{ detailItem.operational?.is_active !== false ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Contact -->
        <div class="border border-neutral-200 rounded-xl overflow-hidden">
          <div class="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200">
            <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Kontak</p>
          </div>
          <div class="divide-y divide-neutral-100">
            <div class="flex items-center gap-3 px-4 py-3">
              <Icon icon="lucide:phone" class="text-neutral-400 text-sm shrink-0" />
              <div>
                <p class="text-xs text-neutral-400">Telepon</p>
                <p class="text-sm font-medium text-neutral-800">{{ detailItem.contact?.phone || '—' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 px-4 py-3">
              <Icon icon="lucide:message-circle" class="text-neutral-400 text-sm shrink-0" />
              <div>
                <p class="text-xs text-neutral-400">WhatsApp</p>
                <p class="text-sm font-medium text-neutral-800">{{ detailItem.contact?.whatsapp || '—' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 px-4 py-3">
              <Icon icon="lucide:mail" class="text-neutral-400 text-sm shrink-0" />
              <div>
                <p class="text-xs text-neutral-400">Email</p>
                <p class="text-sm font-medium text-neutral-800">{{ detailItem.contact?.email || '—' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Fleet -->
        <div class="border border-neutral-200 rounded-xl overflow-hidden">
          <div class="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200">
            <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Armada</p>
          </div>
          <div class="grid grid-cols-2 divide-x divide-neutral-100">
            <div class="px-4 py-3 text-center">
              <p class="text-2xl font-bold text-neutral-900">{{ detailItem.fleet?.total ?? 0 }}</p>
              <p class="text-xs text-neutral-400 mt-0.5">Total Unit</p>
            </div>
            <div class="px-4 py-3 text-center">
              <p class="text-2xl font-bold text-green-600">{{ detailItem.fleet?.available ?? 0 }}</p>
              <p class="text-xs text-neutral-400 mt-0.5">Tersedia</p>
            </div>
          </div>
        </div>

        <!-- Address & Operational -->
        <div class="border border-neutral-200 rounded-xl overflow-hidden">
          <div class="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200">
            <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Lokasi &amp; Operasional</p>
          </div>
          <div class="divide-y divide-neutral-100">
            <div class="flex items-start gap-3 px-4 py-3">
              <Icon icon="lucide:map-pin" class="text-neutral-400 text-sm shrink-0 mt-0.5" />
              <div>
                <p class="text-xs text-neutral-400">Wilayah</p>
                <p class="text-sm font-medium text-neutral-800">{{ detailItem.address?.regency || '—' }}, {{ detailItem.address?.province }}</p>
                <p v-if="detailItem.address?.full_address" class="text-xs text-neutral-500 mt-0.5">{{ detailItem.address.full_address }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 px-4 py-3">
              <Icon icon="lucide:clock" class="text-neutral-400 text-sm shrink-0" />
              <div>
                <p class="text-xs text-neutral-400">Jam Operasional</p>
                <p class="text-sm font-medium text-neutral-800">
                  <template v-if="detailItem.operational?.is_24_hours">24 Jam Non-Stop</template>
                  <template v-else-if="detailItem.operational?.open_time">{{ detailItem.operational.open_time }} – {{ detailItem.operational.close_time }}</template>
                  <template v-else>—</template>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showDetail = false">Tutup</UiButton>
        <UiButton size="sm" @click="openEdit(detailItem); showDetail = false">
          <Icon icon="lucide:pencil" class="text-sm" />
          Edit
        </UiButton>
      </template>
    </UiModal>

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

    <!-- Delete confirm modal -->
    <UiModal v-model:open="showDeleteConfirm" title="Hapus Layanan" description="Tindakan ini tidak dapat dibatalkan.">
      <template #trigger><span /></template>
      <p class="text-sm text-neutral-600">
        Apakah kamu yakin ingin menghapus <span class="font-semibold">{{ deleteTarget?.name }}</span>?
      </p>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showDeleteConfirm = false">Batal</UiButton>
        <UiButton variant="danger" size="sm" @click="executeDelete">
          <Icon icon="lucide:trash-2" class="text-sm" />
          Hapus
        </UiButton>
      </template>
    </UiModal>

    <!-- Map picker — rendered outside all UiModal/DialogContent to avoid reka-ui focus trap -->
    <MapPickerModal
      :is-open="showMapPicker"
      :initial-lat="activeMapForm === 'edit' ? editForm.lat : createForm.lat"
      :initial-lng="activeMapForm === 'edit' ? editForm.lng : createForm.lng"
      @confirm="handleMapConfirm"
    />
  </div>
</template>
