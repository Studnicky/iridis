<script setup lang="ts">
/**
 * The resolved palette as a graph: one node per role, in that role's own
 * engine-resolved color — never a decorative category color — with edges
 * for `derivedFrom` (ExpandFamily hue-rotation lineage) relations, plus a
 * hub-to-hub ring so every node is reachable (no isolated clusters). Each
 * derived role's label names the hue algorithm (monochromatic/analogous/
 * triadic/.../freeform) that relation is actually configured with — set per
 * relation on the Derivation Relations card (Refine stage), not a decorative
 * label; it's `derive:roleRelations`'s own resolved config for that edge.
 * This is `engine.run()`'s own role graph, live and force-simulated (link
 * spring, repulsion, gravity, collision), matching the iridis-N schema
 * currently active, the same D-pad/legend pattern Dagonizer's graph-
 * visualizer uses (leadography's own graph stage follows the same
 * convention, ported from the same lineage).
 *
 * Lazy-loaded: `@cosmos.gl/graph` ships a WebGL2 shader pipeline; dynamic-
 * import on mount keeps it out of the main bundle for visitors who never
 * scroll this far.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useRoleMathList } from '~/composables/useRoleMathList.ts';
import { buildColorGraphBuffers } from './graph/buildColorGraphBuffers.ts';
import {
  buildColorGraphLegendTabs,
  COLOR_GRAPH_CAPTURE_FIT_ZOOM_DELAY_MS,
  COLOR_GRAPH_FIT_DELAYS_MS,
  COLOR_GRAPH_FIT_PADDING,
  COLOR_GRAPH_MAX_INIT_ATTEMPTS,
  COLOR_GRAPH_PAN_STEP,
  COLOR_GRAPH_SPACE_SIZE,
  COLOR_GRAPH_ZOOM_STEP,
  DEFAULT_CATEGORY_VISIBILITY
} from './graph/buildColorGraphViewModel.ts';
import { createCameraDpadMachine } from './viz/CameraControls.ts';
import { getColorGraphPointCentroid, translateColorGraphPoints } from './graph/buildColorGraphViewportModel.ts';
import { backgroundColorFromTheme, paintColorGraphLabels, resizeColorGraphLabelCanvas } from './graph/colorGraphLabelPainter.ts';
import { createViewportStatus } from './viz/ViewportStatus.ts';
import { LegendMachine } from './viz/LegendMachine.ts';
import type { ResolutionCategory } from './graph/buildColorGraphViewModel.ts';

const props = defineProps<{ enabled?: boolean }>();

type GraphHandle = {
  setPointPositions(arr: Float32Array, dontRescale?: boolean): void;
  setPointColors(arr: Float32Array): void;
  setPointSizes(arr: Float32Array): void;
  setLinks(arr: Float32Array): void;
  setLinkColors(arr: Float32Array): void;
  setConfigPartial(config: Record<string, unknown>): void;
  render(alpha?: number, transitionDuration?: number): void;
  start(alpha?: number): void;
  pause(): void;
  fitView(duration?: number, padding?: number): void;
  getZoomLevel(): number;
  setZoomLevel(level: number, duration?: number): void;
  spaceToScreenPosition(point: readonly [number, number]): readonly [number, number];
  getPointPositions(): readonly number[];
  destroy(): void;
};
type CosmosCtor = new (div: HTMLDivElement, config: Record<string, unknown>) => GraphHandle;

const { framing } = useIridis();
const { mathList } = useRoleMathList();

const categoryVisible = ref<Record<ResolutionCategory, boolean>>({ ...DEFAULT_CATEGORY_VISIBILITY });

function onCategoryToggle(key: string): void {
  const category = key as ResolutionCategory;
  if (category in categoryVisible.value) {
    categoryVisible.value[category] = !categoryVisible.value[category];
  }
}

const legendMachine = new LegendMachine({
  'getSections': () => buildColorGraphLegendTabs(mathList.value.length, categoryVisible.value),
  'toggle': onCategoryToggle,
});

const dpadMachine = createCameraDpadMachine({
  'can': () => graph.value !== null,
  'getZoomLevel': () => zoomLevel.value,
  'getHint': () => createViewportStatus(zoomLevel.value, 'inline', 'drag · wheel').hint,
  'zoomIn': () => { zoomIn(); },
  'zoomOut': () => { zoomOut(); },
  'pan': (direction) => {
    switch (direction) {
      case 'up':    panUp(); break;
      case 'down':  panDown(); break;
      case 'left':  panLeft(); break;
      case 'right': panRight(); break;
    }
  },
  'centre': () => { centre(); },
  'fit': () => { fit(); },
  'expand': () => { expand(); },
}, 'inline');

const containerRef = ref<HTMLDivElement | null>(null);
const labelsRef = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const zoomLevel = ref(1);
const fitZoomLevel = ref<number | null>(null);
const fullscreen = ref(false);

const graph = shallowRef<GraphHandle | null>(null);
type PointMeta = {
  readonly name: string;
  readonly hex: string;
  readonly clamped: boolean;
  readonly category: ResolutionCategory;
  readonly algorithm: string | null;
};
let labelMeta: PointMeta[] = [];
let labelRaf: number | null = null;
let paintRaf: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let visibilityPoll: number | null = null;
let GraphCtor: CosmosCtor | null = null;
let graphRuntimeArmed = false;
let graphBooting = false;
const fitTimers: ReturnType<typeof setTimeout>[] = [];
const LABEL_PAINT_BUDGET_MS = 1000 / 30;
const GRAPH_VISIBILITY_POLL_MS = 750;
// Caps how many times initCosmos() is allowed to retry a failing
// construction (WebGL2 unavailable, GPU blocklisted, context lost, shader
// compile failure): each failed `new GraphCtor()` call can allocate a WebGL2
// context before throwing, and browsers cap concurrent contexts tab-wide —
// an unbounded 400ms poll would keep re-allocating and thrashing that budget
// for as long as the component stays mounted. 10 attempts at the poll's
// 400ms cadence gives the failure a few seconds to be transient (e.g. a
// momentary context loss) before giving up for good.
let initAttempts = 0;
let initFailed = false;
let lastLabelPaintAt = 0;
let pendingPaint = false;
let pendingLabelPaint = false;
let graphVisibilityPoll: number | null = null;
let isGraphVisible = true;
let onVisibilityChange: (() => void) | null = null;
let paintNeedsReframe = true;

function syncGraphVisibility(): void {
  const target = containerRef.value;
  if (target === null || graph.value === null) return;
  const rect = target.getBoundingClientRect();
  const nextVisible = rect.width > 0 && rect.height > 0
    && rect.bottom > 0 && rect.right > 0
    && rect.top < window.innerHeight && rect.left < window.innerWidth
    && !document.hidden;
  if (nextVisible === isGraphVisible) return;
  isGraphVisible = nextVisible;
  if (isGraphVisible) {
    try { graph.value.start(); } catch { /* ignore */ }
    if (pendingPaint) { schedulePaint(); }
    if (pendingLabelPaint) { scheduleLabelPaint(); }
  } else {
    try { graph.value.pause(); } catch { /* ignore */ }
  }
}

