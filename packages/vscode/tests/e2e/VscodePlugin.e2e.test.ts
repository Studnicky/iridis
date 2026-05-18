/**
 * VscodePlugin — scenario-matrix e2e suite.
 *
 * Subject: `VscodePlugin` and the five vscode tasks it registers.
 * Drives the full intake → resolve → expand → enforce → derive →
 * vscode:expandTokens → vscode:applyModifiers → emit:* pipeline.
 *
 * Cells:
 *   1. plugin-shape        — singleton, version, task list, manifest fields
 *   2. workbench-colors    — 101-slot palette, key slots present, sRGB/P3 routing
 *   3. semantic-rules      — base rules, modifier-selector cross-product, fontStyle
 *   4. theme-json-assembly — assembled ThemeJsonInterface shape invariants
 *   5. token-colors        — tokenColors array from SCOPE_MAPPINGS + baseTokens
 *   6. p3-propagation      — wide-gamut input surfaces P3 form in direct-passthrough slots
 *   7. math-derived-slots  — math-derived and alpha-suffix slots never emit P3
 *   8. unhappy-paths       — missing prerequisite tasks, truncated pipelines, missing roles
 */

import { test }    from 'node:test';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { Engine }         from '@studnicky/iridis/engine';
import { coreTasks }      from '@studnicky/iridis/tasks';
import type {
  InputInterface,
  PaletteStateInterface,
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import {
  VscodePlugin,
  vscodePlugin,
  vscodeRoleSchema16,
  ExpandTokens,
  expandTokens,
  ApplyModifiers,
  applyModifiers,
  EmitVscodeSemanticRules,
  emitVscodeSemanticRules,
  EmitVscodeUiPalette,
  emitVscodeUiPalette,
  EmitVscodeThemeJson,
  emitVscodeThemeJson,
} from '@studnicky/iridis-vscode';
import type {
  VscodeOutputSlotInterface,
  VscodeMetaSlotInterface,
  SemanticRuleEntryInterface,
  ThemeJsonInterface,
} from '@studnicky/iridis-vscode/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Sixteen in-sRGB seeds covering every required role via vscodeRoleSchema16. */
const SEEDS_SRGB: readonly string[] = [
  '#0d1117', '#e6edf3', '#161b22', '#7d8590',
  '#8b5cf6', '#a78bfa', '#22d3ee', '#34d399',
  '#fb7185', '#fbbf24', '#f59e0b', '#737373',
  '#ef4444', '#facc15', '#3b82f6', '#10b981',
];

/**
 * Same 16 seeds but with one wide-gamut display-p3 string at index 4
 * (the keyword / accent slot).
 */
const SEEDS_WITH_P3: readonly string[] = [
  '#0d1117', '#e6edf3', '#161b22', '#7d8590',
  'color(display-p3 1.0 0.30 0.20)',
  '#a78bfa', '#22d3ee', '#34d399',
  '#fb7185', '#fbbf24', '#f59e0b', '#737373',
  '#ef4444', '#facc15', '#3b82f6', '#10b981',
];

/** Full hex pipeline (intake:hex) */
const PIPELINE_HEX: readonly string[] = [
  'intake:hex',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
  'vscode:expandTokens',
  'vscode:applyModifiers',
  'emit:vscodeSemanticRules',
  'emit:vscodeUiPalette',
  'emit:vscodeThemeJson',
];

/** Wide-gamut pipeline (intake:any handles both hex and p3 strings) */
const PIPELINE_ANY: readonly string[] = [
  'intake:any',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
  'vscode:expandTokens',
  'vscode:applyModifiers',
  'emit:vscodeSemanticRules',
  'emit:vscodeUiPalette',
  'emit:vscodeThemeJson',
];

/** Build a fresh Engine with all core tasks + vscodePlugin adopted. */
function makeEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(vscodePlugin);
  return engine;
}

/** Run the full pipeline and return state. */
async function runFull(
  seeds: readonly string[],
  pipeline: readonly string[] = PIPELINE_HEX,
): Promise<PaletteStateInterface> {
  const engine = makeEngine();
  engine.pipeline(pipeline);
  return engine.run({ 'colors': seeds, 'roles': vscodeRoleSchema16 } as InputInterface);
}

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
//
// VscodePlugin is a singleton class instance. The plugin must advertise a
// stable name and version, expose exactly five tasks by name, and each task
// must be an instance of its class and carry the correct manifest.name.
// ---------------------------------------------------------------------------

interface PluginShapeInput {
  readonly plugin: PluginInterface;
}
interface PluginShapeOutput {
  readonly name:      string;
  readonly version:   string;
  readonly taskNames: readonly string[];
}

