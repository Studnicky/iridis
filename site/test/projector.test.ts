/**
 * The projector is a pure READ of engine output — every hex it writes comes from
 * state.roles / state.variants. These tests feed synthetic engine output and
 * assert the token mapping (no color is computed here or in the projector).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RoleHexMapType } from '../app/composables/types/roleHexMap.ts';
import type { ScaleMapType } from '../app/composables/types/scaleMap.ts';

import { Tokens } from '../app/theme/Tokens.ts';
import { TestPatterns } from './fixtures/TestPatterns.ts';

namespace ProjectorTestData {
  export const roles: RoleHexMapType = {
    'accent-alt': '#06b6d4', 'background': '#0a0618', 'bg-soft': '#0e0a1c',
    'border': '#2a2440', 'border-strong': '#3a3454', 'brand': '#7c3aed', 'divider': '#211d34',
    'error': '#fb7367', 'info': '#048df1', 'muted': '#8a86a0',
    'success': '#00c35a', 'surface': '#141024', 'text': '#e8e6f0', 'text-strong': '#ffffff', 'text-subtle': '#b9b6c8', 'warning': '#dda818'
  };
  // engine-produced tonal variants: shade → role → hex (distinct per shade)
  export const scales: ScaleMapType = Object.fromEntries(Tokens.SHADE_KEYS.map((s, i) => {
    const v = (10 + i * 10).toString(16).padStart(2, '0');
    const perShade: RoleHexMapType = {};
    for (const role of Object.keys(roles)) {perShade[role] = `#${v}${v}${v}`;}
    return [s, perShade];
  }));
}

await test('every alias scale reads 11 engine hexes', () => {
  const t = Tokens.mapFromEngine(ProjectorTestData.roles, ProjectorTestData.scales);
  const aliases = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'];
  const aliasCount = aliases.length;
  const shadeCount = Tokens.SHADE_KEYS.length;
  for (let aliasIndex = 0; aliasIndex < aliasCount; aliasIndex += 1) {
    const alias = aliases[aliasIndex];
    if (alias === undefined) {throw new RangeError('projector alias is missing');}
    for (let shadeIndex = 0; shadeIndex < shadeCount; shadeIndex += 1) {
      const shade = Tokens.SHADE_KEYS[shadeIndex];
      assert.match(String(t[`--ui-color-${alias}-${shade}`]), TestPatterns.HEX, `${alias}-${shade}`);
    }
  }
});

await test('shortcuts read the matching resolved roles', () => {
  const t = Tokens.mapFromEngine(ProjectorTestData.roles, ProjectorTestData.scales);
  assert.equal(t['--ui-bg'], ProjectorTestData.roles.background);
  assert.equal(t['--ui-text'], ProjectorTestData.roles.text);
  assert.equal(t['--ui-border'], ProjectorTestData.roles.border);
  // --ui-primary is gated by gateTextChrome (ACCENT_TEXT_VARS) since it renders
  // as text (soft buttons, links); brand (#7c3aed, 3.50:1 vs bg) fails AA and
  // is nudged along OKLCH L to the WCAG-clearing hex, not passed through raw.
  assert.equal(t['--ui-primary'], '#8d51ff');
});

await test('sparse tier falls back to another ENGINE role, never a computed color', () => {
  const sparse: RoleHexMapType = { 'background': '#0a0618', 'brand': '#7c3aed', 'muted': '#8a86a0', 'text': '#e8e6f0' };
  const sparseScales: ScaleMapType = Object.fromEntries(Tokens.SHADE_KEYS.map((s) => {return [s, sparse];}));
  const t = Tokens.mapFromEngine(sparse, sparseScales);
  // success has no role here → sourced from brand (an engine role), not invented
  assert.equal(t['--ui-color-success-500'], sparse.brand);
  assert.equal(t['--ui-bg-elevated'], sparse.background);
});
