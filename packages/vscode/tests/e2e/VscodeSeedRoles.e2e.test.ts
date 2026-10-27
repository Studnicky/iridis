import type { PaletteStateInterface } from '@studnicky/iridis';

import { InputEntity, Metadata, RuntimeOptionsEntity } from '@studnicky/iridis';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  VSCODE_FULL_ROLE_SCHEMAS,
  vscodePlugin,
  vscodeSeedRoleData
} from '../../src/index.ts';
import { VscodeSeedPaletteBodyEntity } from '../entities/VscodeSeedPaletteBodyEntity.ts';

class VscodeSeedRolesFixture {
  static readonly #seedColors = [
    '#7c3aed',
    '#06b6d4',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#ef4444'
  ] as const;
  static readonly #tier4Roles = [
    'background',
    'foreground',
    'keyword',
    'error'
  ] as const;
  static readonly #tier8Roles = [
    ...VscodeSeedRolesFixture.#tier4Roles,
    'type',
    'function',
    'number',
    'constant'
  ] as const;
  static readonly #tier16Roles = [
    'background',
    'foreground',
    'surface',
    'muted',
    'keyword',
    'type',
    'function',
    'variable',
    'string',
    'number',
    'constant',
    'comment',
    'error',
    'warning',
    'info',
    'success'
  ] as const;

  static engine(): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks.at(index);
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(vscodePlugin);
    return engine;
  }

  static roleNames(body: VscodeSeedPaletteBodyEntity.Type): readonly string[] {
    if (body.tier === 4) {
      return VscodeSeedRolesFixture.#tier4Roles;
    }
    if (body.tier === 8) {
      return VscodeSeedRolesFixture.#tier8Roles;
    }
    if (body.tier === 16) {
      return VscodeSeedRolesFixture.#tier16Roles;
    }
    const fullTier = vscodeSeedRoleData.roleTiers.find((candidate) => {
      const result = candidate.tier === body.tier;
      return result;
    });
    if (fullTier === undefined) {
      throw new RangeError(`Unsupported VS Code seed tier ${body.tier}.`);
    }
    const result = fullTier.roleNames;
    return result;
  }

  static roleColor(
    body: VscodeSeedPaletteBodyEntity.Type,
    role: string,
    index: number
  ): string {
    if (role === 'background') {
      const result = body.framing === 'dark' ? '#101820' : '#f7f4ed';
      return result;
    }
    if (role === 'foreground') {
      const result = body.framing === 'dark' ? '#f5f7fa' : '#17212b';
      return result;
    }
    const color =
      VscodeSeedRolesFixture.#seedColors[
        index % VscodeSeedRolesFixture.#seedColors.length
      ];
    if (color === undefined) {
      throw new TypeError(`Missing fixture color at ${index}`);
    }
    return color;
  }

  static body(
    seed: VscodeSeedPaletteBodyEntity.Type
  ): VscodeSeedPaletteBodyEntity.Type {
    const roleNames = VscodeSeedRolesFixture.roleNames(seed);
    const roles: Record<string, string> = {};
    for (let index = 0; index < roleNames.length; index += 1) {
      const role = roleNames.at(index);
      if (role === undefined) {
        continue;
      }
      const color = VscodeSeedRolesFixture.roleColor(seed, role, index);
      Object.defineProperty(roles, role, {
        'configurable': true,
        'enumerable': true,
        'value': color,
        'writable': true
      });
    }
    const result = VscodeSeedPaletteBodyEntity.create({
      'framing': seed.framing,
      'roles': roles,
      'tier': seed.tier
    });
    return result;
  }

  static input(body: VscodeSeedPaletteBodyEntity.Type): InputEntity.Type {
    const schema =
      body.framing === 'dark'
        ? VSCODE_FULL_ROLE_SCHEMAS.dark
        : VSCODE_FULL_ROLE_SCHEMAS.light;
    const runtime = RuntimeOptionsEntity.create({ 'framing': body.framing });
    const result = InputEntity.create({
      'colors': [body],
      'roles': schema,
      'runtime': runtime
    });
    return result;
  }

  static run(body: VscodeSeedPaletteBodyEntity.Type): PaletteStateInterface {
    const engine = VscodeSeedRolesFixture.engine();
    engine.pipeline([
      'vscode:seedRoles',
      'resolve:roles',
      'derive:roleRelations',
      'enforce:contrast',
      'emit:vscodeSemanticRules',
      'emit:vscodeThemeJson'
    ]);
    const result = engine.run(VscodeSeedRolesFixture.input(body));
    return result;
  }

  static runSeedOnly(input: InputEntity.Type): PaletteStateInterface {
    const engine = VscodeSeedRolesFixture.engine();
    engine.pipeline(['vscode:seedRoles']);
    const result = engine.run(input);
    return result;
  }
}

