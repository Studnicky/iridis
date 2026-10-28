import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runVscodeTheme } from '../app/composables/runVscodeTheme.ts';

class VscodeThemeFixture {
  private static readonly 'hexCharacters' = '0123456789abcdefABCDEF';

  static compareNames(left: string, right: string): number {
    const comparison = left.localeCompare(right);
    return comparison;
  }

  static contrast() {
    const result = {
      'algorithm': 'wcag21',
      'cvdMode': 'warn',
      'enableStrictCompliance': false,
      'level': 'AA',
      'nonMandatoryLevel': 'AA'
    };
    return result;
  }

  static darkTierFour() {
    const result = {
      'contrast': VscodeThemeFixture.contrast(),
      'framing': 'dark',
      'roles': {
        'background': '#101820',
        'error': '#ef4444',
        'foreground': '#f5f7fa',
        'keyword': '#7c3aed'
      },
      'tier': 4
    };
    return result;
  }

  static strictUnresolved() {
    const palette = VscodeThemeFixture.darkTierFour();
    const result = {
      ...palette,
      'contrast': { ...palette.contrast, 'enableStrictCompliance': true },
      'roles': { ...palette.roles, 'foreground': palette.roles.background }
    };
    return result;
  }

  static lightTierFour() {
    const result = {
      'contrast': VscodeThemeFixture.contrast(),
      'framing': 'light',
      'roles': {
        'background': '#f7f4ed',
        'error': '#b91c1c',
        'foreground': '#17212b',
        'keyword': '#5b21b6'
      },
      'tier': 4
    };
    return result;
  }

  static darkTierSixteen() {
    const result = {
      'contrast': VscodeThemeFixture.contrast(),
      'framing': 'dark',
      'roles': {
        'background': '#101820',
        'comment': '#ef4444',
        'constant': '#7c3aed',
        'error': '#06b6d4',
        'foreground': '#f5f7fa',
        'function': '#10b981',
        'info': '#10b981',
        'keyword': '#06b6d4',
        'muted': '#ef4444',
        'number': '#f5f7fa',
        'string': '#101820',
        'success': '#ec4899',
        'surface': '#7c3aed',
        'type': '#f59e0b',
        'variable': '#ec4899',
        'warning': '#f59e0b'
      },
      'tier': 16
    };
    return result;
  }

  static lightTierSixtyFour() {
    const result = {
      'contrast': VscodeThemeFixture.contrast(),
      'framing': 'light',
      'roles': {
        'accent': '#f7f4ed',
        'accentHover': '#5b21b6',
        'ansiBlack': '#17212b',
        'ansiBlue': '#b45309',
        'ansiBrightBlack': '#17212b',
        'ansiBrightBlue': '#b45309',
        'ansiBrightCyan': '#be185d',
        'ansiBrightGreen': '#b91c1c',
        'ansiBrightMagenta': '#047857',
        'ansiBrightRed': '#5b21b6',
        'ansiBrightWhite': '#f7f4ed',
        'ansiBrightYellow': '#0e7490',
        'ansiCyan': '#be185d',
        'ansiGreen': '#b91c1c',
        'ansiMagenta': '#047857',
        'ansiRed': '#5b21b6',
        'ansiWhite': '#f7f4ed',
        'ansiYellow': '#0e7490',
        'background': '#f7f4ed',
        'border': '#5b21b6',
        'bracketLevel1': '#f7f4ed',
        'bracketLevel2': '#17212b',
        'bracketLevel3': '#5b21b6',
        'bracketLevel4': '#b91c1c',
        'bracketLevel5': '#0e7490',
        'bracketLevel6': '#b45309',
        'bracketMatch': '#f7f4ed',
        'buttonSecondary': '#047857',
        'chrome': '#b45309',
        'chromeForeground': '#be185d',
        'chromeInactive': '#047857',
        'comment': '#b91c1c',
        'constant': '#5b21b6',
        'diffInserted': '#047857',
        'diffRemoved': '#be185d',
        'error': '#0e7490',
        'findMatch': '#be185d',
        'foreground': '#17212b',
        'function': '#047857',
        'gitAdded': '#17212b',
        'gitConflicting': '#b45309',
        'gitDeleted': '#b91c1c',
        'gitModified': '#5b21b6',
        'gitUntracked': '#0e7490',
        'guide': '#b91c1c',
        'guideActive': '#0e7490',
        'hover': '#17212b',
        'info': '#047857',
        'inputBackground': '#f7f4ed',
        'keyword': '#0e7490',
        'link': '#b91c1c',
        'muted': '#b91c1c',
        'number': '#17212b',
        'onAccent': '#17212b',
        'selection': '#0e7490',
        'selectionList': '#b45309',
        'string': '#f7f4ed',
        'success': '#be185d',
        'surface': '#5b21b6',
        'type': '#b45309',
        'variable': '#be185d',
        'warning': '#b45309',
        'widgetBackground': '#047857',
        'widgetBorder': '#be185d'
      },
      'tier': 64
    };
    return result;
  }

