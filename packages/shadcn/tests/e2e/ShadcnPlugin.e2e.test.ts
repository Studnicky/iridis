/**
 * ShadcnPlugin e2e — scenario-matrix suite.
 *
 * Subject: `ShadcnPlugin` (plugin shape) + `emit:shadcnTheme` (the sole
 * task it registers). `emit:shadcnTheme` reads `state.roles` and, for
 * each of the 19 shadcn/ui (Tailwind v4) CSS custom properties, walks an
 * ordered role-name candidate chain (`VAR_ROLE_CANDIDATES` in
 * `EmitShadcnTheme.ts`) taking the first role present in the resolved
 * palette. A variable whose entire chain is absent is skipped — not
 * defaulted. Each cell covers one concern; scenarios within each cell
 * exhaust the happy / edge / unhappy matrix for that concern.
 *
 * Role→color assignment in these fixtures is made deterministic by
 * giving every role a distinct `hueOffset` (0, 30, 60, ...) alongside an
 * `intake:oklch` color at the identical hue: `resolve:roles` picks the
 * candidate whose OKLCH hue distance to the role's `hueOffset` is
 * smallest, so each role deterministically claims its own color instead
 * of every unconstrained role collapsing onto `state.colors[0]`.
 *
 * Cells:
 *   1. plugin-shape             — singleton identity, task manifest, output schema contribution
 *   2. full-coverage            — every one of the 19 vars resolves; exact colors map and cssVars (golden)
 *   3. partial-omission         — vars whose full candidate chain is absent are skipped, not defaulted
 *   4. determinism              — two fresh engines on the same input produce byte-identical output
 *   5. role-coverage            — every schema role referenced by a chain appears as a colors value
 *   6. empty-roles              — no matching roles / roles:undefined — no throw, colors {}, well-formed cssVars
 *   7. missing-prerequisite     — engine.pipeline() throws when shadcnPlugin was never adopted
 *   8. invalid-input            — intake:hex throws on a non-hex entry before emit:shadcnTheme runs
 */

import type { InputInterface, RoleSchemaInterfaceType } from '@studnicky/iridis';

import { ModuleError, ValidationError } from '@studnicky/errors';
import { shadcnPlugin, ShadcnPlugin }   from '@studnicky/iridis-shadcn';
import { Engine }                       from '@studnicky/iridis/engine';
import { coreTasks }                    from '@studnicky/iridis/tasks';
import assert                           from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { InvalidInputOutputEntity } from '../entities/InvalidInputOutputEntity.ts';
import type { MissingTaskInputEntity } from '../entities/MissingTaskInputEntity.ts';
import type { MissingTaskOutputEntity } from '../entities/MissingTaskOutputEntity.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { ShadcnThemeScenarioOutputEntity } from '../entities/ShadcnThemeScenarioOutputEntity.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type RoleDefinition = RoleSchemaInterfaceType['roles'][number];

class ShadcnTestFixture {
  static freshEngine(): Engine {
    const engine = new Engine();
    for (const t of coreTasks) {engine.tasks.register(t);}
    engine.adopt(shadcnPlugin);
    return engine;
  }

  static oklchPipeline(): readonly string[] {
    return ['intake:oklch', 'resolve:roles', 'emit:shadcnTheme'];
  }

  static hexPipeline(): readonly string[] {
    return ['intake:hex', 'resolve:roles', 'emit:shadcnTheme'];
  }
}

class RoleSchemaFixture {
  static role(name: string, hueOffset: number | undefined, required: boolean): RoleDefinition {
    return {
      'chromaRange':    undefined,
      'derivedFrom':    undefined,
      'description':    undefined,
      'hue':            undefined,
      'hueClamp':       undefined,
      'hueOffset':      hueOffset,
      'intent':         undefined,
      'lightnessRange': undefined,
      'name':           name,
      'required':       required
    };
  }

  static schema(name: string, roles: readonly RoleDefinition[]): RoleSchemaInterfaceType {
    return {
      'contrastPairs': undefined,
      'description':   undefined,
      'name':          name,
      'roles':         [...roles]
    };
  }
}

interface ShadcnRunInputInterface {
  readonly 'colors':   InputInterface['colors'];
  readonly 'pipeline': readonly string[];
  readonly 'roles':    RoleSchemaInterfaceType | undefined;
}

