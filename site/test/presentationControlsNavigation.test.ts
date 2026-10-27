import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);

class ScrollCapture {
  public static readonly behaviors: (string | undefined)[] = [];

  public static install(matchMedia: () => object): void {
    ScrollCapture.behaviors.length = 0;
    Reflect.set(globalThis, 'document', {
      'getElementById': (): object => {
        const target = {
          'scrollIntoView': (options: { readonly 'behavior'?: string }): void => {
            ScrollCapture.behaviors.push(options.behavior);
          }
        };
        return target;
      }
    });
    Reflect.set(globalThis, 'window', { 'matchMedia': matchMedia });
  }

  public static reset(): void {
    Reflect.set(globalThis, 'document', void 0);
    Reflect.set(globalThis, 'window', void 0);
    Reflect.set(globalThis, 'iridisTestNuxtApp', void 0);
  }

  public static reducedMotion(): object {
    const query = { 'matches': true };
    return query;
  }

  public static fullMotion(): object {
    const query = { 'matches': false };
    return query;
  }
}

await test('navigation scrolls instantly when the visitor prefers reduced motion', async (context) => {
  const { useNavigationTargets } = await import('../app/composables/useNavigationTargets.ts');
  context.after(ScrollCapture.reset);
  ScrollCapture.install(ScrollCapture.reducedMotion);
  Reflect.set(globalThis, 'iridisTestNuxtApp', {});
  useNavigationTargets().activateTarget('upload');
  assert.deepEqual(ScrollCapture.behaviors, ['auto']);
});

await test('navigation scrolls smoothly when motion is allowed', async (context) => {
  const { useNavigationTargets } = await import('../app/composables/useNavigationTargets.ts');
  context.after(ScrollCapture.reset);
  ScrollCapture.install(ScrollCapture.fullMotion);
  Reflect.set(globalThis, 'iridisTestNuxtApp', {});
  useNavigationTargets().activateTarget('upload');
  assert.deepEqual(ScrollCapture.behaviors, ['smooth']);
});

await test('activating a target records it in the presentation read model without touching theme or sort state', async (context) => {
  const { useNavigationTargets } = await import('../app/composables/useNavigationTargets.ts');
  const { usePresentationControls } = await import('../app/composables/usePresentationControls.ts');
  context.after(ScrollCapture.reset);
  ScrollCapture.install(ScrollCapture.fullMotion);
  Reflect.set(globalThis, 'iridisTestNuxtApp', {});
  const navigation = useNavigationTargets();
  const controls = usePresentationControls();
  navigation.activateTarget('upload');
  await new Promise<void>((resolve) => { setImmediate(resolve); });
  assert.deepEqual(controls.readModel.value.navigationTarget, { 'targetId': 'upload' });
  assert.equal(controls.readModel.value.themeKey, 'futuristic');
  assert.equal(controls.readModel.value.roleSortKeys.length, 2);
});
