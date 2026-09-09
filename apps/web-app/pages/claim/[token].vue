<script setup lang="ts">
// Deprecated route — /claim/:token is now unified with /dispatch/:token so
// WA-only units and community volunteers share the same page and rich info.
definePageMeta({ layout: false });
const route = useRoute();
const token = String(route.params.token || "").trim();
if (import.meta.server) {
  await navigateTo(`/dispatch/${encodeURIComponent(token)}`, { redirectCode: 302 });
} else {
  await navigateTo(`/dispatch/${encodeURIComponent(token)}`, { replace: true });
}
</script>

<template>
  <div />
</template>
