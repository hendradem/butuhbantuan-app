<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Buat E-Tiket" });

const { get } = useApi();
const { goBack } = useSmartBack(adminOrderBackTo);

const { data: emergencyData } = await useAsyncData("emergencies-for-create-order", () =>
  get<{ data: any[] }>("/api/v1/emergency/"),
);

const emergencies = computed(() => emergencyData.value?.data ?? []);

function onOpenDetail(order: any) {
  if (order?.ticket_number) {
    void navigateTo(`/orders/${order.ticket_number}`);
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
        mode="admin"
        :emergencies="emergencies"
        @open-detail="onOpenDetail"
        @cancel="goBack"
      />
    </div>
  </div>
</template>