function stopVisibilityPoll(): void {
  if (visibilityPoll !== null) {
    clearInterval(visibilityPoll);
    visibilityPoll = null;
  }
}

async function bootGraphRuntime(): Promise<void> {
  if (graphRuntimeArmed || graphBooting || !(props.enabled ?? true) || typeof window === 'undefined') return;
  graphBooting = true;
  loading.value = true;
  loadError.value = null;
  try {
    if (GraphCtor === null) {
      const mod = await import('@cosmos.gl/graph');
      GraphCtor = (mod as unknown as { Graph: CosmosCtor }).Graph;
    }

    const container = containerRef.value;
    if (container === null || !(props.enabled ?? true)) {
      loading.value = false;
      return;
    }

    graphRuntimeArmed = true;
    window.addEventListener('keydown', onKeydown);
    loading.value = false;

    // This card sits inside a CylinderCarousel deck, which mounts EVERY face
    // simultaneously (siblings are 3D-transformed off-screen, never
    // display:none) — a bare nonzero-size check alone would fire immediately
    // on page load regardless of whether this card is the one actually
    // showing. IntersectionObserver would be the natural fix, but it never
    // fires at all for elements inside this carousel's 3D-transformed
    // (perspective/rotateY/translateZ) ancestor chain — confirmed empirically,
    // not just theorized — so visibility is instead polled directly via
    // getBoundingClientRect against the viewport, which reflects reality
    // regardless of any 3D-transform/IntersectionObserver interaction quirk.
    const tryInit = (): void => {
      if (initFailed) {
        stopVisibilityPoll();
        return;
      }
      if (graph.value !== null) return;
      if (initAttempts >= COLOR_GRAPH_MAX_INIT_ATTEMPTS) {
        initFailed = true;
        stopVisibilityPoll();
        return;
      }
      const rect = container.getBoundingClientRect();
      const inViewport = rect.width > 0 && rect.height > 0
        && rect.bottom > 0 && rect.right > 0
        && rect.top < window.innerHeight && rect.left < window.innerWidth;
      if (!inViewport) return;
      initCosmos(container);
      // Stop polling once construction succeeds, or once it has failed enough
      // times to give up — either way, further calls to tryInit would be
      // wasted work (or, for the failure case, a fresh doomed WebGL2 context
      // allocation) with no path to success.
      if (visibilityPoll !== null && (graph.value !== null || initAttempts >= COLOR_GRAPH_MAX_INIT_ATTEMPTS)) {
        stopVisibilityPoll();
      }
    };
    visibilityPoll = window.setInterval(tryInit, 400);
    tryInit();

    const scheduleGraphVisibility = (): void => {
      if (graphVisibilityPoll === null) {
        graphVisibilityPoll = window.setInterval(syncGraphVisibility, GRAPH_VISIBILITY_POLL_MS);
      }
    };
    onVisibilityChange = (): void => { syncGraphVisibility(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    scheduleGraphVisibility();
    onVisibilityChange();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(() => {
        if (graph.value !== null) { resizeLabelCanvas(); scheduleLabelPaint(); }
      });
      resizeObserver.observe(container);
    }
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err);
    loading.value = false;
  } finally {
    graphBooting = false;
  }
}

