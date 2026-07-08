/**
 * ContrastPlugin — scenario-matrix e2e suite.
 *
 * Subject: `ContrastPlugin` and its four enforce tasks driven end-to-end
 * through a full Engine pipeline. Each cell covers one concern of the
 * plugin; scenarios within a cell exhaust the happy / edge / unhappy
 * matrix for that concern.
 *
 * Cells:
 *   1. plugin.shape     — singleton identity, version, and task registry
 *   2. enforce:wcagAA   — WCAG 2.1 AA ratio, pair results, no-pairs guard
 *   3. enforce:wcagAAA  — WCAG 2.1 AAA ratio, fail-then-adjust, no-pairs guard
 *   4. enforce:apca     — APCA Lc targets by role intent, no-pairs guard
 *   5. enforce:cvdSimulate — per-type warning signals: drop, floor, clean pass
 *   6. enforce:contrast (core) — adjusted=true branch, algorithm routing
 */

import type {
  ColorIntentType,
  InputInterface,
  PaletteStateInterface,
  RoleSchemaInterfaceType,
} from '@studnicky/iridis';
import { Engine }    from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import {
  contrastPlugin,
  ContrastPlugin,
} from '@studnicky/iridis-contrast';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Builds a fresh Engine with coreTasks registered and the contrastPlugin
 * adopted. Each runner call gets its own engine instance so pipeline()
 * calls do not bleed between scenarios.
 */
function makeEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(contrastPlugin);
  return engine;
}

/**
 * RoleSchema for WCAG AA 4.5:1 normal-text pairs.
 * Lightness bands pin role assignment: input seeds with L < 0.65 map to text,
 * seeds with L > 0.85 map to background. This avoids role-swap surprises when
 * resolve:roles runs its distance picker.
 */
function wcagAaRoles(
  fgName: string,
  bgName: string,
  minRatio = 4.5,
): RoleSchemaInterfaceType {
  return {
    'name':  'wcag-aa',
    'roles': [
      { 'name': fgName, 'required': true, 'lightnessRange': [0.30, 0.60] },
      { 'name': bgName, 'required': true, 'lightnessRange': [0.90, 1.00] },
    ],
    'contrastPairs': [
      { 'foreground': fgName, 'background': bgName, 'minRatio': minRatio, 'algorithm': 'wcag21' },
    ],
  };
}

/**
 * RoleSchema for WCAG AAA 7:1 pairs.
 * Lightness bands: dark seeds (L < 0.40) map to text; light seeds (L > 0.85)
 * map to background. Wide enough for both a passing near-black (#1a1a1a) and a
 * failing mid-gray (#777777) to land unambiguously in the text slot.
 */
function wcagAaaRoles(
  fgName: string,
  bgName: string,
): RoleSchemaInterfaceType {
  return {
    'name':  'wcag-aaa',
    'roles': [
      { 'name': fgName, 'required': true, 'lightnessRange': [0.10, 0.55] },
      { 'name': bgName, 'required': true, 'lightnessRange': [0.90, 1.00] },
    ],
    'contrastPairs': [
      { 'foreground': fgName, 'background': bgName, 'minRatio': 7.0, 'algorithm': 'wcag21' },
    ],
  };
}

/** RoleSchema with intent hints for APCA target selection. */
function apcaRoles(fgIntent: ColorIntentType, bgIntent: ColorIntentType): RoleSchemaInterfaceType {
  return {
    'name':  'apca',
    'roles': [
      {
        'name': 'text', 'required': true,
        'intent': fgIntent,
        'lightnessRange': [0.00, 0.30], 'chromaRange': [0.00, 0.05],
      },
      {
        'name': 'background', 'required': true,
        'intent': bgIntent,
        'lightnessRange': [0.85, 1.00], 'chromaRange': [0.00, 0.05],
      },
    ],
    'contrastPairs': [
      { 'foreground': 'text', 'background': 'background', 'minRatio': 1, 'algorithm': 'apca' },
    ],
  };
}

// CVD role schemas — hue offsets and lightness bands pin the distance-picker.

/** Red foreground / green background (protanopia / deuteranopia family). */
const CVD_RED_GREEN_ROLES: RoleSchemaInterfaceType = {
  'name':  'cvd-red-green',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.40, 0.70], 'chromaRange': [0.10, 0.40], 'hueOffset': 29  },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.40, 0.70], 'chromaRange': [0.10, 0.40], 'hueOffset': 142 },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 1.0, 'algorithm': 'wcag21' },
  ],
};

/** Blue foreground / yellow background (tritanopia family). */
const CVD_BLUE_YELLOW_ROLES: RoleSchemaInterfaceType = {
  'name':  'cvd-blue-yellow',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.30, 0.60], 'chromaRange': [0.10, 0.40], 'hueOffset': 264 },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.85, 1.00], 'chromaRange': [0.10, 0.40], 'hueOffset': 110 },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 1.0, 'algorithm': 'wcag21' },
  ],
};

/** Near-iso-luminant red/green (achromatopsia floor signal). */
const CVD_ISOLUM_ROLES: RoleSchemaInterfaceType = {
  'name':  'cvd-isolum',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.55, 0.70], 'chromaRange': [0.20, 0.30], 'hueOffset': 29  },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.70, 0.85], 'chromaRange': [0.20, 0.30], 'hueOffset': 142 },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 1.0, 'algorithm': 'wcag21' },
  ],
};

/** Black-on-white: canonical maximum-contrast pair (CVD negative case). */
const CVD_BLACK_WHITE_ROLES: RoleSchemaInterfaceType = {
  'name':  'cvd-black-white',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.00, 0.20], 'chromaRange': [0.00, 0.05] },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.90, 1.00], 'chromaRange': [0.00, 0.05] },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 1.0, 'algorithm': 'wcag21' },
  ],
};

