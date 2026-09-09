<script setup lang="ts">
import { Toaster } from "vue3-hot-toast";
import { getColorMode } from "~/utils/colorMode";
import { getUiTheme } from "~/utils/uiTheme";

const toastStyle = computed(() => {
  const soft = getUiTheme() === "soft";
  const dark = getColorMode() === "dark";
  return soft
    ? {
        borderRadius: "9999px",
        background: dark ? "#e8eaef" : "#1A1C2E",
        color: dark ? "#12141a" : "#fff",
        fontSize: "0.8125rem",
        fontWeight: "500",
        padding: "10px 18px",
        boxShadow: dark
          ? "0 8px 28px rgba(0, 0, 0, 0.45)"
          : "0 8px 28px rgba(26, 28, 46, 0.18)",
        border: "none",
      }
    : {
        borderRadius: "50px",
        background: dark ? "#e5e5e5" : "#333",
        color: dark ? "#171717" : "#fff",
        fontSize: "0.875rem",
        padding: "10px 18px",
      };
});
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <Toaster
    position="top-center"
    :toastOptions="{
      duration: 2500,
      style: toastStyle,
    }"
  />
</template>
