<script setup lang="ts">
import HospitalImportPanel from "~/components/hospitals/HospitalImportPanel.vue";

definePageMeta({ layout: "unit", title: "Import RS", keepalive: true });

const { unitHeaders } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

const {
  data: profile,
  pending,
  refresh,
} = await useAsyncData(
  "unit-hospitals-profile",
  () =>
    $fetch<{ data: any }>(`${baseUrl}/api/v1/unit/profile`, { headers: unitHeaders() })
      .then((r) => r.data)
      .catch(() => null),
  { server: false },
);

const regencyId = computed(
  () => profile.value?.address?.regency_id || profile.value?.regency_id || "",
);
const regencyName = computed(
  () => profile.value?.address?.regency || profile.value?.regency_name || "",
);
const provinceId = computed(
  () => profile.value?.address?.province_id || profile.value?.province_id || "",
);

onMounted(() => {
  refresh();
});
</script>

<template>
  <div>
    <div class="page-subheader">
      <h1 class="page-subheader-title">Import RS Wilayah</h1>
      <p class="page-subheader-desc">
        Sync & import rumah sakit untuk kabupaten operasional unit Anda
      </p>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div
        v-if="!pending && !regencyId"
        class="rounded-2xl bg-amber-50 text-amber-950 text-sm px-4 py-3 ring-1 ring-amber-100 space-y-2"
      >
        <p class="font-semibold">Wilayah operasional belum diisi</p>
        <p>
          Atur provinsi &amp; kabupaten di pengaturan unit dulu, baru bisa sync/import RS.
        </p>
        <NuxtLink
          to="/unit/settings"
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900 underline underline-offset-2"
        >
          Buka Pengaturan → Wilayah Operasional
        </NuxtLink>
      </div>

      <HospitalImportPanel
        v-else-if="regencyId"
        mode="unit"
        :locked-regency-id="String(regencyId)"
        :locked-regency-name="String(regencyName)"
        :locked-province-id="String(provinceId)"
      />
    </div>
  </div>
</template>