function teardownGraphRuntime(): void {
  if (!graphRuntimeArmed) {
    return;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
  stopVisibilityPoll();
  if (graphVisibilityPoll !== null) {
    window.clearInterval(graphVisibilityPoll);
    graphVisibilityPoll = null;
  }
  if (onVisibilityChange !== null) {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    onVisibilityChange = null;
  }
  window.removeEventListener('keydown', onKeydown);
  for (const t of fitTimers.splice(0)) clearTimeout(t);
  if (labelRaf !== null) {
    cancelAnimationFrame(labelRaf);
    labelRaf = null;
  }
  if (paintRaf !== null) {
    cancelAnimationFrame(paintRaf);
    paintRaf = null;
  }
  graph.value?.destroy();
  graph.value = null;
  isGraphVisible = true;
  initAttempts = 0;
  initFailed = false;
  pendingPaint = false;
  pendingLabelPaint = false;
  paintNeedsReframe = true;
  fitZoomLevel.value = null;
  lastLabelPaintAt = 0;
  graphRuntimeArmed = false;
}

function initCosmos(container: HTMLDivElement): void {
  if (GraphCtor === null || graph.value !== null || initFailed) return;
  initAttempts += 1;
  try {
    graph.value = new GraphCtor(container, {
      // cosmos's own default ('#222222') ignores the site's light/dark
      // framing outright, so the WebGL canvas never matches the page around
      // it and (worse, on some builds) renders fully opaque black — set it
      // from the resolved --ui-bg token instead, re-applied below whenever
      // framing changes.
      'backgroundColor': backgroundColorFromTheme(),
      'spaceSize': COLOR_GRAPH_SPACE_SIZE,
      // Tuned to the scale buildBuffers seeds (hub ring radius 900, leaf
      // satellite radius 260) so the live simulation relaxes into an airy
      // layout rather than collapsing into a tight clump: repulsion
      // dominates the (deliberately weak) link spring so nodes push apart
      // and only the ring/derivation edges hold the structure together.
      'simulationLinkDistance': 260,
      'simulationLinkSpring': 0.15,
      'simulationRepulsion': 8,
      'simulationRepulsionTheta': 1.4,
      'simulationGravity': 0.02,
      'simulationCollision': 1,
      'simulationCollisionPadding': 10,
      'simulationDecay': 12000,
      'enableDrag': true,
      'enableRightClickRepulsion': true,
      'simulationRepulsionFromMouse': 3,
      'onSimulationTick': () => { scheduleLabelPaint(); },
      'onZoom': () => {
        scheduleLabelPaint();
        pollZoom();
        const g = graph.value;
        const floor = fitZoomLevel.value;
        if (g !== null && floor !== null) {
          try { if (g.getZoomLevel() < floor) g.setZoomLevel(floor); } catch { /* ignore */ }
        }
      }
    });
    resizeLabelCanvas();
    schedulePaint();
    pollZoom();
    paintNeedsReframe = true;
    void nextTick(() => {
      isGraphVisible = true;
      syncGraphVisibility();
    });
  } catch (err) {
    if (initAttempts >= COLOR_GRAPH_MAX_INIT_ATTEMPTS) {
      initFailed = true;
    }
    loadError.value = err instanceof Error ? err.message : String(err);
    // A failed construction can still have partially allocated a WebGL2
    // context/canvas (cosmos.gl may set up its own canvas before throwing on
    // a later step, e.g. a shader compile failure) — dispose whatever handle
    // exists and clear any DOM it left behind so a retry never piles a fresh
    // context on top of an orphaned one.
    try { graph.value?.destroy(); } catch { /* ignore */ }
    graph.value = null;
    container.replaceChildren();
    if (initFailed) {
      stopVisibilityPoll();
    }
  }
}

function pollZoom(): void {
  try { zoomLevel.value = graph.value?.getZoomLevel() ?? 1; } catch { /* ignore */ }
}

function zoomIn(): void {
  const g = graph.value; if (g === null) return;
  try { g.setZoomLevel(g.getZoomLevel() * COLOR_GRAPH_ZOOM_STEP); pollZoom(); } catch { /* ignore */ }
}
function zoomOut(): void {
  const g = graph.value; if (g === null) return;
  try {
    const next = g.getZoomLevel() / COLOR_GRAPH_ZOOM_STEP;
    g.setZoomLevel(Math.max(next, fitZoomLevel.value ?? 0));
    pollZoom();
  } catch { /* ignore */ }
}

function panBy(dx: number, dy: number): void {
  const g = graph.value; if (g === null) return;
  let flat: readonly number[] = [];
  try { flat = g.getPointPositions(); } catch { return; }
  if (flat.length === 0) return;
  const zoom = g.getZoomLevel();
  if (zoom === 0) return;
  const worldDx = dx / zoom;
  const worldDy = dy / zoom;
  const next = translateColorGraphPoints(flat, worldDx, worldDy);
  // setPointPositions() auto-pauses the simulation for the caller to settle
  // a deliberate layout; start() forces it running again immediately so a
  // manual pan doesn't permanently freeze the live simulation.
  try { g.setPointPositions(next, true); g.start(0.3); scheduleLabelPaint(); } catch { /* ignore */ }
}
function panUp(): void { panBy(0, -COLOR_GRAPH_PAN_STEP); }
function panDown(): void { panBy(0, +COLOR_GRAPH_PAN_STEP); }
function panLeft(): void { panBy(+COLOR_GRAPH_PAN_STEP, 0); }
function panRight(): void { panBy(-COLOR_GRAPH_PAN_STEP, 0); }

function centre(): void {
  const g = graph.value;
  const container = containerRef.value;
  if (g === null || container === null) return;
  let flat: readonly number[] = [];
  try { flat = g.getPointPositions(); } catch { return; }
  if (flat.length === 0) return;
  const centroid = getColorGraphPointCentroid(flat);
  if (centroid === null) return;
  let screenX = 0, screenY = 0;
  try {
    const screen = g.spaceToScreenPosition(centroid);
    screenX = screen[0]; screenY = screen[1];
  } catch { return; }
  const rect = container.getBoundingClientRect();
  const zoom = g.getZoomLevel();
  if (zoom === 0) return;
  const worldDx = (rect.width / 2 - screenX) / zoom;
  const worldDy = (rect.height / 2 - screenY) / zoom;
  const next = translateColorGraphPoints(flat, worldDx, worldDy);
  try { g.setPointPositions(next, true); g.start(0.3); scheduleLabelPaint(); } catch { /* ignore */ }
}

function armFitSequence(): void {
  const handle = graph.value;
  if (handle === null) return;
  for (const t of fitTimers.splice(0)) clearTimeout(t);
  // The seeded hub/leaf layout keeps relaxing under the live simulation
  // (link spring, repulsion, gravity) for a bit after paint() hands it off —
  // an extra, later fit (1200ms) beyond the original 0/250/500/750ms sweep
  // catches that continued spread instead of framing an early, tighter
  // snapshot as if it were final.
  for (const delayMs of COLOR_GRAPH_FIT_DELAYS_MS) {
    fitTimers.push(setTimeout(() => { handle.fitView(200, COLOR_GRAPH_FIT_PADDING); }, delayMs));
  }
  fitTimers.push(setTimeout(() => {
    try {
      const level = graph.value?.getZoomLevel() ?? null;
      if (level !== null) fitZoomLevel.value = level;
    } catch { /* ignore */ }
  }, COLOR_GRAPH_CAPTURE_FIT_ZOOM_DELAY_MS));
}
function fit(): void { armFitSequence(); }
function expand(): void { fullscreen.value = !fullscreen.value; }

/** Escape always exits fullscreen — the D-pad's expand button toggling it back off is the primary affordance, this is the keyboard equivalent every other fullscreen surface on the web supports. */
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && fullscreen.value) fullscreen.value = false;
}

