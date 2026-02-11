<script>
import theme from "#build/ui/prose/hr";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig } from "#imports";
import { tv } from "../../utils/tv";
const props = defineProps({
  class: { type: null, required: false }
});
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.hr || {} }));
</script>

<template>
  <hr :class="ui({ class: props.class })">
</template>
