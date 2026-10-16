import type { InputInterface, PaletteStateInterface } from '@studnicky/iridis';
import type { JsonValueType } from '@studnicky/types';

import { EngineMetadata } from '@studnicky/iridis';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VSCODE_ROLE_SCHEMAS_64, vscodePlugin } from '../../src/index.ts';

type PaletteBodyInterface = {
  readonly 'framing':     'dark' | 'light';
  readonly [key: string]: JsonValueType;
  readonly 'roles':       Record<string, string>;
  readonly 'tier':        4 | 8 | 16 | 64;
};


const TIER_4_ROLES = ['background', 'foreground', 'keyword', 'error'] as const;
const TIER_8_ROLES = [...TIER_4_ROLES, 'type', 'function', 'number', 'constant'] as const;
const TIER_16_ROLES = [
  'background', 'foreground', 'surface', 'muted', 'keyword', 'type', 'function', 'variable',
  'string', 'number', 'constant', 'comment', 'error', 'warning', 'info', 'success'
] as const;
const TIER_64_ROLES = VSCODE_ROLE_SCHEMAS_64.dark.roles.map((role) => { const result = role.name;
  return result; });
const SEED_COLORS = ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444'] as const;

class VscodeSeedRolesFixture {

  static engine(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) { engine.tasks.register(task); }
    engine.adopt(vscodePlugin);
    return engine;
  }

  static roleNames(tier: PaletteBodyInterface['tier']): readonly string[] {
    if (tier === 4) { return TIER_4_ROLES; }
    if (tier === 8) { return TIER_8_ROLES; }
    if (tier === 16) { return TIER_16_ROLES; }
    return TIER_64_ROLES;
  }

  static body(tier: PaletteBodyInterface['tier'], framing: PaletteBodyInterface['framing']): PaletteBodyInterface {
    const roles: Record<string, string> = {};
    for (const [index, role] of VscodeSeedRolesFixture.roleNames(tier).entries()) {
      if (role === 'background') {
        roles[role] = framing === 'dark' ? '#101820' : '#f7f4ed';
      } else if (role === 'foreground') {
        roles[role] = framing === 'dark' ? '#f5f7fa' : '#17212b';
      } else {
        roles[role] = SEED_COLORS[index % SEED_COLORS.length]!;
      }
    }
    return { 'framing': framing, 'roles': roles, 'tier': tier };
  }

  static input(body: PaletteBodyInterface, runtimeFraming: 'dark' | 'light' | undefined): InputInterface {
    return {
      'bypass':    undefined,
      'colors':    [body],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     body.framing === 'dark' ? VSCODE_ROLE_SCHEMAS_64.dark : VSCODE_ROLE_SCHEMAS_64.light,
      'runtime':   runtimeFraming === undefined ? undefined : {
        'colorSpace': undefined,
        'extra':      undefined,
        'framing':    runtimeFraming
      }
    };
  }

  static run(body: PaletteBodyInterface, runtimeFraming: 'dark' | 'light' | undefined): PaletteStateInterface {
    const engine = VscodeSeedRolesFixture.engine();
    engine.pipeline([
      'vscode:seedRoles',
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
    ]);
    return engine.run(VscodeSeedRolesFixture.input(body, runtimeFraming));
  }

  static runSeedOnly(body: PaletteBodyInterface, runtimeFraming: 'dark' | 'light' | undefined): PaletteStateInterface {
    const engine = VscodeSeedRolesFixture.engine();
    engine.pipeline(['vscode:seedRoles']);
    return engine.run(VscodeSeedRolesFixture.input(body, runtimeFraming));
  }
}

