<script setup lang="ts">
/**
 * The resolved palette as a graph: one node per role, in that role's own
 * engine-resolved color — never a decorative category color — with edges
 * for `derivedFrom` (ExpandFamily hue-rotation lineage) relations. This is
 * `engine.run()`'s own role graph rendered directly, matching the iridis-N
 * schema currently active, the same D-pad/legend pattern Dagonizer's
 * graph-visualizer uses (leadography's own graph stage follows the same
 * convention, ported from the same lineage).
 *
 * Lazy-loaded: `@cosmos.gl/graph` ships a WebGL2 shader pipeline; dynamic-
 * import on mount keeps it out of the main bundle for visitors who never
 * scroll this far.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { colorRecordFactory } from '@studnicky/iridis';
import { useIridis } from '~/composables/useIridis.ts';
import { useRoleMathList, type RoleMathEntry } from '~/composables/useRoleMathList.ts';
import GraphDpad from './graph/GraphDpad.vue';
import GraphLegend from './graph/GraphLegend.vue';
import type { LegendEntry, LegendTab } from './graph/GraphLegend.vue';

type GraphHandle = {
  setPointPositions(arr: Float32Array, dontRescale?: boolean): void;
  setPointColors(arr: Float32Array): void;
  setPointSizes(arr: Float32Array): void;
  setLinks(arr: Float32Array): void;
  setLinkColors(arr: Float32Array): void;
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

/** A role's resolution category — mutually exclusive, in priority order (a pinned role is shown as pinned even if it would otherwise also count as derived). */
type ResolutionCategory = 'pinned' | 'synthesized' | 'derived' | 'direct';

function categoryOf(role: RoleMathEntry): ResolutionCategory {
  if (role.isPinned) return 'pinned';
  if (role.synthesized) return 'synthesized';
  if (role.isDerived) return 'derived';
  return 'direct';
}

const { schemaName } = useIridis();
const { mathList } = useRoleMathList();

const categoryVisible = ref<Record<ResolutionCategory, boolean>>({
  'direct': true, 'derived': true, 'synthesized': true, 'pinned': true
});

function onCategoryToggle(key: string): void {
  const category = key as ResolutionCategory;
  if (category in categoryVisible.value) {
    categoryVisible.value[category] = !categoryVisible.value[category];
  }
}

/** Legend swatch colors are the engine's OWN semantic role tokens, never an arbitrary decorative pick — same principle as every node color in the graph itself. */
const legendTabs = computed<readonly LegendTab[]>(() => {
  const entries: LegendEntry[] = [
    { 'key': 'direct', 'swatch': 'solid', 'color': 'var(--ui-color-success-500)', 'label': 'Direct match', 'active': categoryVisible.value['direct'] },
    { 'key': 'derived', 'swatch': 'solid', 'color': 'var(--ui-color-info-500)', 'label': 'Derived', 'active': categoryVisible.value['derived'] },
    { 'key': 'synthesized', 'swatch': 'dashed', 'color': 'var(--ui-color-warning-500)', 'label': 'Synthesized', 'active': categoryVisible.value['synthesized'] },
    { 'key': 'pinned', 'swatch': 'circle', 'color': 'var(--ui-primary)', 'label': 'Pinned', 'active': categoryVisible.value['pinned'] }
  ];
  return [{ 'key': 'resolution', 'label': `iridis-${mathList.value.length}`, 'entries': entries }];
});

const containerRef = ref<HTMLDivElement | null>(null);
const labelsRef = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const zoomLevel = ref(1);
const fitZoomLevel = ref<number | null>(null);
const fullscreen = ref(false);

const graph = shallowRef<GraphHandle | null>(null);
interface PointMeta { readonly name: string; readonly clamped: boolean; readonly category: ResolutionCategory }
let labelMeta: PointMeta[] = [];
let labelRaf: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let visibilityPoll: ReturnType<typeof setInterval> | null = null;
let GraphCtor: CosmosCtor | null = null;
const fitTimers: ReturnType<typeof setTimeout>[] = [];

onMounted(async () => {
  try {
    const mod = await import('@cosmos.gl/graph');
    GraphCtor = (mod as unknown as { Graph: CosmosCtor }).Graph;
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err);
    loading.value = false;
    return;
  }
  loading.value = false;

  const container = containerRef.value;
  if (container === null) return;

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
    if (graph.value !== null) return;
    const rect = container.getBoundingClientRect();
    const inViewport = rect.width > 0 && rect.height > 0
      && rect.bottom > 0 && rect.right > 0
      && rect.top < window.innerHeight && rect.left < window.innerWidth;
    if (!inViewport) return;
    initCosmos(container);
    if (graph.value !== null && visibilityPoll !== null) {
      clearInterval(visibilityPoll);
      visibilityPoll = null;
    }
  };
  visibilityPoll = setInterval(tryInit, 400);
  tryInit();

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (graph.value !== null) { resizeLabelCanvas(); scheduleLabelPaint(); }
    });
    resizeObserver.observe(container);
  }
});

