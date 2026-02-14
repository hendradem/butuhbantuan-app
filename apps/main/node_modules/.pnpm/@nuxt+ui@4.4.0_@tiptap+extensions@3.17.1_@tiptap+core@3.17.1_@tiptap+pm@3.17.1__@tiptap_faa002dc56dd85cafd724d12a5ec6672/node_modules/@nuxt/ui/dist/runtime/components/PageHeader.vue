<script>
import theme from "#build/ui/page-header";
</script>

<script setup>
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { useAppConfig } from "#imports";
import { tv } from "../utils/tv";
import UButton from "./Button.vue";
const props = defineProps({
  as: { type: null, required: false },
  headline: { type: String, required: false },
  title: { type: String, required: false },
  description: { type: String, required: false },
  links: { type: Array, required: false },
  class: { type: null, required: false },
  ui: { type: null, required: false }
});
const slots = defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.pageHeader || {} })({
  title: !!props.title || !!slots.title
}));
</script>

<template>
  <Primitive :as="as" data-slot="root" :class="ui.root({ class: [props.ui?.root, props.class] })">
    <div v-if="headline || !!slots.headline" data-slot="headline" :class="ui.headline({ class: props.ui?.headline })">
      <slot name="headline">
        {{ headline }}
      </slot>
    </div>

    <div data-slot="container" :class="ui.container({ class: props.ui?.container })">
      <div data-slot="wrapper" :class="ui.wrapper({ class: props.ui?.wrapper })">
        <h1 v-if="title || !!slots.title" data-slot="title" :class="ui.title({ class: props.ui?.title })">
          <slot name="title">
            {{ title }}
          </slot>
        </h1>

        <div v-if="links?.length || !!slots.links" data-slot="links" :class="ui.links({ class: props.ui?.links })">
          <slot name="links">
            <UButton v-for="(link, index) in links" :key="index" color="neutral" variant="outline" v-bind="link" />
          </slot>
        </div>
      </div>

      <div v-if="description || !!slots.description" data-slot="description" :class="ui.description({ class: props.ui?.description })">
        <slot name="description">
          {{ description }}
        </slot>
      </div>

      <slot />
    </div>
  </Primitive>
</template>
