<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: "unit", title: "Laporan Kejadian" });

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
const { data: ordersData, refresh } = await useAsyncData(
  "unit-orders-report",
  () => $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/orders`, { headers: unitHeaders() })
    .catch(() => ({ data: [] })),
  { server: false }
);

const unitName = computed(() => profile.value?.unit_name ?? "");
const storageKey = computed(() => `unit-${emergencyUUID.value || "default"}`);
const orders = computed(() => ordersData.value?.data ?? []);

const selectedTicket = computed(() =>
  ticketNumber.value
    ? orders.value.find((o: any) => o.ticket_number === ticketNumber.value) ?? null
    : null
);

function hasReport(ticketNum: string): boolean {
  if (!import.meta.client) return false;
  return !!localStorage.getItem(`bb-report-${ticketNum}`);
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
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4 shrink-0">
      <div class="flex items-center gap-3">
        <NuxtLink
          v-if="ticketNumber"
          to="/unit/reports"
          class="text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <Icon icon="lucide:arrow-left" class="text-lg" />
        </NuxtLink>
        <div>
          <h1 class="text-lg font-semibold text-neutral-900">Laporan Kejadian</h1>
          <p v-if="!ticketNumber" class="text-sm text-neutral-500 mt-0.5">Daftar laporan per e-tiket</p>
          <p v-else class="text-sm font-mono text-neutral-500 mt-0.5">{{ ticketNumber }}</p>
        </div>
      </div>
    </div>

    <!-- List mode -->
    <div v-if="!ticketNumber" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs text-neutral-500">{{ orders.length }} pesanan</p>
        <button class="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors" @click="refresh()">
          <Icon icon="lucide:refresh-cw" class="text-[11px]" />
          Refresh
        </button>
      </div>

      <div v-if="!orders.length" class="flex flex-col items-center justify-center py-16 gap-2 text-neutral-400 text-sm">
        <Icon icon="lucide:inbox" class="text-2xl" />
        Belum ada pesanan.
      </div>

      <NuxtLink
        v-for="order in orders"
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
              v-if="hasReport(order.ticket_number)"
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
    </div>

    <!-- Form mode -->
    <div v-else class="flex-1 min-h-0 overflow-y-auto">
      <IncidentReportForm
        :unit-name="unitName"
        :storage-key="storageKey"
        :ticket="selectedTicket"
      />
    </div>
  </div>
</template>
