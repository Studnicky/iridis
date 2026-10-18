import {
  InputInterfaceTypeEntity,
  type PaletteStateInterface,
  RoleDefinitionInterfaceTypeEntity,
  RoleSchemaInterfaceTypeEntity
} from '@studnicky/iridis';
import { pandaPlugin } from '@studnicky/iridis-panda';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { PandaThemeScenarioOutputEntity } from '../../entities/PandaThemeScenarioOutputEntity.ts';
import { PandaPluginScenarioConstants } from './PandaPluginScenarioConstants.ts';

interface ThemeWithRolesScenarioOutputInterface {
  readonly 'panda': PandaThemeScenarioOutputEntity.Type;
  readonly 'rolesHex': ReadonlyMap<string, string>;
}

interface RoleNamesScenarioInputInterface {
  readonly 'names': readonly string[];
}

class PandaPluginScenarioFixture {
  static readonly allRoleNames = Object.freeze([
    'background', 'border', 'error', 'info', 'brand', 'accent-alt', 'success', 'surface', 'bg-soft', 'text', 'text-subtle', 'warning'
  ]);

  static readonly allColors = Object.freeze([
    '#050505', '#252525', '#353535', '#454545', '#555555', '#656565', '#757575', '#858585', '#151515', '#959595', '#a5a5a5', '#b5b5b5'
  ]);

  static readonly expectedTokens = Object.freeze([
    'background', 'border', 'error', 'info', 'primary', 'secondary', 'success', 'surface', 'text', 'textMuted', 'warning'
  ]);

  static readonly winningRoleNames = Object.freeze([
    'background', 'border', 'error', 'info', 'brand', 'accent-alt', 'success', 'surface', 'text', 'text-subtle', 'warning'
  ]);


  static freshEngine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let index = 0; index < taskCount; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(pandaPlugin);
    return engine;
  }

  static bareEngine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let index = 0; index < taskCount; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    return engine;
  }

  static pipeline(): readonly string[] {
    return ['intake:hex', 'resolve:roles', 'emit:pandaTheme'];
  }

  static roles(names: readonly string[]): RoleSchemaInterfaceTypeEntity.Type {
    const roles = names.map((name, index) => {
      const lightness = 0.1 + index * 0.07;
      const role = RoleDefinitionInterfaceTypeEntity.create({
        'lightnessRange': [Math.max(0, lightness - 0.02), Math.min(1, lightness + 0.02)],
        'name': name,
        'required': true
      });
      return role;
    });
    const schema = RoleSchemaInterfaceTypeEntity.create({ 'name': 'panda-e2e', 'roles': roles });
    return schema;
  }

  static state(colors: InputInterfaceTypeEntity.Type['colors'], names: readonly string[]): PaletteStateInterface {
    const engine = PandaPluginScenarioFixture.freshEngine();
    engine.pipeline(PandaPluginScenarioFixture.pipeline());
    const input = InputInterfaceTypeEntity.intake({ 'colors': colors, 'roles': PandaPluginScenarioFixture.roles(names) });
    const state = engine.run(input);
    return state;
  }

  static output(state: PaletteStateInterface): PandaThemeScenarioOutputEntity.Type {
    const rawOutput = state.outputs['panda:theme'];
    const output = PandaThemeScenarioOutputEntity.intake(rawOutput);
    return output;
  }

  static theme(colors: InputInterfaceTypeEntity.Type['colors'], names: readonly string[]): ThemeWithRolesScenarioOutputInterface {
    const state = PandaPluginScenarioFixture.state(colors, names);
    const rolesHex = new Map<string, string>();
    const entries = Object.entries(state.roles);
    for (let index = 0; index < entries.length; index += 1) {
      const [name, record] = entries[index]!;
      rolesHex.set(name, record.hex);
    }
    const result = { 'panda': PandaPluginScenarioFixture.output(state), 'rolesHex': rolesHex };
    return result;
  }

  static colorsFor(names: readonly string[]): string[] {
    const result: string[] = [];
    const count = names.length;
    for (let index = 0; index < count; index += 1) {
      const color = PandaPluginScenarioFixture.allColors[index];
      if (color !== undefined) {
        result.push(color);
      }
    }
    return result;
  }
}

