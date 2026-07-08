/**
 * The projector is a pure READ of engine output — every hex it writes comes from
 * state.roles / state.variants. These tests feed synthetic engine output and
 * assert the token mapping (no color is computed here or in the projector).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mapEngineToTokens, SHADE_KEYS } from '../app/theme/iridisProjector.ts';
import type { RoleHexMap, ScaleMap } from '../app/theme/iridisProjector.ts';

const HEX = /^#[0-9a-fA-F]{6}$/;

const roles: RoleHexMap = {
  'background': '#0a0618', 'surface': '#141024', 'bg-soft': '#0e0a1c',
  'text': '#e8e6f0', 'text-strong': '#ffffff', 'text-subtle': '#b9b6c8', 'muted': '#8a86a0',
  'border': '#2a2440', 'border-strong': '#3a3454', 'divider': '#211d34',
  'brand': '#7c3aed', 'accent-alt': '#06b6d4', 'success': '#00c35a', 'warning': '#dda818', 'error': '#fb7367', 'info': '#048df1',
};
// engine-produced tonal variants: shade → role → hex (distinct per shade)
const scales: ScaleMap = Object.fromEntries(SHADE_KEYS.map((s, i) => {
  const v = (10 + i * 10).toString(16).padStart(2, '0');
  const perShade: RoleHexMap = {};
  for (const role of Object.keys(roles)) perShade[role] = `#${v}${v}${v}`;
  return [s, perShade];
})) as ScaleMap;

test('every alias scale reads 11 engine hexes', () => {
  const t = mapEngineToTokens(roles, scales);
  for (const alias of ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral']) {
    for (const s of SHADE_KEYS) assert.match(String(t[`--ui-color-${alias}-${s}`]), HEX, `${alias}-${s}`);
  }
});

test('shortcuts read the matching resolved roles', () => {
  const t = mapEngineToTokens(roles, scales);
  assert.equal(t['--ui-bg'], roles['background']);
  assert.equal(t['--ui-text'], roles['text']);
  assert.equal(t['--ui-border'], roles['border']);
  assert.equal(t['--ui-primary'], roles['brand']);
});

test('sparse tier falls back to another ENGINE role, never a computed color', () => {
  const sparse: RoleHexMap = { 'background': '#0a0618', 'text': '#e8e6f0', 'brand': '#7c3aed', 'muted': '#8a86a0' };
  const sparseScales: ScaleMap = Object.fromEntries(SHADE_KEYS.map((s) => [s, sparse])) as ScaleMap;
  const t = mapEngineToTokens(sparse, sparseScales);
  // success has no role here → sourced from brand (an engine role), not invented
  assert.equal(t['--ui-color-success-500'], sparse['brand']);
  assert.equal(t['--ui-bg-elevated'], sparse['background']);
});
