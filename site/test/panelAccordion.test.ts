/**
 * Pure-logic coverage for usePanelAccordion — shared open-panel ordering and
 * the max-3 eviction rule.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { __resetPanelAccordionForTests } from '../app/composables/__resetPanelAccordionForTests.ts';
import { usePanelAccordion } from '../app/composables/usePanelAccordion.ts';

test('opening panels one at a time up to 3 keeps all 3 open', () => {
  __resetPanelAccordionForTests();
  const a = usePanelAccordion('a');
  const b = usePanelAccordion('b');
  const c = usePanelAccordion('c');
  a.open();
  b.open();
  c.open();
  assert.equal(a.isOpen.value, true);
  assert.equal(b.isOpen.value, true);
  assert.equal(c.isOpen.value, true);
});

test('opening a 4th evicts the oldest-opened, leaving exactly 3 open', () => {
  __resetPanelAccordionForTests();
  const a = usePanelAccordion('a');
  const b = usePanelAccordion('b');
  const c = usePanelAccordion('c');
  const d = usePanelAccordion('d');
  a.open();
  b.open();
  c.open();
  d.open();
  assert.equal(a.isOpen.value, false);
  assert.equal(b.isOpen.value, true);
  assert.equal(c.isOpen.value, true);
  assert.equal(d.isOpen.value, true);
});

test('closing a panel and reopening it places it at the end (most-recent) of the order', () => {
  __resetPanelAccordionForTests();
  const a = usePanelAccordion('a');
  const b = usePanelAccordion('b');
  const c = usePanelAccordion('c');
  a.open();
  b.open();
  c.open();
  a.close();
  a.open();
  // order is now b, c, a (oldest-first) — opening a 4th should evict b, not a
  const d = usePanelAccordion('d');
  d.open();
  assert.equal(b.isOpen.value, false);
  assert.equal(c.isOpen.value, true);
  assert.equal(a.isOpen.value, true);
  assert.equal(d.isOpen.value, true);
});

test('toggle opens a closed panel and closes an open one', () => {
  __resetPanelAccordionForTests();
  const a = usePanelAccordion('a');
  assert.equal(a.isOpen.value, false);
  a.toggle();
  assert.equal(a.isOpen.value, true);
  a.toggle();
  assert.equal(a.isOpen.value, false);
});

test('defaultOpen seeds initial state on first construction only', () => {
  __resetPanelAccordionForTests();
  const a = usePanelAccordion('a', { 'defaultOpen': true });
  assert.equal(a.isOpen.value, true);

  a.close();
  // re-invoking the composable for the same id must not re-seed it back open
  const aAgain = usePanelAccordion('a', { 'defaultOpen': true });
  assert.equal(aAgain.isOpen.value, false);
});

test('defaultOpen respects the max-3 rule when several panels seed at once', () => {
  __resetPanelAccordionForTests();
  const a = usePanelAccordion('a', { 'defaultOpen': true });
  const b = usePanelAccordion('b', { 'defaultOpen': true });
  const c = usePanelAccordion('c', { 'defaultOpen': true });
  const d = usePanelAccordion('d', { 'defaultOpen': true });
  assert.equal(a.isOpen.value, false);
  assert.equal(b.isOpen.value, true);
  assert.equal(c.isOpen.value, true);
  assert.equal(d.isOpen.value, true);
});
