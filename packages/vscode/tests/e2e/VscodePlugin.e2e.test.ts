/**
 * VscodePlugin — scenario-matrix e2e suite.
 *
 * Subject: `VscodePlugin` and the seven vscode tasks it registers.
 * Drives the full intake → resolve → expand → enforce → derive →
 * vscode:expandTokens → vscode:applyModifiers → emit:* pipeline.
 *
 * Cells:
 *   1. plugin-shape        — singleton, version, task list, manifest fields
 *   2. workbench-colors    — 129-key palette, key slots present, sRGB/P3 routing
 *   3. semantic-rules      — base rules, modifier-selector cross-product, fontStyle
 *   4. theme-json-assembly — assembled ThemeJsonInterfaceType shape invariants
 *   5. token-colors        — tokenColors array from SCOPE_MAPPINGS + baseTokens
 *   6. p3-propagation      — wide-gamut input surfaces P3 form in direct-passthrough slots
 *   7. math-derived-slots  — math-derived and alpha-suffix slots never emit P3
 *   8. unhappy-paths       — missing prerequisite tasks, truncated pipelines, missing roles
 */

import type {
  ColorRecordInterfaceType,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  PluginInterface,
  RoleSchemaInterfaceType,
  TaskInterface
} from '@studnicky/iridis';
import type {
  SemanticRuleEntryInterfaceType,
  ThemeJsonInterfaceType,
  TokenColorRuleInterfaceType
} from '@studnicky/iridis-vscode/types';

import {
  applyModifiers,
  deriveVscodeUiRoles,
  emitVscodeSemanticRules,
  emitVscodeThemeJson,
  emitVscodeUiPalette,
  expandTokens,
  vscodePlugin
} from '@studnicky/iridis-vscode';
import { consoleLogger, Engine }       from '@studnicky/iridis/engine';
import { colorRecordFactory, luminance } from '@studnicky/iridis/math';
import { coreTasks }                   from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test }    from 'node:test';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { VSCODE_ROLE_SCHEMAS_16 } from '../../src/index.ts';

const roleSchema16 = VSCODE_ROLE_SCHEMAS_16.dark;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Sixteen in-sRGB seeds that derive the complete VS Code role vocabulary. */
const SEEDS_SRGB: readonly string[] = [
  '#0d1117', '#e6edf3', '#161b22', '#7d8590',
  '#8b5cf6', '#a78bfa', '#22d3ee', '#34d399',
  '#fb7185', '#fbbf24', '#f59e0b', '#737373',
  '#ef4444', '#facc15', '#3b82f6', '#10b981'
];

/**
 * Same 16 seeds but with one wide-gamut display-p3 string at index 4
 * (the keyword / accent slot).
 */
const SEEDS_WITH_P3: readonly string[] = [
  '#0d1117', '#e6edf3', '#161b22', '#7d8590',
  'color(display-p3 0.70 0.40 1.00)',
  '#e11d48', '#22d3ee', '#34d399',
  '#e11d48', '#fbbf24', '#f59e0b', '#737373',
  '#ef4444', '#facc15', '#3b82f6', '#10b981'
];

await test('VscodePlugin :: role schemas :: dark and light expose the complete 16-role vocabulary', () => {
  const expected = [
    'background', 'foreground', 'surface', 'muted', 'keyword', 'type', 'function', 'variable',
    'string', 'number', 'constant', 'comment', 'error', 'warning', 'info', 'success'
  ];
  const schemas: readonly (readonly ['dark' | 'light', RoleSchemaInterfaceType])[] = [
    ['dark', VSCODE_ROLE_SCHEMAS_16.dark],
    ['light', VSCODE_ROLE_SCHEMAS_16.light]
  ];
  for (let schemaCount = schemas.length, schemaIndex = 0; schemaIndex < schemaCount; schemaIndex += 1) {
    const [framing, schema] = schemas[schemaIndex]!;
    const roleNames: string[] = [];
    const roleCount = schema.roles.length;
    for (let index = 0; index < roleCount; index += 1) {
      const role = schema.roles[index];
      if (role === undefined) {
        throw new TypeError(`Missing role definition at ${index}`);
      }
      roleNames.push(role.name);
    }
    assert.deepStrictEqual(roleNames, expected, `${framing} schema role vocabulary`);
    assert.ok(!roleNames.includes('accent'), `${framing} 16-role view leaves accent to vscode:deriveUiRoles`);
  }
});

/** Full hex pipeline (intake:hex) */
const PIPELINE_HEX: readonly string[] = [
  'intake:hex',
  'resolve:roles',
  'expand:family',
  'vscode:deriveUiRoles',
  'enforce:contrast',
  'derive:variant',
  'vscode:expandTokens',
  'vscode:applyModifiers',
  'emit:vscodeSemanticRules',
  'emit:vscodeUiPalette',
  'emit:vscodeThemeJson'
];

/** Wide-gamut pipeline (intake:any handles both hex and p3 strings) */
const PIPELINE_ANY: readonly string[] = [
  'intake:any',
  'resolve:roles',
  'expand:family',
  'vscode:deriveUiRoles',
  'enforce:contrast',
  'derive:variant',
  'vscode:expandTokens',
  'vscode:applyModifiers',
  'emit:vscodeSemanticRules',
  'emit:vscodeUiPalette',
  'emit:vscodeThemeJson'
];

/** Build a fresh Engine with all core tasks + vscodePlugin adopted. */

class VscodeTestData {
  static engine(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) {engine.tasks.register(task);}
    engine.adopt(vscodePlugin);
    return engine;
  }

  static get<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
    if (!Object.hasOwn(record, key)) {return undefined;}
    return record[key];
  }

  static runFull(
    seeds: readonly string[],
    pipeline: readonly string[] = PIPELINE_HEX
  ): PaletteStateInterface {
    const engine = VscodeTestData.engine();
    engine.pipeline(pipeline);
    return engine.run({ 'colors': seeds, 'roles': roleSchema16 } as InputInterface);
  }

  /** Same as {@link runFull} but sets `input.runtime.framing` explicitly. */
  static runFullWithFraming(
    seeds: readonly string[],
    framing: 'dark' | 'light' | undefined,
    pipeline: readonly string[] = PIPELINE_HEX
  ): PaletteStateInterface {
    const engine = VscodeTestData.engine();
    engine.pipeline(pipeline);
    const roleSchema = framing === 'light' ? VSCODE_ROLE_SCHEMAS_16.light : VSCODE_ROLE_SCHEMAS_16.dark;
    const input: InputInterface = {
      'bypass':    undefined,
      'colors':    seeds,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     roleSchema,
      'runtime':   { 'colorSpace': undefined, 'extra': undefined, 'framing': framing }
    };
    return engine.run(input);
  }
}

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
//
// VscodePlugin is a singleton class instance. The plugin must advertise a
// stable name and version, expose exactly seven tasks by name, and each task
// must be an instance of its class and carry the correct manifest.name.
// ---------------------------------------------------------------------------

interface PluginShapeInputInterface {
  readonly 'plugin': PluginInterface;
}
type PluginShapeOutput = {
  readonly 'name':      string;
  readonly 'taskNames': readonly string[];
  readonly 'version':   string;
};