function initCosmos(container: HTMLDivElement): void {
  if (GraphCtor === null || graph.value !== null) return;
  try {
    graph.value = new GraphCtor(container, {
      'spaceSize': SPACE_SIZE,
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
    paint();
    pollZoom();
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err);
  }
}

function pollZoom(): void {
  try { zoomLevel.value = graph.value?.getZoomLevel() ?? 1; } catch { /* ignore */ }
}

const ZOOM_STEP = 1.25;
const PAN_STEP = 80;
const HUB_SIZE = 20;
const LEAF_SIZE = 13;
// cosmos.gl's point-space defaults to a [0, SPACE_SIZE] square (config.spaceSize
// below) — points outside it get clamped to the boundary, which collapses the
// whole layout into a single point if CENTER sits at the space's edge instead
// of its middle.
const SPACE_SIZE = 4096;
const CENTER = SPACE_SIZE / 2;
const HUB_RADIUS = 900;
const LEAF_RADIUS = 260;

function zoomIn(): void {
  const g = graph.value; if (g === null) return;
  try { g.setZoomLevel(g.getZoomLevel() * ZOOM_STEP); pollZoom(); } catch { /* ignore */ }
}
function zoomOut(): void {
  const g = graph.value; if (g === null) return;
  try {
    const next = g.getZoomLevel() / ZOOM_STEP;
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
  const next = new Float32Array(flat.length);
  for (let i = 0; i < flat.length; i += 2) {
    next[i] = (flat[i] ?? 0) + worldDx;
    next[i + 1] = (flat[i + 1] ?? 0) + worldDy;
  }
  try { g.setPointPositions(next, true); g.render(0, 0); scheduleLabelPaint(); } catch { /* ignore */ }
}
function panUp(): void { panBy(0, -PAN_STEP); }
function panDown(): void { panBy(0, +PAN_STEP); }
function panLeft(): void { panBy(+PAN_STEP, 0); }
function panRight(): void { panBy(-PAN_STEP, 0); }

function centre(): void {
  const g = graph.value;
  const container = containerRef.value;
  if (g === null || container === null) return;
  let flat: readonly number[] = [];
  try { flat = g.getPointPositions(); } catch { return; }
  if (flat.length === 0) return;
  let sumX = 0, sumY = 0;
  const count = flat.length / 2;
  for (let i = 0; i < flat.length; i += 2) { sumX += flat[i] ?? 0; sumY += flat[i + 1] ?? 0; }
  const centroidX = sumX / count;
  const centroidY = sumY / count;
  let screenX = 0, screenY = 0;
  try {
    const screen = g.spaceToScreenPosition([centroidX, centroidY]);
    screenX = screen[0]; screenY = screen[1];
  } catch { return; }
  const rect = container.getBoundingClientRect();
  const zoom = g.getZoomLevel();
  if (zoom === 0) return;
  const worldDx = (rect.width / 2 - screenX) / zoom;
  const worldDy = (rect.height / 2 - screenY) / zoom;
  const next = new Float32Array(flat.length);
  for (let i = 0; i < flat.length; i += 2) {
    next[i] = (flat[i] ?? 0) + worldDx;
    next[i + 1] = (flat[i + 1] ?? 0) + worldDy;
  }
  try { g.setPointPositions(next, true); g.render(0, 0); scheduleLabelPaint(); } catch { /* ignore */ }
}

function armFitSequence(): void {
  const handle = graph.value;
  if (handle === null) return;
  for (const t of fitTimers.splice(0)) clearTimeout(t);
  for (const delayMs of [0, 250, 500, 750]) {
    fitTimers.push(setTimeout(() => { handle.fitView(200); }, delayMs));
  }
  fitTimers.push(setTimeout(() => {
    try {
      const level = graph.value?.getZoomLevel() ?? null;
      if (level !== null) fitZoomLevel.value = level;
    } catch { /* ignore */ }
  }, 800));
}
function fit(): void { armFitSequence(); }
function expand(): void { fullscreen.value = !fullscreen.value; }

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (visibilityPoll !== null) { clearInterval(visibilityPoll); visibilityPoll = null; }
  for (const t of fitTimers.splice(0)) clearTimeout(t);
  if (labelRaf !== null) cancelAnimationFrame(labelRaf);
  graph.value?.destroy();
  graph.value = null;
});