class ShadcnScenarioOutput {
  static run(input: ShadcnRunInputInterface): ShadcnThemeScenarioOutputEntity.Type {
    const engine = ShadcnTestFixture.freshEngine();
    engine.pipeline(input.pipeline);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     input.roles,
      'runtime':   undefined
    });
    const theme = state.outputs['shadcn:theme'];
    assert.ok(theme !== undefined, 'outputs.shadcn:theme must be present');
    if (!ShadcnThemeScenarioOutputEntity.validate(theme)) {
      throw new Error('outputs.shadcn:theme is invalid');
    }
    return theme;
  }
}

// Full candidate vocabulary — one role per name referenced anywhere in
// VAR_ROLE_CANDIDATES, each pinned to a distinct 30-degree hue step so
// resolve:roles assigns each role a unique, verifiable color.
const FULL_COVERAGE_ROLE_NAMES = [
  'accent-alt', 'brand', 'text', 'background', 'border', 'surface',
  'error', 'bg-soft', 'text-subtle', 'on-brand', 'focus-ring'
] as const;

const FULL_COVERAGE_ROLES = RoleSchemaFixture.schema(
  'full-coverage',
  FULL_COVERAGE_ROLE_NAMES.map((name, index) => { const result = RoleSchemaFixture.role(name, index * 30, true); return result; })
);

const FULL_COVERAGE_COLORS: InputInterface['colors'] = FULL_COVERAGE_ROLE_NAMES.map((_, index) => {
  const result = { 'c': 0.10, 'h': index * 30, 'l': 0.60 };
  return result;
});

// Hand-computed from a real run of the full-coverage fixture above through
// intake:oklch -> resolve:roles -> emit:shadcnTheme (verified against the
// real EmitShadcnTheme.ts VAR_ROLE_CANDIDATES chains):
//   accent-alt=#b1667e brand=#b4685c text=#ac713e background=#977d30
//   border=#798940 surface=#519160 error=#239382 bg-soft=#1590a1
//   text-subtle=#4188b6 on-brand=#697dbc focus-ring=#8972b3
const FULL_COVERAGE_EXPECTED_COLORS: Readonly<Record<string, string>> = {
  '--accent':                 '#b1667e',
  '--accent-foreground':      '#ac713e',
  '--background':             '#977d30',
  '--border':                 '#798940',
  '--card':                   '#519160',
  '--card-foreground':        '#ac713e',
  '--destructive':            '#239382',
  '--destructive-foreground': '#ac713e',
  '--foreground':             '#ac713e',
  '--input':                  '#798940',
  '--muted':                  '#1590a1',
  '--muted-foreground':       '#4188b6',
  '--popover':                '#519160',
  '--popover-foreground':     '#ac713e',
  '--primary':                '#b4685c',
  '--primary-foreground':     '#697dbc',
  '--ring':                   '#8972b3',
  '--secondary':              '#b1667e',
  '--secondary-foreground':   '#ac713e'
};

const FULL_COVERAGE_EXPECTED_CSS_VARS = `:root {
  --accent: 0.6000 0.1000 0.00;
  --accent-foreground: 0.6000 0.1000 60.00;
  --background: 0.6000 0.1000 90.00;
  --border: 0.6000 0.1000 120.00;
  --card: 0.6000 0.1000 150.00;
  --card-foreground: 0.6000 0.1000 60.00;
  --destructive: 0.6000 0.1000 180.00;
  --destructive-foreground: 0.6000 0.1000 60.00;
  --foreground: 0.6000 0.1000 60.00;
  --input: 0.6000 0.1000 120.00;
  --muted: 0.6000 0.1000 210.00;
  --muted-foreground: 0.6000 0.1000 240.00;
  --popover: 0.6000 0.1000 150.00;
  --popover-foreground: 0.6000 0.1000 60.00;
  --primary: 0.6000 0.1000 30.00;
  --primary-foreground: 0.6000 0.1000 270.00;
  --ring: 0.6000 0.1000 300.00;
  --secondary: 0.6000 0.1000 0.00;
  --secondary-foreground: 0.6000 0.1000 60.00;
}`;

// Two-role fixture: only 'background' and 'text' resolve. Chains needing
// any other candidate ('accent-alt'/'brand'/'border'/'divider'/'muted'/
// 'error'/'focus-ring'/'on-brand'/'surface'/'bg-soft'/'text-subtle') stay
// fully unresolved and must be skipped, not defaulted.
const PARTIAL_ROLES = RoleSchemaFixture.schema('partial', [
  RoleSchemaFixture.role('background', 0, true),
  RoleSchemaFixture.role('text', 180, true)
]);

