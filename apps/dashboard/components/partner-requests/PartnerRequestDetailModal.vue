<script setup lang="ts">
/**
 * Review panel for one partner request: everything the partner submitted, plus
 * the decision buttons. Approving creates the unit (inactive) and hands the
 * admin straight to its detail page to set up dashboard credentials.
 */
import { Icon } from "@iconify/vue";
import { jenisPelayananLabel } from "@butuhbantuan/utils";
import { toast } from "~/utils/appToast";
import { partnerTierLabel } from "~/utils/partnerTier";
import {
  partnerRequestIsOpen,
  partnerRequestStatusClass,
  partnerRequestStatusLabel,
} from "~/utils/partnerRequest";

const props = defineProps<{ request: any | null }>();
const emit = defineEmits<{ changed: [] }>();

const { post } = useApi();

const open = defineModel<boolean>("open", { default: false });

// Local copy so the panel keeps rendering while the parent's list refreshes.
const view = computed(() => props.request);

const busy = ref<"contact" | "approve" | "reject" | "">("");
const actionError = ref("");
const rejectMode = ref(false);
const rejectNote = ref("");
const rejectError = ref("");

const payload = computed(() => view.value?.payload ?? {});
const address = computed(() => payload.value?.address ?? {});
const contact = computed(() => payload.value?.contact ?? {});
const operational = computed(() => payload.value?.operational ?? {});
const fleet = computed(() => payload.value?.fleet ?? {});

const coordinates = computed(() => {
  const [lng, lat] = payload.value?.coordinates ?? ["", ""];
  if (!lat || !lng) return "—";
  return `${lat}, ${lng}`;
});

const serviceModes = computed(() => {
  const list: string[] = payload.value?.tipe_emergency ?? [];
  return list.map((code) => jenisPelayananLabel(code)).filter(Boolean);
});

const openForReview = computed(() => partnerRequestIsOpen(view.value?.status));

const hours = computed(() => {
  if (operational.value?.is_24_hours) return "24 jam";
  const open_ = operational.value?.open_time || "";
  const close = operational.value?.close_time || "";
  return open_ || close ? `${open_} – ${close}` : "—";
});

watch(open, (isOpen) => {
  if (isOpen) {
    actionError.value = "";
    rejectMode.value = false;
    rejectNote.value = "";
    rejectError.value = "";
  }
});

async function call(path: string, body: Record<string, unknown>, kind: typeof busy.value) {
  busy.value = kind;
  actionError.value = "";
  try {
    return await post<any>(path, body);
  } catch (err: any) {
    actionError.value = err?.data?.message ?? "Gagal memproses permintaan.";
    return null;
  } finally {
    busy.value = "";
  }
}

async function markContacted() {
  const res = await call(`/api/v1/admin/partner-requests/${view.value.id}/contacted`, {}, "contact");
  if (!res) return;
  toast.success("Ditandai sudah dihubungi");
  emit("changed");
  open.value = false;
}

async function approve() {
  const res = await call(`/api/v1/admin/partner-requests/${view.value.id}/approve`, {}, "approve");
  if (!res) return;
  toast.success("Permintaan disetujui — layanan dibuat nonaktif");
  emit("changed");
  open.value = false;
  // Straight to the unit page, where the existing credential panel lives.
  await navigateTo(`/emergencies/${res.data.id}?edit=1`);
}

async function reject() {
  if (!rejectNote.value.trim()) {
    rejectError.value = "Tulis alasan penolakan supaya tercatat.";
    return;
  }
  const res = await call(
    `/api/v1/admin/partner-requests/${view.value.id}/reject`,
    { note: rejectNote.value.trim() },
    "reject",
  );
  if (!res) return;
  toast.success("Permintaan ditolak");
  emit("changed");
  open.value = false;
}
</script>

