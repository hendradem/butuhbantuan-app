<script setup lang="ts">
/**
 * Redirect legacy /sos → Pesanan tab SOS.
 */
await navigateTo({ path: "/orders", query: { view: "sos" } }, { replace: true });
</script>

<template>
  <div class="p-8 text-sm text-neutral-400">Mengalihkan ke Pesanan…</div>
</template>
