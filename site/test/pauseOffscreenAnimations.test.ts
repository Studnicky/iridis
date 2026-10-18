import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRenderer, createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { usePauseOffscreenAnimations } from '../app/composables/usePauseOffscreenAnimations.ts';

class HostNode {
  readonly children: HostNode[] = [];
  parent: HostElement | null = null;
  text: string;

  constructor(text = '') {
    this.text = text;
  }
}

class HostElement extends HostNode {
  readonly tag: string;

  constructor(tag: string) {
    super();
    this.tag = tag;
  }
}

class HostOperations {
  static createComment(): HostNode {return new HostNode();}
  static createElement(tag: string): HostElement {return new HostElement(tag);}
  static createText(text: string): HostNode {return new HostNode(text);}

  static insert(child: HostNode, parent: HostElement, anchor: HostNode | null): void {
    child.parent = parent;
    const anchorIndex = anchor === null ? -1 : parent.children.indexOf(anchor);
    if (anchorIndex === -1) {parent.children.push(child);} else {parent.children.splice(anchorIndex, 0, child);}
  }

  static insertStaticContent(content: string, parent: HostElement, anchor: HostNode | null): [HostNode, HostNode] {
    const node = new HostNode(content);
    HostOperations.insert(node, parent, anchor);
    return [node, node];
  }

  static nextSibling(node: HostNode): HostNode | null {
    if (node.parent === null) {return null;}
    const index = node.parent.children.indexOf(node);
    const sibling = node.parent.children.at(index + 1) ?? null;
    return sibling;
  }

  static parentNode(node: HostNode): HostElement | null {
    const parent = node.parent;
    if (parent === null) {return null;}
    return parent;
  }
  static patchProp(): void {}

  static remove(child: HostNode): void {
    if (child.parent === null) {return;}
    const index = child.parent.children.indexOf(child);
    if (index !== -1) {child.parent.children.splice(index, 1);}
    child.parent = null;
  }

  static setElementText(element: HostElement, text: string): void {element.text = text;}
  static setScopeId(): void {}
  static setText(node: HostNode, text: string): void {node.text = text;}
}

const renderer = createRenderer<HostNode, HostElement>({
  'createComment':       HostOperations.createComment,
  'createElement':       HostOperations.createElement,
  'createText':          HostOperations.createText,
  'insert':              HostOperations.insert,
  'insertStaticContent': HostOperations.insertStaticContent,
  'nextSibling':         HostOperations.nextSibling,
  'parentNode':          HostOperations.parentNode,
  'patchProp':           HostOperations.patchProp,
  'remove':              HostOperations.remove,
  'setElementText':      HostOperations.setElementText,
  'setScopeId':          HostOperations.setScopeId,
  'setText':             HostOperations.setText
});

class AnimationClassList {
  readonly #names = new Set<string>();

  contains(name: string): boolean {
    if (name.length === 0) {throw new TypeError('Class names must be non-empty');}
    const containsName = this.#names.has(name);
    return containsName;
  }

  remove(...names: string[]): void {
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      if (name !== undefined) {this.#names.delete(name);}
    }
  }

  toggle(name: string, ...requestedStates: unknown[]): boolean {
    const requestedState = requestedStates.at(0);
    if (requestedState !== undefined && typeof requestedState !== 'boolean') {throw new TypeError('Class state must be boolean');}
    const next = requestedState ?? !this.#names.has(name);
    if (next) {this.#names.add(name);} else {this.#names.delete(name);}
    return next;
  }
}

class AnimationElement {
  readonly classList = new AnimationClassList();
}

class AnimationDocument {
  readonly body = new AnimationElement();
  readonly documentElement = new AnimationElement();
  readonly hosts: AnimationElement[] = [];
  readonly #visibilityListeners = new Set<() => void>();
  hidden = false;
  lastSelector = '';

