import { PanelAccordionState } from './panelAccordionState.ts';

/** Test-only: clears shared accordion state (see panelAccordionState.ts) between test cases. Not part of the public API surface. */
class ResetPanelAccordionForTestsOperation {
  static run(): void {
    PanelAccordionState.current().reset();
  }
}

export const __resetPanelAccordionForTests = ResetPanelAccordionForTestsOperation.run;