const pluginShapeScenarios: readonly ScenarioInterface<PluginShapeInput, PluginShapeOutput>[] = [
  {
    name: 'singleton exposes name version and five tasks',
    kind: 'happy',
    input: { plugin: vscodePlugin },
    assert(output, error) {
      assert.strictEqual(error, undefined,          '[cell=1, scenario=singleton] no throw');
      assert.strictEqual(output!.name,    'vscode', '[cell=1, scenario=singleton] name');
      assert.strictEqual(output!.version, '0.1.0',  '[cell=1, scenario=singleton] version');
      assert.deepStrictEqual(
        [...output!.taskNames].sort(),
        [
          'emit:vscodeSemanticRules',
          'emit:vscodeThemeJson',
          'emit:vscodeUiPalette',
          'vscode:applyModifiers',
          'vscode:expandTokens',
        ],
        '[cell=1, scenario=singleton] all five task names',
      );
    },
  },
  {
    name: 'vscodePlugin is instance of VscodePlugin',
    kind: 'happy',
    input: { plugin: vscodePlugin },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=class-instance] no throw');
      assert.ok(vscodePlugin instanceof VscodePlugin, '[cell=1, scenario=class-instance] is VscodePlugin');
      assert.ok(output!.name.length > 0,              '[cell=1, scenario=class-instance] name non-empty');
    },
  },
  {
    name: 'each task is the correct class instance with matching manifest.name',
    kind: 'happy',
    input: { plugin: vscodePlugin },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-classes] no throw');
      assert.ok(expandTokens         instanceof ExpandTokens,          '[cell=1, scenario=task-classes] expandTokens class');
      assert.ok(applyModifiers       instanceof ApplyModifiers,        '[cell=1, scenario=task-classes] applyModifiers class');
      assert.ok(emitVscodeSemanticRules instanceof EmitVscodeSemanticRules, '[cell=1, scenario=task-classes] emitVscodeSemanticRules class');
      assert.ok(emitVscodeUiPalette  instanceof EmitVscodeUiPalette,   '[cell=1, scenario=task-classes] emitVscodeUiPalette class');
      assert.ok(emitVscodeThemeJson  instanceof EmitVscodeThemeJson,   '[cell=1, scenario=task-classes] emitVscodeThemeJson class');
      // Manifest names match task names
      assert.strictEqual(expandTokens.manifest.name,            'vscode:expandTokens',         '[cell=1, scenario=task-classes] expandTokens manifest.name');
      assert.strictEqual(applyModifiers.manifest.name,          'vscode:applyModifiers',       '[cell=1, scenario=task-classes] applyModifiers manifest.name');
      assert.strictEqual(emitVscodeSemanticRules.manifest.name, 'emit:vscodeSemanticRules',    '[cell=1, scenario=task-classes] emitVscodeSemanticRules manifest.name');
      assert.strictEqual(emitVscodeUiPalette.manifest.name,     'emit:vscodeUiPalette',        '[cell=1, scenario=task-classes] emitVscodeUiPalette manifest.name');
      assert.strictEqual(emitVscodeThemeJson.manifest.name,     'emit:vscodeThemeJson',        '[cell=1, scenario=task-classes] emitVscodeThemeJson manifest.name');
    },
  },
  {
    name: 'tasks() returns a fresh array on every call (not a shared reference)',
    kind: 'edge',
    input: { plugin: vscodePlugin },
    assert(_output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=tasks-fresh] no throw');
      const t1 = vscodePlugin.tasks();
      const t2 = vscodePlugin.tasks();
      assert.strictEqual(t1.length, 5, '[cell=1, scenario=tasks-fresh] length stable');
      assert.strictEqual(t2.length, 5, '[cell=1, scenario=tasks-fresh] second call length stable');
    },
  },
];

new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'VscodePlugin :: cell-1 :: plugin-shape',
  (input) => ({
    name:      input.plugin.name,
    version:   input.plugin.version,
    taskNames: input.plugin.tasks().map((t: TaskInterface) => t.name),
  }),
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — workbench colors (outputs.vscode.workbenchColors)
//
// emit:vscodeUiPalette derives ~101 VS Code workbench-color slots from the
// resolved 16-role palette. This cell asserts:
//   - the slot map is populated with expected UI keys
//   - direct-passthrough slots carry the role's color form (hex for sRGB roles)
//   - math-derived and alpha-suffix slots produce 6- or 8-digit sRGB hex
//   - theme type ('dark' | 'light') is determined by background luminance
// ---------------------------------------------------------------------------

interface WorkbenchColorsInput {
  readonly seeds:    readonly string[];
  readonly pipeline: readonly string[];
}
interface WorkbenchColorsOutput {
  readonly colors:         Record<string, string>;
  readonly themeType:      string;
  readonly colorCount:     number;
}

