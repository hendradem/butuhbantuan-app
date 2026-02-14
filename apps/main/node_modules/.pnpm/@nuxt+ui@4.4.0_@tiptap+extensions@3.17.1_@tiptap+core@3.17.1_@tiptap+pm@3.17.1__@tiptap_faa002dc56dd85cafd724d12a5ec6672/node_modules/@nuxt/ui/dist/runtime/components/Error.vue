<script>
import theme from "#build/ui/error";
</script>

<script setup>
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { clearError, useAppConfig } from "#imports";
import { useLocale } from "../composables/useLocale";
import { tv } from "../utils/tv";
import UButton from "./Button.vue";
const props = defineProps({
  as: { type: null, required: false, default: "main" },
  error: { type: Object, required: false },
  redirect: { type: String, required: false, default: "/" },
  clear: { type: [Boolean, Object], required: false, default: true },
  class: { type: null, required: false },
  ui: { type: null, required: false }
});
const slots = defineSlots();
const { t } = useLocale();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.error || {} })());
function handleError() {
  clearError({ redirect: props.redirect });
}
</script>

<template>
  <Primitive :as="as" data-slot="root" :class="ui.root({ class: [props.ui?.root, props.class] })">
    <p v-if="!!props.error?.statusCode || !!slots.statusCode" data-slot="statusCode" :class="ui.statusCode({ class: props.ui?.statusCode })">
      <slot name="statusCode">
        {{ props.error?.statusCode }}
      </slot>
    </p>
    <h1 v-if="!!props.error?.statusMessage || !!slots.statusMessage" data-slot="statusMessage" :class="ui.statusMessage({ class: props.ui?.statusMessage })">
      <slot name="statusMessage">
        {{ props.error?.statusMessage }}
      </slot>
    </h1>
    <p v-if="props.error?.message && props.error.message !== props.error.statusMessage || !!slots.message" data-slot="message" :class="ui.message({ class: props.ui?.message })">
      <slot name="message">
        {{ props.error?.message }}
      </slot>
    </p>
    <div v-if="!!clear || !!slots.links" data-slot="links" :class="ui.links({ class: props.ui?.links })">
      <slot name="links">
        <UButton
          v-if="clear"
          size="lg"
          color="primary"
          variant="solid"
          :label="t('error.clear')"
          v-bind="typeof clear === 'object' ? clear : {}"
          @click="handleError"
        />
      </slot>
    </div>
  </Primitive>
</template>
