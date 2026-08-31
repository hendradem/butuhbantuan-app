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
  () => $fetch<{ data: any }>(`${baseUrl}/api/v1/unit/profile`, { headers: unitHeaders() })
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
const orgName = computed(() => profile.value?.organization_name ?? profile.value?.address?.full_address ?? "");
const regency = computed(() => profile.value?.address?.regency ?? "");
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
        `${baseUrl}/api/v1/unit/orders/by-ticket/${ticketNumber.value}`,
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

const reportFormRef = ref<{
  copyMessage: () => Promise<void>;
  shareWhatsApp: () => void;
  saveNow: () => Promise<boolean>;
} | null>(null);
const formStatus = ref({
  savedLocalAt: null as string | null,
  savedRemoteAt: null as string | null,
  savingRemote: false,
  copied: false,
  dirty: false,
  saveError: "",
});

async function onReportSaved() {
  await refreshOrders();
  if (ticketNumber.value) {
    await refreshNuxtData(`unit-report-ticket-${ticketNumber.value}`);
  }
}

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
  <div>
    <!-- Header -->
    <div class="page-subheader shrink-0">
      <div class="flex items-center justify-between gap-3 min-w-0 w-full">
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
            <p v-else class="page-subheader-desc">
              <span class="font-mono">{{ ticketNumber }}</span>
              <template v-if="selectedTicket?.requester_name">
                · {{ selectedTicket.requester_name }}
              </template>
            </p>
          </div>
        </div>
        <div v-if="ticketNumber && selectedTicket" class="flex items-center gap-2 shrink-0">
          <span
            v-if="formStatus.savingRemote || formStatus.savedRemoteAt || (formStatus.dirty && formStatus.savedLocalAt)"
            class="hidden md:inline text-[11px] tabular-nums"
            :class="formStatus.saveError ? 'text-red-500' : formStatus.dirty ? 'text-amber-600' : 'text-neutral-400'"
          >
            <Icon
              :icon="formStatus.savingRemote ? 'lucide:loader-2' : formStatus.savedRemoteAt ? 'lucide:cloud-check' : 'lucide:hard-drive'"
              :class="['inline text-xs', formStatus.savingRemote && 'animate-spin']"
            />
            {{
              formStatus.savingRemote
                ? "Menyimpan…"
                : formStatus.savedRemoteAt
                  ? `Server ${formStatus.savedRemoteAt}`
                  : `Draft ${formStatus.savedLocalAt}`
            }}
          </span>
          <UiButton
            variant="ghost"
            size="sm"
            :loading="formStatus.savingRemote"
            @click="reportFormRef?.saveNow()"
          >
            Simpan
          </UiButton>
          <UiButton
            variant="secondary"
            size="sm"
            @click="reportFormRef?.copyMessage()"
          >
            <Icon
              :icon="formStatus.copied ? 'lucide:check' : 'lucide:copy'"
              class="text-sm"
            />
            <span class="hidden sm:inline">{{ formStatus.copied ? "Tersalin" : "Salin WA" }}</span>
          </UiButton>
          <UiButton size="sm" @click="reportFormRef?.shareWhatsApp()">
            <Icon icon="mdi:whatsapp" class="text-sm" />
            <span class="hidden sm:inline">Bagikan</span>
          </UiButton>
        </div>
      </div>
    </div>

    <!-- List mode -->
    <div v-if="!ticketNumber" class="p-4 sm:p-6">
      <UiTableCard
        title="Daftar Laporan"
        :badge="filteredOrders.length"
        description="Laporan kejadian per e-tiket unit Anda"
      >
        <template #actions>
          <UiSearchInput
            v-model="search"
            placeholder="Cari..."
            class="w-28 sm:w-40 shrink-0"
          />
          <button
            type="button"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-neutral-300 transition-colors shrink-0"
            :disabled="pending && !!ordersData"
            aria-label="Refresh"
            @click="refresh()"
          >
            <Icon icon="lucide:refresh-cw" class="text-sm" :class="{ 'animate-spin': pending }" />
          </button>
        </template>

        <template v-if="showSkeleton">
          <div
            v-for="i in 4"
            :key="`skel-${i}`"
            class="px-4 sm:px-5 py-4 border-b border-neutral-100 last:border-0"
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

        <div v-else class="divide-y divide-neutral-100">
          <NuxtLink
            v-for="order in filteredOrders"
            :key="order.id"
            :to="`/unit/reports?ticket=${order.ticket_number}`"
            class="block px-4 sm:px-5 py-4 hover:bg-neutral-50 transition-colors"
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
        </div>
      </UiTableCard>
    </div>

    <!-- Form mode -->
    <div v-else-if="!selectedTicket" class="p-8 text-center text-sm text-neutral-500">
      Memuat data tiket…
    </div>
    <IncidentReportForm
      v-else
      ref="reportFormRef"
      :key="ticketNumber"
      :unit-name="unitName"
      :org-name="orgName"
      :regency="regency"
      :emergency-uuid="emergencyUUID"
      :storage-key="storageKey"
      :ticket="selectedTicket"
      mode="unit"
      @status="formStatus = $event"
      @saved="onReportSaved"
    />
  </div>
</template>
