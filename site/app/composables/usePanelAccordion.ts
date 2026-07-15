import { computed } from 'vue';

import { PanelAccordionState } from './panelAccordionState.ts';

class Panel {
  static open(id: string): void {
    if (PanelAccordionState.openPanelIds.includes(id)) { return; }
    PanelAccordionState.openPanelIds.push(id);
    if (PanelAccordionState.openPanelIds.length > PanelAccordionState.MAX_OPEN_PANELS) { PanelAccordionState.openPanelIds.shift(); }
  }

  static close(id: string): void {
    const index = PanelAccordionState.openPanelIds.indexOf(id);
    if (index !== -1) { PanelAccordionState.openPanelIds.splice(index, 1); }
  }
}

type PanelAccordionOptionsInterfaceType = {
  'defaultOpen': boolean | undefined;
};

/** One panel's open/close state within the shared accordion coordination — see panelAccordionState.ts. */
export function usePanelAccordion(panelId: string, opts?: PanelAccordionOptionsInterfaceType) {
  if (opts?.defaultOpen === true && !PanelAccordionState.seededPanelIds.has(panelId)) {
    PanelAccordionState.seededPanelIds.add(panelId);
    Panel.open(panelId);
  }

  const isOpen = computed(() => { const result = PanelAccordionState.openPanelIds.includes(panelId); return result; });

  return {
    'close': () => { const result = Panel.close(panelId); return result; },
    'isOpen': isOpen,
    'open': () => { const result = Panel.open(panelId); return result; },
    'toggle': () => {
      if (isOpen.value) { Panel.close(panelId); } else { Panel.open(panelId); }
    }
  };
}
