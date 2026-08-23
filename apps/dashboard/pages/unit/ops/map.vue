<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { etaFromEmergency } from "~/utils/eta";
import type { OpsIncident, OpsUnit } from "~/components/ops/OpsLiveMap.vue";
import { isUnitDispatcher, type UnitProfile } from "~/composables/useUnitOps";

definePageMeta({ layout: "unit", title: "Peta Ops Wilayah", keepalive: true });

const { data: profile } = useNuxtData<UnitProfile>("unit-profile");
watch(
  () => isUnitDispatcher(profile.value),
  (ok) => {
    if (import.meta.client && profile.value != null && !ok) {
      navigateTo("/unit/orders");
    }
  },
  { immediate: true },
);

const { getOrders, getUnits } = useUnitOpsFetch();

const { data: orderData, pending: ordersPending, refresh: refreshOrders } = await useAsyncData(
  "unit-ops-live-orders",
  () => getOrders().catch(() => [] as any[]),
  { server: false },
);

const { data: emergencyData, pending: unitsPending, refresh: refreshUnits } = await useAsyncData(
  "unit-ops-live-units",
  () => getUnits().catch(() => [] as any[]),
  { server: false },
);

const refresh = useSoftRefresh(async () => {
  await Promise.all([refreshOrders(), refreshUnits()]);
});

const loading = computed(
  () =>
    isInitialPending(ordersPending.value, orderData.value)
    || isInitialPending(unitsPending.value, emergencyData.value),
);

const emergencyMap = computed(() => {
  const m: Record<string, any> = {};
  for (const e of emergencyData.value ?? []) {
    if (e?.id) m[e.id] = e;
  }
  return m;
});

const ACTIVE = new Set(["pending", "accepted", "in_progress"]);

const incidents = computed<OpsIncident[]>(() =>
  (orderData.value ?? [])
    .filter((o: any) => ACTIVE.has(o.status))
    .map((o: any) => {
      const em = emergencyMap.value[o.emergency_uuid];
      return {
        id: o.id,
        ticket_number: o.ticket_number,
        status: o.status,
        requester_name: o.requester_name,
        unit_name: o.unit_name,
        location: o.location,
        condition: o.condition,
        requester_lat: Number(o.requester_lat) || 0,
        requester_lng: Number(o.requester_lng) || 0,
        responder_lat: o.responder_lat,
        responder_lng: o.responder_lng,
        responder_updated_at: o.responder_updated_at,
        emergency_uuid: o.emergency_uuid,
        eta_minutes: etaFromEmergency(em, Number(o.requester_lat), Number(o.requester_lng)),
        sla_deadline: o.sla_deadline,
      };
    }),
);

const units = computed<OpsUnit[]>(() =>
  (emergencyData.value ?? [])
    .map((e: any) => {
      const lng = Number(e.coordinates?.[0]);
      const lat = Number(e.coordinates?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: e.id,
        name: e.name || "Unit",
        lat,
        lng,
        type: e.emergency_type?.name || e.type_name,
        available: e.fleet?.available ?? e.available_units,
        total: e.fleet?.total ?? e.total_units,
        is_active: e.is_active !== false && e.operational?.is_active !== false && e.operational !== false,
      } as OpsUnit;
    })
    .filter(Boolean) as OpsUnit[],
);

const stats = computed(() => {
  const list = incidents.value;
  return {
    pending: list.filter((i) => i.status === "pending").length,
    accepted: list.filter((i) => i.status === "accepted").length,
    inProgress: list.filter((i) => i.status === "in_progress").length,
    withGps: list.filter((i) => i.requester_lat || i.requester_lng).length,
  };
});

onActivated(() => {
  refreshOrders();
  refreshUnits();
});

const activeOffer = useState<any>("bb-unit-active-alert", () => null);
const focusTicket = computed(() => activeOffer.value?.ticket_number || null);

// Poll only — layout owns SSE + OS notifications (avoids double EventSource / double notif).
useOrderNotification(
  computed(() => stats.value.pending),
  refresh,
  20_000,
  { sound: "none", browser: false },
);
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="page-subheader-title">Peta Ops Wilayah</h1>
          <p class="page-subheader-desc">
            Kejadian aktif + unit di cakupan dispatcher Anda
          </p>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors shrink-0"
          :disabled="(ordersPending || unitsPending) && !!orderData"
          @click="refresh()"
        >
          <Icon
            icon="lucide:refresh-cw"
            class="text-xs"
            :class="{ 'animate-spin': ordersPending || unitsPending }"
          />
          Refresh
        </button>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <template v-if="loading">
          <div
            v-for="i in 4"
            :key="`ops-stat-${i}`"
            class="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 space-y-2"
          >
            <div class="soft-skel h-2.5 w-16" />
            <div class="soft-skel h-7 w-10" />
          </div>
        </template>
        <template v-else>
          <div class="rounded-xl border border-neutral-200 bg-white px-3.5 py-3">
            <p class="text-[11px] text-amber-600">Menunggu</p>
            <p class="text-xl font-bold tabular-nums text-neutral-900">{{ stats.pending }}</p>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white px-3.5 py-3">
            <p class="text-[11px] text-blue-600">Diterima</p>
            <p class="text-xl font-bold tabular-nums text-neutral-900">{{ stats.accepted }}</p>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white px-3.5 py-3">
            <p class="text-[11px] text-orange-600">Diproses</p>
            <p class="text-xl font-bold tabular-nums text-neutral-900">{{ stats.inProgress }}</p>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white px-3.5 py-3">
            <p class="text-[11px] text-neutral-500">Di peta</p>
            <p class="text-xl font-bold tabular-nums text-neutral-900">{{ stats.withGps }}</p>
          </div>
        </template>
      </div>

      <OpsLiveMap
        :incidents="incidents"
        :units="units"
        :loading="loading"
        :focus-ticket="focusTicket"
      />
    </div>
  </div>
</template>
