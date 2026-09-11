<script setup lang="ts">
/**
 * Connects the ticket this device reported (utils/activeTicket) to the island.
 * Renders nothing until a report exists, so the map screen stays clean.
 */
import { appToast } from "~/utils/appToast";
import { clearActiveTicket, loadActiveTicket, type ActiveTicket } from "~/utils/activeTicket";
import { toTicketView } from "~/utils/ticketView";

const active = ref<ActiveTicket | null>(null);
const token = computed(() => active.value?.token ?? "");

const { ticket, notFound } = useTicketLive(token);

onMounted(() => {
  active.value = loadActiveTicket();
});

const view = computed(() => {
  if (!active.value || notFound.value) return null;
  // Fall back to what we stored at report time until the first poll lands.
  const source = ticket.value ?? {
    ticket_number: active.value.ticketNumber,
    unit_name: active.value.unitName,
    status: "pending",
  };
  return toTicketView(source, active.value.token, { unitLogo: active.value.unitLogo });
});

function close() {
  clearActiveTicket();
  active.value = null;
  appToast().success("Pantauan ditutup. Tiketmu tetap berjalan.");
}
</script>

<template>
  <TicketIsland v-if="view" :view="view" @close="close" />
</template>
