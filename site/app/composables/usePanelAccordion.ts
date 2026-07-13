/**
 * Shared accordion coordination for independent panels: at most 3 panels may
 * be open at once, oldest-opened is evicted when a 4th opens. Closing removes
 * a panel from the order entirely, so reopening always re-adds it at the
 * most-recent end — no separate "move to end" case is needed.
 */

import { computed, reactive } from 'vue';

const MAX_OPEN_PANELS = 3;

/** Open panel IDs, oldest-opened first. Module-level singleton shared by every call site. */
const openPanelIds = reactive<string[]>([]);
const seededPanelIds = new Set<string>();

function openPanel(id: string): void {
  if (openPanelIds.includes(id)) { return; }
  openPanelIds.push(id);
  if (openPanelIds.length > MAX_OPEN_PANELS) { openPanelIds.shift(); }
}

function closePanel(id: string): void {
  const index = openPanelIds.indexOf(id);
  if (index !== -1) { openPanelIds.splice(index, 1); }
}

export interface PanelAccordionOptionsInterfaceType {
  defaultOpen?: boolean;
}

export function usePanelAccordion(panelId: string, opts?: PanelAccordionOptionsInterfaceType) {
  if (opts?.defaultOpen && !seededPanelIds.has(panelId)) {
    seededPanelIds.add(panelId);
    openPanel(panelId);
  }

  const isOpen = computed(() => openPanelIds.includes(panelId));

  return {
    isOpen,
    'open': () => openPanel(panelId),
    'close': () => closePanel(panelId),
    'toggle': () => { isOpen.value ? closePanel(panelId) : openPanel(panelId); }
  };
}

/** Test-only: clears shared module state between test cases. Not part of the public API surface. */
export function __resetPanelAccordionForTests(): void {
  openPanelIds.splice(0, openPanelIds.length);
  seededPanelIds.clear();
}