const PARTIAL_COLORS: InputInterface['colors'] = [
  { 'c': 0.10, 'h': 0, 'l': 0.60 },
  { 'c': 0.10, 'h': 180, 'l': 0.60 }
];

// Hand-computed: background resolves to #b1667e (h=0), text to #239382 (h=180).
const PARTIAL_EXPECTED_COLORS: Readonly<Record<string, string>> = {
  '--accent-foreground':      '#239382',
  '--background':             '#b1667e',
  '--card':                   '#b1667e',
  '--card-foreground':        '#239382',
  '--destructive-foreground': '#239382',
  '--foreground':             '#239382',
  '--muted':                  '#b1667e',
  '--muted-foreground':       '#239382',
  '--popover':                '#b1667e',
  '--popover-foreground':     '#239382',
  '--primary-foreground':     '#239382',
  '--secondary-foreground':   '#239382'
};

const PARTIAL_OMITTED_VARS = [
  '--accent', '--border', '--destructive', '--input', '--primary', '--ring', '--secondary'
] as const;

// A role schema whose only role matches none of the 19 candidate chains.
const IRRELEVANT_ROLES = RoleSchemaFixture.schema('irrelevant', [
  RoleSchemaFixture.role('irrelevant', undefined, false)
]);

// ---------------------------------------------------------------------------
// Cell 1 — plugin shape
//
// ShadcnPlugin must satisfy PluginInterface: a singleton with a stable
// name, version, a tasks() method returning exactly [emit:shadcnTheme],
// and a schemas() contribution declaring the shadcn:theme output slot
// closed (additionalProperties: false). Unhappy: structurally impossible
// — the plugin is a sealed singleton with no invalid input space.
// ---------------------------------------------------------------------------

type PluginShapeInput = true;
type PluginShapeOutput = {
  readonly 'isInstance':            boolean;
  readonly 'name':                  string;
  readonly 'outputSchemaClosed':    boolean;
  readonly 'satisfiesPluginShape':  boolean;
  readonly 'taskNames':             readonly string[];
  readonly 'version':               string;
};

const pluginShapeScenarios: readonly ScenarioInterface<PluginShapeInput, PluginShapeOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=singleton] no throw');
      assert.strictEqual(output!.isInstance,           true,     '[cell=1, scenario=singleton] instanceof ShadcnPlugin');
      assert.strictEqual(output!.satisfiesPluginShape, true,     '[cell=1, scenario=singleton] satisfies PluginInterface shape');
      assert.strictEqual(output!.name,                 'shadcn', '[cell=1, scenario=singleton] name is shadcn');
      assert.strictEqual(output!.version,              '0.1.0',  '[cell=1, scenario=singleton] version is 0.1.0');
    },
    'input': true,
    'kind': 'happy',
    'name': 'singleton satisfies the plugin shape with stable name and version'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=task-names] no throw');
      assert.deepStrictEqual(output!.taskNames, ['emit:shadcnTheme'],
        '[cell=1, scenario=task-names] tasks() returns exactly [emit:shadcnTheme]');
    },
    'input': true,
    'kind': 'happy',
    'name': 'tasks() returns exactly emit:shadcnTheme'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=output-schema] no throw');
      assert.strictEqual(output!.outputSchemaClosed, true,
        "[cell=1, scenario=output-schema] schemas().outputs['shadcn:theme'] is additionalProperties:false");
    },
    'input': true,
    'kind': 'happy',
    'name': 'schemas() declares a closed shadcn:theme output contribution'
  }
];

