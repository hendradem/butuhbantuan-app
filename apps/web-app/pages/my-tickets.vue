<script setup lang="ts">
/**
 * Citizen "Cek tiket saya" flow: input HP → OTP verification → list of tickets
 * from the last 90 days. Token lives 30 min in localStorage so a page reload
 * within the window skips the OTP step.
 */
import { Icon } from "@iconify/vue";

definePageMeta({ layout: false });
useHead({ title: "Tiket saya · ButuhBantuan" });

const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const router = useRouter();

type Step = "phone" | "otp" | "list";
type MyTicket = {
  ticket_number: string;
  public_token?: string;
  unit_name?: string;
  location?: string;
  condition?: string;
  status: string;
  citizen_phase?: string;
  created_at: string;
  completed_at?: string | null;
};

const TOKEN_KEY = "bb-my-tickets-session";
const step = ref<Step>("phone");
const phone = ref("");
const code = ref("");
const sessionToken = ref("");
const requesting = ref(false);
const verifying = ref(false);
const loading = ref(false);
const errorMsg = ref("");
const tickets = ref<MyTicket[]>([]);
const codeExpiresIn = ref(0);
let expiryTimer: ReturnType<typeof setInterval> | null = null;

function normalizePhone(v: string): string {
  return String(v || "").replace(/[^\d+]/g, "");
}
function isValidPhone(v: string): boolean {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

function loadStoredSession(): { token: string; expiresAt: number } | null {
  if (!import.meta.client) return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
function saveSession(token: string, ttlSec: number) {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ token, expiresAt: Date.now() + ttlSec * 1000 }),
    );
  } catch {
    /* ignore */
  }
}
function clearSession() {
  if (!import.meta.client) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function startExpiryCountdown(seconds: number) {
  codeExpiresIn.value = seconds;
  if (expiryTimer) clearInterval(expiryTimer);
  expiryTimer = setInterval(() => {
    if (codeExpiresIn.value > 0) codeExpiresIn.value--;
  }, 1000);
}

const expiryLabel = computed(() => {
  const s = codeExpiresIn.value;
  if (s <= 0) return "Kedaluwarsa";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
});

async function requestOtp() {
  errorMsg.value = "";
  const p = normalizePhone(phone.value);
  if (!isValidPhone(p)) {
    errorMsg.value = "Nomor telepon tidak valid";
    return;
  }
  requesting.value = true;
  try {
    const res = await $fetch<{ data: { expires_in_sec: number } }>(
      `${apiBase}/api/v1/lookup/request-otp`,
      { method: "POST", body: { phone: p } },
    );
    startExpiryCountdown(res.data?.expires_in_sec ?? 300);
    step.value = "otp";
    setTimeout(() => document.getElementById("otp-input")?.focus(), 50);
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 429) errorMsg.value = "Terlalu banyak permintaan. Coba lagi dalam 1 jam.";
    else if (status === 400) errorMsg.value = "Nomor telepon tidak valid";
    else errorMsg.value = e?.data?.message || "Gagal mengirim kode";
  } finally {
    requesting.value = false;
  }
}

async function verifyOtp() {
  errorMsg.value = "";
  if (!/^\d{6}$/.test(code.value.trim())) {
    errorMsg.value = "Kode terdiri dari 6 digit";
    return;
  }
  verifying.value = true;
  try {
    const res = await $fetch<{
      data: { token: string; expires_in_sec: number };
    }>(`${apiBase}/api/v1/lookup/verify-otp`, {
      method: "POST",
      body: { phone: normalizePhone(phone.value), code: code.value.trim() },
    });
    sessionToken.value = res.data.token;
    saveSession(res.data.token, res.data.expires_in_sec);
    await loadTickets();
    step.value = "list";
    if (expiryTimer) clearInterval(expiryTimer);
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 401) errorMsg.value = "Kode salah atau sudah kedaluwarsa";
    else errorMsg.value = e?.data?.message || "Gagal verifikasi";
  } finally {
    verifying.value = false;
  }
}