/**
 * Role schema for enforce:contrast (core task) tests.
 * Text range [0.40, 0.90] accepts both light grays (failing) and dark grays
 * (passing). Background range [0.90, 1.00] anchors white.
 *   - #aaaaaa (L≈0.70, in range) → before≈2.3:1, adjusted=true
 *   - #494949 (L≈0.41, in range) → before≈9:1, adjusted=false
 */
const ENFORCE_CONTRAST_ROLES: RoleSchemaInterfaceType = {
  'name':  'enforce-contrast-adj',
  'roles': [
    { 'name': 'text',       'required': true, 'lightnessRange': [0.40, 0.90] },
    { 'name': 'background', 'required': true, 'lightnessRange': [0.90, 1.00] },
  ],
  'contrastPairs': [
    { 'foreground': 'text', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

// Typed metadata shapes (local, non-exported — structural access only).
interface ApcaPairShape {
  readonly foreground: string;
  readonly background: string;
  readonly algorithm:  string;
  readonly requiredLc: number;
  readonly beforeLc:   number;
  readonly afterLc:    number;
  readonly pass:       boolean;
}
interface WcagPairShape {
  readonly foreground: string;
  readonly background: string;
  readonly algorithm:  string;
  readonly required:   number;
  readonly before:     number;
  readonly after:      number;
  readonly pass:       boolean;
}
interface CvdWarningShape {
  readonly foreground:                string;
  readonly background:                string;
  readonly cvdType:                   string;
  readonly originalLuminanceContrast: number;
  readonly simulatedLuminanceContrast:number;
  readonly drop:                      number;
  readonly dropThreshold:             number;
  readonly minSimulatedContrast:      number;
}
interface AaMetaShape  { readonly pairs: readonly WcagPairShape[] }
interface AaaMetaShape { readonly pairs: readonly WcagPairShape[] }
interface ApcaMetaShape { readonly pairs: readonly ApcaPairShape[] }
interface CvdMetaShape  { readonly warnings: readonly CvdWarningShape[] }
interface ContrastReportShape {
  readonly foreground: string;
  readonly background: string;
  readonly algorithm:  string;
  readonly ratio:      number;
  readonly minRatio:   number;
  readonly passed:     boolean;
  readonly adjusted:   boolean;
}

// ---------------------------------------------------------------------------
// Cell 1 — plugin.shape
//
// ContrastPlugin must export a singleton `contrastPlugin` of class
// ContrastPlugin with:
//   - name    = 'contrast'
//   - version = '0.1.0'
//   - tasks() = exactly four enforce tasks in the canonical order
// The singleton is idempotent: multiple calls to tasks() return the same names.
// ---------------------------------------------------------------------------

interface PluginShapeInput  { readonly _noop: true }
interface PluginShapeOutput {
  readonly isInstance: boolean;
  readonly name:       string;
  readonly version:    string;
  readonly taskNames:  readonly string[];
  readonly taskNamesB: readonly string[];
}

const pluginShapeScenarios: readonly ScenarioInterface<PluginShapeInput, PluginShapeOutput>[] = [
  {
    name: 'singleton is ContrastPlugin instance with correct name and version',
    kind: 'happy',
    input: { _noop: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=identity] no throw');
      assert.strictEqual(output!.isInstance, true,    '[cell=1, scenario=identity] instanceof ContrastPlugin');
      assert.strictEqual(output!.name,       'contrast', '[cell=1, scenario=identity] name');
      assert.strictEqual(output!.version,    '0.1.0',    '[cell=1, scenario=identity] version');
    },
  },
  {
    name: 'tasks() returns exactly the four canonical enforce task names',
    kind: 'happy',
    input: { _noop: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
      assert.deepStrictEqual(
        [...output!.taskNames].sort(),
        ['enforce:apca', 'enforce:cvdSimulate', 'enforce:wcagAA', 'enforce:wcagAAA'],
        '[cell=1, scenario=task-names] exactly four enforce tasks',
      );
    },
  },
  {
    name: 'tasks() is idempotent — two calls return the same names',
    kind: 'edge',
    input: { _noop: true },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=idempotent] no throw');
      assert.deepStrictEqual(
        [...output!.taskNamesB].sort(),
        [...output!.taskNames].sort(),
        '[cell=1, scenario=idempotent] second tasks() call matches first',
      );
    },
  },
];

new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'ContrastPlugin :: cell-1 :: plugin.shape',
  (_input) => {
    return {
      isInstance:  contrastPlugin instanceof ContrastPlugin,
      name:        contrastPlugin.name,
      version:     contrastPlugin.version,
      taskNames:   contrastPlugin.tasks().map((t) => t.name),
      taskNamesB:  contrastPlugin.tasks().map((t) => t.name),
    };
  },
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — enforce:wcagAA
//
// enforce:wcagAA runs on all contrastPairs with algorithm='wcag21'. It:
//   - writes metadata.wcag.aa.pairs with foreground, background, algorithm,
//     required, before, after, pass fields
//   - uses pair.minRatio as the required ratio when > 0
//   - adjusts the foreground role so after >= required
//   - produces no output and skips silently when contrastPairs is empty
//   - ignores pairs whose algorithm is not 'wcag21'
// ---------------------------------------------------------------------------

interface WcagAaInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
}
interface WcagAaOutput {
  readonly state: PaletteStateInterface;
}

