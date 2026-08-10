<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Laporan Kejadian" });

const route = useRoute();
const { get, authGet } = useApi();

const ticketNumber = computed(() => route.query.ticket as string | undefined);

const { data: emergenciesData } = await useAsyncData("emergencies-for-report", () =>
  get<{ data: any[] }>("/api/v1/emergency/"), { server: false }
);
const { data: ordersData } = await useAsyncData("orders-for-report", () =>
  authGet<{ data: any[] }>("/api/v1/admin/orders"), { server: false }
);

const emergencies = computed(() => emergenciesData.value?.data ?? []);
const allOrders = computed(() => ordersData.value?.data ?? []);

const selectedTicket = computed(() =>
  ticketNumber.value
    ? allOrders.value.find((o: any) => o.ticket_number === ticketNumber.value) ?? null
    : null
);

const selectedEmergency = computed(() =>
  selectedTicket.value
    ? emergencies.value.find((e: any) => e.uuid === selectedTicket.value.emergency_uuid) ?? null
    : null
);

const unitName = computed(() => selectedEmergency.value?.name ?? "");
const storageKey = computed(() => selectedTicket.value?.emergency_uuid ?? "admin-default");

// ── List mode filters ──────────────────────────────────────────────────────────
const filterStatus = ref("");
const search = ref("");

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
          to="/reports"
          class="text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <Icon icon="lucide:arrow-left" class="text-lg" />
        </NuxtLink>
        <div>
          <h1 class="text-lg font-semibold text-neutral-900">Laporan Kejadian</h1>
          <p v-if="!ticketNumber" class="text-sm text-neutral-500 mt-0.5">Buat laporan kejadian format WhatsApp per e-tiket</p>
          <p v-else class="text-sm font-mono text-neutral-500 mt-0.5">{{ ticketNumber }}</p>
        </div>
      </div>
    </div>

    <!-- List mode -->
    <div v-if="!ticketNumber" class="flex-1 overflow-y-auto">
      <!-- Filters -->
      <div class="px-4 sm:px-6 py-3 bg-white border-b border-neutral-100 flex flex-wrap gap-3 items-center">
        <div class="relative flex-1 min-w-[160px] max-w-xs">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari tiket, nama, unit..."
            class="w-full pl-8 pr-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white transition-colors"
          />
        </div>
        <UiSelect v-model="filterStatus" class="!w-auto">
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Diterima</option>
          <option value="in_progress">Diproses</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatal</option>
        </UiSelect>
        <p class="text-xs text-neutral-400 ml-auto shrink-0">{{ filteredOrders.length }} hasil</p>
      </div>

      <!-- Order list -->
      <div class="p-4 sm:p-6 space-y-3">
        <div v-if="!filteredOrders.length" class="flex flex-col items-center justify-center py-16 gap-2 text-neutral-400 text-sm">
          <Icon icon="lucide:inbox" class="text-2xl" />
          Tidak ada pesanan.
        </div>

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
