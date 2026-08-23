<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { slaSortKey, slaUrgency, type SlaUrgency } from "~/utils/slaBreach";
import { isUnitDispatcher, canAcceptTicket, type UnitProfile } from "~/composables/useUnitOps";

definePageMeta({ layout: "unit", title: "SLA Breach", keepalive: true });

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

const filter = ref<"all" | "breached" | "at_risk">("all");
const q = ref("");
const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;

const { data, pending, refresh: refreshRaw } = await useAsyncData(
  "unit-ops-sla-orders",
  () => getOrders().catch(() => [] as any[]),
  { server: false },
);

const refresh = useSoftRefresh(refreshRaw);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

onMounted(() => {
  tickTimer = setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
});
onActivated(() => {
  refreshRaw();
});

const orders = computed(() => data.value ?? []);

const watchlist = computed(() => {
  const now = nowTick.value;
  return orders.value
    .filter((o: any) => {
      const u = slaUrgency(o, now);
      return u === "breached" || u === "at_risk";
    })
    .sort((a: any, b: any) => slaSortKey(a, now) - slaSortKey(b, now));
});

const counts = computed(() => {
  const now = nowTick.value;
  let breached = 0;
  let atRisk = 0;
  for (const o of watchlist.value) {
    const u = slaUrgency(o, now);
    if (u === "breached") breached++;
    else if (u === "at_risk") atRisk++;
  }
  return { breached, atRisk, total: watchlist.value.length };
});

const filtered = computed(() => {
  const now = nowTick.value;
  const needle = q.value.trim().toLowerCase();
  return watchlist.value.filter((o: any) => {
    const u = slaUrgency(o, now);
    if (filter.value === "breached" && u !== "breached") return false;
    if (filter.value === "at_risk" && u !== "at_risk") return false;
    if (!needle) return true;
    const blob = `${o.ticket_number} ${o.requester_name} ${o.unit_name} ${o.condition} ${o.location}`.toLowerCase();
    return blob.includes(needle);
  });
});

function urgencyOf(o: any): SlaUrgency {
  return slaUrgency(o, nowTick.value);
}