class PandaPluginScenarioAssertions {
  static compare(left: string, right: string): number {
    const result = left.localeCompare(right);
    return result;
  }

  static identical(left: PandaThemeScenarioOutputEntity.Type, right: PandaThemeScenarioOutputEntity.Type): boolean {
    const result = JSON.stringify(left) === JSON.stringify(right);
    return result;
  }

  static output<TOutput>(context: ScenarioRunner.AssertionContext<TOutput>): TOutput {
    assert.strictEqual(context.error(), undefined, 'scenario does not throw');
    const output = context.output();
    return output;
  }

  static hex(output: ThemeWithRolesScenarioOutputInterface, name: string): string {
    const hex = output.rolesHex.get(name);
    if (hex === undefined) {
      throw new Error(`resolved role '${name}' is missing`);
    }
    return hex;
  }
}

export class PandaPluginScenarioSuite {
  static async run(): Promise<void> {
    await PandaPluginScenarioSuite.pluginShape();
    await PandaPluginScenarioSuite.fullCoverage();
    await PandaPluginScenarioSuite.fallback();
    await PandaPluginScenarioSuite.omission();
    await PandaPluginScenarioSuite.determinism();
    await PandaPluginScenarioSuite.roleCoverage();
    await PandaPluginScenarioSuite.emptyRoles();
    await PandaPluginScenarioSuite.missingTask();
    await PandaPluginScenarioSuite.invalidInput();
  }

  private static async pluginShape(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<boolean, string>[] = [
      {
        'assertion': (context): void => {
          assert.strictEqual(context.error(), undefined, 'singleton inspection does not throw');
          assert.strictEqual(context.output(), 'panda', 'singleton has stable panda name');
        },
        'input': true,
        'kind': 'happy',
        'name': 'singleton has the Panda plugin name'
      },
      {
        'assertion': (context): void => {
          assert.strictEqual(context.error(), undefined, 'task inspection does not throw');
          assert.strictEqual(context.output(), 'emit:pandaTheme', 'singleton exposes the Panda emitter task');
        },
        'input': false,
        'kind': 'happy',
        'name': 'singleton exposes the Panda emitter task'
      }
    ];
    const runner = new ScenarioRunner<boolean, string>('PandaPlugin :: plugin-shape', (inspectName): string => {
      const result = inspectName ? pandaPlugin.name : pandaPlugin.tasks()[0]?.name;
      if (result === undefined) {
        throw new Error('Panda plugin does not expose its emitter task');
      }
      return result;
    });
    await runner.run(scenarios);
  }

  private static async fullCoverage(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<true, PandaThemeScenarioOutputEntity.Type>[] = [{
      'assertion': (context): void => {
        const output = PandaPluginScenarioAssertions.output(context);
        const tokenNames = Object.keys(output.colors).sort(PandaPluginScenarioAssertions.compare);
        const expected = [...PandaPluginScenarioFixture.expectedTokens].sort(PandaPluginScenarioAssertions.compare);
        assert.deepStrictEqual(tokenNames, expected, 'each Panda token resolves exactly once');
        const entries = Object.entries(output.colors);
        for (let index = 0; index < entries.length; index += 1) {
          const [token, hex] = entries[index]!;
          assert.ok(output.pandaConfig.includes(`'${token}': { value: '${hex}' },`), `Panda config contains ${token}`);
          assert.ok(output.unoConfig.includes(`'${token}': '${hex}',`), `Uno config contains ${token}`);
        }
      },
      'input': true,
      'kind': 'happy',
      'name': 'all resolvable semantic tokens serialize to both theme formats'
    }];
    const runner = new ScenarioRunner<true, PandaThemeScenarioOutputEntity.Type>('PandaPlugin :: full-coverage', (): PandaThemeScenarioOutputEntity.Type => {
      const result = PandaPluginScenarioFixture.theme(PandaPluginScenarioFixture.colorsFor(PandaPluginScenarioFixture.allRoleNames), PandaPluginScenarioFixture.allRoleNames);
      return result.panda;
    });
    await runner.run(scenarios);
  }

