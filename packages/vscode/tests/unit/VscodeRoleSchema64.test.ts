import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VSCODE_ROLE_SCHEMAS_16 } from '../../src/constants/VSCODE_ROLE_SCHEMAS_16.ts';
import { VSCODE_ROLE_SCHEMAS_64 } from '../../src/constants/VSCODE_ROLE_SCHEMAS_64.ts';

const VSCODE_ROLE_SCHEMA_64_EXPECTATIONS = {
  'baseNames': [
    'background', 'foreground', 'surface', 'muted', 'keyword', 'type', 'function', 'variable',
    'string', 'number', 'constant', 'comment', 'error', 'warning', 'info', 'success'
  ],
  'extensionContrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'accent', 'maximumContrastRatio': 4.5, 'minimumContrastRatio': 3.0 },
    { 'algorithm': 'wcag21', 'background': 'accent', 'foreground': 'onAccent', 'minimumContrastRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'link', 'minimumContrastRatio': 4.5 },
    { 'algorithm': 'wcag21', 'background': 'chrome', 'foreground': 'chromeForeground', 'minimumContrastRatio': 4.5 }
  ],
  'extensionNames': [
    'accent', 'onAccent', 'accentHover', 'link', 'selection', 'selectionList', 'buttonSecondary',
    'findMatch', 'bracketMatch', 'hover', 'border', 'guide', 'guideActive', 'chrome', 'chromeInactive',
    'chromeForeground', 'inputBackground', 'ansiBlack', 'ansiRed', 'ansiGreen', 'ansiYellow', 'ansiBlue',
    'ansiMagenta', 'ansiCyan', 'ansiWhite', 'ansiBrightBlack', 'ansiBrightRed', 'ansiBrightGreen',
    'ansiBrightYellow', 'ansiBrightBlue', 'ansiBrightMagenta', 'ansiBrightCyan', 'ansiBrightWhite',
    'gitAdded', 'gitModified', 'gitDeleted', 'gitUntracked', 'gitConflicting', 'diffInserted', 'diffRemoved',
    'bracketLevel1', 'bracketLevel2', 'bracketLevel3', 'bracketLevel4', 'bracketLevel5', 'bracketLevel6',
    'widgetBackground', 'widgetBorder'
  ]
} as const;




await test('VscodeRoleSchema64 :: each framing exposes the exact canonical 64-role vocabulary', () => {
  const expectedNames = [...VSCODE_ROLE_SCHEMA_64_EXPECTATIONS.baseNames, ...VSCODE_ROLE_SCHEMA_64_EXPECTATIONS.extensionNames];
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
  const extensionRoleNames = new Set<string>(VSCODE_ROLE_SCHEMA_64_EXPECTATIONS.extensionNames);
  const schemas = [VSCODE_ROLE_SCHEMAS_64.dark, VSCODE_ROLE_SCHEMAS_64.light];
  for (let schemaCount = schemas.length, schemaIndex = 0; schemaIndex < schemaCount; schemaIndex += 1) {
    const schema = schemas[schemaIndex]!;
    const pairsWithExtensionRoles = [];
    const contrastPairs = schema.contrastPairs ?? [];
    for (let pairIndex = 0; pairIndex < contrastPairs.length; pairIndex += 1) {
      const pair = contrastPairs.at(pairIndex);
      if (pair !== undefined && (extensionRoleNames.has(pair.background) || extensionRoleNames.has(pair.foreground))) {
        pairsWithExtensionRoles.push(pair);
      }
    }
    assert.deepStrictEqual(pairsWithExtensionRoles, VSCODE_ROLE_SCHEMA_64_EXPECTATIONS.extensionContrastPairs);
  }
});

await test('VscodeRoleSchema64 :: 16-role views are exactly the canonical base vocabulary', () => {
  const baseRoleNames = new Set<string>(VSCODE_ROLE_SCHEMA_64_EXPECTATIONS.baseNames);
  const schemas = [VSCODE_ROLE_SCHEMAS_16.dark, VSCODE_ROLE_SCHEMAS_16.light];
  for (let schemaCount = schemas.length, schemaIndex = 0; schemaIndex < schemaCount; schemaIndex += 1) {
    const schema = schemas[schemaIndex]!;
    const names: string[] = [];
    for (let roleCount = schema.roles.length, roleIndex = 0; roleIndex < roleCount; roleIndex += 1) { names.push(schema.roles[roleIndex]!.name); }
    assert.deepStrictEqual(names, VSCODE_ROLE_SCHEMA_64_EXPECTATIONS.baseNames);
    assert.strictEqual(schema.roles.length, 16);
    const contrastPairs = schema.contrastPairs ?? [];
    for (let pairIndex = 0; pairIndex < contrastPairs.length; pairIndex += 1) {
      const pair = contrastPairs.at(pairIndex);
      if (pair !== undefined) {
        assert.ok(baseRoleNames.has(pair.background) && baseRoleNames.has(pair.foreground));
      }
    }
  }
});
