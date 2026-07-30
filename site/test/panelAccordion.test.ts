/**
 * Pure-logic coverage for usePanelAccordion — shared open-panel ordering and
 * the max-3 eviction rule.
 */

import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('./fixtures/NuxtImportsLoader.mjs', import.meta.url);

const PanelAccordionTestModules = Object.freeze({
  'reset': (await import('../app/composables/__resetPanelAccordionForTests.ts')).__resetPanelAccordionForTests,
  'use': (await import('../app/composables/usePanelAccordion.ts')).usePanelAccordion
});
const TEST_NUXT_APP = Symbol.for('iridis.test.nuxt-app');

await test('opening panels one at a time up to 3 keeps all 3 open', () => {
  PanelAccordionTestModules.reset();
  const a = PanelAccordionTestModules.use('a');
  const b = PanelAccordionTestModules.use('b');
  const c = PanelAccordionTestModules.use('c');
  a.open();
  b.open();
  c.open();
  assert.equal(a.isOpen.value, true);
  assert.equal(b.isOpen.value, true);
  assert.equal(c.isOpen.value, true);
});

await test('opening a 4th evicts the oldest-opened, leaving exactly 3 open', () => {
  PanelAccordionTestModules.reset();
  const a = PanelAccordionTestModules.use('a');
  const b = PanelAccordionTestModules.use('b');
  const c = PanelAccordionTestModules.use('c');
  const d = PanelAccordionTestModules.use('d');
  a.open();
  b.open();
  c.open();
  d.open();
  assert.equal(a.isOpen.value, false);
  assert.equal(b.isOpen.value, true);
  assert.equal(c.isOpen.value, true);
  assert.equal(d.isOpen.value, true);
});

await test('closing a panel and reopening it places it at the end (most-recent) of the order', () => {
  PanelAccordionTestModules.reset();
  const a = PanelAccordionTestModules.use('a');
  const b = PanelAccordionTestModules.use('b');
  const c = PanelAccordionTestModules.use('c');
  a.open();
  b.open();
  c.open();
  a.close();
  a.open();
  // order is now b, c, a (oldest-first) — opening a 4th should evict b, not a
  const d = PanelAccordionTestModules.use('d');
  d.open();
  assert.equal(b.isOpen.value, false);
  assert.equal(c.isOpen.value, true);
  assert.equal(a.isOpen.value, true);
  assert.equal(d.isOpen.value, true);
});

await test('toggle opens a closed panel and closes an open one', () => {
  PanelAccordionTestModules.reset();
  const a = PanelAccordionTestModules.use('a');
  assert.equal(a.isOpen.value, false);
  a.toggle();
  assert.equal(a.isOpen.value, true);
  a.toggle();
  assert.equal(a.isOpen.value, false);
});

await test('defaultOpen seeds initial state on first construction only', () => {
  PanelAccordionTestModules.reset();
  const a = PanelAccordionTestModules.use('a', { 'defaultOpen': true });
  assert.equal(a.isOpen.value, true);

  a.close();
  // re-invoking the composable for the same id must not re-seed it back open
  const aAgain = PanelAccordionTestModules.use('a', { 'defaultOpen': true });
  assert.equal(aAgain.isOpen.value, false);
});

await test('defaultOpen respects the max-3 rule when several panels seed at once', () => {
  PanelAccordionTestModules.reset();
  const a = PanelAccordionTestModules.use('a', { 'defaultOpen': true });
  const b = PanelAccordionTestModules.use('b', { 'defaultOpen': true });
  const c = PanelAccordionTestModules.use('c', { 'defaultOpen': true });
  const d = PanelAccordionTestModules.use('d', { 'defaultOpen': true });
  assert.equal(a.isOpen.value, false);
  assert.equal(b.isOpen.value, true);
  assert.equal(c.isOpen.value, true);
  assert.equal(d.isOpen.value, true);
});

await test('accordion state is shared within one app and isolated between SSR requests', (context) => {
  const firstNuxtApp = {};
  const secondNuxtApp = {};
  context.after(() => { Reflect.deleteProperty(globalThis, TEST_NUXT_APP); });

  Reflect.set(globalThis, TEST_NUXT_APP, firstNuxtApp);
  const firstPanel = PanelAccordionTestModules.use('request-panel');
  firstPanel.open();
  const firstPanelAgain = PanelAccordionTestModules.use('request-panel');
  assert.equal(firstPanelAgain.isOpen.value, true);

  Reflect.set(globalThis, TEST_NUXT_APP, secondNuxtApp);
  const secondPanel = PanelAccordionTestModules.use('request-panel');
  assert.equal(secondPanel.isOpen.value, false);
  secondPanel.open();
  secondPanel.close();

  assert.equal(firstPanel.isOpen.value, true);
  assert.equal(secondPanel.isOpen.value, false);
});
