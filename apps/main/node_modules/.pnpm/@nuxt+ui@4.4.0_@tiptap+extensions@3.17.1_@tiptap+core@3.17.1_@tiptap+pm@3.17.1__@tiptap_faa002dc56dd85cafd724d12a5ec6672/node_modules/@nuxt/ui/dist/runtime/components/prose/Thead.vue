<script>
import theme from "#build/ui/prose/thead";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig } from "#imports";
import { tv } from "../../utils/tv";
const props = defineProps({
  class: { type: null, required: false }
});
defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.thead || {} }));
</script>

<template>
  <thead :class="ui({ class: props.class })">
    <slot />
  </thead>
</template>
