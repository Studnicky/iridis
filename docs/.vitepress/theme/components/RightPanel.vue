<script setup lang="ts">
/**
 * RightPanel.vue
 *
 * Persistent example builder + the entire docs configuration. Mounted via
 * the aside-top slot. Vitepress's right-rail outline is disabled in
 * theme.config.ts; this panel takes over the column.
 *
 * Two collapsible sections:
 *   - Live demo (IridisDemo running the canonical full pipeline)
 *   - Configuration (the docs-config form bound to configStore)
 *
 * The whole panel can be collapsed to an edge handle that re-opens.
 */

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';

import IridisDemo    from './IridisDemo.vue';
import SchemaForm    from './SchemaForm.vue';
import { docsConfigSchema } from '../schemas/docsConfig.schema.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';
import { configStore, resetConfig } from '../stores/configStore.ts';
import { panelOpen } from '../stores/panelState.ts';

const RESIZE_KEY = 'iridis-right-panel-width';
const RESIZE_MIN = 320;  // picker-safe floor: SV square (240) + container chrome
const RESIZE_MAX = 720;

const FULL_PIPELINE: readonly string[] = [
  'intake:hex',
  'clamp:count',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
  'emit:json',
];

const open       = panelOpen;            // shared global; CTA buttons toggle this
const cfgOpen    = ref(false);
const exportNote = ref<string | null>(null);

// Flip html.iridis-right-collapsed so base.css can reclaim the content's
// right padding when the panel is collapsed.
function syncCollapsedClass(isOpen: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('iridis-right-collapsed', !isOpen);
}
watch(open, (next) => syncCollapsedClass(next));

// Resizable width — persisted in localStorage. Drag handle on the panel's
// left edge updates --iridis-right-panel-width on documentElement.
function readPersistedWidth(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(RESIZE_KEY);
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
function writePersistedWidth(width: number): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(RESIZE_KEY, String(width)); } catch { /* noop */ }
}
function applyWidth(width: number): void {
  if (typeof document === 'undefined') return;
  const clamped = Math.min(RESIZE_MAX, Math.max(RESIZE_MIN, width));
  document.documentElement.style.setProperty('--iridis-right-panel-width', `${clamped}px`);
  writePersistedWidth(clamped);
}

const dragging = ref(false);
let dragStartX = 0;
let dragStartW = 0;

function onDragPointerDown(e: PointerEvent): void {
  dragging.value = true;
  dragStartX = e.clientX;
  const cs = getComputedStyle(document.documentElement).getPropertyValue('--iridis-right-panel-width').trim();
  dragStartW = parseInt(cs, 10) || 420;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  document.body.style.cursor = 'col-resize';
  e.preventDefault();
}
function onDragPointerMove(e: PointerEvent): void {
  if (!dragging.value) return;
  const dx = dragStartX - e.clientX; // dragging LEFT widens the panel
  applyWidth(dragStartW + dx);
}
function onDragPointerUp(e: PointerEvent): void {
  if (!dragging.value) return;
  dragging.value = false;
  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  document.body.style.cursor = '';
}

onMounted(() => {
  const persisted = readPersistedWidth();
  if (persisted !== null) applyWidth(persisted);
  syncCollapsedClass(open.value);
});

async function buildExportPayload(): Promise<Record<string, unknown>> {
  const engine = new Engine();
  for (const m of mathBuiltins) engine.math.register(m);
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.pipeline([...FULL_PIPELINE]);
  const schema = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['minimal'];
  const state = await engine.run({
    'colors':   [...configStore.paletteColors],
    'roles':    schema,
    'contrast': { 'level': configStore.contrastLevel, 'algorithm': configStore.contrastAlgorithm },
    'runtime':  { 'framing': configStore.framing, 'colorSpace': configStore.colorSpace },
  });
  const roles: Record<string, string> = {};
  for (const [name, rec] of Object.entries(state.roles)) roles[name] = rec.hex;
  return {
    'iridis': {
      'version':  '0.1',
      'config': {
        'paletteColors':     [...configStore.paletteColors],
        'framing':           configStore.framing,
        'contrastLevel':     configStore.contrastLevel,
        'contrastAlgorithm': configStore.contrastAlgorithm,
        'colorSpace':        configStore.colorSpace,
        'roleSchema':        configStore.roleSchema,
      },
      'palette': roles,
      'pipeline': [...FULL_PIPELINE],
    },
  };
}

async function copyJson(): Promise<void> {
  const payload = await buildExportPayload();
  const text = JSON.stringify(payload, null, 2);
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try { await navigator.clipboard.writeText(text); exportNote.value = 'Copied to clipboard'; } catch { exportNote.value = 'Copy failed — use download'; }
  } else { exportNote.value = 'Clipboard unavailable'; }
  setTimeout(() => { exportNote.value = null; }, 2400);
}

