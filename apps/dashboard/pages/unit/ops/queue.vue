<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { isUnitDispatcher, canAcceptTicket, type UnitProfile } from "~/composables/useUnitOps";

definePageMeta({ layout: "unit", title: "Antrian Wilayah", keepalive: true });

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

const { getOrders } = useUnitOpsFetch();
const { accept, reject, acting, escalatePsc } = useOrderDispatch("unit");

const showReject = ref(false);
const rejectTarget = ref<any>(null);
const showReassign = ref(false);
const reassignOrder = ref<any>(null);

const { data, pending, refresh: refreshQueue } = await useAsyncData(
  "unit-ops-queue",
  () => getOrders().catch(() => [] as any[]),
  { server: false },
);

const refresh = useSoftRefresh(refreshQueue);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

onActivated(() => {
  refreshQueue();
});

const orders = computed(() => data.value ?? []);

const pendingOrders = computed(() =>
  orders.value
    .filter((o: any) => o.status === "pending")
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
);

const exhaustedOrders = computed(() =>
  pendingOrders.value.filter(
    (o: any) => o.dispatch_status === "exhausted" || o.dispatch_status === "escalated",
  ),
);

type Lane = { key: string; label: string; icon: string; match: (o: any) => boolean };

const lanes: Lane[] = [
  {
    key: "medical",
    label: "Ambulance / Medis",
    icon: "lucide:ambulance",
    match: (o) => familyOf(o) === "medical",
  },
  {
    key: "fire",
    label: "Damkar",
    icon: "lucide:flame",
    match: (o) => familyOf(o) === "fire",
  },
  {
    key: "sar",
    label: "SAR",
    icon: "lucide:life-buoy",
    match: (o) => familyOf(o) === "sar",
  },
  {
    key: "other",
    label: "Lainnya",
    icon: "lucide:help-circle",
    match: (o) => familyOf(o) === "other",
  },
];

function familyOf(o: any): string {
  const blob = `${o.type_name || ""} ${o.unit_name || ""} ${o.condition || ""}`.toLowerCase();
  if (/ambul|psc|119|spgdt|medis|medical/.test(blob) || o.type_id === 1) return "medical";
  if (/damkar|fire|pemadam|kebakaran/.test(blob) || o.type_id === 2) return "fire";
  if (/sar|basarnas|rescue/.test(blob) || o.type_id === 3) return "sar";
  return "other";
}

function ageLabel(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1 mnt";
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  return `${h}j ${m % 60}m`;
}

function ageTone(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (ms > 10 * 60_000) return "text-emergency-700";
  if (ms > 3 * 60_000) return "text-amber-700";
  return "text-neutral-500";
}

function openReject(o: any) {
  rejectTarget.value = o;
  showReject.value = true;
}

async function onRejectConfirm(payload: { reason: string; note: string }) {
  if (!rejectTarget.value?.id) return;
  if (await reject(rejectTarget.value.id, payload)) refresh();
}

function openReassign(o: any) {
  reassignOrder.value = o;
  showReassign.value = true;
}

async function doAccept(o: any) {
  if (!canAcceptTicket(profile.value, o)) return;
  if (await accept(o.id)) refresh();
}

async function doEscalate(o: any) {
  if (await escalatePsc(o.id)) refresh();
}