function overdueLabel(deadline?: string | null) {
  if (!deadline) return null;
  const ms = nowTick.value - new Date(deadline).getTime();
  if (ms <= 0) return null;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}d lewat`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} mnt lewat`;
  return `${Math.floor(m / 60)}j ${m % 60}m lewat`;
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
  computed(() => counts.value.total),
  refresh,
  15_000,
  { sound: "none", browser: false },
);
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="page-subheader-title">SLA Breach</h1>
          <p class="page-subheader-desc">
            Tiket pending wilayah yang lewat atau mendekati batas accept
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
      <div class="grid grid-cols-3 gap-3">
        <button
          type="button"
          :class="[
            'rounded-xl border px-4 py-3.5 text-left transition-colors',
            filter === 'all'
              ? 'border-primary-300 bg-primary-50'
              : 'border-neutral-200 bg-white hover:border-neutral-300',
          ]"
          @click="filter = 'all'"
        >
          <p class="text-xs text-neutral-500">Semua fokus</p>
          <p class="text-2xl font-bold tabular-nums text-neutral-900 mt-1">{{ counts.total }}</p>
        </button>
        <button
          type="button"
          :class="[
            'rounded-xl border px-4 py-3.5 text-left transition-colors',
            filter === 'breached'
              ? 'border-emergency-300 bg-emergency-50'
              : 'border-neutral-200 bg-white hover:border-neutral-300',
          ]"
          @click="filter = 'breached'"
        >
          <p class="text-xs text-emergency-600">Lewat SLA</p>
          <p class="text-2xl font-bold tabular-nums text-emergency-700 mt-1">{{ counts.breached }}</p>
        </button>
        <button
          type="button"
          :class="[
            'rounded-xl border px-4 py-3.5 text-left transition-colors',
            filter === 'at_risk'
              ? 'border-amber-300 bg-amber-50'
              : 'border-neutral-200 bg-white hover:border-neutral-300',
          ]"
          @click="filter = 'at_risk'"
        >
          <p class="text-xs text-amber-700">≤60 detik</p>
          <p class="text-2xl font-bold tabular-nums text-amber-800 mt-1">{{ counts.atRisk }}</p>
        </button>
      </div>

      <UiTableCard>
        <template #toolbar>
          <UiSearchInput
            v-model="q"
            class="!w-full sm:!w-72"
            placeholder="Cari tiket, nama, unit…"
          />
        </template>

        <div v-if="showSkeleton" class="divide-y divide-neutral-100">
          <div v-for="i in 4" :key="i" class="px-4 sm:px-5 py-4 space-y-2">
            <div class="flex justify-between gap-3">
              <div class="soft-skel h-3 w-24" />
              <div class="soft-skel h-4 w-16" />
            </div>
            <div class="soft-skel h-3.5 w-40" />
            <div class="soft-skel h-3 w-56" />
          </div>
        </div>

        <div v-else-if="!filtered.length" class="px-4 py-16 text-center">
          <Icon icon="lucide:shield-check" class="text-3xl text-emerald-500 mx-auto mb-2" />
          <p class="text-sm font-medium text-neutral-800">Tidak ada tiket kritis</p>
          <p class="text-xs text-neutral-400 mt-1">Semua antrian wilayah masih dalam batas SLA.</p>
        </div>

        <ul v-else class="divide-y divide-neutral-100">
          <li
            v-for="o in filtered"
            :key="o.id"
            :class="[
              'px-4 sm:px-5 py-4 flex flex-col gap-3',
              urgencyOf(o) === 'breached' ? 'bg-emergency-50/30' : '',
            ]"
          >
            <div class="flex flex-col sm:flex-row sm:items-start gap-3">
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <NuxtLink
                    :to="`/unit/orders/${o.ticket_number}`"
                    class="font-mono text-sm font-semibold text-primary-700 hover:underline"
                  >
                    {{ o.ticket_number }}
                  </NuxtLink>
                  <span
                    v-if="urgencyOf(o) === 'breached'"
                    class="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-emergency-600 text-white"
                  >
                    Breach
                  </span>
                  <span
                    v-else
                    class="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200"
                  >
                    At risk
                  </span>
                  <span
                    v-if="o.dispatch_status === 'exhausted' || o.dispatch_status === 'escalated'"
                    class="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5"
                  >
                    {{ o.dispatch_status === "escalated" ? "Escalated PSC" : "Exhausted" }}
                  </span>
                </div>
                <p class="text-sm font-semibold text-neutral-900 truncate">{{ o.requester_name }}</p>
                <p class="text-sm text-neutral-500 truncate">
                  {{ o.unit_name || "Belum ada unit" }}
                  <template v-if="o.location"> · {{ o.location }}</template>
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <SlaCountdown v-if="o.sla_deadline" :deadline="o.sla_deadline" />
                <span
                  v-if="overdueLabel(o.sla_deadline)"
                  class="text-xs font-semibold text-emergency-700 tabular-nums"
                >
                  {{ overdueLabel(o.sla_deadline) }}
                </span>
              </div>
            </div>

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
            <div v-else class="flex flex-wrap gap-2">
              <UiButton
                v-if="canAcceptTicket(profile, o)"
                size="sm"
                :disabled="acting === o.id"
                :loading="acting === o.id"
                @click="doAccept(o)"
              >
                Terima
              </UiButton>
              <UiButton variant="secondary" size="sm" :disabled="acting === o.id" @click="openReject(o)">
                Tolak
              </UiButton>
              <UiButton variant="secondary" size="sm" @click="openReassign(o)">
                Alihkan
              </UiButton>
              <NuxtLink
                :to="`/unit/orders/${o.ticket_number}`"
                class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-neutral-950 border border-neutral-950/10 shadow-sm hover:bg-neutral-50 transition-colors"
              >
                Detail
              </NuxtLink>
            </div>
            <NuxtLink
              v-if="o.dispatch_status === 'exhausted' || o.dispatch_status === 'escalated'"
              :to="`/unit/orders/${o.ticket_number}`"
              class="inline-flex text-xs font-medium text-primary-700 hover:underline"
            >
              Buka detail tiket
            </NuxtLink>
          </li>
        </ul>
      </UiTableCard>
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
