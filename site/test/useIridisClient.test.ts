import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import 'vue';

register('./fixtures/NuxtImportsLoader.mjs', import.meta.url);

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
  add(...names: string[]): void {for (const name of names) {this.#names.add(name);}}
  remove(...names: string[]): void {for (const name of names) {this.#names.delete(name);}}

  toggle(name: string, enabled?: boolean): boolean {
    const next = enabled ?? !this.#names.has(name);
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

  const { useIridis } = await import('../app/composables/useIridis.ts');
  const state = useIridis();
  const deadline = Date.now() + 4_000;
  while (state.uploadedImages.value.length === 0 && state.error.value === null && Date.now() < deadline) {
    await setTimeout(10);
  }

  assert.equal(state.error.value, null);
  assert.equal(state.uploadedImages.value.length, 1);
  assert.equal(state.uploadedImages.value[0]?.name, 'Sample');
  assert.equal(state.running.value, false);
  assert.ok(cssVariables.size > 0);
  assert.equal(classNames.has('dark'), true);

  useIridis();
  await setTimeout(20);
  assert.equal(state.uploadedImages.value.length, 1);
});