const pluginShapeScenarios: readonly ScenarioRunner.ScenarioInterface<PluginShapeInputInterface, PluginShapeOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,          '[cell=1, scenario=singleton] no throw');
      assert.strictEqual(output!.name,    'vscode', '[cell=1, scenario=singleton] name');
      assert.strictEqual(output!.version, '0.1.0',  '[cell=1, scenario=singleton] version');
      assert.deepStrictEqual(
        output!.taskNames,
        [
          'vscode:seedRoles',
          'vscode:deriveUiRoles',
          'vscode:expandTokens',
          'vscode:applyModifiers',
          'emit:vscodeSemanticRules',
          'emit:vscodeUiPalette',
          'emit:vscodeThemeJson'
        ],
        '[cell=1, scenario=singleton] all seven registered task names in pipeline order'
      );
    },
    'input': { 'plugin': vscodePlugin },
    'kind': 'happy',
    'name': 'singleton exposes name version and seven tasks'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=class-instance] no throw');
      assert.strictEqual(vscodePlugin.constructor.name, 'VscodePlugin', '[cell=1, scenario=class-instance] is VscodePlugin');
      assert.ok(output!.name.length > 0,              '[cell=1, scenario=class-instance] name non-empty');
    },
    'input': { 'plugin': vscodePlugin },
    'kind': 'happy',
    'name': 'vscodePlugin is a singleton class instance'
  },
  {
    'assert': function(_output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-classes] no throw');
      assert.strictEqual(expandTokens.constructor.name,            'ExpandTokens',            '[cell=1, scenario=task-classes] expandTokens class');
      assert.strictEqual(applyModifiers.constructor.name,          'ApplyModifiers',          '[cell=1, scenario=task-classes] applyModifiers class');
      assert.strictEqual(emitVscodeSemanticRules.constructor.name, 'EmitVscodeSemanticRules', '[cell=1, scenario=task-classes] emitVscodeSemanticRules class');
      assert.strictEqual(emitVscodeUiPalette.constructor.name,     'EmitVscodeUiPalette',     '[cell=1, scenario=task-classes] emitVscodeUiPalette class');
      assert.strictEqual(emitVscodeThemeJson.constructor.name,     'EmitVscodeThemeJson',     '[cell=1, scenario=task-classes] emitVscodeThemeJson class');
      // Manifest names match task names
      assert.strictEqual(expandTokens.manifest.name,            'vscode:expandTokens',         '[cell=1, scenario=task-classes] expandTokens manifest.name');
      assert.strictEqual(applyModifiers.manifest.name,          'vscode:applyModifiers',       '[cell=1, scenario=task-classes] applyModifiers manifest.name');
      assert.strictEqual(emitVscodeSemanticRules.manifest.name, 'emit:vscodeSemanticRules',    '[cell=1, scenario=task-classes] emitVscodeSemanticRules manifest.name');
      assert.strictEqual(emitVscodeUiPalette.manifest.name,     'emit:vscodeUiPalette',        '[cell=1, scenario=task-classes] emitVscodeUiPalette manifest.name');
      assert.strictEqual(emitVscodeThemeJson.manifest.name,     'emit:vscodeThemeJson',        '[cell=1, scenario=task-classes] emitVscodeThemeJson manifest.name');
    },
    'input': { 'plugin': vscodePlugin },
    'kind': 'happy',
    'name': 'each task is the correct class instance with matching manifest.name'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=tasks-fresh] no throw');
      const t1 = vscodePlugin.tasks();
      const t2 = vscodePlugin.tasks();
      assert.notStrictEqual(t1, t2, '[cell=1, scenario=tasks-fresh] calls return distinct arrays');
      assert.deepStrictEqual(
        t1.map((task) => { const result = task.name; return result; }),
        output!.taskNames,
        '[cell=1, scenario=tasks-fresh] first call preserves the registered task order'
      );
      assert.deepStrictEqual(
        t2.map((task) => { const result = task.name; return result; }),
        output!.taskNames,
        '[cell=1, scenario=tasks-fresh] second call preserves the registered task order'
      );
    },
    'input': { 'plugin': vscodePlugin },
    'kind': 'edge',
    'name': 'tasks() returns a fresh array on every call (not a shared reference)'
  }
];

await new ScenarioRunner<PluginShapeInputInterface, PluginShapeOutput>(
  'VscodePlugin :: cell-1 :: plugin-shape',
  (input) => {return {
    'name':      input.plugin.name,
    'taskNames': input.plugin.tasks().map((t: TaskInterface) => { const result = t.name; return result; }),
    'version':   input.plugin.version
  };}
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — workbench colors (outputs.vscode.workbenchColors)
//
// emit:vscodeUiPalette emits 129 VS Code workbench-color slots from the
// resolved 16-role palette. This cell asserts:
//   - the slot map is populated with expected UI keys
//   - direct-passthrough slots carry the role's color form (hex for sRGB roles)
//   - math-derived and alpha-suffix slots produce 6- or 8-digit sRGB hex
//   - theme type ('dark' | 'light') is determined by background luminance
// ---------------------------------------------------------------------------

type WorkbenchColorsInput = {
  readonly 'pipeline': readonly string[];
  readonly 'seeds':    readonly string[];
};
type WorkbenchColorsOutput = {
  readonly 'colorCount':     number;
  readonly 'colors':         Record<string, string>;
  readonly 'themeType':      string;
};

const workbenchColorsScenarios: readonly ScenarioRunner.ScenarioInterface<WorkbenchColorsInput, WorkbenchColorsOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,       '[cell=2, scenario=dark-palette] no throw');
      assert.strictEqual(output!.themeType, 'dark', '[cell=2, scenario=dark-palette] themeType dark');
      assert.ok(output!.colorCount >= 50,         '[cell=2, scenario=dark-palette] at least 50 colors');
      // Mandatory UI keys that consumers depend on
      assert.ok('editor.background'        in output!.colors, '[cell=2, scenario=dark-palette] editor.background present');
      assert.ok('editor.foreground'        in output!.colors, '[cell=2, scenario=dark-palette] editor.foreground present');
      assert.ok('activityBar.background'   in output!.colors, '[cell=2, scenario=dark-palette] activityBar.background present');
      assert.ok('activityBar.foreground'   in output!.colors, '[cell=2, scenario=dark-palette] activityBar.foreground present');
      assert.ok('sideBar.background'       in output!.colors, '[cell=2, scenario=dark-palette] sideBar.background present');
      assert.ok('statusBar.background'     in output!.colors, '[cell=2, scenario=dark-palette] statusBar.background present');
      assert.ok('tab.activeBackground'     in output!.colors, '[cell=2, scenario=dark-palette] tab.activeBackground present');
      assert.ok('terminal.background'      in output!.colors, '[cell=2, scenario=dark-palette] terminal.background present');
      assert.ok('editorCursor.foreground'  in output!.colors, '[cell=2, scenario=dark-palette] editorCursor.foreground present');
      assert.ok('errorForeground'          in output!.colors, '[cell=2, scenario=dark-palette] errorForeground present');
      assert.ok('focusBorder'              in output!.colors, '[cell=2, scenario=dark-palette] focusBorder present');
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'dark input palette produces dark themeType and populates key slots'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-strings] no throw');
      for (const [slot, value] of Object.entries(output!.colors)) {
        assert.strictEqual(typeof value, 'string', `[cell=2, scenario=all-strings] slot ${slot} is a string`);
        assert.ok(value.length > 0, `[cell=2, scenario=all-strings] slot ${slot} is non-empty`);
      }
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'all workbench color values are strings'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=srgb-shape] no throw');
      for (const [slot, value] of Object.entries(output!.colors)) {
        assert.match(value, /^#[0-9a-f]{6,8}$/, `[cell=2, scenario=srgb-shape] ${slot} is canonical sRGB hex, got: ${value}`);
      }
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'sRGB-only seeds produce canonical hexadecimal workbench colors'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=math-derived-hex] no throw');
      const mathDerivedSlots = [
        'activityBar.background',
        'activityBar.border',
        'activityBarBadge.foreground',
        'badge.foreground',
        'button.foreground',
        'button.hoverBackground',
        'button.secondaryBackground',
        'button.secondaryHoverBackground',
        'editor.findMatchBackground',
        'editor.findMatchHighlightBackground',
        'editor.lineHighlightBackground',
        'editor.selectionBackground',
        'editor.selectionHighlightBackground',
        'editorBracketMatch.background',
        'editorBracketMatch.border',
        'editorIndentGuide.activeBackground1',
        'editorIndentGuide.background1',
        'focusBorder',
        'inputOption.activeBackground',
        'scrollbarSlider.activeBackground',
        'scrollbarSlider.background',
        'scrollbarSlider.hoverBackground',
        'sideBar.foreground',
        'statusBar.foreground',
        'terminal.ansiBrightBlue',
        'terminal.ansiBrightCyan',
        'terminal.ansiBrightGreen',
        'terminal.ansiBrightMagenta',
        'terminal.ansiBrightRed',
        'terminal.ansiBrightYellow',
        'titleBar.activeForeground'
      ];
      for (const slot of mathDerivedSlots) {
        const value = VscodeTestData.get(output!.colors, slot);
        assert.ok(typeof value === 'string',          `[cell=2, scenario=math-derived-hex] ${slot} is a string`);
        assert.ok(!value.includes('display-p3'),      `[cell=2, scenario=math-derived-hex] ${slot} must not contain display-p3, got ${value}`);
        assert.match(value, /^#[0-9a-f]{6,8}$/,      `[cell=2, scenario=math-derived-hex] ${slot} must be 6- or 8-digit hex, got ${value}`);
      }
    },
    'input': { 'pipeline': PIPELINE_ANY, 'seeds': SEEDS_WITH_P3 },
    'kind': 'edge',
    'name': 'math-derived slots produce 6- or 8-digit sRGB hex even with wide-gamut input'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=p3-passthrough] no throw');
      const cursor = VscodeTestData.get(output!.colors, 'editorCursor.foreground') ?? '';
      const tabBorder = VscodeTestData.get(output!.colors, 'tab.activeBorder') ?? '';
      const activityBadge = VscodeTestData.get(output!.colors, 'activityBarBadge.background') ?? '';
      assert.match(cursor, /^#[0-9a-f]{6,8}$/, '[cell=2, scenario=p3-passthrough] editorCursor.foreground gamut-maps wide-gamut input to hex');
      assert.match(tabBorder, /^#[0-9a-f]{6,8}$/, '[cell=2, scenario=p3-passthrough] tab.activeBorder gamut-maps wide-gamut input to hex');
      assert.match(activityBadge, /^#[0-9a-f]{6,8}$/, '[cell=2, scenario=p3-passthrough] activityBarBadge.background gamut-maps wide-gamut input to hex');
    },
    'input': { 'pipeline': PIPELINE_ANY, 'seeds': SEEDS_WITH_P3 },
    'kind': 'edge',
    'name': 'direct-passthrough accent slots gamut-map wide-gamut input to canonical sRGB hex'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=bright-white] no throw');
      const value = VscodeTestData.get(output!.colors, 'terminal.ansiBrightWhite') ?? '';
      assert.match(value, /^#[0-9a-f]{6,8}$/, '[cell=2, scenario=bright-white] terminal.ansiBrightWhite is derived as hex');
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'edge',
    'name': 'terminal.ansiBrightWhite is derived from terminal.ansiWhite rather than a literal'
  }
];

