<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Wilayah Tercakup" });

const { get, post, put, del } = useApi();
const search = ref("");
const page = ref(1);
const pageSize = ref(10);

const { data, pending, refresh } = await useAsyncData("regions-manage", () =>
  get<{ data: any[] }>("/api/v1/service/available-region")
);

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
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right };
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
    await refresh();
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
    await refresh();
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
    await refresh();
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
          <h1 class="text-xl font-semibold text-neutral-900">Wilayah Tercakup</h1>
          <p class="text-sm text-neutral-500 mt-0.5">
            <span v-if="pending">Memuat...</span>
            <span v-else>{{ filtered.length }} dari {{ data?.data?.length ?? 0 }} wilayah terdaftar</span>
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
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">

        <!-- Toolbar inside card -->
        <div class="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3 border-b border-neutral-200">
          <div class="relative flex-1 min-w-[160px] max-w-sm">
            <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none" />
            <UiInput v-model="search" placeholder="Cari nama, kabupaten, provinsi..." class="pl-9" />
          </div>
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
                <th class="px-6 py-4 text-left">Nama Wilayah</th>
                <th class="px-6 py-4 text-left hidden md:table-cell">Kabupaten/Kota</th>
                <th class="px-6 py-4 text-left hidden lg:table-cell">Provinsi</th>
                <th class="px-6 py-4 text-left hidden sm:table-cell">ID BPS</th>
                <th class="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <!-- Skeleton -->
              <tr v-if="pending" v-for="i in 5" :key="`skel-${i}`" class="animate-pulse">
                <td class="px-6 py-4"><div class="h-4 bg-neutral-200 rounded w-40" /></td>
                <td class="px-6 py-4 hidden md:table-cell"><div class="h-4 bg-neutral-100 rounded w-28" /></td>
                <td class="px-6 py-4 hidden lg:table-cell"><div class="h-4 bg-neutral-100 rounded w-24" /></td>
                <td class="px-6 py-4 hidden sm:table-cell"><div class="h-5 bg-neutral-100 rounded w-16" /></td>
                <td class="px-6 py-4"><div class="h-9 bg-neutral-100 rounded-lg w-24 ml-auto" /></td>
              </tr>

              <!-- Empty -->
              <tr v-else-if="!paginated.length">
                <td colspan="5">
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
              <tr v-else v-for="region in paginated" :key="region.id" class="hover:bg-neutral-50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Icon icon="lucide:map-pin" class="text-emerald-600 text-sm" />
                    </div>
                    <span class="font-semibold text-neutral-900">{{ region.name }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 hidden md:table-cell">
                  <span class="text-sm text-neutral-700">{{ region.regency || '—' }}</span>
                </td>
                <td class="px-6 py-4 hidden lg:table-cell">
                  <span class="text-sm text-neutral-500">{{ region.province || '—' }}</span>
                </td>
                <td class="px-6 py-4 hidden sm:table-cell">
                  <code class="text-xs bg-neutral-100 px-2 py-1 rounded font-mono text-neutral-700">
                    {{ region.regency_id || '—' }}
                  </code>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-neutral-900 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-neutral-100 transition-colors"
                    @click.stop="toggleDropdown(region, $event)"
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
