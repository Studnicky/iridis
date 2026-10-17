import { type InputInterfaceTypeEntity, RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../../../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../../../_runner/ScenarioRunner.ts';
import { CssVarsScenarioOutputEntity } from '../../../entities/CssVarsScenarioOutputEntity.ts';
import { StylesheetCellsOneToThree } from '../StylesheetCellsOneToThree.ts';
import { StylesheetScenarioFixture } from '../StylesheetScenarioFixture.ts';
import { StylesheetCellsOneToThreeScenarioPatterns } from './StylesheetCellsOneToThreeScenarioPatterns.ts';

interface CssVarsCascadeInputInterface {
  readonly 'colors': InputInterfaceTypeEntity.Type['colors'];
  readonly 'pipeline': readonly string[];
  readonly 'roles': RoleSchemaInterfaceTypeEntity.Type;
}

const allIntentRoles = RoleSchemaInterfaceTypeEntity.intake({
  'name': 'all-intent',
  'roles': [
    { 'intent': 'background', 'name': 'bg', 'required': true },
    { 'intent': 'text', 'name': 'fg', 'required': true },
    { 'intent': 'accent', 'name': 'acc', 'required': true },
    { 'intent': 'muted', 'name': 'muted' },
    { 'intent': 'critical', 'name': 'critical' },
    { 'intent': 'positive', 'name': 'positive' },
    { 'intent': 'link', 'name': 'lnk' },
    { 'intent': 'button', 'name': 'btn' },
    { 'intent': 'onAccent', 'name': 'onAcc' },
    { 'intent': 'onButton', 'name': 'onBtn' }
  ]
});

const textBackgroundRoles = RoleSchemaInterfaceTypeEntity.intake({
  'name': 'text-bg',
  'roles': [
    { 'intent': 'background', 'name': 'bg', 'required': true },
    { 'intent': 'text', 'name': 'text', 'required': true }
  ]
});

const wideGamutRole = RoleSchemaInterfaceTypeEntity.intake({
  'name': 'wide-gamut',
  'roles': [{ 'chromaRange': [0, 0.5], 'intent': 'accent', 'lightnessRange': [0.05, 0.95], 'name': 'primary', 'required': true }]
});

const forcedTokens = new Map<string, string>([
  ['accent', 'Highlight'],
  ['background', 'Canvas'],
  ['button', 'ButtonFace'],
  ['critical', 'CanvasText'],
  ['link', 'LinkText'],
  ['muted', 'GrayText'],
  ['onAccent', 'HighlightText'],
  ['onButton', 'ButtonText'],
  ['positive', 'CanvasText'],
  ['text', 'CanvasText']
]);

export class StylesheetCssVarsCascadeScenarioSuite {
  private static readonly defaultPipeline = Object.freeze(['intake:hex', 'resolve:roles', 'emit:cssVars']);
  private static readonly darkPipeline = Object.freeze(['intake:hex', 'resolve:roles', 'derive:variant', 'emit:cssVars']);
  private static readonly wideGamutPipeline = Object.freeze(['intake:oklch', 'resolve:roles', 'emit:cssVars']);

  private static readonly scenarios: readonly ScenarioInterface<CssVarsCascadeInputInterface, CssVarsScenarioOutputEntity.Type>[] = Object.freeze([
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=3, scenario=forced-colors-present] no throw');
        if (output === undefined) {
          throw new Error('[cell=3, scenario=forced-colors-present] output is defined');
        }
        assert.match(output.cssVars.forcedColors, StylesheetCellsOneToThreeScenarioPatterns.FORCED_COLORS, '[cell=3, scenario=forced-colors-present] forced-colors block present');
        assert.match(output.cssVars.forcedColors, StylesheetCellsOneToThreeScenarioPatterns.ROOT, '[cell=3, scenario=forced-colors-present] forced-colors wraps :root');
      },
      'input': {
        'colors': ['#5b21b6'],
        'pipeline': StylesheetCssVarsCascadeScenarioSuite.defaultPipeline,
        'roles': StylesheetCellsOneToThree.SINGLE_ROLE_SCHEMA
      },
      'kind': 'happy',
      'name': 'forcedColors block always emitted and contains @media (forced-colors: active)'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=3, scenario=all-intents] no throw');
        if (output === undefined) {
          throw new Error('[cell=3, scenario=all-intents] output is defined');
        }
        const forcedColors = output.cssVars.forcedColors;
        for (let index = 0; index < allIntentRoles.roles.length; index += 1) {
          const role = allIntentRoles.roles[index];
          if (role === undefined) {
            throw new Error('[cell=3, scenario=all-intents] role is defined');
          }
          const variableSuffix = StylesheetCssVarsCascadeScenarioSuite.variableSuffix(role.name);
          const expectedToken = forcedTokens.get(role.intent ?? '') ?? 'CanvasText';
          assert.ok(forcedColors.includes(`--c-${variableSuffix}: ${expectedToken};`), `[cell=3, scenario=all-intents] role '${role.name}' (intent=${role.intent}) maps to ${expectedToken}`);
        }
      },
      'input': {
        'colors': ['#1a1a2e', '#e0e0e0', '#7b2d8b', '#888', '#b00020', '#388e3c', '#0066cc', '#1976d2', '#ffffff', '#fff9c4'],
        'pipeline': StylesheetCssVarsCascadeScenarioSuite.defaultPipeline,
        'roles': allIntentRoles
      },
      'kind': 'happy',
      'name': 'all intent types map to correct forced-colors system tokens'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=3, scenario=text-not-canvas] no throw');
        if (output === undefined) {
          throw new Error('[cell=3, scenario=text-not-canvas] output is defined');
        }
        const forcedColors = output.cssVars.forcedColors;
        assert.doesNotMatch(forcedColors, StylesheetCellsOneToThreeScenarioPatterns.TEXT_CANVAS, '[cell=3, scenario=text-not-canvas] text role must NOT map to Canvas (legibility regression guard)');
        assert.match(forcedColors, StylesheetCellsOneToThreeScenarioPatterns.TEXT_CANVAS_TEXT, '[cell=3, scenario=text-not-canvas] text role maps to CanvasText');
      },
      'input': {
        'colors': ['#1a1a2e', '#e0e0e0'],
        'pipeline': StylesheetCssVarsCascadeScenarioSuite.defaultPipeline,
        'roles': textBackgroundRoles
      },
      'kind': 'happy',
      'name': 'text-intent role maps to CanvasText (not Canvas) in forced-colors'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=3, scenario=no-intent-fallback] no throw');
        if (output === undefined) {
          throw new Error('[cell=3, scenario=no-intent-fallback] output is defined');
        }
        assert.match(output.cssVars.forcedColors, StylesheetCellsOneToThreeScenarioPatterns.PRIMARY_CANVAS_TEXT, '[cell=3, scenario=no-intent-fallback] undeclared intent falls to CanvasText');
      },
      'input': {
        'colors': ['#5b21b6'],
        'pipeline': StylesheetCssVarsCascadeScenarioSuite.defaultPipeline,
        'roles': StylesheetCellsOneToThree.SINGLE_ROLE_SCHEMA
      },
      'kind': 'edge',
      'name': 'role without intent declaration falls safe to CanvasText in forced-colors'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=3, scenario=no-dark-scheme] no throw');
        if (output === undefined) {
          throw new Error('[cell=3, scenario=no-dark-scheme] output is defined');
        }
        assert.strictEqual(output.cssVars.darkScheme, '', '[cell=3, scenario=no-dark-scheme] darkScheme empty without derive:variant');
        assert.ok(!output.cssVars.full.includes('@media (prefers-color-scheme: dark)'), '[cell=3, scenario=no-dark-scheme] full contains no dark-scheme media query');
      },
      'input': {
        'colors': ['#5b21b6'],
        'pipeline': StylesheetCssVarsCascadeScenarioSuite.defaultPipeline,
        'roles': StylesheetCellsOneToThree.SINGLE_ROLE_SCHEMA
      },
      'kind': 'edge',
      'name': 'dark-scheme block absent when derive:variant not in pipeline'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=3, scenario=dark-scheme-present] no throw');
        if (output === undefined) {
          throw new Error('[cell=3, scenario=dark-scheme-present] output is defined');
        }
        assert.match(output.cssVars.darkScheme, StylesheetCellsOneToThreeScenarioPatterns.DARK_SCHEME, '[cell=3, scenario=dark-scheme-present] darkScheme has media query');
        assert.match(output.cssVars.darkScheme, StylesheetCellsOneToThreeScenarioPatterns.ROOT, '[cell=3, scenario=dark-scheme-present] darkScheme wraps :root');
      },
      'input': {
        'colors': ['#5b21b6', '#c4b5fd'],
        'pipeline': StylesheetCssVarsCascadeScenarioSuite.darkPipeline,
        'roles': StylesheetCellsOneToThree.TWO_ROLE_SCHEMA
      },
      'kind': 'happy',
      'name': 'dark-scheme block present and wraps :root when derive:variant in pipeline'
    },
    {
      'assert': (output, error): void => {
        assert.strictEqual(error, undefined, '[cell=3, scenario=cascade-order] no throw');
        if (output === undefined) {
          throw new Error('[cell=3, scenario=cascade-order] output is defined');
        }
        const full = output.cssVars.full;
        const rootIndex = full.indexOf(':root');
        const supportsIndex = full.indexOf(StylesheetCellsOneToThreeScenarioPatterns.SUPPORTS);
        const forcedIndex = full.indexOf(StylesheetCellsOneToThreeScenarioPatterns.FORCED_COLORS_PREFIX);
        assert.ok(rootIndex >= 0, '[cell=3, scenario=cascade-order] :root present in full');
        assert.ok(supportsIndex >= 0, '[cell=3, scenario=cascade-order] @supports present in full');
        assert.ok(forcedIndex >= 0, '[cell=3, scenario=cascade-order] @media forced-colors present in full');
        assert.ok(rootIndex < supportsIndex, '[cell=3, scenario=cascade-order] :root precedes @supports');
        assert.ok(supportsIndex < forcedIndex, '[cell=3, scenario=cascade-order] @supports precedes @media forced-colors');
      },
      'input': {
        'colors': [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
        'pipeline': StylesheetCssVarsCascadeScenarioSuite.wideGamutPipeline,
        'roles': wideGamutRole
      },
      'kind': 'happy',
      'name': 'cascade order in full: :root precedes @supports precedes @media forced-colors'
    }
  ]);

  static async run(): Promise<void> {
    await new ScenarioRunner<CssVarsCascadeInputInterface, CssVarsScenarioOutputEntity.Type>(
      'StylesheetPlugin :: cell-3 :: emit:cssVars.cascade',
      StylesheetCssVarsCascadeScenarioSuite.runScenario
    ).run(StylesheetCssVarsCascadeScenarioSuite.scenarios);
  }

  private static runScenario(input: CssVarsCascadeInputInterface): CssVarsScenarioOutputEntity.Type {
    const engine = StylesheetScenarioFixture.engine();
    engine.pipeline(input.pipeline);
    const state = engine.run(StylesheetScenarioFixture.input(input.colors, input.roles));
    const result = CssVarsScenarioOutputEntity.intake({ 'cssVars': state.outputs['stylesheet:cssVars'] });
    return result;
  }

  private static variableSuffix(roleName: string): string {
    const result = roleName.replace(StylesheetCellsOneToThreeScenarioPatterns.UPPERCASE_CHARACTER, StylesheetCssVarsCascadeScenarioSuite.toKebabCase);
    return result;
  }

  private static toKebabCase(match: string): string {
    const result = `-${match.toLowerCase()}`;
    return result;
  }
}
