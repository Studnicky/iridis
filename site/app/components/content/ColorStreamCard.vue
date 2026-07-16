<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

import { ColorStreamHistoryState } from '../../composables/colorStreamHistoryState.ts';
import { useIridis } from '../../composables/useIridis.ts';
import { useLivingBackground } from '../../composables/useLivingBackground.ts';
import { createCanvasRefSetter, COLOR_STREAM_ROLE_SPECS } from './colorStream/buildColorStreamShowcaseModel.ts';
import { drawColorStreamStrip, drawComparisonBands } from './colorStream/drawColorStream.ts';

const ROLES = COLOR_STREAM_ROLE_SPECS;

const reducedMotion = ref<boolean>(false);
const cardRef = ref<HTMLElement | null>(null);
/** Plain (non-reactive) DOM handle arrays — read imperatively by the draw loop, never rendered, so they don't need to be Vue refs. */
const canvasRefs: (HTMLCanvasElement | null)[] = [];
const naiveCanvasRefs: (HTMLCanvasElement | null)[] = [];
const engineCanvasRefs: (HTMLCanvasElement | null)[] = [];
let drawRaf: ReturnType<typeof requestAnimationFrame> | null = null;
let visibilityUnsubscribe: (() => void) | null = null;
let inViewport = true;
const LIVE_FPS = 20;
const FRAME_BUDGET_MS = 1000 / LIVE_FPS;
let isPageVisible = true;
let lastDrawAt = 0;
let lastSampleVersion = -1;

/**
 * Reads each alias's ring buffer directly (a plain, non-reactive snapshot)
 * rather than subscribing to ColorStreamHistoryState's reactive `histories`
 * object — this runs on this component's own interval draw loop, so pulling fresh
 * samples at draw time is both frame-accurate and avoids fanning a Vue
 * reactive write out to every subscriber 60x/sec.
 */
function drawAllStrips(): void {
  const latestSampleVersion = ColorStreamHistoryState.sampleVersionStamp();
  if (latestSampleVersion === lastSampleVersion) {
    return;
  }
  lastSampleVersion = latestSampleVersion;

  for (let index = 0; index < ROLES.length; index++) {
    const alias = ROLES[index]!.alias;
    const canvas = canvasRefs[index];
    if (!canvas) { continue; }
    drawColorStreamStrip(canvas, ColorStreamHistoryState.sampleArray(alias));
  }
}

function stopLoop(): void {
  if (drawRaf !== null) {
    cancelAnimationFrame(drawRaf);
    drawRaf = null;
  }
}

function startLoop(): void {
  if (reducedMotion.value || drawRaf !== null || !isPageVisible || !inViewport) { return; }
  drawAllStrips();
  const tick = (): void => {
    if (!isPageVisible || !inViewport) {
      stopLoop();
      return;
    }
    const now = performance.now();
    if (now - lastDrawAt >= FRAME_BUDGET_MS) {
      drawAllStrips();
      lastDrawAt = now;
    }
    drawRaf = requestAnimationFrame(tick);
  };
  drawRaf = requestAnimationFrame(tick);
}

function liveRefAt(index: number): (el: unknown) => void {
  return createCanvasRefSetter(canvasRefs, index);
}

function naiveRefAt(index: number): (el: unknown) => void {
  return createCanvasRefSetter(naiveCanvasRefs, index);
}

function engineRefAt(index: number): (el: unknown) => void {
  return createCanvasRefSetter(engineCanvasRefs, index);
}

onMounted(() => {
  useLivingBackground({ 'recordStream': true });
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { roleViews } = useIridis();
  watch(roleViews, (views) => { drawComparisonBands(ROLES, views, naiveCanvasRefs, engineCanvasRefs); }, { 'immediate': true });
  if (reducedMotion.value) {
    drawAllStrips();
    return;
  }
  startLoop();

  const onVisibility = (): void => {
    isPageVisible = document.visibilityState === 'visible';
    if (isPageVisible) {
      startLoop();
    } else {
      stopLoop();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  visibilityUnsubscribe = () => {
    document.removeEventListener('visibilitychange', onVisibility);
  };

  if (typeof window !== 'undefined' && 'IntersectionObserver' in window && cardRef.value !== null) {
    const observer = new IntersectionObserver((entries) => {
      const visibleEntry = entries.find((entry) => entry.isIntersecting === true);
      inViewport = visibleEntry !== undefined;
      if (inViewport) {
        startLoop();
      } else {
        stopLoop();
      }
    }, { 'threshold': 0.1 });

    observer.observe(cardRef.value);
    visibilityUnsubscribe = () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  } else {
    inViewport = true;
  }
});

onUnmounted(() => {
  stopLoop();
  if (visibilityUnsubscribe !== null) {
    visibilityUnsubscribe();
    visibilityUnsubscribe = null;
  }
});
</script>

<template>
  <div ref="cardRef">
    <ColorStreamShowcase
      :reduced-motion="reducedMotion"
      :roles="ROLES"
      :live-ref-at="liveRefAt"
      :naive-ref-at="naiveRefAt"
      :engine-ref-at="engineRefAt"
    />
  </div>
</template>
