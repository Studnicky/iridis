import * as VueModule from 'vue';

import { useNuxtApp } from '#imports';

import { documentPanelId } from './documentPanelId.ts';
import { PanelAccordionState } from './panelAccordionState.ts';
import { sanitizeDocumentAnchorId } from './sanitizeDocumentAnchorId.ts';
import { STAGE_GROUPS } from './stageGroups.ts';
import { NavigationTargetInterfaceType } from './types/navigationTargetInterfaceType.ts';

const cardTargets: readonly NavigationTargetInterfaceType[] = STAGE_GROUPS.flatMap((group) => {
  const result = group.items.map((item) => {
    const result = NavigationTargetInterfaceType.card(item.key, item.label, group.name);
    return result;
  });
  return result;
});

const stageTargets: readonly NavigationTargetInterfaceType[] = STAGE_GROUPS.map((group) => {
  const result = NavigationTargetInterfaceType.stage(group.name, group.label);
  return result;
});

class CardIndexOperation {
  static run(id: string): number {
    let result = -1;
    for (let groupIndex = 0; groupIndex < STAGE_GROUPS.length; groupIndex += 1) {
      const group = STAGE_GROUPS[groupIndex]!;
      result = group.items.findIndex((item) => {
        const matchesId = item.key === id;
        return matchesId;
      });
      if (result !== -1) { break; }
    }
    return result;
  }
}

/** Mutable navigation coordination owned by one Nuxt app/request. */
class NavigationTargetsContext {
  readonly #accordionState: PanelAccordionState;
  readonly #documentTargets = VueModule.shallowRef<readonly NavigationTargetInterfaceType[]>([]);
  readonly #stageIndexSetters = new Map<string, (index: number) => void>();
  readonly #targets = VueModule.computed<readonly NavigationTargetInterfaceType[]>(() => {
    const result = [...cardTargets, ...stageTargets, ...this.#documentTargets.value];
    return result;
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
    const target = this.#targets.value.find((candidate) => {
      const result = candidate.id === id;
      return result;
    });
    if (target === undefined) { return; }

    const requestIdentifier = this.#beginNavigation();
    if (target.isCard() && target.stage !== undefined) {
      this.#stageIndexSetters.get(target.stage)?.(CardIndexOperation.run(target.id));
      this.#scrollToId(target.stage);
      return;
    }

    if (target.isDocument() && target.panelId !== undefined) {
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
      const result = NavigationTargetInterfaceType.document(
        sanitizeDocumentAnchorId(documentEntry.path),
        documentEntry.title ?? documentEntry.path,
        documentPanelId(documentEntry.path)
      );
      return result;
    });
  };

  readonly registerStageIndexSetter = (stage: string, setter: (index: number) => void): void => {
    this.#stageIndexSetters.set(stage, setter);
  };

  use() {
    const result = {
      'activateTarget': this.activateTarget,
      'cardTargets': cardTargets,
      'registerDocumentTargets': this.registerDocumentTargets,
      'registerStageIndexSetter': this.registerStageIndexSetter,
      'stageTargets': stageTargets
    };
    return result;
  }

  #beginNavigation(): number {
    this.cancelPendingNavigation();
    const result = this.#navigationRequestIdentifier;
    return result;
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
    // Animated scrolling is a vestibular trigger. `scroll-behavior: smooth`
    // in main.css is overridden for reduced motion, but an explicit
    // `behavior` here would win over the stylesheet, so resolve it too.
    const prefersReducedMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({
      'behavior': prefersReducedMotion ? 'auto' : 'smooth',
      'block':    'start',
      'inline':   'nearest'
    });
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
    const result = context.use();
    return result;
  }
}

export const useNavigationTargets = UseNavigationTargetsOperation.run;