await test('VscodeSeedRoles :: accepts each declared tier, preserves caller-stated roles, and resolves the full output vocabulary', () => {
  const tiers = [4, 8, 16, 64] as const;
  for (let index = 0; index < tiers.length; index += 1) {
    const tier = tiers.at(index);
    if (tier === undefined) {
      continue;
    }
    const body = VscodeSeedRolesFixture.body(
      VscodeSeedPaletteBodyEntity.create({
        'framing': 'dark',
        'roles': {},
        'tier': tier
      })
    );
    const state = VscodeSeedRolesFixture.run(body);
    const suppliedRoles = VscodeSeedRolesFixture.roleNames(body);
    const provenance = Metadata.roleProvenance(state.metadata);

    assert.strictEqual(
      state.colors.length,
      suppliedRoles.length,
      `tier ${tier} intake emits one record per supplied role`
    );
    for (let roleIndex = 0; roleIndex < suppliedRoles.length; roleIndex += 1) {
      const role = suppliedRoles.at(roleIndex);
      if (role === undefined) {
        continue;
      }
      assert.deepStrictEqual(
        provenance.get(role),
        { 'adjustments': [], 'origin': 'stated' },
        `tier ${tier} records ${role} as caller-stated`
      );
      assert.strictEqual(
        Reflect.get(state.roles, role)?.hex,
        Reflect.get(body.roles, role),
        `tier ${tier} preserves ${role} exactly`
      );
    }
    const schema =
      body.framing === 'dark'
        ? VSCODE_FULL_ROLE_SCHEMAS.dark
        : VSCODE_FULL_ROLE_SCHEMAS.light;
    assert.strictEqual(
      Object.keys(state.roles).length,
      schema.roles.length,
      `tier ${tier} resolves the full role vocabulary`
    );
  }
});

await test('VscodeSeedRoles :: selects explicit dark and light output framing', () => {
  const framings = ['dark', 'light'] as const;
  for (let index = 0; index < framings.length; index += 1) {
    const framing = framings.at(index);
    if (framing === undefined) {
      continue;
    }
    const state = VscodeSeedRolesFixture.run(
      VscodeSeedRolesFixture.body(
        VscodeSeedPaletteBodyEntity.create({
          'framing': framing,
          'roles': {},
          'tier': 4
        })
      )
    );
    const themeJson = state.outputs['vscode:themeJson'];
    assert.ok(
      JSON.stringify(themeJson).includes(`"type":"${framing}"`),
      `${framing} intake produces a ${framing} VS Code theme`
    );
  }
});

await test('VscodeSeedRoles :: reports every declared contrast pair across tiers and framings', () => {
  const framings = ['dark', 'light'] as const;
  const tiers = [4, 8, 16, 64] as const;
  for (
    let framingIndex = 0;
    framingIndex < framings.length;
    framingIndex += 1
  ) {
    const framing = framings.at(framingIndex);
    if (framing === undefined) {
      continue;
    }
    const schema =
      framing === 'dark'
        ? VSCODE_FULL_ROLE_SCHEMAS.dark
        : VSCODE_FULL_ROLE_SCHEMAS.light;
    for (let tierIndex = 0; tierIndex < tiers.length; tierIndex += 1) {
      const tier = tiers.at(tierIndex);
      if (tier === undefined) {
        continue;
      }
      const state = VscodeSeedRolesFixture.run(
        VscodeSeedRolesFixture.body(
          VscodeSeedPaletteBodyEntity.create({
            'framing': framing,
            'roles': {},
            'tier': tier
          })
        )
      );
      const report = Metadata.contrastReport(state.metadata);
      assert.ok(
        report !== undefined,
        `${framing} tier ${tier} writes a contrast report`
      );
      assert.strictEqual(
        report.pairs.length,
        schema.contrastPairs?.length,
        `${framing} tier ${tier} reports every declared pair`
      );
    }
  }
});

await test('VscodeSeedRoles :: rejects malformed tier contracts and mismatched framing at the intake boundary', () => {
  const valid = VscodeSeedRolesFixture.body(
    VscodeSeedPaletteBodyEntity.create({ 'framing': 'dark', 'roles': {}, 'tier': 4 })
  );
  const invalidBodies: readonly InputEntity.Type['colors'][number][] = [
    { 'framing': 'dark', 'roles': valid.roles, 'tier': 5 },
    { 'framing': 'dark', 'roles': valid.roles, 'tier': '16' },
    { 'framing': 'dark', 'roles': { ...valid.roles, 'type': '#7c3aed' }, 'tier': 4 },
    {
      'framing': 'dark',
      'roles': { 'background': '#101820', 'error': '#ef4444', 'foreground': '#f5f7fa' },
      'tier': 4
    },
    {
      'framing': 'dark',
      'roles': VscodeSeedRolesFixture.body(
        VscodeSeedPaletteBodyEntity.create({
          'framing': 'dark',
          'roles': {},
          'tier': 8
        })
      ).roles,
      'tier': 4
    },
    { 'framing': 'dark', 'roles': { ...valid.roles, 'keyword': '#12345g' }, 'tier': 4 }
  ];

  for (let index = 0; index < invalidBodies.length; index += 1) {
    const body = invalidBodies.at(index);
    assert.throws(() => {
      VscodeSeedRolesFixture.runSeedOnly(
        InputEntity.intake({
          'colors': [body],
          'roles': VSCODE_FULL_ROLE_SCHEMAS.dark,
          'runtime': { 'framing': 'dark' }
        })
      );
    });
  }

  assert.throws(() => {
    VscodeSeedRolesFixture.runSeedOnly(
      InputEntity.intake({
        'colors': [valid],
        'roles': VSCODE_FULL_ROLE_SCHEMAS.dark,
        'runtime': {}
      })
    );
  });
  assert.throws(() => {
    VscodeSeedRolesFixture.runSeedOnly(
      InputEntity.intake({
        'colors': [valid],
        'roles': VSCODE_FULL_ROLE_SCHEMAS.dark,
        'runtime': { 'framing': 'light' }
      })
    );
  });
});