async function downloadJson(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const payload = await buildExportPayload();
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { 'type': 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `iridis-palette-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  exportNote.value = 'Downloaded';
  setTimeout(() => { exportNote.value = null; }, 2400);
}
</script>

<template>
  <ClientOnly>
    <aside :class="['iridis-right', { 'iridis-right--collapsed': !open, 'iridis-right--dragging': dragging }]" aria-label="Live example builder">
      <div
        v-show="open"
        class="iridis-right__resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize example panel"
        @pointerdown="onDragPointerDown"
        @pointermove="onDragPointerMove"
        @pointerup="onDragPointerUp"
        @pointercancel="onDragPointerUp"
      />
      <!-- Reopen affordance — full-height vertical button visible only when
           collapsed. Reads top-to-bottom so the label invites the click. -->
      <button
        v-show="!open"
        type="button"
        class="iridis-right__reopen"
        aria-expanded="false"
        aria-label="Open palette builder"
        @click="open = true"
      >
        <span class="iridis-right__reopen-icon" aria-hidden="true">⬕</span>
        <span class="iridis-right__reopen-label">Get palette</span>
      </button>

      <div v-show="open" class="iridis-right__body">
        <header class="iridis-right__header">
          <div class="iridis-right__header-row">
            <span class="iridis-right__eyebrow">Live example</span>
            <button
              type="button"
              class="iridis-right__close"
              aria-label="Close palette builder"
              title="Close palette builder"
              @click="open = false"
            >×</button>
          </div>
          <h2 class="iridis-right__title">Try iridis on this page</h2>
          <p class="iridis-right__sub">
            Pick palette colors. Every chrome and syntax token recomputes. The whole site is one engine pass.
          </p>
        </header>

        <IridisDemo :pipeline="FULL_PIPELINE" />

        <div class="iridis-right__export">
          <button type="button" class="iridis-right__export-btn iridis-right__export-btn--primary" @click="downloadJson">
            ⬇ Export JSON
          </button>
          <button type="button" class="iridis-right__export-btn" @click="copyJson">
            Copy
          </button>
          <span v-if="exportNote" class="iridis-right__export-note">{{ exportNote }}</span>
        </div>

        <section :class="['iridis-right__cfg', { 'iridis-right__cfg--open': cfgOpen }]">
          <button
            type="button"
            class="iridis-right__cfg-toggle"
            :aria-expanded="cfgOpen"
            @click="cfgOpen = !cfgOpen"
          >
            <span class="iridis-right__cfg-chevron" aria-hidden="true">{{ cfgOpen ? '▾' : '▸' }}</span>
            <span class="iridis-right__cfg-label">Configuration</span>
            <span class="iridis-right__cfg-hint">framing · contrast · role schema</span>
          </button>
          <div v-show="cfgOpen" class="iridis-right__cfg-panel">
            <SchemaForm :schema="docsConfigSchema" :model-value="configStore" />
            <button class="iridis-right__cfg-reset" type="button" @click="resetConfig">Reset to defaults</button>
          </div>
        </section>
      </div>
    </aside>
  </ClientOnly>
</template>

<style scoped>
/* Desktop (≥1100px): floating overlay at the viewport's right edge. */
.iridis-right {
  position: fixed;
  top: calc(var(--vp-nav-height, 64px) + 1rem);
  right: 1rem;
  width: var(--iridis-right-panel-width, 380px);
  min-width: 320px;
  max-height: calc(100vh - var(--vp-nav-height, 64px) - 2rem);
  z-index: 30;
  overflow: hidden;
  border-radius: var(--iridis-radius-lg);
  background:
    linear-gradient(160deg, color-mix(in oklch, var(--iridis-surface) 92%, var(--iridis-brand) 8%) 0%,
                            color-mix(in oklch, var(--iridis-surface) 96%, var(--iridis-text)  4%) 100%);
  border: 1px solid color-mix(in oklch, var(--iridis-divider) 80%, var(--iridis-brand) 20%);
  box-shadow: var(--iridis-shadow-lg);
  backdrop-filter: blur(10px);
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1), min-width 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.iridis-right--collapsed {
  width: 2.4rem;
  min-width: 0;
  background:
    linear-gradient(180deg,
      color-mix(in oklch, var(--iridis-brand) 18%, var(--iridis-surface)) 0%,
      color-mix(in oklch, var(--iridis-brand)  6%, var(--iridis-surface)) 100%);
  border-color: color-mix(in oklch, var(--iridis-brand) 45%, var(--iridis-divider));
}
.iridis-right--dragging { user-select: none; }

/* Narrow (<1100px): the panel becomes a stacked drawer below content.
   The icon + heading + intro come first, the example sits below them.
   Closed = entirely hidden (icon + heading dominate the viewport). */
@media (max-width: 1099px) {
  .iridis-right {
    position: relative;
    top: auto;
    right: auto;
    margin: 1.5rem auto 2rem;
    width: 100%;
    max-width: 720px;
    min-width: 0;
    max-height: none;
    z-index: auto;
  }
  .iridis-right--collapsed {
    display: none;
  }
  /* Drag handle disabled on narrow — width is intrinsic. */
  .iridis-right__resize { display: none; }
}

/* Reopen button — fills the collapsed strip. Vertical text via writing-mode. */
.iridis-right__reopen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.85rem 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--iridis-on-brand);
  z-index: 4;
}
.iridis-right__reopen-icon {
  font-size: 1.1rem;
  line-height: 1;
}
.iridis-right__reopen-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--iridis-on-brand);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}
.iridis-right__reopen-chev {
  font-size: 1.1rem;
  line-height: 1;
  font-weight: 700;
}
.iridis-right__reopen:hover {
  background: color-mix(in oklch, var(--iridis-brand) 35%, transparent);
}
.iridis-right__reopen:hover .iridis-right__reopen-label,
.iridis-right__reopen:hover .iridis-right__reopen-icon,
.iridis-right__reopen:hover .iridis-right__reopen-chev {
  color: var(--iridis-on-brand);
  filter: brightness(1.15);
}

/* Drag handle — thin vertical strip on the panel's left edge. Hover lights
   it; active drag widens it. Cursor: col-resize the whole strip. */
.iridis-right__resize {
  position: absolute;
  top: 0;
  left: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 3;
  background: transparent;
  border-radius: 3px;
  transition: background 120ms;
}
.iridis-right__resize:hover {
  background: color-mix(in oklch, var(--iridis-brand) 25%, transparent);
}
.iridis-right--dragging .iridis-right__resize {
  background: color-mix(in oklch, var(--iridis-brand) 45%, transparent);
}

.iridis-right__body {
  padding: 0.85rem 0.95rem 1rem;
  overflow: auto;
  max-height: calc(100vh - var(--vp-nav-height, 64px) - 2rem);
}
@media (max-width: 1099px) {
  .iridis-right__body { max-height: none; }
}
.iridis-right__header { margin: 0 0 0.85rem; }
.iridis-right__header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.iridis-right__close {
  width: 1.7rem;
  height: 1.7rem;
  padding: 0;
  background: color-mix(in oklch, var(--iridis-surface) 70%, var(--iridis-brand) 30%);
  border: var(--iridis-border-soft);
  border-color: color-mix(in oklch, var(--iridis-divider) 60%, var(--iridis-brand) 40%);
  border-radius: 50%;
  color: var(--iridis-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
  font-weight: 700;
  box-shadow: var(--iridis-shadow-felt);
  transition: transform 120ms, box-shadow 120ms, background 120ms;
}
.iridis-right__close:hover {
  background: color-mix(in oklch, var(--iridis-brand) 30%, var(--iridis-surface));
  box-shadow: var(--iridis-shadow-felt-hover);
  transform: scale(1.08);
}
.iridis-right__eyebrow {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--iridis-brand);
  background: color-mix(in oklch, var(--iridis-brand) 12%, transparent);
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--iridis-brand) 35%, transparent);
}
.iridis-right__title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0.5rem 0 0.3rem;
  color: var(--iridis-text);
  letter-spacing: -0.01em;
  border: 0;
  padding: 0;
}
.iridis-right__sub {
  font-size: 0.78rem;
  color: var(--iridis-muted);
  margin: 0 0 0.85rem;
  line-height: 1.45;
}

.iridis-right__cfg {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid color-mix(in oklch, var(--iridis-divider) 70%, transparent);
}
.iridis-right__cfg-toggle {
  width: 100%;
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.35rem 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  color: var(--iridis-muted);
}
.iridis-right__cfg-chevron { font-size: 0.7rem; }
.iridis-right__cfg-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.iridis-right__cfg-hint {
  justify-self: end;
  font-size: 0.62rem;
  color: var(--iridis-muted);
  font-style: italic;
  text-align: right;
}
.iridis-right__cfg-toggle:hover { color: var(--iridis-brand); }
.iridis-right__cfg-panel { margin-top: 0.5rem; padding: 0.65rem 0 0; }
.iridis-right__cfg-reset {
  margin-top: 0.85rem;
  padding: 0.35rem 0.6rem;
  background: var(--iridis-bg-soft);
  border: 1px solid var(--iridis-divider);
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--iridis-muted);
  cursor: pointer;
}
.iridis-right__cfg-reset:hover {
  color: var(--iridis-brand);
  border-color: var(--iridis-brand);
}

.iridis-right__export {
  margin-top: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.iridis-right__export-btn {
  padding: 0.4rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  background: var(--iridis-bg-soft);
  border: 1px solid var(--iridis-divider);
  color: var(--iridis-text);
}
.iridis-right__export-btn:hover {
  border-color: var(--iridis-brand);
  color: var(--iridis-brand);
}
.iridis-right__export-btn--primary {
  background: var(--iridis-brand);
  color: var(--iridis-on-brand);
  border-color: var(--iridis-brand);
}
.iridis-right__export-btn--primary:hover {
  filter: brightness(1.1);
  color: var(--iridis-on-brand);
}
.iridis-right__export-note {
  font-size: 0.74rem;
  color: var(--iridis-brand);
  font-weight: 500;
}
</style>
