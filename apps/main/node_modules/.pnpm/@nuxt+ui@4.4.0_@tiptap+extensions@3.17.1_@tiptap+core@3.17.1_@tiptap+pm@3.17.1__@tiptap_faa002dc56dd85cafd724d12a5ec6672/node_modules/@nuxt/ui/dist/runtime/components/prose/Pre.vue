<script>
import theme from "#build/ui/prose/pre";
</script>

<script setup>
import { computed } from "vue";
import { useClipboard } from "@vueuse/core";
import { useAppConfig } from "#imports";
import { useLocale } from "../../composables/useLocale";
import { tv } from "../../utils/tv";
import UCodeIcon from "./CodeIcon.vue";
import UButton from "../Button.vue";
const props = defineProps({
  icon: { type: null, required: false },
  code: { type: String, required: false },
  language: { type: String, required: false },
  filename: { type: String, required: false },
  highlights: { type: Array, required: false },
  hideHeader: { type: Boolean, required: false },
  meta: { type: String, required: false },
  class: { type: null, required: false },
  ui: { type: null, required: false }
});
defineSlots();
const { t } = useLocale();
const { copy, copied } = useClipboard();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.pre || {} })());
</script>

<template>
  <div :class="ui.root({ class: [props.ui?.root], filename: !!filename })">
    <div v-if="filename && !hideHeader" :class="ui.header({ class: props.ui?.header })">
      <UCodeIcon :icon="icon" :filename="filename" :class="ui.icon({ class: props.ui?.icon })" />

      <span :class="ui.filename({ class: props.ui?.filename })">{{ filename }}</span>
    </div>

    <UButton
      :icon="copied ? appConfig.ui.icons.copyCheck : appConfig.ui.icons.copy"
      color="neutral"
      variant="outline"
      size="sm"
      :aria-label="t('prose.pre.copy')"
      :class="ui.copy({ class: props.ui?.copy })"
      tabindex="-1"
      @click="copy(props.code || '')"
    />

    <pre :class="ui.base({ class: [props.ui?.base, props.class] })" v-bind="$attrs"><slot /></pre>
  </div>
</template>

<style>
.shiki span.line{display:block}.shiki span.line.highlight{margin:0 -16px;padding:0 16px;@apply bg-(--ui-bg-accented)/50}
</style>
