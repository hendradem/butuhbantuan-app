<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";

const props = withDefaults(
  defineProps<{
    mode?: "admin" | "unit";
    lockedRegencyId?: string;
    lockedRegencyName?: string;
    lockedProvinceId?: string;
  }>(),
  { mode: "admin" },
);

const { get, authGet, post } = useApi();
const { unitHeaders } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

const apiRoot = computed(() =>
  props.mode === "unit" ? "/api/v1/unit/hospitals" : "/api/v1/admin/hospitals",
);

async function apiGet<T>(path: string): Promise<T> {
  if (props.mode === "unit") {
    const res = await $fetch<{ data: T }>(`${baseUrl}${apiRoot.value}${path}`, {
      headers: unitHeaders(),
    });
    return res.data;
  }
  const res = await authGet<{ data: T }>(`${apiRoot.value}${path}`);
  return res.data;
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (props.mode === "unit") {
    const res = await $fetch<{ data: T }>(`${baseUrl}${apiRoot.value}${path}`, {
      method: "POST",
      headers: { ...unitHeaders(), "Content-Type": "application/json" },
      body,
    });
    return res.data;
  }
  const res = await post<{ data: T }>(`${apiRoot.value}${path}`, body);
  return res.data;
}

function errMsg(e: any, fallback: string) {
  return e?.data?.message || e?.data?.error || e?.message || fallback;
}

const provider = ref("");
const provinces = ref<{ id: string; name: string }[]>([]);
const regencies = ref<{ id: string; name: string }[]>([]);
const provinceId = ref("");
const regencyId = ref("");
const items = ref<any[]>([]);
const selected = ref<Set<string>>(new Set());
const syncing = ref(false);
const importing = ref(false);
const loadingList = ref(false);
const activateOnImport = ref(false);
const loadError = ref("");

const selectedCount = computed(() => selected.value.size);
const importable = computed(() => items.value.filter((i) => !i.already_imported));

const provinceOptions = computed(() => [
  { value: "", label: "Pilih provinsi" },
  ...provinces.value.map((p) => ({ value: p.id, label: p.name })),
]);

const regencyOptions = computed(() => [
  { value: "", label: provinceId.value ? "Pilih kabupaten" : "Pilih provinsi dulu" },
  ...regencies.value.map((r) => ({ value: r.id, label: r.name })),
]);

onMounted(async () => {
  try {
    const p = await apiGet<{ provider: string }>("/provider");
    provider.value = p?.provider || "";
  } catch (e: any) {
    provider.value = "";
    loadError.value = errMsg(e, "Gagal memuat provider RS (cek login admin / API)");
  }

  if (props.mode === "unit" && props.lockedRegencyId) {
    regencyId.value = props.lockedRegencyId;
    if (props.lockedProvinceId) provinceId.value = props.lockedProvinceId;
    await loadCached();
    return;
  }

  try {
    const res = await get<{ data: any[] }>("/api/v1/service/province");
    provinces.value = (res.data ?? []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
    }));
    if (!provinces.value.length) {
      loadError.value = "Daftar provinsi kosong — pastikan wilayah sudah di-seed di API.";
    }
  } catch (e: any) {
    provinces.value = [];
    loadError.value = errMsg(e, "Gagal memuat daftar provinsi");
  }
});

watch(provinceId, async (id) => {
  if (props.mode === "unit" && props.lockedRegencyId) return;
  regencyId.value = "";
  items.value = [];
  selected.value = new Set();
  if (!id) {
    regencies.value = [];
    return;
  }
  try {
    const res = await get<{ data: any[] }>(`/api/v1/service/regency?province_id=${id}`);
    regencies.value = (res.data ?? []).map((r: any) => ({
      id: String(r.id),
      name: r.name,
    }));
  } catch {
    regencies.value = [];
  }
});

watch(regencyId, async (id) => {
  selected.value = new Set();
  if (!id) {
    items.value = [];
    return;
  }
  if (props.mode === "admin") await loadCached();
});

async function loadCached() {
  if (!regencyId.value) return;
  loadingList.value = true;
  try {
    items.value =
      (await apiGet<any[]>(`/master?regency_id=${encodeURIComponent(regencyId.value)}`)) || [];
  } catch (e: any) {
    items.value = [];
    toast.error(errMsg(e, "Gagal memuat master RS"));
  } finally {
    loadingList.value = false;
  }
}

async function syncRegency() {
  if (!regencyId.value) {
    toast.error("Pilih kabupaten dulu");
    return;
  }
  syncing.value = true;
  try {
    const data = await apiPost<any>("/sync", { regency_id: regencyId.value });
    items.value = data?.items ?? [];
    selected.value = new Set();
    const fetched = data?.fetched ?? 0;
    if (fetched === 0) {
      toast(`Sync ${data?.source || "provider"}: 0 RS ditemukan — pastikan SATUSEHAT dikonfigurasi atau tambah data stub`);
    } else {
      toast.success(`Sync ${data?.source || "provider"}: ${fetched} RS`);
    }
  } catch (e: any) {
    toast.error(errMsg(e, "Gagal sync RS"));
  } finally {
    syncing.value = false;
  }
}

function toggle(id: string) {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}

