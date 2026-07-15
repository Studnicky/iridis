import { reactive } from 'vue';

/**
 * Shared accordion coordination state: at most 3 panels open at once,
 * oldest-opened evicted when a 4th opens. Module-level singleton, imported by
 * both usePanelAccordion.ts (the public hook) and
 * __resetPanelAccordionForTests.ts (test-only reset) so they mutate the exact
 * same reactive state rather than independent copies.
 */
export class PanelAccordionState {
  static readonly MAX_OPEN_PANELS = 3;
  /** Open panel IDs, oldest-opened first. */
  static readonly openPanelIds = reactive<string[]>([]);
  static readonly seededPanelIds = new Set<string>();
}
