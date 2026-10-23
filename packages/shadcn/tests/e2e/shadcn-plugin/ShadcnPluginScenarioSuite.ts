import type { RoleSchemaEntity } from '@studnicky/iridis';

import { ModuleError, ValidationError } from '@studnicky/errors/node';
import { InputEntity } from '@studnicky/iridis';
import { shadcnPlugin, ShadcnPlugin } from '@studnicky/iridis-shadcn';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';

import type { ShadcnThemeScenarioOutputEntity } from '../../entities/ShadcnThemeScenarioOutputEntity.ts';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { InvalidInputOutputEntity } from '../../entities/InvalidInputOutputEntity.ts';
import { MissingTaskInputEntity } from '../../entities/MissingTaskInputEntity.ts';
import { MissingTaskOutputEntity } from '../../entities/MissingTaskOutputEntity.ts';
import { SHADCN_PLUGIN_SCENARIO_PATTERNS } from './constants/ShadcnPluginScenarioPatterns.ts';
import { PluginShapeScenarioOutputEntity } from './entities/PluginShapeScenarioOutputEntity.ts';
import { ShadcnPluginScenarioFixture } from './fixtures/ShadcnPluginScenarioFixture.ts';

interface ShadcnRunInputInterface {
  readonly 'colors': InputEntity.Type['colors'];
  readonly 'pipeline': readonly string[];
  readonly 'roles': RoleSchemaEntity.Type | undefined;
}

interface DeterminismOutputInterface {
  readonly 'first': ShadcnThemeScenarioOutputEntity.Type;
  readonly 'second': ShadcnThemeScenarioOutputEntity.Type;
}

interface RoleCoverageOutputInterface {
  readonly 'colorValues': readonly string[];
}

interface InvalidInputInputInterface {
  readonly 'colors': InputEntity.Type['colors'];
}

/** Registers every behavioral scenario for the public Shadcn plugin contract. */
export class ShadcnPluginScenarioSuite {
  static async run(): Promise<void> {
    await ShadcnPluginScenarioSuite.pluginShape();
    await ShadcnPluginScenarioSuite.fullCoverage();
    await ShadcnPluginScenarioSuite.partialOmission();
    await ShadcnPluginScenarioSuite.determinism();
    await ShadcnPluginScenarioSuite.roleCoverage();
    await ShadcnPluginScenarioSuite.emptyRoles();
    await ShadcnPluginScenarioSuite.missingPrerequisite();
    await ShadcnPluginScenarioSuite.invalidInput();
  }

  private static async pluginShape(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<true, PluginShapeScenarioOutputEntity.Type>[] = [
      {
        'assertion': function(context) {
          const output = context.output();
          assert.strictEqual(context.error(), undefined, '[cell=1, scenario=singleton] no throw');
          assert.strictEqual(output.isInstance, true, '[cell=1, scenario=singleton] instanceof ShadcnPlugin');
          assert.strictEqual(output.satisfiesPluginShape, true, '[cell=1, scenario=singleton] satisfies PluginInterface shape');
          assert.strictEqual(output.name, 'shadcn', '[cell=1, scenario=singleton] name is shadcn');
          assert.strictEqual(output.version, '0.1.0', '[cell=1, scenario=singleton] version is 0.1.0');
        },
        'input': true,
        'name': 'singleton satisfies the plugin shape with stable name and version'
      },
      {
        'assertion': function(context) {
          const output = context.output();
          assert.strictEqual(context.error(), undefined, '[cell=1, scenario=task-names] no throw');
          assert.deepStrictEqual(output.taskNames, ['emit:shadcnTheme'],
            '[cell=1, scenario=task-names] tasks() returns exactly [emit:shadcnTheme]');
        },
        'input': true,
        'name': 'tasks() returns exactly emit:shadcnTheme'
      },
      {
        'assertion': function(context) {
          const output = context.output();
          assert.strictEqual(context.error(), undefined, '[cell=1, scenario=output-schema] no throw');
          assert.strictEqual(output.outputSchemaClosed, true,
            "[cell=1, scenario=output-schema] schemas().outputs['shadcn:theme'] is additionalProperties:false");
        },
        'input': true,
        'name': 'schemas() declares a closed shadcn:theme output contribution'
      }
    ];
    await new ScenarioRunner<true, PluginShapeScenarioOutputEntity.Type>(
      'ShadcnPlugin :: cell-1 :: plugin-shape',
      ShadcnPluginScenarioSuite.pluginShapeOutput
    ).run(scenarios);
  }