  addEventListener(eventName: string, listener: () => void): void {
    if (eventName === 'visibilitychange') {this.#visibilityListeners.add(listener);}
  }

  dispatchVisibilityChange(): void {
    for (const listener of this.#visibilityListeners) {listener();}
  }

  listenerCount(): number {return this.#visibilityListeners.size;}

  querySelectorAll(selector: string): AnimationElement[] {
    this.lastSelector = selector;
    return this.hosts;
  }

  removeEventListener(eventName: string, listener: () => void): void {
    if (eventName === 'visibilitychange') {this.#visibilityListeners.delete(listener);}
  }
}

class AnimationFrameQueue {
  readonly #callbacks = new Map<number, FrameRequestCallback>();
  readonly cancelledIds: number[] = [];
  #nextId = 1;

  cancel(frameId: number): void {
    this.cancelledIds.push(frameId);
    this.#callbacks.delete(frameId);
  }

  flushNext(): number {
    const nextEntry = this.#callbacks.entries().next();
    if (nextEntry.done === true) {throw new Error('No animation frame is pending');}
    const [frameId, callback] = nextEntry.value;
    this.#callbacks.delete(frameId);
    callback(0);
    const completedFrameId = frameId;
    return completedFrameId;
  }

  pendingCount(): number {return this.#callbacks.size;}

  request(callback: FrameRequestCallback): number {
    const frameId = this.#nextId;
    this.#nextId += 1;
    this.#callbacks.set(frameId, callback);
    return frameId;
  }
}

class AnimationWindow {
  readonly #frames: AnimationFrameQueue;

  constructor(frames: AnimationFrameQueue) {
    this.#frames = frames;
  }

  cancelAnimationFrame(frameId: number): void {this.#frames.cancel(frameId);}
  requestAnimationFrame(callback: FrameRequestCallback): number {
    if (typeof callback !== 'function') {throw new TypeError('Animation frame callbacks must be functions');}
    const frameId = this.#frames.request(callback);
    return frameId;
  }
}

class AnimationIntersectionEntry {
  readonly #isIntersecting: () => boolean;
  readonly target: AnimationElement;

  private constructor(target: AnimationElement, isIntersecting: () => boolean) {
    this.#isIntersecting = isIntersecting;
    this.target = target;
  }

  static offscreen(target: AnimationElement): AnimationIntersectionEntry {
    const entry = new AnimationIntersectionEntry(target, () => {return false;});
    return entry;
  }

  static onscreen(target: AnimationElement): AnimationIntersectionEntry {
    const entry = new AnimationIntersectionEntry(target, () => {return true;});
    return entry;
  }

  get isIntersecting(): boolean {
    const isIntersecting = this.#isIntersecting();
    return isIntersecting;
  }

}

class IntersectionObserverRecorder {
  static readonly state: { readonly 'instances': IntersectionObserverRecorder[] } = { 'instances': [] };
  readonly observedHosts: AnimationElement[] = [];
  readonly options: { readonly 'rootMargin'?: string };
  readonly #callback: (entries: AnimationIntersectionEntry[]) => void;
  disconnected = false;

  private constructor(callback: (entries: AnimationIntersectionEntry[]) => void, options: { readonly 'rootMargin'?: string } = {}) {
    this.#callback = callback;
    this.options = options;
  }

  static create(callback: (entries: AnimationIntersectionEntry[]) => void, options: { readonly 'rootMargin'?: string } = {}): IntersectionObserverRecorder {
    const observer = new IntersectionObserverRecorder(callback, options);
    IntersectionObserverRecorder.state.instances.push(observer);
    return observer;
  }

  static reset(): void {IntersectionObserverRecorder.state.instances.length = 0;}

  disconnect(): void {this.disconnected = true;}

  emitOffscreen(target: AnimationElement): void {
    const entry = AnimationIntersectionEntry.offscreen(target);
    this.#callback([entry]);
  }

  emitOnscreen(target: AnimationElement): void {
    const entry = AnimationIntersectionEntry.onscreen(target);
    this.#callback([entry]);
  }

  observe(target: AnimationElement): void {this.observedHosts.push(target);}
}

class IntersectionObserverConstructor {
  constructor(callback: (entries: AnimationIntersectionEntry[]) => void, options: { readonly 'rootMargin'?: string } = {}) {
    if (typeof callback !== 'function') {throw new TypeError('Intersection observer callback must be a function');}
    const rootMargin = options.rootMargin;
    const normalizedOptions = rootMargin === undefined ? {} : { 'rootMargin': rootMargin };
    const observer = IntersectionObserverRecorder.create(callback, normalizedOptions);
    return observer;
  }
}

class MutationObserverRecorder {
  static readonly state: { readonly 'instances': MutationObserverRecorder[] } = { 'instances': [] };
  readonly #callback: () => void;
  disconnected = false;
  observedOptions: MutationObserverInit | undefined;
  observedTarget: AnimationElement | null = null;

  private constructor(callback: () => void) {this.#callback = callback;}

  static create(callback: () => void): MutationObserverRecorder {
    const observer = new MutationObserverRecorder(callback);
    MutationObserverRecorder.state.instances.push(observer);
    return observer;
  }

  static reset(): void {MutationObserverRecorder.state.instances.length = 0;}

  disconnect(): void {this.disconnected = true;}

  observe(target: AnimationElement, options: MutationObserverInit): void {
    this.observedOptions = options;
    this.observedTarget = target;
  }

  trigger(): void {this.#callback();}
}

class MutationObserverConstructor {
  constructor(callback: () => void) {
    if (typeof callback !== 'function') {throw new TypeError('Mutation observer callback must be a function');}
    const observer = MutationObserverRecorder.create(callback);
    return observer;
  }
}

class LifecycleHarness {
  static readonly state: { 'operation': (() => void) | undefined } = { 'operation': undefined };

  static mount() {
    const app = renderer.createApp({ 'render': LifecycleHarness.render, 'setup': LifecycleHarness.setup });
    app.mount(new HostElement('root'));
    return app;
  }

  static render() {
    const properties = { 'data-test': 'pause-offscreen-animations-harness' };
    const node = h('div', properties);
    return node;
  }

  static setup(): void {
    const operation = LifecycleHarness.state.operation;
    if (operation === undefined) {throw new Error('Lifecycle operation is not registered');}
    operation();
  }
}

class BrowserFixture {
  readonly document = new AnimationDocument();
  readonly frames = new AnimationFrameQueue();
  readonly window = new AnimationWindow(this.frames);

  installObservers(): void {
    IntersectionObserverRecorder.reset();
    MutationObserverRecorder.reset();
    Reflect.set(globalThis, 'document', this.document);
    Reflect.set(globalThis, 'window', this.window);
    Reflect.set(globalThis, 'IntersectionObserver', IntersectionObserverConstructor);
    Reflect.set(globalThis, 'MutationObserver', MutationObserverConstructor);
  }

  installWithoutObservers(): void {
    IntersectionObserverRecorder.reset();
    MutationObserverRecorder.reset();
    Reflect.set(globalThis, 'document', this.document);
    Reflect.set(globalThis, 'window', this.window);
    Reflect.set(globalThis, 'IntersectionObserver', undefined);
    Reflect.set(globalThis, 'MutationObserver', undefined);
  }

  mount() {
    LifecycleHarness.state.operation = usePauseOffscreenAnimations;
    const app = LifecycleHarness.mount();
    return app;
  }
}

await test('usePauseOffscreenAnimations performs no browser work during SSR', async () => {
  Reflect.set(globalThis, 'document', undefined);
  Reflect.set(globalThis, 'window', undefined);
  Reflect.set(globalThis, 'IntersectionObserver', undefined);
  Reflect.set(globalThis, 'MutationObserver', undefined);

  const app = createSSRApp({
    'render': LifecycleHarness.render,
    'setup': usePauseOffscreenAnimations
  });

  assert.equal(await renderToString(app), '<div data-test="pause-offscreen-animations-harness"></div>');
  assert.equal(IntersectionObserverRecorder.state.instances.length, 0);
  assert.equal(MutationObserverRecorder.state.instances.length, 0);
});

await test('mount synchronizes visibility and observes offscreen animation hosts', () => {
  const fixture = new BrowserFixture();
  const firstHost = new AnimationElement();
  const secondHost = new AnimationElement();
  fixture.document.hosts.push(firstHost, secondHost);
  fixture.document.hidden = true;
  fixture.installObservers();

  const app = fixture.mount();
  assert.equal(fixture.document.listenerCount(), 1);
  assert.equal(fixture.document.documentElement.classList.contains('anims-paused'), true);

  fixture.document.hidden = false;
  fixture.document.dispatchVisibilityChange();
  assert.equal(fixture.document.documentElement.classList.contains('anims-paused'), false);
  assert.equal(fixture.frames.pendingCount(), 1);
  fixture.frames.flushNext();

  assert.equal(fixture.document.lastSelector, '.toc-scroll-target, .pulse, .orbit-rig, .sonar-ring, .radar-sweep, .chroma-cycle');
  assert.equal(IntersectionObserverRecorder.state.instances.length, 1);
  assert.equal(MutationObserverRecorder.state.instances.length, 1);
  const intersectionObserver = IntersectionObserverRecorder.state.instances[0];
  const mutationObserver = MutationObserverRecorder.state.instances[0];
  if (intersectionObserver === undefined || mutationObserver === undefined) {throw new Error('Observers did not start');}
  assert.equal(intersectionObserver.options.rootMargin, '300px');
  assert.deepEqual(intersectionObserver.observedHosts, [firstHost, secondHost]);
  assert.equal(mutationObserver.observedTarget, fixture.document.body);
  assert.deepEqual(mutationObserver.observedOptions, { 'childList': true, 'subtree': true });

  intersectionObserver.emitOffscreen(firstHost);
  assert.equal(firstHost.classList.contains('anim-offscreen'), true);
  intersectionObserver.emitOnscreen(firstHost);
  assert.equal(firstHost.classList.contains('anim-offscreen'), false);
  app.unmount();
});

await test('mutation bursts coalesce into one frame and observe each new host once', () => {
  const fixture = new BrowserFixture();
  const firstHost = new AnimationElement();
  fixture.document.hosts.push(firstHost);
  fixture.installObservers();
  const app = fixture.mount();
  fixture.frames.flushNext();

  const intersectionObserver = IntersectionObserverRecorder.state.instances[0];
  const mutationObserver = MutationObserverRecorder.state.instances[0];
  if (intersectionObserver === undefined || mutationObserver === undefined) {throw new Error('Observers did not start');}
  const addedHost = new AnimationElement();
  fixture.document.hosts.push(addedHost);
  mutationObserver.trigger();
  mutationObserver.trigger();
  assert.equal(fixture.frames.pendingCount(), 1);
  fixture.frames.flushNext();
  assert.deepEqual(intersectionObserver.observedHosts, [firstHost, addedHost]);

  mutationObserver.trigger();
  fixture.frames.flushNext();
  assert.deepEqual(intersectionObserver.observedHosts, [firstHost, addedHost]);
  app.unmount();
});

await test('missing observer APIs preserve visibility pausing', () => {
  const fixture = new BrowserFixture();
  fixture.document.hidden = true;
  fixture.installWithoutObservers();
  const app = fixture.mount();

  assert.equal(fixture.document.documentElement.classList.contains('anims-paused'), true);
  assert.equal(fixture.document.listenerCount(), 1);
  assert.equal(fixture.frames.pendingCount(), 0);
  assert.equal(IntersectionObserverRecorder.state.instances.length, 0);
  assert.equal(MutationObserverRecorder.state.instances.length, 0);

  app.unmount();
  assert.equal(fixture.document.listenerCount(), 0);
  assert.equal(fixture.document.documentElement.classList.contains('anims-paused'), false);
});

await test('unmount disconnects observers, cancels frames, clears classes, and deactivates queued callbacks', () => {
  const fixture = new BrowserFixture();
  const host = new AnimationElement();
  fixture.document.hosts.push(host);
  fixture.installObservers();
  const app = fixture.mount();
  fixture.frames.flushNext();

  const intersectionObserver = IntersectionObserverRecorder.state.instances[0];
  const mutationObserver = MutationObserverRecorder.state.instances[0];
  if (intersectionObserver === undefined || mutationObserver === undefined) {throw new Error('Observers did not start');}
  intersectionObserver.emitOffscreen(host);
  fixture.document.hidden = true;
  fixture.document.dispatchVisibilityChange();
  mutationObserver.trigger();
  assert.equal(fixture.frames.pendingCount(), 1);

  app.unmount();
  assert.equal(intersectionObserver.disconnected, true);
  assert.equal(mutationObserver.disconnected, true);
  assert.equal(fixture.frames.pendingCount(), 0);
  assert.equal(fixture.frames.cancelledIds.length, 1);
  assert.equal(fixture.document.listenerCount(), 0);
  assert.equal(fixture.document.documentElement.classList.contains('anims-paused'), false);
  assert.equal(host.classList.contains('anim-offscreen'), false);

  mutationObserver.trigger();
  assert.equal(fixture.frames.pendingCount(), 0);
});