await new ScenarioRunner<WorkbenchColorsInput, WorkbenchColorsOutput>(
  'VscodePlugin :: cell-2 :: workbench-colors',
  (input) => {
    const state     = VscodeTestData.runFull(input.seeds, input.pipeline);
    const colors    = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;
    const themeJson = state.outputs['vscode:themeJson'] as ThemeJsonInterfaceType | undefined;
    const themeType = (themeJson?.type as string | undefined) ?? 'unknown';
    return { 'colorCount': Object.keys(colors).length, 'colors': colors, 'themeType': themeType };
  }
).run(workbenchColorsScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — semantic token rules (metadata.vscode.semanticTokenRules)
//
// vscode:applyModifiers builds one base rule per token type (27 total) and
// one modifier-selector rule per type × modifier (27 × 10 = 270). Rules
// must:
//   - include the 27 base selectors (no dot)
//   - include at least one modifier selector (type.modifier dot form)
//   - carry a foreground string on every rule
//   - carry fontStyle where the transform specifies it
// emit:vscodeSemanticRules projects these into outputs.vscode.semanticTokenRules
// and additionally merges FONT_STYLES for base-token types.
// ---------------------------------------------------------------------------

type SemanticRulesInput = {
  readonly 'seeds': readonly string[];
};
type SemanticRulesOutput = {
  readonly 'metaRules':   Record<string, SemanticRuleEntryInterfaceType>;
  readonly 'outputRules': Record<string, SemanticRuleEntryInterfaceType>;
};

const semanticRulesScenarios: readonly ScenarioRunner.ScenarioInterface<SemanticRulesInput, SemanticRulesOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=rule-count] no throw');
      const selectors    = Object.keys(output!.metaRules);
      const baseRules    = selectors.filter((s) => {return !s.includes('.');});
      const modRules     = selectors.filter((s) => { const result = s.includes('.'); return result; });
      assert.strictEqual(baseRules.length, 27,  '[cell=3, scenario=rule-count] 27 base rules');
      assert.strictEqual(modRules.length,  270, '[cell=3, scenario=rule-count] 270 modifier-selector rules');
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'metadata contains 27 base rules and 270 modifier-selector rules'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=base-foreground] no throw');
      const baseSelectors = Object.keys(output!.metaRules).filter((s) => {return !s.includes('.');});
      for (const sel of baseSelectors) {
        const rule = VscodeTestData.get(output!.metaRules, sel);
        assert.ok(rule !== undefined,                   `[cell=3, scenario=base-foreground] rule exists for ${sel}`);
        assert.ok(typeof rule.foreground === 'string',  `[cell=3, scenario=base-foreground] ${sel} has foreground string`);
        assert.ok((rule.foreground).length > 0, `[cell=3, scenario=base-foreground] ${sel} foreground non-empty`);
      }
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'every base rule carries a foreground string'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=font-style] no throw');
      // 'declaration' transform has fontStyle: 'bold'
      const declBold = Object.entries(output!.metaRules)
        .filter(([sel]) => { const result = sel.endsWith('.declaration'); return result; })
        .some(([, rule]) => {return rule.fontStyle === 'bold';});
      assert.ok(declBold, '[cell=3, scenario=font-style] declaration modifier emits fontStyle bold');
      // 'deprecated' transform has fontStyle: 'strikethrough'
      const deprStrike = Object.entries(output!.metaRules)
        .filter(([sel]) => { const result = sel.endsWith('.deprecated'); return result; })
        .some(([, rule]) => {return rule.fontStyle === 'strikethrough';});
      assert.ok(deprStrike, '[cell=3, scenario=font-style] deprecated modifier emits fontStyle strikethrough');
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'modifier selectors carry fontStyle where MODIFIER_TRANSFORMS specifies it'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                      '[cell=3, scenario=output-rules] no throw');
      const outputSelectors = Object.keys(output!.outputRules);
      const outputBaseRules = outputSelectors.filter((selector) => {return !selector.includes('.');});
      const outputModifierRuleCount = outputSelectors.length - outputBaseRules.length;
      assert.strictEqual(outputBaseRules.length, 27, '[cell=3, scenario=output-rules] 27 output base rules');
      assert.strictEqual(outputModifierRuleCount, 270, '[cell=3, scenario=output-rules] 270 output modifier-selector rules');
      const commentRule = output!.outputRules.comment;
      assert.ok(commentRule !== undefined,                      '[cell=3, scenario=output-rules] comment rule present');
      assert.ok(typeof commentRule.foreground === 'string',     '[cell=3, scenario=output-rules] comment rule has foreground');
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'outputs.vscode.semanticTokenRules has 27 base rules and 270 modifier-selector rules'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=font-style-merge] no throw');
      // FONT_STYLES has comment → italic
      const commentRule = output!.outputRules.comment;
      assert.ok(commentRule !== undefined,             '[cell=3, scenario=font-style-merge] comment rule present');
      assert.strictEqual(commentRule.fontStyle, 'italic', '[cell=3, scenario=font-style-merge] comment fontStyle italic from FONT_STYLES');
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'FONT_STYLES merges italic into comment selector in output rules'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=p3-semantic] no throw');
      const keywordRule = output!.metaRules.keyword;
      assert.ok(keywordRule !== undefined, '[cell=3, scenario=p3-semantic] keyword rule present');
      assert.ok(typeof keywordRule.foreground === 'string', '[cell=3, scenario=p3-semantic] keyword rule has foreground');
      assert.match(keywordRule.foreground, /^#[0-9a-f]{6,8}$/, `[cell=3, scenario=p3-semantic] keyword foreground is canonical sRGB hex, got ${keywordRule.foreground}`);
    },
    'input': { 'seeds': SEEDS_WITH_P3 },
    'kind': 'edge',
    'name': 'wide-gamut input: base rules gamut-map keyword foreground to hex'
  }
];

