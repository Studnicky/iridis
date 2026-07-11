import { useModel, computed, mergeProps, unref, mergeModels, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderSlot, ssrRenderClass, ssrRenderComponent } from 'vue/server-renderer';
import { z as useComponentProps, S as useLocale, B as useAppConfig, C as tv, U as _sfc_main$a } from './server.mjs';
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
    "root": "relative my-5 bg-muted [&>div]:my-0 [&_pre]:max-h-[80vh] [&_pre]:pb-12",
    "footer": "h-16 absolute inset-x-px bottom-px rounded-b-md flex items-center justify-center",
    "trigger": "group",
    "triggerIcon": "group-data-[state=open]:rotate-180"
  },
  "variants": {
    "open": {
      "true": {
        "root": "rounded-md"
      },
      "false": {
        "root": "max-h-[200px] overflow-hidden rounded-b-md [&_pre]:overflow-hidden",
        "footer": "inset-x-0 bottom-0 border border-t-0 border-muted bg-linear-to-t from-muted"
      }
    }
  }
};
const _sfc_main = {
  __name: "ProseCodeCollapse",
  __ssrInlineRender: true,
  props: /* @__PURE__ */ mergeModels({
    icon: { type: null, required: false },
    name: { type: String, required: false },
    openText: { type: String, required: false },
    closeText: { type: String, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  }, {
    "open": { type: Boolean, ...{ default: false } },
    "openModifiers": {}
  }),
  emits: ["update:open"],
  setup(__props) {
    const _props = __props;
    const props = useComponentProps("prose.codeCollapse", _props);
    const open = useModel(__props, "open", { type: Boolean, ...{ default: false } });
    const { t } = useLocale();
    const appConfig = useAppConfig();
    const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.codeCollapse || {} })({
      open: open.value
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ui.value.root({ class: [unref(props).ui?.root, unref(props).class] })
      }, _attrs))}>`);
      ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      _push(`<div class="${ssrRenderClass(ui.value.footer({ class: unref(props).ui?.footer }))}">`);
      _push(ssrRenderComponent(_sfc_main$a, {
        icon: unref(props).icon || unref(appConfig).ui.icons.chevronDown,
        color: "neutral",
        variant: "outline",
        "data-state": open.value ? "open" : "closed",
        label: `${open.value ? unref(props).closeText || unref(t)("prose.codeCollapse.closeText") : unref(props).openText || unref(t)("prose.codeCollapse.openText")} ${unref(props).name || unref(t)("prose.codeCollapse.name")}`,
        class: ui.value.trigger({ class: unref(props).ui?.trigger }),
        ui: { leadingIcon: ui.value.triggerIcon({ class: unref(props).ui?.triggerIcon }) },
        onClick: ($event) => open.value = !open.value
      }, null, _parent));
      _push(`</div></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/prose/CodeCollapse.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=CodeCollapse-DKnO11bl.mjs.map
