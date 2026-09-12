<script setup lang="ts">
/**
 * Citizen e-ticket. One card says what is happening and who is handling it,
 * one map shows the unit moving toward you — nothing else competes with those
 * two while someone is waiting for help.
 */
import { Icon } from "@iconify/vue";
import { appToast } from "~/utils/appToast";
import { CITIZEN_PHASE_HINT } from "~/utils/citizenPhase";
import { clearActiveTicket, loadActiveTicket, saveActiveTicket } from "~/utils/activeTicket";
import { saveTicketAccess } from "~/utils/ticketAccess";
import { ticketDisplayUrl, ticketViewUrl } from "~/utils/ticketUrl";
import { toTicketView, type TicketViewSource } from "~/utils/ticketView";
import { buildUnitWaMessage, waDeepLink } from "~/utils/waContact";

definePageMeta({ layout: false, ssr: false });
useHead({ title: "E-Tiket · ButuhBantuan" });

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const toast = appToast();

const viewToken = computed(() => String(route.params.token || "").trim());
const { phone, load: loadProfile, save: saveProfile } = useRequesterProfile();
loadProfile();

const { ticket, pending, loaded, notFound, isTerminal, refresh } = useTicketLive(viewToken, {
  phone,
});

const verified = computed(() => !!ticket.value?.phone_verified);
const phaseHint = computed(() => CITIZEN_PHASE_HINT[ticket.value?.citizen_phase ?? ""] ?? "");
const ticketNumber = computed(() => String(ticket.value?.ticket_number || "").trim());
const completed = computed(() => ticket.value?.status === "completed");

/**
 * A WA-dispatch unit sees nothing until the citizen sends the message, so this
 * carries the whole report — it is a handoff, not just a way to reach them.
 */
const waHandoffHref = computed(() => {
  const t = ticket.value;
  if (!t?.wa_dispatch || t.status !== "pending") return "";
  const number = String(t.unit_whatsapp || t.unit_phone || "").trim();
  if (!number) return "";
  return waDeepLink(
    number,
    buildUnitWaMessage({
      unitName: t.unit_name,
      ticketNumber: t.ticket_number,
      requesterName: t.requester_name,
      requesterPhone: t.requester_phone,
      address: t.location,
      condition: t.condition,
      lat: t.requester_lat,
      lng: t.requester_lng,
      ticketUrl: ticketViewUrl(viewToken.value),
    }),
  );
});

/** Logo lives in the emergency directory, not the public ticket payload. */
const unitLogo = ref<string | undefined>();
onMounted(() => {
  const active = loadActiveTicket();
  if (active?.token === viewToken.value) unitLogo.value = active.unitLogo;
});

const view = computed(() =>
  ticket.value ? toTicketView(ticket.value, viewToken.value, { unitLogo: unitLogo.value }) : null,
);

// Keep the island pointing at the ticket you opened from a shared link.
watch(ticket, (t) => {
  if (!t || isTerminal.value) return;
  const active = loadActiveTicket();
  if (active?.token === viewToken.value) return;
  saveActiveTicket({
    token: viewToken.value,
    ticketNumber: String(t.ticket_number || ""),
    unitName: String(t.unit_name || ""),
    unitLogo: unitLogo.value,
  });
});

// ── Live map ──────────────────────────────────────────────────────────────────
const showMap = computed(() => {
  const t = ticket.value;
  // A route to a job that already ended is noise, not information.
  if (!t || !verified.value || isTerminal.value) return false;
  return !!(t.requester_lat || t.requester_lng);
});

// ── Verify pelapor phone ──────────────────────────────────────────────────────
const claimPhone = ref("");
const verifying = ref(false);
const claimError = ref("");

watch(phone, (p) => {
  if (p && !claimPhone.value) claimPhone.value = p;
}, { immediate: true });

async function verifyClaim() {
  const p = claimPhone.value.trim();
  if (!p) {
    claimError.value = "Masukkan nomor HP pelapor";
    return;
  }
  verifying.value = true;
  claimError.value = "";
  try {
    const res = await $fetch<{ data: TicketViewSource }>(
      `${config.public.apiBaseUrl}/api/v1/order/view/${encodeURIComponent(viewToken.value)}/verify-phone`,
      { method: "POST", body: { phone: p } },
    );
    if (res?.data?.phone_verified) {
      phone.value = p;
      saveProfile();
      saveTicketAccess(viewToken.value, p);
      ticket.value = res.data;
      toast.success("Tiket terbuka");
    } else {
      claimError.value = "Nomor HP tidak cocok dengan data pelapor";
    }
  } catch (err: unknown) {
    claimError.value =
      (err as { data?: { message?: string } })?.data?.message ||
      "Nomor HP tidak cocok dengan data pelapor";
  } finally {
    verifying.value = false;
  }
}