await new ScenarioRunner<SemanticRulesInput, SemanticRulesOutput>(
  'VscodePlugin :: cell-3 :: semantic-rules',
  (input) => {
    // Use PIPELINE_ANY to accept both seed sets
    const pipeline = input.seeds === SEEDS_WITH_P3 ? PIPELINE_ANY : PIPELINE_HEX;
    const state    = VscodeTestData.runFull(input.seeds, pipeline);
    const metaRules = (state.metadata['vscode:semanticTokenRules'] ?? {}) as Record<string, SemanticRuleEntryInterfaceType>;
    const outputRules = (state.outputs['vscode:semanticTokenRules'] ?? {}) as Record<string, SemanticRuleEntryInterfaceType>;
    return {
      'metaRules':   metaRules,
      'outputRules': outputRules
    };
  }
).run(semanticRulesScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — theme JSON assembly (outputs.vscode.themeJson)
//
// emit:vscodeThemeJson assembles the full ThemeJsonInterfaceType from three
// upstream slots. Shape invariants:
//   - name: non-empty string (default or from metadata.themeName)
//   - type: 'dark' | 'light' (by background luminance)
//   - semanticHighlighting: true
//   - colors: same as workbenchColors (at least 50 entries)
//   - semanticTokenColors: mirrored from semanticTokenRules; font-styled rules
//     become objects, plain foreground rules become plain strings
//   - tokenColors: array of { name, scope, settings } from SCOPE_MAPPINGS
// ---------------------------------------------------------------------------

type ThemeJsonInput = {
  readonly 'pipeline':  readonly string[];
  readonly 'seeds':     readonly string[];
  readonly 'themeName'?: string;
};
type ThemeJsonOutput = {
  readonly 'themeJson':   ThemeJsonInterfaceType;
  readonly 'workbench':   Record<string, string>;
};

const themeJsonScenarios: readonly ScenarioRunner.ScenarioInterface<ThemeJsonInput, ThemeJsonOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                   '[cell=4, scenario=shape] no throw');
      const tj = output!.themeJson;
      assert.ok(typeof tj.name === 'string' && tj.name.length > 0,  '[cell=4, scenario=shape] name non-empty string');
      assert.ok(tj.type === 'dark' || tj.type === 'light',           '[cell=4, scenario=shape] type dark|light');
      assert.strictEqual(tj.semanticHighlighting, true,              '[cell=4, scenario=shape] semanticHighlighting true');
      assert.ok(typeof tj.colors === 'object',                       '[cell=4, scenario=shape] colors is object');
      assert.ok(Object.keys(tj.colors).length >= 50,                 '[cell=4, scenario=shape] colors has at least 50 entries');
      assert.ok(typeof tj.semanticTokenColors === 'object',          '[cell=4, scenario=shape] semanticTokenColors is object');
      assert.strictEqual(Object.keys(tj.semanticTokenColors).length, 297,  '[cell=4, scenario=shape] semanticTokenColors has 297 rules');
      assert.ok(Array.isArray(tj.tokenColors),                       '[cell=4, scenario=shape] tokenColors is array');
      assert.ok(tj.tokenColors.length > 0,                           '[cell=4, scenario=shape] tokenColors non-empty');
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'assembled themeJson satisfies all shape invariants'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=colors-identity] no throw');
      assert.strictEqual(output!.themeJson.colors, output!.workbench, '[cell=4, scenario=colors-identity] themeJson.colors is same reference as workbenchColors');
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'themeJson.colors is the same object as outputs.vscode.workbenchColors'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                              '[cell=4, scenario=default-name] no throw');
      assert.strictEqual(output!.themeJson.name, 'Color Engine Theme', '[cell=4, scenario=default-name] default theme name');
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'themeJson.name defaults to Color Engine Theme when no metadata.themeName'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                 '[cell=4, scenario=dark-type] no throw');
      assert.strictEqual(output!.themeJson.type, 'dark',  '[cell=4, scenario=dark-type] type is dark for dark background');
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'dark background produces dark themeJson.type'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=stc-shape] no throw');
      const stc = output!.themeJson.semanticTokenColors;
      // Find any object-form entry (a rule with fontStyle)
      const objectEntries = Object.entries(stc).filter(([, value]) => {return typeof value === 'object';});
      const stringEntries = Object.entries(stc).filter(([, value]) => {return typeof value === 'string';});
      assert.ok(objectEntries.length > 0,  '[cell=4, scenario=stc-shape] at least one object-form rule (has fontStyle)');
      assert.ok(stringEntries.length > 0,  '[cell=4, scenario=stc-shape] at least one string-form rule (plain foreground)');
      for (const [selector, value] of objectEntries) {
        assert.ok(typeof value === 'object' && typeof value.fontStyle === 'string', `[cell=4, scenario=stc-shape] object rule ${selector} has fontStyle`);
      }
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'semanticTokenColors: font-styled rules are objects, plain rules are strings'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=token-color-shape] no throw');
      for (const entry of output!.themeJson.tokenColors) {
        assert.ok(typeof entry.name === 'string',              '[cell=4, scenario=token-color-shape] entry has name');
        assert.ok(entry.scope !== undefined,                   `[cell=4, scenario=token-color-shape] entry ${entry.name} has scope`);
        assert.ok(typeof entry.settings.foreground === 'string', `[cell=4, scenario=token-color-shape] entry ${entry.name} settings.foreground is string`);
        assert.ok((entry.settings.foreground).length > 0, `[cell=4, scenario=token-color-shape] entry ${entry.name} settings.foreground non-empty`);
      }
    },
    'input': { 'pipeline': PIPELINE_HEX, 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'tokenColors entries have name scope and settings.foreground'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                '[cell=4, scenario=p3-shape] no throw');
      const tj = output!.themeJson;
      assert.strictEqual(tj.semanticHighlighting, true,  '[cell=4, scenario=p3-shape] semanticHighlighting true');
      assert.ok(Object.keys(tj.colors).length >= 50,     '[cell=4, scenario=p3-shape] colors populated');
      assert.ok(tj.tokenColors.length > 0,               '[cell=4, scenario=p3-shape] tokenColors non-empty');
    },
    'input': { 'pipeline': PIPELINE_ANY, 'seeds': SEEDS_WITH_P3 },
    'kind': 'edge',
    'name': 'wide-gamut input: themeJson still satisfies shape invariants'
  }
];