const wcagAaScenarios: readonly ScenarioInterface<WcagAaInput, WcagAaOutput>[] = [
  {
    name: 'dark gray on white already meets 4.5:1 — no adjustment',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAA'],
      input: {
        // #494949 (L≈0.41) maps to text range [0.30, 0.60]; white maps to background.
        // #494949 on white ≈ 9:1 — already passes AA without adjustment.
        'colors': ['#494949', '#ffffff'],
        'roles':  wcagAaRoles('text', 'background'),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-passing] no throw');
      const aa = output!.state.metadata['contrast:aa'] as AaMetaShape | undefined;
      assert.ok(aa !== undefined,        '[cell=2, scenario=aa-passing] metadata[\'contrast:aa\'] written');
      assert.ok(Array.isArray(aa.pairs),  '[cell=2, scenario=aa-passing] aa.pairs is array');
      assert.strictEqual(aa.pairs.length, 1, '[cell=2, scenario=aa-passing] one pair processed');
      const pair = aa.pairs[0]!;
      assert.strictEqual(pair.foreground, 'text',       '[cell=2, scenario=aa-passing] foreground name');
      assert.strictEqual(pair.background, 'background', '[cell=2, scenario=aa-passing] background name');
      assert.strictEqual(pair.algorithm,  'wcag21',     '[cell=2, scenario=aa-passing] algorithm field');
      assert.strictEqual(pair.required,   4.5,          '[cell=2, scenario=aa-passing] required from minRatio');
      assert.ok(pair.before >= pair.required, `[cell=2, scenario=aa-passing] before ${pair.before} already >= 4.5 (no adjustment)`);
      assert.ok(pair.after  >= pair.required, `[cell=2, scenario=aa-passing] after ${pair.after} >= required ${pair.required}`);
      assert.strictEqual(pair.pass, true, '[cell=2, scenario=aa-passing] pass=true');
    },
  },
  {
    name: 'failing pair: low-contrast gray adjusted to meet 4.5:1',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAA'],
      input: {
        'colors': ['#aaaaaa', '#ffffff'],
        'roles':  wcagAaRoles('text', 'background'),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-adjusted] no throw');
      const aa = output!.state.metadata['contrast:aa'] as AaMetaShape | undefined;
      const pair = aa?.pairs[0]!;
      assert.ok(pair !== undefined,           '[cell=2, scenario=aa-adjusted] pair present');
      assert.ok(pair.before < pair.required,  `[cell=2, scenario=aa-adjusted] before ${pair.before} was below required ${pair.required}`);
      assert.ok(pair.after  >= pair.required, `[cell=2, scenario=aa-adjusted] after ${pair.after} meets required ${pair.required}`);
      assert.strictEqual(pair.pass, true,     '[cell=2, scenario=aa-adjusted] pass=true after adjustment');
      // Foreground role hex must differ from original seed after adjustment.
      const textHex = output!.state.roles['text']?.hex;
      assert.ok(textHex !== undefined, '[cell=2, scenario=aa-adjusted] text role assigned');
      assert.notStrictEqual(
        textHex.toLowerCase(), '#aaaaaa',
        '[cell=2, scenario=aa-adjusted] text role was adjusted from low-contrast seed',
      );
    },
  },
  {
    name: 'boundary: minRatio 3.0 large-text pair — just-passing accepted',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAA'],
      input: {
        'colors': ['#767676', '#ffffff'],
        'roles':  wcagAaRoles('text', 'background', 4.5),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-boundary] no throw');
      const aa = output!.state.metadata['contrast:aa'] as AaMetaShape | undefined;
      const pair = aa?.pairs[0]!;
      assert.ok(pair !== undefined,            '[cell=2, scenario=aa-boundary] pair present');
      assert.ok(pair.after >= pair.required,   `[cell=2, scenario=aa-boundary] after ${pair.after} >= required ${pair.required}`);
      assert.strictEqual(pair.pass, true,      '[cell=2, scenario=aa-boundary] pair passes at boundary');
    },
  },
  {
    name: 'no contrastPairs in schema: wcag.aa not written',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAA'],
      input: {
        'colors': ['#000000', '#ffffff'],
        'roles': {
          'name':  'no-pairs',
          'roles': [{ 'name': 'primary', 'required': true }],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-no-pairs] no throw');
      const aa = output!.state.metadata['contrast:aa'] as AaMetaShape | undefined;
      assert.ok(aa === undefined, '[cell=2, scenario=aa-no-pairs] contrast:aa slot absent when no pairs');
    },
  },
  {
    name: 'apca-algorithm pair is skipped: wcag.aa pairs array is empty',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAA'],
      input: {
        'colors': ['#000000', '#ffffff'],
        'roles': {
          'name':  'apca-only',
          'roles': [
            { 'name': 'text',       'required': true },
            { 'name': 'background', 'required': true },
          ],
          'contrastPairs': [
            { 'foreground': 'text', 'background': 'background', 'minRatio': 1, 'algorithm': 'apca' },
          ],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=aa-skip-apca] no throw');
      const aa = output!.state.metadata['contrast:aa'] as AaMetaShape | undefined;
      // Task still writes the aa slot when it iterates, but all apca pairs are skipped.
      // If contrast:aa is written, pairs must be empty.
      if (aa !== undefined) {
        assert.strictEqual(
          aa.pairs.length, 0,
          '[cell=2, scenario=aa-skip-apca] apca-only pair produces 0 contrast:aa entries',
        );
      }
    },
  },
];

new ScenarioRunner<WcagAaInput, WcagAaOutput>(
  'ContrastPlugin :: cell-2 :: enforce:wcagAA',
  async (input) => {
    const engine = makeEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run(input.input);
    return { state };
  },
).run(wcagAaScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — enforce:wcagAAA
//
// enforce:wcagAAA targets 7:1 for normal text and 4.5:1 for UI. It:
//   - writes metadata.wcag.aaa.pairs with before/after/pass fields
//   - adjusts the foreground role when before < 7.0
//   - produces no output when contrastPairs is empty
//   - coexists with enforce:wcagAA in a combined pipeline (each writes its own slot)
// ---------------------------------------------------------------------------

interface WcagAaaInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
}
interface WcagAaaOutput {
  readonly state: PaletteStateInterface;
}