// ── Share ─────────────────────────────────────────────────────────────────────
async function shareTicket() {
  const url = ticketViewUrl(viewToken.value);
  try {
    if (navigator.share) {
      await navigator.share({
        title: "E-Tiket ButuhBantuan",
        text: "Pantau status permintaan bantuan darurat. Buka dengan nomor HP pelapor.",
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link e-tiket disalin");
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "AbortError") return;
    toast.error("Gagal membagikan link");
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(ticketViewUrl(viewToken.value));
    toast.success("Link e-tiket disalin");
  } catch {
    toast.error("Gagal menyalin link");
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────
const {
  supported: pushSupported,
  subscribed: pushSubscribed,
  loading: pushLoading,
  subscribe: pushSubscribe,
  unsubscribe: pushUnsubscribe,
} = useWebPush(ticketNumber);

const pushVisible = computed(() => pushSupported.value && !!ticket.value && !isTerminal.value);

function togglePush() {
  if (pushLoading.value) return;
  void (pushSubscribed.value ? pushUnsubscribe() : pushSubscribe());
}

// ── Review, once the unit is done ─────────────────────────────────────────────
const reviewKey = computed(() => `bb-reviewed-${viewToken.value}`);
const reviewed = ref(false);
const helpful = ref<boolean | null>(null);
const reviewComment = ref("");
const sendingReview = ref(false);

onMounted(() => {
  reviewed.value = !!localStorage.getItem(reviewKey.value);
});

async function submitReview() {
  if (helpful.value === null || !verified.value) return;
  sendingReview.value = true;
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/v1/feedback/`, {
      method: "POST",
      body: {
        emergency_id: ticket.value?.emergency_uuid,
        emergency_uuid: ticket.value?.emergency_uuid,
        ticket_number: ticketNumber.value,
        requester_phone: phone.value,
        unit_name: ticket.value?.unit_name ?? "",
        unit_helpful: helpful.value,
        comment: reviewComment.value.trim(),
      },
    });
    localStorage.setItem(reviewKey.value, "1");
    reviewed.value = true;
    toast.success("Terima kasih atas penilaianmu");
  } catch {
    toast.error("Gagal mengirim penilaian");
  } finally {
    sendingReview.value = false;
  }
}

// ── Leaving ───────────────────────────────────────────────────────────────────
const leaving = ref(false);

function confirmLeave() {
  leaving.value = false;
  if (isTerminal.value) clearActiveTicket();
  void router.push("/");
}

const refreshing = ref(false);
async function manualRefresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  await refresh();
  refreshing.value = false;
}
</script>

<template>
  <div class="eticket">
    <OpenInAppBanner />

    <header class="eticket-bar">
      <button type="button" class="eticket-icon-btn" aria-label="Kembali" @click="leaving = true">
        <Icon icon="lucide:arrow-left" />
      </button>
      <p class="eticket-bar-title">E-Tiket</p>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="eticket-icon-btn"
          aria-label="Muat ulang"
          :disabled="refreshing"
          @click="manualRefresh"
        >
          <Icon icon="lucide:refresh-cw" :class="refreshing && 'animate-spin'" />
        </button>
        <button
          v-if="pushVisible"
          type="button"
          class="eticket-icon-btn"
          :class="pushSubscribed && 'eticket-icon-btn--on'"
          :aria-label="pushSubscribed ? 'Matikan notifikasi' : 'Aktifkan notifikasi'"
          :disabled="pushLoading"
          @click="togglePush"
        >
          <Icon
            :icon="pushLoading ? 'lucide:loader-2' : pushSubscribed ? 'lucide:bell-ring' : 'lucide:bell'"
            :class="pushLoading && 'animate-spin'"
          />
        </button>
        <button type="button" class="eticket-icon-btn" aria-label="Bagikan" @click="shareTicket">
          <Icon icon="lucide:share-2" />
        </button>
      </div>
    </header>

    <main class="eticket-main">
      <!-- Loading -->
      <div v-if="pending && !ticket" class="eticket-panel space-y-4">
        <div class="flex items-center gap-3">
          <div class="soft-skel h-[52px] w-[52px] rounded-2xl" />
          <div class="flex-1 space-y-2">
            <div class="soft-skel h-4 w-32" />
            <div class="soft-skel h-3 w-24" />
          </div>
        </div>
        <div class="soft-skel h-1.5 w-full rounded-full" />
        <div class="soft-skel h-11 w-full rounded-xl" />
      </div>

      <!-- Not found -->
      <div v-else-if="loaded && notFound" class="eticket-panel text-center">
        <Icon icon="lucide:file-x" class="mx-auto mb-3 text-4xl" style="color: var(--bb-text-tertiary)" />
        <p class="m-0 font-semibold">Tiket tidak ditemukan</p>
        <p class="eticket-note mt-1">Link tidak valid atau sudah kedaluwarsa.</p>
        <NuxtLink to="/" class="eticket-link mt-4 inline-flex">Kembali ke aplikasi</NuxtLink>
      </div>

      <template v-else-if="view">
        <TicketStatusCard :view="view" class="eticket-card" />

        <p v-if="phaseHint" class="eticket-hint">{{ phaseHint }}</p>

        <!-- Units without a dashboard only find out when the citizen sends WA. -->
        <section v-if="waHandoffHref" class="eticket-panel eticket-panel--alert">
          <p class="m-0 font-semibold">Kirim WhatsApp ke unit</p>
          <p class="eticket-note mt-1">
            {{ ticket?.unit_name }} belum punya dashboard. Mereka baru tahu laporan ini setelah
            kamu mengirim pesan.
          </p>
          <a :href="waHandoffHref" target="_blank" rel="noopener noreferrer" class="eticket-wa-btn">
            <Icon icon="ic:baseline-whatsapp" class="text-xl" />
            Kirim sekarang
          </a>
        </section>

        <!-- Live route: unit → you -->
        <TicketLiveMap
          v-if="showMap"
          :requester-lat="Number(ticket?.requester_lat) || 0"
          :requester-lng="Number(ticket?.requester_lng) || 0"
          :responder-lat="Number(ticket?.responder_lat) || 0"
          :responder-lng="Number(ticket?.responder_lng) || 0"
          :unit-lat="Number(ticket?.unit_lat) || 0"
          :unit-lng="Number(ticket?.unit_lng) || 0"
          :updated-at="(ticket?.responder_updated_at as string) || null"
          height="17rem"
        />

        <!-- Unlock details on a device that has not verified yet -->
        <form v-if="!verified" class="eticket-panel" @submit.prevent="verifyClaim">
          <p class="m-0 font-semibold">Buka detail tiket</p>
          <p class="eticket-note mt-1">
            Masukkan nomor HP pelapor untuk melihat lokasi, rute petugas, dan kontak unit.
          </p>
          <input
            v-model="claimPhone"
            type="tel"
            inputmode="tel"
            placeholder="08xxxxxxxxxx"
            class="eticket-input"
            :aria-invalid="!!claimError"
          />
          <p v-if="claimError" class="eticket-error">{{ claimError }}</p>
          <button type="submit" class="eticket-submit" :disabled="verifying">
            {{ verifying ? "Memeriksa…" : "Buka tiket" }}
          </button>
        </form>

        <!-- What was reported -->
        <section v-else-if="ticket?.location || ticket?.condition" class="eticket-panel">
          <p class="m-0 font-semibold">Laporan kamu</p>
          <dl class="eticket-row">
            <template v-if="ticket?.location">
              <dt>Lokasi</dt>
              <dd>{{ ticket.location }}</dd>
            </template>
            <template v-if="ticket?.condition">
              <dt :class="ticket?.location && 'mt-3'">Kondisi</dt>
              <dd><TicketConditionBlock embedded :condition="ticket.condition" /></dd>
            </template>
          </dl>
        </section>

        <!-- Review, after the unit finished -->
        <section v-if="completed && verified && !reviewed" class="eticket-panel">
          <p class="m-0 font-semibold">Bagaimana penanganannya?</p>
          <p class="eticket-note mt-1">Penilaianmu membantu kami menjaga kualitas unit.</p>
          <div class="eticket-choice">
            <button
              type="button"
              :class="helpful === true && 'is-on'"
              :aria-pressed="helpful === true"
              @click="helpful = true"
            >
              <Icon icon="lucide:thumbs-up" /> Terbantu
            </button>
            <button
              type="button"
              :class="helpful === false && 'is-on'"
              :aria-pressed="helpful === false"
              @click="helpful = false"
            >
              <Icon icon="lucide:thumbs-down" /> Kurang
            </button>
          </div>
          <textarea
            v-model="reviewComment"
            rows="2"
            placeholder="Catatan (opsional)"
            class="eticket-input"
          />
          <button
            type="button"
            class="eticket-submit"
            :disabled="helpful === null || sendingReview"
            @click="submitReview"
          >
            {{ sendingReview ? "Mengirim…" : "Kirim penilaian" }}
          </button>
        </section>

        <!-- Share link -->
        <section class="eticket-panel">
          <p class="m-0 font-semibold">Link e-tiket</p>
          <p class="eticket-note mt-1">Bagikan ke keluarga supaya mereka bisa ikut memantau.</p>
          <div class="eticket-url">
            <span>{{ ticketDisplayUrl(viewToken) }}</span>
            <button type="button" aria-label="Salin link" @click="copyLink">
              <Icon icon="lucide:copy" />
            </button>
          </div>
        </section>
      </template>
    </main>

    <!-- Leaving hides a running ticket — say where to find it again. -->
    <Teleport to="body">
      <Transition name="overlay">
        <div v-if="leaving" class="eticket-dialog-layer" @click.self="leaving = false">
          <div class="eticket-dialog" role="dialog" aria-modal="true" aria-labelledby="leave-title">
            <h2 id="leave-title">Tutup e-tiket?</h2>
            <p>
              Tiketmu tetap berjalan. Buka lagi lewat link yang sama, atau menu Lainnya → Tiket saya.
            </p>
            <div class="eticket-dialog-actions">
              <button type="button" class="eticket-btn" @click="leaving = false">Batal</button>
              <button type="button" class="eticket-btn eticket-btn--primary" @click="confirmLeave">
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.eticket {
  min-height: 100vh;
  background: var(--bb-bg-page);
  color: var(--bb-text);
}

.eticket-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--bb-border);
  background: color-mix(in srgb, var(--bb-bg-surface) 92%, transparent);
  backdrop-filter: blur(12px);
}
.eticket-bar-title {
  flex: 1;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.eticket-icon-btn {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--bb-bg-muted);
  color: var(--bb-text-secondary);
  font-size: 17px;
}
.eticket-icon-btn:disabled {
  opacity: 0.6;
}
.eticket-icon-btn--on {
  background: var(--bb-accent-soft);
  color: var(--bb-accent);
}

.eticket-main {
  display: flex;
  max-width: 28rem;
  flex-direction: column;
  gap: 12px;
  margin: 0 auto;
  padding: 14px 14px 40px;
}

.eticket-card {
  box-shadow: var(--bb-shadow-soft);
}

.eticket-hint {
  margin: -2px 4px 2px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--bb-text-secondary);
}

.eticket-panel {
  padding: 16px;
  border-radius: var(--bb-radius-card);
  background: var(--bb-bg-surface);
  font-size: 14.5px;
}
.eticket-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--bb-text-secondary);
}
.eticket-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--bb-accent);
}

.eticket-row {
  margin: 12px 0 0;
}
.eticket-row dt {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--bb-text-tertiary);
}
.eticket-row dd {
  margin: 3px 0 0;
  font-size: 14px;
  line-height: 1.45;
}

.eticket-input {
  width: 100%;
  margin-top: 12px;
  padding: 11px 13px;
  border: 1px solid var(--bb-border-strong);
  border-radius: var(--bb-radius-control);
  background: var(--bb-bg-surface);
  font-size: 15px;
  color: var(--bb-text);
}
.eticket-error {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--bb-danger);
}
.eticket-submit {
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border-radius: var(--bb-radius-control);
  background: var(--bb-accent);
  font-size: 15px;
  font-weight: 600;
  color: var(--bb-accent-contrast);
}
.eticket-submit:disabled {
  opacity: 0.65;
}

.eticket-panel--alert {
  border: 1px solid #fde68a;
  background: #fffbeb;
}
.eticket-wa-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border-radius: var(--bb-radius-control);
  background: #25d366;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.eticket-choice {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}
.eticket-choice button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--bb-border-strong);
  border-radius: var(--bb-radius-control);
  background: var(--bb-bg-surface);
  font-size: 14px;
  font-weight: 600;
  color: var(--bb-text-secondary);
}
.eticket-choice button.is-on {
  border-color: transparent;
  background: var(--bb-accent-soft);
  color: var(--bb-accent);
}

.eticket-url {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 10px 10px 13px;
  border-radius: var(--bb-radius-control);
  background: var(--bb-bg-muted);
}
.eticket-url span {
  flex: 1;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--bb-text-secondary);
}
.eticket-url button {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--bb-bg-surface);
  color: var(--bb-text-secondary);
  font-size: 15px;
}

/* ── Leave dialog ────────────────────────────────────────────────────────── */
.eticket-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bb-overlay);
}
.eticket-dialog {
  width: 100%;
  max-width: 320px;
  padding: 20px;
  border-radius: var(--bb-radius-card);
  background: var(--bb-bg-surface);
  box-shadow: 0 24px 48px -16px rgba(26, 28, 46, 0.4);
}
.eticket-dialog h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.eticket-dialog p {
  margin: 8px 0 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--bb-text-secondary);
}
.eticket-dialog-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}
.eticket-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--bb-border-strong);
  border-radius: var(--bb-radius-control);
  background: var(--bb-bg-surface);
  font-size: 14px;
  font-weight: 600;
  color: var(--bb-text);
}
.eticket-btn--primary {
  border-color: transparent;
  background: var(--bb-text);
  color: var(--bb-bg-surface);
}
</style>