await new ScenarioRunner<ThemeJsonInput, ThemeJsonOutput>(
  'VscodePlugin :: cell-4 :: theme-json-assembly',
  (input) => {
    const state = VscodeTestData.runFull(input.seeds, input.pipeline);
    const themeJson = state.outputs['vscode:themeJson'] as ThemeJsonInterfaceType;
    const workbench = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;
    return {
      'themeJson': themeJson,
      'workbench': workbench
    };
  }
).run(themeJsonScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — tokenColors array
//
// emit:vscodeThemeJson builds tokenColors from SCOPE_MAPPINGS + baseTokens.
// Each entry must carry name, scope (array), and settings.foreground. Keys
// present in baseTokens produce entries; keys absent from baseTokens are
// skipped. The 'comment' entry must exist (comment role always resolves).
// ---------------------------------------------------------------------------

type TokenColorsInput = {
  readonly 'seeds': readonly string[];
};
abstract class TokenColorsOutput {
  abstract readonly 'commentEntry': TokenColorRuleInterfaceType | undefined;
  abstract readonly 'tokenColors': readonly TokenColorRuleInterfaceType[];
}

const tokenColorsScenarios: readonly ScenarioRunner.ScenarioInterface<TokenColorsInput, TokenColorsOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                            '[cell=5, scenario=has-entries] no throw');
      assert.ok(output!.tokenColors.length > 0,                      '[cell=5, scenario=has-entries] tokenColors non-empty');
      assert.ok(output!.commentEntry !== undefined,                   '[cell=5, scenario=has-entries] comment entry present');
      assert.ok(output!.commentEntry.settings.foreground !== undefined, '[cell=5, scenario=has-entries] comment has foreground');
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'tokenColors array has entries and comment entry exists'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=scope-shape] no throw');
      for (const entry of output!.tokenColors) {
        assert.ok(
          typeof entry.scope === 'string' || Array.isArray(entry.scope),
          `[cell=5, scenario=scope-shape] entry ${entry.name} scope is string or array`
        );
      }
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'every tokenColors entry has a string scope or array scope'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=comment-hex] no throw');
      const fg = output!.commentEntry?.settings.foreground;
      assert.ok(typeof fg === 'string', '[cell=5, scenario=comment-hex] comment foreground is string');
      assert.match(fg, /^#[0-9a-f]{6,8}$/, '[cell=5, scenario=comment-hex] comment foreground is hex for sRGB input');
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'tokenColors comment entry foreground is a hex string for sRGB input'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=keyword-p3] no throw');
      const kwEntry = output!.tokenColors.find((e) => {return e.name === 'keyword';});
      assert.ok(kwEntry !== undefined, '[cell=5, scenario=keyword-p3] keyword entry present');
      assert.ok(typeof kwEntry.settings.foreground === 'string', '[cell=5, scenario=keyword-p3] keyword foreground is string');
      assert.match(kwEntry.settings.foreground, /^#[0-9a-f]{6,8}$/, '[cell=5, scenario=keyword-p3] keyword tokenColor gamut-maps to hex');
    },
    'input': { 'seeds': SEEDS_WITH_P3 },
    'kind': 'edge',
    'name': 'wide-gamut keyword tokenColors entry gamut-maps to a hex foreground'
  }
];

await new ScenarioRunner<TokenColorsInput, TokenColorsOutput>(
  'VscodePlugin :: cell-5 :: token-colors',
  (input) => {
    const pipeline  = input.seeds === SEEDS_WITH_P3 ? PIPELINE_ANY : PIPELINE_HEX;
    const state     = VscodeTestData.runFull(input.seeds, pipeline);
    const themeJson = state.outputs['vscode:themeJson'] as ThemeJsonInterfaceType | undefined;
    const tokenColors = themeJson?.tokenColors ?? [];
    const commentEntry = tokenColors.find((e) => {return e.name === 'comment';});
    return { 'commentEntry': commentEntry, 'tokenColors': tokenColors };
  }
).run(tokenColorsScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — P3 propagation through the full pipeline
//
// When the input contains a `color(display-p3 r g b)` string for the accent
// (keyword) role:
//   - state.roles['keyword'].displayP3 must be defined (preserved by resolve:roles)
//   - editorCursor.foreground (direct keyword passthrough) must emit P3 form
//   - tab.activeBorder (direct keyword passthrough) must emit P3 form
//   - math-derived slots derived from keyword hex must NOT emit P3 form
// ---------------------------------------------------------------------------

type P3PropagationInput = {
  readonly 'seeds': readonly string[];
};
abstract class P3PropagationOutput {
  abstract readonly 'cursorForeground': string;
  abstract readonly 'findMatchBg': string;
  abstract readonly 'keywordDisplayP3': boolean;
  abstract readonly 'tabActiveBorder': string;
}

const p3PropagationScenarios: readonly ScenarioRunner.ScenarioInterface<P3PropagationInput, P3PropagationOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=keyword-p3] no throw');
      assert.match(output!.cursorForeground, /^#[0-9a-f]{6,8}$/, '[cell=6, scenario=keyword-p3] wide-gamut input emits cursor hex');
      assert.match(output!.tabActiveBorder, /^#[0-9a-f]{6,8}$/, '[cell=6, scenario=keyword-p3] wide-gamut input emits tab hex');
    },
    'input': { 'seeds': SEEDS_WITH_P3 },
    'kind': 'happy',
    'name': 'wide-gamut keyword input reaches direct slots as canonical sRGB hex'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=p3-direct] no throw');
      assert.match(output!.cursorForeground, /^#[0-9a-f]{6,8}$/, '[cell=6, scenario=p3-direct] editorCursor.foreground is hex');
      assert.match(output!.tabActiveBorder, /^#[0-9a-f]{6,8}$/, '[cell=6, scenario=p3-direct] tab.activeBorder is hex');
    },
    'input': { 'seeds': SEEDS_WITH_P3 },
    'kind': 'happy',
    'name': 'direct keyword slots emit canonical sRGB hex'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=alpha-hex] no throw');
      assert.match(
        output!.findMatchBg,
        /^#[0-9a-f]{8}$/,
        '[cell=6, scenario=alpha-hex] editor.findMatchBackground is 8-digit hex (alpha suffix on hex)'
      );
    },
    'input': { 'seeds': SEEDS_WITH_P3 },
    'kind': 'happy',
    'name': 'template-string alpha slot uses keyword hex not P3'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined,                        '[cell=6, scenario=no-p3] no throw');
      assert.strictEqual(output!.keywordDisplayP3, false,         '[cell=6, scenario=no-p3] sRGB keyword has no displayP3');
      assert.match(output!.cursorForeground, /^#[0-9a-f]{6,8}$/, '[cell=6, scenario=no-p3] editorCursor.foreground is hex for sRGB keyword');
      assert.match(output!.tabActiveBorder,  /^#[0-9a-f]{6,8}$/, '[cell=6, scenario=no-p3] tab.activeBorder is hex for sRGB keyword');
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'edge',
    'name': 'sRGB-only seeds produce hex syntax in direct-passthrough keyword slots'
  }
];

await new ScenarioRunner<P3PropagationInput, P3PropagationOutput>(
  'VscodePlugin :: cell-6 :: p3-propagation',
  (input) => {
    const pipeline = input.seeds === SEEDS_WITH_P3 ? PIPELINE_ANY : PIPELINE_HEX;
    const state    = VscodeTestData.runFull(input.seeds, pipeline);
    const keyword  = state.roles.keyword;
    const colors   = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;
    const cursorForeground = VscodeTestData.get(colors, 'editorCursor.foreground') ?? '';
    const findMatchBackground = VscodeTestData.get(colors, 'editor.findMatchBackground') ?? '';
    const tabActiveBorder = VscodeTestData.get(colors, 'tab.activeBorder') ?? '';
    return {
      'cursorForeground': cursorForeground,
      'findMatchBg':      findMatchBackground,
      'keywordDisplayP3': keyword?.displayP3 !== undefined,
      'tabActiveBorder':  tabActiveBorder
    };
  }
).run(p3PropagationScenarios);

