<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Wilayah Tercakup" });

const { get, post, put, del } = useApi();
const search = ref("");
const page = ref(1);
const pageSize = ref(10);

const { data, refresh } = await useAsyncData("regions-manage", () =>
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

async function deleteRegion(id: string, name: string) {
  if (!confirm(`Hapus wilayah "${name}"?`)) return;
  deletingId.value = id;
  try {
    await del(`/api/v1/service/available-region/${id}`);
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
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-neutral-900">Wilayah Tercakup</h1>
          <p class="text-sm text-neutral-500 mt-0.5">{{ filtered.length }} wilayah aktif</p>
        </div>
        <UiButton size="sm" @click="showCreate = true">
          <Icon icon="lucide:plus" class="text-sm" />
          <span class="hidden sm:inline">Tambah Wilayah</span>
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
          placeholder="Cari wilayah..."
          class="w-full pl-8 pr-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors"
        />
      </div>
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
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Nama Wilayah</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Kabupaten/Kota</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Provinsi</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">ID BPS</th>
                <th class="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden xl:table-cell">Koordinat</th>
                <th class="px-4 sm:px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr v-if="!paginated.length">
                <td colspan="6" class="py-4">
                  <UiEmptyState title="Belum ada wilayah" description="Tambah wilayah untuk mengaktifkan layanan darurat di area tersebut.">
                    <template #icon>
                      <Icon icon="lucide:map-pin-off" class="text-neutral-400 text-2xl" />
                    </template>
                    <UiButton size="sm" variant="secondary" @click="showCreate = true">
                      <Icon icon="lucide:plus" class="text-sm" />
                      Tambah Wilayah
                    </UiButton>
                  </UiEmptyState>
                </td>
              </tr>
              <tr
                v-for="region in paginated"
                v-else
                :key="region.id"
                class="hover:bg-neutral-50 transition-colors"
              >
                <td class="px-4 sm:px-5 py-3.5">
                  <div class="flex items-center gap-2.5">
                    <div class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <div class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span class="font-medium text-neutral-900">{{ region.name }}</span>
                  </div>
                </td>
                <td class="px-4 sm:px-5 py-3.5 text-neutral-600 hidden md:table-cell">{{ region.regency || '—' }}</td>
                <td class="px-4 sm:px-5 py-3.5 text-neutral-600 hidden lg:table-cell">{{ region.province || '—' }}</td>
                <td class="px-4 sm:px-5 py-3.5 hidden sm:table-cell">
                  <code class="text-xs bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-neutral-700">
                    {{ region.regency_id || '—' }}
                  </code>
                </td>
                <td class="px-4 sm:px-5 py-3.5 text-xs text-neutral-400 font-mono hidden xl:table-cell">
                  {{ region.latitude ? `${Number(region.latitude).toFixed(4)}, ${Number(region.longitude).toFixed(4)}` : '—' }}
                </td>
                <td class="px-4 sm:px-5 py-3.5 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Edit"
                      @click="openEdit(region)"
                    >
                      <Icon icon="lucide:pencil" class="text-sm" />
                    </button>
                    <button
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-emergency-600 hover:bg-emergency-50 transition-colors"
                      title="Hapus"
                      :disabled="deletingId === region.id"
                      @click="deleteRegion(region.id, region.name)"
                    >
                      <UiSpinner v-if="deletingId === region.id" size="xs" class="text-emergency-500" />
                      <Icon v-else icon="lucide:trash-2" class="text-sm" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filtered.length" class="px-4 sm:px-5 py-3 border-t border-neutral-100 bg-neutral-50">
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
  </div>
</template>