// The Teleport (see template) moves .cg-wrap to <body> on entering
// fullscreen so `position: fixed` escapes CylinderCarousel's 3D-transformed
// ancestor and actually covers the viewport — that resize invalidates both
// the label canvas's backing-store size and the last fitView framing, so
// both are recomputed once the DOM move (and the fixed/inset-0 layout it
// enables) has actually landed.
watch(fullscreen, () => {
  void nextTick(() => {
    for (const t of fitTimers.splice(0)) clearTimeout(t);
    resizeLabelCanvas();
    const schedule = (delayMs: number): void => {
      fitTimers.push(setTimeout(() => {
        try { graph.value?.fitView(300, COLOR_GRAPH_FIT_PADDING); } catch { /* ignore */ }
      }, delayMs));
    };
    schedule(0);
    schedule(180);
    schedule(420);
  });
});

watch(
  () => props.enabled ?? true,
  (isEnabled) => {
    if (isEnabled) {
      void bootGraphRuntime();
    } else {
      teardownGraphRuntime();
    }
  },
  { flush: 'post' }
);

onMounted(() => {
  if (props.enabled ?? true) {
    void bootGraphRuntime();
  }
});

onBeforeUnmount(() => {
  teardownGraphRuntime();
});

watch(mathList, (next, previous) => {
  paintNeedsReframe = previous === undefined || previous.length !== next.length;
  schedulePaint();
});
watch(categoryVisible, () => {
  schedulePaint();
}, { 'deep': true });
// mathList already recomputes (and repaints node colors) when framing
// flips, but that repaint never touches the canvas's own backgroundColor —
// keep it in sync with --ui-bg separately so light/dark toggles (and any
// theme swap that changes the resolved background role) always land.
watch(framing, () => {
  const g = graph.value;
  if (g === null) return;
  try {
    g.setConfigPartial({ 'backgroundColor': backgroundColorFromTheme() });
    g.render(1);
  } catch { /* ignore */ }
});

