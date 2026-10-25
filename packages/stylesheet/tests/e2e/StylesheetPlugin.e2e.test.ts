/**
 * StylesheetPlugin e2e — scenario-matrix suite.
 *
 * Subject: `StylesheetPlugin` (plugin shape) + `emit:cssVars` + `emit:cssVarsScoped`
 * (CSS generation tasks). Each cell covers one concern; scenarios within each
 * cell exhaust the happy / edge / unhappy matrix for that concern.
 *
 * Cells:
 *   1. plugin-shape      — singleton identity, task manifest
 *   2. emit:cssVars basic — :root block, map, empty/single/all-roles palette
 *   3. emit:cssVars cascade — dark-scheme, forced-colors, wide-gamut @supports ordering
 *   4. emit:cssVars custom-property naming — prefix override, camelCase role names
 *   5. emit:cssVars wide-gamut — OKLCH out-of-sRGB, intake:p3, sRGB-only (no @supports)
 *   6. emit:cssVarsScoped basic — default category, scopePrefix default, sRGB-only
 *   7. emit:cssVarsScoped variants — dark variant blocks, multi-variant ordering
 *   8. emit:cssVarsScoped wide-gamut — P3 sibling emitted per category, sRGB-only has none
 *   9. emit:cssVarsScoped custom prefix — scopePrefix metadata override
 */

import {
  InputEntity,
  RoleSchemaEntity
} from '@studnicky/iridis';
import { stylesheetPlugin }            from '@studnicky/iridis-stylesheet';
import { Engine }                      from '@studnicky/iridis/engine';
import { coreTasks }                   from '@studnicky/iridis/tasks';
import assert                          from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { test }                        from 'node:test';

import { CssVarsScenarioOutputEntity } from '../entities/CssVarsScenarioOutputEntity.ts';
import { StylesheetCellsOneToThreeScenarioSuite } from './fixtures/cells-1-3/StylesheetCellsOneToThreeScenarioSuite.ts';
import { StylesheetCellsFourToSixScenarioSuite } from './fixtures/cells-4-6/StylesheetCellsFourToSixScenarioSuite.ts';
import { StylesheetCellsSevenToNineScenarioSuite } from './fixtures/cells-7-9/StylesheetCellsSevenToNineScenarioSuite.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const HEX_DIGITS = '0123456789abcdefABCDEF';

class StylesheetTestFixture {
  static freshEngine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let taskIndex = 0; taskIndex < taskCount; taskIndex++) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(stylesheetPlugin);
    return engine;
  }

  static input(value: {
    readonly 'colors': InputEntity.Type['colors'];
    readonly 'metadata'?: InputEntity.Type['metadata'];
    readonly 'roles': RoleSchemaEntity.Type;
  }): InputEntity.Type {
    const result = InputEntity.create({
      'colors': value.colors,
      ...(value.metadata === undefined ? {} : { 'metadata': value.metadata }),
      'roles': value.roles
    });
    return result;
  }

  static isHexColor(value: string): boolean {
    if (value.length !== 7 || value.charAt(0) !== '#') {
      return false;
    }
    for (let characterIndex = 1; characterIndex < value.length; characterIndex++) {
      if (!HEX_DIGITS.includes(value.charAt(characterIndex))) {
        return false;
      }
    }
    return true;
  }
}

await StylesheetCellsOneToThreeScenarioSuite.run();
await StylesheetCellsFourToSixScenarioSuite.run();
await StylesheetCellsSevenToNineScenarioSuite.run();

// ---------------------------------------------------------------------------
// Golden fixture: locks the full emit:cssVars output for a stable seed +
// role schema running through intake:hex → resolve:roles → expand:family →
// enforce:contrast → emit:cssVars. Any drift in role math, contrast
// enforcement, or CSS serialisation flips this test. Regenerate via
// UPDATE_GOLDENS=1 after an intentional behaviour change.
// ---------------------------------------------------------------------------

const CSS_VARS_GOLDEN = new URL(
  '../fixtures/emit-cssVars-golden.css',
  import.meta.url
);