watch(mathList, () => paint());
watch(categoryVisible, () => paint(), { 'deep': true });

/** Deterministic hex -> [r,g,b] in 0..1, via the engine's own color record — never a re-derived/approximated value. */
function rgbOf(hex: string): [number, number, number] {
  const { r, g, b } = colorRecordFactory.fromHex(hex).rgb;
  return [r, g, b];
}

function paint(): void {
  const handle = graph.value;
  if (handle === null) return;
  const { positions, colors, sizes, links, linkColors, meta } = buildBuffers(mathList.value, categoryVisible.value);
  labelMeta = meta;
  handle.setPointPositions(positions);
  handle.setPointColors(colors);
  handle.setPointSizes(sizes);
  handle.setLinks(links);
  handle.setLinkColors(linkColors);
  // Positions are laid out deterministically (buildBuffers' hub-and-spoke
  // radial placement) — no force-directed simulation to settle, so a single
  // static render is enough. Deliberately never calls handle.start(): a
  // continuously-running physics sim is unnecessary for this fixed structure
  // and is a genuine performance cliff on software-rendered WebGL (no GPU).
  handle.render(0);
  if (positions.length === 0) { scheduleLabelPaint(); return; }
  armFitSequence();
  scheduleLabelPaint();
}

function scheduleLabelPaint(): void {
  if (labelRaf !== null) return;
  labelRaf = requestAnimationFrame(() => { labelRaf = null; paintLabels(); });
}

function resizeLabelCanvas(): void {
  const canvas = labelsRef.value;
  const container = containerRef.value;
  if (canvas === null || container === null) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = `${String(rect.width)}px`;
  canvas.style.height = `${String(rect.height)}px`;
}