const wcagAaaScenarios: readonly ScenarioInterface<WcagAaaInput, WcagAaaOutput>[] = [
  {
    name: 'near-black on white already meets 7:1 — pass with no adjustment',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAAA'],
      input: {
        // #000000 is clamped to L=0.10 minimum (lightnessRange [0.10, 0.55]);
        // the resulting dark gray on white is ≈21:1 — clears AAA with margin.
        'colors': ['#000000', '#ffffff'],
        'roles':  wcagAaaRoles('text', 'background'),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-passing] no throw');
      const aaa = output!.state.metadata['contrast:aaa'] as AaaMetaShape | undefined;
      assert.ok(aaa !== undefined,        '[cell=3, scenario=aaa-passing] metadata[\'contrast:aaa\'] written');
      assert.ok(Array.isArray(aaa.pairs),  '[cell=3, scenario=aaa-passing] aaa.pairs is array');
      const pair = aaa.pairs[0]!;
      assert.strictEqual(pair.required, 7, '[cell=3, scenario=aaa-passing] required=7 from minRatio');
      assert.ok(pair.after >= 7,           `[cell=3, scenario=aaa-passing] after ${pair.after} >= 7`);
      assert.strictEqual(pair.pass, true,  '[cell=3, scenario=aaa-passing] pass=true');
    },
  },
  {
    name: 'low-contrast mid-gray pair adjusted to ≥7:1',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAAA'],
      input: {
        'colors': ['#777777', '#aaaaaa'],
        'roles':  wcagAaaRoles('text', 'background'),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-adjusted] no throw');
      const aaa = output!.state.metadata['contrast:aaa'] as AaaMetaShape | undefined;
      const pair = aaa?.pairs[0]!;
      assert.ok(pair !== undefined, '[cell=3, scenario=aaa-adjusted] pair present');
      assert.ok(pair.before < pair.required, `[cell=3, scenario=aaa-adjusted] before ${pair.before} was below 7`);
      assert.ok(pair.after  >= pair.required, `[cell=3, scenario=aaa-adjusted] after ${pair.after} meets 7 after enforce`);
      assert.strictEqual(pair.pass, true, '[cell=3, scenario=aaa-adjusted] pass=true');
      const textHex = output!.state.roles['text']?.hex;
      const bgHex   = output!.state.roles['background']?.hex;
      assert.ok(textHex !== undefined && bgHex !== undefined, '[cell=3, scenario=aaa-adjusted] both roles assigned');
      assert.notStrictEqual(textHex, bgHex, '[cell=3, scenario=aaa-adjusted] text hex differs from bg after enforce');
    },
  },
  {
    name: 'AA + AAA combined pipeline — both slots written independently',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAA', 'enforce:wcagAAA'],
      input: {
        'colors': ['#000000', '#ffffff'],
        // Use explicit minRatio on each schema so both tasks process the pair.
        // enforce:wcagAA picks up the 4.5 value; enforce:wcagAAA picks up the
        // 7.0 value from its own schema (contrastPairs are read independently).
        'roles': {
          'name':  'combined',
          'roles': [
            { 'name': 'text',       'required': true },
            { 'name': 'background', 'required': true },
          ],
          'contrastPairs': [
            { 'foreground': 'text', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
          ],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-combined] no throw');
      const aa  = output!.state.metadata['contrast:aa']  as AaMetaShape  | undefined;
      const aaa = output!.state.metadata['contrast:aaa'] as AaaMetaShape | undefined;
      assert.ok(aa  !== undefined, '[cell=3, scenario=aaa-combined] contrast:aa written');
      assert.ok(aaa !== undefined, '[cell=3, scenario=aaa-combined] contrast:aaa written');
      assert.strictEqual(aa.pairs.length,  1, '[cell=3, scenario=aaa-combined] one aa pair');
      assert.strictEqual(aaa.pairs.length, 1, '[cell=3, scenario=aaa-combined] one aaa pair');
      // AA uses the schema's 4.5 minRatio; AAA uses the schema's 4.5 too (wcagRequiredRatio
      // selects AAA-level minimum when minRatio > 0, it returns pair.minRatio directly).
      // Both tasks see the same 4.5 from the schema; verify each slot is independently written.
      assert.strictEqual(aa.pairs[0]!.required,  4.5, '[cell=3, scenario=aaa-combined] aa required=4.5');
      assert.strictEqual(aaa.pairs[0]!.required, 4.5, '[cell=3, scenario=aaa-combined] aaa required=4.5 (both tasks read same schema)');
      assert.strictEqual(aa.pairs[0]!.pass,  true, '[cell=3, scenario=aaa-combined] aa passes');
      assert.strictEqual(aaa.pairs[0]!.pass, true, '[cell=3, scenario=aaa-combined] aaa passes');
    },
  },
  {
    name: 'no contrastPairs in schema: wcag.aaa not written',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAAA'],
      input: {
        'colors': ['#000000', '#ffffff'],
        'roles': {
          'name':  'no-pairs',
          'roles': [{ 'name': 'primary', 'required': true }],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-no-pairs] no throw');
      const aaa = output!.state.metadata['contrast:aaa'] as AaaMetaShape | undefined;
      assert.ok(aaa === undefined, '[cell=3, scenario=aaa-no-pairs] contrast:aaa slot absent when no pairs');
    },
  },
  {
    name: 'near-black on white: before already exceeds 7:1 — no adjustment needed',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:wcagAAA'],
      input: {
        // #1a1a1a on white is ≈17:1 — clears AAA boundary with margin.
        // Lightness bands pin assignment: dark to text, light to background.
        'colors': ['#1a1a1a', '#ffffff'],
        'roles': {
          'name':  'wcag-aaa-edge',
          'roles': [
            { 'name': 'text',       'required': true, 'lightnessRange': [0.00, 0.30] },
            { 'name': 'background', 'required': true, 'lightnessRange': [0.90, 1.00] },
          ],
          'contrastPairs': [
            { 'foreground': 'text', 'background': 'background', 'minRatio': 7.0, 'algorithm': 'wcag21' },
          ],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=aaa-at-boundary] no throw');
      const aaa = output!.state.metadata['contrast:aaa'] as AaaMetaShape | undefined;
      const pair = aaa?.pairs[0]!;
      assert.ok(pair !== undefined, '[cell=3, scenario=aaa-at-boundary] pair present');
      assert.ok(pair.before >= pair.required,
        `[cell=3, scenario=aaa-at-boundary] before ${pair.before} already >= required ${pair.required}`);
      assert.ok(pair.after >= pair.required, `[cell=3, scenario=aaa-at-boundary] after ${pair.after} >= 7`);
      assert.strictEqual(pair.pass, true, '[cell=3, scenario=aaa-at-boundary] pass=true when already above AAA threshold');
    },
  },
];