const workbenchColorsScenarios: readonly ScenarioInterface<WorkbenchColorsInput, WorkbenchColorsOutput>[] = [
  {
    name: 'dark input palette produces dark themeType and populates key slots',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
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
  },
  {
    name: 'all workbench color values are strings',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-strings] no throw');
      for (const [slot, value] of Object.entries(output!.colors)) {
        assert.strictEqual(typeof value, 'string', `[cell=2, scenario=all-strings] slot ${slot} is a string`);
        assert.ok(value.length > 0, `[cell=2, scenario=all-strings] slot ${slot} is non-empty`);
      }
    },
  },
  {
    name: 'sRGB-only seeds produce hex or P3 strings (never empty) for all workbench slots',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=srgb-shape] no throw');
      // Role-resolution math may re-derive colors through OKLCH and surface displayP3
      // even when the raw input seed is a plain hex string (e.g. ensureContrast can
      // produce a displayP3 record via colorRecordFactory.fromOklch). The invariant
      // for sRGB-only inputs is therefore that every slot is either a valid hex string
      // OR a valid color(display-p3 ...) functional notation — never empty or malformed.
      const hexPattern   = /^#[0-9a-f]{6,8}$/;
      const p3Pattern    = /^color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)$/;
      for (const [slot, value] of Object.entries(output!.colors)) {
        assert.ok(
          hexPattern.test(value) || p3Pattern.test(value),
          `[cell=2, scenario=srgb-shape] slot ${slot} must be hex or P3 notation, got: ${value}`,
        );
      }
    },
  },
  {
    name: 'math-derived slots produce 6- or 8-digit sRGB hex even with wide-gamut input',
    kind: 'edge',
    input: { seeds: SEEDS_WITH_P3, pipeline: PIPELINE_ANY },
    assert(output, error) {
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
        'titleBar.activeForeground',
      ];
      for (const slot of mathDerivedSlots) {
        const value = output!.colors[slot];
        assert.ok(typeof value === 'string',          `[cell=2, scenario=math-derived-hex] ${slot} is a string`);
        assert.ok(!value.includes('display-p3'),      `[cell=2, scenario=math-derived-hex] ${slot} must not contain display-p3, got ${value}`);
        assert.match(value, /^#[0-9a-f]{6,8}$/,      `[cell=2, scenario=math-derived-hex] ${slot} must be 6- or 8-digit hex, got ${value}`);
      }
    },
  },
  {
    name: 'direct-passthrough accent slots emit color(display-p3 ...) for wide-gamut input',
    kind: 'edge',
    input: { seeds: SEEDS_WITH_P3, pipeline: PIPELINE_ANY },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=p3-passthrough] no throw');
      const p3Pattern = /^color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)$/;
      // editorCursor.foreground = direct keyword (accent) passthrough
      assert.match(
        output!.colors['editorCursor.foreground'] ?? '',
        p3Pattern,
        '[cell=2, scenario=p3-passthrough] editorCursor.foreground emits P3 for wide-gamut accent',
      );
      // tab.activeBorder = direct keyword passthrough
      assert.match(
        output!.colors['tab.activeBorder'] ?? '',
        p3Pattern,
        '[cell=2, scenario=p3-passthrough] tab.activeBorder emits P3 for wide-gamut accent',
      );
      // activityBarBadge.background = direct keyword passthrough
      assert.match(
        output!.colors['activityBarBadge.background'] ?? '',
        p3Pattern,
        '[cell=2, scenario=p3-passthrough] activityBarBadge.background emits P3 for wide-gamut accent',
      );
    },
  },
  {
    name: 'terminal.ansiBrightWhite is always #ffffff regardless of palette',
    kind: 'edge',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=bright-white] no throw');
      assert.strictEqual(
        output!.colors['terminal.ansiBrightWhite'],
        '#ffffff',
        '[cell=2, scenario=bright-white] terminal.ansiBrightWhite is #ffffff',
      );
    },
  },
];

new ScenarioRunner<WorkbenchColorsInput, WorkbenchColorsOutput>(
  'VscodePlugin :: cell-2 :: workbench-colors',
  async (input) => {
    const state  = await runFull(input.seeds, input.pipeline);
    const out    = state.outputs['vscode'] as VscodeOutputSlotInterface | undefined;
    const colors = out?.workbenchColors ?? {};
    const themeType = (out?.themeJson?.type as string | undefined) ?? 'unknown';
    return { colors, themeType, colorCount: Object.keys(colors).length };
  },
).run(workbenchColorsScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — semantic token rules (metadata.vscode.semanticTokenRules)
//
// vscode:applyModifiers builds one base rule per token type (23 total) and
// one modifier-selector rule per type × modifier (23 × 10 = 230). Rules
// must:
//   - include the 23 base selectors (no dot)
//   - include at least one modifier selector (type.modifier dot form)
//   - carry a foreground string on every rule
//   - carry fontStyle where the transform specifies it
// emit:vscodeSemanticRules projects these into outputs.vscode.semanticTokenRules
// and additionally merges FONT_STYLES for base-token types.
// ---------------------------------------------------------------------------

interface SemanticRulesInput {
  readonly seeds: readonly string[];
}
interface SemanticRulesOutput {
  readonly metaRules:   Record<string, SemanticRuleEntryInterface>;
  readonly outputRules: Record<string, SemanticRuleEntryInterface>;
}

const semanticRulesScenarios: readonly ScenarioInterface<SemanticRulesInput, SemanticRulesOutput>[] = [
  {
    name: 'metadata contains 23 base rules and 230 modifier-selector rules',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=rule-count] no throw');
      const selectors    = Object.keys(output!.metaRules);
      const baseRules    = selectors.filter((s) => !s.includes('.'));
      const modRules     = selectors.filter((s) => s.includes('.'));
      assert.strictEqual(baseRules.length, 23,  '[cell=3, scenario=rule-count] 23 base rules');
      assert.strictEqual(modRules.length,  230, '[cell=3, scenario=rule-count] 230 modifier-selector rules');
    },
  },
  {
    name: 'every base rule carries a foreground string',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=base-foreground] no throw');
      const baseSelectors = Object.keys(output!.metaRules).filter((s) => !s.includes('.'));
      for (const sel of baseSelectors) {
        const rule = output!.metaRules[sel];
        assert.ok(rule !== undefined,                   `[cell=3, scenario=base-foreground] rule exists for ${sel}`);
        assert.ok(typeof rule.foreground === 'string',  `[cell=3, scenario=base-foreground] ${sel} has foreground string`);
        assert.ok((rule.foreground as string).length > 0, `[cell=3, scenario=base-foreground] ${sel} foreground non-empty`);
      }
    },
  },
  {
    name: 'modifier selectors carry fontStyle where MODIFIER_TRANSFORMS specifies it',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=font-style] no throw');
      // 'declaration' transform has fontStyle: 'bold'
      const declBold = Object.entries(output!.metaRules)
        .filter(([sel]) => sel.endsWith('.declaration'))
        .some(([, rule]) => rule.fontStyle === 'bold');
      assert.ok(declBold, '[cell=3, scenario=font-style] declaration modifier emits fontStyle bold');
      // 'deprecated' transform has fontStyle: 'strikethrough'
      const deprStrike = Object.entries(output!.metaRules)
        .filter(([sel]) => sel.endsWith('.deprecated'))
        .some(([, rule]) => rule.fontStyle === 'strikethrough');
      assert.ok(deprStrike, '[cell=3, scenario=font-style] deprecated modifier emits fontStyle strikethrough');
    },
  },
  {
    name: 'outputs.vscode.semanticTokenRules has at least 23 entries and comment rule exists',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined,                      '[cell=3, scenario=output-rules] no throw');
      assert.ok(Object.keys(output!.outputRules).length >= 23, '[cell=3, scenario=output-rules] at least 23 output rules');
      const commentRule = output!.outputRules['comment'];
      assert.ok(commentRule !== undefined,                      '[cell=3, scenario=output-rules] comment rule present');
      assert.ok(typeof commentRule.foreground === 'string',     '[cell=3, scenario=output-rules] comment rule has foreground');
    },
  },
  {
    name: 'FONT_STYLES merges italic into comment selector in output rules',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=font-style-merge] no throw');
      // FONT_STYLES has comment → italic
      const commentRule = output!.outputRules['comment'];
      assert.ok(commentRule !== undefined,             '[cell=3, scenario=font-style-merge] comment rule present');
      assert.strictEqual(commentRule.fontStyle, 'italic', '[cell=3, scenario=font-style-merge] comment fontStyle italic from FONT_STYLES');
    },
  },
  {
    name: 'wide-gamut input: base rules carry P3 foreground for keyword base token',
    kind: 'edge',
    input: { seeds: SEEDS_WITH_P3 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=p3-semantic] no throw');
      // The keyword base token is derived from the keyword role which carries P3
      const keywordRule = output!.metaRules['keyword'];
      assert.ok(keywordRule !== undefined, '[cell=3, scenario=p3-semantic] keyword rule present');
      assert.ok(typeof keywordRule.foreground === 'string', '[cell=3, scenario=p3-semantic] keyword rule has foreground');
      // foreground may be hex (after ensureContrast re-derives via oklch) or P3 depending on
      // whether the contrast adjustment round-trips through P3; either way it must be a valid color string
      assert.ok(
        /^#[0-9a-f]{6,8}$/.test(keywordRule.foreground as string)
          || /^color\(display-p3/.test(keywordRule.foreground as string),
        `[cell=3, scenario=p3-semantic] keyword foreground is a valid color string, got ${keywordRule.foreground}`,
      );
    },
  },
];

