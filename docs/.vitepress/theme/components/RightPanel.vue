<script setup lang="ts">
/**
 * RightPanel.vue
 *
 * Persistent example builder + the entire docs configuration. Mounted via
 * the aside-top slot. Vitepress's right-rail outline is disabled in
 * theme.config.ts; this panel takes over the column.
 *
 * Two regions:
 *   - Live demo (IridisDemo running the canonical full pipeline)
 *   - Configuration (PrimeVue Accordion wrapping the docs-config form)
 *
 * The whole panel can be collapsed to an edge handle that re-opens. The
 * close button, eyebrow tag, configuration accordion, and export
 * buttons are PrimeVue primitives; the resize handle and edge-tab
 * sticky button stay custom (project-specific affordances).
 */

import { onMounted, ref, watch } from 'vue';

import Button         from 'primevue/button';
import Tag            from 'primevue/tag';
import Accordion      from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader  from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';

import { Engine, mathBuiltins, coreTasks } from '@studnicky/iridis';

import IridisDemo    from './IridisDemo.vue';
import SchemaForm    from './SchemaForm.vue';
import { docsConfigSchema } from '../schemas/docsConfig.schema.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';
import { configStore, resetConfig } from '../stores/configStore.ts';
import { panelOpen } from '../stores/panelState.ts';

const RESIZE_KEY = 'iridis-right-panel-width';
const RESIZE_MIN = 320;
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

const open       = panelOpen;
const cfgValue   = ref<string | null>(null);
const exportNote = ref<string | null>(null);

function syncCollapsedClass(isOpen: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('iridis-right-collapsed', !isOpen);
}
watch(open, (next) => syncCollapsedClass(next));

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
  const dx = dragStartX - e.clientX;
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
  // Default to closed on narrow viewports so the drawer doesn't cover
  // 60% of the screen on first paint. Desktop default stays open.
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1099px)').matches) {
    open.value = false;
  }
  syncCollapsedClass(open.value);
});