function paint(): void {
  const handle = graph.value;
  if (handle === null) return;
  const { positions, colors, sizes, links, linkColors, meta } = buildColorGraphBuffers(mathList.value, categoryVisible.value);
  labelMeta = meta;
  handle.setPointPositions(positions);
  handle.setPointColors(colors);
  handle.setPointSizes(sizes);
  handle.setLinks(links);
  handle.setLinkColors(linkColors);
  // buildBuffers' hub-and-spoke layout only seeds the starting positions.
  // render() (not start() — start() only flips the simulation-running flag,
  // it doesn't kick off cosmos.gl's own rAF render loop) hands them to the
  // live force simulation (link spring, repulsion, gravity, collision,
  // configured in initCosmos()), which keeps running and settling in real
  // time rather than freezing on one static frame.
  handle.render(1);
  if (positions.length === 0) { scheduleLabelPaint(); return; }
  if (paintNeedsReframe) {
    armFitSequence();
    paintNeedsReframe = false;
  }
  scheduleLabelPaint();
}

function schedulePaint(): void {
  if (paintRaf !== null) {
    pendingPaint = false;
    return;
  }
  if (!isGraphVisible || graph.value === null) {
    pendingPaint = true;
    return;
  }
  pendingPaint = false;
  paintRaf = requestAnimationFrame(() => {
    paintRaf = null;
    if (!isGraphVisible || graph.value === null) {
      pendingPaint = true;
      return;
    }
    paint();
  });
}

