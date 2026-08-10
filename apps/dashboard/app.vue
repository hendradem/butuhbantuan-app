<script setup lang="ts">
import { Toaster } from "vue3-hot-toast";
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
  <client-only>
    <Toaster
      position="top-center"
      :toastOptions="{
        style: {
          borderRadius: '12px',
          background: '#1a1a1a',
          color: '#fff',
          fontSize: '0.875rem',
          padding: '10px 18px',
        },
      }"
    />
  </client-only>
</template>
