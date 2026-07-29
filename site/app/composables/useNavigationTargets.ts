import * as VueModule from 'vue';

import { useNuxtApp } from '#imports';

import type { NavigationTargetInterfaceType } from './types/navigationTarget.ts';

import { documentPanelId } from './documentPanelId.ts';
import { PanelAccordionState } from './panelAccordionState.ts';
import { sanitizeDocumentAnchorId } from './sanitizeDocumentAnchorId.ts';
import { STAGE_GROUPS } from './stageGroups.ts';

const cardTargets: readonly NavigationTargetInterfaceType[] = STAGE_GROUPS.flatMap((group) => {
  const result = group.items.map((item) => {
    return {
      'id': item.key, 'kind': 'card', 'label': item.label, 'panelId': undefined, 'stage': group.name
    } satisfies NavigationTargetInterfaceType;
  });
  return result;
});

const stageTargets: readonly NavigationTargetInterfaceType[] = STAGE_GROUPS.map((group) => {
  return {
    'id': group.name,
    'kind': 'stage',
    'label': group.label,
    'panelId': undefined,
    'stage': undefined
  } satisfies NavigationTargetInterfaceType;
});

class CardIndexOperation {
  static run(id: string): number {
    for (const group of STAGE_GROUPS) {
      const index = group.items.findIndex((item) => { return item.key === id; });
      if (index !== -1) { return index; }
    }
    return -1;
  }
}

