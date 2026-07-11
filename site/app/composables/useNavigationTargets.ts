/**
 * The page's navigation target table — every carousel card and every docs
 * card, addressable by id. This is groundwork for a future MYRM-style
 * navigation helper (a capability dispatcher that picks a target by
 * id/label and asks the FSM to go there); nothing here builds that helper
 * yet, but `resolve()` is exactly the lookup such a dispatcher would call,
 * and NAVIGATE_TO_TARGET (see IridisUiMachine.ts) is exactly the FSM event
 * it would send. Doc targets are registered once site/app/pages/index.vue's
 * async content query resolves, since the doc list isn't known statically.
 */
import { computed, shallowRef } from 'vue';

import { CAROUSEL_SECTIONS } from './CarouselSections.ts';

import type { NavigationTargetInterfaceType } from './types/navigationTarget.ts';

const docTargets = shallowRef<readonly NavigationTargetInterfaceType[]>([]);

const cardTargets: readonly NavigationTargetInterfaceType[] = CAROUSEL_SECTIONS.map((section) => ({
  'id': section.key, 'kind': 'card', 'label': section.label,
}));

const targets = computed<readonly NavigationTargetInterfaceType[]>(() => [...cardTargets, ...docTargets.value]);

/** Called once by index.vue when the async docs query resolves. */
function registerDocTargets(docs: ReadonlyArray<{ readonly path: string; readonly title?: string }>): void {
  docTargets.value = docs.map((doc) => ({
    'id': doc.path.replace(/[^a-zA-Z0-9-]/g, '-').replace(/^-+|-+$/g, ''),
    'kind': 'doc',
    'label': doc.title ?? doc.path,
  }));
}

function resolve(id: string): NavigationTargetInterfaceType | undefined {
  return targets.value.find((target) => target.id === id);
}

/** Index of a card target within CAROUSEL_SECTIONS — what SELECT_CARD's `index` expects. */
function cardIndex(id: string): number {
  return CAROUSEL_SECTIONS.findIndex((section) => section.key === id);
}

export function useNavigationTargets() {
  return { 'cardIndex': cardIndex, 'registerDocTargets': registerDocTargets, 'resolve': resolve, 'targets': targets };
}
