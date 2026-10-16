import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VSCODE_ROLE_SCHEMAS_16 } from '../../src/constants/VSCODE_ROLE_SCHEMAS_16.ts';
import { VSCODE_ROLE_SCHEMAS_64 } from '../../src/constants/VSCODE_ROLE_SCHEMAS_64.ts';

const baseNames = [
  'background', 'foreground', 'surface', 'muted', 'keyword', 'type', 'function', 'variable',
  'string', 'number', 'constant', 'comment', 'error', 'warning', 'info', 'success'
];

const extensionNames = [
  'accent', 'onAccent', 'accentHover', 'link', 'selection', 'selectionList', 'buttonSecondary',
  'findMatch', 'bracketMatch', 'hover', 'border', 'guide', 'guideActive', 'chrome', 'chromeInactive',
  'chromeForeground', 'inputBackground', 'ansiBlack', 'ansiRed', 'ansiGreen', 'ansiYellow', 'ansiBlue',
  'ansiMagenta', 'ansiCyan', 'ansiWhite', 'ansiBrightBlack', 'ansiBrightRed', 'ansiBrightGreen',
  'ansiBrightYellow', 'ansiBrightBlue', 'ansiBrightMagenta', 'ansiBrightCyan', 'ansiBrightWhite',
  'gitAdded', 'gitModified', 'gitDeleted', 'gitUntracked', 'gitConflicting', 'diffInserted', 'diffRemoved',
  'bracketLevel1', 'bracketLevel2', 'bracketLevel3', 'bracketLevel4', 'bracketLevel5', 'bracketLevel6',
  'widgetBackground', 'widgetBorder'
];

const expectedNames = [...baseNames, ...extensionNames];

const extensionContrastPairs = [
  { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'accent', 'maxRatio': 4.5, 'minRatio': 3.0 },
  { 'algorithm': 'wcag21', 'background': 'accent', 'foreground': 'onAccent', 'minRatio': 4.5 },
  { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'link', 'minRatio': 4.5 },
  { 'algorithm': 'wcag21', 'background': 'chrome', 'foreground': 'chromeForeground', 'minRatio': 4.5 }
];

await test('VscodeRoleSchema64 :: each framing exposes the exact canonical 64-role vocabulary', () => {
  const schemas = [VSCODE_ROLE_SCHEMAS_64.dark, VSCODE_ROLE_SCHEMAS_64.light];
  for (let schemaCount = schemas.length, schemaIndex = 0; schemaIndex < schemaCount; schemaIndex += 1) {
    const schema = schemas[schemaIndex]!;
    const names: string[] = [];
    for (let roleCount = schema.roles.length, roleIndex = 0; roleIndex < roleCount; roleIndex += 1) { names.push(schema.roles[roleIndex]!.name); }
    assert.deepStrictEqual(names, expectedNames);
    assert.strictEqual(new Set(names).size, 64);
    assert.strictEqual(schema.roles.length, 64);
  }
});

await test('VscodeRoleSchema64 :: dark and light share role membership and derivation structure', () => {
  const darkRoleNames: string[] = [];
  const lightRoleNames: string[] = [];
  const darkDerivations: (string | undefined)[] = [];
  const lightDerivations: (string | undefined)[] = [];
  for (let roleCount = VSCODE_ROLE_SCHEMAS_64.dark.roles.length, roleIndex = 0; roleIndex < roleCount; roleIndex += 1) {
    const role = VSCODE_ROLE_SCHEMAS_64.dark.roles[roleIndex]!;
    darkRoleNames.push(role.name);
    darkDerivations.push(role.derivedFrom);
  }
  for (let roleCount = VSCODE_ROLE_SCHEMAS_64.light.roles.length, roleIndex = 0; roleIndex < roleCount; roleIndex += 1) {
    const role = VSCODE_ROLE_SCHEMAS_64.light.roles[roleIndex]!;
    lightRoleNames.push(role.name);
    lightDerivations.push(role.derivedFrom);
  }
  assert.deepStrictEqual(darkRoleNames, lightRoleNames);
  assert.deepStrictEqual(darkDerivations, lightDerivations);
  const extensionRoleNames = new Set(extensionNames);
  const schemas = [VSCODE_ROLE_SCHEMAS_64.dark, VSCODE_ROLE_SCHEMAS_64.light];
  for (let schemaCount = schemas.length, schemaIndex = 0; schemaIndex < schemaCount; schemaIndex += 1) {
    const schema = schemas[schemaIndex]!;
    const pairsWithExtensionRoles = [];
    for (const pair of schema.contrastPairs ?? []) {
      if (extensionRoleNames.has(pair.background) || extensionRoleNames.has(pair.foreground)) {
        pairsWithExtensionRoles.push(pair);
      }
    }
    assert.deepStrictEqual(pairsWithExtensionRoles, extensionContrastPairs);
  }
});

await test('VscodeRoleSchema64 :: 16-role views are exactly the canonical base vocabulary', () => {
  const baseRoleNames = new Set(baseNames);
  const schemas = [VSCODE_ROLE_SCHEMAS_16.dark, VSCODE_ROLE_SCHEMAS_16.light];
  for (let schemaCount = schemas.length, schemaIndex = 0; schemaIndex < schemaCount; schemaIndex += 1) {
    const schema = schemas[schemaIndex]!;
    const names: string[] = [];
    for (let roleCount = schema.roles.length, roleIndex = 0; roleIndex < roleCount; roleIndex += 1) { names.push(schema.roles[roleIndex]!.name); }
    assert.deepStrictEqual(names, baseNames);
    assert.strictEqual(schema.roles.length, 16);
    for (const pair of schema.contrastPairs ?? []) {
      assert.ok(baseRoleNames.has(pair.background) && baseRoleNames.has(pair.foreground));
    }
  }
});