// ---------------------------------------------------------------------------
// Cell 7 — math-derived slot regression
//
// Math-derived (mixHsl / lighten / darken / contrastText) and alpha-suffix
// template slots MUST emit 6- or 8-digit sRGB hex under all inputs.
// Invariant must hold even when the keyword role is driven out of sRGB gamut.
// ---------------------------------------------------------------------------

type MathDerivedInput = {
  readonly 'seeds': readonly string[];
};
type MathDerivedOutput = {
  readonly 'slots': Record<string, string>;
};

const MATH_DERIVED_SLOTS = [
  'activityBar.background',
  'activityBar.border',
  'activityBarBadge.foreground',
  'badge.foreground',
  'button.foreground',
  'button.hoverBackground',
  'button.secondaryBackground',
  'button.secondaryHoverBackground',
  'editor.findMatchBackground',
  'editor.findMatchHighlightBackground',
  'editor.lineHighlightBackground',
  'editor.selectionBackground',
  'editor.selectionHighlightBackground',
  'editorBracketMatch.background',
  'editorBracketMatch.border',
  'editorIndentGuide.activeBackground1',
  'editorIndentGuide.background1',
  'focusBorder',
  'inputOption.activeBackground',
  'scrollbarSlider.activeBackground',
  'scrollbarSlider.background',
  'scrollbarSlider.hoverBackground',
  'sideBar.foreground',
  'statusBar.foreground',
  'terminal.ansiBrightBlue',
  'terminal.ansiBrightCyan',
  'terminal.ansiBrightGreen',
  'terminal.ansiBrightMagenta',
  'terminal.ansiBrightRed',
  'terminal.ansiBrightYellow',
  'titleBar.activeForeground'
] as const;

const mathDerivedScenarios: readonly ScenarioRunner.ScenarioInterface<MathDerivedInput, MathDerivedOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=srgb-hex] no throw');
      for (const slot of MATH_DERIVED_SLOTS) {
        const value = VscodeTestData.get(output!.slots, slot);
        assert.ok(typeof value === 'string',     `[cell=7, scenario=srgb-hex] ${slot} is string`);
        assert.ok(!value.includes('display-p3'), `[cell=7, scenario=srgb-hex] ${slot} no P3`);
        assert.match(value, /^#[0-9a-f]{6,8}$/, `[cell=7, scenario=srgb-hex] ${slot} is hex`);
      }
    },
    'input': { 'seeds': SEEDS_SRGB },
    'kind': 'happy',
    'name': 'sRGB input: math-derived slots are all 6- or 8-digit hex'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=p3-input-hex] no throw');
      for (const slot of MATH_DERIVED_SLOTS) {
        const value = VscodeTestData.get(output!.slots, slot);
        assert.ok(typeof value === 'string',     `[cell=7, scenario=p3-input-hex] ${slot} is string`);
        assert.ok(!value.includes('display-p3'), `[cell=7, scenario=p3-input-hex] ${slot} no P3, got ${value}`);
        assert.match(value, /^#[0-9a-f]{6,8}$/, `[cell=7, scenario=p3-input-hex] ${slot} is hex, got ${value}`);
      }
    },
    'input': { 'seeds': SEEDS_WITH_P3 },
    'kind': 'edge',
    'name': 'wide-gamut input: math-derived slots remain 6- or 8-digit hex (P3 cannot survive alpha-suffix)'
  }
];

await new ScenarioRunner<MathDerivedInput, MathDerivedOutput>(
  'VscodePlugin :: cell-7 :: math-derived-slots',
  (input) => {
    const pipeline = input.seeds === SEEDS_WITH_P3 ? PIPELINE_ANY : PIPELINE_HEX;
    const state    = VscodeTestData.runFull(input.seeds, pipeline);
    const colors   = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;
    const slots: Record<string, string> = {};
    for (const slot of MATH_DERIVED_SLOTS) {
      slots[slot] = colors[slot] ?? '';
    }
    return { 'slots': slots };
  }
).run(mathDerivedScenarios);

// ---------------------------------------------------------------------------
// Cell 8 — unhappy paths (missing prerequisites, truncated pipelines)
//
// Tasks enforce their own dependency invariants by throwing when the upstream
// slot they read is absent. This cell exercises each throw path.
// ---------------------------------------------------------------------------

interface UnhappyInputInterface {
  readonly 'description': string;
  readonly 'run':         () => PaletteStateInterface;
}

class UnhappyScenario {
  static execute(input: UnhappyInputInterface): PaletteStateInterface {
    if (typeof input.run !== 'function') {
      throw new TypeError('Unhappy scenario requires an executable run function');
    }
    return input.run();
  }
}

const unhappyScenarios: readonly ScenarioRunner.ScenarioInterface<UnhappyInputInterface, PaletteStateInterface>[] = [
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=apply-no-expand] expected throw from pipeline requires check');
      assert.match(
        (error).message,
        /vscode:applyModifiers.*vscode:expandTokens|requires.*vscode:expandTokens/,
        '[cell=8, scenario=apply-no-expand] error names the dependent and the missing requirement'
      );
    },
    'input': {
      'description': 'applyModifiers manifest.requires vscode:expandTokens — engine.pipeline enforces this',
      'run': () => {
        const engine = VscodeTestData.engine();
        // Engine.pipeline() enforces manifest.requires at build-time:
        // 'vscode:applyModifiers' requires 'vscode:expandTokens' which is absent here.
        engine.pipeline([
          'intake:hex',
          'resolve:roles',
          'expand:family',
          'enforce:contrast',
          'derive:variant',
          'vscode:applyModifiers'
        ]);
        return engine.run({ 'colors': SEEDS_SRGB, 'roles': roleSchema16 } as InputInterface);
      }
    },
    'kind': 'unhappy',
    'name': 'vscode:applyModifiers without expandTokens: pipeline rejects missing requires'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=semantic-no-apply] expected throw from pipeline requires check');
      assert.match(
        (error).message,
        /emit:vscodeSemanticRules.*vscode:applyModifiers|requires.*vscode:applyModifiers/,
        '[cell=8, scenario=semantic-no-apply] error names the dependent and the missing requirement'
      );
    },
    'input': {
      'description': 'emitVscodeSemanticRules manifest.requires vscode:applyModifiers — engine.pipeline enforces this',
      'run': () => {
        const engine = VscodeTestData.engine();
        engine.pipeline([
          'intake:hex',
          'resolve:roles',
          'expand:family',
          'enforce:contrast',
          'derive:variant',
          'vscode:expandTokens',
          'emit:vscodeSemanticRules'
        ]);
        return engine.run({ 'colors': SEEDS_SRGB, 'roles': roleSchema16 } as InputInterface);
      }
    },
    'kind': 'unhappy',
    'name': 'emit:vscodeSemanticRules without applyModifiers: pipeline rejects missing requires'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=theme-no-palette] expected throw from pipeline requires check');
      assert.match(
        (error).message,
        /emit:vscodeThemeJson.*emit:vscodeUiPalette|requires.*emit:vscodeUiPalette/,
        '[cell=8, scenario=theme-no-palette] error names the dependent and the missing requirement'
      );
    },
    'input': {
      'description': 'emitVscodeThemeJson requires emit:vscodeUiPalette — engine.pipeline enforces this',
      'run': () => {
        const engine = VscodeTestData.engine();
        engine.pipeline([
          'intake:hex',
          'resolve:roles',
          'expand:family',
          'enforce:contrast',
          'derive:variant',
          'vscode:expandTokens',
          'vscode:applyModifiers',
          'emit:vscodeSemanticRules',
          'emit:vscodeThemeJson'
        ]);
        return engine.run({ 'colors': SEEDS_SRGB, 'roles': roleSchema16 } as InputInterface);
      }
    },
    'kind': 'unhappy',
    'name': 'emit:vscodeThemeJson without uiPalette: pipeline rejects missing requires'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=theme-no-semantic] expected throw from pipeline requires check');
      assert.match(
        (error).message,
        /emit:vscodeThemeJson.*emit:vscodeSemanticRules|requires.*emit:vscodeSemanticRules/,
        '[cell=8, scenario=theme-no-semantic] error names the dependent and the missing requirement'
      );
    },
    'input': {
      'description': 'emitVscodeThemeJson requires emit:vscodeSemanticRules — engine.pipeline enforces this',
      'run': () => {
        const engine = VscodeTestData.engine();
        engine.pipeline([
          'intake:hex',
          'resolve:roles',
          'expand:family',
          'vscode:deriveUiRoles',
          'enforce:contrast',
          'derive:variant',
          'vscode:expandTokens',
          'vscode:applyModifiers',
          'emit:vscodeUiPalette',
          'emit:vscodeThemeJson'
        ]);
        return engine.run({ 'colors': SEEDS_SRGB, 'roles': roleSchema16 } as InputInterface);
      }
    },
    'kind': 'unhappy',
    'name': 'emit:vscodeThemeJson without semanticRules: pipeline rejects missing requires'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=expand-no-roles] expected throw');
      assert.match(
        (error).message,
        /ExpandTokens.*roles.*background|requires roles/,
        '[cell=8, scenario=expand-no-roles] message names missing roles'
      );
    },
    'input': {
      'description': 'expandTokens invoked with empty roles map',
      'run': () => {
        // Register only the vscode tasks, run expandTokens with no upstream
        const engine = new Engine();
        engine.adopt(vscodePlugin);
        engine.pipeline(['vscode:expandTokens']);
        // No roles in input — roles map will be empty after running
        return engine.run({
          'bypass':    undefined,
          'colors':    [],
          'contrast':  undefined,
          'emit':      undefined,
          'maxColors': undefined,
          'metadata':  undefined,
          'roles':     roleSchema16,
          'runtime':   undefined
        });
      }
    },
    'kind': 'unhappy',
    'name': 'vscode:expandTokens without required roles (no intake or resolve) throws'
  }
];

