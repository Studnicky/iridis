import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { watch } from 'vue';

import type { WorkerReplyEntity } from '../app/composables/entities/WorkerReplyEntity.ts';
import type { EngineWorkerScopeInterface } from '../app/composables/interfaces/EngineWorkerScopeInterface.ts';

import { EngineWorkerHost } from '../app/workers/EngineWorkerHost.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);

class FakeScope implements EngineWorkerScopeInterface {
  readonly #listeners: ((event: MessageEvent<unknown>) => void)[] = [];
  readonly #replyTo: (reply: WorkerReplyEntity.Type) => void;

  constructor(replyTo: (reply: WorkerReplyEntity.Type) => void) {this.#replyTo = replyTo;}

  addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void {
    this.#listeners.push(listener);
  }

  deliver(data: unknown): void {
    const event = new MessageEvent('message', { 'data': data, 'origin': '' });
    this.#listeners.forEach((listener) => {listener(event);});
  }

  postMessage(reply: WorkerReplyEntity.Type): void {
    this.#replyTo(reply);
  }
}

class FakeWorker {
  static readonly instances = new Set<number>();
  static readonly transferred: ArrayBuffer[] = [];
  terminated = false;
  readonly #messageListeners: ((event: { readonly 'data': unknown }) => void)[] = [];
  readonly #scope: FakeScope;

