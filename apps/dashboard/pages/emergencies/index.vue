<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";
import { placeAnchoredMenu } from "~/utils/placeAnchoredMenu";
import { partnerTierBadgeClass, partnerTierLabel } from "~/utils/partnerTier";

definePageMeta({ title: "Layanan Darurat", keepalive: true });

const { get, authGet, post, del } = useApi();

const search = usePersistedQueryParam("bb-emergencies-q", "q", "", { syncQuery: false });
const selectedType = usePersistedQueryParam("bb-emergencies-type", "type");
const filterProvince = usePersistedQueryParam("bb-emergencies-province", "province");
const pageSize = ref(10);
const page = ref(1);

const { loadProvinces, provinces: coveredProvinces } = useCoveredWilayah();
await loadProvinces();

const { data, pending, refresh: refreshEmergencies } = await useAsyncData("emergencies-list", () =>
  authGet<{ data: any[] }>("/api/v1/admin/emergencies")
);
const { data: types } = await useAsyncData("types-filter", () =>
  get<{ data: any[] }>("/api/v1/emergency/type")
);

const refresh = useSoftRefresh(refreshEmergencies);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

watch([search, selectedType, filterProvince], () => { page.value = 1; });

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
        e.address?.regency?.toLowerCase().includes(q) ||
        e.address?.province?.toLowerCase().includes(q)
    );
  }
  if (selectedType.value) {
    list = list.filter((e: any) => String(e.emergency_type?.id) === selectedType.value);
  }
  if (filterProvince.value) {
    list = list.filter((e: any) => e.address?.province_id === filterProvince.value);
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

function operasiMeta(item: any) {
  const active = item.operational?.is_active !== false;
  let hours = "";
  if (item.operational?.is_24_hours) hours = "24 jam";
  else if (item.operational?.open_time) {
    hours = `${item.operational.open_time}–${item.operational.close_time}`;
  }
  return { active, hours };
}

/** Satu label akses utama — hindari badge menumpuk di kolom nama. */
function aksesLabel(item: any): { text: string; tone: string } {
  if (item.is_province_dispatcher) {
    return { text: "Dispatcher provinsi", tone: "bg-violet-50 text-violet-700 ring-violet-100" };
  }
  if (item.is_dispatcher) {
    return { text: "Dispatcher", tone: "bg-blue-50 text-blue-700 ring-blue-100" };
  }
  if (item.dashboard_access === false || item.wa_dispatch) {
    return { text: "WA only", tone: "bg-amber-50 text-amber-800 ring-amber-100" };
  }
  if (credSet.value.has(item.id)) {
    return { text: "Login aktif", tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  }
  return { text: "Dashboard", tone: "bg-neutral-100 text-neutral-600 ring-neutral-200" };
}

// ── Dashboard access badges ────────────────────────────────────────────────────
const credSet = ref(new Set<string>());

async function loadCredBadges() {
  try {
    const res = await authGet<{ data: { emergency_uuid: string }[] }>("/api/v1/admin/units/credentials");
    credSet.value = new Set((res?.data ?? []).map((c) => c.emergency_uuid));
  } catch { /* badges silently unavailable */ }
}

onMounted(() => loadCredBadges());

// ── Create ────────────────────────────────────────────────────────────────────
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
  partner_tier: "community",
  dashboard_access: true,
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
      partner_tier: createForm.partner_tier,
      dashboard_access: createForm.dashboard_access === true,
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
      partner_tier: "community",
      dashboard_access: true,
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

// ── Map picker (create only) ──────────────────────────────────────────────────
const showMapPicker = ref(false);

async function handleMapConfirm(lat: string, lng: string) {
  if (lat && lng) {
    createForm.lat = lat;
    createForm.lng = lng;
    try {
      const res = await get<{ data: any }>(`/api/v1/geocoding/reverse?latitude=${lat}&longitude=${lng}`);
      if (res?.data?.display_name) createForm.full_address = res.data.display_name;
    } catch { /* silently ignore */ }
  }
  showMapPicker.value = false;
}

// ── Row dropdown ───────────────────────────────────────────────────────────────
const dropdownItem = ref<any>(null);
const dropdownPos = ref({ top: 0, right: 0 });

function toggleDropdown(item: any, event: MouseEvent) {
  if (dropdownItem.value?.id === item.id) { dropdownItem.value = null; return; }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  dropdownPos.value = (() => {
    const pos = placeAnchoredMenu(rect, { menuHeight: 130, alignRight: true });
    return { top: pos.top, right: pos.right };
  })();
  dropdownItem.value = item;
}

// ── Delete ─────────────────────────────────────────────────────────────────────
const showDeleteConfirm = ref(false);
const deleteTarget = ref<{ id: string; name: string } | null>(null);

function confirmDelete(id: string, name: string) {
  deleteTarget.value = { id, name };
  showDeleteConfirm.value = true;
}

async function executeDelete() {
  if (!deleteTarget.value) return;
  showDeleteConfirm.value = false;
  try {
    await del(`/api/v1/emergency/${deleteTarget.value.id}`);
    await refresh();
    toast.success(`"${deleteTarget.value.name}" berhasil dihapus`);
  } catch {
    toast.error("Gagal menghapus layanan");
  } finally {
    deleteTarget.value = null;
  }
}
</script>

<template>
  <div>
    <!-- Dropdown overlay -->
    <div v-if="dropdownItem" class="fixed inset-0 z-[98]" @click="dropdownItem = null" />

    <!-- Page header -->
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="page-subheader-title">Layanan Darurat</h1>
          <p class="page-subheader-desc">
            <span v-if="showSkeleton">Memuat...</span>
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
      <UiTableCard
        title="Daftar Layanan"
        :badge="filtered.length"
        description="Unit darurat terdaftar di sistem"
      >
        <template #actions>
          <UiSearchInput
            v-model="search"
            placeholder="Cari..."
            class="w-28 sm:w-36 shrink-0"
          />
          <UiSelect v-model="selectedType" class="!w-auto shrink-0">
            <option value="">Semua jenis</option>
            <option v-for="t in (types?.data ?? [])" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
          </UiSelect>
          <UiSelect v-model="filterProvince" class="!w-auto shrink-0">
            <option value="">Semua provinsi</option>
            <option v-for="p in coveredProvinces" :key="p.id" :value="p.id">{{ p.name }}</option>
          </UiSelect>
        </template>

        <UiTable table-class="ui-table--orders-v2 ui-table--emergencies" min-width="52rem">
          <thead>
            <tr>
              <th class="ui-th-sortable" @click="sortBy('name')">
                <span class="ui-th-label">
                  Layanan
                  <Icon :icon="sortCol==='name'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='name'?'text-neutral-700':'text-neutral-300']" />
                </span>
              </th>
              <th class="ui-th-sortable hidden sm:table-cell" @click="sortBy('type')">
                <span class="ui-th-label">
                  Jenis
                  <Icon :icon="sortCol==='type'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='type'?'text-neutral-700':'text-neutral-300']" />
                </span>
              </th>
              <th class="hidden md:table-cell">Tier</th>
              <th class="hidden lg:table-cell">Wilayah</th>
              <th class="ui-th-sortable hidden md:table-cell" @click="sortBy('status')">
                <span class="ui-th-label">
                  Operasi
                  <Icon :icon="sortCol==='status'?(sortDir==='asc'?'lucide:chevron-up':'lucide:chevron-down'):'lucide:chevrons-up-down'" :class="['text-xs',sortCol==='status'?'text-neutral-700':'text-neutral-300']" />
                </span>
              </th>
              <th class="hidden xl:table-cell">Akses</th>
              <th class="ui-th-right w-12"><span class="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            <!-- Skeleton -->
            <tr v-if="showSkeleton" v-for="i in 5" :key="`skel-${i}`">
              <td>
                <div class="flex items-center gap-2.5">
                  <div class="soft-skel w-9 h-9 rounded-lg shrink-0" />
                  <div class="space-y-1.5 flex-1">
                    <div class="soft-skel h-3.5 w-32" />
                    <div class="soft-skel h-3 w-24" />
                  </div>
                </div>
              </td>
              <td class="hidden sm:table-cell"><div class="soft-skel h-6 rounded-full w-16" /></td>
              <td class="hidden md:table-cell"><div class="soft-skel h-5 rounded-full w-14" /></td>
              <td class="hidden lg:table-cell"><div class="soft-skel h-3.5 w-24" /></td>
              <td class="hidden md:table-cell"><div class="soft-skel h-5 rounded-full w-20" /></td>
              <td class="hidden xl:table-cell"><div class="soft-skel h-5 rounded-full w-16" /></td>
              <td class="ui-td-right"><div class="soft-skel h-8 rounded-lg w-8 ml-auto" /></td>
            </tr>

            <!-- Empty -->
            <tr v-else-if="!paginated.length">
              <td colspan="7">
                <UiEmptyState title="Tidak ada layanan yang cocok">
                  <template #icon>
                    <Icon icon="lucide:search-x" class="text-neutral-400 text-2xl" />
                  </template>
                </UiEmptyState>
              </td>
            </tr>

            <!-- Data rows -->
            <tr
              v-else
              v-for="item in paginated"
              :key="item.id"
              class="orders-row group cursor-pointer"
              @click="navigateTo(`/emergencies/${item.id}`)"
            >
              <td>
                <div class="flex items-center gap-2.5 min-w-0">
                  <img
                    v-if="item.organization_logo"
                    :src="item.organization_logo"
                    :alt="item.name"
                    class="w-9 h-9 rounded-lg object-contain bg-neutral-100 p-0.5 shrink-0"
                  />
                  <div v-else class="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:shield" class="text-neutral-400 text-base" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-neutral-900 truncate max-w-[14rem] sm:max-w-[18rem]">
                      {{ item.name }}
                    </p>
                    <p v-if="item.organization_name" class="text-xs text-neutral-500 truncate max-w-[14rem] sm:max-w-[18rem]">
                      {{ item.organization_name }}
                    </p>
                    <div class="mt-1 flex flex-wrap items-center gap-1 md:hidden">
                      <span class="text-[11px] text-neutral-500">{{ item.emergency_type?.name ?? "—" }}</span>
                      <span
                        :class="['inline-flex text-[10px] font-semibold px-1.5 py-px rounded-full ring-1 ring-inset', partnerTierBadgeClass(item.partner_tier)]"
                      >
                        {{ partnerTierLabel(item.partner_tier) }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <td class="hidden sm:table-cell">
                <span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                  {{ item.emergency_type?.name ?? "—" }}
                </span>
              </td>

              <td class="hidden md:table-cell">
                <span
                  :class="['inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset', partnerTierBadgeClass(item.partner_tier)]"
                >
                  {{ partnerTierLabel(item.partner_tier) }}
                </span>
              </td>

              <td class="hidden lg:table-cell">
                <p class="text-sm text-neutral-800 truncate max-w-[10rem]">{{ item.address?.regency ?? "—" }}</p>
                <p v-if="item.address?.province" class="text-xs text-neutral-500 truncate max-w-[10rem]">
                  {{ item.address.province }}
                </p>
              </td>

              <td class="hidden md:table-cell whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    operasiMeta(item).active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500',
                  ]"
                >
                  <span
                    :class="[
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      operasiMeta(item).active ? 'bg-green-500' : 'bg-neutral-400',
                    ]"
                  />
                  {{ operasiMeta(item).active ? "Aktif" : "Nonaktif" }}
                </span>
                <span v-if="operasiMeta(item).hours" class="ml-1.5 text-xs text-neutral-500 tabular-nums">
                  · {{ operasiMeta(item).hours }}
                </span>
              </td>

              <td class="hidden xl:table-cell" @click.stop>
                <span
                  :class="[
                    'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset',
                    aksesLabel(item).tone,
                  ]"
                >
                  {{ aksesLabel(item).text }}
                </span>
              </td>

              <td class="ui-td-right ui-td-actions !pr-3" @click.stop>
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 text-neutral-500 rounded-lg hover:bg-neutral-100 hover:text-neutral-800 transition-colors opacity-70 group-hover:opacity-100"
                  aria-label="Aksi lainnya"
                  @click.stop="toggleDropdown(item, $event)"
                >
                  <Icon icon="lucide:more-horizontal" class="text-base" />
                </button>
              </td>
            </tr>
          </tbody>
        </UiTable>

        <template v-if="filtered.length" #footer>
          <UiPagination
            v-model:page="page"
            v-model:page-size="pageSize"
            :total-pages="totalPages"
            :total="filtered.length"
            :page-size-options="[10, 25, 50]"
            @update:page-size="page = 1"
          />
        </template>
      </UiTableCard>
    </div>

    <!-- Row dropdown (teleported) -->
    <Teleport to="body">
      <div
        v-if="dropdownItem"
        class="fixed z-[99] w-44 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden py-1"
        :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }"
        @click.stop
      >
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="navigateTo(`/emergencies/${dropdownItem.id}`); dropdownItem = null"
        >
          <Icon icon="lucide:info" class="text-neutral-500 text-base shrink-0" />
          Lihat Detail
        </button>
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="navigateTo(`/emergencies/${dropdownItem.id}?edit=1`); dropdownItem = null"
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

    <!-- Create modal -->
    <UiModal v-model:open="showCreate" title="Tambah Layanan Darurat" description="Tambahkan layanan darurat baru ke dalam sistem.">
      <template #trigger><span /></template>
      <EmergencyForm :types="types?.data ?? []" :form="createForm" @open-map-picker="showMapPicker = true" />
      <template #footer>
        <p v-if="createError" class="text-xs text-emergency-600 flex-1 text-left">{{ createError }}</p>
        <UiButton variant="secondary" size="sm" @click="showCreate = false">Batal</UiButton>
        <UiButton size="sm" :loading="creating" :disabled="!createForm.name || !createForm.type_id" @click="submitCreate">
          Simpan
        </UiButton>
      </template>
    </UiModal>

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

    <!-- Map picker for create -->
    <MapPickerModal
      :is-open="showMapPicker"
      :initial-lat="createForm.lat"
      :initial-lng="createForm.lng"
      @confirm="handleMapConfirm"
    />
  </div>
</template>
