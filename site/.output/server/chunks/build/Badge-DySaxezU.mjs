import { computed, mergeProps, unref, withCtx, useSSRContext } from 'vue';
import { ssrRenderComponent } from 'vue/server-renderer';
import { s as ssrRenderSlot } from './ssrSlot-CPI316Ci.mjs';
import { r as renderSlot } from './slot-7UlrbIuG.mjs';
import { z as useComponentProps, B as useAppConfig, C as tv } from './server.mjs';
import { _ as _sfc_main$1 } from './Badge-BckZTFui.mjs';
import './node-CIB8iVlG.mjs';
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
  "base": "rounded-full"
};
const _sfc_main = {
  __name: "ProseBadge",
  __ssrInlineRender: true,
  props: {
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const props = useComponentProps("prose.badge", _props);
    const appConfig = useAppConfig();
    const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.badge || {} }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(_sfc_main$1, mergeProps({
        color: "primary",
        variant: "subtle",
        class: ui.value({ class: [unref(props).ui?.base, unref(props).class] })
      }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            ssrRenderSlot(_ctx.$slots, "default", { mdcUnwrap: "p" }, null, _push2, _parent2, _scopeId);
          } else {
            return [
              renderSlot(_ctx.$slots, "default", { mdcUnwrap: "p" })
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/prose/Badge.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=Badge-DySaxezU.mjs.map