async function loadTickets() {
  if (!sessionToken.value) return;
  loading.value = true;
  errorMsg.value = "";
  try {
    const res = await $fetch<{ data: MyTicket[] }>(
      `${apiBase}/api/v1/lookup/tickets`,
      { headers: { "X-Lookup-Token": sessionToken.value } },
    );
    tickets.value = Array.isArray(res.data) ? res.data : [];
  } catch (e: any) {
    const status = e?.statusCode || e?.status;
    if (status === 401) {
      resetToPhone();
      errorMsg.value = "Sesi kedaluwarsa. Mohon minta kode lagi.";
    } else {
      errorMsg.value = e?.data?.message || "Gagal memuat tiket";
    }
  } finally {
    loading.value = false;
  }
}

async function logout() {
  const t = sessionToken.value;
  clearSession();
  sessionToken.value = "";
  tickets.value = [];
  resetToPhone();
  if (!t) return;
  try {
    await $fetch(`${apiBase}/api/v1/lookup/logout`, {
      method: "POST",
      headers: { "X-Lookup-Token": t },
    });
  } catch {
    /* ignore */
  }
}

function resetToPhone() {
  step.value = "phone";
  code.value = "";
  if (expiryTimer) clearInterval(expiryTimer);
  codeExpiresIn.value = 0;
}

function openTicket(t: MyTicket) {
  const token = String(t.public_token || "").trim();
  if (!token) return;
  router.push(`/ticket/${encodeURIComponent(token)}`);
}

function statusMeta(s: string): { label: string; tone: string } {
  switch (s) {
    case "pending":
      return { label: "Menunggu", tone: "amber" };
    case "accepted":
      return { label: "Diterima", tone: "blue" };
    case "in_progress":
      return { label: "Ditangani", tone: "blue" };
    case "completed":
      return { label: "Selesai", tone: "emerald" };
    case "cancelled":
      return { label: "Dibatalkan", tone: "neutral" };
    default:
      return { label: s || "—", tone: "neutral" };
  }
}
const toneClasses: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(async () => {
  const stored = loadStoredSession();
  if (stored) {
    sessionToken.value = stored.token;
    await loadTickets();
    if (sessionToken.value) step.value = "list";
  }
});
onUnmounted(() => {
  if (expiryTimer) clearInterval(expiryTimer);
});
</script>