await new ScenarioRunner<UnhappyInputInterface, PaletteStateInterface>(
  'VscodePlugin :: cell-8 :: unhappy-paths',
  UnhappyScenario.execute
).run(unhappyScenarios);

// ---------------------------------------------------------------------------
// Cell 9 — runtime.framing selects the emitted surface
//
// `state.runtime.framing` must actually change what gets emitted:
//   - unset: byte-identical to a run with no `runtime` field at all
//     (framing is additive, not a breaking change for existing callers)
//   - 'dark' vs 'light' over IDENTICAL seeds: different editor.background,
//     different themeJson.type, AND different syntax-highlighting colors
//     (comment tokenColor) — proving vscode:expandTokens / vscode:applyModifiers
//     honor framing too, not just the two emit:* tasks
//   - the 'light' request actually produces a light-appearing background
//     (WCAG relative luminance > 0.5), not merely "some other" background
// ---------------------------------------------------------------------------

type FramingOutput = {
  readonly 'colors':       Record<string, string>;
  readonly 'commentForeground': string | undefined;
  readonly 'themeType':         string;
  readonly 'unsetColors':       Record<string, string>;
};

const framingScenarios: readonly ScenarioRunner.ScenarioInterface<'dark' | 'light' | undefined, FramingOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=unset] no throw');
      assert.strictEqual(
        VscodeTestData.get(output!.colors, 'editor.background'),
        VscodeTestData.get(output!.unsetColors, 'editor.background'),
        '[cell=9, scenario=unset] runtime.framing unset produces the same editor.background as omitting runtime entirely'
      );
    },
    'input': undefined,
    'kind': 'happy',
    'name': 'framing unset is byte-identical to no runtime field at all'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=dark] no throw');
      assert.strictEqual(output!.themeType, 'dark', '[cell=9, scenario=dark] framing=dark on dark-appearing seeds keeps type dark');
      assert.strictEqual(
        VscodeTestData.get(output!.colors, 'editor.background'),
        VscodeTestData.get(output!.unsetColors, 'editor.background'),
        '[cell=9, scenario=dark] framing=dark matches the naturally-dark seeds: same background as no framing'
      );
    },
    'input': 'dark',
    'kind': 'happy',
    'name': 'framing=dark on dark-appearing seeds leaves the surface unchanged'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=light] no throw');
      assert.strictEqual(output!.themeType, 'light', '[cell=9, scenario=light] framing=light produces type light');
      assert.notStrictEqual(
        VscodeTestData.get(output!.colors, 'editor.background'),
        VscodeTestData.get(output!.unsetColors, 'editor.background'),
        '[cell=9, scenario=light] framing=light produces a DIFFERENT editor.background than the unset/dark run'
      );
      const bgHex = VscodeTestData.get(output!.colors, 'editor.background') ?? '';
      const bgRecord = colorRecordFactory.fromHex(bgHex.slice(0, 7));
      const lum = luminance.apply(bgRecord);
      assert.ok(lum > 0.5, `[cell=9, scenario=light] editor.background genuinely reads light: WCAG relative luminance ${lum.toFixed(3)} > 0.5`);
    },
    'input': 'light',
    'kind': 'happy',
    'name': 'framing=light on dark-appearing seeds selects a genuinely light-appearing variant surface'
  }
];

