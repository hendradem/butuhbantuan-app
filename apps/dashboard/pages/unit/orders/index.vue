<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: "unit", title: "Pesanan Masuk" });

const { unitHeaders, logout } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

const activeTab = ref<"pending" | "in_progress" | "completed">("pending");

const { data, pending, error, refresh } = await useAsyncData(
  "unit-orders",
  () => $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/orders`, { headers: unitHeaders() }),
  { server: false, lazy: false }
);

// Redirect to login when token is invalid / expired
watch(error, (err: any) => {
  if (err?.status === 401 || err?.statusCode === 401) logout();
});

const fetchError = computed(() => error.value && (error.value as any)?.status !== 401);

const orders = computed(() => data.value?.data ?? []);

const filtered = computed(() => {
  if (activeTab.value === "in_progress") {
    return orders.value.filter((o: any) => o.status === "accepted" || o.status === "in_progress");
  }
  if (activeTab.value === "completed") {
    return orders.value.filter((o: any) => o.status === "completed" || o.status === "cancelled");
  }
  return orders.value.filter((o: any) => o.status === "pending");
});

const counts = computed(() => ({
  pending: orders.value.filter((o: any) => o.status === "pending").length,
  in_progress: orders.value.filter((o: any) => o.status === "accepted" || o.status === "in_progress").length,
  completed: orders.value.filter((o: any) => o.status === "completed" || o.status === "cancelled").length,
}));

// ── Notification + auto-refresh ───────────────────────────────────────────────
useOrderNotification(computed(() => counts.value.pending), refresh);

// ── Update order ──────────────────────────────────────────────────────────────
const updating = ref<string | null>(null);

async function updateStatus(id: string, status: string, handlerName = "", notes = "") {
  updating.value = id;
  try {
    await $fetch(`${baseUrl}/api/v1/unit/orders/${id}`, {
      method: "PUT",
      headers: unitHeaders(),
      body: { status, handler_name: handlerName, handling_notes: notes },
    });
    await refresh();
  } finally {
    updating.value = null;
  }
}

// ── Completion modal ──────────────────────────────────────────────────────────
const showComplete = ref(false);
const completeTarget = ref<any>(null);
const handlerName = ref("");
const handlingNotes = ref("");
const completing = ref(false);

function openComplete(order: any) {
  completeTarget.value = order;
  handlerName.value = "";
  handlingNotes.value = "";
  showComplete.value = true;
}

async function submitComplete() {
  if (!completeTarget.value) return;
  completing.value = true;
  try {
    await updateStatus(completeTarget.value.id, "completed", handlerName.value, handlingNotes.value);
    showComplete.value = false;
    sendCompletionWA(completeTarget.value, handlerName.value, handlingNotes.value);
  } finally {
    completing.value = false;
  }
}

// ── WA send ────────────────────────────────────────────────────────────────────
function convertPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("62")) return d;
  return d;
}

function sendCompletionWA(order: any, handler: string, notes: string) {
  const webUrl = `${window.location.origin}/ticket/${order.ticket_number}`;
  const lines = [
    `Halo ${order.requester_name},`,
    ``,
    `Laporan Anda dari *${order.unit_name}* telah selesai ditangani.`,
    ``,
    `📋 No. Tiket: *${order.ticket_number}*`,
    handler ? `👤 Petugas: ${handler}` : "",
    notes ? `📝 Catatan: ${notes}` : "",
    ``,
    `Lihat detail e-tiket: ${webUrl}`,
    ``,
    `Terima kasih telah menggunakan ButuhBantuan. Semoga lekas pulih! 🙏`,
  ].filter((l) => l !== null);

  const number = convertPhone(order.requester_phone);
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-neutral-900">Pesanan Masuk</h1>
          <p class="text-sm text-neutral-500 mt-0.5">{{ orders.length }} total pesanan</p>
        </div>
        <UiButton variant="secondary" size="sm" @click="refresh()">
          <Icon icon="lucide:refresh-cw" class="text-sm" />
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Fetch error banner (non-auth errors) -->
    <div v-if="fetchError" class="mx-4 mt-4 sm:mx-6 flex items-center gap-2 rounded-xl bg-emergency-50 border border-emergency-200 px-4 py-3 text-sm text-emergency-700">
      <Icon icon="lucide:alert-circle" class="text-base shrink-0" />
      <span class="flex-1">Gagal memuat pesanan. Pastikan koneksi ke server aktif.</span>
      <button class="text-emergency-600 underline text-xs" @click="refresh()">Coba lagi</button>
    </div>

    <!-- Tabs -->
    <div class="bg-white border-b border-neutral-100 px-4 sm:px-6">
      <div class="flex gap-1">
        <button
          v-for="t in (['pending', 'in_progress', 'completed'] as const)"
          :key="t"
          :class="[
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-700',
          ]"
          @click="activeTab = t"
        >
          {{ t === 'pending' ? 'Masuk' : t === 'in_progress' ? 'Diproses' : 'Selesai' }}
          <span
            v-if="counts[t] > 0"
            :class="['ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold', activeTab === t ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-600']"
          >{{ counts[t] }}</span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 sm:p-6">
      <div v-if="pending" class="flex items-center justify-center py-16 gap-2 text-neutral-400 text-sm">
        <UiSpinner size="sm" />
        Memuat...
      </div>

      <div v-else-if="!filtered.length" class="bg-white rounded-xl border border-neutral-200 py-2">
        <UiEmptyState title="Tidak ada pesanan" description="Belum ada pesanan di kategori ini.">
          <template #icon>
            <Icon icon="lucide:inbox" class="text-neutral-400 text-2xl" />
          </template>
        </UiEmptyState>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="order in filtered"
          :key="order.id"
          class="bg-white rounded-xl border border-neutral-200 p-4 space-y-3"
        >
          <!-- Order header -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-xs text-neutral-400 font-mono">{{ order.ticket_number }}</p>
              <p class="font-semibold text-neutral-900 mt-0.5">{{ order.requester_name }}</p>
              <p class="text-sm text-neutral-500">{{ order.requester_phone }}</p>
            </div>
            <UiStatusBadge :status="order.status" />
          </div>

          <!-- Details -->
          <div class="space-y-1.5 text-sm">
            <div v-if="order.location" class="flex items-start gap-1.5 text-neutral-600">
              <Icon icon="lucide:map-pin" class="text-neutral-400 mt-0.5 shrink-0" />
              <span>{{ order.location }}</span>
            </div>
            <div v-if="order.condition" class="flex items-start gap-1.5 text-neutral-600">
              <Icon icon="lucide:activity" class="text-neutral-400 mt-0.5 shrink-0" />
              <span>{{ order.condition }}</span>
            </div>
            <p class="text-xs text-neutral-400 flex items-center gap-1">
              <Icon icon="lucide:clock" class="text-[11px]" />
              {{ formatDate(order.created_at) }}
            </p>
          </div>

          <!-- Handler info (completed) -->
          <div v-if="order.handler_name || order.handling_notes" class="bg-green-50 rounded-lg p-2.5 text-sm text-green-800 space-y-0.5">
            <p v-if="order.handler_name"><span class="font-medium">Petugas:</span> {{ order.handler_name }}</p>
            <p v-if="order.handling_notes"><span class="font-medium">Catatan:</span> {{ order.handling_notes }}</p>
          </div>

          <!-- Location -->
          <a
            v-if="order.requester_lat && order.requester_lng"
            :href="`https://www.google.com/maps?q=${order.requester_lat},${order.requester_lng}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Icon icon="lucide:locate" class="text-sm" />
            Lihat Lokasi Pelapor
          </a>

          <!-- Actions -->
          <div class="flex gap-2 flex-wrap">
            <template v-if="order.status === 'pending'">
              <UiButton size="sm" :loading="updating === order.id" @click="updateStatus(order.id, 'accepted')">
                <Icon icon="lucide:check" class="text-sm" />
                Terima
              </UiButton>
              <UiButton size="sm" variant="danger" :loading="updating === order.id" @click="updateStatus(order.id, 'cancelled')">
                Tolak
              </UiButton>
            </template>

            <template v-else-if="order.status === 'accepted'">
              <UiButton size="sm" :loading="updating === order.id" @click="updateStatus(order.id, 'in_progress')">
                <Icon icon="lucide:play" class="text-sm" />
                Mulai Proses
              </UiButton>
            </template>

            <template v-else-if="order.status === 'in_progress'">
              <UiButton size="sm" @click="openComplete(order)">
                <Icon icon="lucide:check-circle" class="text-sm" />
                Tandai Selesai
              </UiButton>
            </template>

            <template v-if="order.status === 'completed'">
              <UiButton size="sm" variant="ghost" class="text-green-700 hover:bg-green-50" @click="sendCompletionWA(order, order.handler_name, order.handling_notes)">
                <Icon icon="mdi:whatsapp" class="text-base text-green-600" />
                Kirim WA
              </UiButton>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Complete modal -->
    <UiModal v-model:open="showComplete" title="Tandai Selesai" description="Isi informasi penanganan sebelum menyelesaikan pesanan.">
      <template #trigger><span /></template>
      <div class="space-y-4">
        <UiFormField label="Nama Petugas">
          <UiInput v-model="handlerName" placeholder="Nama petugas yang menangani..." />
        </UiFormField>
        <UiFormField label="Catatan Penanganan">
          <UiTextarea v-model="handlingNotes" :rows="3" placeholder="Ringkasan tindakan yang dilakukan..." />
        </UiFormField>
      </div>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showComplete = false">Batal</UiButton>
        <UiButton size="sm" :loading="completing" @click="submitComplete">
          <Icon icon="lucide:check-circle" class="text-sm" />
          Selesaikan & Kirim WA
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
