import { defineComponent, ref, watch, unref, useSSRContext } from 'vue';
import { ssrRenderTeleport, ssrRenderClass, ssrRenderStyle, ssrInterpolate, ssrRenderAttr } from 'vue/server-renderer';
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs';
import { ai as useState } from './server.mjs';
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

const useColorMode = () => {
  return useState("color-mode").value;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "MermaidDiagram",
  __ssrInlineRender: true,
  props: {
    code: {}
  },
  setup(__props) {
    const props = __props;
    const svgContent = ref("");
    const renderId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
    const colorMode = useColorMode();
    const viewportRef = ref(null);
    const isExpanded = ref(false);
    const scale = ref(1);
    const translateX = ref(0);
    const translateY = ref(0);
    const fitToView = () => {
      if (!viewportRef.value) return;
      const svg = viewportRef.value.querySelector("svg");
      if (!svg) return;
      const vWidth = viewportRef.value.clientWidth;
      const vHeight = viewportRef.value.clientHeight;
      const sWidth = parseFloat(svg.style.width || svg.getAttribute("width") || "0");
      const sHeight = parseFloat(svg.style.height || svg.getAttribute("height") || "0");
      if (sWidth > 0 && sHeight > 0) {
        const scaleX = vWidth * 0.92 / sWidth;
        const scaleY = vHeight * 0.92 / sHeight;
        scale.value = Math.min(scaleX, scaleY, 1);
        translateX.value = (vWidth - sWidth * scale.value) / 2;
        translateY.value = (vHeight - sHeight * scale.value) / 2;
      }
    };
    let isDragging = false;
    const naturalSize = (svg) => {
      const vb = svg.getAttribute("viewBox");
      if (vb) {
        const parts = vb.trim().split(/[\s,]+/);
        const w = parseFloat(parts[2] || "0");
        const h = parseFloat(parts[3] || "0");
        if (w > 0 && h > 0) return { w, h };
      }
      try {
        const bbox = svg.getBBox();
        if (bbox.width > 0 && bbox.height > 0) return { w: bbox.width, h: bbox.height };
      } catch (e) {
      }
      return { w: 1024, h: 768 };
    };
    const renderMermaid = async () => {
      if (!props.code) return;
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            fontFamily: "var(--font-display)",
            primaryColor: "var(--ui-bg-elevated)",
            primaryTextColor: "var(--ui-text-highlighted)",
            primaryBorderColor: "var(--ui-primary)",
            lineColor: "var(--ui-primary)",
            secondaryColor: "var(--ui-bg-elevated)",
            tertiaryColor: "var(--ui-bg)"
          }
        });
        const { svg } = await mermaid.render(renderId, props.code);
        svgContent.value = svg;
        setTimeout(() => {
          if (!viewportRef.value) return;
          const svgEl = viewportRef.value.querySelector("svg");
          if (svgEl) {
            const n = naturalSize(svgEl);
            svgEl.removeAttribute("width");
            svgEl.removeAttribute("height");
            svgEl.style.width = `${n.w}px`;
            svgEl.style.height = `${n.h}px`;
            svgEl.style.maxWidth = "none";
            svgEl.style.display = "block";
          }
          fitToView();
        }, 50);
      } catch (e) {
        console.error("Mermaid render error:", e);
        const msg = e instanceof Error ? e.message : String(e);
        svgContent.value = `<div class="text-error font-mono text-sm p-4 whitespace-pre-wrap">Failed to render Mermaid diagram:
${msg}</div>`;
      }
    };
    watch([() => props.code, () => colorMode.value], renderMermaid);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<!--[-->`);
      ssrRenderTeleport(_push, (_push2) => {
        if (isExpanded.value) {
          _push2(`<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity"></div>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      _push(`<div class="${ssrRenderClass([isExpanded.value ? "fixed inset-6 z-[9999] rounded-xl bg-elevated shadow-2xl" : "h-[500px] rounded-xl", "my-8 w-full border border-default bg-elevated/30 shadow-sm relative group select-none transition-all duration-300 flex flex-col overflow-hidden"])}"><div class="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"><div class="origin-top-left absolute top-0 left-0" style="${ssrRenderStyle({ transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`, transition: unref(isDragging) ? "none" : "transform 75ms ease-out" })}"><div class="mermaid-container [&amp;_svg]:max-w-none [&amp;_svg]:w-auto [&amp;_svg]:h-auto">${svgContent.value ?? ""}</div></div></div><div class="absolute bottom-4 right-4 flex flex-col items-end gap-1.5 z-10 pointer-events-none"><aside class="inline-flex items-center gap-2 px-2.5 py-1 bg-black/55 backdrop-blur-sm border border-default/30 rounded font-mono text-xs text-white"><span class="font-bold text-primary">${ssrInterpolate(scale.value.toFixed(2))}×</span><span class="text-muted/90 uppercase tracking-[0.08em] text-[10px]">drag · wheel</span></aside><div class="grid grid-cols-3 grid-rows-3 gap-1 bg-black/30 p-1.5 rounded-lg backdrop-blur-sm pointer-events-auto"><button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Zoom in">＋</button><button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Pan up">▲</button><button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Zoom out">－</button><button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Pan left">◀</button><button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Centre view">⊙</button><button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Pan right">▶</button><button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"${ssrRenderAttr("title", isExpanded.value ? "Collapse" : "Expand zoom")}>⛶</button><button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Pan down">▼</button><button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Fit to view">⤢</button></div></div></div><!--]-->`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/content/MermaidDiagram.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const MermaidDiagram = Object.assign(_sfc_main, { __name: "MermaidDiagram" });

export { MermaidDiagram as default };
//# sourceMappingURL=MermaidDiagram-Bhj2VPdX.mjs.map
