/**
 * Pure-logic coverage for ColorStreamCard's axis-mapping functions — canvas
 * drawing is verified through its bounded renderer contract and row layout.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { sampleIndexToX } from '../app/composables/sampleIndexToX.ts';
import { scaleChromaToY } from '../app/composables/scaleChromaToY.ts';

await test('scaleChromaToY maps the min to the bottom and the max to the top, with padding', () => {
  const bottom = scaleChromaToY(0, 0, 1, 100);
  const top = scaleChromaToY(1, 0, 1, 100);
  assert.ok(bottom > top);
  assert.ok(bottom < 100);
  assert.ok(top > 0);
});

await test('scaleChromaToY returns the vertical midpoint when min equals max (flat buffer)', () => {
  assert.equal(scaleChromaToY(0.2, 0.2, 0.2, 100), 50);
});

await test('sampleIndexToX maps index 0 to the left edge and the last index to the right edge', () => {
  assert.equal(sampleIndexToX(0, 5, 200), 0);
  assert.equal(sampleIndexToX(4, 5, 200), 200);
});

await test('sampleIndexToX places a single sample at the right edge', () => {
  assert.equal(sampleIndexToX(0, 1, 200), 200);
});

await test('Color Stream preserves six role comparisons with one bounded canvas renderer', () => {
  const aliases = readFileSync(new URL('../app/composables/decorativeAliases.ts', import.meta.url), 'utf8');
  const showcase = readFileSync(new URL('../app/components/content/ColorStreamShowcase.vue', import.meta.url), 'utf8');
  const roleBand = readFileSync(new URL('../app/components/content/ColorStreamRoleBand.vue', import.meta.url), 'utf8');
  const renderer = readFileSync(new URL('../app/components/content/colorStream/drawColorStream.ts', import.meta.url), 'utf8');
  const card = readFileSync(new URL('../app/components/content/ColorStreamCard.vue', import.meta.url), 'utf8');

  assert.equal(aliases.includes("'error':     'error'"), true);
  assert.equal(aliases.includes("'info':      'info'"), true);
  assert.equal(aliases.includes("'primary':   'brand'"), true);
  assert.equal(aliases.includes("'secondary': 'accent-alt'"), true);
  assert.equal(aliases.includes("'success':   'success'"), true);
  assert.equal(aliases.includes("'warning':   'warning'"), true);
  assert.equal(showcase.split('<canvas').length - 1, 1);
  assert.equal(roleBand.split('<canvas').length - 1, 0);
  assert.equal(showcase.includes('v-for="role in roles"'), true);
  assert.equal(showcase.includes('naive RGB versus OKLCH interpolation comparison for six decorative palette roles'), true);
  assert.equal(renderer.includes('public static drawAll('), true);
  assert.equal(renderer.includes('canvasHeightForRoleCount(roles.length)'), true);
  assert.equal(card.includes('drawRaf = requestAnimationFrame(tick);'), true);
  assert.equal(card.includes('new ResizeObserver'), true);
  assert.equal(card.includes("document.addEventListener('visibilitychange', onVisibility)"), true);
  assert.equal(card.includes('new IntersectionObserver'), true);
  assert.equal(card.includes('stopLoop();'), true);
});