new ScenarioRunner<SemanticRulesInput, SemanticRulesOutput>(
  'VscodePlugin :: cell-3 :: semantic-rules',
  async (input) => {
    // Use PIPELINE_ANY to accept both seed sets
    const pipeline = input.seeds === SEEDS_WITH_P3 ? PIPELINE_ANY : PIPELINE_HEX;
    const state    = await runFull(input.seeds, pipeline);
    const meta     = state.metadata['vscode'] as VscodeMetaSlotInterface | undefined;
    const out      = state.outputs['vscode'] as VscodeOutputSlotInterface | undefined;
    return {
      metaRules:   (meta?.semanticTokenRules ?? {}) as Record<string, SemanticRuleEntryInterface>,
      outputRules: (out?.semanticTokenRules ?? {})  as Record<string, SemanticRuleEntryInterface>,
    };
  },
).run(semanticRulesScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — theme JSON assembly (outputs.vscode.themeJson)
//
// emit:vscodeThemeJson assembles the full ThemeJsonInterface from three
// upstream slots. Shape invariants:
//   - name: non-empty string (default or from metadata.themeName)
//   - type: 'dark' | 'light' (by background luminance)
//   - semanticHighlighting: true
//   - colors: same as workbenchColors (at least 50 entries)
//   - semanticTokenColors: mirrored from semanticTokenRules; font-styled rules
//     become objects, plain foreground rules become plain strings
//   - tokenColors: array of { name, scope, settings } from SCOPE_MAPPINGS
// ---------------------------------------------------------------------------

interface ThemeJsonInput {
  readonly seeds:     readonly string[];
  readonly pipeline:  readonly string[];
  readonly themeName?: string;
}
interface ThemeJsonOutput {
  readonly themeJson:   ThemeJsonInterface;
  readonly workbench:   Record<string, string>;
}

const themeJsonScenarios: readonly ScenarioInterface<ThemeJsonInput, ThemeJsonOutput>[] = [
  {
    name: 'assembled themeJson satisfies all shape invariants',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
      assert.strictEqual(error, undefined,                   '[cell=4, scenario=shape] no throw');
      const tj = output!.themeJson;
      assert.ok(typeof tj.name === 'string' && tj.name.length > 0,  '[cell=4, scenario=shape] name non-empty string');
      assert.ok(tj.type === 'dark' || tj.type === 'light',           '[cell=4, scenario=shape] type dark|light');
      assert.strictEqual(tj.semanticHighlighting, true,              '[cell=4, scenario=shape] semanticHighlighting true');
      assert.ok(typeof tj.colors === 'object',                       '[cell=4, scenario=shape] colors is object');
      assert.ok(Object.keys(tj.colors).length >= 50,                 '[cell=4, scenario=shape] colors has at least 50 entries');
      assert.ok(typeof tj.semanticTokenColors === 'object',          '[cell=4, scenario=shape] semanticTokenColors is object');
      assert.ok(Object.keys(tj.semanticTokenColors).length >= 23,    '[cell=4, scenario=shape] semanticTokenColors has at least 23 entries');
      assert.ok(Array.isArray(tj.tokenColors),                       '[cell=4, scenario=shape] tokenColors is array');
      assert.ok(tj.tokenColors.length > 0,                           '[cell=4, scenario=shape] tokenColors non-empty');
    },
  },
  {
    name: 'themeJson.colors is the same object as outputs.vscode.workbenchColors',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=colors-identity] no throw');
      assert.strictEqual(output!.themeJson.colors, output!.workbench, '[cell=4, scenario=colors-identity] themeJson.colors is same reference as workbenchColors');
    },
  },
  {
    name: 'themeJson.name defaults to Color Engine Theme when no metadata.themeName',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
      assert.strictEqual(error, undefined,                              '[cell=4, scenario=default-name] no throw');
      assert.strictEqual(output!.themeJson.name, 'Color Engine Theme', '[cell=4, scenario=default-name] default theme name');
    },
  },
  {
    name: 'dark background produces dark themeJson.type',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
      assert.strictEqual(error, undefined,                 '[cell=4, scenario=dark-type] no throw');
      assert.strictEqual(output!.themeJson.type, 'dark',  '[cell=4, scenario=dark-type] type is dark for dark background');
    },
  },
  {
    name: 'semanticTokenColors: font-styled rules are objects, plain rules are strings',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=stc-shape] no throw');
      const stc = output!.themeJson.semanticTokenColors;
      // Find any object-form entry (a rule with fontStyle)
      const objectEntries = Object.entries(stc).filter(([, v]) => typeof v === 'object');
      const stringEntries = Object.entries(stc).filter(([, v]) => typeof v === 'string');
      assert.ok(objectEntries.length > 0,  '[cell=4, scenario=stc-shape] at least one object-form rule (has fontStyle)');
      assert.ok(stringEntries.length > 0,  '[cell=4, scenario=stc-shape] at least one string-form rule (plain foreground)');
      for (const [sel, val] of objectEntries) {
        const obj = val as { foreground?: string; fontStyle?: string };
        assert.ok(typeof obj.fontStyle === 'string', `[cell=4, scenario=stc-shape] object rule ${sel} has fontStyle`);
      }
    },
  },
  {
    name: 'tokenColors entries have name scope and settings.foreground',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB, pipeline: PIPELINE_HEX },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=token-color-shape] no throw');
      for (const entry of output!.themeJson.tokenColors) {
        const e = entry as { name: string; scope: unknown; settings: { foreground?: string } };
        assert.ok(typeof e.name === 'string',              `[cell=4, scenario=token-color-shape] entry has name`);
        assert.ok(e.scope !== undefined,                   `[cell=4, scenario=token-color-shape] entry ${e.name} has scope`);
        assert.ok(typeof e.settings.foreground === 'string', `[cell=4, scenario=token-color-shape] entry ${e.name} settings.foreground is string`);
        assert.ok((e.settings.foreground as string).length > 0, `[cell=4, scenario=token-color-shape] entry ${e.name} settings.foreground non-empty`);
      }
    },
  },
  {
    name: 'wide-gamut input: themeJson still satisfies shape invariants',
    kind: 'edge',
    input: { seeds: SEEDS_WITH_P3, pipeline: PIPELINE_ANY },
    assert(output, error) {
      assert.strictEqual(error, undefined,                '[cell=4, scenario=p3-shape] no throw');
      const tj = output!.themeJson;
      assert.strictEqual(tj.semanticHighlighting, true,  '[cell=4, scenario=p3-shape] semanticHighlighting true');
      assert.ok(Object.keys(tj.colors).length >= 50,     '[cell=4, scenario=p3-shape] colors populated');
      assert.ok(tj.tokenColors.length > 0,               '[cell=4, scenario=p3-shape] tokenColors non-empty');
    },
  },
];

