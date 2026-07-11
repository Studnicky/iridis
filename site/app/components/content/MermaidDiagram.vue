<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs';
import { useColorMode } from '#imports';
import { useIridis } from '~/composables/useIridis.ts';
import { IridisUiActionType } from '~/composables/types/index.ts';

const props = defineProps<{
  code: string;
}>();

const svgContent = ref('');
const renderId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
const colorMode = useColorMode();
const { diagramScale: scale, diagramTranslateX: translateX, diagramTranslateY: translateY, diagramIsExpanded: isExpanded, send } = useIridis();

const viewportRef = ref<HTMLElement | null>(null);

const resetView = () => {
  if (!viewportRef.value) return;
  const svg = viewportRef.value.querySelector('svg');
  if (!svg) return;
  const vWidth = viewportRef.value.clientWidth;
  const vHeight = viewportRef.value.clientHeight;
  const sWidth = parseFloat(svg.style.width || svg.getAttribute('width') || '0');
  const sHeight = parseFloat(svg.style.height || svg.getAttribute('height') || '0');
  if (sWidth > 0 && sHeight > 0) {
    translateX.value = (vWidth - sWidth * scale.value) / 2;
    translateY.value = (vHeight - sHeight * scale.value) / 2;
  }
};

const fitToView = () => {
  if (!viewportRef.value) return;
  const svg = viewportRef.value.querySelector('svg');
  if (!svg) return;

  const vWidth = viewportRef.value.clientWidth;
  const vHeight = viewportRef.value.clientHeight;
  const sWidth = parseFloat(svg.style.width || svg.getAttribute('width') || '0');
  const sHeight = parseFloat(svg.style.height || svg.getAttribute('height') || '0');

  if (sWidth > 0 && sHeight > 0) {
    const scaleX = (vWidth * 0.92) / sWidth;
    const scaleY = (vHeight * 0.92) / sHeight;
    scale.value = Math.min(scaleX, scaleY, 1);
    translateX.value = (vWidth - sWidth * scale.value) / 2;
    translateY.value = (vHeight - sHeight * scale.value) / 2;
  }
};

const toggleExpand = () => {
  send({ 'type': IridisUiActionType.DIAGRAM_TOGGLE_EXPAND });
  // Let the layout settle, then fit
  setTimeout(() => fitToView(), 50);
};

// Handle Escape key to exit expanded mode
onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isExpanded.value) {
      toggleExpand();
    }
  });
});

const pan = (dx: number, dy: number) => {
  send({ 'dx': dx, 'dy': dy, 'type': IridisUiActionType.DIAGRAM_PAN });
};

const zoom = (factor: number) => {
  send({ 'factor': factor, 'type': IridisUiActionType.DIAGRAM_ZOOM });
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();

  if (e.shiftKey) {
    // Pan when holding shift
    send({ 'dx': -e.deltaX, 'dy': -e.deltaY, 'type': IridisUiActionType.DIAGRAM_PAN });
    return;
  }

  // Zoom by default
  const factor = Math.exp(-e.deltaY * 0.0015);
  send({ 'factor': factor, 'type': IridisUiActionType.DIAGRAM_ZOOM });
};

let isDragging = false;
let lastX = 0;
let lastY = 0;

const startDrag = (e: MouseEvent) => {
  if (e.button !== 0) return;
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  if (viewportRef.value) viewportRef.value.setPointerCapture(e.pointerId || 1);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  send({ 'dx': dx, 'dy': dy, 'type': IridisUiActionType.DIAGRAM_PAN });
  lastX = e.clientX;
  lastY = e.clientY;
};

const endDrag = (e: MouseEvent) => {
  isDragging = false;
  if (viewportRef.value) {
    try { viewportRef.value.releasePointerCapture(e.pointerId || 1); } catch(err) {}
  }
};

const naturalSize = (svg: HTMLElement): { w: number, h: number } => {
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/);
    const w = parseFloat(parts[2] || '0');
    const h = parseFloat(parts[3] || '0');
    if (w > 0 && h > 0) return { w, h };
  }
  try {
    const bbox = (svg as unknown as SVGGraphicsElement).getBBox();
    if (bbox.width > 0 && bbox.height > 0) return { w: bbox.width, h: bbox.height };
  } catch (e) {}
  return { w: 1024, h: 768 };
};

