import type { JSONSchema7Type } from 'json-schema';

import { Engine, InputEntity, RoleSchemaEntity, RuntimeOptionsEntity } from '@studnicky/iridis';
import { coreTasks } from '@studnicky/iridis/tasks';
import { JsonObject } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  vscodePlugin,
  VscodeRolePaletteEntity,
  VscodeRoleProjectionEntity
} from '../../src/index.ts';
import { BridgeVscodeRolesPattern } from '../fixtures/BridgeVscodeRolesPattern.ts';

class BridgeVscodeRolesFixture {
  static readonly #seedRoleNames = [
    'background', 'foreground', 'surface', 'muted', 'keyword', 'type', 'function', 'variable',
    'string', 'number', 'constant', 'comment', 'error', 'warning', 'info', 'success'
  ] as const;

  static bridge(sourceRole: string): Record<string, JSONSchema7Type> {
    const roleEntries = new Map<string, JSONSchema7Type>();
    for (let roleIndex = 0; roleIndex < BridgeVscodeRolesFixture.#seedRoleNames.length; roleIndex += 1) {
      const seedRole = BridgeVscodeRolesFixture.#seedRoleNames.at(roleIndex);
      if (seedRole !== undefined) {
        roleEntries.set(seedRole, [sourceRole]);
      }
    }
    const result = { 'framing': 'dark', 'roles': JsonObject.fromEntries(roleEntries) };
    return result;
  }

  static engine(): Engine {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks.at(taskIndex);
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(vscodePlugin);
    engine.pipeline(['intake:hex', 'resolve:roles', 'derive:roleRelations', 'enforce:contrast', 'vscode:bridgeRoles']);
    return engine;
  }

  static input(sourceRole: string, bridgeSourceRole = sourceRole): InputEntity.Type {
    const result = InputEntity.create({
      'colors': ['#0d1117'],
      'metadata': { 'vscode:roleBridge': BridgeVscodeRolesFixture.bridge(bridgeSourceRole) },
      'roles': RoleSchemaEntity.intake({
        'name': 'bridge-fixture',
        'roles': [{ 'name': sourceRole, 'required': true }]
      }),
      'runtime': RuntimeOptionsEntity.create({ 'framing': 'dark' })
    });
    return result;
  }
}

await test('BridgeVscodeRoles :: projects a resolved caller role through every canonical seed key', () => {
  const state = BridgeVscodeRolesFixture.engine().run(BridgeVscodeRolesFixture.input('siteCanvas'));
  const paletteValue = state.metadata['vscode:rolePalette'];
  const projectionValue = state.metadata['vscode:roleProjection'];
  assert.notEqual(paletteValue, undefined);
  assert.notEqual(projectionValue, undefined);
  const palette = VscodeRolePaletteEntity.intake(paletteValue);
  const projection = VscodeRoleProjectionEntity.intake(projectionValue);
  assert.equal(palette.tier, 16);
  assert.equal(palette.framing, 'dark');
  assert.equal(projection.roles.background?.sourceRole, 'siteCanvas');
  assert.equal(projection.roles.success?.sourceRole, 'siteCanvas');
  assert.equal(palette.roles.background?.hex, state.roles.siteCanvas?.hex);
  assert.equal(palette.roles.success?.hex, state.roles.siteCanvas?.hex);
});

await test('BridgeVscodeRoles :: rejects an unresolved mapping without fabricating a fallback colour', () => {
  assert.throws(() => {
    BridgeVscodeRolesFixture.engine().run(BridgeVscodeRolesFixture.input('siteCanvas', 'missingRole'));
  }, function(error: Error): boolean {
    const result = error.message.includes(BridgeVscodeRolesPattern.missingSeedRole);
    return result;
  });
});

await test('BridgeVscodeRoles :: rejects malformed bridge metadata before pipeline tasks run', () => {
  assert.throws(() => {
    BridgeVscodeRolesFixture.engine().run({
      ...BridgeVscodeRolesFixture.input('siteCanvas'),
      'metadata': { 'vscode:roleBridge': { 'framing': 'dark', 'roles': {} } }
    });
  }, function(error: Error): boolean {
    const result = error.message.includes(BridgeVscodeRolesPattern.invalidBridgeMetadata);
    return result;
  });
});
