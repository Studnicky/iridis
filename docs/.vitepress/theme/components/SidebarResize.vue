<script setup lang="ts">
/**
 * SidebarResize.vue
 *
 * Drag handle on the sidebar's right edge. Mirrors RightPanel's resize:
 * updates --vp-sidebar-width on documentElement, persists to localStorage,
 * bounded 200..520. Mounted from theme/index.ts via layout-top slot.
 */

import { onMounted, ref } from 'vue';

const KEY = 'iridis-sidebar-width';
const MIN = 200;
const MAX = 520;

const dragging = ref(false);
let startX = 0;
let startW = 0;

function applyWidth(w: number): void {
  if (typeof document === 'undefined') return;
  const clamped = Math.min(MAX, Math.max(MIN, w));
  document.documentElement.style.setProperty('--vp-sidebar-width', `${clamped}px`);
  document.documentElement.style.setProperty('--vp-sidebar-width-desktop', `${clamped}px`);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(KEY, String(clamped)); } catch { /* noop */ }
  }
}

function readPersisted(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function onDown(e: PointerEvent): void {
  dragging.value = true;
  startX = e.clientX;
  const cs = getComputedStyle(document.documentElement).getPropertyValue('--vp-sidebar-width').trim();
  startW = parseInt(cs, 10) || 280;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  document.body.style.cursor = 'col-resize';
  e.preventDefault();
}
function onMove(e: PointerEvent): void {
  if (!dragging.value) return;
  applyWidth(startW + (e.clientX - startX));
}
function onUp(e: PointerEvent): void {
  if (!dragging.value) return;
  dragging.value = false;
  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  document.body.style.cursor = '';
}

onMounted(() => {
  const persisted = readPersisted();
  if (persisted !== null) applyWidth(persisted);
});
</script>

<template>
  <ClientOnly>
    <div
      :class="['iridis-sidebar-resize', { 'iridis-sidebar-resize--dragging': dragging }]"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    />
  </ClientOnly>
</template>
