<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: false });
useHead({ title: "Klaim Bantuan · ButuhBantuan" });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const claimToken = computed(() => String(route.params.token || "").trim());

type ClaimInfo = {
  ticket_number: string;
  unit_name: string;
  location: string;
  condition: string;
  claim_expires_at?: string | null;
  status: string;
};

const info = ref<ClaimInfo | null>(null);
const loading = ref(true);
const loadError = ref("");
const alreadyClaimed = ref(false);

const volunteerName = ref("");
const volunteerPhone = ref("");
const claiming = ref(false);
const claimError = ref("");
const claimed = ref(false);

async function loadClaim() {
  loading.value = true;
  loadError.value = "";
  try {
    const res = await fetch(`${apiBase}/api/v1/claim/${claimToken.value}`, {
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 409) {
      alreadyClaimed.value = true;
      return;
    }
    if (!res.ok) throw new Error("Gagal memuat informasi kejadian");
    const json = (await res.json()) as { data?: ClaimInfo };
    info.value = json?.data ?? null;
  } catch (e: any) {
    loadError.value = e?.message || "Terjadi kesalahan";
  } finally {
    loading.value = false;
  }
}

async function submitClaim() {
  const name = volunteerName.value.trim();
  if (!name) {
    claimError.value = "Nama wajib diisi";
    return;
  }
  claiming.value = true;
  claimError.value = "";
  try {
    const res = await fetch(`${apiBase}/api/v1/claim/${claimToken.value}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: volunteerPhone.value.trim() }),
    });
    if (res.status === 409) {
      claimError.value = "Link sudah digunakan oleh relawan lain.";
      return;
    }
    if (!res.ok) throw new Error("Gagal mengklaim tiket");
    claimed.value = true;
  } catch (e: any) {
    claimError.value = e?.message || "Terjadi kesalahan";
  } finally {
    claiming.value = false;
  }
}

const expiresIn = ref("");
function updateExpiry() {
  if (!info.value?.claim_expires_at) return;
  const diff = Math.max(0, new Date(info.value.claim_expires_at).getTime() - Date.now());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  expiresIn.value = diff > 0 ? `${m}:${String(s).padStart(2, "0")}` : "Kedaluwarsa";
}

let expiryInterval: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  loadClaim();
  expiryInterval = setInterval(updateExpiry, 1000);
});
onBeforeUnmount(() => {
  if (expiryInterval) clearInterval(expiryInterval);
});
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex items-start justify-center pt-10 px-4 pb-10">
    <div class="w-full max-w-md space-y-4">
      <!-- Header -->
      <div class="text-center">
        <p class="text-xs font-semibold tracking-widest text-neutral-400 uppercase">ButuhBantuan</p>
        <h1 class="text-lg font-bold text-neutral-900 mt-1">Klaim Bantuan Komunitas</h1>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="rounded-2xl bg-white border border-neutral-200 p-6 space-y-3">
        <div class="soft-skel h-4 w-40" />
        <div class="soft-skel h-3 w-full" />
        <div class="soft-skel h-3 w-3/4" />
      </div>

      <!-- Already claimed / expired -->
      <div
        v-else-if="alreadyClaimed"
        class="rounded-2xl bg-white border border-neutral-200 p-6 text-center space-y-2"
      >
        <Icon icon="lucide:alert-circle" class="text-3xl text-amber-400 mx-auto" />
        <p class="text-sm font-medium text-neutral-700">Link sudah tidak berlaku</p>
        <p class="text-xs text-neutral-500">Link ini sudah digunakan atau sudah kedaluwarsa.</p>
      </div>

      <!-- Load error -->
      <div
        v-else-if="loadError"
        class="rounded-2xl bg-white border border-red-100 p-6 text-center space-y-2"
      >
        <Icon icon="lucide:wifi-off" class="text-3xl text-red-400 mx-auto" />
        <p class="text-sm text-red-600">{{ loadError }}</p>
      </div>

      <!-- Success claimed -->
      <div
        v-else-if="claimed"
        class="rounded-2xl bg-green-50 border border-green-200 p-6 text-center space-y-3"
      >
        <Icon icon="lucide:check-circle-2" class="text-4xl text-green-500 mx-auto" />
        <p class="text-base font-bold text-green-800">Terima kasih!</p>
        <p class="text-sm text-green-700">Anda berhasil mengklaim pesanan ini. Segera menuju lokasi kejadian.</p>
        <div v-if="info" class="text-left rounded-xl border border-green-200 bg-white p-3 space-y-1">
          <p class="text-xs text-neutral-500">Lokasi kejadian</p>
          <p class="text-sm font-medium text-neutral-800">{{ info.location }}</p>
        </div>
      </div>

      <!-- Claim form -->
      <template v-else-if="info">
        <!-- Incident info card -->
        <div class="rounded-2xl bg-white border border-neutral-200 p-5 space-y-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-xs text-neutral-400">Unit</p>
              <p class="text-sm font-semibold text-neutral-800">{{ info.unit_name }}</p>
            </div>
            <div v-if="expiresIn" class="text-right shrink-0">
              <p class="text-[10px] text-neutral-400">Berakhir dalam</p>
              <p
                class="text-sm font-bold tabular-nums"
                :class="expiresIn === 'Kedaluwarsa' ? 'text-red-500' : 'text-amber-600'"
              >
                {{ expiresIn }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-neutral-400">Lokasi</p>
            <p class="text-sm text-neutral-700">{{ info.location }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-neutral-400">Kondisi / keterangan</p>
            <p class="text-sm text-neutral-700">{{ info.condition || "Tidak ada keterangan tambahan" }}</p>
          </div>
        </div>

        <!-- Volunteer form -->
        <div class="rounded-2xl bg-white border border-neutral-200 p-5 space-y-4">
          <p class="text-sm font-semibold text-neutral-800">Isi data Anda untuk mengklaim</p>
          <div class="space-y-3">
            <div class="space-y-1">
              <label class="text-xs text-neutral-500">
                Nama lengkap <span class="text-red-500">*</span>
              </label>
              <input
                v-model="volunteerName"
                type="text"
                placeholder="Masukkan nama Anda"
                class="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-neutral-500">Nomor HP (opsional)</label>
              <input
                v-model="volunteerPhone"
                type="tel"
                placeholder="08xx xxxx xxxx"
                class="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition"
              />
            </div>
          </div>
          <p v-if="claimError" class="text-xs text-red-500">{{ claimError }}</p>
          <button
            type="button"
            class="w-full rounded-xl bg-blue-600 text-white text-sm font-semibold px-4 py-3 hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-50"
            :disabled="claiming || !volunteerName.trim()"
            @click="submitClaim"
          >
            {{ claiming ? "Mengklaim..." : "Saya Bisa Bantu →" }}
          </button>
          <p class="text-[11px] text-neutral-400 text-center">
            Dengan mengklaim, Anda setuju untuk segera menuju lokasi kejadian.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
