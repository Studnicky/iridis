<template>
  <slot
    :data="data?.data"
    :body="data?.body"
    :toc="data?.toc"
    :excerpt="data?.excerpt"
    :error="error"
  >
    <MDCRenderer
      v-if="body"
      :tag="props.tag"
      :class="props.class"
      :body="body"
      :data="data?.data"
      :unwrap="props.unwrap"
      :components="props.components"
    />
  </slot>
</template>

<script setup>
import { useAsyncData } from "nuxt/app";
import { watch, computed } from "vue";
import { createCachedParser } from "@nuxtjs/mdc/runtime";
const props = defineProps({
  tag: {
    type: [String, Boolean],
    default: "div"
  },
  /**
   * Raw markdown string or parsed markdown object from `parseMarkdown`
   */
  value: {
    type: [String, Object],
    required: true
  },
  /**
   * Render only the excerpt
   */
  excerpt: {
    type: Boolean,
    default: false
  },
  /**
   * Options for `parseMarkdown`
   */
  parserOptions: {
    type: Object,
    default: () => ({})
  },
  /**
   * Class to be applied to the root element
   */
  class: {
    type: [String, Array, Object],
    default: ""
  },
  /**
   * Tags to unwrap separated by spaces
   * Example: 'ul li'
   */
  unwrap: {
    type: [Boolean, String],
    default: false
  },
  /**
   * Async Data Unique Key
   * @default `hash(props.value)`
   */
  cacheKey: {
    type: String,
    default: void 0
  },
  /**
   * Partial parsing (if partial is `true`, title and toc generation will not be generated)
   */
  partial: {
    type: Boolean,
    default: true
  },
  /**
   * The map of custom components to use for rendering.
   */
  components: {
    type: Object,
    default: () => ({})
  }
});
const key = computed(() => props.cacheKey ?? hashString(props.value));
const parse = createCachedParser({
  ...props.parserOptions,
  toc: props.partial ? false : props.parserOptions?.toc,
  contentHeading: props.partial ? false : props.parserOptions?.contentHeading
});
const { data, refresh, error } = await useAsyncData(key.value, async () => {
  if (typeof props.value !== "string") {
    return props.value;
  }
  return await parse(props.value);
});
const body = computed(() => props.excerpt ? data.value?.excerpt : data.value?.body);
watch(() => props.value, () => {
  refresh();
}, { immediate: true });
function hashString(str) {
  if (typeof str !== "string") {
    str = JSON.stringify(str || "");
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 6) - hash + char;
    hash = hash & hash;
  }
  return `mdc-${hash === 0 ? "0000" : hash.toString(36)}-key`;
}
</script>