await new ScenarioRunner<'dark' | 'light' | undefined, FramingOutput>(
  'VscodePlugin :: cell-9 :: runtime-framing',
  (framing) => {
    const unsetState = VscodeTestData.runFull(SEEDS_SRGB, PIPELINE_HEX);
    const unsetColors = (unsetState.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;

    const state = VscodeTestData.runFullWithFraming(SEEDS_SRGB, framing, PIPELINE_HEX);
    const colors = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;
    const themeJson = state.outputs['vscode:themeJson'] as ThemeJsonInterfaceType | undefined;
    const commentEntry = themeJson?.tokenColors.find((e) => { return e.name === 'comment'; });

    return {
      'colors':            colors,
      'commentForeground': commentEntry?.settings.foreground,
      'themeType':         (themeJson?.type as string | undefined) ?? 'unknown',
      'unsetColors':       unsetColors
    };
  }
).run(framingScenarios);

await test('VscodePlugin :: cell-9 :: runtime-framing :: framing=light changes syntax-highlighting colors too (not just workbench chrome)', () => {
  const darkState  = VscodeTestData.runFullWithFraming(SEEDS_SRGB, 'dark',  PIPELINE_HEX);
  const lightState = VscodeTestData.runFullWithFraming(SEEDS_SRGB, 'light', PIPELINE_HEX);

  const darkThemeJson  = darkState.outputs['vscode:themeJson']  as ThemeJsonInterfaceType | undefined;
  const lightThemeJson = lightState.outputs['vscode:themeJson'] as ThemeJsonInterfaceType | undefined;

  const darkComment  = darkThemeJson?.tokenColors.find((e) => { return e.name === 'comment'; });
  const lightComment = lightThemeJson?.tokenColors.find((e) => { return e.name === 'comment'; });

  assert.ok(darkComment !== undefined && lightComment !== undefined, '[cell=9] comment tokenColors present in both runs');
  assert.notStrictEqual(
    darkComment.settings.foreground,
    lightComment.settings.foreground,
    '[cell=9] comment foreground (derived by vscode:expandTokens from the resolved framing surface) differs between framing=dark and framing=light'
  );
});

// ---------------------------------------------------------------------------
// Cell 10 — theme-type reconciliation: emit:vscodeUiPalette and
// emit:vscodeThemeJson must agree on light/dark for the same state.
//
// #767676 is a real, well-known crossover point: its WCAG relative
// luminance is ~0.181 (reads dark under the 0.5 threshold) but its OKLCH
// lightness is ~0.566 (reads light under the 0.5 threshold). Before this
// fix, emit:vscodeUiPalette measured luminance (dark) while
// emit:vscodeThemeJson measured OKLCH lightness (light) — a real
// disagreement between the emitted workbench colors and the declared
// theme `type`. Both now read the same FramingSurface.isLight measure,
// so they agree.
// ---------------------------------------------------------------------------

class DirectTaskFixture {
  /** Sixteen roles the vscode tasks require, independent of any role-schema clamp. */
  static buildState(backgroundHex: string): PaletteStateInterface {
    const hexes: Readonly<Record<string, string>> = {
      'accent':     '#7c3aed',
      'background': backgroundHex,
      'comment':    '#6a737d',
      'constant':   '#79c0ff',
      'error':      '#f85149',
      'foreground': '#e6edf3',
      'function':   '#d2a8ff',
      'info':       '#79c0ff',
      'keyword':    '#8b5cf6',
      'muted':      '#7d8590',
      'number':     '#79c0ff',
      'string':     '#a5d6ff',
      'success':    '#3fb950',
      'surface':    '#161b22',
      'type':       '#22d3ee',
      'variable':   '#ffa657',
      'warning':    '#d29922'
    };
    const roles: Record<string, ColorRecordInterfaceType> = {};
    for (const [name, hex] of Object.entries(hexes)) {
      roles[name] = colorRecordFactory.fromHex(hex);
    }

    const input: InputInterface = {
      'bypass':    undefined,
      'colors':    [],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined
    };

    return {
      'colors':   [],
      'input':    input,
      'metadata': {},
      'outputs':  {},
      'roles':    roles,
      'runtime':  { 'colorSpace': undefined, 'extra': undefined, 'framing': undefined },
      'variants': {}
    };
  }

  /** Runs the six downstream vscode tasks directly (bypassing resolve:roles/enforce:contrast clamps) so an
   *  intentionally-crafted crossover background survives unaltered into both emitters. */
  static runDirect(backgroundHex: string): PaletteStateInterface {
    const state = DirectTaskFixture.buildState(backgroundHex);
    const engine = new Engine();
    const context: PipelineContextInterface = {
      'engine':    engine,
      'logger':    consoleLogger,
      'startedAt': Date.now(),
      'tasks':     engine.tasks
    };

    deriveVscodeUiRoles.run(state, context);
    expandTokens.run(state, context);
    applyModifiers.run(state, context);
    emitVscodeSemanticRules.run(state, context);
    emitVscodeUiPalette.run(state, context);
    emitVscodeThemeJson.run(state, context);

    return state;
  }
}

await test('VscodePlugin :: cell-10 :: theme-type-reconciliation :: #767676 (WCAG-dark, OKLCH-light) resolves to one consistent type', () => {
  const state = DirectTaskFixture.runDirect('#767676');
  const colors = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;
  const themeJson = state.outputs['vscode:themeJson'] as ThemeJsonInterfaceType | undefined;

  assert.strictEqual(colors['editor.background'], '#767676', '[cell=10] background passes through unaltered');
  assert.strictEqual(
    themeJson?.type,
    'dark',
    '[cell=10] emit:vscodeThemeJson agrees with WCAG relative luminance (0.181, below the 0.5 threshold), not OKLCH lightness (0.566, which alone would read light)'
  );
});

// ---------------------------------------------------------------------------
// --- Golden fixtures ---
// Byte-equal locked snapshot: the themeJson produced by SEEDS_SRGB through
// the full hex pipeline must include a specific set of known-good key names.
// This is a structural regression guard (not a full byte-compare) using a
// bare test since the assertion doesn't fit the single-subject table pattern.
// ---------------------------------------------------------------------------

await test('VscodePlugin :: workbench colors :: accent slots read the named accent role', () => {
  const state = DirectTaskFixture.runDirect('#10161f');
  const colors = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;

  assert.strictEqual(colors['editorCursor.foreground'], '#7c3aed', '[accent] cursor foreground reads accent');
  assert.strictEqual(colors['tab.activeBorder'], '#7c3aed', '[accent] tab border reads accent');
  assert.strictEqual(colors['activityBarBadge.background'], '#7c3aed', '[accent] activity badge reads accent');
  assert.notStrictEqual(colors['editorCursor.foreground'], '#8b5cf6', '[accent] cursor foreground does not substitute keyword');
});

await test('VscodePlugin :: workbench colors :: terminal bright white derives from terminal white', () => {
  const state = DirectTaskFixture.buildState('#10161f');
  state.roles.foreground = colorRecordFactory.fromHex('#223344');
  const engine = new Engine();
  const context: PipelineContextInterface = {
    'engine':    engine,
    'logger':    consoleLogger,
    'startedAt': Date.now(),
    'tasks':     engine.tasks
  };

  deriveVscodeUiRoles.run(state, context);
  emitVscodeUiPalette.run(state, context);
  const colors = (state.outputs['vscode:workbenchColors'] ?? {}) as Record<string, string>;
  assert.strictEqual(colors['terminal.ansiWhite'], '#223344', '[terminal] ansiWhite reads foreground');
  assert.notStrictEqual(colors['terminal.ansiBrightWhite'], '#ffffff', '[terminal] bright white changes with foreground');
  assert.notStrictEqual(colors['terminal.ansiBrightWhite'], colors['terminal.ansiWhite'], '[terminal] bright white applies a foreground derivation');
});

await test('VscodePlugin :: token colors :: every published scope group is emitted as canonical hex', () => {
  const state = VscodeTestData.runFull(SEEDS_SRGB, PIPELINE_HEX);
  const themeJson = state.outputs['vscode:themeJson'] as ThemeJsonInterfaceType | undefined;
  const tokenColors = themeJson?.tokenColors ?? [];

  assert.strictEqual(tokenColors.length, 57, '[scope coverage] each published scope group emits a token rule');
  for (const entry of tokenColors) {
    assert.match(entry.settings.foreground ?? '', /^#[0-9a-f]{6,8}$/, `[scope coverage] ${entry.name} foreground is canonical sRGB hex`);
  }
});

await test('VscodePlugin :: golden :: themeJson key set is stable across refactors', () => {
  const state = VscodeTestData.runFull(SEEDS_SRGB, PIPELINE_HEX);
  const tj    = state.outputs['vscode:themeJson'] as ThemeJsonInterfaceType | undefined;

  assert.ok(tj !== undefined, '[golden] themeJson present');

  // Workbench slots that must always be present in the output
  const requiredColorKeys = [
    'editor.background',
    'editor.foreground',
    'editorCursor.foreground',
    'activityBar.background',
    'activityBar.foreground',
    'activityBarBadge.background',
    'sideBar.background',
    'statusBar.background',
    'tab.activeBackground',
    'tab.activeBorder',
    'terminal.background',
    'terminal.foreground',
    'focusBorder',
    'errorForeground',
    'gitDecoration.addedResourceForeground'
  ];
  for (const key of requiredColorKeys) {
    assert.ok(key in (tj?.colors ?? {}), `[golden] required color key present: ${key}`);
  }

  // Semantic token types that must produce rules
  const requiredSemanticTypes = ['keyword', 'comment', 'string', 'number', 'function', 'type', 'variable'];
  for (const type of requiredSemanticTypes) {
    assert.ok(
      type in (tj?.semanticTokenColors ?? {}),
      `[golden] required semantic type present: ${type}`
    );
  }

  // tokenColors must include keyword and comment entries
  const tokenNames = (tj?.tokenColors ?? []).map((e) => { const result = (e as { 'name': string }).name; return result; });
  assert.ok(tokenNames.includes('keyword'), '[golden] tokenColors includes keyword entry');
  assert.ok(tokenNames.includes('comment'), '[golden] tokenColors includes comment entry');
});
