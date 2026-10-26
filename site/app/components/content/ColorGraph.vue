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
import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

import type { Graph } from '@cosmos.gl/graph';
import { logger } from '~/composables/logger.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useRoleMathList } from '~/composables/useRoleMathList.ts';
import { buildColorGraphBuffers } from './graph/buildColorGraphBuffers.ts';
import { buildColorGraphViewModel } from './graph/buildColorGraphViewModel.ts';
import { buildColorGraphViewportModel } from './graph/buildColorGraphViewportModel.ts';
import { colorGraphLabelPainter } from './graph/colorGraphLabelPainter.ts';
import { CameraControls } from './viz/CameraControls.ts';
import { ColorGraphLifecycleEvent } from './viz/ColorGraphLifecycleEvent.ts';
import { ColorGraphMountController } from './viz/ColorGraphMountController.ts';
import type { ColorGraphViewStateInterface } from './viz/ColorGraphViewStateInterface.ts';
import { LegendMachine } from './viz/LegendMachine.ts';
import { ViewportStatus } from './viz/ViewportStatus.ts';

const props = defineProps<{ enabled?: boolean }>();

const { framing } = useIridis();
const { mathList } = useRoleMathList();

const categoryVisible = ref(buildColorGraphViewModel.createCategoryVisibility());

function onCategoryToggle(identifier: string): void {
  categoryVisible.value.toggleIdentifier(identifier);
}

const legendMachine = new LegendMachine({
  'getSections': () => buildColorGraphViewModel.buildLegendTabs(
    mathList.value.length,
    categoryVisible.value
  ),
  'toggle': onCategoryToggle,
});