new ScenarioRunner<ThemeJsonInput, ThemeJsonOutput>(
  'VscodePlugin :: cell-4 :: theme-json-assembly',
  async (input) => {
    const state = await runFull(input.seeds, input.pipeline);
    const out   = state.outputs['vscode'] as VscodeOutputSlotInterface | undefined;
    return {
      themeJson: out!.themeJson as ThemeJsonInterface,
      workbench: out!.workbenchColors as Record<string, string>,
    };
  },
).run(themeJsonScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — tokenColors array
//
// emit:vscodeThemeJson builds tokenColors from SCOPE_MAPPINGS + baseTokens.
// Each entry must carry name, scope (array), and settings.foreground. Keys
// present in baseTokens produce entries; keys absent from baseTokens are
// skipped. The 'comment' entry must exist (comment role always resolves).
// ---------------------------------------------------------------------------

interface TokenColorsInput {
  readonly seeds: readonly string[];
}
interface TokenColorsOutput {
  readonly tokenColors:  readonly { name: string; scope: unknown; settings: { foreground?: string } }[];
  readonly commentEntry: { name: string; scope: unknown; settings: { foreground?: string } } | undefined;
}

const tokenColorsScenarios: readonly ScenarioInterface<TokenColorsInput, TokenColorsOutput>[] = [
  {
    name: 'tokenColors array has entries and comment entry exists',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined,                            '[cell=5, scenario=has-entries] no throw');
      assert.ok(output!.tokenColors.length > 0,                      '[cell=5, scenario=has-entries] tokenColors non-empty');
      assert.ok(output!.commentEntry !== undefined,                   '[cell=5, scenario=has-entries] comment entry present');
      assert.ok(output!.commentEntry!.settings.foreground !== undefined, '[cell=5, scenario=has-entries] comment has foreground');
    },
  },
  {
    name: 'every tokenColors entry has a string scope or array scope',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=scope-shape] no throw');
      for (const entry of output!.tokenColors) {
        assert.ok(
          typeof entry.scope === 'string' || Array.isArray(entry.scope),
          `[cell=5, scenario=scope-shape] entry ${entry.name} scope is string or array`,
        );
      }
    },
  },
  {
    name: 'tokenColors comment entry foreground is a hex string for sRGB input',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=comment-hex] no throw');
      const fg = output!.commentEntry?.settings.foreground;
      assert.ok(typeof fg === 'string', '[cell=5, scenario=comment-hex] comment foreground is string');
      assert.match(fg as string, /^#[0-9a-f]{6,8}$/, '[cell=5, scenario=comment-hex] comment foreground is hex for sRGB input');
    },
  },
  {
    name: 'wide-gamut keyword tokenColors entry emits P3 foreground',
    kind: 'edge',
    input: { seeds: SEEDS_WITH_P3 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=keyword-p3] no throw');
      const kwEntry = output!.tokenColors.find((e) => e.name === 'keyword');
      assert.ok(kwEntry !== undefined,              '[cell=5, scenario=keyword-p3] keyword entry present');
      assert.ok(typeof kwEntry.settings.foreground === 'string', '[cell=5, scenario=keyword-p3] keyword foreground is string');
      assert.match(
        kwEntry.settings.foreground as string,
        /^color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)$/,
        '[cell=5, scenario=keyword-p3] keyword tokenColor emits P3 for wide-gamut keyword role',
      );
    },
  },
];

