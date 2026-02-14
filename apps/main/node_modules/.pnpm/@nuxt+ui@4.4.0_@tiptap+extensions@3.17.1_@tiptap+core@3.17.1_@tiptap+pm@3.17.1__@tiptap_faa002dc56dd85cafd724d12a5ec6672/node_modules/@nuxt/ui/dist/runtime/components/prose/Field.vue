<script>
import theme from "#build/ui/prose/field";
</script>

<script setup>
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { useAppConfig } from "#imports";
import { tv } from "../../utils/tv";
const props = defineProps({
  as: { type: null, required: false },
  name: { type: String, required: false },
  type: { type: String, required: false },
  description: { type: String, required: false },
  required: { type: Boolean, required: false },
  class: { type: null, required: false },
  ui: { type: null, required: false }
});
const slots = defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.field || {} })());
</script>

<template>
  <Primitive :as="as" :class="ui.root({ class: [props.ui?.root, props.class] })">
    <div :class="ui.container({ class: props.ui?.container })">
      <span v-if="name" :class="ui.name({ class: props.ui?.name })">
        {{ name }}
      </span>

      <div v-if="type || required" :class="ui.wrapper({ class: props.ui?.wrapper })">
        <span v-if="type" :class="ui.type({ class: props.ui?.type })">
          {{ type }}
        </span>

        <span v-if="required" :class="ui.required({ class: props.ui?.required })">
          required
        </span>
      </div>
    </div>

    <div v-if="!!slots.default || description" :class="ui.description({ class: props.ui?.description })">
      <slot mdc-unwrap="p">
        {{ description }}
      </slot>
    </div>
  </Primitive>
</template>