new ScenarioRunner<WcagAaaInput, WcagAaaOutput>(
  'ContrastPlugin :: cell-3 :: enforce:wcagAAA',
  async (input) => {
    const engine = makeEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run(input.input);
    return { state };
  },
).run(wcagAaaScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — enforce:apca
//
// enforce:apca filters pairs whose algorithm='apca' and selects the Lc target
// by role hint intents:
//   - text + background → Lc 75 (body text)
//   - text only (no background intent) → Lc 60 (fluent/headline)
//   - neither → Lc 45 (non-text UI)
// It writes metadata.wcag.apca.pairs. No-pairs → no output.
// ---------------------------------------------------------------------------

interface ApcaInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
}
interface ApcaOutput {
  readonly state: PaletteStateInterface;
}

const apcaScenarios: readonly ScenarioInterface<ApcaInput, ApcaOutput>[] = [
  {
    name: 'text+background intent selects Lc 75 body-text target; black on white passes',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:apca'],
      input: {
        'colors': ['#000000', '#ffffff'],
        'roles':  apcaRoles('text', 'background'),
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-body-text] no throw');
      const apca = output!.state.metadata['contrast:apca'] as ApcaMetaShape | undefined;
      assert.ok(apca !== undefined,        '[cell=4, scenario=apca-body-text] metadata[\'contrast:apca\'] written');
      assert.ok(Array.isArray(apca.pairs),  '[cell=4, scenario=apca-body-text] apca.pairs is array');
      assert.strictEqual(apca.pairs.length, 1, '[cell=4, scenario=apca-body-text] one pair processed');
      const pair = apca.pairs[0]!;
      assert.strictEqual(pair.foreground, 'text',       '[cell=4, scenario=apca-body-text] foreground name');
      assert.strictEqual(pair.background, 'background', '[cell=4, scenario=apca-body-text] background name');
      assert.strictEqual(pair.algorithm,  'apca',       '[cell=4, scenario=apca-body-text] algorithm=apca');
      assert.strictEqual(pair.requiredLc, 75,
        `[cell=4, scenario=apca-body-text] requiredLc=75 for text+background intent (got ${pair.requiredLc})`);
      assert.ok(pair.afterLc >= pair.requiredLc,
        `[cell=4, scenario=apca-body-text] afterLc ${pair.afterLc} >= requiredLc 75`);
      assert.strictEqual(pair.pass, true, '[cell=4, scenario=apca-body-text] pass=true');
      assert.ok(Math.abs(pair.afterLc) >= 45,
        `[cell=4, scenario=apca-body-text] afterLc magnitude ${pair.afterLc} substantial for high-contrast pair`);
    },
  },
  {
    name: 'text intent without background selects Lc 60 fluent-text target',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:apca'],
      input: {
        'colors': ['#000000', '#888888'],
        'roles': {
          'name':  'apca-fluent',
          'roles': [
            // text intent on fg, accent on bg — triggers the isText-only branch (Lc 60).
            { 'name': 'heading', 'required': true, 'intent': 'text',   'lightnessRange': [0.00, 0.30], 'chromaRange': [0.00, 0.05] },
            { 'name': 'card',    'required': true, 'intent': 'accent', 'lightnessRange': [0.40, 0.65], 'chromaRange': [0.00, 0.05] },
          ],
          'contrastPairs': [
            { 'foreground': 'heading', 'background': 'card', 'minRatio': 1, 'algorithm': 'apca' },
          ],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-fluent] no throw');
      const apca = output!.state.metadata['contrast:apca'] as ApcaMetaShape | undefined;
      const pair = apca?.pairs[0]!;
      assert.ok(pair !== undefined, '[cell=4, scenario=apca-fluent] pair present');
      assert.strictEqual(pair.requiredLc, 60,
        `[cell=4, scenario=apca-fluent] requiredLc=60 for text+accent intent (got ${pair.requiredLc})`);
    },
  },
  {
    name: 'no intent on either role selects Lc 45 non-text-UI target',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:apca'],
      input: {
        'colors': ['#888888', '#ffffff'],
        'roles': {
          'name':  'apca-ui',
          'roles': [
            { 'name': 'icon',   'required': true, 'lightnessRange': [0.30, 0.60], 'chromaRange': [0.00, 0.05] },
            { 'name': 'canvas', 'required': true, 'lightnessRange': [0.85, 1.00], 'chromaRange': [0.00, 0.05] },
          ],
          'contrastPairs': [
            { 'foreground': 'icon', 'background': 'canvas', 'minRatio': 1, 'algorithm': 'apca' },
          ],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-ui] no throw');
      const apca = output!.state.metadata['contrast:apca'] as ApcaMetaShape | undefined;
      const pair = apca?.pairs[0]!;
      assert.ok(pair !== undefined, '[cell=4, scenario=apca-ui] pair present');
      assert.strictEqual(pair.requiredLc, 45,
        `[cell=4, scenario=apca-ui] requiredLc=45 for no-intent UI pair (got ${pair.requiredLc})`);
    },
  },
  {
    name: 'no contrastPairs in schema: apca slot not written',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:apca'],
      input: {
        'colors': ['#000000', '#ffffff'],
        'roles': {
          'name':  'no-pairs',
          'roles': [{ 'name': 'primary', 'required': true }],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-no-pairs] no throw');
      const apca = output!.state.metadata['contrast:apca'] as ApcaMetaShape | undefined;
      assert.ok(apca === undefined, '[cell=4, scenario=apca-no-pairs] contrast:apca slot absent when no pairs');
    },
  },
  {
    name: 'wcag21-algorithm pair in schema is ignored by enforce:apca',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:apca'],
      input: {
        'colors': ['#000000', '#ffffff'],
        'roles':  wcagAaRoles('text', 'background'),  // wcag21 algorithm
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=apca-ignore-wcag21] no throw');
      const apca = output!.state.metadata['contrast:apca'] as ApcaMetaShape | undefined;
      // enforce:apca must skip wcag21 pairs — apca slot absent or empty.
      if (apca !== undefined) {
        assert.strictEqual(
          apca.pairs.length, 0,
          '[cell=4, scenario=apca-ignore-wcag21] wcag21 pair produces 0 contrast:apca entries',
        );
      }
    },
  },
];

