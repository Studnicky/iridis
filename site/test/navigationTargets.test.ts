import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
import * as VueModule from 'vue';

register('./fixtures/NuxtImportsLoader.mjs', import.meta.url);

const NavigationTestModules = Object.freeze({
  'resetAccordion': (await import('../app/composables/__resetPanelAccordionForTests.ts')).__resetPanelAccordionForTests,
  'useAccordion': (await import('../app/composables/usePanelAccordion.ts')).usePanelAccordion,
  'useNavigation': (await import('../app/composables/useNavigationTargets.ts')).useNavigationTargets
});
const TEST_NUXT_APP = Symbol.for('iridis.test.nuxt-app');

class ScrollRecorder {
  static readonly identifiers: string[] = [];

  static reset(): void {ScrollRecorder.identifiers.length = 0;}
  static record(identifier: string): void {ScrollRecorder.identifiers.push(identifier);}
}

class ScrollTarget {
  readonly #identifier: string;

  constructor(identifier: string) {this.#identifier = identifier;}
  scrollIntoView(): void {ScrollRecorder.record(this.#identifier);}
}

class NavigationDocument {
  static getElementById(identifier: string): ScrollTarget {return new ScrollTarget(identifier);}
}

class SelectionRecorder {
  static readonly indices: number[] = [];

  static reset(): void {SelectionRecorder.indices.length = 0;}
  static record(index: number): void {SelectionRecorder.indices.push(index);}
}

class AnimationFrameQueue {
  static readonly callbacks = new Map<number, FrameRequestCallback>();
  static #nextIdentifier = 1;

  static cancel(identifier: number): void {AnimationFrameQueue.callbacks.delete(identifier);}

  static flush(): void {
    const callbacks = [...AnimationFrameQueue.callbacks.values()];
    AnimationFrameQueue.callbacks.clear();
    for (const callback of callbacks) {callback(0);}
  }

  static request(callback: FrameRequestCallback): number {
    const identifier = AnimationFrameQueue.#nextIdentifier;
    AnimationFrameQueue.#nextIdentifier += 1;
    AnimationFrameQueue.callbacks.set(identifier, callback);
    return identifier;
  }

  static reset(): void {
    AnimationFrameQueue.callbacks.clear();
    AnimationFrameQueue.#nextIdentifier = 1;
  }
}

class NavigationTestEnvironment {
  static install(): void {
    AnimationFrameQueue.reset();
    ScrollRecorder.reset();
    SelectionRecorder.reset();
    Reflect.set(globalThis, 'document', NavigationDocument);
    Reflect.set(globalThis, 'window', {
      'cancelAnimationFrame': AnimationFrameQueue.cancel,
      'requestAnimationFrame': AnimationFrameQueue.request
    });
  }

  static reset(): void {
    AnimationFrameQueue.reset();
    Reflect.deleteProperty(globalThis, 'document');
    Reflect.deleteProperty(globalThis, 'window');
  }
}

await test('document navigation scrolls after Vue commits and the browser reaches the next layout frame', async (context) => {
  NavigationTestModules.resetAccordion();
  NavigationTestEnvironment.install();
  const scope = VueModule.effectScope();
  context.after(() => {scope.stop(); NavigationTestEnvironment.reset();});
  const navigation = scope.run(NavigationTestModules.useNavigation);
  if (navigation === undefined) {throw new Error('Navigation scope must be active');}
  const firstPath = '/guide/getting-started';
  const secondPath = '/guide/outputs';
  const firstAnchorIdentifier = 'guide-getting-started';
  const secondAnchorIdentifier = 'guide-outputs';
  const firstPanelIdentifier = 'doc-/guide/getting-started';
  const secondPanelIdentifier = 'doc-/guide/outputs';
  navigation.registerDocumentTargets([
    { 'path': firstPath, 'title': 'Getting started' },
    { 'path': secondPath, 'title': 'Outputs' }
  ]);

  navigation.activateTarget(firstAnchorIdentifier);
  assert.equal(NavigationTestModules.useAccordion(firstPanelIdentifier).isOpen.value, true);
  assert.deepEqual(ScrollRecorder.identifiers, []);
  assert.equal(AnimationFrameQueue.callbacks.size, 0);

  await VueModule.nextTick();
  assert.deepEqual(ScrollRecorder.identifiers, []);
  assert.equal(AnimationFrameQueue.callbacks.size, 1);
  AnimationFrameQueue.flush();
  assert.deepEqual(ScrollRecorder.identifiers, [firstAnchorIdentifier]);

  navigation.activateTarget(secondAnchorIdentifier);
  assert.equal(NavigationTestModules.useAccordion(firstPanelIdentifier).isOpen.value, false);
  assert.equal(NavigationTestModules.useAccordion(secondPanelIdentifier).isOpen.value, true);
  assert.deepEqual(ScrollRecorder.identifiers, [firstAnchorIdentifier]);

  await VueModule.nextTick();
  assert.equal(AnimationFrameQueue.callbacks.size, 1);
  AnimationFrameQueue.flush();
  assert.deepEqual(ScrollRecorder.identifiers, [firstAnchorIdentifier, secondAnchorIdentifier]);
});

await test('rapid document navigation scrolls only the latest committed target', async (context) => {
  NavigationTestModules.resetAccordion();
  NavigationTestEnvironment.install();
  const scope = VueModule.effectScope();
  context.after(() => {scope.stop(); NavigationTestEnvironment.reset();});
  const navigation = scope.run(NavigationTestModules.useNavigation);
  if (navigation === undefined) {throw new Error('Navigation scope must be active');}
  navigation.registerDocumentTargets([
    { 'path': '/guide/first', 'title': 'First' },
    { 'path': '/guide/latest', 'title': 'Latest' }
  ]);

  navigation.activateTarget('guide-first');
  navigation.activateTarget('guide-latest');
  assert.equal(NavigationTestModules.useAccordion('doc-/guide/first').isOpen.value, false);
  assert.equal(NavigationTestModules.useAccordion('doc-/guide/latest').isOpen.value, true);

  await VueModule.nextTick();
  assert.equal(AnimationFrameQueue.callbacks.size, 1);
  AnimationFrameQueue.flush();
  assert.deepEqual(ScrollRecorder.identifiers, ['guide-latest']);
});

await test('disposing the navigation scope cancels committed and uncommitted document scrolls', async (context) => {
  NavigationTestModules.resetAccordion();
  NavigationTestEnvironment.install();
  context.after(NavigationTestEnvironment.reset);

  const uncommittedScope = VueModule.effectScope();
  const uncommittedNavigation = uncommittedScope.run(NavigationTestModules.useNavigation);
  if (uncommittedNavigation === undefined) {throw new Error('Navigation scope must be active');}
  uncommittedNavigation.registerDocumentTargets([{ 'path': '/guide/uncommitted', 'title': 'Uncommitted' }]);
  uncommittedNavigation.activateTarget('guide-uncommitted');
  uncommittedScope.stop();
  await VueModule.nextTick();
  assert.equal(AnimationFrameQueue.callbacks.size, 0);

  const committedScope = VueModule.effectScope();
  const committedNavigation = committedScope.run(NavigationTestModules.useNavigation);
  if (committedNavigation === undefined) {throw new Error('Navigation scope must be active');}
  committedNavigation.registerDocumentTargets([{ 'path': '/guide/committed', 'title': 'Committed' }]);
  committedNavigation.activateTarget('guide-committed');
  await VueModule.nextTick();
  assert.equal(AnimationFrameQueue.callbacks.size, 1);
  committedScope.stop();
  assert.equal(AnimationFrameQueue.callbacks.size, 0);
  AnimationFrameQueue.flush();
  assert.deepEqual(ScrollRecorder.identifiers, []);
});

await test('card navigation selects the card in its stage before scrolling the stage', (context) => {
  NavigationTestEnvironment.install();
  const scope = VueModule.effectScope();
  context.after(() => {scope.stop(); NavigationTestEnvironment.reset();});
  const navigation = scope.run(NavigationTestModules.useNavigation);
  if (navigation === undefined) {throw new Error('Navigation scope must be active');}
  const card = navigation.cardTargets[0];
  if (card?.stage === undefined) {throw new Error('Static navigation registry must contain a staged card');}
  navigation.registerStageIndexSetter(card.stage, SelectionRecorder.record);
  navigation.activateTarget(card.id);

  assert.deepEqual(SelectionRecorder.indices, [0]);
  assert.deepEqual(ScrollRecorder.identifiers, [card.stage]);
});

await test('direct stage navigation cancels a pending document scroll and remains immediate', async (context) => {
  NavigationTestEnvironment.install();
  const scope = VueModule.effectScope();
  context.after(() => {scope.stop(); NavigationTestEnvironment.reset();});
  const navigation = scope.run(NavigationTestModules.useNavigation);
  if (navigation === undefined) {throw new Error('Navigation scope must be active');}
  navigation.registerDocumentTargets([{ 'path': '/guide/pending', 'title': 'Pending' }]);
  const stage = navigation.stageTargets[0];
  if (stage === undefined) {throw new Error('Static navigation registry must contain a stage');}

  navigation.activateTarget('guide-pending');
  navigation.activateTarget(stage.id);
  assert.deepEqual(ScrollRecorder.identifiers, [stage.id]);

  await VueModule.nextTick();
  AnimationFrameQueue.flush();
  assert.deepEqual(ScrollRecorder.identifiers, [stage.id]);
});

await test('navigation registrations are shared within one app and isolated between SSR requests', (context) => {
  const firstNuxtApp = {};
  const secondNuxtApp = {};
  context.after(() => { Reflect.deleteProperty(globalThis, TEST_NUXT_APP); });

  Reflect.set(globalThis, TEST_NUXT_APP, firstNuxtApp);
  const firstNavigation = NavigationTestModules.useNavigation();
  const firstSelections: number[] = [];
  const card = firstNavigation.cardTargets[0];
  if (card?.stage === undefined) { throw new Error('Static navigation registry must contain a staged card'); }
  firstNavigation.registerStageIndexSetter(card.stage, (index) => { firstSelections.push(index); });

  const firstNavigationAgain = NavigationTestModules.useNavigation();
  firstNavigationAgain.activateTarget(card.id);
  assert.deepEqual(firstSelections, [0]);

  Reflect.set(globalThis, TEST_NUXT_APP, secondNuxtApp);
  const secondNavigation = NavigationTestModules.useNavigation();
  secondNavigation.activateTarget(card.id);
  assert.deepEqual(firstSelections, [0]);
});
