import { computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderClass, ssrRenderSlot } from 'vue/server-renderer';
import { z as useComponentProps, B as useAppConfig, y as useRuntimeConfig, C as tv } from './server.mjs';
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
    "base": "text-4xl text-highlighted font-bold mb-8 scroll-mt-[calc(45px+var(--ui-header-height))] lg:scroll-mt-(--ui-header-height)",
    "link": "inline-flex items-center gap-2"
  }
};
const _sfc_main = {
  __name: "ProseH1",
  __ssrInlineRender: true,
  props: {
    id: { type: String, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const props = useComponentProps("prose.h1", _props);
    const appConfig = useAppConfig();
    const { headings } = useRuntimeConfig().public?.mdc || {};
    const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.h1 || {} })());
    const generate = computed(() => props.id && typeof headings?.anchorLinks === "object" && headings.anchorLinks.h1);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<h1${ssrRenderAttrs(mergeProps({
        id: unref(props).id,
        class: ui.value.base({ class: [unref(props).ui?.base, unref(props).class] })
      }, _attrs))}>`);
      if (unref(props).id && generate.value) {
        _push(`<a${ssrRenderAttr("href", `#${unref(props).id}`)} class="${ssrRenderClass(ui.value.link({ class: unref(props).ui?.link }))}">`);
        ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
        _push(`</a>`);
      } else {
        ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      }
      _push(`</h1>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/prose/H1.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=H1-DDL_qiEc.mjs.map