  static isSrgb(color: string): boolean {
    if ((color.length !== 7 && color.length !== 9) || color[0] !== '#') { return false; }
    for (let index = 1; index < color.length; index += 1) {
      if (!VscodeThemeFixture.hexCharacters.includes(color[index]!)) { return false; }
    }
    return true;
  }
}
await test('runVscodeTheme emits canonical dark and light VS Code theme data', () => {
  const dark = runVscodeTheme(VscodeThemeFixture.darkTierFour());
  const light = runVscodeTheme(VscodeThemeFixture.lightTierFour());

  assert.equal(dark.palette.framing, 'dark');
  assert.equal(light.palette.framing, 'light');
  assert.equal(dark.palette.tier, 4);
  assert.equal(light.palette.tier, 4);
  assert.notEqual(dark.compliance.disposition, 'withheld');
  assert.notEqual(light.compliance.disposition, 'withheld');
  assert.notEqual(dark.workbenchColors, undefined, 'dark theme output is available');
  assert.notEqual(light.workbenchColors, undefined, 'light theme output is available');
  assert.notEqual(dark.semanticTokenColors, undefined, 'dark semantic output is available');
  assert.notEqual(light.semanticTokenColors, undefined, 'light semantic output is available');
  if (
    dark.workbenchColors === undefined ||
    light.workbenchColors === undefined ||
    dark.semanticTokenColors === undefined ||
    light.semanticTokenColors === undefined
  ) {
    throw new Error('resolved VS Code theme output is absent');
  }
  assert.equal(Object.keys(dark.workbenchColors).length, 132);
  assert.equal(Object.keys(light.workbenchColors).length, 132);
  assert.equal(Object.keys(dark.semanticTokenColors).length > 0, true);
  assert.equal(Object.keys(light.semanticTokenColors).length > 0, true);
});

await test('runVscodeTheme preserves exact custom structured seed roles and reports pinned provenance', () => {
  const palette = {
    'contrast': VscodeThemeFixture.contrast(),
    'framing': 'dark' as const,
    'roles': {
      'background': '#14202b',
      'error': '#d83a4e',
      'foreground': '#f1f5f9',
      'keyword': '#7856ff'
    },
    'tier': 4 as const
  };
  const result = runVscodeTheme(palette);

  assert.deepEqual(result.palette.roles, palette.roles);
  assert.deepEqual(result.provenance.pinnedRoles.toSorted(VscodeThemeFixture.compareNames), Object.keys(palette.roles).toSorted(VscodeThemeFixture.compareNames));
  const keyword = result.roles.keyword;
  if (keyword === undefined) { assert.fail('resolved keyword role is absent'); }
  assert.equal(keyword.length, 7);
  assert.equal(result.roles.warning === undefined, false);
});

await test('runVscodeTheme pins every tier-specific supplied role and returns complete contrast data', () => {
  const result = runVscodeTheme(VscodeThemeFixture.darkTierSixteen());
  const suppliedRoles = Object.keys(result.palette.roles);

  assert.deepEqual(result.provenance.pinnedRoles.toSorted(VscodeThemeFixture.compareNames), suppliedRoles.toSorted(VscodeThemeFixture.compareNames));
  assert.equal(result.provenance.derivedRoles.includes('accent'), true);
  assert.equal(result.contrast.length > 0, true);
  for (let index = 0; index < result.contrast.length; index += 1) {
    const entry = result.contrast[index]!;
    assert.equal(entry.background.length > 0, true);
    assert.equal(entry.foreground.length > 0, true);
    assert.equal(Number.isFinite(entry.actual), true);
    assert.equal(typeof entry.passed, 'boolean');
  }
});

await test('runVscodeTheme emits only sRGB hex workbench colors', () => {
  const result = runVscodeTheme(VscodeThemeFixture.lightTierSixtyFour());

  assert.notEqual(result.workbenchColors, undefined, 'resolved workbench colors are available');
  assert.notEqual(result.theme, undefined, 'resolved theme JSON is available');
  if (result.workbenchColors === undefined || result.theme === undefined) {
    throw new Error('resolved VS Code theme output is absent');
  }
  assert.equal(Object.values(result.workbenchColors).every(VscodeThemeFixture.isSrgb), true);
  assert.equal(JSON.stringify(result.theme.json).includes('display-p3'), false);
});

await test('runVscodeTheme exposes a withheld report and canonical theme data for caller admission', () => {
  const result = runVscodeTheme(VscodeThemeFixture.strictUnresolved());

  assert.equal(result.compliance.disposition, 'withheld');
  assert.notEqual(result.compliance.problemPairs.length, 0);
  assert.notEqual(result.theme, undefined, 'the canonical emitter still returns theme data');
  assert.notEqual(result.workbenchColors, undefined, 'the canonical emitter still returns workbench data');
  assert.notEqual(result.semanticTokenColors, undefined, 'the canonical emitter still returns semantic data');
  assert.notEqual(result.roles.foreground, undefined, 'best-achievable roles remain available for diagnostics');
});
