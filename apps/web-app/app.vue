<script setup lang="ts">
import { Toaster } from "vue3-hot-toast";
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <Toaster
    position="top-center"
    :toastOptions="{
      style: {
        borderRadius: '50px',
        background: '#333',
        color: '#fff',
        fontSize: '0.875rem',
        padding: '10px 18px',
      },
    }"
  />
</template>
