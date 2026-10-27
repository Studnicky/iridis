import { Engine, InputEntity, Metadata } from '@studnicky/iridis';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VSCODE_FULL_ROLE_SCHEMAS, vscodePlugin } from '../../src/index.ts';

class VscodeRoleRelationFixture {
  static engine(): Engine {
    const engine = new Engine();
    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(vscodePlugin);
    engine.pipeline(['intake:hex', 'resolve:roles', 'derive:roleRelations']);
    return engine;
  }

  static run() {
    const input = InputEntity.create({
      'colors': ['#0d1117', '#e6edf3', '#8b5cf6', '#22d3ee', '#34d399', '#fb7185', '#fbbf24', '#f59e0b'],
      'roles': VSCODE_FULL_ROLE_SCHEMAS.dark
    });
    const result = VscodeRoleRelationFixture.engine().run(input);
    return result;
  }
}

await test('Vscode role relationships :: resolve every full schema role through the canonical graph', () => {
  const state = VscodeRoleRelationFixture.run();
  const schema = VSCODE_FULL_ROLE_SCHEMAS.dark;

  assert.equal(Object.keys(state.roles).length, schema.roles.length);
  for (let roleIndex = 0; roleIndex < schema.roles.length; roleIndex += 1) {
    const role = schema.roles[roleIndex];
    if (role === undefined) {
      throw new Error(`Missing schema role at ${roleIndex}.`);
    }
    assert.notEqual(state.roles[role.name], undefined, role.name);
  }
});

await test('Vscode role relationships :: derive secondary button hover through its authored interpolation relation', () => {
  const state = VscodeRoleRelationFixture.run();
  const provenance = Metadata.roleProvenance(state.metadata);
  const hover = state.roles.buttonSecondaryHover;

  assert.notEqual(hover, undefined);
  assert.equal(provenance.get('buttonSecondaryHover')?.origin, 'derived');
  assert.notEqual(hover?.hex, state.roles.buttonSecondary?.hex);
});