new ScenarioRunner<ApcaInput, ApcaOutput>(
  'ContrastPlugin :: cell-4 :: enforce:apca',
  async (input) => {
    const engine = makeEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run(input.input);
    return { state };
  },
).run(apcaScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — enforce:cvdSimulate
//
// enforce:cvdSimulate evaluates every contrastPair against all four CVD
// matrices and emits warnings on metadata['contrast:cvd'].warnings. Two signals:
//   - drop signal: |trichromat contrast − simulated contrast| > dropMagnitude
//   - floor signal: simulated contrast < minSimulatedContrast (3.0 SC-1.4.11)
// Achromatopsia uses BT.709 (luminance-invariant): drop is always ~0; only
// the floor signal fires. The task is advisory: it never mutates roles.
// ---------------------------------------------------------------------------

interface CvdInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
}
interface CvdOutput {
  readonly state: PaletteStateInterface;
}

const cvdScenarios: readonly ScenarioInterface<CvdInput, CvdOutput>[] = [
  {
    name: 'saturated red on green raises deuteranopia warning (floor signal)',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      input: {
        'colors': ['#d00000', '#008000'],
        'roles':  CVD_RED_GREEN_ROLES,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-deuter-floor] no throw');
      const cvd = output!.state.metadata['contrast:cvd'] as CvdMetaShape | undefined;
      assert.ok(cvd !== undefined,           '[cell=5, scenario=cvd-deuter-floor] metadata[\'contrast:cvd\'] written');
      assert.ok(Array.isArray(cvd.warnings),  '[cell=5, scenario=cvd-deuter-floor] cvd.warnings is array');
      const deuter = cvd.warnings.find((w) => w.cvdType === 'deuteranopia');
      assert.ok(deuter !== undefined,              '[cell=5, scenario=cvd-deuter-floor] deuteranopia warning fires');
      assert.strictEqual(deuter.foreground, 'text',        '[cell=5, scenario=cvd-deuter-floor] foreground name');
      assert.strictEqual(deuter.background, 'background',  '[cell=5, scenario=cvd-deuter-floor] background name');
      assert.strictEqual(deuter.dropThreshold,       0.5,  '[cell=5, scenario=cvd-deuter-floor] dropThreshold=0.5');
      assert.strictEqual(deuter.minSimulatedContrast, 3.0, '[cell=5, scenario=cvd-deuter-floor] floor=3.0');
      assert.ok(
        deuter.simulatedLuminanceContrast < deuter.minSimulatedContrast,
        `[cell=5, scenario=cvd-deuter-floor] sim ${deuter.simulatedLuminanceContrast} below 3.0 floor`,
      );
      assert.ok(deuter.originalLuminanceContrast > 1.0,
        `[cell=5, scenario=cvd-deuter-floor] original contrast ${deuter.originalLuminanceContrast} > 1`);
    },
  },
  {
    name: 'pure red on green flags protanopia (drop signal) and deuteranopia',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      input: {
        'colors': ['#ff0000', '#00cc00'],
        'roles':  CVD_RED_GREEN_ROLES,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-prot-drop] no throw');
      const cvd = output!.state.metadata['contrast:cvd'] as CvdMetaShape | undefined;
      assert.ok(cvd !== undefined, '[cell=5, scenario=cvd-prot-drop] contrast:cvd written');
      const prot = cvd.warnings.find((w) => w.cvdType === 'protanopia');
      assert.ok(prot !== undefined, '[cell=5, scenario=cvd-prot-drop] protanopia warning fires');
      assert.strictEqual(prot.foreground, 'text',       '[cell=5, scenario=cvd-prot-drop] foreground');
      assert.strictEqual(prot.background, 'background', '[cell=5, scenario=cvd-prot-drop] background');
      assert.ok(
        Math.abs(prot.drop) > prot.dropThreshold,
        `[cell=5, scenario=cvd-prot-drop] |drop| ${Math.abs(prot.drop)} > threshold ${prot.dropThreshold}`,
      );
      const deut = cvd.warnings.find((w) => w.cvdType === 'deuteranopia');
      assert.ok(deut !== undefined, '[cell=5, scenario=cvd-prot-drop] deuteranopia also fires (same confusion family)');
    },
  },
  {
    name: 'blue on yellow flags tritanopia (drop signal exceeds 0.5)',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      input: {
        'colors': ['#0000ff', '#ffff00'],
        'roles':  CVD_BLUE_YELLOW_ROLES,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-trit-drop] no throw');
      const cvdTrit = output!.state.metadata['contrast:cvd'] as CvdMetaShape | undefined;
      assert.ok(cvdTrit !== undefined, '[cell=5, scenario=cvd-trit-drop] cvd written');
      const trit = cvdTrit.warnings.find((w) => w.cvdType === 'tritanopia');
      assert.ok(trit !== undefined, '[cell=5, scenario=cvd-trit-drop] tritanopia warning fires');
      assert.strictEqual(trit.foreground, 'text',       '[cell=5, scenario=cvd-trit-drop] foreground');
      assert.strictEqual(trit.background, 'background', '[cell=5, scenario=cvd-trit-drop] background');
      assert.strictEqual(trit.dropThreshold, 0.5, '[cell=5, scenario=cvd-trit-drop] dropThreshold=0.5');
      assert.ok(
        Math.abs(trit.drop) > trit.dropThreshold,
        `[cell=5, scenario=cvd-trit-drop] |drop| ${Math.abs(trit.drop)} > 0.5 for tritanopia`,
      );
    },
  },
  {
    name: 'iso-luminant red/green flags achromatopsia via SC-1.4.11 floor (drop~0)',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      input: {
        'colors': ['#ff0000', '#00d800'],
        'roles':  CVD_ISOLUM_ROLES,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-achr-floor] no throw');
      const cvdAchr = output!.state.metadata['contrast:cvd'] as CvdMetaShape | undefined;
      assert.ok(cvdAchr !== undefined, '[cell=5, scenario=cvd-achr-floor] cvd written');
      const achr = cvdAchr.warnings.find((w) => w.cvdType === 'achromatopsia');
      assert.ok(achr !== undefined, '[cell=5, scenario=cvd-achr-floor] achromatopsia warning fires');
      assert.strictEqual(achr.dropThreshold,        0,   '[cell=5, scenario=cvd-achr-floor] dropThreshold=0 by BT.709 invariance');
      assert.strictEqual(achr.minSimulatedContrast, 3.0, '[cell=5, scenario=cvd-achr-floor] floor=3.0 (SC-1.4.11)');
      assert.ok(
        Math.abs(achr.drop) < 0.001,
        `[cell=5, scenario=cvd-achr-floor] drop ${achr.drop} is ~0 for BT.709 luminance-preserving projection`,
      );
      assert.ok(
        achr.simulatedLuminanceContrast < achr.minSimulatedContrast,
        `[cell=5, scenario=cvd-achr-floor] sim ${achr.simulatedLuminanceContrast} below 3.0 floor`,
      );
    },
  },
  {
    name: 'black on white passes all four CVD checks — zero warnings (negative)',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      input: {
        'colors': ['#000000', '#ffffff'],
        'roles':  CVD_BLACK_WHITE_ROLES,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-clean-pass] no throw');
      const cvdClean = output!.state.metadata['contrast:cvd'] as CvdMetaShape | undefined;
      assert.ok(cvdClean !== undefined,               '[cell=5, scenario=cvd-clean-pass] cvd slot written');
      assert.ok(Array.isArray(cvdClean.warnings),     '[cell=5, scenario=cvd-clean-pass] warnings array present');
      assert.strictEqual(
        cvdClean.warnings.length, 0,
        `[cell=5, scenario=cvd-clean-pass] black-on-white must produce 0 CVD warnings; got ${cvdClean.warnings.length}`,
      );
    },
  },
  {
    name: 'no contrastPairs in schema: cvd slot not written',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      input: {
        'colors': ['#000000', '#ffffff'],
        'roles': {
          'name':  'no-pairs',
          'roles': [{ 'name': 'primary', 'required': true }],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-no-pairs] no throw');
      const cvdNoPairs = output!.state.metadata['contrast:cvd'] as CvdMetaShape | undefined;
      assert.ok(cvdNoPairs === undefined, '[cell=5, scenario=cvd-no-pairs] cvd slot absent when no pairs');
    },
  },
  {
    name: 'cvdSimulate is advisory only — roles not mutated',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:cvdSimulate'],
      input: {
        'colors': ['#d00000', '#008000'],
        'roles':  CVD_RED_GREEN_ROLES,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=cvd-advisory-only] no throw');
      const textHex = output!.state.roles['text']?.hex;
      const bgHex   = output!.state.roles['background']?.hex;
      assert.ok(textHex !== undefined, '[cell=5, scenario=cvd-advisory-only] text role assigned');
      assert.ok(bgHex   !== undefined, '[cell=5, scenario=cvd-advisory-only] background role assigned');
      // Roles must not be mutated by the advisory task (no hex adjustment).
      // The text role should be derived from the red seed (#d00000) — not darkened/lightened.
      assert.ok(
        textHex.toLowerCase() !== bgHex.toLowerCase(),
        '[cell=5, scenario=cvd-advisory-only] roles remain distinct (no auto-fix applied)',
      );
    },
  },
];

