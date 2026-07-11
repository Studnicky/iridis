import { computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderClass, ssrRenderComponent, ssrRenderSlot } from 'vue/server-renderer';
import { z as useComponentProps, B as useAppConfig, y as useRuntimeConfig, C as tv, G as _sfc_main$f } from './server.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'better-sqlite3';
import 'vue-router';
import '@iconify/vue';
import 'tailwindcss/colors';
import '@vueuse/core';
import '@vueuse/shared';
import 'tailwind-variants';
import '@iconify/utils/lib/css/icon';
import '@studnicky/logger';
import '@studnicky/errors';
import '@studnicky/logger/builders';
import '@studnicky/logger/constants';
import '@studnicky/json';
import '@studnicky/fsm';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';

const theme = {
  "slots": {
    "base": [
      "relative text-2xl text-highlighted font-bold mt-12 mb-6 scroll-mt-[calc(48px+45px+var(--ui-header-height))] lg:scroll-mt-[calc(48px+var(--ui-header-height))] [&>a]:rounded-sm [&>a]:outline-primary/25 [&>a]:focus-visible:outline-3 [&>a>code]:border-dashed hover:[&>a>code]:border-primary hover:[&>a>code]:text-primary [&>a>code]:text-xl/7 [&>a>code]:font-bold",
      "[&>a>code]:transition-colors"
    ],
    "leading": [
      "absolute -ms-8 top-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 p-1 bg-elevated group-hover:text-primary group-focus:text-primary rounded-md hidden lg:flex text-muted",
      "transition"
    ],
    "leadingIcon": "size-4 shrink-0",
    "link": "group lg:after:absolute lg:after:inset-y-0 lg:after:-inset-s-2 lg:after:w-2"
  }
};
const _sfc_main = {
  __name: "ProseH2",
  __ssrInlineRender: true,
  props: {
    id: { type: String, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const props = useComponentProps("prose.h2", _props);
    const appConfig = useAppConfig();
    const { headings } = useRuntimeConfig().public?.mdc || {};
    const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.h2 || {} })());
    const generate = computed(() => props.id && typeof headings?.anchorLinks === "object" && headings.anchorLinks.h2);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<h2${ssrRenderAttrs(mergeProps({
        id: unref(props).id,
        class: ui.value.base({ class: [unref(props).ui?.base, unref(props).class] })
      }, _attrs))}>`);
      if (unref(props).id && generate.value) {
        _push(`<a${ssrRenderAttr("href", `#${unref(props).id}`)} class="${ssrRenderClass(ui.value.link({ class: unref(props).ui?.link }))}"><span class="${ssrRenderClass(ui.value.leading({ class: unref(props).ui?.leading }))}">`);
        _push(ssrRenderComponent(_sfc_main$f, {
          name: unref(appConfig).ui.icons.hash,
          class: ui.value.leadingIcon({ class: unref(props).ui?.leadingIcon })
        }, null, _parent));
        _push(`</span>`);
        ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
        _push(`</a>`);
      } else {
        ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      }
      _push(`</h2>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/prose/H2.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=H2-BqQNOrs3.mjs.map