function paintLabels(): void {
  const handle = graph.value;
  const canvas = labelsRef.value;
  if (handle === null || canvas === null) return;
  if (canvas.width === 0 || canvas.height === 0) resizeLabelCanvas();
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  ctx.clearRect(0, 0, w, h);
  if (labelMeta.length === 0) return;

  let positions: readonly number[] = [];
  try { positions = handle.getPointPositions(); } catch { return; }
  if (positions.length === 0) return;

  const mono = getComputedStyle(document.body).getPropertyValue('--font-mono').trim() || 'ui-monospace, monospace';
  ctx.font = `600 12px ${mono}`;
  ctx.textBaseline = 'middle';
  const PAD_X = 5;
  const PAD_Y = 2;

  for (let i = 0; i < labelMeta.length; i++) {
    const meta = labelMeta[i];
    if (meta === undefined || !categoryVisible.value[meta.category]) continue;
    const wx = positions[i * 2];
    const wy = positions[i * 2 + 1];
    if (wx === undefined || wy === undefined) continue;
    let sx = 0, sy = 0;
    try {
      const p = handle.spaceToScreenPosition([wx, wy]);
      sx = p[0]; sy = p[1];
    } catch { continue; }
    if (sx < 0 || sy < 0 || sx > w || sy > h) continue;

    const text = meta.clamped ? `${meta.name} ⏚` : meta.name;
    const textW = ctx.measureText(text).width;
    const pillW = textW + PAD_X * 2;
    const pillH = 13 + PAD_Y * 2;
    const x = sx + 8;
    const y = sy - pillH / 2;

    ctx.fillStyle = 'color-mix(in oklch, var(--ui-bg) 85%, transparent)';
    roundRect(ctx, x, y, pillW, pillH, 4);
    ctx.fill();
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--ui-text-highlighted').trim() || '#eaf6ff';
    ctx.fillText(text, x + PAD_X, y + pillH / 2);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

interface Buffers {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly sizes: Float32Array;
  readonly links: Float32Array;
  readonly linkColors: Float32Array;
  readonly meta: PointMeta[];
}

/**
 * Deterministic hub-and-spoke layout, not a force simulation: hub roles
 * (not derived from anything) sit evenly spaced around a large ring; each
 * derived role sits in a small satellite ring around its own parent's
 * position. This directly represents the schema's own derivation structure
 * rather than letting physics arrange it — and, since nothing needs to
 * settle, cosmos.gl only ever renders once per data/filter change (see
 * paint()), never running a continuous simulation.
 */
function buildBuffers(roles: readonly RoleMathEntry[], visible: Readonly<Record<ResolutionCategory, boolean>>): Buffers {
  const indexByName = new Map<string, number>();
  const meta: PointMeta[] = [];
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const links: number[] = [];
  const linkColors: number[] = [];

  const hubs = roles.filter((r) => r.parentRole === undefined);
  const leavesByParent = new Map<string, RoleMathEntry[]>();
  for (const role of roles) {
    if (role.parentRole === undefined) continue;
    const list = leavesByParent.get(role.parentRole) ?? [];
    list.push(role);
    leavesByParent.set(role.parentRole, list);
  }

  const positionByName = new Map<string, [number, number]>();
  hubs.forEach((hub, i) => {
    const angle = (i / Math.max(hubs.length, 1)) * Math.PI * 2;
    const x = CENTER + Math.cos(angle) * HUB_RADIUS;
    const y = CENTER + Math.sin(angle) * HUB_RADIUS;
    positionByName.set(hub.name, [x, y]);
    const leaves = leavesByParent.get(hub.name) ?? [];
    leaves.forEach((leaf, j) => {
      const leafAngle = (j / Math.max(leaves.length, 1)) * Math.PI * 2;
      positionByName.set(leaf.name, [x + Math.cos(leafAngle) * LEAF_RADIUS, y + Math.sin(leafAngle) * LEAF_RADIUS]);
    });
  });
  // Any role whose parent isn't itself a hub (shouldn't happen given the
  // schema, but defensive) falls back to the center rather than being
  // silently dropped from the layout.
  for (const role of roles) {
    if (!positionByName.has(role.name)) positionByName.set(role.name, [CENTER, CENTER]);
  }

  roles.forEach((role, i) => {
    indexByName.set(role.name, i);
    const category = categoryOf(role);
    meta.push({ 'name': role.name, 'clamped': role.clamp !== null, 'category': category });
    const [x, y] = positionByName.get(role.name)!;
    positions.push(x, y);
    const [r, g, b] = rgbOf(role.hex);
    const alpha = visible[category] ? 1.0 : 0.06;
    colors.push(r, g, b, alpha);
    sizes.push(role.isDerived ? LEAF_SIZE : HUB_SIZE);
  });

  for (const role of roles) {
    if (role.parentRole === undefined) continue;
    const childIdx = indexByName.get(role.name);
    const parentIdx = indexByName.get(role.parentRole);
    if (childIdx === undefined || parentIdx === undefined) continue;
    links.push(childIdx, parentIdx);
    const [r, g, b] = rgbOf(role.hex);
    const bothVisible = visible[categoryOf(role)];
    linkColors.push(r, g, b, bothVisible ? 0.5 : 0.03);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    sizes: new Float32Array(sizes),
    links: new Float32Array(links),
    linkColors: new Float32Array(linkColors),
    meta
  };
}
</script>

<template>
  <div
    class="cg-wrap"
    :class="{ 'cg-wrap--fullscreen': fullscreen }"
  >
    <div class="cg-canvas">
      <div
        v-if="loading"
        class="cg-overlay"
      >
        Loading graph engine…
      </div>
      <div
        v-else-if="loadError"
        class="cg-overlay cg-error"
      >
        Graph failed: {{ loadError }}
      </div>

      <div
        ref="containerRef"
        class="cg-cosmos"
        :aria-label="`Resolved role graph, iridis-${mathList.length}`"
      />
      <canvas
        ref="labelsRef"
        class="cg-labels"
        aria-hidden="true"
      />

      <GraphLegend
        v-if="!loading && !loadError"
        :tabs="legendTabs"
        class="cg-legend-pos"
        @toggle="onCategoryToggle"
      />

      <div
        v-if="!loading && !loadError"
        class="cg-dpad-pos"
      >
        <GraphDpad
          :zoom-level="zoomLevel"
          :pan-enabled="true"
          expand-title="Fullscreen"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @centre="centre"
          @fit="fit"
          @expand="expand"
          @pan-up="panUp"
          @pan-down="panDown"
          @pan-left="panLeft"
          @pan-right="panRight"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cg-wrap {
  width: 100%;
  height: 32rem;
}
.cg-wrap--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 200;
  height: 100vh;
  background: var(--ui-bg);
}
.cg-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--iridis-radius-lg, 1rem);
  overflow: hidden;
  background: radial-gradient(circle at center, color-mix(in oklch, var(--glow) 8%, transparent), var(--ui-bg) 70%);
  border: 1px solid color-mix(in oklch, var(--glow) 22%, transparent);
}
.cg-cosmos {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.cg-labels {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.cg-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  color: var(--ui-text-dimmed);
  font-style: italic;
  pointer-events: none;
  padding: 0 1rem;
  text-align: center;
}
.cg-error { color: var(--ui-color-error-500); }
.cg-legend-pos {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 4;
}
.cg-dpad-pos {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 5;
}
</style>
