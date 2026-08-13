<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { slaSortKey, slaUrgency, type SlaUrgency } from "~/utils/slaBreach";

definePageMeta({ title: "SLA Breach", keepalive: true });

const { authGet } = useApi();
const { accept, reject, acting, escalatePsc } = useOrderDispatch("admin");

const showReject = ref(false);
const rejectTarget = ref<any>(null);
const showReassign = ref(false);
const reassignOrder = ref<any>(null);

const filter = ref<"all" | "breached" | "at_risk">("all");
const q = ref("");
const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;

const { data, pending, refresh: refreshRaw } = await useAsyncData(
  "orders-sla-breach",
  () => authGet<{ data: any[] }>("/api/v1/admin/orders").then((r) => r.data ?? []),
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
  if (await accept(o.id)) refresh();
}

async function doEscalate(o: any) {
  if (await escalatePsc(o.id)) refresh();
}

useOrderNotification(
  computed(() => counts.value.total),
  refresh,
  15_000,
  { sound: "none" },
);
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="page-subheader-title">SLA Breach</h1>
          <p class="page-subheader-desc">
            Tiket pending yang lewat atau mendekati batas accept (90 detik)
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
    <!-- Summary -->
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
          <div class="flex gap-2 pt-1">
            <div class="soft-skel h-9 rounded-lg w-20" />
            <div class="soft-skel h-9 rounded-lg w-20" />
          </div>
        </div>
      </div>

      <div v-else-if="!filtered.length" class="px-4 py-16 text-center">
        <Icon icon="lucide:shield-check" class="text-3xl text-emerald-500 mx-auto mb-2" />
        <p class="text-sm font-medium text-neutral-800">Tidak ada tiket kritis</p>
        <p class="text-xs text-neutral-400 mt-1">Semua antrian masih dalam batas SLA.</p>
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
                  :to="`/orders/${o.ticket_number}`"
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
              <p v-if="o.condition" class="text-sm text-neutral-600 line-clamp-2">{{ o.condition }}</p>
            </div>

            <div class="flex items-center gap-2 shrink-0 sm:pt-0.5">
              <SlaCountdown v-if="o.sla_deadline" :deadline="o.sla_deadline" />
              <span
                v-if="overdueLabel(o.sla_deadline)"
                class="text-xs font-semibold text-emergency-700 tabular-nums"
              >
                {{ overdueLabel(o.sla_deadline) }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <UiButton
              size="sm"
              :disabled="acting === o.id"
              :loading="acting === o.id"
              @click="doAccept(o)"
            >
              Terima
            </UiButton>
            <UiButton
              variant="secondary"
              size="sm"
              :disabled="acting === o.id"
              @click="openReject(o)"
            >
              Tolak
            </UiButton>
            <UiButton variant="secondary" size="sm" @click="openReassign(o)">
              Alihkan
            </UiButton>
            <UiButton
              v-if="o.dispatch_status === 'exhausted'"
              variant="secondary"
              size="sm"
              :disabled="acting === o.id"
              @click="doEscalate(o)"
            >
              Eskalasi PSC
            </UiButton>
            <NuxtLink
              :to="`/orders/${o.ticket_number}`"
              class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-neutral-950 border border-neutral-950/10 shadow-sm hover:bg-neutral-50 transition-colors"
            >
              Detail
            </NuxtLink>
          </div>
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
      mode="admin"
      :order="reassignOrder"
      @done="refresh()"
    />
  </div>
</template>
