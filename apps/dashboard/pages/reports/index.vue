<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Arsip Laporan", keepalive: true });

const route = useRoute();
const { get, authGet } = useApi();

const ticketNumber = computed(() => route.query.ticket as string | undefined);

const { data: emergenciesData } = await useAsyncData("emergencies-for-report", () =>
  get<{ data: any[] }>("/api/v1/emergency/"), { server: false }
);
const { data: ordersData, pending, refresh: refreshOrders } = await useAsyncData("orders-for-report", () =>
  authGet<{ data: any[] }>("/api/v1/admin/orders"), { server: false }
);

const refresh = useSoftRefresh(refreshOrders);
const showSkeleton = computed(() => isInitialPending(pending.value, ordersData.value));

const emergencies = computed(() => emergenciesData.value?.data ?? []);
const allOrders = computed(() => ordersData.value?.data ?? []);

/** Prefer list match; fallback fetch by ticket so form always gets the right order (+ incident_report). */
const { data: ticketFallback } = await useAsyncData(
  () => `admin-report-ticket-${ticketNumber.value || "none"}`,
  async () => {
    if (!ticketNumber.value) return null;
    const fromList = allOrders.value.find((o: any) => o.ticket_number === ticketNumber.value);
    if (fromList?.id) return fromList;
    try {
      const res = await get<{ data: any }>(`/api/v1/order/ticket/${ticketNumber.value}`);
      return res?.data ?? null;
    } catch {
      return null;
    }
  },
  { server: false, watch: [ticketNumber] },
);

const selectedTicket = computed(() => {
  if (!ticketNumber.value) return null;
  return (
    allOrders.value.find((o: any) => o.ticket_number === ticketNumber.value)
    ?? ticketFallback.value
    ?? null
  );
});

const selectedEmergency = computed(() =>
  selectedTicket.value
    ? emergencies.value.find((e: any) => e.uuid === selectedTicket.value.emergency_uuid) ?? null
    : null
);

const unitName = computed(() => selectedEmergency.value?.name ?? "");
const storageKey = computed(() => selectedTicket.value?.emergency_uuid ?? "admin-default");

// ── List mode filters ──────────────────────────────────────────────────────────
const filterStatus = usePersistedQueryParam("bb-admin-reports-status", "status");
const search = usePersistedQueryParam("bb-admin-reports-q", "q", "", { syncQuery: false });

const filteredOrders = computed(() => {
  let list = allOrders.value;
  if (filterStatus.value) list = list.filter((o: any) => o.status === filterStatus.value);
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter((o: any) =>
      o.requester_name?.toLowerCase().includes(q) ||
      o.ticket_number?.toLowerCase().includes(q) ||
      o.unit_name?.toLowerCase().includes(q)
    );
  }
  return list;
});

function hasReport(order: any): boolean {
  if (order?.has_incident_report) return true;
  if (!import.meta.client || !order?.ticket_number) return false;
  try {
    return !!localStorage.getItem(`bb-report-${order.ticket_number}`);
  } catch {
    return false;
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="page-subheader shrink-0">
      <div class="flex items-center gap-3">
        <NuxtLink
          :to="ticketNumber ? `/orders/${ticketNumber}` : '/settings'"
          class="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors shrink-0"
        >
          <Icon icon="lucide:arrow-left" class="text-neutral-700 text-sm" />
        </NuxtLink>
        <div>
          <h1 class="page-subheader-title">
            {{ ticketNumber ? "Laporan Kejadian" : "Arsip Laporan" }}
          </h1>
          <p v-if="!ticketNumber" class="page-subheader-desc">
            Daftar laporan per e-tiket · biasanya dari detail pesanan
          </p>
          <p v-else class="page-subheader-desc font-mono">{{ ticketNumber }}</p>
        </div>
      </div>
    </div>

    <!-- List mode -->
    <div v-if="!ticketNumber" data-dashboard-scroll class="flex-1 overflow-y-auto">
      <!-- Filters -->
      <div class="px-4 sm:px-6 py-3 bg-white border-b border-neutral-100 flex flex-wrap gap-2.5 items-center">
        <UiSearchInput
          v-model="search"
          placeholder="Cari tiket, nama, unit..."
          class="flex-1 min-w-[160px] max-w-xs"
        />
        <UiSelect v-model="filterStatus" class="!w-auto">
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Diterima</option>
          <option value="in_progress">Diproses</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatal</option>
        </UiSelect>
        <p class="text-xs text-neutral-400 ml-auto shrink-0">{{ filteredOrders.length }} hasil</p>
        <button
          type="button"
          class="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
          :disabled="pending && !!ordersData"
          @click="refresh()"
        >
          <Icon icon="lucide:refresh-cw" :class="['text-[11px]', pending && 'animate-spin']" />
          Refresh
        </button>
      </div>

      <!-- Order list -->
      <div class="p-4 sm:p-6 space-y-3">
        <template v-if="showSkeleton">
          <div
            v-for="i in 4"
            :key="`skel-${i}`"
            class="bg-white rounded-xl border border-neutral-200 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-2 flex-1 min-w-0">
                <div class="soft-skel h-2.5 w-24" />
                <div class="soft-skel h-3.5 w-40" />
                <div class="soft-skel h-3 w-32" />
                <div class="soft-skel h-2.5 w-28" />
              </div>
              <div class="space-y-2 shrink-0">
                <div class="soft-skel h-5 rounded-full w-16" />
                <div class="soft-skel h-4 rounded-full w-20" />
              </div>
            </div>
          </div>
        </template>

        <div
          v-else-if="!filteredOrders.length"
          class="flex flex-col items-center justify-center py-16 gap-2 text-neutral-400 text-sm"
        >
          <Icon icon="lucide:inbox" class="text-2xl" />
          Tidak ada pesanan.
        </div>

        <template v-else>
          <NuxtLink
            v-for="order in filteredOrders"
            :key="order.id"
            :to="`/reports?ticket=${order.ticket_number}`"
            class="block bg-white rounded-xl border border-neutral-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-mono text-xs font-semibold text-primary-700">{{ order.ticket_number }}</p>
                <p class="font-semibold text-neutral-900 mt-0.5 truncate">{{ order.requester_name }}</p>
                <p class="text-sm text-neutral-500 truncate mt-0.5">{{ order.unit_name }}</p>
                <p class="text-xs text-neutral-400 mt-1">{{ formatDate(order.created_at) }}</p>
              </div>
              <div class="flex flex-col items-end gap-1.5 shrink-0">
                <UiStatusBadge :status="order.status" />
                <span
                  v-if="hasReport(order)"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1"
                >
                  <Icon icon="lucide:check-circle" class="text-[10px]" />
                  Ada Laporan
                </span>
                <span
                  v-else
                  class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-50 text-neutral-400 border border-neutral-200"
                >
                  Belum Ada Laporan
                </span>
              </div>
            </div>
          </NuxtLink>
        </template>
      </div>
    </div>

    <!-- Form mode -->
    <div v-else class="flex-1 min-h-0 overflow-y-auto">
      <div v-if="!selectedTicket" class="p-8 text-center text-sm text-neutral-500">
        Memuat data tiket…
      </div>
      <IncidentReportForm
        v-else
        :key="ticketNumber"
        :unit-name="unitName"
        :storage-key="storageKey"
        :ticket="selectedTicket"
        mode="admin"
      />
    </div>
  </div>
</template>