  private static async fallback(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<RoleNamesScenarioInputInterface, ThemeWithRolesScenarioOutputInterface>[] = [
      {
        'assertion': (context): void => {
          const output = PandaPluginScenarioAssertions.output(context);
          assert.strictEqual(output.panda.colors.secondary, PandaPluginScenarioAssertions.hex(output, 'brand'), 'secondary falls back to brand');
        },
        'input': { 'names': ['brand'] },
        'kind': 'happy',
        'name': 'secondary falls back to brand'
      },
      {
        'assertion': (context): void => {
          const output = PandaPluginScenarioAssertions.output(context);
          assert.strictEqual(output.panda.colors.surface, PandaPluginScenarioAssertions.hex(output, 'bg-soft'), 'surface uses the middle fallback candidate');
        },
        'input': { 'names': ['background', 'bg-soft'] },
        'kind': 'happy',
        'name': 'surface uses the middle fallback candidate'
      }
    ];
    const runner = new ScenarioRunner<RoleNamesScenarioInputInterface, ThemeWithRolesScenarioOutputInterface>('PandaPlugin :: fallback', (input): ThemeWithRolesScenarioOutputInterface => {
      const result = PandaPluginScenarioFixture.theme(PandaPluginScenarioFixture.colorsFor(input.names), input.names);
      return result;
    });
    await runner.run(scenarios);
  }

  private static async omission(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<true, PandaThemeScenarioOutputEntity.Type>[] = [{
      'assertion': (context): void => {
        const output = PandaPluginScenarioAssertions.output(context);
        assert.ok(!('error' in output.colors), 'unresolved error is omitted');
        assert.ok(!output.pandaConfig.includes("'error':"), 'Panda output omits unresolved error');
        assert.ok(!output.unoConfig.includes("'error':"), 'Uno output omits unresolved error');
      },
      'input': true,
      'kind': 'edge',
      'name': 'unresolved tokens are omitted from output'
    }];
    const runner = new ScenarioRunner<true, PandaThemeScenarioOutputEntity.Type>('PandaPlugin :: omission', (): PandaThemeScenarioOutputEntity.Type => {
      const result = PandaPluginScenarioFixture.theme(['#0f172a', '#111827'], ['background', 'text']);
      return result.panda;
    });
    await runner.run(scenarios);
  }

  private static async determinism(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<true, boolean>[] = [{
      'assertion': (context): void => {
        assert.strictEqual(context.error(), undefined, 'determinism does not throw');
        assert.strictEqual(context.output(), true, 'identical input produces identical output');
      },
      'input': true,
      'kind': 'happy',
      'name': 'fresh engines produce byte-identical theme output'
    }];
    const runner = new ScenarioRunner<true, boolean>('PandaPlugin :: determinism', (): boolean => {
      const first = PandaPluginScenarioFixture.theme(PandaPluginScenarioFixture.colorsFor(PandaPluginScenarioFixture.allRoleNames), PandaPluginScenarioFixture.allRoleNames).panda;
      const second = PandaPluginScenarioFixture.theme(PandaPluginScenarioFixture.colorsFor(PandaPluginScenarioFixture.allRoleNames), PandaPluginScenarioFixture.allRoleNames).panda;
      const result = PandaPluginScenarioAssertions.identical(first, second);
      return result;
    });
    await runner.run(scenarios);
  }

