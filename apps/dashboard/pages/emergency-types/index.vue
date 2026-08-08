<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Jenis Layanan" });

const { get, post, put, del } = useApi();

const { data, refresh } = await useAsyncData("types-manage", () =>
  get<{ data: any[] }>("/api/v1/emergency/type")
);
const { data: emergencies } = await useAsyncData("emergencies-for-types", () =>
  get<{ data: any[] }>("/api/v1/emergency/")
);

const search = ref("");
const page = ref(1);
const pageSize = 8;

const filtered = computed(() => {
  const list = data.value?.data ?? [];
  if (!search.value) return list;
  const q = search.value.toLowerCase();
  return list.filter((t: any) => t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
});

watch(search, () => { page.value = 1; });

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});

function countForType(typeName: string) {
  return (emergencies.value?.data ?? []).filter((e: any) => e.emergency_type?.name === typeName).length;
}

const typeConfig: Record<string, { bg: string; icon: string }> = {
  Ambulance: { bg: "bg-red-50", icon: "lucide:ambulance" },
  Damkar: { bg: "bg-orange-50", icon: "lucide:flame" },
  "Rumah Sakit": { bg: "bg-blue-50", icon: "lucide:hospital" },
  SAR: { bg: "bg-green-50", icon: "lucide:life-buoy" },
};
function typeStyle(name: string) {
  return typeConfig[name] ?? { bg: "bg-neutral-50", icon: "lucide:tag" };
}

// ── Create ──────────────────────────────────────────────────────────────────
const showCreate = ref(false);
const creating = ref(false);
const createForm = reactive({ name: "", icon: "", description: "" });

async function submitCreate() {
  if (!createForm.name || !createForm.icon) return;
  creating.value = true;
  try {
    await post("/api/v1/emergency/type", { name: createForm.name, icon: createForm.icon, description: createForm.description });
    showCreate.value = false;
    Object.assign(createForm, { name: "", icon: "", description: "" });
    await refresh();
  } finally {
    creating.value = false;
  }
}

// ── Edit ─────────────────────────────────────────────────────────────────────
const showEdit = ref(false);
const editing = ref(false);
const editTarget = ref<any>(null);
const editForm = reactive({ name: "", icon: "", description: "" });

function openEdit(type: any) {
  editTarget.value = type;
  Object.assign(editForm, { name: type.name ?? "", icon: type.icon ?? "", description: type.description ?? "" });
  showEdit.value = true;
}

