<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "~/utils/appToast";
import {
  type ComplianceData,
  formatComplianceDate,
  verificationBadgeVariant,
  verificationLabel,
} from "~/utils/ambulanceCompliance";

const props = defineProps<{
  emergencyId: string;
  compliance?: ComplianceData | null;
  /** Fallback when compliance belum tersimpan (mis. tipe ambulans di form edit). */
  defaultCategory?: string;
}>();

const emit = defineEmits<{ saved: [] }>();

const { get, post } = useApi();

const categories = ref<{ value: string; label: string }[]>([]);
const verifyCategory = ref("");
const verifying = ref(false);

const verification = computed(() => props.compliance?.verification);

watch(
  () => [props.compliance?.declared_category, props.defaultCategory, verification.value?.is_verified] as const,
  ([declared, fallback, verified]) => {
    if (!verified) verifyCategory.value = declared || fallback || "";
  },
  { immediate: true },
);

onMounted(async () => {
  try {
    const res = await get<{ data: { code: string; label: string }[] }>(
      "/api/v1/compliance/ambulance/categories",
    );
    categories.value = (res.data ?? []).map((c) => ({ value: c.code, label: c.label }));
  } catch {
    /* optional */
  }
});

async function verify(revoke = false) {
  verifying.value = true;
  try {
    await post(`/api/v1/emergency/${props.emergencyId}/compliance/verify`, {
      verified_category: revoke ? "" : verifyCategory.value,
      revoke,
    });
    toast.success(revoke ? "Verifikasi dicabut" : "Kelengkapan diverifikasi");
    emit("saved");
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal memverifikasi");
  } finally {
    verifying.value = false;
  }
}
</script>

<template>
  <div class="rounded-lg border border-neutral-100 bg-neutral-50/60 px-4 py-3 space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Verifikasi admin
      </p>
      <UiBadge :variant="verificationBadgeVariant(verification)">
        {{ verificationLabel(verification) }}
      </UiBadge>
    </div>

    <div
      v-if="verification?.is_verified && verification.verified_category_label"
      class="text-xs text-neutral-500"
    >
      Kategori terverifikasi: {{ verification.verified_category_label }}
      <span v-if="verification.expires_at">
        · berlaku s/d {{ formatComplianceDate(verification.expires_at) }}
      </span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
      <UiFormField label="Kategori terverifikasi">
        <UiSelect
          v-model="verifyCategory"
          :options="categories"
          placeholder="Pilih kategori"
          :disabled="verification?.is_verified"
        />
      </UiFormField>
      <UiButton
        v-if="!verification?.is_verified"
        size="sm"
        :loading="verifying"
        :disabled="!verifyCategory"
        @click="verify(false)"
      >
        <Icon icon="lucide:badge-check" class="text-sm" />
        Verifikasi
      </UiButton>
      <UiButton
        v-else
        size="sm"
        variant="secondary"
        :loading="verifying"
        @click="verify(true)"
      >
        Cabut verifikasi
      </UiButton>
    </div>
  </div>
</template>
