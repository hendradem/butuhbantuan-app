<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: "unit", title: "Buat E-Tiket" });

const { emergencyUUID } = useUnitAuth();
const { data: profile } = useNuxtData<any>("unit-profile");
const { goBack } = useSmartBack(unitOrdersBackTo);

function onOpenDetail(order: any) {
  if (order?.ticket_number) {
    void navigateTo(`/unit/orders/${order.ticket_number}`);
  } else {
    goBack();
  }
}
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center gap-3 min-w-0">
        <button
          type="button"
          class="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors shrink-0"
          aria-label="Kembali"
          @click="goBack"
        >
          <Icon icon="lucide:arrow-left" class="text-neutral-700 text-sm" />
        </button>
        <div class="page-subheader-meta min-w-0">
          <h1 class="page-subheader-title">Buat E-Tiket</h1>
          <p class="page-subheader-desc">Laporan manual · walk-in / telepon / WA</p>
        </div>
      </div>
    </div>

    <div class="p-4 sm:p-6 max-w-3xl mx-auto">
      <CreateOrderForm
        mode="unit"
        :emergency-uuid="emergencyUUID || undefined"
        :unit-name="(profile as any)?.name || (profile as any)?.unit_name"
        :dashboard-access="(profile as any)?.dashboard_access"
        :unit-tipe-emergency="(profile as any)?.tipe_emergency"
        :emergency-type-name="(profile as any)?.emergency_type"
        @open-detail="onOpenDetail"
        @cancel="goBack"
      />
    </div>
  </div>
</template>
