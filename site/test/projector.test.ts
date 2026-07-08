/**
 * Proof of the theming spine: the iridis engine drives Nuxt UI's token set.
 * Runs the pure projector (no DOM) against real engine output and asserts the
 * generated `--ui-color-*` scales are valid, monotonic, and seed-dependent.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rolesToNuxtTokens } from '../app/theme/iridisProjector.ts';

const HEX = /^#[0-9a-fA-F]{6}$/;

test('primary scale is 11 valid, distinct hexes', async () => {
  const tokens = await rolesToNuxtTokens(['#7c3aed'], 'dark');
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const hexes = shades.map((s) => tokens[`--ui-color-primary-${s}`]);
  for (const h of hexes) assert.match(String(h), HEX, 'each shade is a hex');
  assert.equal(new Set(hexes).size, shades.length, 'all 11 shades differ');
});

test('every semantic alias scale is emitted', async () => {
  const tokens = await rolesToNuxtTokens(['#7c3aed'], 'dark');
  for (const alias of ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral']) {
    assert.match(String(tokens[`--ui-color-${alias}-500`]), HEX, `${alias}-500 present`);
  }
});

test('changing the seed changes the primary tokens', async () => {
  const a = await rolesToNuxtTokens(['#7c3aed'], 'dark'); // violet
  const b = await rolesToNuxtTokens(['#06b6d4'], 'dark'); // cyan
  assert.notEqual(a['--ui-color-primary-500'], b['--ui-color-primary-500'], 'primary-500 tracks the seed');
  assert.notEqual(a['--ui-primary'], b['--ui-primary'], 'the --ui-primary shortcut tracks the seed');
});

test('framing flips background/text anchors', async () => {
  const dark = await rolesToNuxtTokens(['#7c3aed'], 'dark');
  const light = await rolesToNuxtTokens(['#7c3aed'], 'light');
  assert.match(String(dark['--ui-bg']), HEX);
  assert.match(String(light['--ui-bg']), HEX);
  assert.notEqual(dark['--ui-bg'], light['--ui-bg'], 'background differs across framing');
  assert.notEqual(dark['--ui-text'], light['--ui-text'], 'text differs across framing');
});