await new ScenarioRunner<PluginShapeInput, PluginShapeOutput>(
  'ShadcnPlugin :: cell-1 :: plugin-shape',
  (_input) => {
    const schemas = shadcnPlugin.schemas?.();
    const themeSchema = schemas?.outputs?.['shadcn:theme'];
    return {
      'isInstance':           shadcnPlugin instanceof ShadcnPlugin,
      'name':                 shadcnPlugin.name,
      'outputSchemaClosed':   themeSchema?.additionalProperties === false,
      'satisfiesPluginShape': typeof shadcnPlugin.tasks === 'function'
        && typeof shadcnPlugin.schemas === 'function'
        && typeof shadcnPlugin.name === 'string'
        && typeof shadcnPlugin.version === 'string',
      'taskNames': shadcnPlugin.tasks().map((t) => { const result = t.name; return result; }),
      'version':   shadcnPlugin.version
    };
  }
).run(pluginShapeScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — full coverage
//
// When every candidate role is present, all 19 shadcn/ui vars resolve.
// Golden-locks the exact colors map and the exact cssVars :root block
// against a hand-verified run of the real task.
// ---------------------------------------------------------------------------

const fullCoverageScenarios: readonly ScenarioInterface<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-19-vars] no throw');
      assert.strictEqual(Object.keys(output!.colors).length, 19,
        '[cell=2, scenario=all-19-vars] exactly 19 vars resolved');
      assert.deepStrictEqual(output!.colors, FULL_COVERAGE_EXPECTED_COLORS,
        '[cell=2, scenario=all-19-vars] colors map matches the hand-verified golden fixture');
    },
    'input': {
      'colors':   FULL_COVERAGE_COLORS,
      'pipeline': ShadcnTestFixture.oklchPipeline(),
      'roles':    FULL_COVERAGE_ROLES
    },
    'kind': 'happy',
    'name': 'full candidate vocabulary resolves all 19 vars with correct role→var mapping'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=css-vars-golden] no throw');
      assert.strictEqual(output!.cssVars, FULL_COVERAGE_EXPECTED_CSS_VARS,
        '[cell=2, scenario=css-vars-golden] cssVars :root block matches the hand-verified golden fixture byte-for-byte');
    },
    'input': {
      'colors':   FULL_COVERAGE_COLORS,
      'pipeline': ShadcnTestFixture.oklchPipeline(),
      'roles':    FULL_COVERAGE_ROLES
    },
    'kind': 'happy',
    'name': 'cssVars :root block is the exact bare-OKLCH-triple golden fixture'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=decl-shape] no throw');
      const declPattern = /^\s{2}--[a-z-]+: [\d.]+ [\d.]+ [\d.]+;$/m;
      const lines = output!.cssVars.split('\n').slice(1, -1);
      assert.strictEqual(lines.length, 19, '[cell=2, scenario=decl-shape] 19 declaration lines between :root { and }');
      for (const line of lines) {
        assert.match(line, declPattern, `[cell=2, scenario=decl-shape] '${line}' matches bare OKLCH triple declaration shape`);
      }
    },
    'input': {
      'colors':   FULL_COVERAGE_COLORS,
      'pipeline': ShadcnTestFixture.oklchPipeline(),
      'roles':    FULL_COVERAGE_ROLES
    },
    'kind': 'happy',
    'name': 'every declaration line matches the bare "L C H" OKLCH triple shape (no oklch() wrapper, no hue unit)'
  }
];

await new ScenarioRunner<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>(
  'ShadcnPlugin :: cell-2 :: full-coverage',
  ShadcnScenarioOutput.run
).run(fullCoverageScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — partial / omission behavior
//
// A role schema satisfying only some candidate chains must produce a
// colors map containing ONLY the vars whose full chain resolves, and
// cssVars must not declare the omitted vars. This is the "skip, don't
// default" contract on VAR_ROLE_CANDIDATES.
// ---------------------------------------------------------------------------

const partialOmissionScenarios: readonly ScenarioInterface<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=only-resolved-vars] no throw');
      assert.deepStrictEqual(output!.colors, PARTIAL_EXPECTED_COLORS,
        '[cell=3, scenario=only-resolved-vars] colors map contains exactly the vars whose full chain resolves');
    },
    'input': {
      'colors':   PARTIAL_COLORS,
      'pipeline': ShadcnTestFixture.oklchPipeline(),
      'roles':    PARTIAL_ROLES
    },
    'kind': 'happy',
    'name': 'colors map contains only vars whose entire candidate chain resolves'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=omitted-vars-absent] no throw');
      for (const omitted of PARTIAL_OMITTED_VARS) {
        assert.ok(!(omitted in output!.colors),
          `[cell=3, scenario=omitted-vars-absent] '${omitted}' absent from colors map`);
        assert.ok(!output!.cssVars.includes(`${omitted}:`),
          `[cell=3, scenario=omitted-vars-absent] '${omitted}' has no declaration line in cssVars`);
      }
    },
    'input': {
      'colors':   PARTIAL_COLORS,
      'pipeline': ShadcnTestFixture.oklchPipeline(),
      'roles':    PARTIAL_ROLES
    },
    'kind': 'edge',
    'name': 'vars with no resolvable candidate are skipped entirely, not defaulted or emitted empty'
  }
];