const dpadMachine = CameraControls.create({
  'can': () => graph.value !== null,
  'getZoomLevel': () => zoomLevel.value,
  'getHint': () => ViewportStatus.create({
    'hint': 'drag · wheel',
    'mode': 'inline',
    'zoomLevel': zoomLevel.value
  }).hint,
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
const snapshotRef = ref<HTMLDivElement | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const zoomLevel = ref(1);
const fitZoomLevel = ref<number | null>(null);
const fullscreen = ref(false);

const graph = shallowRef<Graph | null>(null);

let labelMeta: ReturnType<typeof buildColorGraphBuffers.build>['meta'] = [];
let labelRaf: number | null = null;
let paintRaf: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let GraphCtor: typeof import('@cosmos.gl/graph').Graph | null = null;
let graphBooting = false;
let captureFitZoomOnEnd = false;
let startSimulationAfterFit = false;
const ZOOM_IDLE_MS = 250;
const FIT_SETTLE_FALLBACK_MS = 600;
const LABEL_PAINT_BUDGET_MS = 1000 / 30;
let lastLabelPaintAt = 0;
let pendingPaint = false;
let pendingLabelPaint = false;
let isGraphVisible = true;
let isInView = true;
let appliedStructureKey: string | null = null;
let savedView: ColorGraphViewStateInterface | null = null;

function isEnabled(): boolean {
  const result = props.enabled ?? true;

  return result;
}

function constructGraph(): Graph {
  const container = containerRef.value;
  const Ctor = GraphCtor;
  if (container === null || Ctor === null) {
    throw new Error('The color graph container is not mounted');
  }
  try {
    // Cosmos creates its luma device internally; luma enables WebGL context
    // instrumentation outside production unless this setting is explicit.
    globalThis.luma.log.set('debug', false);
    globalThis.luma.log.set('debug-webgl', false);
    const constructed = new Ctor(container, {
      // Cosmos's own dark-gray default ignores the site's light/dark framing;
      // the resolved --ui-bg token is re-applied whenever framing changes.
      'backgroundColor': colorGraphLabelPainter.backgroundColorFromTheme(),
      'spaceSize': buildColorGraphViewModel.spaceSize,
      // Tuned to the scale buildBuffers seeds (hub ring radius 900, leaf
      // satellite radius 260): repulsion dominates the weak link spring so
      // nodes push apart and only the ring/derivation edges hold structure.
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
        controller.signal(ColorGraphLifecycleEvent.zoomed());
        armZoomIdle();
        scheduleLabelPaint();
        pollZoom();
        const g = graph.value;
        const floor = fitZoomLevel.value;
        if (g !== null && floor !== null) {
          try { if (g.getZoomLevel() < floor) g.setZoomLevel(floor, 0, false); } catch { /* ignore */ }
        }
      },
      'onZoomEnd': () => {
        if (captureFitZoomOnEnd) {
          settleFit();
        } else {
          controller.signal(ColorGraphLifecycleEvent.zoomEnded());
        }
      }
    });

    return constructed;
  } catch (error) {
    // A failed construction can leave a partially built canvas behind.
    container.replaceChildren();
    throw error;
  }
}

function disposeGraph(handle: Graph): void {
  cancelFitSequence();
  if (labelRaf !== null) {
    cancelAnimationFrame(labelRaf);
    labelRaf = null;
  }
  if (paintRaf !== null) {
    cancelAnimationFrame(paintRaf);
    paintRaf = null;
  }
  handle.destroy();
}

function captureSnapshot(handle: Graph): HTMLCanvasElement | null {
  const graphCanvas = containerRef.value?.querySelector('canvas') ?? null;
  const isCapturable = handle === graph.value
    && graphCanvas !== null
    && graphCanvas.width > 0
    && graphCanvas.height > 0;
  if (!isCapturable) {
    return null;
  }
  const snapshot = document.createElement('canvas');
  snapshot.width = graphCanvas.width;
  snapshot.height = graphCanvas.height;
  const context = snapshot.getContext('2d');
  if (context === null) {
    return null;
  }
  context.drawImage(graphCanvas, 0, 0);
  const labels = labelsRef.value;
  if (labels !== null && labels.width > 0 && labels.height > 0) {
    context.drawImage(labels, 0, 0, snapshot.width, snapshot.height);
  }

  return snapshot;
}

function presentSnapshot(snapshot: HTMLCanvasElement | null): void {
  const target = snapshotRef.value;
  if (target === null) {
    return;
  }
  if (snapshot === null) {
    target.replaceChildren();
  } else {
    target.replaceChildren(snapshot);
  }
}

const controller = ColorGraphMountController.create<Graph, HTMLCanvasElement>({
  'capture': captureSnapshot,
  'construct': constructGraph,
  'dispose': disposeGraph,
  'idleElapsed': onIdleElapsed,
  'presentSnapshot': presentSnapshot,
  'reportRejection': () => {
    logger.error(
      LogBody.create({
        'component': 'ColorGraph',
        'context': {},
        'message': 'Color graph lifecycle FSM rejected an event',
        'operation': 'signal',
        'status': LOG_STATUS.FAILED
      })
    );
  }
}, buildColorGraphViewModel.idleSuspendMs);
const lifecycleState = shallowRef(controller.getState());
controller.subscribe((next) => { lifecycleState.value = next; });

function applyGraphVisibility(): void {
  const handle = graph.value;
  if (handle === null) return;
  const nextVisible = isInView && !document.hidden;
  if (nextVisible === isGraphVisible) return;
  isGraphVisible = nextVisible;
  if (isGraphVisible) {
    try { handle.start(); } catch { /* ignore */ }
    if (pendingPaint) { schedulePaint(); }
    if (pendingLabelPaint) { scheduleLabelPaint(); }
  } else {
    try { handle.pause(); } catch { /* ignore */ }
  }
}

function onDocumentVisibility(): void { applyGraphVisibility(); }

function armZoomIdle(): void {
  controller.cancel('zoomIdle');
  controller.schedule('zoomIdle', ZOOM_IDLE_MS, () => {
    controller.signal(ColorGraphLifecycleEvent.zoomEnded());
  });
}

// A final fit that lands on the current zoom emits no zoom-end, so the fit settles on a timer too.
function settleFit(): void {
  if (!captureFitZoomOnEnd) return;
  captureFitZoomOnEnd = false;
  const shouldStartSimulation = startSimulationAfterFit;
  startSimulationAfterFit = false;
  const handle = graph.value;
  if (handle === null) return;
  try { fitZoomLevel.value = handle.getZoomLevel(); } catch { /* ignore */ }
  controller.signal(ColorGraphLifecycleEvent.fitSettled());
  controller.signal(ColorGraphLifecycleEvent.zoomEnded());
  controller.releaseSnapshot();
  controller.armIdle();
  if (shouldStartSimulation) {
    try { handle.start(1); } catch { /* ignore */ }
  }
}

function cancelFitSequence(): void {
  controller.cancel('fit');
  captureFitZoomOnEnd = false;
  startSimulationAfterFit = false;
}

function syncLabelCanvasSize(): void {
  const canvas = labelsRef.value;
  const container = containerRef.value;
  if (canvas === null || container === null) return;
  colorGraphLabelPainter.resizeLabelCanvas(canvas, container.clientWidth, container.clientHeight);
}

function armRuntime(container: HTMLDivElement): void {
  window.addEventListener('keydown', onKeydown);
  document.addEventListener('visibilitychange', onDocumentVisibility);
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver((entries) => {
      isInView = entries.some((entry) => entry.isIntersecting);
      applyGraphVisibility();
    });
    intersectionObserver.observe(container);
  }
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (graph.value !== null) { syncLabelCanvasSize(); scheduleLabelPaint(); }
    });
    resizeObserver.observe(container);
  }
}

