import { useSlots, computed, mergeProps, unref, withCtx, createVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderClass, ssrRenderSlot as ssrRenderSlot$1, ssrInterpolate } from 'vue/server-renderer';
import { s as ssrRenderSlot } from './ssrSlot-CPI316Ci.mjs';
import { z as useComponentProps, B as useAppConfig, C as tv, ad as _sfc_main$b, G as _sfc_main$f } from './server.mjs';
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
  "slots": {
    "base": [
      "group relative block my-5 p-4 sm:p-6 border border-default rounded-md bg-default",
      "transition-colors"
    ],
    "icon": "size-6 mb-2 block",
    "title": "text-highlighted font-semibold",
    "description": "text-[15px] text-muted *:first:mt-0 *:last:mb-0 *:my-1",
    "externalIcon": [
      "size-4 align-top absolute right-2 top-2 text-dimmed pointer-events-none",
      "transition-colors"
    ]
  },
  "variants": {
    "color": {
      "primary": {
        "icon": "text-primary"
      },
      "secondary": {
        "icon": "text-secondary"
      },
      "success": {
        "icon": "text-success"
      },
      "info": {
        "icon": "text-info"
      },
      "warning": {
        "icon": "text-warning"
      },
      "error": {
        "icon": "text-error"
      },
      "neutral": {
        "icon": "text-highlighted"
      }
    },
    "to": {
      "true": ""
    },
    "title": {
      "true": {
        "description": "mt-1"
      }
    }
  },
  "compoundVariants": [
    {
      "color": "primary",
      "to": true,
      "class": {
        "base": "hover:bg-primary/10 hover:border-primary outline-primary/25 has-[>a:focus-visible]:outline-3 has-[>a:focus-visible]:border-primary",
        "externalIcon": "group-hover:text-primary"
      }
    },
    {
      "color": "secondary",
      "to": true,
      "class": {
        "base": "hover:bg-secondary/10 hover:border-secondary outline-secondary/25 has-[>a:focus-visible]:outline-3 has-[>a:focus-visible]:border-secondary",
        "externalIcon": "group-hover:text-secondary"
      }
    },
    {
      "color": "success",
      "to": true,
      "class": {
        "base": "hover:bg-success/10 hover:border-success outline-success/25 has-[>a:focus-visible]:outline-3 has-[>a:focus-visible]:border-success",
        "externalIcon": "group-hover:text-success"
      }
    },
    {
      "color": "info",
      "to": true,
      "class": {
        "base": "hover:bg-info/10 hover:border-info outline-info/25 has-[>a:focus-visible]:outline-3 has-[>a:focus-visible]:border-info",
        "externalIcon": "group-hover:text-info"
      }
    },
    {
      "color": "warning",
      "to": true,
      "class": {
        "base": "hover:bg-warning/10 hover:border-warning outline-warning/25 has-[>a:focus-visible]:outline-3 has-[>a:focus-visible]:border-warning",
        "externalIcon": "group-hover:text-warning"
      }
    },
    {
      "color": "error",
      "to": true,
      "class": {
        "base": "hover:bg-error/10 hover:border-error outline-error/25 has-[>a:focus-visible]:outline-3 has-[>a:focus-visible]:border-error",
        "externalIcon": "group-hover:text-error"
      }
    },
    {
      "color": "neutral",
      "to": true,
      "class": {
        "base": "hover:bg-elevated/50 hover:border-inverted outline-inverted/25 has-[>a:focus-visible]:outline-3 has-[>a:focus-visible]:border-inverted",
        "externalIcon": "group-hover:text-highlighted"
      }
    }
  ],
  "defaultVariants": {
    "color": "primary"
  }
};
const _sfc_main = /* @__PURE__ */ Object.assign({ inheritAttrs: false }, {
  __name: "ProseCard",
  __ssrInlineRender: true,
  props: {
    to: { type: null, required: false },
    target: { type: [String, Object, null], required: false },
    icon: { type: null, required: false },
    title: { type: String, required: false },
    description: { type: String, required: false },
    color: { type: null, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const slots = useSlots();
    const props = useComponentProps("prose.card", _props);
    const appConfig = useAppConfig();
    const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.card || {} })({
      color: props.color,
      to: !!props.to,
      title: !!props.title
    }));
    const target = computed(() => props.target || (!!props.to && typeof props.to === "string" && props.to.startsWith("http") ? "_blank" : void 0));
    const ariaLabel = computed(() => (props.title || "Card link").trim());
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ui.value.base({ class: [unref(props).ui?.base, unref(props).class] })
      }, _attrs))}>`);
      if (unref(props).to) {
        _push(ssrRenderComponent(_sfc_main$b, mergeProps({ "aria-label": ariaLabel.value }, { to: unref(props).to, target: target.value, ..._ctx.$attrs }, {
          class: "focus:outline-none",
          raw: ""
        }), {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<span class="absolute inset-0" aria-hidden="true"${_scopeId}></span>`);
            } else {
              return [
                createVNode("span", {
                  class: "absolute inset-0",
                  "aria-hidden": "true"
                })
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<!---->`);
      }
      if (unref(props).icon) {
        _push(ssrRenderComponent(_sfc_main$f, {
          name: unref(props).icon,
          class: ui.value.icon({ class: unref(props).ui?.icon })
        }, null, _parent));
      } else {
        _push(`<!---->`);
      }
      if (!!unref(props).to && target.value === "_blank") {
        _push(ssrRenderComponent(_sfc_main$f, {
          name: unref(appConfig).ui.icons.external,
          class: ui.value.externalIcon({ class: unref(props).ui?.externalIcon })
        }, null, _parent));
      } else {
        _push(`<!---->`);
      }
      if (unref(props).title || !!slots.title) {
        _push(`<p class="${ssrRenderClass(ui.value.title({ class: unref(props).ui?.title }))}">`);
        ssrRenderSlot(_ctx.$slots, "title", { mdcUnwrap: "p" }, () => {
          _push(`${ssrInterpolate(unref(props).title)}`);
        }, _push, _parent);
        _push(`</p>`);
      } else {
        _push(`<!---->`);
      }
      if (!!slots.default) {
        _push(`<div class="${ssrRenderClass(ui.value.description({ class: unref(props).ui?.description }))}">`);
        ssrRenderSlot$1(_ctx.$slots, "default", {}, () => {
          _push(`${ssrInterpolate(unref(props).description)}`);
        }, _push, _parent);
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/prose/Card.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=Card-CEUOlM04.mjs.map
