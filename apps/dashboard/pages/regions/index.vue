<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { placeAnchoredMenu } from "~/utils/placeAnchoredMenu";

definePageMeta({ title: "Wilayah Tercakup", keepalive: true });

const { get, post, put, del } = useApi();
const { loadProvinces } = useCoveredWilayah();
const search = ref("");
const page = ref(1);
const pageSize = ref(10);

const { data, pending, refresh: refreshRegions } = await useAsyncData("regions-manage", () =>
  get<{ data: any[] }>("/api/v1/service/available-region")
);

const softRefresh = useSoftRefresh(refreshRegions);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

async function refreshCoverage() {
  await softRefresh();
  await loadProvinces(true);
}

watch(search, () => { page.value = 1; });

const filtered = computed(() => {
  const list = data.value?.data ?? [];
  if (!search.value) return list;
  const q = search.value.toLowerCase();
  return list.filter(
    (r: any) =>
      r.name?.toLowerCase().includes(q) ||
      r.regency?.toLowerCase().includes(q) ||
      r.province?.toLowerCase().includes(q)
  );
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

// ── Row dropdown ──────────────────────────────────────────────────────────────
const dropdownItem = ref<any>(null);
const dropdownPos = ref({ top: 0, right: 0 });
function toggleDropdown(item: any, event: MouseEvent) {
  if (dropdownItem.value?.id === item.id) { dropdownItem.value = null; return; }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  dropdownPos.value = (() => {
    const pos = placeAnchoredMenu(rect, { menuHeight: 140, alignRight: true });
    return { top: pos.top, right: pos.right };
  })();
  dropdownItem.value = item;
}

// ── Create ──────────────────────────────────────────────────────────────────
const showCreate = ref(false);
const creating = ref(false);
const createForm = reactive({ name: "", regency_id: "", latitude: "", longitude: "" });

async function submitCreate() {
  if (!createForm.name || !createForm.regency_id) return;
  creating.value = true;
  try {
    await post("/api/v1/service/available-region", {
      name: createForm.name,
      regency_id: createForm.regency_id,
      latitude: parseFloat(createForm.latitude) || 0,
      longitude: parseFloat(createForm.longitude) || 0,
    });
    showCreate.value = false;
    Object.assign(createForm, { name: "", regency_id: "", latitude: "", longitude: "" });
    await refreshCoverage();
  } finally {
    creating.value = false;
  }
}

// ── Edit ─────────────────────────────────────────────────────────────────────
const showEdit = ref(false);
const editing = ref(false);
const editTarget = ref<any>(null);
const editForm = reactive({ name: "", regency_id: "", latitude: "", longitude: "" });

function openEdit(region: any) {
  editTarget.value = region;
  Object.assign(editForm, {
    name: region.name ?? "",
    regency_id: region.regency_id ?? "",
    latitude: String(region.latitude ?? ""),
    longitude: String(region.longitude ?? ""),
  });
  showEdit.value = true;
}

async function submitEdit() {
  if (!editTarget.value || !editForm.name || !editForm.regency_id) return;
  editing.value = true;
  try {
    await put(`/api/v1/service/available-region/${editTarget.value.id}`, {
      name: editForm.name,
      regency_id: editForm.regency_id,
      latitude: parseFloat(editForm.latitude) || 0,
      longitude: parseFloat(editForm.longitude) || 0,
    });
    showEdit.value = false;
    await refreshCoverage();
  } finally {
    editing.value = false;
  }
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
    await del(`/api/v1/service/available-region/${deleteTarget.value.id}`);
    await refreshCoverage();
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
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="page-subheader-title">Wilayah Tercakup</h1>
          <p class="page-subheader-desc">
            <template v-if="showSkeleton">Memuat...</template>
            <template v-else>
              {{ filtered.length }} dari {{ data?.data?.length ?? 0 }} wilayah · cakupan layanan aktif
            </template>
          </p>
        </div>
        <UiButton @click="showCreate = true">
          <Icon icon="lucide:plus" class="text-sm" />
          Tambah Wilayah
        </UiButton>
      </div>
    </div>

    <!-- Table card -->
    <div class="p-4 sm:p-6">
      <UiTableCard>
        <template #toolbar>
          <div class="flex flex-wrap items-center gap-2.5">
            <UiSearchInput
              v-model="search"
              placeholder="Cari nama, kabupaten, provinsi..."
              class="flex-1 min-w-[160px] max-w-sm"
            />
            <UiSelect v-model="pageSize" class="!w-auto" @change="page = 1">
              <option :value="10">10 / halaman</option>
              <option :value="25">25 / halaman</option>
              <option :value="50">50 / halaman</option>
            </UiSelect>
          </div>
        </template>

        <!-- Table -->
        <UiTable>
            <thead>
              <tr>
                <th>Nama Wilayah</th>
                <th>Kabupaten/Kota & Provinsi</th>
                <th class="hidden sm:table-cell">Koordinat</th>
                <th class="ui-th-right"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              <!-- Skeleton -->
              <tr v-if="showSkeleton" v-for="i in 5" :key="`skel-${i}`">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="soft-skel w-8 h-8 rounded-lg shrink-0" />
                    <div class="soft-skel h-4 w-36" />
                  </div>
                </td>
                <td>
                  <div class="soft-skel h-4 w-32 mb-1.5" />
                  <div class="soft-skel h-3 w-24" />
                </td>
                <td class="hidden sm:table-cell"><div class="soft-skel h-4 w-28" /></td>
                <td class="ui-td-right"><div class="soft-skel h-8 rounded-lg w-8 ml-auto" /></td>
              </tr>

              <!-- Empty -->
              <tr v-else-if="!paginated.length">
                <td colspan="4">
                  <UiEmptyState title="Belum ada wilayah" description="Tambah wilayah untuk mengaktifkan layanan darurat di area tersebut.">
                    <template #icon>
                      <Icon icon="lucide:map-pin-off" class="text-neutral-400 text-2xl" />
                    </template>
                    <UiButton variant="secondary" @click="showCreate = true">
                      <Icon icon="lucide:plus" class="text-sm" />
                      Tambah Wilayah
                    </UiButton>
                  </UiEmptyState>
                </td>
              </tr>

              <!-- Data rows -->
              <tr v-else v-for="region in paginated" :key="region.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Icon icon="lucide:map-pin" class="text-emerald-600 text-sm" />
                    </div>
                    <span class="ui-cell-title">{{ region.name }}</span>
                  </div>
                </td>
                <td>
                  <p class="ui-cell-title">{{ region.regency || '—' }}</p>
                  <p class="ui-cell-desc">{{ region.province || '' }}</p>
                </td>
                <td class="hidden sm:table-cell">
                  <span v-if="region.latitude && region.longitude" class="ui-cell-mono text-xs">
                    {{ Number(region.latitude).toFixed(4) }}, {{ Number(region.longitude).toFixed(4) }}
                  </span>
                  <span v-else class="text-sm text-neutral-300">—</span>
                </td>
                <td class="ui-td-right">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-neutral-700 bg-white rounded-lg shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-colors"
                    @click.stop="toggleDropdown(region, $event)"
                  >
                    Aksi
                    <Icon icon="lucide:chevron-down" class="text-sm text-neutral-500" />
                  </button>
                </td>
              </tr>
            </tbody>
        </UiTable>

        <template v-if="filtered.length" #footer>
          <UiPagination
            v-model:page="page"
            :total-pages="totalPages"
            :total="filtered.length"
            :page-size="pageSize"
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

    <!-- Create modal -->
    <UiModal v-model:open="showCreate" title="Tambah Wilayah Tercakup" description="Wilayah yang ditambahkan akan tersedia untuk deteksi layanan darurat.">
      <template #trigger><span /></template>
      <RegionForm :form="createForm" />
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showCreate = false">Batal</UiButton>
        <UiButton size="sm" :loading="creating" :disabled="!createForm.name || !createForm.regency_id" @click="submitCreate">
          Simpan
        </UiButton>
      </template>
    </UiModal>

    <!-- Edit modal -->
    <UiModal v-model:open="showEdit" title="Edit Wilayah" description="Ubah data wilayah tercakup.">
      <template #trigger><span /></template>
      <RegionForm :form="editForm" />
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showEdit = false">Batal</UiButton>
        <UiButton size="sm" :loading="editing" :disabled="!editForm.name || !editForm.regency_id" @click="submitEdit">
          Simpan Perubahan
        </UiButton>
      </template>
    </UiModal>

    <!-- Delete confirm modal -->
    <UiModal v-model:open="showDeleteConfirm" title="Hapus Wilayah" description="Tindakan ini tidak dapat dibatalkan.">
      <template #trigger><span /></template>
      <p class="text-sm text-neutral-600">
        Apakah kamu yakin ingin menghapus wilayah <span class="font-semibold">{{ deleteTarget?.name }}</span>?
      </p>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showDeleteConfirm = false">Batal</UiButton>
        <UiButton variant="danger" size="sm" :loading="!!deletingId" @click="executeDelete">
          <Icon icon="lucide:trash-2" class="text-sm" />
          Hapus
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