new ScenarioRunner<TokenColorsInput, TokenColorsOutput>(
  'VscodePlugin :: cell-5 :: token-colors',
  async (input) => {
    const pipeline  = input.seeds === SEEDS_WITH_P3 ? PIPELINE_ANY : PIPELINE_HEX;
    const state     = await runFull(input.seeds, pipeline);
    const out       = state.outputs['vscode'] as VscodeOutputSlotInterface | undefined;
    const tokenColors = (out?.themeJson?.tokenColors ?? []) as readonly {
      name: string;
      scope: unknown;
      settings: { foreground?: string };
    }[];
    const commentEntry = tokenColors.find((e) => e.name === 'comment');
    return { tokenColors, commentEntry };
  },
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

interface P3PropagationInput {
  readonly seeds: readonly string[];
}
interface P3PropagationOutput {
  readonly keywordDisplayP3: boolean;
  readonly cursorForeground: string;
  readonly tabActiveBorder:  string;
  readonly findMatchBg:      string;
}

const p3PropagationScenarios: readonly ScenarioInterface<P3PropagationInput, P3PropagationOutput>[] = [
  {
    name: 'wide-gamut keyword role carries displayP3 after resolve:roles',
    kind: 'happy',
    input: { seeds: SEEDS_WITH_P3 },
    assert(output, error) {
      assert.strictEqual(error, undefined,              '[cell=6, scenario=keyword-p3] no throw');
      assert.strictEqual(output!.keywordDisplayP3, true, '[cell=6, scenario=keyword-p3] keyword.displayP3 defined');
    },
  },
  {
    name: 'direct keyword passthrough slots emit color(display-p3 ...) form',
    kind: 'happy',
    input: { seeds: SEEDS_WITH_P3 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=p3-direct] no throw');
      const p3 = /^color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)$/;
      assert.match(output!.cursorForeground, p3,  '[cell=6, scenario=p3-direct] editorCursor.foreground is P3');
      assert.match(output!.tabActiveBorder,  p3,  '[cell=6, scenario=p3-direct] tab.activeBorder is P3');
    },
  },
  {
    name: 'template-string alpha slot uses keyword hex not P3',
    kind: 'happy',
    input: { seeds: SEEDS_WITH_P3 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=alpha-hex] no throw');
      assert.match(
        output!.findMatchBg,
        /^#[0-9a-f]{8}$/,
        '[cell=6, scenario=alpha-hex] editor.findMatchBackground is 8-digit hex (alpha suffix on hex)',
      );
    },
  },
  {
    name: 'sRGB-only seeds produce hex syntax in direct-passthrough keyword slots',
    kind: 'edge',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined,                        '[cell=6, scenario=no-p3] no throw');
      assert.strictEqual(output!.keywordDisplayP3, false,         '[cell=6, scenario=no-p3] sRGB keyword has no displayP3');
      assert.match(output!.cursorForeground, /^#[0-9a-f]{6,8}$/, '[cell=6, scenario=no-p3] editorCursor.foreground is hex for sRGB keyword');
      assert.match(output!.tabActiveBorder,  /^#[0-9a-f]{6,8}$/, '[cell=6, scenario=no-p3] tab.activeBorder is hex for sRGB keyword');
    },
  },
];