useOrderNotification(
  computed(() => pendingOrders.value.length),
  refresh,
  20_000,
  { sound: "none", browser: false },
);
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center gap-3 flex-wrap justify-between">
        <div>
          <h1 class="page-subheader-title">Antrian Wilayah</h1>
          <p class="page-subheader-desc">
            Pending per jenis layanan · hanya tiket di cakupan dispatcher Anda
          </p>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors shrink-0"
          :disabled="pending && !!data"
          @click="refresh()"
        >
          <Icon icon="lucide:refresh-cw" class="text-xs" :class="{ 'animate-spin': pending }" />
          Refresh
        </button>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-4">
    <!-- Attention: exhausted first -->
    <div
      v-if="!showSkeleton && exhaustedOrders.length"
      class="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 space-y-2"
    >
      <div class="flex items-center gap-2">
        <Icon icon="lucide:triangle-alert" class="text-amber-700" />
        <p class="text-sm font-semibold text-amber-900">
          {{ exhaustedOrders.length }} tiket butuh playbook
        </p>
      </div>
      <p class="text-xs text-amber-800/80">
        Cascade habis atau sudah dieskalasi — alihkan unit, eskalasi PSC, atau hubungi pelapor.
      </p>
      <div class="flex flex-wrap gap-2 pt-1">
        <NuxtLink
          v-for="o in exhaustedOrders.slice(0, 4)"
          :key="o.id"
          :to="`/unit/orders/${o.ticket_number}`"
          class="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-white border border-amber-200 text-amber-900 hover:bg-amber-100 transition-colors"
        >
          {{ o.ticket_number }}
        </NuxtLink>
        <NuxtLink
          v-if="exhaustedOrders.length > 4"
          to="/unit/ops/queue"
          class="text-xs font-semibold px-2.5 py-1 text-amber-800 hover:underline"
        >
          +{{ exhaustedOrders.length - 4 }} di antrian
        </NuxtLink>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <section
          v-for="lane in lanes"
          :key="lane.key"
          class="bg-white rounded-xl border border-neutral-200 flex flex-col min-h-[280px]"
        >
          <header class="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
            <Icon :icon="lane.icon" class="text-neutral-500" />
            <h2 class="text-sm font-semibold text-neutral-800 flex-1">{{ lane.label }}</h2>
            <span class="text-xs font-bold tabular-nums text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
              {{ pendingOrders.filter(lane.match).length }}
            </span>
          </header>

          <div class="p-3 space-y-2 flex-1 overflow-y-auto max-h-[70vh]">
            <div v-if="showSkeleton" class="space-y-2">
              <div v-for="i in 2" :key="i" class="rounded-lg border border-neutral-200 p-3 space-y-2">
                <div class="soft-skel h-3 w-24" />
                <div class="soft-skel h-3.5 w-28" />
                <div class="soft-skel h-2.5 w-full" />
              </div>
            </div>
            <p
              v-else-if="!pendingOrders.filter(lane.match).length"
              class="text-xs text-neutral-400 text-center py-8"
            >
              Tidak ada antrian
            </p>
            <article
              v-for="o in pendingOrders.filter(lane.match)"
              :key="o.id"
              class="rounded-lg border border-neutral-200 p-3 space-y-2 hover:border-neutral-300 transition-colors"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <NuxtLink
                    :to="`/unit/orders/${o.ticket_number}`"
                    class="font-mono text-xs font-semibold text-primary-700 hover:underline"
                  >
                    {{ o.ticket_number }}
                  </NuxtLink>
                  <p class="text-sm font-medium text-neutral-900 truncate mt-0.5">{{ o.requester_name }}</p>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <span :class="['text-[10px] font-semibold tabular-nums', ageTone(o.created_at)]">
                    {{ ageLabel(o.created_at) }}
                  </span>
                  <SlaCountdown v-if="o.sla_deadline" :deadline="o.sla_deadline" compact />
                </div>
              </div>
              <p class="text-[11px] text-neutral-500 truncate">{{ o.unit_name || "Belum ada unit" }}</p>
              <p v-if="o.condition" class="text-[11px] text-neutral-600 line-clamp-2">{{ o.condition }}</p>
              <ExhaustedPlaybook
                v-if="o.dispatch_status === 'exhausted' || o.dispatch_status === 'escalated'"
                compact
                :unit-name="o.unit_name"
                :requester-phone="o.requester_phone"
                :dispatch-status="o.dispatch_status"
                :escalation-hotline="o.escalation_hotline"
                :escalation-label="o.escalation_label"
                show-reassign
                show-escalate
                :escalating="acting === o.id"
                @reassign="openReassign(o)"
                @escalate="doEscalate(o)"
              />
              <div v-else class="flex flex-wrap gap-1.5 pt-1">
                <button
                  v-if="canAcceptTicket(profile, o)"
                  type="button"
                  class="text-[10px] font-semibold px-2 py-1 rounded-md bg-emerald-600 text-white disabled:opacity-50"
                  :disabled="acting === o.id"
                  @click="doAccept(o)"
                >
                  Terima
                </button>
                <button
                  type="button"
                  class="text-[10px] font-semibold px-2 py-1 rounded-md border border-neutral-200 text-neutral-700"
                  :disabled="acting === o.id"
                  @click="openReject(o)"
                >
                  Tolak
                </button>
                <button
                  type="button"
                  class="text-[10px] font-semibold px-2 py-1 rounded-md border border-neutral-200 text-neutral-700"
                  @click="openReassign(o)"
                >
                  Alihkan
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>

    <RejectReasonModal
      v-model:open="showReject"
      :unit-name="rejectTarget?.unit_name"
      @confirm="onRejectConfirm"
    />
    <ReassignModal
      v-model:open="showReassign"
      mode="unit"
      :order="reassignOrder"
      @done="refresh()"
    />
  </div>
</template>