await test('VscodeSeedRoles :: accepts exact 4/8/16/64 tiers, preserves caller-stated roles, and resolves the 64-role output vocabulary', () => {
  for (const tier of [4, 8, 16, 64] as const) {
    const body = VscodeSeedRolesFixture.body(tier, 'dark');
    const state = VscodeSeedRolesFixture.run(body, 'dark');
    const suppliedRoles = VscodeSeedRolesFixture.roleNames(tier);
    const provenance = EngineMetadata.get(state.metadata, 'core:roleProvenance');
    if (provenance === undefined) {
      throw new TypeError(`tier ${tier} must record role provenance`);
    }

    assert.strictEqual(state.colors.length, suppliedRoles.length, `tier ${tier} intake emits one record per supplied role`);
    for (const role of suppliedRoles) {
      assert.deepStrictEqual(provenance[role], { 'adjustments': [], 'origin': 'stated' }, `tier ${tier} records ${role} as caller-stated`);
      assert.strictEqual(state.roles[role]?.hex, body.roles[role], `tier ${tier} preserves ${role} exactly`);
    }
    assert.strictEqual(Object.keys(state.roles).length, 64, `tier ${tier} resolves the full 64-role vocabulary`);
  }
});

await test('VscodeSeedRoles :: selects explicit dark and light output framing', () => {
  for (const framing of ['dark', 'light'] as const) {
    const state = VscodeSeedRolesFixture.run(VscodeSeedRolesFixture.body(4, framing), framing);
    const themeJson = state.outputs['vscode:themeJson'];
    assert.ok(JSON.stringify(themeJson).includes(`"type":"${framing}"`), `${framing} intake produces a ${framing} VS Code theme`);
  }
});

await test('VscodeSeedRoles :: reports every declared contrast pair across tiers and framings', () => {
  for (const framing of ['dark', 'light'] as const) {
    const schema = VSCODE_ROLE_SCHEMAS_64[framing];
    for (const tier of [4, 8, 16, 64] as const) {
      const state = VscodeSeedRolesFixture.run(VscodeSeedRolesFixture.body(tier, framing), framing);
      const report = state.metadata['core:contrastReport'];
      assert.ok(Array.isArray(report), `${framing} tier ${tier} writes a contrast report`);
      assert.strictEqual(report.length, schema.contrastPairs?.length, `${framing} tier ${tier} reports every declared pair`);
      for (const entry of report) {
        assert.ok(entry !== null && typeof entry === 'object' && !Array.isArray(entry), `${framing} tier ${tier} report entries are objects`);
      }
    }
  }
});

await test('VscodeSeedRoles :: rejects malformed tier contracts and mismatched framing at the intake boundary', () => {
  const valid = VscodeSeedRolesFixture.body(4, 'dark');
  const invalidBodies: readonly JsonValueType[] = [
    { 'framing': 'dark', 'roles': valid.roles, 'tier': 5 },
    { 'framing': 'dark', 'roles': valid.roles, 'tier': '16' },
    { 'framing': 'dark', 'roles': { ...valid.roles, 'type': '#7c3aed' }, 'tier': 4 },
    { 'framing': 'dark', 'roles': { 'background': '#101820', 'error': '#ef4444', 'foreground': '#f5f7fa' }, 'tier': 4 },
    { 'framing': 'dark', 'roles': VscodeSeedRolesFixture.body(8, 'dark').roles, 'tier': 4 },
    { 'framing': 'dark', 'roles': { ...valid.roles, 'keyword': '#12345g' }, 'tier': 4 }
  ];

  for (const body of invalidBodies) {
    assert.throws(() => {
      const engine = VscodeSeedRolesFixture.engine();
      engine.pipeline(['vscode:seedRoles']);
      engine.run({
        'bypass':    undefined,
        'colors':    [body],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles':     VSCODE_ROLE_SCHEMAS_64.dark,
        'runtime':   { 'colorSpace': undefined, 'extra': undefined, 'framing': 'dark' }
      });
    }, /vscode:seedRoles/);
  }

  assert.throws(() => { VscodeSeedRolesFixture.runSeedOnly(valid, undefined); }, /vscode:seedRoles/);
  assert.throws(() => { VscodeSeedRolesFixture.runSeedOnly(valid, 'light'); }, /vscode:seedRoles/);
});