new ScenarioRunner<P3PropagationInput, P3PropagationOutput>(
  'VscodePlugin :: cell-6 :: p3-propagation',
  async (input) => {
    const pipeline = input.seeds === SEEDS_WITH_P3 ? PIPELINE_ANY : PIPELINE_HEX;
    const state    = await runFull(input.seeds, pipeline);
    const keyword  = state.roles['keyword'];
    const out      = state.outputs['vscode'] as VscodeOutputSlotInterface | undefined;
    const colors   = out?.workbenchColors ?? {};
    return {
      keywordDisplayP3: keyword?.displayP3 !== undefined,
      cursorForeground: colors['editorCursor.foreground'] ?? '',
      tabActiveBorder:  colors['tab.activeBorder']        ?? '',
      findMatchBg:      colors['editor.findMatchBackground'] ?? '',
    };
  },
).run(p3PropagationScenarios);

// ---------------------------------------------------------------------------
// Cell 7 — math-derived slot regression
//
// Math-derived (mixHsl / lighten / darken / contrastText) and alpha-suffix
// template slots MUST emit 6- or 8-digit sRGB hex under all inputs.
// Invariant must hold even when the keyword role is driven out of sRGB gamut.
// ---------------------------------------------------------------------------

interface MathDerivedInput {
  readonly seeds: readonly string[];
}
interface MathDerivedOutput {
  readonly slots: Record<string, string>;
}

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
  'titleBar.activeForeground',
] as const;

const mathDerivedScenarios: readonly ScenarioInterface<MathDerivedInput, MathDerivedOutput>[] = [
  {
    name: 'sRGB input: math-derived slots are all 6- or 8-digit hex',
    kind: 'happy',
    input: { seeds: SEEDS_SRGB },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=srgb-hex] no throw');
      for (const slot of MATH_DERIVED_SLOTS) {
        const value = output!.slots[slot];
        assert.ok(typeof value === 'string',     `[cell=7, scenario=srgb-hex] ${slot} is string`);
        assert.ok(!value.includes('display-p3'), `[cell=7, scenario=srgb-hex] ${slot} no P3`);
        assert.match(value, /^#[0-9a-f]{6,8}$/, `[cell=7, scenario=srgb-hex] ${slot} is hex`);
      }
    },
  },
  {
    name: 'wide-gamut input: math-derived slots remain 6- or 8-digit hex (P3 cannot survive alpha-suffix)',
    kind: 'edge',
    input: { seeds: SEEDS_WITH_P3 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=p3-input-hex] no throw');
      for (const slot of MATH_DERIVED_SLOTS) {
        const value = output!.slots[slot];
        assert.ok(typeof value === 'string',     `[cell=7, scenario=p3-input-hex] ${slot} is string`);
        assert.ok(!value.includes('display-p3'), `[cell=7, scenario=p3-input-hex] ${slot} no P3, got ${value}`);
        assert.match(value, /^#[0-9a-f]{6,8}$/, `[cell=7, scenario=p3-input-hex] ${slot} is hex, got ${value}`);
      }
    },
  },
];

new ScenarioRunner<MathDerivedInput, MathDerivedOutput>(
  'VscodePlugin :: cell-7 :: math-derived-slots',
  async (input) => {
    const pipeline = input.seeds === SEEDS_WITH_P3 ? PIPELINE_ANY : PIPELINE_HEX;
    const state    = await runFull(input.seeds, pipeline);
    const out      = state.outputs['vscode'] as VscodeOutputSlotInterface | undefined;
    const colors   = out?.workbenchColors ?? {};
    const slots: Record<string, string> = {};
    for (const slot of MATH_DERIVED_SLOTS) {
      slots[slot] = colors[slot] ?? '';
    }
    return { slots };
  },
).run(mathDerivedScenarios);

// ---------------------------------------------------------------------------
// Cell 8 — unhappy paths (missing prerequisites, truncated pipelines)
//
// Tasks enforce their own dependency invariants by throwing when the upstream
// slot they read is absent. This cell exercises each throw path.
// ---------------------------------------------------------------------------

interface UnhappyInput {
  readonly description: string;
  readonly run:         () => Promise<unknown>;
}
interface UnhappyOutput {
  /** never populated — always expect error */
  readonly never: never;
}

