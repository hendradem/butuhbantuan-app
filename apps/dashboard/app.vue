<script setup lang="ts">
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
  <client-only>
    <FlashNotifyHost />
  </client-only>
</template>
