import { defineComponent, computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderComponent } from 'vue/server-renderer';
import { C as CodeBlock, g as globalVscodeTheme } from './index-yCAGl1nt.mjs';
import './server.mjs';
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
import './Tabs-Co96UC_3.mjs';
import './TabsTrigger-D-Z4Hpql.mjs';
import './RovingFocusItem-DDD-48Oz.mjs';
import './useId-DlF9G45c.mjs';
import './useDirection-D6CyCyua.mjs';
import './Badge-BckZTFui.mjs';
import '@floating-ui/vue';
import 'aria-hidden';
import './TreeItem-BEtChUhZ.mjs';
import './Kbd-D12chYH3.mjs';
import '@tanstack/vue-table';
import '@tanstack/vue-virtual';
import './AccordionTrigger-CJcLvdgk.mjs';
import './CollapsibleTrigger-Ci7Nuceh.mjs';
import 'shiki';
import 'shiki/engine/javascript';
import 'property-information';
import './node-CIB8iVlG.mjs';
import 'minimark/hast';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ProsePre",
  __ssrInlineRender: true,
  props: {
    code: {},
    language: {},
    filename: {},
    highlights: {},
    meta: {},
    class: {}
  },
  setup(__props) {
    const props = __props;
    const langMap = {
      "js": "javascript",
      "javascript": "javascript",
      "ts": "typescript",
      "typescript": "typescript",
      "css": "css",
      "json": "json",
      "xml": "xml",
      "html": "html",
      "sh": "bash",
      "bash": "bash"
    };
    const lang = computed(() => langMap[props.language || ""] || "bash");
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(CodeBlock, mergeProps({
        code: props.code || "",
        lang: lang.value,
        "vscode-theme": unref(globalVscodeTheme)
      }, _attrs), null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/content/ProsePre.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const ProsePre = Object.assign(_sfc_main, { __name: "ProsePre" });

export { ProsePre as default };
//# sourceMappingURL=ProsePre-CsJwiP-s.mjs.map
