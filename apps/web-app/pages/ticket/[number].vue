<script setup lang="ts">
/**
 * Thin deep-link entry: hand off to home + TicketSheet so map state stays
 * the single shell and the address bar remains `/ticket/[number]`.
 */
definePageMeta({ layout: false });

const route = useRoute();

const ticketNumber = String(route.params.number || "").trim();
const via = String(route.query.via || "").trim();
const to = String(route.query.to || "").trim();

const query: Record<string, string> = {};
if (ticketNumber) query.ticket = ticketNumber;
if (via) query.via = via;
if (to) query.to = to;

await navigateTo({ path: "/", query }, { replace: true });
</script>

<template>
  <div class="ui-page min-h-screen" aria-busy="true" />
</template>
