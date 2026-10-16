import { vscodeSeedRoleData } from '@studnicky/iridis-vscode';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runVscodeTheme } from '../app/composables/runVscodeTheme.ts';

class VscodeThemeFixture {
  private static readonly 'darkColors' = ['#101820', '#f5f7fa', '#7c3aed', '#ef4444', '#06b6d4', '#f59e0b', '#10b981', '#ec4899'];
  private static readonly 'lightColors' = ['#f7f4ed', '#17212b', '#5b21b6', '#b91c1c', '#0e7490', '#b45309', '#047857', '#be185d'];
  private static readonly 'hexCharacters' = '0123456789abcdefABCDEF';

  static palette(tier: 4 | 8 | 16 | 64, framing: 'dark' | 'light') {
    const tierData = vscodeSeedRoleData.roleTiers.find((entry) => { return entry.tier === tier; });
    if (tierData === undefined) { throw new RangeError(`Unsupported test tier ${tier}`); }
    const colors = framing === 'dark' ? VscodeThemeFixture.darkColors : VscodeThemeFixture.lightColors;
    const roles: Record<string, string> = {};
    for (const [index, role] of tierData.roleNames.entries()) {
      roles[role] = colors[index % colors.length]!;
    }
    return { 'framing': framing, 'roles': roles, 'tier': tier };
  }

  static isSrgb(color: string): boolean {
    if ((color.length !== 7 && color.length !== 9) || color[0] !== '#') { return false; }
    for (const character of color.slice(1)) {
      if (!VscodeThemeFixture.hexCharacters.includes(character)) { return false; }
    }
    return true;
  }
}

await test('runVscodeTheme emits canonical dark and light VS Code theme data', () => {
  const dark = runVscodeTheme(VscodeThemeFixture.palette(4, 'dark'));
  const light = runVscodeTheme(VscodeThemeFixture.palette(4, 'light'));

  assert.equal(dark.palette.framing, 'dark');
  assert.equal(light.palette.framing, 'light');
  assert.equal(dark.palette.tier, 4);
  assert.equal(light.palette.tier, 4);
  assert.equal(Object.keys(dark.workbenchColors).length, 129);
  assert.equal(Object.keys(light.workbenchColors).length, 129);
  assert.equal(Object.keys(dark.semanticTokenColors).length > 0, true);
  assert.equal(Object.keys(light.semanticTokenColors).length > 0, true);
});

await test('runVscodeTheme preserves exact custom structured seed roles and reports pinned provenance', () => {
  const palette = {
    'framing': 'dark',
    'roles': {
      'background': '#14202b',
      'error': '#d83a4e',
      'foreground': '#f1f5f9',
      'keyword': '#7856ff'
    },
    'tier': 4
  };
  const result = runVscodeTheme(palette);

  assert.deepEqual(result.palette.roles, palette.roles);
  assert.deepEqual(result.provenance.pinnedRoles.toSorted(), Object.keys(palette.roles).toSorted());
  const keyword = result.roles.keyword;
  if (keyword === undefined) { assert.fail('resolved keyword role is absent'); }
  assert.equal(keyword.length, 7);
  assert.equal(result.roles.warning === undefined, false);
});

await test('runVscodeTheme pins every tier-specific supplied role and returns complete contrast data', () => {
  const result = runVscodeTheme(VscodeThemeFixture.palette(16, 'dark'));
  const suppliedRoles = Object.keys(result.palette.roles);

  assert.deepEqual(result.provenance.pinnedRoles.toSorted(), suppliedRoles.toSorted());
  assert.equal(result.provenance.derivedRoles.includes('accent'), true);
  assert.equal(result.contrast.length > 0, true);
  for (const entry of result.contrast) {
    assert.equal(entry.background.length > 0, true);
    assert.equal(entry.foreground.length > 0, true);
    assert.equal(Number.isFinite(entry.ratio), true);
    assert.equal(typeof entry.passed, 'boolean');
  }
});

await test('runVscodeTheme emits only sRGB hex workbench colors', () => {
  const result = runVscodeTheme(VscodeThemeFixture.palette(64, 'light'));

  assert.equal(Object.values(result.workbenchColors).every(VscodeThemeFixture.isSrgb), true);
  assert.equal(JSON.stringify(result.theme.json).includes('display-p3'), false);
});