function disarmRuntime(): void {
  resizeObserver?.disconnect();
  resizeObserver = null;
  intersectionObserver?.disconnect();
  intersectionObserver = null;
  document.removeEventListener('visibilitychange', onDocumentVisibility);
  window.removeEventListener('keydown', onKeydown);
}

function resetGraphState(): void {
  graph.value = null;
  isGraphVisible = true;
  isInView = true;
  pendingPaint = false;
  pendingLabelPaint = false;
  appliedStructureKey = null;
  fitZoomLevel.value = null;
  lastLabelPaintAt = 0;
}

function mountGraph(container: HTMLDivElement): void {
  try {
    const handle = controller.mount();
    graph.value = handle;
    loadError.value = null;
    armRuntime(container);
    // Cosmos rejects point updates until its device initializes; the first paint follows that event.
    handle.ready.then(() => {
      if (graph.value !== handle) return;
      controller.signal(ColorGraphLifecycleEvent.deviceReady());
      schedulePaint();
    }).catch(() => { /* cosmos logs device initialization failures itself */ });
    syncLabelCanvasSize();
    schedulePaint();
    pollZoom();
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err);
    resetGraphState();
  }
}

async function activateGraph(): Promise<void> {
  if (graphBooting || !isEnabled() || typeof window === 'undefined') return;
  graphBooting = true;
  try {
    if (GraphCtor === null) {
      loading.value = true;
      const mod = await import('@cosmos.gl/graph');
      GraphCtor = mod.Graph;
    }
    loading.value = false;
    const container = containerRef.value;
    if (container !== null && isEnabled() && graph.value === null) {
      mountGraph(container);
    }
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err);
    loading.value = false;
  } finally {
    graphBooting = false;
  }
}

function readView(): ColorGraphViewStateInterface | null {
  const handle = graph.value;
  let view: ColorGraphViewStateInterface | null = null;
  const floor = fitZoomLevel.value;
  if (handle !== null && floor !== null && controller.getState().isSettled()) {
    try {
      const origin = handle.spaceToScreenPosition([0, 0]);
      view = {
        'fitZoomLevel': floor,
        'originScreenX': origin[0],
        'originScreenY': origin[1],
        'positions': handle.getPointPositions(),
        'zoomLevel': handle.getZoomLevel()
      };
    } catch { /* ignore */ }
  }

  return view;
}

function suspendGraph(): void {
  savedView = readView();
  disarmRuntime();
  fullscreen.value = false;
  controller.suspend();
  resetGraphState();
}

function suspendGraphForIdle(): void {
  savedView = readView();
  disarmRuntime();
  controller.suspendIdle();
  resetGraphState();
}

// A graph the user is not touching disposes its WebGL loop; a fullscreen graph stays live.
function onIdleElapsed(): void {
  if (!fullscreen.value && controller.getState().isSettled()) {
    suspendGraphForIdle();
  } else {
    controller.armIdle();
  }
}

function onActivity(): void {
  if (isEnabled() && controller.noteActivity()) {
    void activateGraph();
  }
}

function pollZoom(): void {
  try { zoomLevel.value = graph.value?.getZoomLevel() ?? 1; } catch { /* ignore */ }
}