function scheduleLabelPaint(): void {
  if (labelRaf !== null) {
    pendingLabelPaint = false;
    return;
  }
  if (!isGraphVisible || graph.value === null) {
    pendingLabelPaint = true;
    return;
  }
  pendingLabelPaint = false;
  labelRaf = requestAnimationFrame(() => {
    if (!isGraphVisible || graph.value === null) {
      labelRaf = null;
      pendingLabelPaint = true;
      return;
    }
    const now = performance.now();
    if (now - lastLabelPaintAt < LABEL_PAINT_BUDGET_MS) {
      labelRaf = null;
      pendingLabelPaint = true;
      return;
    }
    lastLabelPaintAt = now;
    pendingLabelPaint = false;
    labelRaf = null;
    paintLabels();
  });
}

function resizeLabelCanvas(): void {
  const canvas = labelsRef.value;
  const container = containerRef.value;
  if (canvas === null || container === null) return;
  // Re-measured on every paintLabels() call (cheap: getBoundingClientRect +
  // a couple of numeric writes), not just reactively via ResizeObserver —
  // this card lives inside a CylinderCarousel face that changes size via a
  // 3D transform when it becomes active, which doesn't fire ResizeObserver
  // at all (same ancestor-transform quirk documented for IntersectionObserver
  // above). Without this, a resize captured while the face was still mid-
  // transition sticks around forever since nothing else ever corrects it.
  resizeColorGraphLabelCanvas(canvas, container);
}

function paintLabels(): void {
  const handle = graph.value;
  const canvas = labelsRef.value;
  if (handle === null || canvas === null) return;
  paintColorGraphLabels(handle, canvas, labelMeta, categoryVisible.value);
}
</script>

<template>
  <ColorGraphViewport
    v-model:container-ref="containerRef"
    v-model:labels-ref="labelsRef"
    :fullscreen="fullscreen"
    :loading="loading"
    :load-error="loadError"
    :legend-machine="legendMachine"
    :dpad-machine="dpadMachine"
    :dpad-ready="graph !== null"
    :zoom-level="zoomLevel"
    :role-count="mathList.length"
    />
</template>
