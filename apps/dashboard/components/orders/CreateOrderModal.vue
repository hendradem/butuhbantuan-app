<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";

const props = defineProps<{
  mode: "admin" | "unit";
  emergencies?: any[];
  emergencyUUID?: string;
  unitName?: string;
}>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  created: [order: any];
}>();

const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const webAppUrl = (config.public.webAppUrl as string) || "http://localhost:3000";

const { post, get } = useApi();
const { unitHeaders } = useUnitAuth();

const saving = ref(false);
const sendWA = ref(true);
const simulate = ref(false);
const form = reactive({
  emergency_uuid: "",
  requester_name: "",
  requester_phone: "",
  location: "",
  condition: "",
  requester_lat: 0,
  requester_lng: 0,
});
const errorMsg = ref("");

const locQuery = ref("");
const locResults = ref<any[]>([]);
const locLoading = ref(false);
const locPicked = ref(false);
let locTimer: ReturnType<typeof setTimeout> | null = null;

watch(open, (v) => {
  if (!v) return;
  errorMsg.value = "";
  form.requester_name = "";
  form.requester_phone = "";
  form.location = "";
  form.condition = "";
  form.requester_lat = 0;
  form.requester_lng = 0;
  locQuery.value = "";
  locResults.value = [];
  locPicked.value = false;
  sendWA.value = true;
  simulate.value = false;
  form.emergency_uuid = props.mode === "unit"
    ? String(props.emergencyUUID || "")
    : String(props.emergencies?.[0]?.id || "");
});

function fillSimulateDefaults() {
  if (!simulate.value || props.mode !== "admin") return;
  if (!form.requester_name.trim()) form.requester_name = "Simulasi QA";
  if (!form.requester_phone.trim()) form.requester_phone = "081234567890";
  if (!form.condition.trim()) {
    form.condition = "[SIMULASI] Tiket uji — abaikan / batalkan setelah QA.";
  }
  sendWA.value = false;
}

watch(simulate, (v) => {
  if (v) fillSimulateDefaults();
});

const emergencySelectOptions = computed(() =>
  (props.emergencies ?? []).map((e: any) => ({
    value: String(e.id),
    label: `${e.name || "Unit"} · ${e.address?.regency || e.address?.city || "—"}`,
  })),
);

function close() {
  open.value = false;
}

function toWaDigits(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.length >= 9 && digits.length <= 13) return `62${digits}`;
  return digits;
}

function onSearchUpdate(v: string) {
  locQuery.value = v;
  locPicked.value = false;
  form.location = "";
  form.requester_lat = 0;
  form.requester_lng = 0;
  if (locTimer) clearTimeout(locTimer);
  const q = v.trim();
  if (q.length < 3) {
    locResults.value = [];
    return;
  }
  locTimer = setTimeout(async () => {
    locLoading.value = true;
    try {
      const res = await get<{ data: any[] }>(`/api/v1/geocoding/search?q=${encodeURIComponent(q)}`);
      locResults.value = res.data ?? [];
    } catch {
      locResults.value = [];
    } finally {
      locLoading.value = false;
    }
  }, 350);
}

function pickLocation(item: any) {
  const lat = parseFloat(String(item.lat ?? ""));
  const lng = parseFloat(String(item.lon ?? ""));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  form.requester_lat = lat;
  form.requester_lng = lng;
  form.location = String(item.display_name || locQuery.value);
  locQuery.value = form.location;
  locResults.value = [];
  locPicked.value = true;
}

function openTicketWA(order: any) {
  const phone = toWaDigits(order.requester_phone || form.requester_phone);
  if (!phone) return;
  const ticketUrl = `${webAppUrl.replace(/\/$/, "")}/ticket/${order.ticket_number}`;
  const mapsUrl = form.requester_lat && form.requester_lng
    ? `https://www.google.com/maps?q=${form.requester_lat},${form.requester_lng}`
    : "";
  const unit = order.unit_name || props.unitName || "unit layanan";
  const lines = [
    `Halo *${order.requester_name || form.requester_name}*,`,
    ``,
    `Laporan darurat Anda sudah kami catat.`,
    ``,
    `📋 *No. Tiket:* ${order.ticket_number}`,
    `🚑 *Unit:* ${unit}`,
    form.location ? `📍 *Lokasi:* ${form.location}` : null,
    mapsUrl ? `🗺️ *Maps:* ${mapsUrl}` : null,
    form.condition ? `🚨 *Kondisi:* ${form.condition}` : null,
    ``,
    `Pantau status bantuan di:`,
    ticketUrl,
    ``,
    `_Pesan otomatis dari ButuhBantuan_`,
  ].filter(Boolean);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}