<template>
  <div class="ui-page min-h-screen">
    <div class="ui-topbar">
      <button
        type="button"
        class="ui-close-btn shrink-0"
        aria-label="Kembali"
        @click="router.push('/')"
      >
        <Icon icon="lucide:arrow-left" class="text-lg" />
      </button>
      <div class="min-w-0 flex-1">
        <p class="text-base font-semibold ui-text-primary leading-tight">Tiket saya</p>
        <p class="text-xs ui-text-secondary">Cek tiket darurat dengan nomor telepon</p>
      </div>
      <button
        v-if="step === 'list'"
        type="button"
        class="text-xs font-medium text-primary-600 hover:text-primary-700 shrink-0"
        @click="logout"
      >
        Keluar
      </button>
    </div>

    <div class="flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-sm space-y-3">
        <!-- Step 1 · phone -->
        <section v-if="step === 'phone'" class="ui-card overflow-hidden">
          <div class="px-5 pt-5 pb-3">
            <p class="text-sm font-semibold ui-text-primary">Masukkan nomor telepon</p>
            <p class="mt-0.5 text-xs ui-text-secondary">
              Kami kirim kode verifikasi 6 digit. Kode aktif 5 menit.
            </p>
          </div>
          <div class="px-5 pb-4">
            <label class="text-[11px] ui-text-secondary">Nomor WhatsApp / telepon</label>
            <input
              v-model="phone"
              type="tel"
              inputmode="tel"
              placeholder="08xxxxxxxxxx"
              autocomplete="tel"
              class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-400"
              @keydown.enter="requestOtp"
            >
            <p v-if="errorMsg" class="mt-2 text-xs text-red-500">{{ errorMsg }}</p>
          </div>
          <div class="px-5 pb-5">
            <button
              type="button"
              class="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              :disabled="requesting"
              @click="requestOtp"
            >
              {{ requesting ? "Mengirim…" : "Kirim kode verifikasi" }}
            </button>
          </div>
        </section>

        <!-- Step 2 · OTP -->
        <section v-else-if="step === 'otp'" class="ui-card overflow-hidden">
          <div class="px-5 pt-5 pb-3">
            <p class="text-sm font-semibold ui-text-primary">Masukkan kode verifikasi</p>
            <p class="mt-0.5 text-xs ui-text-secondary">
              6 digit kode dikirim ke <span class="font-medium">{{ phone }}</span>.
            </p>
          </div>
          <div class="px-5 pb-4 space-y-3">
            <div class="space-y-1">
              <label class="text-[11px] ui-text-secondary flex items-center justify-between">
                <span>Kode</span>
                <span
                  class="tabular-nums"
                  :class="codeExpiresIn <= 0 ? 'text-red-500' : 'text-amber-600'"
                >
                  {{ expiryLabel }}
                </span>
              </label>
              <input
                id="otp-input"
                v-model="code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="123456"
                class="w-full rounded-lg border border-neutral-200 px-3 py-3 text-center text-xl tracking-[0.4em] font-semibold focus:outline-none focus:border-neutral-400"
                @keydown.enter="verifyOtp"
              >
            </div>
            <p v-if="errorMsg" class="text-xs text-red-500 text-center">{{ errorMsg }}</p>
          </div>
          <div class="px-5 pb-5 space-y-2">
            <button
              type="button"
              class="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              :disabled="verifying || codeExpiresIn <= 0"
              @click="verifyOtp"
            >
              {{ verifying ? "Verifikasi…" : "Verifikasi" }}
            </button>
            <div class="flex items-center justify-between text-xs">
              <button
                type="button"
                class="ui-text-secondary hover:text-neutral-800"
                @click="resetToPhone"
              >
                Ganti nomor
              </button>
              <button
                type="button"
                class="text-primary-600 font-medium hover:text-primary-700 disabled:opacity-50"
                :disabled="requesting || codeExpiresIn > 240"
                @click="requestOtp"
              >
                Kirim ulang
              </button>
            </div>
          </div>
        </section>

        <!-- Step 3 · list -->
        <template v-else-if="step === 'list'">
          <div v-if="loading" class="ui-card p-5 space-y-3">
            <div class="soft-skel h-4 w-2/3" />
            <div class="soft-skel h-4 w-1/2" />
            <div class="soft-skel h-16 w-full rounded-lg" />
          </div>

          <div v-else-if="!tickets.length" class="ui-card p-8 text-center">
            <Icon icon="lucide:inbox" class="text-neutral-300 text-3xl mx-auto mb-2" />
            <p class="text-sm font-semibold ui-text-primary">Belum ada tiket</p>
            <p class="mt-1 text-xs ui-text-secondary">
              Tidak ada tiket dalam 90 hari terakhir untuk nomor ini.
            </p>
          </div>

          <template v-else>
            <p class="text-[11px] font-medium uppercase tracking-wide ui-text-secondary px-1">
              {{ tickets.length }} tiket dalam 90 hari terakhir
            </p>
            <button
              v-for="t in tickets"
              :key="t.ticket_number"
              type="button"
              class="ui-card w-full text-left overflow-hidden transition-opacity active:opacity-90 disabled:opacity-60"
              :disabled="!t.public_token"
              @click="openTicket(t)"
            >
              <div class="px-4 py-3.5 space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold ui-text-primary truncate">
                      {{ t.unit_name || "Unit darurat" }}
                    </p>
                    <p class="text-[11px] font-mono text-neutral-500">{{ t.ticket_number }}</p>
                  </div>
                  <span
                    class="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset"
                    :class="toneClasses[statusMeta(t.status).tone]"
                  >
                    {{ statusMeta(t.status).label }}
                  </span>
                </div>
                <p v-if="t.location" class="text-xs ui-text-secondary line-clamp-2 leading-snug">
                  <Icon icon="lucide:map-pin" class="text-[11px] mr-1 inline-block align-[-1px]" />
                  {{ t.location }}
                </p>
                <div class="flex items-center justify-between text-[11px] ui-text-secondary">
                  <span>{{ formatDate(t.created_at) }}</span>
                  <span v-if="t.public_token" class="text-primary-600 font-medium inline-flex items-center gap-1">
                    Buka
                    <Icon icon="lucide:chevron-right" class="text-xs" />
                  </span>
                </div>
              </div>
            </button>
          </template>
          <p v-if="errorMsg" class="text-center text-xs text-red-500">{{ errorMsg }}</p>
        </template>
      </div>
    </div>
  </div>
</template>
