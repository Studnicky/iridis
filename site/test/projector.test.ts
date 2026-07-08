/**
 * Proof of the theming spine: iridis resolved roles drive Nuxt UI's token set.
 * Tests the pure mapping (no DOM) plus one engine-integration pass.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Engine, coreTasks, rgbToOklch } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { roleSchemaByName } from '../app/theme/roleSchemas.ts';
import { mapRolesToTokens } from '../app/theme/iridisProjector.ts';
import type { ResolvedRoles } from '../app/theme/iridisProjector.ts';

const HEX = /^#[0-9a-fA-F]{6}$/;

function fakeRoles(brandHue: number): ResolvedRoles {
  return {
    'brand':      { 'hex': '#7c3aed', 'oklch': { 'l': 0.55, 'c': 0.20, 'h': brandHue } },
    'background': { 'hex': '#0a0618', 'oklch': { 'l': 0.10, 'c': 0.02, 'h': brandHue } },
    'text':       { 'hex': '#e8e6f0', 'oklch': { 'l': 0.92, 'c': 0.01, 'h': brandHue } },
    'border':     { 'hex': '#2a2440', 'oklch': { 'l': 0.30, 'c': 0.03, 'h': brandHue } },
  };
}

test('all seven alias scales are 11 valid, distinct hexes', () => {
  const t = mapRolesToTokens(fakeRoles(290), 'dark');
  for (const alias of ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral']) {
    const hexes = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => t[`--ui-color-${alias}-${s}`]);
    for (const h of hexes) assert.match(String(h), HEX, `${alias} shade is hex`);
    assert.equal(new Set(hexes).size, 11, `${alias} has 11 distinct shades`);
  }
});

test('status hues stay semantic (success reads green) regardless of brand', () => {
  const t = mapRolesToTokens(fakeRoles(27), 'dark'); // red-ish brand
  const s = t['--ui-color-success-500'] as string;
  const rgb = [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  const ok = rgbToOklch.apply(rgb[0] as number, rgb[1] as number, rgb[2] as number);
  assert.ok(ok.oklch.h > 110 && ok.oklch.h < 190, `success hue ${ok.oklch.h} is green-ish even with a red brand`);
});

test('brand hue drives the primary scale', () => {
  const a = mapRolesToTokens(fakeRoles(290), 'dark');
  const b = mapRolesToTokens(fakeRoles(200), 'dark');
  assert.notEqual(a['--ui-color-primary-500'], b['--ui-color-primary-500'], 'primary tracks brand hue');
});

test('engine integration: additive seeds resolve and map; framing flips bg', async () => {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(contrastPlugin);
  engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'enforce:contrast']);
  const runFor = async (framing: 'dark' | 'light'): Promise<Record<string, string>> => {
    const st = await engine.run({
      'colors':   ['#7c3aed', '#06b6d4', '#f59e0b'], // three additive seeds
      'roles':    roleSchemaByName['iridis-16']![framing],
      'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
      'runtime':  { 'framing': framing, 'colorSpace': 'srgb' },
    });
    const roles = Object.fromEntries(Object.entries(st.roles).map(([n, r]) => {
      const rec = r as { hex: string; oklch: { l: number; c: number; h: number } };
      return [n, { 'hex': rec.hex, 'oklch': { 'l': rec.oklch.l, 'c': rec.oklch.c, 'h': rec.oklch.h } }];
    }));
    return mapRolesToTokens(roles as ResolvedRoles, framing);
  };
  const dark = await runFor('dark');
  const light = await runFor('light');
  assert.match(String(dark['--ui-bg']), HEX);
  assert.notEqual(dark['--ui-bg'], light['--ui-bg'], 'background differs across framing');
});
