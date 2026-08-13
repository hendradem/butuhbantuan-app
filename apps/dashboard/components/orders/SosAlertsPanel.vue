<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { placeAnchoredMenu } from "~/utils/placeAnchoredMenu";

/**
 * Log SOS warga — bukan antrian penanganan.
 * Penanganan dilakukan di tab Pesanan lewat tiket yang sudah di-dispatch.
 */
const props = defineProps<{
  /** Orders for joining status by ticket_number */
  orders?: any[];
}>();

const emit = defineEmits<{ "go-orders": [] }>();

function goToOrdersTab() {
  emit("go-orders");
}

const { authGet } = useApi();
const search = usePersistedQueryParam("bb-sos-q", "q", "", { syncQuery: false });
const focus = ref<"all" | "watch" | "done">("all");
const page = ref(1);
const pageSize = ref(20);

const { data, pending, refresh: refreshSos } = useAsyncData(
  "sos-alerts",
  () => authGet<{ data: any[] }>("/api/v1/sos/"),
  { server: false },
);

const refresh = useSoftRefresh(refreshSos);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

defineExpose({ refresh });

onActivated(() => {
  refreshSos();
});

watch([search, focus], () => {
  page.value = 1;
});

const alerts = computed(() => data.value?.data ?? []);

const orderByTicket = computed(() => {
  const m = new Map<string, any>();
  for (const o of props.orders ?? []) {
    if (o?.ticket_number) m.set(o.ticket_number, o);
  }
  return m;
});

function linkedOrder(sos: any) {
  if (!sos?.ticket_number) return null;
  return orderByTicket.value.get(sos.ticket_number) ?? null;
}

function needsWatch(sos: any) {
  const o = linkedOrder(sos);
  if (!sos.ticket_number) return true;
  if (!o) return true;
  return o.status === "pending" || o.status === "accepted" || o.status === "in_progress";
}

function isDone(sos: any) {
  const o = linkedOrder(sos);
  return !!o && (o.status === "completed" || o.status === "cancelled");
}

const filtered = computed(() => {
  let list = alerts.value;
  if (focus.value === "watch") list = list.filter(needsWatch);
  else if (focus.value === "done") list = list.filter(isDone);

  const q = search.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.ticket_number?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q),
  );
});

const focusCounts = computed(() => ({
  all: alerts.value.length,
  watch: alerts.value.filter(needsWatch).length,
  done: alerts.value.filter(isDone).length,
}));

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

const showDetail = ref(false);
const detailItem = ref<any>(null);
function openDetail(item: any) {
  detailItem.value = item;
  showDetail.value = true;
}

const dropdownItem = ref<any>(null);
const dropdownPos = ref({ top: 0, right: 0, openUp: false });
function toggleDropdown(item: any, event: MouseEvent) {
  if (dropdownItem.value?.id === item.id) {
    dropdownItem.value = null;
    return;
  }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  const pos = placeAnchoredMenu(rect, { menuHeight: 180, alignRight: true });
  dropdownPos.value = { top: pos.top, right: pos.right, openUp: pos.openUp };
  dropdownItem.value = item;
}
</script>