new ScenarioRunner<CvdInput, CvdOutput>(
  'ContrastPlugin :: cell-5 :: enforce:cvdSimulate',
  async (input) => {
    const engine = makeEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run(input.input);
    return { state };
  },
).run(cvdScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — enforce:contrast (core task)
//
// enforce:contrast (from @studnicky/iridis/tasks) applies per-pair minRatio
// enforcement via ensureContrast. It writes metadata.contrastReport. This
// cell tests the contrast plugin's integration with the core task via shared
// pipeline, verifying:
//   - adjusted=true when foreground is nudged
//   - adjusted=false when pair already passes
//   - algorithm field echoed from pair schema
//   - no contrastPairs → contrastReport absent (no-op)
// ---------------------------------------------------------------------------

interface EnforceContrastInput {
  readonly pipeline: readonly string[];
  readonly input:    InputInterface;
}
interface EnforceContrastOutput {
  readonly state: PaletteStateInterface;
}

const enforceContrastScenarios: readonly ScenarioInterface<EnforceContrastInput, EnforceContrastOutput>[] = [
  {
    name: 'failing pair triggers adjusted=true and rewrites the foreground role',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:contrast'],
      input: {
        // #aaaaaa (L≈0.70) falls in text range [0.40, 0.90] and yields ≈2.3:1 on
        // white — well below 4.5:1, triggering the adjusted=true enforcement branch.
        'colors': ['#aaaaaa', '#ffffff'],
        'roles':  ENFORCE_CONTRAST_ROLES,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=ec-adjusted] no throw');
      const report = output!.state.metadata['core:contrastReport'] as readonly ContrastReportShape[] | undefined;
      assert.ok(report !== undefined,           '[cell=6, scenario=ec-adjusted] contrastReport written');
      assert.strictEqual(report.length, 1,       '[cell=6, scenario=ec-adjusted] one pair processed');
      const entry = report[0]!;
      assert.strictEqual(entry.foreground, 'text',       '[cell=6, scenario=ec-adjusted] foreground name');
      assert.strictEqual(entry.background, 'background', '[cell=6, scenario=ec-adjusted] background name');
      assert.strictEqual(entry.algorithm,  'wcag21',     '[cell=6, scenario=ec-adjusted] algorithm=wcag21');
      assert.strictEqual(entry.minRatio,   4.5,          '[cell=6, scenario=ec-adjusted] minRatio from schema');
      assert.strictEqual(entry.adjusted,   true,         '[cell=6, scenario=ec-adjusted] adjusted=true for failing pair');
      assert.strictEqual(entry.passed,     true,         '[cell=6, scenario=ec-adjusted] passed=true after adjustment');
      assert.ok(entry.ratio >= 4.5,
        `[cell=6, scenario=ec-adjusted] ratio ${entry.ratio} >= 4.5 after enforce`);
      // Text role hex must differ from original seed after adjustment (foreground darkened).
      const textHex = output!.state.roles['text']?.hex;
      assert.ok(textHex !== undefined, '[cell=6, scenario=ec-adjusted] text role present');
      const bgHex = output!.state.roles['background']?.hex;
      assert.strictEqual(
        bgHex?.toLowerCase(), '#ffffff',
        '[cell=6, scenario=ec-adjusted] background role unchanged (only fg adjusted)',
      );
    },
  },
  {
    name: 'passing pair: adjusted=false, ratio preserved',
    kind: 'happy',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:contrast'],
      input: {
        // #494949 (L≈0.41) maps to text range [0.40, 0.90] and yields ≈9:1 on
        // white — already above 4.5:1, so no adjustment is applied.
        'colors': ['#494949', '#ffffff'],
        'roles':  ENFORCE_CONTRAST_ROLES,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=ec-passing] no throw');
      const report = output!.state.metadata['core:contrastReport'] as readonly ContrastReportShape[] | undefined;
      const entry = report?.[0]!;
      assert.ok(entry !== undefined,            '[cell=6, scenario=ec-passing] pair present');
      assert.strictEqual(entry.adjusted, false, '[cell=6, scenario=ec-passing] adjusted=false when already passing');
      assert.strictEqual(entry.passed,   true,  '[cell=6, scenario=ec-passing] passed=true');
      assert.ok(entry.ratio >= 4.5,
        `[cell=6, scenario=ec-passing] ratio ${entry.ratio} >= 4.5`);
    },
  },
  {
    name: 'no contrastPairs in schema: contrastReport not written',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:contrast'],
      input: {
        'colors': ['#000000', '#ffffff'],
        'roles': {
          'name':  'no-pairs',
          'roles': [{ 'name': 'primary', 'required': true }],
        },
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=ec-no-pairs] no throw');
      const report = output!.state.metadata['core:contrastReport'] as readonly ContrastReportShape[] | undefined;
      assert.ok(
        report === undefined || report.length === 0,
        '[cell=6, scenario=ec-no-pairs] contrastReport absent or empty when no pairs',
      );
    },
  },
  {
    name: 'dark-gray on white: ratio near 4.5:1 boundary passes',
    kind: 'edge',
    input: {
      pipeline: ['intake:hex', 'resolve:roles', 'enforce:contrast'],
      input: {
        // #767676 on white ≈ 4.54:1 — just above the 4.5 boundary.
        // Lightness bands: gray (L≈0.48) maps to text [0.00, 0.50]; white to background.
        'colors': ['#767676', '#ffffff'],
        'roles':  ENFORCE_CONTRAST_ROLES,
      },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=ec-boundary] no throw');
      const report = output!.state.metadata['core:contrastReport'] as readonly ContrastReportShape[] | undefined;
      const entry = report?.[0]!;
      assert.ok(entry !== undefined, '[cell=6, scenario=ec-boundary] pair present');
      assert.ok(entry.ratio >= 4.5,
        `[cell=6, scenario=ec-boundary] ratio ${entry.ratio} >= 4.5 at boundary`);
      assert.strictEqual(entry.passed, true, '[cell=6, scenario=ec-boundary] passed=true');
    },
  },
];

new ScenarioRunner<EnforceContrastInput, EnforceContrastOutput>(
  'ContrastPlugin :: cell-6 :: enforce:contrast',
  async (input) => {
    const engine = makeEngine();
    engine.pipeline(input.pipeline);
    const state = await engine.run(input.input);
    return { state };
  },
).run(enforceContrastScenarios);
