<script setup>
import { kebabCase, pascalCase } from "scule";
import { resolveComponent, toRaw, defineAsyncComponent, computed } from "vue";
import htmlTags from "@nuxtjs/mdc/runtime/parser/utils/html-tags-list";
import MDCRenderer from "@nuxtjs/mdc/runtime/components/MDCRenderer.vue";
import { toHast } from "minimark/hast";
import { globalComponents, localComponents, localComponentLoaders } from "#content/components";
import { useRuntimeConfig } from "#imports";
const renderFunctions = ["render", "ssrRender", "__ssrInlineRender"];
const props = defineProps({
  /**
   * Content to render
   */
  value: {
    type: Object,
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
   * Root tag to use for rendering
   */
  tag: {
    type: String,
    default: "div"
  },
  /**
   * The map of custom components to use for rendering.
   */
  components: {
    type: Object,
    default: () => ({})
  },
  data: {
    type: Object,
    default: () => ({})
  },
  /**
   * Whether or not to render Prose components instead of HTML tags
   */
  prose: {
    type: Boolean,
    default: void 0
  },
  /**
   * Root tag to use for rendering
   */
  class: {
    type: [String, Object],
    default: void 0
  },
  /**
   * Tags to unwrap separated by spaces
   * Example: 'ul li'
   */
  unwrap: {
    type: [Boolean, String],
    default: false
  }
});
const debug = import.meta.dev || import.meta.preview;
const body = computed(() => {
  let body2 = props.value.body || props.value;
  if (props.excerpt && props.value.excerpt) {
    body2 = props.value.excerpt;
  }
  if (body2.type === "minimal" || body2.type === "minimark") {
    return toHast({ type: "minimark", value: body2.value });
  }
  return body2;
});
const isEmpty = computed(() => !body.value?.children?.length);
const data = computed(() => {
  const { body: body2, excerpt, ...data2 } = props.value;
  return {
    ...data2,
    ...props.data
  };
});
const proseComponentMap = Object.fromEntries(["p", "a", "blockquote", "code", "pre", "code", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "img", "ul", "ol", "li", "strong", "table", "thead", "tbody", "td", "th", "tr", "script"].map((t) => [t, `prose-${t}`]));
const { mdc } = useRuntimeConfig().public || {};
const propsDataMDC = computed(() => props.data.mdc);
const tags = computed(() => ({
  ...mdc?.components?.prose && props.prose !== false ? proseComponentMap : {},
  ...mdc?.components?.map || {},
  ...toRaw(propsDataMDC.value?.components || {}),
  ...props.components
}));
const componentsMap = computed(() => {
  return body.value ? resolveContentComponents(body.value, { tags: tags.value }) : {};
});
function resolveVueComponent(component) {
  let _component = component;
  if (typeof component === "string") {
    if (htmlTags.has(component)) {
      return component;
    }
    if (globalComponents.includes(pascalCase(component))) {
      _component = resolveComponent(component, false);
    } else if (localComponents.includes(pascalCase(component))) {
      const loader = localComponentLoaders[pascalCase(component)];
      _component = loader ? defineAsyncComponent(loader) : void 0;
    }
    if (typeof _component === "string") {
      return _component;
    }
  }
  if (!_component) {
    return _component;
  }
  const componentObject = _component;
  if ("__asyncLoader" in componentObject) {
    return componentObject;
  }
  if ("setup" in componentObject) {
    return defineAsyncComponent(() => Promise.resolve(componentObject));
  }
  return componentObject;
}
function resolveContentComponents(body2, meta) {
  if (!body2) {
    return;
  }
  const components = Array.from(new Set(loadComponents(body2, meta)));
  const result = {};
  for (const [tag, component] of components) {
    if (result[tag]) {
      continue;
    }
    if (typeof component === "object" && renderFunctions.some((fn) => Object.hasOwnProperty.call(component, fn))) {
      result[tag] = component;
      continue;
    }
    result[tag] = resolveVueComponent(component);
  }
  return result;
}
function loadComponents(node, documentMeta) {
  const tag = node.tag;
  if (node.type === "text" || tag === "binding" || node.type === "comment") {
    return [];
  }
  const renderTag = findMappedTag(node, documentMeta.tags);
  const components2 = [];
  if (node.type !== "root" && !htmlTags.has(renderTag)) {
    components2.push([tag, renderTag]);
  }
  for (const child of node.children || []) {
    components2.push(...loadComponents(child, documentMeta));
  }
  return components2;
}
function findMappedTag(node, tags2) {
  const tag = node.tag;
  if (!tag || typeof node.props?.__ignoreMap !== "undefined") {
    return tag;
  }
  return tags2[tag] || tags2[pascalCase(tag)] || tags2[kebabCase(node.tag)] || tag;
}
</script>

<template>
  <MDCRenderer
    v-if="!isEmpty"
    :body="body"
    :data="data"
    :class="props.class"
    :tag="props.tag"
    :prose="props.prose"
    :unwrap="props.unwrap"
    :components="componentsMap"
    :data-content-id="debug ? value.id : void 0"
  />
  <slot
    v-else
    name="empty"
    :body="body"
    :data="data"
    :data-content-id="debug ? value.id : void 0"
  >
    <!-- nobody -->
  </slot>
</template>