function zoomIn(): void {
  const g = graph.value; if (g === null) return;
  try {
    g.setZoomLevel(g.getZoomLevel() * buildColorGraphViewModel.zoomStep, 0, false);
    pollZoom();
  } catch { /* ignore */ }
}
function zoomOut(): void {
  const g = graph.value; if (g === null) return;
  try {
    const next = g.getZoomLevel() / buildColorGraphViewModel.zoomStep;
    g.setZoomLevel(Math.max(next, fitZoomLevel.value ?? 0), 0, false);
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
  const next = buildColorGraphViewportModel.translatePoints(flat, worldDx, worldDy);
  // setPointPositions() auto-pauses the simulation for the caller to settle
  // a deliberate layout; start() forces it running again immediately so a
  // manual pan doesn't permanently freeze the live simulation.
  try { g.setPointPositions(next, true); g.start(0.3); scheduleLabelPaint(); } catch { /* ignore */ }
}
function panUp(): void { panBy(0, -buildColorGraphViewModel.panStep); }
function panDown(): void { panBy(0, +buildColorGraphViewModel.panStep); }
function panLeft(): void { panBy(+buildColorGraphViewModel.panStep, 0); }
function panRight(): void { panBy(-buildColorGraphViewModel.panStep, 0); }

function centre(): void {
  const g = graph.value;
  const container = containerRef.value;
  if (g === null || container === null) return;
  let flat: readonly number[] = [];
  try { flat = g.getPointPositions(); } catch { return; }
  if (flat.length === 0) return;
  const centroid = buildColorGraphViewportModel.pointCentroid(flat);
  if (centroid === null) return;
  let screenX = 0, screenY = 0;
  try {
    const screen = g.spaceToScreenPosition([centroid[0], centroid[1]]);
    screenX = screen[0]; screenY = screen[1];
  } catch { return; }
  const rect = container.getBoundingClientRect();
  const zoom = g.getZoomLevel();
  if (zoom === 0) return;
  const worldDx = (rect.width / 2 - screenX) / zoom;
  const worldDy = (rect.height / 2 - screenY) / zoom;
  const next = buildColorGraphViewportModel.translatePoints(flat, worldDx, worldDy);
  try { g.setPointPositions(next, true); g.start(0.3); scheduleLabelPaint(); } catch { /* ignore */ }
}

function armFitSequence(armInitialSimulation = false): void {
  // A user fit can supersede the initial fit before its final zoom event.
  // Preserve that initial simulation request across the replacement sequence.
  const shouldStartSimulation = startSimulationAfterFit || armInitialSimulation;
  cancelFitSequence();
  startSimulationAfterFit = shouldStartSimulation;
  const handle = graph.value;
  if (handle === null) return;
  const finalDelayMs = buildColorGraphViewModel.fitDelaysMs.at(-1);
  if (finalDelayMs === undefined) return;
  controller.signal(ColorGraphLifecycleEvent.fitArmed());
  // The seeded hub/leaf layout keeps relaxing under the live simulation
  // (link spring, repulsion, gravity) for a bit after paint() hands it off —
  // an extra, later fit (1200ms) beyond the original 0/250/500/750ms sweep
  // catches that continued spread instead of framing an early, tighter
  // snapshot as if it were final.
  for (const delayMs of buildColorGraphViewModel.fitDelaysMs) {
    controller.schedule('fit', delayMs, () => {
      if (graph.value !== handle) return;
      if (delayMs === finalDelayMs) {
        captureFitZoomOnEnd = true;
        startSimulationAfterFit ||= armInitialSimulation;
      }
      handle.fitView(200, buildColorGraphViewModel.fitPadding, false);
      if (delayMs === finalDelayMs) controller.schedule('fit', FIT_SETTLE_FALLBACK_MS, settleFit);
    });
  }
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
    cancelFitSequence();
    syncLabelCanvasSize();
    const schedule = (delayMs: number): void => {
      controller.schedule('fit', delayMs, () => {
        try {
          graph.value?.fitView(300, buildColorGraphViewModel.fitPadding);
        } catch { /* ignore */ }
      });
    };
    schedule(0);
    schedule(180);
    schedule(420);
  });
});

