<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";
import type { SarLiveTrack, SarMember } from "~/composables/useSarApi";
import { ageLabel } from "~/utils/sarTrack";

const props = defineProps<{
  missionId: string;
  sru: string;
  shiftId?: string;
  memberId?: string;
  members: SarMember[];
  tracks: SarLiveTrack[];
  canEdit: boolean;
}>();

const emit = defineEmits<{
  refreshed: [];
}>();

const config = useRuntimeConfig();
const webAppUrl = (config.public.webAppUrl as string) || "http://localhost:3000";
const { enableLiveTrack, disableLiveTrack } = useSarApi();

const acting = ref(false);
/** Local copy so Salin/WA work immediately after enable (before parent refresh). */
const localTrack = ref<SarLiveTrack | null>(null);

function publicOrigin(): string {
  let base = String(webAppUrl || "http://localhost:3000").trim().replace(/\/$/, "");
  try {
    const u = new URL(base.includes("://") ? base : `http://${base}`);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname.endsWith(".local")) {
      u.protocol = "http:";
    }
    return u.origin;
  } catch {
    return base;
  }
}

watch(
  () => [props.sru, props.tracks] as const,
  () => {
    const fromProps =
      (props.tracks || []).find((t) => t.sru === props.sru && t.active) || null;
    if (fromProps) {
      localTrack.value = fromProps;
      return;
    }
    if (localTrack.value && localTrack.value.sru !== props.sru) {
      localTrack.value = null;
    }
  },
  { immediate: true, deep: true },
);

const track = computed(() => {
  if (localTrack.value?.sru === props.sru && localTrack.value.active) {
    return localTrack.value;
  }
  return (props.tracks || []).find((t) => t.sru === props.sru && t.active) || null;
});

const trackUrl = computed(() => {
  if (!track.value?.token) return "";
  return `${publicOrigin()}/sar/track/${track.value.token}`;
});

const expiresLabel = computed(() => {
  const exp = track.value?.expires_at;
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

async function ensureTrack(): Promise<SarLiveTrack | null> {
  if (track.value?.token) return track.value;
  if (!props.missionId || !props.sru) return null;
  const created = await enableLiveTrack(props.missionId, {
    sru: props.sru,
    member_id: props.memberId || undefined,
    shift_id: props.shiftId || undefined,
    ttl_hours: 12,
  });
  localTrack.value = { ...created, active: true };
  emit("refreshed");
  return localTrack.value;
}

async function onEnable() {
  if (!props.missionId || !props.sru || acting.value) return;
  acting.value = true;
  try {
    await ensureTrack();
    toast.success(`Live GPS · ${props.sru} siap (12 jam)`);
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal aktifkan live track");
  } finally {
    acting.value = false;
  }
}

async function onDisable() {
  if (!props.missionId || !props.sru || acting.value) return;
  acting.value = true;
  try {
    await disableLiveTrack(props.missionId, { sru: props.sru });
    localTrack.value = null;
    toast.success("Live GPS dimatikan");
    emit("refreshed");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal matikan");
  } finally {
    acting.value = false;
  }
}

async function copyLink() {
  if (acting.value) return;
  acting.value = true;
  try {
    const t = await ensureTrack();
    const url = t?.token ? `${publicOrigin()}/sar/track/${t.token}` : "";
    if (!url) {
      toast.error("Link belum siap");
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link field disalin");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal menyalin link");
  } finally {
    acting.value = false;
  }
}

async function shareWA() {
  if (acting.value) return;
  acting.value = true;
  try {
    const t = await ensureTrack();
    const url = t?.token ? `${publicOrigin()}/sar/track/${t.token}` : "";
    if (!url) {
      toast.error("Link belum siap");
      return;
    }
    const text = encodeURIComponent(
      [`Live GPS SRU — ${props.sru}`, `Buka & izinkan lokasi:`, url].join("\n"),
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal buat link");
  } finally {
    acting.value = false;
  }
}
</script>

<template>
  <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
    <div class="px-3 py-2.5 flex items-start justify-between gap-2 border-b border-neutral-100">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          Live GPS
        </p>
        <p class="text-xs text-neutral-600 mt-0.5 leading-snug">
          HP lapangan kirim posisi saat ada sinyal. Tanpa sinyal → log HT di peta.
        </p>
      </div>
      <span
        v-if="track"
        class="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Aktif
      </span>
    </div>

    <div class="p-3 space-y-2.5">
      <template v-if="!track">
        <UiButton
          class="w-full"
          size="sm"
          :disabled="acting || !canEdit || !sru"
          @click="onEnable"
        >
          <Icon :icon="acting ? 'lucide:loader-2' : 'lucide:radio-tower'" :class="acting ? 'animate-spin text-sm' : 'text-sm'" />
          {{ acting ? "Menyiapkan…" : "Aktifkan live GPS" }}
        </UiButton>
      </template>

      <template v-else>
        <div class="rounded-lg bg-neutral-50 border border-neutral-200 px-2.5 py-2 space-y-1">
          <p class="text-[10px] font-mono text-neutral-700 break-all leading-snug" :title="trackUrl">
            {{ trackUrl }}
          </p>
          <p class="text-[10px] text-neutral-400">
            <template v-if="track.last_at">
              Last ping {{ ageLabel(track.last_at) }}
              <span v-if="track.last_accuracy_m != null"> · ±{{ Math.round(track.last_accuracy_m) }}m</span>
            </template>
            <template v-else>Menunggu ping pertama dari HP</template>
            <span v-if="expiresLabel"> · hingga {{ expiresLabel }}</span>
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <UiButton variant="secondary" size="sm" :disabled="acting" @click="copyLink">
            <Icon icon="lucide:copy" class="text-sm" />
            Salin
          </UiButton>
          <button
            type="button"
            class="h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
            :disabled="acting"
            @click="shareWA"
          >
            <Icon icon="mdi:whatsapp" class="text-base" />
            WA
          </button>
        </div>
        <button
          type="button"
          class="w-full text-center text-xs font-medium text-neutral-400 hover:text-neutral-700 py-1 disabled:opacity-50"
          :disabled="acting || !canEdit"
          @click="onDisable"
        >
          Matikan / buat ulang
        </button>
      </template>
    </div>
  </div>
</template>