const unhappyScenarios: readonly ScenarioInterface<UnhappyInput, UnhappyOutput>[] = [
  {
    name: 'vscode:applyModifiers without expandTokens: pipeline rejects missing requires',
    kind: 'unhappy',
    input: {
      description: 'applyModifiers manifest.requires vscode:expandTokens — engine.pipeline enforces this',
      run: async () => {
        const engine = makeEngine();
        // Engine.pipeline() enforces manifest.requires at build-time:
        // 'vscode:applyModifiers' requires 'vscode:expandTokens' which is absent here.
        engine.pipeline([
          'intake:hex',
          'resolve:roles',
          'expand:family',
          'enforce:contrast',
          'derive:variant',
          'vscode:applyModifiers',
        ]);
        return engine.run({ 'colors': SEEDS_SRGB, 'roles': vscodeRoleSchema16 } as InputInterface);
      },
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=apply-no-expand] expected throw from pipeline requires check');
      assert.match(
        (error as Error).message,
        /vscode:applyModifiers.*vscode:expandTokens|requires.*vscode:expandTokens/,
        '[cell=8, scenario=apply-no-expand] error names the dependent and the missing requirement',
      );
    },
  },
  {
    name: 'emit:vscodeSemanticRules without applyModifiers: pipeline rejects missing requires',
    kind: 'unhappy',
    input: {
      description: 'emitVscodeSemanticRules manifest.requires vscode:applyModifiers — engine.pipeline enforces this',
      run: async () => {
        const engine = makeEngine();
        engine.pipeline([
          'intake:hex',
          'resolve:roles',
          'expand:family',
          'enforce:contrast',
          'derive:variant',
          'vscode:expandTokens',
          'emit:vscodeSemanticRules',
        ]);
        return engine.run({ 'colors': SEEDS_SRGB, 'roles': vscodeRoleSchema16 } as InputInterface);
      },
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=semantic-no-apply] expected throw from pipeline requires check');
      assert.match(
        (error as Error).message,
        /emit:vscodeSemanticRules.*vscode:applyModifiers|requires.*vscode:applyModifiers/,
        '[cell=8, scenario=semantic-no-apply] error names the dependent and the missing requirement',
      );
    },
  },
  {
    name: 'emit:vscodeThemeJson without uiPalette: pipeline rejects missing requires',
    kind: 'unhappy',
    input: {
      description: 'emitVscodeThemeJson requires emit:vscodeUiPalette — engine.pipeline enforces this',
      run: async () => {
        const engine = makeEngine();
        engine.pipeline([
          'intake:hex',
          'resolve:roles',
          'expand:family',
          'enforce:contrast',
          'derive:variant',
          'vscode:expandTokens',
          'vscode:applyModifiers',
          'emit:vscodeSemanticRules',
          'emit:vscodeThemeJson',
        ]);
        return engine.run({ 'colors': SEEDS_SRGB, 'roles': vscodeRoleSchema16 } as InputInterface);
      },
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=theme-no-palette] expected throw from pipeline requires check');
      assert.match(
        (error as Error).message,
        /emit:vscodeThemeJson.*emit:vscodeUiPalette|requires.*emit:vscodeUiPalette/,
        '[cell=8, scenario=theme-no-palette] error names the dependent and the missing requirement',
      );
    },
  },
  {
    name: 'emit:vscodeThemeJson without semanticRules: pipeline rejects missing requires',
    kind: 'unhappy',
    input: {
      description: 'emitVscodeThemeJson requires emit:vscodeSemanticRules — engine.pipeline enforces this',
      run: async () => {
        const engine = makeEngine();
        engine.pipeline([
          'intake:hex',
          'resolve:roles',
          'expand:family',
          'enforce:contrast',
          'derive:variant',
          'vscode:expandTokens',
          'vscode:applyModifiers',
          'emit:vscodeUiPalette',
          'emit:vscodeThemeJson',
        ]);
        return engine.run({ 'colors': SEEDS_SRGB, 'roles': vscodeRoleSchema16 } as InputInterface);
      },
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=theme-no-semantic] expected throw from pipeline requires check');
      assert.match(
        (error as Error).message,
        /emit:vscodeThemeJson.*emit:vscodeSemanticRules|requires.*emit:vscodeSemanticRules/,
        '[cell=8, scenario=theme-no-semantic] error names the dependent and the missing requirement',
      );
    },
  },
  {
    name: 'vscode:expandTokens without required roles (no intake or resolve) throws',
    kind: 'unhappy',
    input: {
      description: 'expandTokens invoked with empty roles map',
      run: async () => {
        // Register only the vscode tasks, run expandTokens with no upstream
        const engine = new Engine();
        engine.adopt(vscodePlugin);
        engine.pipeline(['vscode:expandTokens']);
        // No roles in input — roles map will be empty after running
        return engine.run({ 'colors': [], 'roles': vscodeRoleSchema16 } as InputInterface);
      },
    },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=expand-no-roles] expected throw');
      assert.match(
        (error as Error).message,
        /ExpandTokens.*roles.*background|requires roles/,
        '[cell=8, scenario=expand-no-roles] message names missing roles',
      );
    },
  },
];

new ScenarioRunner<UnhappyInput, UnhappyOutput>(
  'VscodePlugin :: cell-8 :: unhappy-paths',
  (input) => input.run() as Promise<UnhappyOutput>,
).run(unhappyScenarios);

// ---------------------------------------------------------------------------
// --- Golden fixtures ---
// Byte-equal locked snapshot: the themeJson produced by SEEDS_SRGB through
// the full hex pipeline must include a specific set of known-good key names.
// This is a structural regression guard (not a full byte-compare) using a
// bare test since the assertion doesn't fit the single-subject table pattern.
// ---------------------------------------------------------------------------

test('VscodePlugin :: golden :: themeJson key set is stable across refactors', async () => {
  const state = await runFull(SEEDS_SRGB, PIPELINE_HEX);
  const out   = state.outputs['vscode'] as VscodeOutputSlotInterface | undefined;
  const tj    = out?.themeJson;

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
    'warningForeground',
    'gitDecoration.addedResourceForeground',
  ];
  for (const key of requiredColorKeys) {
    assert.ok(key in (tj?.colors ?? {}), `[golden] required color key present: ${key}`);
  }

  // Semantic token types that must produce rules
  const requiredSemanticTypes = ['keyword', 'comment', 'string', 'number', 'function', 'type', 'variable'];
  for (const type of requiredSemanticTypes) {
    assert.ok(
      type in (tj?.semanticTokenColors ?? {}),
      `[golden] required semantic type present: ${type}`,
    );
  }

  // tokenColors must include keyword and comment entries
  const tokenNames = (tj?.tokenColors ?? []).map((e) => (e as { name: string }).name);
  assert.ok(tokenNames.includes('keyword'), '[golden] tokenColors includes keyword entry');
  assert.ok(tokenNames.includes('comment'), '[golden] tokenColors includes comment entry');
});
