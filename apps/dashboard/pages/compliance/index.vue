<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  formatComplianceDate,
  verificationBadgeVariant,
  verificationLabel,
} from "~/utils/ambulanceCompliance";

definePageMeta({ title: "Kelengkapan Ambulans", keepalive: true });

const { authGet } = useApi();

type QueueReason = "expired" | "expiring_soon" | "unverified" | "all";

type QueueEntry = {
  emergency_id: string;
  name: string;
  organization_name?: string;
  regency?: string;
  province?: string;
  declared_category?: string;
  category_label?: string;
  completeness_pct?: number;
  verification_status?: string;
  expires_at?: string;
  days_until_expiry?: number | null;
  queue_reason: "expired" | "expiring_soon" | "unverified";
};

const withinDays = ref(30);
const reasonFilter = ref<QueueReason>("all");
const search = ref("");

const { data, pending, refresh } = await useAsyncData(
  "admin-compliance-queue",
  () =>
    authGet<{ data: QueueEntry[] }>(`/api/v1/admin/compliance/queue?within=${withinDays.value}`)
      .then((r) => r.data ?? [])
      .catch(() => [] as QueueEntry[]),
  { server: false },
);

const items = computed(() => data.value ?? []);

const filtered = computed(() => {
  let list = items.value;
  if (reasonFilter.value !== "all") {
    list = list.filter((i) => i.queue_reason === reasonFilter.value);
  }
  const q = search.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (i) =>
      i.name?.toLowerCase().includes(q) ||
      i.organization_name?.toLowerCase().includes(q) ||
      i.regency?.toLowerCase().includes(q) ||
      i.province?.toLowerCase().includes(q),
  );
});


function reasonLabel(reason: QueueEntry["queue_reason"]) {
  switch (reason) {
    case "expired":
      return "Kedaluwarsa";
    case "expiring_soon":
      return "Segera kedaluwarsa";
    default:
      return "Belum diverifikasi";
  }
}

function reasonBadge(reason: QueueEntry["queue_reason"]) {
  switch (reason) {
    case "expired":
      return "bg-red-50 text-red-700 border-red-200";
    case "expiring_soon":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
  }
}

function verificationView(entry: QueueEntry) {
  return {
    status: entry.verification_status as "self_declared" | "verified" | "expired",
    is_verified: entry.verification_status === "verified",
  };
}

watch(withinDays, () => refresh());
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="page-subheader-title">Kelengkapan Ambulans</h1>
          <p class="page-subheader-desc">
            Antrian verifikasi & kedaluwarsa · Pedoman Kemenkes 2019
          </p>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700"
          :disabled="pending"
          @click="refresh()"
        >
          <Icon icon="lucide:refresh-cw" :class="['text-xs', pending && 'animate-spin']" />
          Refresh
        </button>
      </div>
    </div>

    <div class="p-4 sm:p-6">
      <UiTableCard
        title="Antrian Kelengkapan"
        :badge="filtered.length"
        description="Verifikasi & kedaluwarsa kelengkapan ambulans"
      >
        <template #actions>
          <UiSearchInput
            v-model="search"
            placeholder="Cari..."
            class="w-28 sm:w-36 shrink-0"
          />
          <UiSelect v-model="reasonFilter" class="!w-auto shrink-0">
            <option value="all">Semua</option>
            <option value="expired">Kedaluwarsa</option>
            <option value="expiring_soon">≤30 hari</option>
            <option value="unverified">Belum diverifikasi</option>
          </UiSelect>
        </template>

        <div v-if="pending" class="divide-y divide-neutral-100">
          <div v-for="i in 4" :key="i" class="px-4 sm:px-5 py-4 space-y-2">
            <div class="soft-skel h-4 w-40" />
            <div class="soft-skel h-3 w-56" />
          </div>
        </div>

        <div
          v-else-if="!filtered.length"
          class="flex flex-col items-center justify-center py-16 text-neutral-400 text-sm gap-2"
        >
          <Icon icon="lucide:shield-check" class="text-3xl" />
          Tidak ada unit di antrian ini.
        </div>

        <div v-else class="divide-y divide-neutral-100">
          <NuxtLink
            v-for="entry in filtered"
            :key="entry.emergency_id"
            :to="`/emergencies/${entry.emergency_id}`"
            class="block px-4 sm:px-5 py-4 hover:bg-neutral-50 transition-colors"
          >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-neutral-900 truncate">{{ entry.name }}</p>
                <span
                  class="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  :class="reasonBadge(entry.queue_reason)"
                >
                  {{ reasonLabel(entry.queue_reason) }}
                </span>
              </div>
              <p v-if="entry.organization_name" class="text-sm text-neutral-500 truncate mt-0.5">
                {{ entry.organization_name }}
              </p>
              <p class="text-xs text-neutral-400 mt-1">
                {{ [entry.regency, entry.province].filter(Boolean).join(" · ") }}
              </p>
              <p v-if="entry.category_label" class="text-xs text-neutral-500 mt-1.5">
                {{ entry.category_label }}
                <span v-if="entry.completeness_pct != null"> · {{ entry.completeness_pct }}% wajib</span>
              </p>
            </div>
            <div class="text-right shrink-0 space-y-1">
              <UiBadge :variant="verificationBadgeVariant(verificationView(entry))">
                {{ verificationLabel(verificationView(entry)) }}
              </UiBadge>
              <p
                v-if="entry.expires_at"
                class="text-[11px] text-neutral-400"
              >
                <template v-if="entry.days_until_expiry != null && entry.days_until_expiry < 0">
                  Kedaluwarsa {{ formatComplianceDate(entry.expires_at) }}
                </template>
                <template v-else-if="entry.days_until_expiry != null">
                  {{ entry.days_until_expiry }} hari lagi
                </template>
                <template v-else>
                  s/d {{ formatComplianceDate(entry.expires_at) }}
                </template>
              </p>
              <p class="text-xs text-primary-600 font-medium flex items-center justify-end gap-1">
                Verifikasi
                <Icon icon="lucide:chevron-right" class="text-sm" />
              </p>
            </div>
          </div>
          </NuxtLink>
        </div>
      </UiTableCard>
    </div>
  </div>
</template>