function selectAllImportable() {
  selected.value = new Set(importable.value.map((i) => i.id));
}

function clearSelection() {
  selected.value = new Set();
}

async function importSelected() {
  if (!selected.value.size) {
    toast.error("Pilih minimal 1 RS");
    return;
  }
  importing.value = true;
  try {
    const data = await apiPost<any>("/import", {
      master_ids: [...selected.value],
      partner_tier: "community",
      is_active: activateOnImport.value,
    });
    toast.success(
      `Import selesai · baru ${data?.imported ?? 0}, skip ${data?.skipped ?? 0}, gagal ${data?.failed ?? 0}`,
    );
    if (data?.errors?.length) toast.error(String(data.errors[0]));
    selected.value = new Set();
    await loadCached();
  } catch (e: any) {
    toast.error(errMsg(e, "Gagal import RS"));
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="loadError"
      class="rounded-xl bg-red-50 text-red-800 text-sm px-4 py-3 ring-1 ring-red-100"
    >
      {{ loadError }}
    </div>

    <UiCard
      title="Import Rumah Sakit"
      description="Sync master per kabupaten, lalu pilih RS yang ingin dijadikan unit mitra."
      shadow
    >
      <template #actions>
        <UiBadge v-if="provider" variant="neutral">
          <Icon icon="lucide:database" class="text-xs" />
          {{ provider }}
        </UiBadge>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <template v-if="mode === 'admin'">
          <UiFormField label="Provinsi" required>
            <UiSelect
              v-model="provinceId"
              placeholder="Pilih provinsi"
              :options="provinceOptions"
              searchable
            />
          </UiFormField>
          <UiFormField label="Kabupaten / Kota" required>
            <UiSelect
              v-model="regencyId"
              placeholder="Pilih kabupaten"
              :options="regencyOptions"
              :disabled="!provinceId"
              searchable
            />
          </UiFormField>
        </template>
        <template v-else>
          <div class="sm:col-span-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700 border border-neutral-200">
            Wilayah unit:
            <span class="font-semibold">{{ lockedRegencyName || lockedRegencyId || "—" }}</span>
          </div>
        </template>
        <div class="flex items-end">
          <UiButton
            class="w-full"
            :loading="syncing"
            :disabled="!regencyId || syncing"
            @click="syncRegency"
          >
            <Icon v-if="!syncing" icon="lucide:refresh-cw" class="text-sm" />
            {{ syncing ? "Menyinkron…" : "Sync kabupaten" }}
          </UiButton>
        </div>
      </div>
    </UiCard>

    <UiCard padding="none" shadow>
      <div class="px-4 sm:px-5 py-3 border-b border-neutral-200 flex flex-wrap items-center gap-2 justify-between">
        <div class="text-sm text-neutral-600">
          <span class="font-semibold text-neutral-900">{{ items.length }}</span> RS di cache ·
          <span class="font-semibold text-neutral-900">{{ selectedCount }}</span> dipilih
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UiButton variant="tertiary" size="xs" @click="selectAllImportable">
            Pilih semua baru
          </UiButton>
          <UiButton variant="tertiary" size="xs" @click="clearSelection">
            Bersihkan
          </UiButton>
          <label class="inline-flex items-center gap-1.5 text-xs text-neutral-600 px-1">
            <input v-model="activateOnImport" type="checkbox" class="rounded border-neutral-300" />
            Aktifkan langsung
          </label>
          <UiButton
            size="sm"
            :loading="importing"
            :disabled="!selectedCount || importing"
            @click="importSelected"
          >
            <Icon v-if="!importing" icon="lucide:download" class="text-sm" />
            Import terpilih
          </UiButton>
        </div>
      </div>

      <div v-if="loadingList" class="p-6 space-y-2">
        <div v-for="i in 4" :key="i" class="soft-skel h-12 rounded-xl" />
      </div>
      <UiEmptyState
        v-else-if="!regencyId"
        title="Belum pilih kabupaten"
        description="Pilih kabupaten lalu sync untuk melihat daftar RS."
      />
      <UiEmptyState
        v-else-if="!items.length"
        title="Belum ada data cache"
        description="Klik Sync kabupaten untuk menarik master RS."
      />
      <ul v-else class="divide-y divide-neutral-100 max-h-[28rem] overflow-y-auto">
        <li
          v-for="row in items"
          :key="row.id"
          class="px-4 sm:px-5 py-3 flex items-start gap-3 hover:bg-neutral-50/80"
        >
          <input
            type="checkbox"
            class="mt-1 rounded border-neutral-300"
            :disabled="row.already_imported"
            :checked="selected.has(row.id)"
            @change="toggle(row.id)"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-semibold text-neutral-900 truncate">{{ row.name }}</p>
              <UiBadge v-if="row.already_imported" variant="success">Sudah diimpor</UiBadge>
              <UiBadge v-if="row.class" variant="neutral">Kelas {{ row.class }}</UiBadge>
            </div>
            <p class="mt-0.5 text-xs text-neutral-500 line-clamp-2">{{ row.address || "—" }}</p>
            <p v-if="row.phone" class="mt-0.5 text-xs text-neutral-500">{{ row.phone }}</p>
          </div>
        </li>
      </ul>
    </UiCard>
  </div>
</template>