const getComputedColor = (varName: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || '#ffffff';
};

const renderMermaid = async () => {
  if (!props.code) return;

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: getComputedColor('--ui-bg-elevated'),
        primaryTextColor: getComputedColor('--ui-text-highlighted'),
        primaryBorderColor: getComputedColor('--ui-primary'),
        lineColor: getComputedColor('--ui-primary'),
        secondaryColor: getComputedColor('--ui-bg-elevated'),
        tertiaryColor: getComputedColor('--ui-bg'),
      }
    });
    
    const { svg } = await mermaid.render(renderId, props.code);
    svgContent.value = svg;
    
    setTimeout(() => {
      if (!viewportRef.value) return;
      const svgEl = viewportRef.value.querySelector('svg');
      if (svgEl) {
        const n = naturalSize(svgEl);
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.style.width = `${n.w}px`;
        svgEl.style.height = `${n.h}px`;
        svgEl.style.maxWidth = 'none';
        svgEl.style.display = 'block';
      }
      fitToView();
    }, 50);
  } catch (e) {
    console.error('Mermaid render error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    svgContent.value = `<div class="text-error font-mono text-sm p-4 whitespace-pre-wrap">Failed to render Mermaid diagram:\n${msg}</div>`;
  }
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  renderMermaid();
  
  if (viewportRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          fitToView();
        }
      }
    });
    resizeObserver.observe(viewportRef.value);
  }
});

import { onUnmounted } from 'vue';
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

watch([() => props.code, () => colorMode.value], renderMermaid);
</script>

<template>
  <!-- Backdrop for expanded mode -->
  <Teleport to="body">
    <div 
      v-if="isExpanded" 
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity" 
      @click="toggleExpand"
    ></div>
  </Teleport>

  <div 
    class="my-8 w-full border border-default bg-elevated/30 shadow-sm relative group select-none transition-all duration-300 flex flex-col overflow-hidden"
    :class="isExpanded ? 'fixed inset-6 z-[9999] rounded-xl bg-elevated shadow-2xl' : 'h-[500px] rounded-xl'"
  >
    <!-- Viewport Container -->
    <div 
      ref="viewportRef"
      class="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
      @wheel="handleWheel" 
      @mousedown="startDrag"
      @mousemove="onDrag"
      @mouseup="endDrag"
      @mouseleave="endDrag"
    >
      <!-- Diagram Wrapper -->
      <div 
        class="origin-top-left absolute top-0 left-0"
        :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`, transition: isDragging ? 'none' : 'transform 75ms ease-out' }"
      >
        <div v-html="svgContent" class="mermaid-container [&_svg]:max-w-none [&_svg]:w-auto [&_svg]:h-auto" />
      </div>
    </div>

    <!-- Dagonizer D-PAD & Navigation Overlay -->
    <div class="absolute bottom-4 right-4 flex flex-col items-end gap-1.5 z-10 pointer-events-none">
      
      <!-- Zoom level readout HUD -->
      <aside class="inline-flex items-center gap-2 px-2.5 py-1 bg-black/55 backdrop-blur-sm border border-default/30 rounded font-mono text-xs text-white">
        <span class="font-bold text-primary">{{ scale.toFixed(2) }}×</span>
        <span class="text-muted/90 uppercase tracking-[0.08em] text-[10px]">drag · wheel</span>
      </aside>

      <!-- 3x3 D-pad grid -->
      <div class="grid grid-cols-3 grid-rows-3 gap-1 bg-black/30 p-1.5 rounded-lg backdrop-blur-sm pointer-events-auto">
        <!-- Row 1 -->
        <button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Zoom in" @click="zoom(1.2)">＋</button>
        <button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Pan up" @click="pan(0, 50)">▲</button>
        <button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Zoom out" @click="zoom(0.8)">－</button>

        <!-- Row 2 -->
        <button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Pan left" @click="pan(50, 0)">◀</button>
        <button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Centre view" @click="resetView">⊙</button>
        <button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Pan right" @click="pan(-50, 0)">▶</button>

        <!-- Row 3 -->
        <button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" :title="isExpanded ? 'Collapse' : 'Expand zoom'" @click="toggleExpand">⛶</button>
        <button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Pan down" @click="pan(0, -50)">▼</button>
        <button class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Fit to view" @click="fitToView">⤢</button>
      </div>
    </div>
  </div>
</template>
