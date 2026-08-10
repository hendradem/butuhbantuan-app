<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Alert SOS" });

const { authGet } = useApi();
const search = ref("");
const page = ref(1);
const pageSize = ref(20);

const { data, pending, refresh } = await useAsyncData("sos-alerts", () =>
  authGet<{ data: any[] }>("/api/v1/sos/"),
  { server: false }
);

watch(search, () => { page.value = 1; });

const alerts = computed(() => data.value?.data ?? []);

const filtered = computed(() => {
  if (!search.value) return alerts.value;
  const q = search.value.toLowerCase();
  return alerts.value.filter(
    (s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.ticket_number?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
  );
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// ── Detail ────────────────────────────────────────────────────────────────────
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
</script>

<template>
  <div>
    <div v-if="dropdownItem" class="fixed inset-0 z-[98]" @click="dropdownItem = null" />

    <!-- Page header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-neutral-900">Alert SOS</h1>
          <p class="text-sm text-neutral-500 mt-0.5">
            <span v-if="pending">Memuat...</span>
            <span v-else>{{ filtered.length }} dari {{ alerts.length }} alert masuk</span>
          </p>
        </div>
        <UiButton variant="secondary" @click="refresh()">
          <Icon icon="lucide:refresh-cw" class="text-sm" />
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Table card -->
    <div class="p-4 sm:p-6">
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">

        <!-- Toolbar -->
        <div class="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3 border-b border-neutral-200">
          <div class="relative flex-1 min-w-[160px] max-w-sm">
            <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none" />
            <UiInput v-model="search" placeholder="Cari nama, telepon, tiket, alamat..." class="pl-9" />
          </div>
          <UiSelect v-model="pageSize" class="!w-auto" @change="page = 1">
            <option :value="20">20 / halaman</option>
            <option :value="50">50 / halaman</option>
          </UiSelect>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                <th class="px-6 py-4 text-left">Pelapor</th>
                <th class="px-6 py-4 text-left hidden md:table-cell">Waktu</th>
                <th class="px-6 py-4 text-left hidden lg:table-cell">Alamat</th>
                <th class="px-6 py-4 text-left hidden sm:table-cell">No. Tiket</th>
                <th class="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <!-- Skeleton -->
              <tr v-if="pending" v-for="i in 5" :key="`skel-${i}`" class="animate-pulse">
                <td class="px-6 py-4"><div class="h-4 bg-neutral-200 rounded w-36 mb-2" /><div class="h-3 bg-neutral-100 rounded w-24" /></td>
                <td class="px-6 py-4 hidden md:table-cell"><div class="h-4 bg-neutral-100 rounded w-28" /></td>
                <td class="px-6 py-4 hidden lg:table-cell"><div class="h-4 bg-neutral-100 rounded w-40" /></td>
                <td class="px-6 py-4 hidden sm:table-cell"><div class="h-5 bg-neutral-100 rounded w-32" /></td>
                <td class="px-6 py-4"><div class="h-9 bg-neutral-100 rounded-lg w-24 ml-auto" /></td>
              </tr>

              <!-- Empty -->
              <tr v-else-if="!paginated.length">
                <td colspan="5">
                  <UiEmptyState title="Tidak ada alert SOS" description="Alert SOS akan muncul di sini saat warga mengirimkan permintaan darurat.">
                    <template #icon>
                      <Icon icon="lucide:siren" class="text-neutral-400 text-2xl" />
                    </template>
                  </UiEmptyState>
                </td>
              </tr>

              <!-- Data rows -->
              <tr v-else v-for="item in paginated" :key="item.id" class="hover:bg-neutral-50 transition-colors">
                <!-- Pelapor -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-emergency-100 flex items-center justify-center shrink-0">
                      <Icon icon="lucide:siren" class="text-emergency-600 text-base" />
                    </div>
                    <div>
                      <p class="font-semibold text-neutral-900">{{ item.name || '—' }}</p>
                      <p class="text-xs text-neutral-400 mt-0.5">{{ item.phone || '—' }}</p>
                    </div>
                  </div>
                </td>

                <!-- Waktu -->
                <td class="px-6 py-4 hidden md:table-cell">
                  <p class="text-sm text-neutral-700">{{ formatDate(item.created_at) }}</p>
                </td>

                <!-- Alamat -->
                <td class="px-6 py-4 hidden lg:table-cell max-w-xs">
                  <p class="text-sm text-neutral-600 line-clamp-2">{{ item.address || '—' }}</p>
                </td>

                <!-- Tiket -->
                <td class="px-6 py-4 hidden sm:table-cell">
                  <span v-if="item.ticket_number" class="font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded">
                    {{ item.ticket_number }}
                  </span>
                  <span v-else class="text-xs text-neutral-400">Belum di-dispatch</span>
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
          <UiPagination v-model:page="page" :total-pages="totalPages" :total="filtered.length" :page-size="pageSize" />
        </div>
      </div>
    </div>

    <!-- Row dropdown -->
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
        <a
          v-if="dropdownItem.lat && dropdownItem.lng"
          :href="mapsUrl(dropdownItem.lat, dropdownItem.lng)"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="dropdownItem = null"
        >
          <Icon icon="lucide:map-pin" class="text-neutral-500 text-base shrink-0" />
          Lihat di Maps
        </a>
        <NuxtLink
          v-if="dropdownItem.ticket_number"
          :to="`/orders?search=${dropdownItem.ticket_number}`"
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="dropdownItem = null"
        >
          <Icon icon="lucide:clipboard-list" class="text-neutral-500 text-base shrink-0" />
          Lihat Pesanan
        </NuxtLink>
      </div>
    </Teleport>

    <!-- Detail modal -->
    <UiModal v-model:open="showDetail" title="Detail Alert SOS" description="Informasi lengkap alert darurat.">
      <template #trigger><span /></template>
      <div v-if="detailItem" class="space-y-4">
        <!-- Identity -->
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-emergency-100 flex items-center justify-center shrink-0">
            <Icon icon="lucide:siren" class="text-emergency-600 text-xl" />
          </div>
          <div>
            <p class="font-semibold text-neutral-900 text-base">{{ detailItem.name || 'Tanpa Nama' }}</p>
            <p class="text-sm text-neutral-500">{{ detailItem.phone }}</p>
            <p class="text-xs text-neutral-400 mt-0.5">{{ formatDate(detailItem.created_at) }}</p>
          </div>
        </div>

        <!-- Info blocks -->
        <div class="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
          <div v-if="detailItem.description" class="px-4 py-3">
            <p class="text-xs text-neutral-400 mb-1">Deskripsi Kondisi</p>
            <p class="text-sm text-neutral-800">{{ detailItem.description }}</p>
          </div>
          <div class="px-4 py-3">
            <p class="text-xs text-neutral-400 mb-1">Lokasi</p>
            <p class="text-sm text-neutral-800">{{ detailItem.address || '—' }}</p>
            <a
              v-if="detailItem.lat && detailItem.lng"
              :href="mapsUrl(detailItem.lat, detailItem.lng)"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mt-1 transition-colors"
            >
              <Icon icon="lucide:locate" class="text-xs" />
              Buka di Google Maps
            </a>
          </div>
          <div class="px-4 py-3">
            <p class="text-xs text-neutral-400 mb-1">No. Tiket</p>
            <span v-if="detailItem.ticket_number" class="font-mono text-sm font-semibold text-primary-700">{{ detailItem.ticket_number }}</span>
            <span v-else class="text-sm text-neutral-400">Belum di-dispatch</span>
          </div>
        </div>

        <!-- Photo -->
        <div v-if="detailItem.photo_url">
          <p class="text-xs text-neutral-400 mb-2">Foto</p>
          <img :src="detailItem.photo_url" alt="Foto SOS" class="w-full rounded-xl max-h-48 object-cover" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showDetail = false">Tutup</UiButton>
        <NuxtLink
          v-if="detailItem?.ticket_number"
          :to="`/orders?search=${detailItem.ticket_number}`"
          @click="showDetail = false"
        >
          <UiButton size="sm">
            <Icon icon="lucide:clipboard-list" class="text-sm" />
            Lihat Pesanan
          </UiButton>
        </NuxtLink>
      </template>
    </UiModal>
  </div>
</template>