async function buildExportPayload(): Promise<Record<string, unknown>> {
  const engine = new Engine();
  for (const m of mathBuiltins) engine.math.register(m);
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.pipeline([...FULL_PIPELINE]);
  const pair   = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-16'];
  const schema = pair[configStore.framing];
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
    <Button
      :class="['iridis-right-tab', { 'iridis-right-tab--open': open }]"
      severity="secondary"
      :aria-pressed="open"
      :aria-label="open ? 'Hide palette builder' : 'Open palette builder'"
      :title="open ? 'Hide palette builder' : 'Open palette builder'"
      @click="open = !open"
    >
      <span class="iridis-right-tab__arrow" aria-hidden="true">{{ open ? '▶' : '◀' }}</span>
      <span class="iridis-right-tab__label">Get palette</span>
    </Button>

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

      <div v-show="open" class="iridis-right__body">
        <header class="iridis-right__header">
          <Tag value="Live example" severity="info" class="iridis-right__eyebrow" />
          <h2 class="iridis-right__title">Try iridis on this page</h2>
          <p class="iridis-right__sub">
            Pick palette colors. Every chrome and syntax token recomputes. The whole site is one engine pass.
          </p>
        </header>

        <IridisDemo :pipeline="FULL_PIPELINE" />

        <div class="iridis-right__export">
          <Button
            type="button"
            label="⬇ Export JSON"
            severity="primary"
            size="small"
            class="iridis-right__export-btn iridis-right__export-btn--primary"
            @click="downloadJson"
          />
          <Button
            type="button"
            label="Copy"
            severity="secondary"
            size="small"
            class="iridis-right__export-btn"
            @click="copyJson"
          />
          <span v-if="exportNote" class="iridis-right__export-note">{{ exportNote }}</span>
        </div>

        <Accordion v-model:value="cfgValue" class="iridis-right__cfg">
          <AccordionPanel value="cfg">
            <AccordionHeader>
              <span class="iridis-right__cfg-label">Configuration</span>
              <span class="iridis-right__cfg-hint">framing · contrast · role schema</span>
            </AccordionHeader>
            <AccordionContent>
              <div class="iridis-right__cfg-panel">
                <SchemaForm :schema="docsConfigSchema" :model-value="configStore" />
                <Button
                  type="button"
                  label="Reset to defaults"
                  severity="secondary"
                  size="small"
                  class="iridis-right__cfg-reset"
                  @click="resetConfig"
                />
              </div>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </div>
    </aside>
  </ClientOnly>
</template>

<style scoped>
.iridis-right {
  position: fixed;
  top: calc(var(--vp-nav-height, 64px) + 1rem);
  right: 1rem;
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
.iridis-right:not(.iridis-right--collapsed) {
  width: var(--iridis-right-panel-width, 380px);
  min-width: 320px;
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

@media (max-width: 1099px) {
  .iridis-right {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    max-width: none;
    height: 60vh;
    max-height: 60vh;
    margin: 0;
    z-index: 33;
    border-radius: var(--iridis-radius) var(--iridis-radius) 0 0;
    transform: translateY(0);
    transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .iridis-right:not(.iridis-right--collapsed) {
    width: 100%;
    min-width: 0;
  }
  .iridis-right--collapsed {
    width: 100%;
    min-width: 0;
    transform: translateY(100%);
    pointer-events: none;
  }
  .iridis-right__resize { display: none; }
  .iridis-right__body {
    max-height: calc(60vh - 1rem);
  }
}

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
  transition: background-color var(--iridis-transition);
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
.iridis-right__header {
  margin: 0 0 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

/* PrimeVue Tag styled as the eyebrow pill — uppercase letterforms,
   brand tint. */
.iridis-right__eyebrow :deep(.p-tag) {
  background:    color-mix(in oklch, var(--iridis-brand) 12%, transparent);
  color:         var(--iridis-brand);
  border:        1px solid color-mix(in oklch, var(--iridis-brand) 35%, transparent);
  font-size:     0.62rem;
  font-weight:   700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding:       0.18rem 0.45rem;
  border-radius: var(--iridis-radius);
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

/* Configuration accordion — PrimeVue paints the chrome via --p-*
   tokens; this layer enforces the uppercase eyebrow + brand-on-hover
   color the docs use. */
.iridis-right__cfg {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid color-mix(in oklch, var(--iridis-divider) 70%, transparent);
}
.iridis-right__cfg :deep(.p-accordionpanel),
.iridis-right__cfg :deep(.p-accordionheader),
.iridis-right__cfg :deep(.p-accordioncontent) {
  background: transparent;
  border: 0;
}
.iridis-right__cfg :deep(.p-accordionheader) {
  padding: 0.35rem 0;
  color: var(--iridis-muted);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
  align-items: baseline;
}
.iridis-right__cfg :deep(.p-accordionheader:hover) {
  color: var(--iridis-brand);
}
.iridis-right__cfg-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.iridis-right__cfg-hint {
  font-size: 0.62rem;
  color: var(--iridis-muted);
  font-style: italic;
  text-align: right;
}
.iridis-right__cfg-panel { padding: 0.65rem 0 0; }
.iridis-right__cfg-reset {
  margin-top: 0.85rem;
}
.iridis-right__cfg-reset :deep(.p-button) {
  padding: 0.35rem 0.6rem;
  background: var(--iridis-bg-soft);
  border: 1px solid var(--iridis-divider);
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--iridis-muted);
}
.iridis-right__cfg-reset :deep(.p-button:hover) {
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
.iridis-right__export-btn :deep(.p-button) {
  padding: 0.4rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 6px;
}
.iridis-right__export-btn--primary :deep(.p-button) {
  background:   var(--iridis-brand);
  color:        var(--iridis-on-brand);
  border-color: var(--iridis-brand);
}
.iridis-right__export-btn--primary :deep(.p-button:hover) {
  filter: brightness(1.1);
  color: var(--iridis-on-brand);
}
.iridis-right__export-note {
  font-size: 0.74rem;
  color: var(--iridis-brand);
  font-weight: 500;
}
</style>