<template>
  <UiModal
    v-if="view"
    v-model:open="open"
    size="2xl"
    :title="payload.name || 'Permintaan mitra'"
    :description="payload.organization_name || 'Permintaan pendaftaran unit baru'"
  >
    <template #featured>
      <span
        :class="[
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
          partnerRequestStatusClass(view.status),
        ]"
      >
        {{ partnerRequestStatusLabel(view.status) }}
      </span>
    </template>

    <div class="space-y-6">
      <p v-if="actionError" class="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
        {{ actionError }}
      </p>

      <!-- Decision -->
      <div v-if="openForReview" class="flex flex-wrap gap-2">
        <UiButton
          v-if="view.status === 'pending'"
          variant="secondary"
          size="sm"
          :loading="busy === 'contact'"
          @click="markContacted"
        >
          <Icon icon="lucide:phone-call" class="text-sm" />
          Tandai sudah dihubungi
        </UiButton>
        <UiButton size="sm" :loading="busy === 'approve'" @click="approve">
          <Icon icon="lucide:check" class="text-sm" />
          Setujui &amp; buat layanan
        </UiButton>
        <UiButton variant="danger-secondary" size="sm" @click="rejectMode = !rejectMode">
          <Icon icon="lucide:x" class="text-sm" />
          Tolak
        </UiButton>
      </div>

      <div v-else-if="view.status === 'approved'" class="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
        Sudah disetujui.
        <NuxtLink v-if="view.emergency_uuid" :to="`/emergencies/${view.emergency_uuid}`" class="font-semibold underline">
          Buka layanannya
        </NuxtLink>
      </div>

      <!-- Reject note -->
      <div v-if="rejectMode" class="rounded-lg border border-neutral-200 p-3.5">
        <UiFormField label="Alasan penolakan" required :error="rejectError">
          <UiTextarea v-model="rejectNote" :rows="2" placeholder="mis. wilayah di luar cakupan layanan" />
        </UiFormField>
        <div class="mt-3 flex justify-end gap-2">
          <UiButton variant="ghost" size="sm" @click="rejectMode = false">Batal</UiButton>
          <UiButton variant="danger" size="sm" :loading="busy === 'reject'" @click="reject">Tolak permintaan</UiButton>
        </div>
      </div>

      <p v-if="view.review_note" class="rounded-lg bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-700">
        <span class="font-semibold">Catatan review:</span> {{ view.review_note }}
      </p>

      <!-- Layanan -->
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Layanan</h3>
        <dl class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-neutral-500">Jenis layanan</dt>
            <dd class="text-sm text-neutral-900">{{ payload.emergency_type?.name || "—" }}</dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Nama organisasi</dt>
            <dd class="text-sm text-neutral-900">{{ payload.organization_name || "—" }}</dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Tipe organisasi</dt>
            <dd class="text-sm text-neutral-900">{{ payload.organization_type || "—" }}</dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Jenis pelayanan</dt>
            <dd class="text-sm text-neutral-900">{{ serviceModes.length ? serviceModes.join(", ") : "—" }}</dd>
          </div>
        </dl>
        <p v-if="payload.description" class="mt-3 text-sm whitespace-pre-line text-neutral-700">{{ payload.description }}</p>
        <a
          v-if="payload.organization_logo"
          :href="payload.organization_logo"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-2 inline-flex items-center gap-1.5 text-sm text-primary-700 hover:underline"
        >
          <Icon icon="lucide:image" class="text-sm" />
          Lihat logo
        </a>
      </section>

      <!-- Kontak -->
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Kontak</h3>
        <dl class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <div>
            <dt class="text-xs text-neutral-500">Telepon</dt>
            <dd class="text-sm text-neutral-900">{{ contact.phone || "—" }}</dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">WhatsApp</dt>
            <dd class="text-sm text-neutral-900">{{ contact.whatsapp || "—" }}</dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Email</dt>
            <dd class="text-sm text-neutral-900">{{ contact.email || "—" }}</dd>
          </div>
        </dl>
      </section>

      <!-- Lokasi -->
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Lokasi</h3>
        <dl class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-neutral-500">Provinsi / kabupaten</dt>
            <dd class="text-sm text-neutral-900">
              {{ [address.regency, address.province].filter(Boolean).join(", ") || "—" }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Koordinat</dt>
            <dd class="text-sm tabular-nums text-neutral-900">{{ coordinates }}</dd>
          </div>
        </dl>
        <p v-if="address.full_address" class="mt-3 text-sm text-neutral-700">{{ address.full_address }}</p>
      </section>

      <!-- Operasional -->
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Operasional</h3>
        <dl class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <div>
            <dt class="text-xs text-neutral-500">Jam operasi</dt>
            <dd class="text-sm text-neutral-900">{{ hours }}</dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Total unit</dt>
            <dd class="text-sm tabular-nums text-neutral-900">{{ fleet.total ?? 0 }}</dd>
          </div>
          <div>
            <dt class="text-xs text-neutral-500">Tingkat mitra</dt>
            <dd class="text-sm text-neutral-900">{{ partnerTierLabel(payload.partner_tier) }}</dd>
          </div>
        </dl>
      </section>

      <!-- Peran & akses -->
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Peran &amp; akses</h3>
        <ul class="mt-3 flex flex-wrap gap-2 text-xs">
          <li
            v-for="flag in [
              { on: payload.is_dispatcher, label: 'Dispatcher' },
              { on: payload.is_province_dispatcher, label: 'Dispatcher provinsi' },
              { on: payload.dashboard_access, label: 'Akses dashboard' },
            ]"
            :key="flag.label"
            :class="[
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset',
              flag.on ? 'bg-primary-50 text-primary-800 ring-primary-200' : 'bg-neutral-50 text-neutral-500 ring-neutral-200',
            ]"
          >
            <Icon :icon="flag.on ? 'lucide:check' : 'lucide:minus'" class="text-[12px]" />
            {{ flag.label }}
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <UiButton variant="secondary" size="sm" @click="open = false">Tutup</UiButton>
    </template>
  </UiModal>
</template>
