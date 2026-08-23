<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: false });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const token = computed(() => String(route.params.token || ""));

type PublicShift = { id: string; date: string; label: string; status: string };
type PublicTeam = { sru: string; color: string; assigned_sectors?: string[] };
type PublicMember = { id: string; callsign: string; sru: string; role: string; status: string };
type PublicPosition = {
  id: string;
  member_id: string;
  callsign: string;
  lat: number;
  lng: number;
  source: string;
  sector_hint?: string;
  reported_at: string;
};
type PublicMarker = {
  id: string;
  kind: string;
  label: string;
  lat: number;
  lng: number;
  color?: string;
  icon?: string;
};
type PublicSector = {
  id: string;
  code: string;
  label: string;
  color: string;
  assigned_sru?: string;
  ring: [number, number][];
};
type PublicBundle = {
  mission: {
    id: string;
    name: string;
    area: string;
    status: string;
    kind: string;
    center_lat: number;
    center_lng: number;
    started_at: string;
  };
  shifts: PublicShift[];
  shift?: PublicShift | null;
  teams: PublicTeam[];
  sectors: PublicSector[];
  members: PublicMember[];
  positions: PublicPosition[];
  markers: PublicMarker[];
  last_by_member: Record<string, PublicPosition>;
  sru_list: string[];
  view_only: boolean;
  expires_at?: string | null;
};

const bundle = ref<PublicBundle | null>(null);
const loadError = ref("");
const pending = ref(true);
const selectedDay = ref("");

async function load(opts?: { silent?: boolean }) {
  if (!token.value) {
    loadError.value = "Link tidak valid";
    pending.value = false;
    return;
  }
  if (!opts?.silent) pending.value = true;
  loadError.value = "";
  try {
    const q = selectedDay.value ? `?day=${encodeURIComponent(selectedDay.value)}` : "";
    const res = await $fetch<{ data: PublicBundle }>(
      `${apiBase}/api/v1/sar/share/${token.value}${q}`,
    );
    bundle.value = res.data;
    if (!selectedDay.value && res.data.shift?.date) {
      selectedDay.value = res.data.shift.date;
    }
  } catch (e: any) {
    const status = e?.statusCode || e?.status || e?.response?.status;
    if (status === 410) {
      loadError.value = "Link share sudah kedaluwarsa.";
    } else if (status === 404) {
      loadError.value = "Link tidak ditemukan atau sudah dimatikan.";
    } else {
      loadError.value = e?.data?.message || "Gagal memuat peta SRU.";
    }
    if (!opts?.silent) bundle.value = null;
  } finally {
    pending.value = false;
  }
}

watch(token, () => {
  selectedDay.value = "";
  void load();
}, { immediate: true });

watch(selectedDay, (day, prev) => {
  if (!day || day === prev || !bundle.value) return;
  void load();
});

const expiresLabel = computed(() => {
  const exp = bundle.value?.expires_at;
  if (!exp) return "";
  const d = new Date(exp);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
});

const lastKnown = computed(() => {
  const b = bundle.value;
  if (!b) return [] as Array<PublicPosition & { sru: string }>;
  const out: Array<PublicPosition & { sru: string }> = [];
  for (const [mid, p] of Object.entries(b.last_by_member || {})) {
    const m = b.members.find((x) => x.id === mid);
    out.push({ ...p, sru: m?.sru || "?" });
  }
  return out.sort((a, b) => a.sru.localeCompare(b.sru));
});

let pollTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  pollTimer = setInterval(() => {
    if (bundle.value) void load({ silent: true });
  }, 30_000);
});
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <div class="ui-page min-h-screen">
    <header class="ui-topbar z-20 backdrop-blur" style="background: color-mix(in srgb, var(--bb-bg-surface) 95%, transparent)">
      <div class="max-w-5xl mx-auto w-full flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--bb-danger)">
            SRU Mission Map · view only
          </p>
          <h1 class="text-lg font-semibold truncate ui-text-primary">
            {{ bundle?.mission.name || "Peta SRU" }}
          </h1>
          <p v-if="bundle" class="text-xs ui-text-secondary mt-0.5">
            {{ bundle.mission.area || "—" }}
            <span v-if="expiresLabel"> · link hingga {{ expiresLabel }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <select
            v-if="bundle?.shifts?.length"
            v-model="selectedDay"
            class="ui-field text-sm py-2"
            style="width: auto; padding-right: 2rem"
          >
            <option v-for="sh in bundle.shifts" :key="sh.id" :value="sh.date">
              {{ sh.label || sh.date }}
            </option>
          </select>
          <button
            type="button"
            class="h-9 w-9 inline-flex items-center justify-center"
            style="border-radius: var(--bb-radius-control); border: 1px solid var(--bb-border); background: var(--bb-bg-surface)"
            title="Refresh"
            :disabled="pending"
            @click="load"
          >
            <Icon icon="lucide:refresh-cw" :class="pending ? 'animate-spin text-sm' : 'text-sm'" />
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-4 space-y-4">
      <div
        v-if="loadError"
        class="px-4 py-3 text-sm text-red-800"
        style="border-radius: var(--bb-radius-card); border: 1px solid #fecaca; background: #fef2f2"
      >
        {{ loadError }}
      </div>

      <div
        v-else-if="pending && !bundle"
        class="h-[min(70vh,560px)] animate-pulse"
        style="border-radius: var(--bb-radius-card); background: var(--bb-bg-muted)"
      />

      <template v-else-if="bundle">
        <SarPublicMap
          :center-lat="bundle.mission.center_lat"
          :center-lng="bundle.mission.center_lng"
          :sectors="bundle.sectors"
          :positions="bundle.positions"
          :markers="bundle.markers"
          :members="bundle.members"
          :last-by-member="bundle.last_by_member"
          :teams="bundle.teams"
        />

        <div class="grid sm:grid-cols-2 gap-3">
          <section class="ui-card p-4">
            <h2 class="text-sm font-semibold ui-text-primary">SRU aktif</h2>
            <ul class="mt-2 space-y-2">
              <li
                v-for="t in bundle.teams"
                :key="t.sru"
                class="flex items-center gap-2 text-sm"
              >
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: t.color || '#64748b' }" />
                <span class="font-medium">{{ t.sru }}</span>
                <span v-if="t.assigned_sectors?.length" class="text-xs ui-text-secondary">
                  · {{ t.assigned_sectors.join(", ") }}
                </span>
              </li>
              <li v-if="!bundle.teams.length" class="text-xs ui-text-secondary">Tidak ada SRU hari ini</li>
            </ul>
          </section>

          <section class="ui-card p-4">
            <h2 class="text-sm font-semibold ui-text-primary">Last known</h2>
            <ul class="mt-2 space-y-2">
              <li
                v-for="p in lastKnown"
                :key="p.id"
                class="text-sm flex flex-wrap items-baseline justify-between gap-2"
              >
                <span>
                  <span class="font-medium">{{ p.sru }}</span>
                  <span class="text-neutral-500 text-xs"> · {{ p.callsign }}</span>
                </span>
                <span class="text-[11px] text-neutral-400 tabular-nums">
                  {{ new Date(p.reported_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) }}
                </span>
              </li>
              <li v-if="!lastKnown.length" class="text-xs text-neutral-500">Belum ada posisi</li>
            </ul>
          </section>
        </div>

        <p class="text-center text-[11px] text-neutral-400 pb-6">
          Tampilan publik — hanya lihat. Auto-refresh 30 detik.
        </p>
      </template>
    </main>
  </div>
</template>