await new ScenarioRunner<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>(
  'ShadcnPlugin :: cell-3 :: partial-omission',
  ShadcnScenarioOutput.run
).run(partialOmissionScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — determinism
//
// Running the same pipeline and input through two independently
// constructed engines must produce byte-identical output.
// ---------------------------------------------------------------------------

type DeterminismOutput = {
  readonly 'first':  ShadcnThemeScenarioOutputEntity.Type;
  readonly 'second': ShadcnThemeScenarioOutputEntity.Type;
};

const determinismScenarios: readonly ScenarioInterface<ShadcnRunInputInterface, DeterminismOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=two-fresh-engines] no throw');
      assert.deepStrictEqual(output!.first.colors, output!.second.colors,
        '[cell=4, scenario=two-fresh-engines] colors map is byte-identical across two fresh engines');
      assert.strictEqual(output!.first.cssVars, output!.second.cssVars,
        '[cell=4, scenario=two-fresh-engines] cssVars string is byte-identical across two fresh engines');
    },
    'input': {
      'colors':   FULL_COVERAGE_COLORS,
      'pipeline': ShadcnTestFixture.oklchPipeline(),
      'roles':    FULL_COVERAGE_ROLES
    },
    'kind': 'happy',
    'name': 'two fresh engines on identical input produce byte-identical colors and cssVars'
  }
];

await new ScenarioRunner<ShadcnRunInputInterface, DeterminismOutput>(
  'ShadcnPlugin :: cell-4 :: determinism',
  (input) => {
    return {
      'first':  ShadcnScenarioOutput.run(input),
      'second': ShadcnScenarioOutput.run(input)
    };
  }
).run(determinismScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — role coverage across full schema
//
// Every role that exists in the schema AND is referenced by at least one
// var's candidate chain must show up as a value in colors.
// ---------------------------------------------------------------------------

const ROLE_COVERAGE_EXPECTED_HEX: Readonly<Record<string, string>> = {
  'accent-alt':  '#b1667e',
  'background':  '#977d30',
  'bg-soft':     '#1590a1',
  'border':      '#798940',
  'brand':       '#b4685c',
  'error':       '#239382',
  'focus-ring':  '#8972b3',
  'on-brand':    '#697dbc',
  'surface':     '#519160',
  'text':        '#ac713e',
  'text-subtle': '#4188b6'
};

type RoleCoverageOutput = {
  readonly 'colorValues': readonly string[];
};

const roleCoverageScenarios: readonly ScenarioInterface<ShadcnRunInputInterface, RoleCoverageOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=every-role-referenced] no throw');
      const colorValueSet = new Set(output!.colorValues);
      for (const [roleName, hex] of Object.entries(ROLE_COVERAGE_EXPECTED_HEX)) {
        assert.ok(colorValueSet.has(hex),
          `[cell=5, scenario=every-role-referenced] role '${roleName}' hex (${hex}) appears in colors values`);
      }
    },
    'input': {
      'colors':   FULL_COVERAGE_COLORS,
      'pipeline': ShadcnTestFixture.oklchPipeline(),
      'roles':    FULL_COVERAGE_ROLES
    },
    'kind': 'happy',
    'name': 'every schema role referenced by a candidate chain appears as a colors value'
  }
];

await new ScenarioRunner<ShadcnRunInputInterface, RoleCoverageOutput>(
  'ShadcnPlugin :: cell-5 :: role-coverage',
  (input) => {
    const theme = ShadcnScenarioOutput.run(input);
    return { 'colorValues': Object.values(theme.colors) };
  }
).run(roleCoverageScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — edge: empty roles
//
// A role schema whose only role matches none of the 19 candidate chains,
// and a fully absent role schema (roles: undefined), must both produce
// an empty colors map and a well-formed (if empty) :root block — never
// throw.
// ---------------------------------------------------------------------------

const emptyRolesScenarios: readonly ScenarioInterface<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=no-matching-role] no throw');
      assert.deepStrictEqual(output!.colors, {}, '[cell=6, scenario=no-matching-role] colors is {}');
      assert.strictEqual(output!.cssVars, ':root {\n\n}',
        '[cell=6, scenario=no-matching-role] cssVars is a well-formed empty :root block');
    },
    'input': {
      'colors':   [],
      'pipeline': ShadcnTestFixture.hexPipeline(),
      'roles':    IRRELEVANT_ROLES
    },
    'kind': 'edge',
    'name': 'role matching none of the 19 candidate chains produces empty colors and well-formed cssVars'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=roles-undefined] no throw');
      assert.deepStrictEqual(output!.colors, {}, '[cell=6, scenario=roles-undefined] colors is {}');
      assert.strictEqual(output!.cssVars, ':root {\n\n}',
        '[cell=6, scenario=roles-undefined] cssVars is a well-formed empty :root block');
    },
    'input': {
      'colors':   [],
      'pipeline': ShadcnTestFixture.hexPipeline(),
      'roles':    undefined
    },
    'kind': 'edge',
    'name': 'input.roles undefined produces empty colors and well-formed cssVars, never throws'
  }
];

