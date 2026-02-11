<script>
import theme from "#build/ui/dashboard-resize-handle";
</script>

<script setup>
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { useAppConfig } from "#imports";
import { tv } from "../utils/tv";
const props = defineProps({
  as: { type: null, required: false },
  class: { type: null, required: false }
});
defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.dashboardResizeHandle || {} }));
</script>

<template>
  <Primitive
    :as="as"
    role="separator"
    :class="ui({ class: props.class })"
  >
    <slot />
  </Primitive>
</template>
