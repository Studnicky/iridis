/**
 * The page's navigation target table — every stage-carousel card, every
 * stage carousel itself, and every docs card, addressable by id. `resolve()`
 * is the lookup a capability dispatcher would call, and `activateTarget()` is
 * the single place that turns a resolved target into an actual page action
 * (scroll + local carousel index selection, or scroll + accordion
 * open/close for docs) — NAVIGATE_TO_TARGET (see IridisUiMachine.ts) is the
 * FSM event that ultimately calls it. Doc targets are registered once
 * site/app/pages/index.vue's async content query resolves, since the doc
 * list isn't known statically.
 */
import { computed, shallowRef } from 'vue';

import type { NavigationTargetInterfaceType } from './types/navigationTarget.ts';

import { docPanelId } from './docPanelId.ts';
import { sanitizeDocAnchorId } from './sanitizeDocAnchorId.ts';
import { STAGE_GROUPS } from './stageGroups.ts';
import { usePanelAccordion } from './usePanelAccordion.ts';

const docTargets = shallowRef<readonly NavigationTargetInterfaceType[]>([]);

const cardTargets: readonly NavigationTargetInterfaceType[] = STAGE_GROUPS.flatMap((group) => {
  const result = group.items.map((item) => {return { 'id': item.key, 'kind': 'card', 'label': item.label, 'panelId': undefined, 'stage': group.name } satisfies NavigationTargetInterfaceType;});
  return result;
});

const stageTargets: readonly NavigationTargetInterfaceType[] = STAGE_GROUPS.map((group) => {
  return { 'id': group.name, 'kind': 'stage', 'label': group.label, 'panelId': undefined, 'stage': undefined } satisfies NavigationTargetInterfaceType;
});

const targets = computed<readonly NavigationTargetInterfaceType[]>(() => {return [...cardTargets, ...stageTargets, ...docTargets.value];});

/** Called once by index.vue when the async docs query resolves. */
function registerDocTargets(docs: readonly { readonly 'path': string; readonly 'title'?: string }[]): void {
  docTargets.value = docs.map((doc) => {return {
    'id': sanitizeDocAnchorId(doc.path),
    'kind': 'doc',
    'label': doc.title ?? doc.path,
    'panelId': docPanelId(doc.path),
    'stage': undefined
  };});
}

function resolve(id: string): NavigationTargetInterfaceType | undefined {
  const result = targets.value.find((target) => {return target.id === id;});
  return result;
}

/** Index of a card target within its OWN stage's items array — what a stage carousel's local v-model expects. */
function cardIndex(id: string): number {
  for (const group of STAGE_GROUPS) {
    const index = group.items.findIndex((item) => {return item.key === id;});
    if (index !== -1) {return index;}
  }
  return -1;
}

/**
 * Registered by each stage carousel (index.vue) so `activateTarget()` can
 * bring a specific card to the front of its OWN local carousel state — the
 * stage carousels own that state (a plain `ref(0)`), not this module, so
 * selecting a card is a callback out to whichever stage owns it rather than a
 * shared FSM index.
 */
const stageIndexSetters = new Map<string, (index: number) => void>();
function registerStageIndexSetter(stage: string, setter: (index: number) => void): void {
  stageIndexSetters.set(stage, setter);
}

function scrollToId(id: string): void {
  if (typeof document === 'undefined') {return;}
  document.getElementById(id)?.scrollIntoView({ 'behavior': 'smooth', 'block': 'start', 'inline': 'nearest' });
}

/** The doc panel most recently opened BY NAVIGATION (arrow/ToC/prose-link), so activateTarget() knows which one to contract when moving on to the next. Not touched by a user's own manual accordion clicks — those go through AccordionPanel.vue's own usePanelAccordion() call directly. */
let lastActivatedDocPanelId: string | undefined;

/**
 * Resolves a target id and performs whatever navigation it implies: a `card`
 * target selects it within its owning stage's local carousel, then scrolls
 * that stage into view; a `stage` target (the Next/Previous step buttons)
 * just scrolls to it; a `doc` target scrolls its card into view AND expands
 * its accordion panel, contracting whichever doc panel navigation last
 * expanded (a guided-tour feel — arriving at a doc via Next/Previous or the
 * ToC always shows it open, without leaving every previously-visited doc
 * panel open behind it).
 */
function activateTarget(id: string): void {
  const target = resolve(id);
  if (target === undefined) {return;}
  if (target.kind === 'card' && target.stage !== undefined) {
    stageIndexSetters.get(target.stage)?.(cardIndex(target.id));
    scrollToId(target.stage);
  } else if (target.kind === 'doc' && target.panelId !== undefined) {
    if (lastActivatedDocPanelId !== undefined && lastActivatedDocPanelId !== target.panelId) {
      usePanelAccordion(lastActivatedDocPanelId).close();
    }
    usePanelAccordion(target.panelId).open();
    lastActivatedDocPanelId = target.panelId;
    scrollToId(target.id);
  } else {
    scrollToId(target.id);
  }
}

export function useNavigationTargets() {
  return {
    'activateTarget': activateTarget, 'registerDocTargets': registerDocTargets,
    'registerStageIndexSetter': registerStageIndexSetter
  };
}