  private static pluginShapeOutput(_input: true): PluginShapeScenarioOutputEntity.Type {
    const schemas = shadcnPlugin.schemas?.();
    const themeSchema = schemas?.outputs?.['shadcn:theme'];
    const outputSchemaClosed = themeSchema !== undefined
      && themeSchema !== null
      && typeof themeSchema === 'object'
      && 'additionalProperties' in themeSchema
      && themeSchema.additionalProperties === false;
    const taskNames = shadcnPlugin.tasks().map((task) => {
      const result = task.name;
      return result;
    });
    const result = PluginShapeScenarioOutputEntity.intake({
      'isInstance': shadcnPlugin instanceof ShadcnPlugin,
      'name': shadcnPlugin.name,
      'outputSchemaClosed': outputSchemaClosed,
      'satisfiesPluginShape': typeof shadcnPlugin.tasks === 'function'
        && typeof shadcnPlugin.schemas === 'function'
        && typeof shadcnPlugin.name === 'string'
        && typeof shadcnPlugin.version === 'string',
      'taskNames': taskNames,
      'version': shadcnPlugin.version
    });
    return result;
  }

  private static async fullCoverage(): Promise<void> {
    const input = ShadcnPluginScenarioSuite.fullCoverageInput();
    const scenarios: readonly ScenarioRunner.ScenarioInterface<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>[] = [
      {
        'assertion': function(context) {
          const output = context.output();
          assert.strictEqual(context.error(), undefined, '[cell=2, scenario=all-19-vars] no throw');
          assert.strictEqual(Object.keys(output.colors).length, 19,
            '[cell=2, scenario=all-19-vars] exactly 19 vars resolved');
          assert.deepStrictEqual(output.colors, ShadcnPluginScenarioFixture.fullCoverageExpectedColors,
            '[cell=2, scenario=all-19-vars] colors map matches the hand-verified golden fixture');
        },
        'input': input,
        'name': 'full candidate vocabulary resolves all 19 vars with correct role-to-variable mapping'
      },
      {
        'assertion': function(context) {
          const output = context.output();
          assert.strictEqual(context.error(), undefined, '[cell=2, scenario=css-vars-golden] no throw');
          assert.strictEqual(output.cssVars, ShadcnPluginScenarioFixture.fullCoverageExpectedCssVars,
            '[cell=2, scenario=css-vars-golden] cssVars root block matches the hand-verified golden fixture byte-for-byte');
        },
        'input': input,
        'name': 'cssVars root block is the exact bare OKLCH triple golden fixture'
      },
      {
        'assertion': function(context) {
          const output = context.output();
          const lines = output.cssVars.split('\n').slice(1, -1);
          const lineCount = lines.length;
          assert.strictEqual(context.error(), undefined, '[cell=2, scenario=decl-shape] no throw');
          assert.strictEqual(lineCount, 19, '[cell=2, scenario=decl-shape] 19 declaration lines between root delimiters');
          for (let index = 0; index < lineCount; index += 1) {
            const line = lines[index];
            if (line !== undefined) {
              assert.match(line, SHADCN_PLUGIN_SCENARIO_PATTERNS.declaration,
                `[cell=2, scenario=decl-shape] '${line}' matches bare OKLCH triple declaration shape`);
            }
          }
        },
        'input': input,
        'name': 'every declaration line is a bare L C H OKLCH triple without a wrapper or hue unit'
      }
    ];
    await new ScenarioRunner<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>(
      'ShadcnPlugin :: cell-2 :: full-coverage',
      ShadcnPluginScenarioSuite.runTheme
    ).run(scenarios);
  }

  private static async partialOmission(): Promise<void> {
    const input: ShadcnRunInputInterface = {
      'colors': ShadcnPluginScenarioFixture.partialColors(),
      'pipeline': ShadcnPluginScenarioFixture.oklchPipeline(),
      'roles': ShadcnPluginScenarioFixture.partialRoles()
    };
    const scenarios: readonly ScenarioRunner.ScenarioInterface<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>[] = [
      {
        'assertion': function(context) {
          const output = context.output();
          assert.strictEqual(context.error(), undefined, '[cell=3, scenario=only-resolved-vars] no throw');
          assert.deepStrictEqual(output.colors, ShadcnPluginScenarioFixture.partialExpectedColors,
            '[cell=3, scenario=only-resolved-vars] colors map contains exactly the vars whose candidate chain resolves');
        },
        'input': input,
        'name': 'colors map contains only variables with a resolved candidate chain'
      },
      {
        'assertion': function(context) {
          const output = context.output();
          const omittedCount = ShadcnPluginScenarioFixture.partialOmittedVars.length;
          assert.strictEqual(context.error(), undefined, '[cell=3, scenario=omitted-vars-absent] no throw');
          for (let index = 0; index < omittedCount; index += 1) {
            const omitted = ShadcnPluginScenarioFixture.partialOmittedVars[index];
            if (omitted !== undefined) {
              assert.ok(!(omitted in output.colors),
                `[cell=3, scenario=omitted-vars-absent] '${omitted}' absent from colors map`);
              assert.ok(!output.cssVars.includes(`${omitted}:`),
                `[cell=3, scenario=omitted-vars-absent] '${omitted}' has no declaration line in cssVars`);
            }
          }
        },
        'input': input,
        'name': 'variables with no resolvable candidate are skipped rather than defaulted or emitted empty'
      }
    ];
    await new ScenarioRunner<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>(
      'ShadcnPlugin :: cell-3 :: partial-omission',
      ShadcnPluginScenarioSuite.runTheme
    ).run(scenarios);
  }