  private static async roleCoverage(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<true, ThemeWithRolesScenarioOutputInterface>[] = [
      {
        'assertion': (context): void => {
          const output = PandaPluginScenarioAssertions.output(context);
          const values = new Set(Object.values(output.panda.colors));
          const roleNames = PandaPluginScenarioFixture.winningRoleNames;
          for (let index = 0; index < roleNames.length; index += 1) {
            const roleName = roleNames[index];
            if (roleName !== undefined) {
              assert.ok(values.has(PandaPluginScenarioAssertions.hex(output, roleName)), `winner ${roleName} is represented`);
            }
          }
        },
        'input': true,
        'kind': 'happy',
        'name': 'winning candidates appear in emitted values'
      },
      {
        'assertion': (context): void => {
          const output = PandaPluginScenarioAssertions.output(context);
          const values = Object.values(output.panda.colors);
          assert.ok(!values.includes(PandaPluginScenarioAssertions.hex(output, 'bg-soft')), 'shadowed bg-soft does not surface');
        },
        'input': true,
        'kind': 'edge',
        'name': 'shadowed fallback candidates do not surface'
      }
    ];
    const runner = new ScenarioRunner<true, ThemeWithRolesScenarioOutputInterface>('PandaPlugin :: role-coverage', (): ThemeWithRolesScenarioOutputInterface => {
      const result = PandaPluginScenarioFixture.theme(PandaPluginScenarioFixture.colorsFor(PandaPluginScenarioFixture.allRoleNames), PandaPluginScenarioFixture.allRoleNames);
      return result;
    });
    await runner.run(scenarios);
  }

  private static async emptyRoles(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<true, PandaThemeScenarioOutputEntity.Type>[] = [{
      'assertion': (context): void => {
        const output = PandaPluginScenarioAssertions.output(context);
        assert.deepStrictEqual(output.colors, {}, 'empty input emits no tokens');
        assert.ok(output.pandaConfig.includes('defineConfig'), 'Panda module remains well formed');
        assert.ok(output.unoConfig.includes('defineConfig'), 'Uno module remains well formed');
      },
      'input': true,
      'kind': 'edge',
      'name': 'empty roles emit well-formed empty configurations'
    }];
    const runner = new ScenarioRunner<true, PandaThemeScenarioOutputEntity.Type>('PandaPlugin :: empty-roles', (): PandaThemeScenarioOutputEntity.Type => {
      const result = PandaPluginScenarioFixture.theme([], []);
      return result.panda;
    });
    await runner.run(scenarios);
  }

  private static async missingTask(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<true, undefined>[] = [{
      'assertion': (context): void => {
        const error = context.error();
        assert.ok(error instanceof Error, 'unadopted plugin rejects the task');
        assert.match(error.message, PandaPluginScenarioConstants.unregisteredTaskPattern, 'error identifies the missing task');
      },
      'input': true,
      'kind': 'unhappy',
      'name': 'unadopted plugin cannot install the emitter task'
    }];
    const runner = new ScenarioRunner<true, undefined>('PandaPlugin :: missing-task', (): undefined => {
      const engine = PandaPluginScenarioFixture.bareEngine();
      engine.pipeline(['emit:pandaTheme']);
      return undefined;
    });
    await runner.run(scenarios);
  }

  private static async invalidInput(): Promise<void> {
    const scenarios: readonly ScenarioRunner.ScenarioInterface<true, undefined>[] = [{
      'assertion': (context): void => {
        assert.ok(context.error() instanceof Error, 'invalid color input is rejected');
      },
      'input': true,
      'kind': 'unhappy',
      'name': 'non-hex color input is rejected before emission'
    }];
    const runner = new ScenarioRunner<true, undefined>('PandaPlugin :: invalid-input', (): undefined => {
      const engine = PandaPluginScenarioFixture.freshEngine();
      engine.pipeline(PandaPluginScenarioFixture.pipeline());
      const input = InputInterfaceTypeEntity.intake({ 'colors': ['not-a-hex-color'], 'roles': PandaPluginScenarioFixture.roles(['brand']) });
      engine.run(input);
      return undefined;
    });
    await runner.run(scenarios);
  }
}