<template>
  <div class="space-y-3">
    <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
      <Icon icon="lucide:info" class="text-amber-700 text-base shrink-0 mt-0.5" />
      <div class="min-w-0 text-sm">
        <p class="font-semibold text-amber-900">Ini log SOS, bukan antrian penanganan</p>
        <p class="text-amber-800/80 mt-0.5 leading-relaxed">
          Setiap SOS otomatis jadi tiket di tab
          <button type="button" class="font-semibold underline underline-offset-2" @click="goToOrdersTab">
            Pesanan
          </button>.
          Pakai tab ini untuk jejak & pantau — aksi utama: buka tiket.
        </p>
      </div>
    </div>

    <div v-if="dropdownItem" class="fixed inset-0 z-[98]" @click="dropdownItem = null" />

    <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
      <div class="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-2.5 border-b border-neutral-200">
        <div class="flex gap-1 min-w-0 overflow-x-auto">
          <button
            v-for="opt in ([
              { id: 'all', label: 'Semua' },
              { id: 'watch', label: 'Perlu pantau' },
              { id: 'done', label: 'Selesai' },
            ] as const)"
            :key="opt.id"
            type="button"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
              focus === opt.id
                ? 'bg-primary-50 text-primary-700'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50',
            ]"
            @click="focus = opt.id"
          >
            {{ opt.label }}
            <span
              v-if="focusCounts[opt.id] > 0"
              :class="[
                'ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-bold',
                focus === opt.id ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-600',
              ]"
            >
              {{ focusCounts[opt.id] }}
            </span>
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2 ml-auto">
          <UiSearchInput
            v-model="search"
            placeholder="Cari nama, telepon, tiket…"
            class="w-[180px] sm:w-[240px]"
          />
          <UiButton
            variant="secondary"
            size="sm"
            :disabled="pending && !!data"
            @click="refresh()"
          >
            <Icon icon="lucide:refresh-cw" class="text-sm" :class="{ 'animate-spin': pending }" />
            Refresh
          </UiButton>
        </div>
      </div>

      <UiTable>
          <thead>
            <tr>
              <th>Pelapor</th>
              <th class="hidden md:table-cell">Waktu</th>
              <th class="hidden lg:table-cell">Lokasi</th>
              <th>Tiket / Status</th>
              <th class="ui-th-right"><span class="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="showSkeleton" v-for="i in 5" :key="`skel-${i}`">
              <td>
                <div class="flex items-center gap-3">
                  <div class="soft-skel w-9 h-9 rounded-full shrink-0" />
                  <div class="space-y-1.5">
                    <div class="soft-skel h-3.5 w-28" />
                    <div class="soft-skel h-3 w-20" />
                  </div>
                </div>
              </td>
              <td class="hidden md:table-cell"><div class="soft-skel h-4 w-28" /></td>
              <td class="hidden lg:table-cell"><div class="soft-skel h-4 w-40" /></td>
              <td><div class="soft-skel h-5 w-32" /></td>
              <td class="ui-td-right"><div class="soft-skel h-8 rounded-lg w-8 ml-auto" /></td>
            </tr>

            <tr v-else-if="!paginated.length">
              <td colspan="5">
                <UiEmptyState
                  title="Tidak ada log SOS"
                  description="SOS warga akan tercatat di sini setelah dikirim dari aplikasi."
                >
                  <template #icon>
                    <Icon icon="lucide:siren" class="text-neutral-400 text-2xl" />
                  </template>
                </UiEmptyState>
              </td>
            </tr>

            <tr
              v-else
              v-for="item in paginated"
              :key="item.id"
            >
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-emergency-100 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:siren" class="text-emergency-600 text-base" />
                  </div>
                  <div class="min-w-0">
                    <p class="ui-cell-title truncate">{{ item.name || "—" }}</p>
                    <p class="ui-cell-desc">{{ item.phone || "—" }}</p>
                  </div>
                </div>
              </td>
              <td class="hidden md:table-cell">
                <p class="ui-cell-title">{{ formatDate(item.created_at) }}</p>
              </td>
              <td class="hidden lg:table-cell max-w-xs">
                <p class="ui-cell-desc line-clamp-2">{{ item.address || "—" }}</p>
              </td>
              <td>
                <template v-if="item.ticket_number">
                  <NuxtLink
                    :to="`/orders/${item.ticket_number}`"
                    class="ui-cell-mono text-xs text-primary-700 hover:underline"
                  >
                    {{ item.ticket_number }}
                  </NuxtLink>
                  <div class="mt-1">
                    <UiStatusBadge
                      v-if="linkedOrder(item)"
                      :status="linkedOrder(item).status"
                    />
                    <span v-else class="ui-cell-desc">Tiket tidak ditemukan</span>
                  </div>
                </template>
                <span
                  v-else
                  class="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Belum jadi tiket
                </span>
              </td>
              <td class="ui-td-right">
                <div class="inline-flex items-center justify-end gap-2">
                  <NuxtLink
                    v-if="item.ticket_number"
                    :to="`/orders/${item.ticket_number}`"
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-neutral-700 bg-white rounded-lg shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-colors"
                  >
                    <Icon icon="lucide:external-link" class="text-sm text-neutral-500" />
                    Detail
                  </NuxtLink>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center w-9 h-9 text-neutral-600 bg-white rounded-lg shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-colors"
                    @click.stop="toggleDropdown(item, $event)"
                  >
                    <Icon icon="lucide:more-vertical" class="text-sm" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
      </UiTable>

      <div v-if="filtered.length" class="px-6 py-4 border-t border-neutral-200">
        <UiPagination
          v-model:page="page"
          :total-pages="totalPages"
          :total="filtered.length"
          :page-size="pageSize"
        />
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="dropdownItem"
        class="fixed z-[99] w-52 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden py-1"
        :style="{
          top: dropdownPos.top + 'px',
          right: dropdownPos.right + 'px',
          transform: dropdownPos.openUp ? 'translateY(-100%)' : undefined,
        }"
        @click.stop
      >
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="openDetail(dropdownItem); dropdownItem = null"
        >
          <Icon icon="lucide:info" class="text-neutral-500 text-base shrink-0" />
          Detail SOS
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
          :to="`/orders/${dropdownItem.ticket_number}`"
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="dropdownItem = null"
        >
          <Icon icon="lucide:clipboard-list" class="text-neutral-500 text-base shrink-0" />
          Buka pesanan
        </NuxtLink>
      </div>
    </Teleport>

    <UiModal
      v-model:open="showDetail"
      title="Detail Log SOS"
      description="Jejak permintaan darurat dari warga."
    >
      <template #trigger><span /></template>
      <div v-if="detailItem" class="space-y-4">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-emergency-100 flex items-center justify-center shrink-0">
            <Icon icon="lucide:siren" class="text-emergency-600 text-xl" />
          </div>
          <div>
            <p class="font-semibold text-neutral-900 text-base">{{ detailItem.name || "Tanpa Nama" }}</p>
            <p class="text-sm text-neutral-500">{{ detailItem.phone }}</p>
            <p class="text-xs text-neutral-400 mt-0.5">{{ formatDate(detailItem.created_at) }}</p>
          </div>
        </div>

        <div class="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
          <div v-if="detailItem.description" class="px-4 py-3">
            <p class="text-xs text-neutral-400 mb-1">Deskripsi Kondisi</p>
            <p class="text-sm text-neutral-800">{{ detailItem.description }}</p>
          </div>
          <div class="px-4 py-3">
            <p class="text-xs text-neutral-400 mb-1">Lokasi</p>
            <p class="text-sm text-neutral-800">{{ detailItem.address || "—" }}</p>
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
            <p class="text-xs text-neutral-400 mb-1">Tiket terkait</p>
            <NuxtLink
              v-if="detailItem.ticket_number"
              :to="`/orders/${detailItem.ticket_number}`"
              class="font-mono text-sm font-semibold text-primary-700 hover:underline"
            >
              {{ detailItem.ticket_number }}
            </NuxtLink>
            <span v-else class="text-sm text-amber-700">Belum jadi tiket — cek dispatch</span>
          </div>
        </div>

        <div v-if="detailItem.photo_url">
          <p class="text-xs text-neutral-400 mb-2">Foto</p>
          <img :src="detailItem.photo_url" alt="Foto SOS" class="w-full rounded-xl max-h-48 object-cover">
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showDetail = false">Tutup</UiButton>
        <NuxtLink
          v-if="detailItem?.ticket_number"
          :to="`/orders/${detailItem.ticket_number}`"
          @click="showDetail = false"
        >
          <UiButton size="sm">
            <Icon icon="lucide:clipboard-list" class="text-sm" />
            Buka pesanan
          </UiButton>
        </NuxtLink>
      </template>
    </UiModal>
  </div>
</template>