const GOLDEN_ROLES = RoleSchemaEntity.intake({
  'contrastPairs': [
    { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'foreground', 'minimumContrastRatio': 4.5 }
  ],
  'description': undefined,
  'name':  'golden-cssvars',
  'roles': [
    { 'chromaRange': [0.00, 0.03], 'derivedFrom': undefined, 'description': undefined, 'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'background', 'lightnessRange': [0.05, 0.15], 'name': 'background', 'required': true },
    { 'chromaRange': [0.00, 0.03], 'derivedFrom': undefined, 'description': undefined,       'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'text', 'lightnessRange': [0.90, 0.99], 'name': 'foreground', 'required': true },
    { 'chromaRange': [0.15, 0.25],     'derivedFrom': undefined, 'description': undefined,     'hue': undefined, 'hueClamp': undefined, 'hueOffset': undefined, 'intent': 'accent', 'lightnessRange': [0.55, 0.70], 'name': 'accent', 'required': true }
  ]
});

await test('emit:cssVars :: golden :: stable seed + role schema matches locked CSS fixture', () => {
  const engine = StylesheetTestFixture.freshEngine();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:contrast',
    'emit:cssVars'
  ]);

  const state = engine.run(StylesheetTestFixture.input({
    'colors': ['#5b21b6', '#0f172a', '#f8fafc'],
    'roles':  GOLDEN_ROLES
  }));

  const out = CssVarsScenarioOutputEntity.intake({
    'cssVars': state.outputs['stylesheet:cssVars']
  }).cssVars;
  const actual = `${out.full}\n`;

  // Requirement-level assertions (independent of the golden fixture).
  // These assert the spec's mandatory output structure so the golden can't
  // silently lock in a regression: even a freshly regenerated golden must
  // satisfy these explicit requirements.

  // 1. :root block declares one CSS variable per role.
  const declarationsByProperty = new Map<string, string>();
  const rootBlockLines = out.rootBlock.split('\n');
  const rootBlockLineCount = rootBlockLines.length;
  for (let lineIndex = 0; lineIndex < rootBlockLineCount; lineIndex++) {
    const line = rootBlockLines[lineIndex] ?? '';
    const separatorIndex = line.indexOf(':');
    if (separatorIndex >= 0) {
      declarationsByProperty.set(line.slice(0, separatorIndex).trim(), line);
    }
  }
  const goldenRoleCount = GOLDEN_ROLES.roles.length;
  for (let roleIndex = 0; roleIndex < goldenRoleCount; roleIndex++) {
    const role = GOLDEN_ROLES.roles[roleIndex];
    if (role === undefined) {
      throw new Error('Golden role schema has an omitted role');
    }
    const declaration = declarationsByProperty.get(`--c-${role.name}`);
    const value = declaration === undefined
      ? ''
      : declaration.slice(declaration.indexOf(':') + 1).trim();
    const isHexDeclaration = value.endsWith(';')
      && StylesheetTestFixture.isHexColor(value.slice(0, -1));
    assert.ok(isHexDeclaration,
      `:root must declare --c-${role.name} as a hex value`);
  }

  // 2. forced-colors block exists and maps each role's CSS var to a system
  //    token derived from the schema's intent declaration.
  assert.ok(out.forcedColors.includes('@media (forced-colors: active)'),
    'forced-colors block must be a (forced-colors: active) media query');

  const FORCED_BY_INTENT: Readonly<Record<string, string>> = {
    'accent':     'Highlight',
    'background': 'Canvas',
    'button':     'ButtonFace',
    'critical':   'CanvasText',
    'link':       'LinkText',
    'muted':      'GrayText',
    'onAccent':   'HighlightText',
    'onButton':   'ButtonText',
    'positive':   'CanvasText',
    'text':       'CanvasText'
  };

  for (let roleIndex = 0; roleIndex < goldenRoleCount; roleIndex++) {
    const role = GOLDEN_ROLES.roles[roleIndex];
    if (role === undefined) {
      throw new Error('Golden role schema has an omitted role');
    }
    const expectedToken = role.intent !== undefined
      ? FORCED_BY_INTENT[role.intent]
      : 'CanvasText';
    assert.ok(expectedToken !== undefined,
      `test setup: GOLDEN_ROLES role '${role.name}' uses intent '${role.intent}' which lacks a FORCED_BY_INTENT mapping in this test`);
    assert.ok(
      out.forcedColors.includes(`--c-${role.name}: ${expectedToken};`),
      `forced-colors must map --c-${role.name} (intent='${role.intent}') to ${expectedToken}`
    );
  }

  // 3. Specifically: the 'foreground' role (intent='text') must NOT collapse
  //    to Canvas (the historic substring-match regression that motivated R1.2).
  assert.ok(!out.forcedColors.includes('--c-foreground: Canvas;'),
    'foreground role must NOT map to Canvas under forced-colors; that would make text invisible');
  assert.ok(out.forcedColors.includes('--c-foreground: CanvasText;'),
    'foreground role with intent=text must map to CanvasText');

  if (process.env.UPDATE_GOLDENS === '1') {
    writeFileSync(CSS_VARS_GOLDEN, actual);
  }

  const expected = readFileSync(CSS_VARS_GOLDEN, 'utf8');
  assert.strictEqual(
    actual,
    expected,
    'emit:cssVars output drifted from the golden fixture; regenerate with UPDATE_GOLDENS=1 if intentional'
  );
});
