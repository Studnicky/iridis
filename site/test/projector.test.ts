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

  export class ProjectorScaleFixture {
    static create(hex: string): RoleHexMapType {
      const result: RoleHexMapType = {
        'accent-alt': hex, 'background': hex, 'bg-soft': hex, 'border': hex,
        'border-strong': hex, 'brand': hex, 'divider': hex, 'error': hex,
        'info': hex, 'muted': hex, 'success': hex, 'surface': hex,
        'text': hex, 'text-strong': hex, 'text-subtle': hex, 'warning': hex
      };
      return result;
    }

    static repeat(scale: RoleHexMapType): ScaleMapType {
      const result: ScaleMapType = {
        '100': scale, '200': scale, '300': scale, '400': scale,
        '50': scale, '500': scale, '600': scale, '700': scale,
        '800': scale, '900': scale, '950': scale
      };
      return result;
    }
  }

  export const scales: ScaleMapType = {
    '100': ProjectorScaleFixture.create('#141414'), '200': ProjectorScaleFixture.create('#1e1e1e'),
    '300': ProjectorScaleFixture.create('#282828'), '400': ProjectorScaleFixture.create('#323232'),
    '50': ProjectorScaleFixture.create('#0a0a0a'), '500': ProjectorScaleFixture.create('#3c3c3c'),
    '600': ProjectorScaleFixture.create('#464646'), '700': ProjectorScaleFixture.create('#505050'),
    '800': ProjectorScaleFixture.create('#5a5a5a'), '900': ProjectorScaleFixture.create('#646464'),
    '950': ProjectorScaleFixture.create('#6e6e6e')
  };
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
  const sparseScales = ProjectorTestData.ProjectorScaleFixture.repeat(sparse);
  const t = Tokens.mapFromEngine(sparse, sparseScales);
  // success has no role here → sourced from brand (an engine role), not invented
  assert.equal(t['--ui-color-success-500'], sparse.brand);
  assert.equal(t['--ui-bg-elevated'], sparse.background);
});