  constructor() {
    FakeWorker.instances.add(FakeWorker.instances.size);
    this.#scope = new FakeScope((reply) => {
      const cloned = structuredClone(reply);
      queueMicrotask(() => {this.#messageListeners.forEach((listener) => {listener({ 'data': cloned });});});
    });
    EngineWorkerHost.start(this.#scope);
  }

  addEventListener(type: string, listener: (event: { readonly 'data': unknown }) => void): void {
    if (type === 'message') {this.#messageListeners.push(listener);}
  }

  postMessage(data: unknown, transfer: Transferable[] = []): void {
    const message = structuredClone(data, { 'transfer': transfer });
    if (message instanceof ArrayBuffer) {FakeWorker.transferred.push(message);}
    queueMicrotask(() => {this.#scope.deliver(message);});
  }

  terminate(): void {this.terminated = true;}
}

class FakeImage {
  crossOrigin = '';
  naturalHeight = 2;
  naturalWidth = 2;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;

  constructor() {
    queueMicrotask(() => {this.onload?.();});
  }
}

class FakeClassList {
  readonly #names: Set<string>;

  constructor(names: Set<string>) {this.#names = names;}
  add(...names: string[]): void {
    for (let index = 0; index < names.length; index += 1) {this.#names.add(names[index]!);}
  }

  remove(...names: string[]): void {
    for (let index = 0; index < names.length; index += 1) {this.#names.delete(names[index]!);}
  }

  toggle(name: string): boolean {
    const next = !this.#names.has(name);
    if (next) {this.#names.add(name);} else {this.#names.delete(name);}
    return next;
  }
}

class FakeStyle {
  readonly #variables: Map<string, string>;

  constructor(variables: Map<string, string>) {this.#variables = variables;}
  setProperty(name: string, value: string): void {this.#variables.set(name, value);}
}

class FakeCanvasContext {
  drawImage(): void {}

  getImageData(): { readonly 'data': Uint8ClampedArray } {
    return { 'data': new Uint8ClampedArray([94, 53, 177, 255, 255, 255, 255, 255, 0, 0, 0, 255, 94, 53, 177, 255]) };
  }
}

class FakeCanvas {
  height = 0;
  width = 0;

  getContext(): FakeCanvasContext {return new FakeCanvasContext();}
}

class FakeDocument {
  readonly documentElement;

  constructor(variables: Map<string, string>, names: Set<string>) {
    this.documentElement = {
      'classList': new FakeClassList(names),
      'dataset':   {},
      'style':     new FakeStyle(variables)
    };
  }

  createElement(tagName: string): FakeCanvas {
    if (tagName !== 'canvas') {throw new TypeError(`Unexpected element request: ${tagName}`);}
    return new FakeCanvas();
  }

  getElementById(identifier: string): null {
    if (identifier.length === 0) {throw new TypeError('Element identifiers must be non-empty');}
    return null;
  }
}

await test('useIridis client boot applies tokens and extracts the sample image once', async () => {
  const cssVariables = new Map<string, string>();
  const classNames = new Set<string>();
  Reflect.set(globalThis, 'window', {});
  Reflect.set(globalThis, 'document', new FakeDocument(cssVariables, classNames));
  Reflect.set(globalThis, 'Image', FakeImage);
  Reflect.set(globalThis, 'Worker', FakeWorker);

  const { useIridis } = await import('../app/composables/useIridis.ts');
  const state = useIridis();
  const deadline = Date.now() + 4_000;
  while ((state.uploadedImages.value.length === 0 || state.roles.value.background === undefined) && state.error.value === null && Date.now() < deadline) {
    await setTimeout(10);
  }

  assert.equal(state.error.value, null);
  assert.equal(state.uploadedImages.value.length, 1);
  assert.equal(state.uploadedImages.value[0]?.name, 'Sample');
  assert.equal(state.running.value, false);
  assert.equal(state.resolving.value, false);
  assert.equal(FakeWorker.instances.size, 1);
  assert.equal(FakeWorker.transferred.length, 1, 'the decoded pixel buffer is transferred to the worker once');
  assert.ok((state.uploadedImages.value[0]?.dominantColorRecords.length ?? 0) > 0, 'the worker extraction result lands on the entry');
  assert.ok(state.histogram.value.length > 0, 'the worker combine result lands on the shared histogram');
  assert.ok(state.candidates.value.length > 0, 'the worker combine candidates land on the shared candidates');
  assert.equal(typeof state.roles.value.background, 'string');
  assert.ok(cssVariables.size > 0);
  assert.equal(classNames.has('dark'), true);

  useIridis();
  await setTimeout(20);
  assert.equal(state.uploadedImages.value.length, 1);
});


class VirtualTimeDrain {
  static readonly microtaskTurnLimit = 5_000;
  static readonly debounceWindowMs = 200;
  static readonly quietRounds = 4;

  static async microtasks(isReady: () => boolean): Promise<void> {
    for (let turn = 0; turn < VirtualTimeDrain.microtaskTurnLimit && !isReady(); turn += 1) {
      await new Promise<void>((resolveTurn) => { queueMicrotask(resolveTurn); });
    }
  }

  static async settle(context: { readonly 'mock': { readonly 'timers': { tick(milliseconds: number): void } } }): Promise<void> {
    for (let round = 0; round < VirtualTimeDrain.quietRounds; round += 1) {
      context.mock.timers.tick(VirtualTimeDrain.debounceWindowMs);
      await VirtualTimeDrain.microtasks(() => {return false;});
    }
  }
}

await test('combine schedules one eventual role resolution after its seed update', async (context) => {
  const cssVariables = new Map<string, string>();
  const classNames = new Set<string>();
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  Reflect.set(globalThis, 'iridisTestNuxtApp', {});
  Reflect.set(globalThis, 'window', {});
  Reflect.set(globalThis, 'document', new FakeDocument(cssVariables, classNames));
  Reflect.set(globalThis, 'Image', FakeImage);
  Reflect.set(globalThis, 'Worker', FakeWorker);

  const { useIridis } = await import('../app/composables/useIridis.ts');
  const state = useIridis();
  const sampleReady = (): boolean => {
    const ready = (state.uploadedImages.value.length === 1 && state.roles.value.background !== undefined) || state.error.value !== null;
    return ready;
  };
  await VirtualTimeDrain.microtasks(sampleReady);
  await VirtualTimeDrain.settle(context);
  assert.equal(state.error.value, null);
  assert.equal(state.uploadedImages.value.length, 1);

  let resolutionCount = 0;
  const stopWatchingRoles = watch(state.roles, () => { resolutionCount += 1; }, { 'flush': 'sync' });
  try {
    await state.addUploadedImages(['/second-sample.png'], ['Second sample']);
    const secondReady = (): boolean => {
      const ready = state.uploadedImages.value.length === 2 || state.error.value !== null;
      return ready;
    };
    await VirtualTimeDrain.microtasks(secondReady);
    assert.equal(state.uploadedImages.value.length, 2);
    assert.equal(resolutionCount, 0, 'combine itself must not resolve roles');

    await VirtualTimeDrain.settle(context);

    assert.equal(state.error.value, null);
    assert.equal(resolutionCount, 1, 'the seed watcher resolves roles exactly once');
  } finally {
    stopWatchingRoles();
  }
});