/** Mutable navigation coordination owned by one Nuxt app/request. */
class NavigationTargetsContext {
  readonly #accordionState: PanelAccordionState;
  readonly #documentTargets = VueModule.shallowRef<readonly NavigationTargetInterfaceType[]>([]);
  readonly #stageIndexSetters = new Map<string, (index: number) => void>();
  readonly #targets = VueModule.computed<readonly NavigationTargetInterfaceType[]>(() => {
    return [...cardTargets, ...stageTargets, ...this.#documentTargets.value];
  });

  #documentCommitScheduled = false;
  #lastActivatedDocumentPanelId: string | undefined;
  #navigationRequestIdentifier = 0;
  #pendingAnimationFrameIdentifier: number | undefined;
  #pendingAnimationWindow: Window | undefined;
  #pendingDocumentNavigationRequestIdentifier: number | undefined;
  #pendingDocumentTargetIdentifier: string | undefined;

  constructor(accordionState: PanelAccordionState) {
    this.#accordionState = accordionState;
  }

  readonly activateTarget = (id: string): void => {
    const target = this.#targets.value.find((candidate) => { return candidate.id === id; });
    if (target === undefined) { return; }

    const requestIdentifier = this.#beginNavigation();
    if (target.kind === 'card' && target.stage !== undefined) {
      this.#stageIndexSetters.get(target.stage)?.(CardIndexOperation.run(target.id));
      this.#scrollToId(target.stage);
      return;
    }

    if (target.kind === 'doc' && target.panelId !== undefined) {
      if (
        this.#lastActivatedDocumentPanelId !== undefined
        && this.#lastActivatedDocumentPanelId !== target.panelId
      ) {
        this.#accordionState.close(this.#lastActivatedDocumentPanelId);
      }
      this.#accordionState.open(target.panelId);
      this.#lastActivatedDocumentPanelId = target.panelId;
      this.#scheduleDocumentScroll(target.id, requestIdentifier);
      return;
    }

    this.#scrollToId(target.id);
  };

  readonly cancelPendingNavigation = (): void => {
    this.#navigationRequestIdentifier += 1;
    this.#pendingDocumentTargetIdentifier = undefined;
    this.#pendingDocumentNavigationRequestIdentifier = undefined;
    this.#cancelDocumentScrollFrame();
  };

  readonly registerDocumentTargets = (
    documents: readonly { readonly 'path': string; readonly 'title'?: string }[]
  ): void => {
    this.#documentTargets.value = documents.map((documentEntry) => {
      return {
        'id': sanitizeDocumentAnchorId(documentEntry.path),
        'kind': 'doc',
        'label': documentEntry.title ?? documentEntry.path,
        'panelId': documentPanelId(documentEntry.path),
        'stage': undefined
      };
    });
  };

  readonly registerStageIndexSetter = (stage: string, setter: (index: number) => void): void => {
    this.#stageIndexSetters.set(stage, setter);
  };

  use() {
    return {
      'activateTarget': this.activateTarget,
      'cardTargets': cardTargets,
      'registerDocumentTargets': this.registerDocumentTargets,
      'registerStageIndexSetter': this.registerStageIndexSetter,
      'stageTargets': stageTargets
    };
  }

  #beginNavigation(): number {
    this.cancelPendingNavigation();
    return this.#navigationRequestIdentifier;
  }

  #cancelDocumentScrollFrame(): void {
    if (this.#pendingAnimationFrameIdentifier !== undefined && this.#pendingAnimationWindow !== undefined) {
      this.#pendingAnimationWindow.cancelAnimationFrame(this.#pendingAnimationFrameIdentifier);
    }
    this.#pendingAnimationFrameIdentifier = undefined;
    this.#pendingAnimationWindow = undefined;
  }

  readonly #commitDocumentScroll = (): void => {
    this.#documentCommitScheduled = false;
    if (
      this.#pendingDocumentTargetIdentifier === undefined
      || this.#pendingDocumentNavigationRequestIdentifier !== this.#navigationRequestIdentifier
      || typeof window === 'undefined'
    ) { return; }

    this.#cancelDocumentScrollFrame();
    this.#pendingAnimationWindow = window;
    this.#pendingAnimationFrameIdentifier = window.requestAnimationFrame(this.#scrollToPendingDocument);
  };

  #scheduleDocumentScroll(targetIdentifier: string, requestIdentifier: number): void {
    this.#pendingDocumentTargetIdentifier = targetIdentifier;
    this.#pendingDocumentNavigationRequestIdentifier = requestIdentifier;
    if (this.#documentCommitScheduled) { return; }

    this.#documentCommitScheduled = true;
    void VueModule.nextTick(this.#commitDocumentScroll);
  }

  readonly #scrollToPendingDocument = (): void => {
    const targetIdentifier = this.#pendingDocumentTargetIdentifier;
    const requestIdentifier = this.#pendingDocumentNavigationRequestIdentifier;
    this.#pendingAnimationFrameIdentifier = undefined;
    this.#pendingAnimationWindow = undefined;
    this.#pendingDocumentTargetIdentifier = undefined;
    this.#pendingDocumentNavigationRequestIdentifier = undefined;
    if (targetIdentifier === undefined || requestIdentifier !== this.#navigationRequestIdentifier) { return; }
    this.#scrollToId(targetIdentifier);
  };

  #scrollToId(id: string): void {
    if (typeof document === 'undefined') { return; }
    document.getElementById(id)?.scrollIntoView({ 'behavior': 'smooth', 'block': 'start', 'inline': 'nearest' });
  }
}

class NavigationTargetsRegistry {
  static readonly #contexts = new WeakMap<object, NavigationTargetsContext>();

  static resolve(nuxtApp: object): NavigationTargetsContext {
    const existing = this.#contexts.get(nuxtApp);
    if (existing !== undefined) { return existing; }

    const context = new NavigationTargetsContext(PanelAccordionState.current());
    this.#contexts.set(nuxtApp, context);
    return context;
  }
}

class UseNavigationTargetsOperation {
  static run() {
    const context = NavigationTargetsRegistry.resolve(useNuxtApp());
    if (VueModule.getCurrentScope() !== undefined) {
      VueModule.onScopeDispose(context.cancelPendingNavigation);
    }
    return context.use();
  }
}

export const useNavigationTargets = UseNavigationTargetsOperation.run;
