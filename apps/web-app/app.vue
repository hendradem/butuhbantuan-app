<script setup lang="ts">
import { Toaster } from "vue-sonner";
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <Toaster
    :toast-options="{
      style: {
        borderRadius: '50px',
        background: '#333',
        color: '#fff',
        fontSize: '0.875rem',
      },
    }"
  />
</template>
