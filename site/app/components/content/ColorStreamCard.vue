<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

import { ColorStreamHistoryState } from '../../composables/colorStreamHistoryState.ts';
import type { ColorSampleType } from '../../composables/types/colorSampleType.ts';
import type { RoleViewType } from '../../composables/types/roleViewType.ts';
import { useIridis } from '../../composables/useIridis.ts';
import { useLivingBackground } from '../../composables/useLivingBackground.ts';
import { buildColorStreamShowcaseModel } from './colorStream/buildColorStreamShowcaseModel.ts';
import { drawColorStream } from './colorStream/drawColorStream.ts';

const ROLES = buildColorStreamShowcaseModel.buildRoles();
const LIVE_FPS = 20;
const FRAME_BUDGET_MS = 1000 / LIVE_FPS;

const reducedMotion = ref<boolean>(false);
const cardRef = ref<HTMLElement | null>(null);
let canvas: HTMLCanvasElement | null = null;
let drawRaf: ReturnType<typeof requestAnimationFrame> | null = null;
let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let inViewport = true;
let isPageVisible = true;
let lastDrawAt = 0;
let lastSampleVersion = -1;
let views: readonly RoleViewType[] = [];
let onVisibility: (() => void) | null = null;

function canvasRef(element: unknown): void {
  canvas = drawColorStream.resolveCanvasElement(element);
}

function drawStream(force: boolean = false): void {
  if (canvas === null) {
    return;
  }
  const latestSampleVersion = ColorStreamHistoryState.sampleVersion.value;
  if (!force && latestSampleVersion === lastSampleVersion) {
    return;
  }
  lastSampleVersion = latestSampleVersion;

  const samplesByAlias = new Map<string, readonly ColorSampleType[]>();
  for (let index = 0; index < ROLES.length; index += 1) {
    const role = ROLES[index];
    if (role !== undefined) {
      samplesByAlias.set(role.alias, ColorStreamHistoryState.sampleArray(role.alias));
    }
  }
  drawColorStream.drawAll(canvas, ROLES, samplesByAlias, views);
}

function stopLoop(): void {
  if (drawRaf !== null) {
    cancelAnimationFrame(drawRaf);
    drawRaf = null;
  }
}

function startLoop(): void {
  if (reducedMotion.value || drawRaf !== null || !isPageVisible || !inViewport) {
    return;
  }
  drawStream();
  const tick = (): void => {
    if (!isPageVisible || !inViewport) {
      stopLoop();
      return;
    }
    const now = performance.now();
    if (now - lastDrawAt >= FRAME_BUDGET_MS) {
      drawStream();
      lastDrawAt = now;
    }
    drawRaf = requestAnimationFrame(tick);
  };
  drawRaf = requestAnimationFrame(tick);
}

onMounted(() => {
  useLivingBackground({ 'recorder': ColorStreamHistoryState });
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { roleViews } = useIridis();
  watch(roleViews, (nextViews) => {
    views = nextViews;
    drawStream(true);
  }, { 'immediate': true });

  resizeObserver = new ResizeObserver(() => {
    drawStream(true);
  });
  if (canvas !== null) {
    resizeObserver.observe(canvas);
  }

  onVisibility = (): void => {
    isPageVisible = document.visibilityState === 'visible';
    if (isPageVisible) {
      drawStream(true);
      startLoop();
    } else {
      stopLoop();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  if ('IntersectionObserver' in window && cardRef.value !== null) {
    intersectionObserver = new IntersectionObserver((entries) => {
      const visibleEntry = entries.find((entry) => entry.isIntersecting === true);
      inViewport = visibleEntry !== undefined;
      if (inViewport) {
        drawStream(true);
        startLoop();
      } else {
        stopLoop();
      }
    }, { 'threshold': 0.1 });
    intersectionObserver.observe(cardRef.value);
  }

  drawStream(true);
  startLoop();

});

onUnmounted(() => {
  stopLoop();
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  if (onVisibility !== null) {
    document.removeEventListener('visibilitychange', onVisibility);
  }
});
</script>

<template>
  <div ref="cardRef">
    <ColorStreamShowcase
      :canvas-ref="canvasRef"
      :reduced-motion="reducedMotion"
      :roles="ROLES"
    />
  </div>
</template>