// The active carousel face owns the live graph; inactive faces keep a snapshot of the last frame.
watch(
  isEnabled,
  (enabled) => {
    if (enabled) {
      void activateGraph();
    } else {
      suspendGraph();
    }
  },
  { flush: 'post' }
);

onMounted(() => {
  if (isEnabled()) {
    void activateGraph();
  }
});

onBeforeUnmount(() => {
  disarmRuntime();
  controller.dispose();
  resetGraphState();
});

watch(mathList, () => {
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
    g.setConfigPartial({
      'backgroundColor': colorGraphLabelPainter.backgroundColorFromTheme()
    });
    g.render();
  } catch { /* ignore */ }
});

function paint(): void {
  const handle = graph.value;
  if (handle === null) return;
  if (!lifecycleState.value.isDeviceReady()) return;
  const buffers = buildColorGraphBuffers.build(mathList.value, categoryVisible.value);
  const { positions, colors, sizes, links, linkColors, meta } = buffers;
  const shouldReframe = buildColorGraphBuffers.requiresStructuralApply(
    appliedStructureKey,
    buffers
  );
  const restoredView = shouldReframe && savedView?.positions.length === positions.length ? savedView : null;
  savedView = null;
  labelMeta = meta;
  if (restoredView !== null) {
    restoreView(handle, buffers, restoredView);
    return;
  }
  if (shouldReframe) {
    handle.setPointPositions(positions);
    handle.trackPointPositionsByIndices(meta.map((_, index) => index));
    handle.setLinks(links);
  }
  handle.setPointColors(colors);
  handle.setPointSizes(sizes);
  handle.setLinkColors(linkColors);
  // Seed positions, topology, and simulation alpha change together only for
  // a structural graph revision. Palette revisions preserve the live layout
  // and its current simulation progress while applying new colours.
  handle.render(shouldReframe ? 1 : undefined);
  if (positions.length === 0) { controller.releaseSnapshot(); scheduleLabelPaint(); return; }
  if (shouldReframe) {
    armFitSequence(true);
    appliedStructureKey = buffers.structureKey;
  }
  scheduleLabelPaint();
}

// A restored graph keeps the point layout, zoom and pan it was disposed with and skips the fit sweep.
function restoreView(handle: Graph, buffers: ReturnType<typeof buildColorGraphBuffers.build>, view: ColorGraphViewStateInterface): void {
  handle.setPointPositions(Float32Array.from(view.positions), true);
  handle.trackPointPositionsByIndices(buffers.meta.map((_, index) => index));
  handle.setLinks(buffers.links);
  handle.setPointColors(buffers.colors);
  handle.setPointSizes(buffers.sizes);
  handle.setLinkColors(buffers.linkColors);
  handle.render(0);
  handle.setZoomLevel(view.zoomLevel, 0, false);
  const origin = handle.spaceToScreenPosition([0, 0]);
  const panned = buildColorGraphViewportModel.translatePoints(
    view.positions,
    (view.originScreenX - origin[0]) / view.zoomLevel,
    (view.originScreenY - origin[1]) / view.zoomLevel
  );
  handle.setPointPositions(panned, true);
  fitZoomLevel.value = view.fitZoomLevel;
  appliedStructureKey = buffers.structureKey;
  controller.signal(ColorGraphLifecycleEvent.fitArmed());
  controller.signal(ColorGraphLifecycleEvent.fitSettled());
  controller.signal(ColorGraphLifecycleEvent.zoomEnded());
  controller.releaseSnapshot();
  controller.armIdle();
  pollZoom();
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

function paintLabels(): void {
  const handle = graph.value;
  const canvas = labelsRef.value;
  if (handle === null || canvas === null) return;
  colorGraphLabelPainter.paintLabels(handle, canvas, labelMeta, categoryVisible.value);
}
</script>

<template>
  <ColorGraphViewport
    v-model:container-ref="containerRef"
    v-model:labels-ref="labelsRef"
    v-model:snapshot-ref="snapshotRef"
    :fullscreen="fullscreen"
    :lifecycle="lifecycleState.variant"
    :loading="loading"
    :load-error="loadError"
    :legend-machine="legendMachine"
    :dpad-machine="dpadMachine"
    :dpad-ready="graph !== null"
    :zoom-level="zoomLevel"
    :role-count="mathList.length"
    @activity="onActivity"
  />
</template>
