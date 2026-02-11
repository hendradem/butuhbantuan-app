<script>
import theme from "#build/ui/prose/em";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig } from "#imports";
import { tv } from "../../utils/tv";
const props = defineProps({
  class: { type: String, required: false }
});
defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.em || {} }));
</script>

<template>
  <em :class="ui({ class: props.class })"><slot /></em>
</template>
