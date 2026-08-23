<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";
import type { SarMission, SarShareInfo } from "~/composables/useSarApi";

const props = defineProps<{
  mission: SarMission | null;
}>();

const emit = defineEmits<{
  refreshed: [];
}>();

const config = useRuntimeConfig();
const webAppUrl = (config.public.webAppUrl as string) || "http://localhost:3000";
const { getShare, enableShare, disableShare } = useSarApi();

const acting = ref(false);
const share = ref<SarShareInfo | null>(null);

function publicAppOrigin(): string {
  let base = String(webAppUrl || "http://localhost:3000").trim().replace(/\/$/, "");
  try {
    const u = new URL(base.includes("://") ? base : `http://${base}`);
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      u.protocol = "http:";
    }
    return u.origin;
  } catch {
    return base.replace(/^https:\/\//i, "http://");
  }
}

const missionId = computed(() => props.mission?.id || "");

const shareUrl = computed(() => {
  const token = share.value?.share_token || props.mission?.share_token || "";
  if (!token) return "";
  return `${publicAppOrigin()}/sar/${token}`;
});

const isActive = computed(() => {
  if (share.value) return share.value.active;
  const exp = props.mission?.share_expires_at;
  const tok = props.mission?.share_token;
  if (!tok || !exp) return false;
  return new Date(exp).getTime() > Date.now();
});

async function refreshShare() {
  const id = missionId.value;
  if (!id) {
    share.value = null;
    return;
  }
  try {
    share.value = await getShare(id);
  } catch {
    share.value = {
      mission_id: id,
      share_token: props.mission?.share_token,
      share_enabled_at: props.mission?.share_enabled_at,
      share_expires_at: props.mission?.share_expires_at,
      active: isActive.value,
    };
  }
}

watch(
  () => [props.mission?.id, props.mission?.share_token, props.mission?.share_expires_at],
  () => {
    void refreshShare();
  },
  { immediate: true },
);

async function onEnable() {
  const id = missionId.value;
  if (!id || acting.value) return;
  acting.value = true;
  try {
    const info = await enableShare(id, 72);
    share.value = info;
    toast.success("Link publik view-only siap (72 jam)");
    // Keep local token even if parent refresh briefly omits share_token.
    emit("refreshed");
    await nextTick();
    if (!share.value?.share_token && info.share_token) {
      share.value = info;
    }
  } catch (e: any) {
    const status = e?.statusCode || e?.status || e?.response?.status;
    const msg =
      e?.data?.message ||
      (status === 404
        ? "API share belum aktif — restart `make dev` di apps/api"
        : null) ||
      "Gagal membuat link";
    toast.error(msg);
  } finally {
    acting.value = false;
  }
}

async function onDisable() {
  const id = missionId.value;
  if (!id || acting.value) return;
  acting.value = true;
  try {
    share.value = await disableShare(id);
    toast.success("Link publik dinonaktifkan");
    emit("refreshed");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal menonaktifkan");
  } finally {
    acting.value = false;
  }
}

async function copyLink() {
  if (!shareUrl.value) await onEnable();
  const url = shareUrl.value;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link disalin");
  } catch {
    toast.error("Gagal menyalin");
  }
}

async function shareWA() {
  if (!shareUrl.value) await onEnable();
  const url = shareUrl.value;
  if (!url) return;
  const name = props.mission?.name || "ESAR";
  const text = encodeURIComponent(
    [`Peta SRU (view only) — ${name}`, url].join("\n"),
  );
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}

const expiresLabel = computed(() => {
  const exp = share.value?.share_expires_at || props.mission?.share_expires_at;
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
</script>

<template>
  <div class="space-y-2">
    <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
      Share publik
    </p>
    <p class="text-xs text-neutral-500 leading-relaxed">
      Link view-only untuk stakeholder — tanpa login, tanpa edit.
    </p>

    <template v-if="!shareUrl || !isActive">
      <UiButton class="w-full" size="sm" :disabled="acting || !missionId" @click="onEnable">
        <Icon :icon="acting ? 'lucide:loader-2' : 'lucide:link'" :class="acting ? 'animate-spin text-sm' : 'text-sm'" />
        {{ acting ? "Menyiapkan…" : "Buat link share" }}
      </UiButton>
    </template>

    <template v-else>
      <div class="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
          <span v-if="expiresLabel" class="text-[10px] text-neutral-400">hingga {{ expiresLabel }}</span>
        </div>
        <p class="mt-1 text-xs font-mono text-neutral-800 break-all leading-snug" :title="shareUrl">
          {{ shareUrl }}
        </p>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <UiButton variant="secondary" size="sm" @click="copyLink">
          <Icon icon="lucide:copy" class="text-sm" />
          Salin
        </UiButton>
        <button
          type="button"
          class="h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
          @click="shareWA"
        >
          <Icon icon="mdi:whatsapp" class="text-base" />
          WA
        </button>
      </div>
      <button
        type="button"
        class="w-full text-center text-xs font-medium text-neutral-400 hover:text-neutral-700 py-1 disabled:opacity-50"
        :disabled="acting"
        @click="onDisable"
      >
        Matikan / buat ulang
      </button>
    </template>
  </div>
</template>