async function submitEdit() {
  if (!editTarget.value || !editForm.name || !editForm.icon) return;
  editing.value = true;
  try {
    await put(`/api/v1/emergency/type/${editTarget.value.id}`, {
      name: editForm.name, icon: editForm.icon, description: editForm.description,
    });
    showEdit.value = false;
    await refresh();
  } finally {
    editing.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deletingId = ref<number | null>(null);

async function deleteType(id: number, name: string) {
  if (!confirm(`Hapus jenis "${name}"?`)) return;
  deletingId.value = id;
  try {
    await del(`/api/v1/emergency/type/${id}`);
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
          <h1 class="text-lg font-semibold text-neutral-900">Jenis Layanan</h1>
          <p class="text-sm text-neutral-500 mt-0.5">{{ filtered.length }} jenis terdaftar</p>
        </div>
        <UiButton size="sm" @click="showCreate = true">
          <Icon icon="lucide:plus" class="text-sm" />
          <span class="hidden sm:inline">Tambah Jenis</span>
        </UiButton>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="bg-white border-b border-neutral-100 px-4 sm:px-6 py-3">
      <div class="relative max-w-xs">
        <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari jenis layanan..."
          class="w-full pl-8 pr-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 sm:p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="type in paginated"
          :key="type.id"
          class="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col gap-4 hover:border-neutral-300 transition-colors"
        >
          <div class="flex items-start gap-3">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', typeStyle(type.name).bg]">
              <Icon :icon="typeStyle(type.name).icon" class="text-lg text-neutral-600" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-neutral-900 text-sm">{{ type.name }}</p>
              <p class="text-xs text-neutral-400 mt-0.5 truncate">{{ type.icon }}</p>
            </div>
          </div>

          <div class="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-lg">
            <span class="text-xs text-neutral-500">Layanan aktif</span>
            <span class="text-sm font-bold text-neutral-900">{{ countForType(type.name) }}</span>
          </div>

          <p v-if="type.description" class="text-xs text-neutral-500 line-clamp-2 -mt-1">{{ type.description }}</p>

          <div class="flex justify-end gap-2 border-t border-neutral-100 pt-3">
            <UiButton variant="secondary" size="sm" @click="openEdit(type)">
              <Icon icon="lucide:pencil" class="text-xs" />
              Edit
            </UiButton>
            <UiButton
              variant="danger"
              size="sm"
              :loading="deletingId === type.id"
              @click="deleteType(type.id, type.name)"
            >
              <Icon icon="lucide:trash-2" class="text-xs" />
              Hapus
            </UiButton>
          </div>
        </div>

        <div v-if="!filtered.length" class="col-span-full py-16 flex flex-col items-center gap-3 text-center">
          <div class="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
            <Icon icon="lucide:tag" class="text-neutral-400 text-xl" />
          </div>
          <p class="text-sm text-neutral-500">Belum ada jenis layanan</p>
          <UiButton size="sm" variant="secondary" @click="showCreate = true">
            <Icon icon="lucide:plus" class="text-sm" />
            Tambah Jenis Pertama
          </UiButton>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-1">
        <button
          :disabled="page <= 1"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-white border border-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          @click="page--"
        >
          <Icon icon="lucide:chevron-left" class="text-sm" />
        </button>
        <span class="text-sm text-neutral-600 px-3">{{ page }} / {{ totalPages }}</span>
        <button
          :disabled="page >= totalPages"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-white border border-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          @click="page++"
        >
          <Icon icon="lucide:chevron-right" class="text-sm" />
        </button>
      </div>
    </div>

    <!-- Create modal -->
    <UiModal v-model:open="showCreate" title="Tambah Jenis Layanan" description="Buat kategori baru untuk layanan darurat.">
      <template #trigger><span /></template>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Nama <span class="text-emergency-600">*</span></label>
          <input v-model="createForm.name" type="text" placeholder="mis. Ambulance" class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Icon <span class="text-emergency-600">*</span></label>
          <input v-model="createForm.icon" type="text" placeholder="mis. mdi:ambulance" class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          <p class="mt-1.5 text-xs text-neutral-400">Format iconify string, mis. <code class="bg-neutral-100 px-1 rounded">mdi:ambulance</code></p>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Deskripsi</label>
          <textarea v-model="createForm.description" rows="2" placeholder="Deskripsi singkat..." class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showCreate = false">Batal</UiButton>
        <UiButton size="sm" :loading="creating" :disabled="!createForm.name || !createForm.icon" @click="submitCreate">Simpan</UiButton>
      </template>
    </UiModal>

    <!-- Edit modal -->
    <UiModal v-model:open="showEdit" title="Edit Jenis Layanan" description="Ubah data kategori layanan darurat.">
      <template #trigger><span /></template>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Nama <span class="text-emergency-600">*</span></label>
          <input v-model="editForm.name" type="text" class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Icon <span class="text-emergency-600">*</span></label>
          <input v-model="editForm.icon" type="text" class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1.5">Deskripsi</label>
          <textarea v-model="editForm.description" rows="2" class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showEdit = false">Batal</UiButton>
        <UiButton size="sm" :loading="editing" :disabled="!editForm.name || !editForm.icon" @click="submitEdit">Simpan Perubahan</UiButton>
      </template>
    </UiModal>
  </div>
</template>