await new ScenarioRunner<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>(
  'ShadcnPlugin :: cell-6 :: empty-roles',
  ShadcnScenarioOutput.run
).run(emptyRolesScenarios);

// ---------------------------------------------------------------------------
// Cell 7 — unhappy: missing prerequisite task
//
// engine.pipeline() throws synchronously (before run() is ever called)
// when a named task — here 'emit:shadcnTheme' — isn't registered because
// shadcnPlugin was never adopted onto the engine.
// ---------------------------------------------------------------------------

const missingPrerequisiteScenarios: readonly ScenarioInterface<MissingTaskInputEntity.Type, MissingTaskOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(output, undefined, '[cell=7, scenario=no-adopt] no output produced');
      assert.ok(error instanceof ModuleError, '[cell=7, scenario=no-adopt] throws a ModuleError');
      assert.match(error.message, /emit:shadcnTheme/,
        "[cell=7, scenario=no-adopt] error message names the unregistered task 'emit:shadcnTheme'");
      assert.match(error.message, /not registered/,
        '[cell=7, scenario=no-adopt] error message states the task is not registered');
    },
    'input': { 'pipelineNames': ['intake:hex', 'resolve:roles', 'emit:shadcnTheme'] },
    'kind': 'unhappy',
    'name': 'pipeline() throws ModuleError synchronously when shadcnPlugin was never adopted'
  }
];

await new ScenarioRunner<MissingTaskInputEntity.Type, MissingTaskOutputEntity.Type>(
  'ShadcnPlugin :: cell-7 :: missing-prerequisite-task',
  (input) => {
    const engine = new Engine();
    for (const t of coreTasks) {engine.tasks.register(t);}
    // shadcnPlugin intentionally NOT adopted — emit:shadcnTheme is unregistered.
    engine.pipeline(input.pipelineNames);
    return { 'pipelined': true };
  }
).run(missingPrerequisiteScenarios);

// ---------------------------------------------------------------------------
// Cell 8 — unhappy: invalid input
//
// intake:hex throws a ValidationError synchronously on a non-hex color
// entry; emit:shadcnTheme never runs and no output is produced.
// ---------------------------------------------------------------------------

interface InvalidInputInputInterface {
  readonly 'colors': InputInterface['colors'];
}
const invalidInputScenarios: readonly ScenarioInterface<InvalidInputInputInterface, InvalidInputOutputEntity.Type>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(output, undefined, '[cell=8, scenario=non-hex-entry] no output produced');
      assert.ok(error instanceof ValidationError, '[cell=8, scenario=non-hex-entry] throws a ValidationError');
      assert.match(error.message, /intake:hex/,
        '[cell=8, scenario=non-hex-entry] error message names intake:hex');
      assert.match(error.message, /not a hex color/,
        '[cell=8, scenario=non-hex-entry] error message states the entry is not a hex color');
    },
    'input': { 'colors': ['not-a-color'] },
    'kind': 'unhappy',
    'name': 'run() throws ValidationError on non-hex color before emit:shadcnTheme ever executes'
  }
];

await new ScenarioRunner<InvalidInputInputInterface, InvalidInputOutputEntity.Type>(
  'ShadcnPlugin :: cell-8 :: invalid-input',
  (input) => {
    const engine = ShadcnTestFixture.freshEngine();
    engine.pipeline(ShadcnTestFixture.hexPipeline());
    const state = engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     FULL_COVERAGE_ROLES,
      'runtime':   undefined
    });
    const themeWritten = state.outputs['shadcn:theme'] !== undefined;
    return { 'themeWritten': themeWritten };
  }
).run(invalidInputScenarios);
