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
  send({ 'type': IridisUiActionType.DIAGRAM_RESET });
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
  send({ 'type': IridisUiActionType.DIAGRAM_FIT });
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
  // The container's fixed/inset switch animates over 300ms (transition-all
  // duration-300) — measuring before it settles fits against a mid-animation
  // size. Fit once early for immediate feedback, then again once the
  // transition has actually finished so the final fit is accurate.
  setTimeout(() => fitToView(), 50);
  setTimeout(() => fitToView(), 320);
};

// Handle Escape key to exit expanded mode
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isExpanded.value) {
    toggleExpand();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
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

const startDrag = (e: PointerEvent) => {
  if (e.button !== 0) return;
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  if (viewportRef.value) viewportRef.value.setPointerCapture(e.pointerId);
};

const onDrag = (e: PointerEvent) => {
  if (!isDragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  send({ 'dx': dx, 'dy': dy, 'type': IridisUiActionType.DIAGRAM_PAN });
  lastX = e.clientX;
  lastY = e.clientY;
};

const endDrag = (e: PointerEvent) => {
  isDragging = false;
  if (viewportRef.value) {
    try { viewportRef.value.releasePointerCapture(e.pointerId); } catch (err) { console.warn('releasePointerCapture failed:', err); }
  }
};

const naturalSize = (svg: SVGSVGElement): { w: number, h: number } => {
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/);
    const w = parseFloat(parts[2] || '0');
    const h = parseFloat(parts[3] || '0');
    if (w > 0 && h > 0) return { w, h };
  }
  try {
    const bbox = svg.getBBox();
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
  document.removeEventListener('keydown', handleKeydown);
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
    />
  </Teleport>

  <Teleport
    to="body"
    :disabled="!isExpanded"
  >
    <div
      class="my-8 w-full border border-default bg-elevated/30 shadow-sm relative group select-none transition-all duration-300 flex flex-col overflow-hidden"
      :class="isExpanded ? 'fixed inset-6 z-[9999] rounded-xl bg-elevated shadow-2xl' : 'h-[500px] rounded-xl'"
    >
      <!-- Viewport Container -->
      <div 
        ref="viewportRef"
        class="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
        @wheel="handleWheel" 
        @pointerdown="startDrag"
        @pointermove="onDrag"
        @pointerup="endDrag"
        @pointerleave="endDrag"
      >
        <!-- Diagram Wrapper -->
        <div 
          class="origin-top-left absolute top-0 left-0"
          :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`, transition: isDragging ? 'none' : 'transform 75ms ease-out' }"
        >
          <div
            class="mermaid-container [&_svg]:max-w-none [&_svg]:w-auto [&_svg]:h-auto"
            v-html="svgContent"
          />
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
          <button
            class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Zoom in"
            @click="zoom(1.2)"
          >
            <UIcon
              name="i-material-symbols-zoom-in-rounded"
              class="h-4 w-4"
            />
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Pan up"
            @click="pan(0, 50)"
          >
            <UIcon
              name="i-material-symbols-keyboard-arrow-up-rounded"
              class="h-4 w-4"
            />
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Zoom out"
            @click="zoom(0.8)"
          >
            <UIcon
              name="i-material-symbols-zoom-out-rounded"
              class="h-4 w-4"
            />
          </button>

          <!-- Row 2 -->
          <button
            class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Pan left"
            @click="pan(50, 0)"
          >
            <UIcon
              name="i-material-symbols-keyboard-arrow-left"
              class="h-4 w-4"
            />
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Centre view"
            aria-label="Centre diagram view"
            @click="resetView"
          >
            <UIcon
              name="i-material-symbols-restart-alt-rounded"
              class="h-4 w-4"
            />
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Pan right"
            @click="pan(-50, 0)"
          >
            <UIcon
              name="i-material-symbols-keyboard-arrow-right"
              class="h-4 w-4"
            />
          </button>

          <!-- Row 3 -->
          <button
            class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :title="isExpanded ? 'Collapse' : 'Expand zoom'"
            @click="toggleExpand"
          >
            <UIcon
              :name="isExpanded ? 'i-material-symbols-close-fullscreen-rounded' : 'i-material-symbols-open-in-full-rounded'"
              class="h-4 w-4"
            />
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Pan down"
            @click="pan(0, -50)"
          >
            <UIcon
              name="i-material-symbols-keyboard-arrow-down-rounded"
              class="h-4 w-4"
            />
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center bg-elevated border border-default rounded text-muted hover:bg-default hover:text-primary hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Fit to view"
            aria-label="Fit diagram to view"
            @click="fitToView"
          >
            <UIcon
              name="i-material-symbols-fit-screen-rounded"
              class="h-4 w-4"
            />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