async function submit() {
  errorMsg.value = "";
  if (simulate.value) fillSimulateDefaults();
  if (!form.requester_name.trim() || !form.requester_phone.trim()) {
    errorMsg.value = "Nama dan nomor pelapor wajib diisi.";
    return;
  }
  if (props.mode === "admin" && !form.emergency_uuid) {
    errorMsg.value = "Pilih unit layanan.";
    return;
  }
  if (!locPicked.value || !form.requester_lat || !form.requester_lng) {
    errorMsg.value = "Cari dan pilih lokasi dari hasil pencarian (wajib untuk navigasi).";
    return;
  }

  saving.value = true;
  try {
    const condition = simulate.value && !form.condition.includes("[SIMULASI]")
      ? `[SIMULASI] ${form.condition.trim() || "Tiket uji QA"}`.trim()
      : form.condition.trim();

    const payload = {
      emergency_uuid: form.emergency_uuid,
      requester_name: form.requester_name.trim(),
      requester_phone: form.requester_phone.trim(),
      location: form.location.trim(),
      condition,
      requester_lat: form.requester_lat,
      requester_lng: form.requester_lng,
    };

    let order: any;
    if (props.mode === "admin") {
      const res = await post<{ data: any }>("/api/v1/admin/orders", payload);
      order = res.data;
    } else {
      const res = await $fetch<{ data: any }>(`${baseUrl}/api/v1/unit/orders`, {
        method: "POST",
        headers: { ...unitHeaders(), "Content-Type": "application/json" },
        body: {
          requester_name: payload.requester_name,
          requester_phone: payload.requester_phone,
          location: payload.location,
          condition: payload.condition,
          requester_lat: payload.requester_lat,
          requester_lng: payload.requester_lng,
        },
      });
      order = res.data;
    }

    toast.success(
      simulate.value
        ? `Simulasi ${order.ticket_number} dibuat → unit notif`
        : `E-tiket ${order.ticket_number} dibuat`,
    );
    emit("created", order);
    close();
    if (sendWA.value && !simulate.value) openTicketWA(order);
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || "Gagal membuat e-tiket.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UiModal
    v-model:open="open"
    :title="simulate ? 'Simulasi SOS / tiket uji' : 'Buat E-Tiket'"
    :description="
      simulate
        ? 'Buat tiket uji ke unit terpilih untuk QA notifikasi & alur accept (tanpa WA pelapor).'
        : 'Untuk laporan dari luar platform (telepon, walk-in, WA).'
    "
  >
    <div class="space-y-3">
      <label
        v-if="mode === 'admin'"
        class="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors"
        :class="simulate ? 'border-violet-300 bg-violet-50' : 'border-neutral-200 bg-neutral-50'"
      >
        <input
          v-model="simulate"
          type="checkbox"
          class="mt-0.5 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
        >
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-neutral-900">Mode simulasi</span>
          <span class="block text-xs text-neutral-500 mt-0.5 leading-snug">
            Prefill pelapor uji, tandai kondisi [SIMULASI], matikan WA otomatis. Unit tetap dapat notif.
          </span>
        </span>
      </label>

      <div v-if="mode === 'admin'">
        <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">Unit layanan</label>
        <UiSelect
          v-model="form.emergency_uuid"
          placeholder="Cari / pilih unit..."
          :searchable="true"
          search-placeholder="Cari nama unit atau wilayah…"
          :options="emergencySelectOptions"
        />
      </div>
      <div v-else class="rounded-lg bg-neutral-50 border border-neutral-950/10 px-3 py-1.5 text-sm/6 text-neutral-700">
        Unit: <span class="font-semibold">{{ unitName || "Unit Anda" }}</span>
      </div>

      <div>
        <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">Nama pelapor</label>
        <UiInput v-model="form.requester_name" placeholder="Nama lengkap" />
      </div>
      <div>
        <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">Nomor WhatsApp / telepon</label>
        <UiInput v-model="form.requester_phone" type="tel" placeholder="08xxxxxxxxxx" />
      </div>

      <div class="relative">
        <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">Lokasi kejadian</label>
        <UiSearchInput
          :model-value="locQuery"
          placeholder="Cari alamat / tempat..."
          autocomplete="off"
          @update:model-value="onSearchUpdate"
        />

        <div
          v-if="locLoading || locResults.length"
          class="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-neutral-950/10 bg-white shadow-lg"
        >
          <div v-if="locLoading" class="px-3 py-2 text-xs text-neutral-400 flex items-center gap-2">
            <Icon icon="lucide:loader-2" class="animate-spin" />
            Mencari lokasi...
          </div>
          <button
            v-for="(item, i) in locResults"
            :key="i"
            type="button"
            class="w-full text-left px-3 py-2 text-sm/6 hover:bg-neutral-50 border-b border-neutral-50 last:border-0"
            @click="pickLocation(item)"
          >
            <span class="font-medium text-neutral-800 line-clamp-1">{{ item.display_name }}</span>
          </button>
        </div>

        <p v-if="locPicked" class="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1">
          <Icon icon="lucide:map-pin" class="text-xs" />
          Lokasi terpilih · {{ form.requester_lat.toFixed(5) }}, {{ form.requester_lng.toFixed(5) }}
        </p>
        <p v-else class="mt-1.5 text-[11px] text-neutral-400">
          Pilih dari hasil pencarian agar petugas bisa buka Google Maps.
        </p>
      </div>

      <div>
        <label class="block text-sm/6 font-medium text-neutral-950 mb-1.5">
          Kondisi <span class="font-normal text-neutral-500">(opsional)</span>
        </label>
        <UiTextarea v-model="form.condition" :rows="2" placeholder="Ringkas kondisi darurat" />
      </div>

      <label v-if="!simulate" class="flex items-center gap-2 text-sm/6 text-neutral-700 pt-1">
        <input v-model="sendWA" type="checkbox" class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500">
        Kirim link e-tiket via WhatsApp setelah dibuat
      </label>

      <p v-if="errorMsg" class="text-sm/6 text-emergency-600">{{ errorMsg }}</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UiButton variant="secondary" :disabled="saving" @click="close">Batal</UiButton>
        <UiButton variant="primary" :disabled="saving" @click="submit">
          <Icon v-if="saving" icon="lucide:loader-2" class="animate-spin text-sm" />
          <Icon v-else :icon="simulate ? 'lucide:flask-conical' : 'lucide:ticket'" class="text-sm" />
          {{ saving ? "Menyimpan..." : simulate ? "Jalankan simulasi" : "Buat E-Tiket" }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
