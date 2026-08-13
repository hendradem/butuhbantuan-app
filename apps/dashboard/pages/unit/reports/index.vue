<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: "unit", title: "Arsip Laporan", keepalive: true });

const route = useRoute();
const { unitHeaders, emergencyUUID } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

const ticketNumber = computed(() => route.query.ticket as string | undefined);

const { data: profile } = await useAsyncData(
  "unit-profile-report",
  () => $fetch<{ data: { unit_name: string } }>(`${baseUrl}/api/v1/unit/profile`, { headers: unitHeaders() })
    .then(r => r.data).catch(() => null),
  { server: false }
);
const { data: ordersData, pending, refresh: refreshOrders } = await useAsyncData(
  "unit-orders-report",
  () => $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/orders`, { headers: unitHeaders() })
    .catch(() => ({ data: [] })),
  { server: false }
);

const refresh = useSoftRefresh(refreshOrders);
const showSkeleton = computed(() => isInitialPending(pending.value, ordersData.value));

const unitName = computed(() => profile.value?.unit_name ?? "");
const storageKey = computed(() => `unit-${emergencyUUID.value || "default"}`);
const orders = computed(() => ordersData.value?.data ?? []);

const search = usePersistedQueryParam("bb-unit-reports-q", "q", "", { syncQuery: false });
const filteredOrders = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return orders.value;
  return orders.value.filter(
    (o: any) =>
      o.ticket_number?.toLowerCase().includes(q) ||
      o.requester_name?.toLowerCase().includes(q) ||
      o.location?.toLowerCase().includes(q),
  );
});

const { data: ticketFallback } = await useAsyncData(
  () => `unit-report-ticket-${ticketNumber.value || "none"}`,
  async () => {
    if (!ticketNumber.value) return null;
    const fromList = orders.value.find((o: any) => o.ticket_number === ticketNumber.value);
    if (fromList?.id) return fromList;
    try {
      const res = await $fetch<{ data: any }>(
        `${baseUrl}/api/v1/order/ticket/${ticketNumber.value}`,
        { headers: unitHeaders() },
      );
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
    orders.value.find((o: any) => o.ticket_number === ticketNumber.value)
    ?? ticketFallback.value
    ?? null
  );
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
      <div class="flex items-center gap-3 min-w-0">
        <NuxtLink
          :to="ticketNumber ? `/unit/orders/${ticketNumber}` : '/unit/settings'"
          class="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors shrink-0"
        >
          <Icon icon="lucide:arrow-left" class="text-neutral-700 text-sm" />
        </NuxtLink>
        <div class="min-w-0">
          <h1 class="page-subheader-title">
            {{ ticketNumber ? "Laporan Kejadian" : "Arsip Laporan" }}
          </h1>
          <p v-if="!ticketNumber" class="page-subheader-desc">
            Daftar laporan per e-tiket · biasanya dari detail pesanan
          </p>
          <p v-else class="page-subheader-desc font-mono truncate">{{ ticketNumber }}</p>
        </div>
      </div>
    </div>

    <!-- List mode -->
    <div v-if="!ticketNumber" data-dashboard-scroll class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-1">
        <UiSearchInput
          v-model="search"
          placeholder="Cari tiket, nama..."
          class="w-full sm:flex-1 sm:min-w-[160px] sm:max-w-xs"
        />
        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <p class="text-xs text-neutral-500">{{ filteredOrders.length }} pesanan</p>
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
      </div>

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
        Belum ada pesanan.
      </div>

      <template v-else>
        <NuxtLink
          v-for="order in filteredOrders"
          :key="order.id"
          :to="`/unit/reports?ticket=${order.ticket_number}`"
          class="block bg-white rounded-xl border border-neutral-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-mono text-xs font-semibold text-primary-700">{{ order.ticket_number }}</p>
              <p class="font-semibold text-neutral-900 mt-0.5 truncate">{{ order.requester_name }}</p>
              <p v-if="order.location" class="text-xs text-neutral-500 truncate mt-0.5">{{ order.location }}</p>
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
        mode="unit"
      />
    </div>
  </div>
</template>
