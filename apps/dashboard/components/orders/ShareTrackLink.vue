<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";

const props = defineProps<{
  order: any | null;
  mode: "admin" | "unit";
}>();

const emit = defineEmits<{
  refreshed: [];
}>();

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const webAppUrl = (config.public.webAppUrl as string) || "http://localhost:3000";

/** Dev servers are HTTP-only — avoid https://localhost which triggers ERR_SSL_PROTOCOL_ERROR. */
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

// Resolve auth in setup (always call both; use the one matching mode).
const { token: adminToken } = useAuth();
const { unitHeaders } = useUnitAuth();

const acting = ref(false);
const localToken = ref("");

function storageKey(orderId: string) {
  return `bb-track-token:${orderId}`;
}

function readStoredToken(orderId: string): string {
  if (!import.meta.client || !orderId) return "";
  try {
    return sessionStorage.getItem(storageKey(orderId)) || "";
  } catch {
    return "";
  }
}

function storeToken(orderId: string, token: string) {
  if (!import.meta.client || !orderId) return;
  try {
    if (token) sessionStorage.setItem(storageKey(orderId), token);
    else sessionStorage.removeItem(storageKey(orderId));
  } catch {
    // ignore quota / private mode
  }
}

const canShare = computed(() => {
  const s = props.order?.status;
  return s === "accepted" || s === "in_progress";
});

const orderId = computed(() => String(props.order?.id || ""));

const serverTrackActive = computed(() => {
  const enabled = props.order?.track_enabled_at;
  const expires = props.order?.track_expires_at;
  if (!enabled || !expires) return false;
  return new Date(expires).getTime() > Date.now();
});

const effectiveToken = computed(
  () => localToken.value || props.order?.track_token || ""
);

const trackUrl = computed(() => {
  const token = effectiveToken.value;
  if (!token) return "";
  return `${publicAppOrigin()}/track/${token}`;
});

/** True when we can show / copy the share URL (local, session, or server token). */
const hasShareableLink = computed(() => !!effectiveToken.value);

function authHeaders(): Record<string, string> {
  if (props.mode === "admin") {
    return adminToken.value ? { "X-Admin-Key": adminToken.value } : {};
  }
  return unitHeaders();
}

function apiPrefix() {
  return props.mode === "admin" ? "/api/v1/admin/orders" : "/api/v1/unit/orders";
}

function syncTokenFromOrder() {
  const id = orderId.value;
  if (!id) {
    localToken.value = "";
    return;
  }
  const fromOrder = String(props.order?.track_token || "").trim();
  const fromStore = readStoredToken(id);
  // Prefer server → session → in-memory so a refresh without token in payload
  // does not wipe a link we just created.
  const next = fromOrder || fromStore || localToken.value || "";
  localToken.value = next;
  if (fromOrder && fromOrder !== fromStore) {
    storeToken(id, fromOrder);
  }
}

watch(
  () => [props.order?.id, props.order?.track_token, props.order?.track_enabled_at],
  () => syncTokenFromOrder(),
  { immediate: true }
);

async function enableTrack() {
  const id = orderId.value;
  if (!id) {
    toast.error("ID pesanan tidak ditemukan — refresh halaman lalu coba lagi");
    return;
  }
  if (acting.value) return;

  const headers = authHeaders();
  if (Object.keys(headers).length === 0) {
    toast.error(
      props.mode === "admin"
        ? "Sesi admin tidak ditemukan — login ulang"
        : "Sesi unit tidak ditemukan — login ulang"
    );
    return;
  }

  acting.value = true;
  try {
    const res = await $fetch<{ data: any; message?: string }>(
      `${baseUrl}${apiPrefix()}/${id}/track/enable`,
      { method: "POST", headers }
    );
    const token = String(res?.data?.track_token || "").trim();
    if (!token) {
      toast.error("Link dibuat tapi token kosong — coba lagi");
      return;
    }
    localToken.value = token;
    storeToken(id, token);
    toast.success("Link lokasi petugas siap");
    // Keep local token across parent refresh (order may omit track_token briefly).
    await nextTick();
    emit("refreshed");
    // Re-assert after refresh so Salin/WA stay visible even if payload strips token.
    await nextTick();
    if (!localToken.value) {
      localToken.value = token;
      storeToken(id, token);
    }
  } catch (e: any) {
    const msg =
      e?.data?.message ||
      e?.statusMessage ||
      (e?.statusCode === 401 || e?.status === 401
        ? "Tidak terautentikasi — login ulang"
        : null) ||
      "Gagal membuat link";
    toast.error(msg);
  } finally {
    acting.value = false;
  }
}

async function disableTrack() {
  const id = orderId.value;
  if (!id || acting.value) return;

  const headers = authHeaders();
  if (Object.keys(headers).length === 0) {
    toast.error("Sesi tidak ditemukan — login ulang");
    return;
  }

  acting.value = true;
  try {
    await $fetch(`${baseUrl}${apiPrefix()}/${id}/track/disable`, {
      method: "POST",
      headers,
    });
    localToken.value = "";
    storeToken(id, "");
    toast.success("Link dinonaktifkan");
    emit("refreshed");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal menonaktifkan link");
  } finally {
    acting.value = false;
  }
}

async function copyLink() {
  if (!trackUrl.value) {
    await enableTrack();
  }
  const url = trackUrl.value;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link disalin");
  } catch {
    toast.error("Gagal menyalin — salin manual dari kotak link");
  }
}

async function shareWA() {
  if (!trackUrl.value) {
    await enableTrack();
  }
  const url = trackUrl.value;
  if (!url) return;
  const o = props.order;
  const text = encodeURIComponent(
    [
      `Lokasi live tiket ${o?.ticket_number || ""}`,
      `Buka di HP petugas, lalu izinkan GPS:`,
      url,
    ].join("\n"),
  );
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <div v-if="canShare" class="space-y-2">
    <!-- Belum ada link -->
    <template v-if="!hasShareableLink">
      <button
        type="button"
        class="w-full h-11 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 active:scale-[0.99] transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
        :disabled="acting"
        @click.stop.prevent="enableTrack"
      >
        <Icon
          :icon="acting ? 'lucide:loader-2' : 'lucide:link'"
          :class="acting ? 'animate-spin text-sm' : 'text-sm'"
        />
        {{ acting ? "Menyiapkan…" : "Buat link share lokasi" }}
      </button>
    </template>

    <!-- Link siap -->
    <template v-else>
      <div class="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            Link aktif
          </p>
          <span
            v-if="serverTrackActive"
            class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
        <p class="mt-1 text-xs font-mono text-neutral-800 break-all leading-snug" :title="trackUrl">
          {{ trackUrl }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          @click.stop.prevent="copyLink"
        >
          <Icon icon="lucide:copy" class="text-sm" />
          Salin
        </button>
        <button
          type="button"
          class="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
          @click.stop.prevent="shareWA"
        >
          <Icon icon="mdi:whatsapp" class="text-base" />
          Kirim WA
        </button>
      </div>
      <button
        type="button"
        class="w-full text-center text-xs font-medium text-neutral-400 hover:text-neutral-700 py-1 disabled:opacity-50"
        :disabled="acting"
        @click.stop.prevent="disableTrack"
      >
        Buat ulang / matikan link
      </button>
    </template>
  </div>
</template>