  private static async determinism(): Promise<void> {
    const input = ShadcnPluginScenarioSuite.fullCoverageInput();
    const scenarios: readonly ScenarioRunner.ScenarioInterface<ShadcnRunInputInterface, DeterminismOutputInterface>[] = [
      {
        'assertion': function(context) {
          const output = context.output();
          assert.strictEqual(context.error(), undefined, '[cell=4, scenario=two-fresh-engines] no throw');
          assert.deepStrictEqual(output.first.colors, output.second.colors,
            '[cell=4, scenario=two-fresh-engines] colors map is byte-identical across two fresh engines');
          assert.strictEqual(output.first.cssVars, output.second.cssVars,
            '[cell=4, scenario=two-fresh-engines] cssVars string is byte-identical across two fresh engines');
        },
        'input': input,
        'name': 'two fresh engines on identical input produce byte-identical colors and cssVars'
      }
    ];
    await new ScenarioRunner<ShadcnRunInputInterface, DeterminismOutputInterface>(
      'ShadcnPlugin :: cell-4 :: determinism',
      ShadcnPluginScenarioSuite.runDeterminism
    ).run(scenarios);
  }

  private static runDeterminism(input: ShadcnRunInputInterface): DeterminismOutputInterface {
    const result: DeterminismOutputInterface = {
      'first': ShadcnPluginScenarioSuite.runTheme(input),
      'second': ShadcnPluginScenarioSuite.runTheme(input)
    };
    return result;
  }

  private static async roleCoverage(): Promise<void> {
    const input = ShadcnPluginScenarioSuite.fullCoverageInput();
    const scenarios: readonly ScenarioRunner.ScenarioInterface<ShadcnRunInputInterface, RoleCoverageOutputInterface>[] = [
      {
        'assertion': function(context) {
          const output = context.output();
          const colorValues = new Set(output.colorValues);
          const entries = Object.entries(ShadcnPluginScenarioFixture.roleCoverageExpectedHex);
          const entryCount = entries.length;
          assert.strictEqual(context.error(), undefined, '[cell=5, scenario=every-role-referenced] no throw');
          for (let index = 0; index < entryCount; index += 1) {
            const entry = entries[index];
            if (entry !== undefined) {
              const roleName = entry[0];
              const hex = entry[1];
              assert.ok(colorValues.has(hex),
                `[cell=5, scenario=every-role-referenced] role '${roleName}' hex (${hex}) appears in colors values`);
            }
          }
        },
        'input': input,
        'name': 'every schema role referenced by a candidate chain appears as a colors value'
      }
    ];
    await new ScenarioRunner<ShadcnRunInputInterface, RoleCoverageOutputInterface>(
      'ShadcnPlugin :: cell-5 :: role-coverage',
      ShadcnPluginScenarioSuite.runRoleCoverage
    ).run(scenarios);
  }

  private static runRoleCoverage(input: ShadcnRunInputInterface): RoleCoverageOutputInterface {
    const theme = ShadcnPluginScenarioSuite.runTheme(input);
    const result: RoleCoverageOutputInterface = { 'colorValues': Object.values(theme.colors) };
    return result;
  }

  private static async emptyRoles(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>[] = [
      {
        'assertion': function(context) {
          const output = context.output();
          assert.strictEqual(context.error(), undefined, '[cell=6, scenario=no-matching-role] no throw');
          assert.deepStrictEqual(output.colors, {}, '[cell=6, scenario=no-matching-role] colors is empty');
          assert.strictEqual(output.cssVars, ':root {\n\n}',
            '[cell=6, scenario=no-matching-role] cssVars is a well-formed empty root block');
        },
        'input': {
          'colors': [],
          'pipeline': ShadcnPluginScenarioFixture.hexPipeline(),
          'roles': ShadcnPluginScenarioFixture.irrelevantRoles()
        },
        'name': 'role matching none of the candidate chains produces empty colors and well-formed cssVars'
      },
      {
        'assertion': function(context) {
          const output = context.output();
          assert.strictEqual(context.error(), undefined, '[cell=6, scenario=roles-undefined] no throw');
          assert.deepStrictEqual(output.colors, {}, '[cell=6, scenario=roles-undefined] colors is empty');
          assert.strictEqual(output.cssVars, ':root {\n\n}',
            '[cell=6, scenario=roles-undefined] cssVars is a well-formed empty root block');
        },
        'input': {
          'colors': [],
          'pipeline': ShadcnPluginScenarioFixture.hexPipeline(),
          'roles': undefined
        },
        'name': 'omitted input roles produce empty colors and well-formed cssVars without throwing'
      }
    ];
    await new ScenarioRunner<ShadcnRunInputInterface, ShadcnThemeScenarioOutputEntity.Type>(
      'ShadcnPlugin :: cell-6 :: empty-roles',
      ShadcnPluginScenarioSuite.runTheme
    ).run(scenarios);
  }

