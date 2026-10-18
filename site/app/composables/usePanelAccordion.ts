import { computed } from 'vue';

import { PanelAccordionState } from './panelAccordionState.ts';

class PanelController {
  readonly isOpen;

  constructor(private readonly panelId: string, private readonly state: PanelAccordionState) {
    this.isOpen = computed(() => {
      const result = state.openPanelIds.includes(panelId);
      return result;
    });
  }

  close(): void {
    this.state.close(this.panelId);
  }

  open(): void {
    this.state.open(this.panelId);
  }

  toggle(): void {
    this.state.toggle(this.panelId);
  }
}

/** One panel's open/close state within the shared accordion coordination — see panelAccordionState.ts. */
class UsePanelAccordionOperation {
  static run(panelId: string, initiallyOpen = false) {
    const state = PanelAccordionState.current();
    if (initiallyOpen && !state.seededPanelIds.has(panelId)) {
      state.seededPanelIds.add(panelId);
      state.open(panelId);
    }

    return new PanelController(panelId, state);
  }
}

export const usePanelAccordion = UsePanelAccordionOperation.run;
