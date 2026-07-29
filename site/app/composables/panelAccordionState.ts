import { reactive } from 'vue';

import { useNuxtApp } from '#imports';

/**
 * Accordion coordination scoped to one Nuxt app/request. Components in one
 * client app share ordering, while concurrent SSR requests have independent
 * reactive arrays and seeding registries.
 */
export class PanelAccordionState {
  static readonly MAXIMUM_OPEN_PANELS = 3;
  static readonly #states = new WeakMap<object, PanelAccordionState>();

  /** Open panel IDs, oldest-opened first. */
  readonly openPanelIds = reactive<string[]>([]);
  readonly seededPanelIds = new Set<string>();

  static current(): PanelAccordionState {
    const nuxtApp = useNuxtApp();
    const existing = this.#states.get(nuxtApp);
    if (existing !== undefined) { return existing; }

    const state = new PanelAccordionState();
    this.#states.set(nuxtApp, state);
    return state;
  }

  close(id: string): void {
    const index = this.openPanelIds.indexOf(id);
    if (index !== -1) { this.openPanelIds.splice(index, 1); }
  }

  open(id: string): void {
    if (this.openPanelIds.includes(id)) { return; }
    this.openPanelIds.push(id);
    if (this.openPanelIds.length > PanelAccordionState.MAXIMUM_OPEN_PANELS) {
      this.openPanelIds.shift();
    }
  }

  reset(): void {
    this.openPanelIds.splice(0, this.openPanelIds.length);
    this.seededPanelIds.clear();
  }

  toggle(id: string): void {
    if (this.openPanelIds.includes(id)) { this.close(id); } else { this.open(id); }
  }
}
