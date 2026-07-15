import { PanelAccordionState } from './panelAccordionState.ts';

/** Test-only: clears shared accordion state (see panelAccordionState.ts) between test cases. Not part of the public API surface. */
export function __resetPanelAccordionForTests(): void {
  PanelAccordionState.openPanelIds.splice(0, PanelAccordionState.openPanelIds.length);
  PanelAccordionState.seededPanelIds.clear();
}