  private static async missingPrerequisite(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<MissingTaskInputEntity.Type, MissingTaskOutputEntity.Type>[] = [
      {
        'assertion': function(context) {
          const error = context.error();
          assert.strictEqual(context.result(), undefined, '[cell=7, scenario=no-adopt] no output produced');
          assert.ok(error instanceof ModuleError, '[cell=7, scenario=no-adopt] throws a ModuleError');
          assert.match(error.message, SHADCN_PLUGIN_SCENARIO_PATTERNS.emitTask,
            "[cell=7, scenario=no-adopt] error message names the unregistered task 'emit:shadcnTheme'");
          assert.match(error.message, SHADCN_PLUGIN_SCENARIO_PATTERNS.taskRegistration,
            '[cell=7, scenario=no-adopt] error message states the task is not registered');
        },
        'input': MissingTaskInputEntity.create({ 'pipelineNames': ['intake:hex', 'resolve:roles', 'emit:shadcnTheme'] }),
        'name': 'pipeline throws ModuleError synchronously when shadcnPlugin was never adopted'
      }
    ];
    await new ScenarioRunner<MissingTaskInputEntity.Type, MissingTaskOutputEntity.Type>(
      'ShadcnPlugin :: cell-7 :: missing-prerequisite-task',
      ShadcnPluginScenarioSuite.runWithoutPlugin
    ).run(scenarios);
  }

  private static runWithoutPlugin(input: MissingTaskInputEntity.Type): MissingTaskOutputEntity.Type {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let index = 0; index < taskCount; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.pipeline(input.pipelineNames);
    const result = MissingTaskOutputEntity.create({ 'pipelined': true });
    return result;
  }

  private static async invalidInput(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<InvalidInputInputInterface, InvalidInputOutputEntity.Type>[] = [
      {
        'assertion': function(context) {
          const error = context.error();
          assert.strictEqual(context.result(), undefined, '[cell=8, scenario=non-hex-entry] no output produced');
          assert.ok(error instanceof ValidationError, '[cell=8, scenario=non-hex-entry] throws a ValidationError');
          assert.match(error.message, SHADCN_PLUGIN_SCENARIO_PATTERNS.hexIntake,
            '[cell=8, scenario=non-hex-entry] error message names intake:hex');
          assert.match(error.message, SHADCN_PLUGIN_SCENARIO_PATTERNS.hexValidation,
            '[cell=8, scenario=non-hex-entry] error message states the entry is not a hex color');
        },
        'input': { 'colors': ['not-a-color'] },
        'name': 'run throws ValidationError on a non-hex color before emit:shadcnTheme runs'
      }
    ];
    await new ScenarioRunner<InvalidInputInputInterface, InvalidInputOutputEntity.Type>(
      'ShadcnPlugin :: cell-8 :: invalid-input',
      ShadcnPluginScenarioSuite.runInvalidInput
    ).run(scenarios);
  }

  private static runInvalidInput(input: InvalidInputInputInterface): InvalidInputOutputEntity.Type {
    const engine = ShadcnPluginScenarioFixture.freshEngine();
    engine.pipeline(ShadcnPluginScenarioFixture.hexPipeline());
    const state = engine.run(InputEntity.create({
      'colors': input.colors,
      'roles': ShadcnPluginScenarioFixture.fullCoverageRoles()
    }));
    const result = InvalidInputOutputEntity.create({ 'themeWritten': state.outputs['shadcn:theme'] !== undefined });
    return result;
  }

  private static fullCoverageInput(): ShadcnRunInputInterface {
    const result: ShadcnRunInputInterface = {
      'colors': ShadcnPluginScenarioFixture.fullCoverageColors(),
      'pipeline': ShadcnPluginScenarioFixture.oklchPipeline(),
      'roles': ShadcnPluginScenarioFixture.fullCoverageRoles()
    };
    return result;
  }

  private static runTheme(input: ShadcnRunInputInterface): ShadcnThemeScenarioOutputEntity.Type {
    const result = ShadcnPluginScenarioFixture.run(input.colors, input.pipeline, input.roles);
    return result;
  }
}
