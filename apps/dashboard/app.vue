<script setup lang="ts">
</script>

<template>
  <DashboardNavLoading />
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
  <client-only>
    <FlashNotifyHost />
  </client-only>
</template>
