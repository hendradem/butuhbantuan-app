<script setup lang="ts">
/**
 * "Request" tab body on /emergencies — inbound partner submissions waiting for
 * review. Read-only here; every decision happens in the detail modal.
 */
import { Icon } from "@iconify/vue";
import { timeAgo } from "@butuhbantuan/utils";
import {
  PARTNER_REQUEST_STATUS_OPTIONS,
  partnerRequestIsOpen,
  partnerRequestStatusClass,
  partnerRequestStatusLabel,
} from "~/utils/partnerRequest";

const props = defineProps<{
  requests: any[];
  loading?: boolean;
}>();

const emit = defineEmits<{ refresh: [] }>();

const search = ref("");
const statusFilter = ref("");
const page = ref(1);
const pageSize = ref(10);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return props.requests.filter((r) => {
    if (statusFilter.value && String(r.status) !== statusFilter.value) return false;
    if (!q) return true;
    const p = r.payload ?? {};
    return [
      p.name,
      p.organization_name,
      p.organization_type,
      p.contact?.phone,
      p.contact?.whatsapp,
      p.contact?.email,
      p.address?.regency,
      p.address?.province,
    ]
      .filter(Boolean)
      .some((v: string) => String(v).toLowerCase().includes(q));
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paginated = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);

watch([search, statusFilter], () => (page.value = 1));
watch(totalPages, (max) => {
  if (page.value > max) page.value = max;
});

const detailOpen = ref(false);
const selected = ref<any | null>(null);

function review(request: any) {
  selected.value = request;
  detailOpen.value = true;
}

function wilayah(request: any): string {
  const a = request?.payload?.address ?? {};
  return [a.regency, a.province].filter(Boolean).join(", ") || "—";
}

function contactLine(request: any): string {
  const c = request?.payload?.contact ?? {};
  return c.whatsapp || c.phone || c.email || "—";
}

function submittedAt(request: any): string {
  return request?.created_at ? timeAgo(request.created_at) : "—";
}
</script>

<template>
  <UiTableCard
    title="Permintaan mitra"
    :badge="filtered.length"
    description="Pendaftaran unit baru dari halaman publik, menunggu verifikasi"
  >
    <template #actions>
      <UiSearchInput v-model="search" placeholder="Cari unit atau kontak…" class="w-40 shrink-0" />
      <UiSelect v-model="statusFilter" class="!w-auto shrink-0">
        <option v-for="s in PARTNER_REQUEST_STATUS_OPTIONS" :key="s.value" :value="s.value">
          {{ s.label }}
        </option>
      </UiSelect>
    </template>

    <UiTable min-width="56rem">
      <thead>
        <tr>
          <th>Layanan</th>
          <th class="hidden sm:table-cell">Jenis</th>
          <th class="hidden lg:table-cell">Wilayah</th>
          <th class="hidden md:table-cell">Kontak</th>
          <th class="hidden xl:table-cell">Dikirim</th>
          <th>Status</th>
          <th class="ui-th-right w-24"><span class="sr-only">Aksi</span></th>
        </tr>
      </thead>
      <tbody>
        <!-- Skeleton -->
        <tr v-if="loading" v-for="i in 4" :key="`skel-${i}`">
          <td>
            <div class="space-y-1.5">
              <div class="soft-skel h-3.5 w-40" />
              <div class="soft-skel h-3 w-28" />
            </div>
          </td>
          <td class="hidden sm:table-cell"><div class="soft-skel h-5 rounded-full w-20" /></td>
          <td class="hidden lg:table-cell"><div class="soft-skel h-3.5 w-28" /></td>
          <td class="hidden md:table-cell"><div class="soft-skel h-3.5 w-24" /></td>
          <td class="hidden xl:table-cell"><div class="soft-skel h-3.5 w-16" /></td>
          <td><div class="soft-skel h-5 rounded-full w-24" /></td>
          <td class="ui-td-right"><div class="soft-skel h-8 rounded-lg w-16 ml-auto" /></td>
        </tr>

        <!-- Empty -->
        <tr v-else-if="!paginated.length">
          <td colspan="7">
            <UiEmptyState
              :title="requests.length ? 'Tidak ada permintaan yang cocok' : 'Belum ada permintaan mitra'"
            >
              <template #icon>
                <Icon :icon="requests.length ? 'lucide:search-x' : 'lucide:inbox'" class="text-neutral-400 text-2xl" />
              </template>
            </UiEmptyState>
          </td>
        </tr>

        <!-- Rows -->
        <tr v-else v-for="r in paginated" :key="r.id" class="cursor-pointer" @click="review(r)">
          <td>
            <p class="truncate max-w-[16rem] text-sm font-medium text-neutral-900">
              {{ r.payload?.name || "Tanpa nama" }}
            </p>
            <p v-if="r.payload?.organization_name" class="truncate max-w-[16rem] text-xs text-neutral-500">
              {{ r.payload.organization_name }}
            </p>
          </td>
          <td class="hidden sm:table-cell">
            <span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
              {{ r.payload?.emergency_type?.name || "—" }}
            </span>
          </td>
          <td class="hidden lg:table-cell">
            <p class="truncate max-w-[12rem] text-sm text-neutral-800">{{ wilayah(r) }}</p>
          </td>
          <td class="hidden md:table-cell">
            <p class="truncate max-w-[12rem] text-sm tabular-nums text-neutral-800">{{ contactLine(r) }}</p>
          </td>
          <td class="hidden xl:table-cell">
            <p class="text-sm text-neutral-600">{{ submittedAt(r) }}</p>
          </td>
          <td>
            <span
              :class="[
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                partnerRequestStatusClass(r.status),
              ]"
            >
              {{ partnerRequestStatusLabel(r.status) }}
            </span>
          </td>
          <td class="ui-td-right ui-td-actions !pr-3" @click.stop>
            <UiButton
              :variant="partnerRequestIsOpen(r.status) ? 'secondary' : 'ghost'"
              size="xs"
              @click="review(r)"
            >
              {{ partnerRequestIsOpen(r.status) ? "Tinjau" : "Lihat" }}
            </UiButton>
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
      />
    </template>
  </UiTableCard>

  <PartnerRequestDetailModal v-model:open="detailOpen" :request="selected" @changed="emit('refresh')" />
</template>
