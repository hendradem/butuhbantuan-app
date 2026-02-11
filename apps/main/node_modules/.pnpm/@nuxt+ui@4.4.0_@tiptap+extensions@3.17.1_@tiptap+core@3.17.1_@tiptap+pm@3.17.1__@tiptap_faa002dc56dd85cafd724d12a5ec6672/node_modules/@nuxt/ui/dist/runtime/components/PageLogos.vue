<script>
import theme from "#build/ui/page-logos";
</script>

<script setup>
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { createReusableTemplate } from "@vueuse/core";
import { useAppConfig } from "#imports";
import { tv } from "../utils/tv";
import UMarquee from "./Marquee.vue";
import UAvatar from "./Avatar.vue";
import UIcon from "./Icon.vue";
defineOptions({ inheritAttrs: false });
const [DefineCreateItemTemplate, ReuseCreateItemTemplate] = createReusableTemplate();
const props = defineProps({
  as: { type: null, required: false },
  title: { type: String, required: false },
  items: { type: Array, required: false },
  marquee: { type: [Boolean, Object], required: false, default: false },
  class: { type: null, required: false },
  ui: { type: null, required: false }
});
const slots = defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.pageLogos || {} })());
</script>

<template>
  <DefineCreateItemTemplate>
    <slot v-if="!!slots.default" />
    <template v-else-if="items?.length">
      <template v-for="(item, index) in items" :key="index">
        <UAvatar
          v-if="typeof item === 'object'"
          :src="item.src"
          :alt="item.alt"
          data-slot="logo"
          :class="ui.logo({ class: props.ui?.logo })"
        />
        <UIcon
          v-else
          :name="item"
          data-slot="logo"
          :class="ui.logo({ class: props.ui?.logo })"
        />
      </template>
    </template>
  </DefineCreateItemTemplate>

  <Primitive :as="as" v-bind="$attrs" data-slot="root" :class="ui.root({ class: [props.ui?.root, props.class] })">
    <h2 v-if="title" data-slot="title" :class="ui.title({ class: props.ui?.title })">
      {{ title }}
    </h2>

    <UMarquee
      v-if="marquee"
      v-bind="typeof marquee === 'object' ? marquee : {}"
      data-slot="logos"
      :class="ui.logos({ class: props.ui?.logos, marquee: true })"
    >
      <ReuseCreateItemTemplate :items="items" />
    </UMarquee>
    <div v-else data-slot="logos" :class="ui.logos({ class: props.ui?.logos })">
      <ReuseCreateItemTemplate :items="items" />
    </div>
  </Primitive>
</template>
