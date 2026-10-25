import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorRecordEntity } from '../../src/entities/ColorRecordEntity.ts';
import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';

import { Engine } from '../../src/engine/Engine.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RoleRelationshipEntity } from '../../src/entities/RoleRelationshipEntity.ts';
import { RoleRelationshipGraphEntity } from '../../src/entities/RoleRelationshipGraphEntity.ts';
import { RoleSchemaEntity } from '../../src/entities/RoleSchemaEntity.ts';
import { TaskManifestEntity } from '../../src/entities/TaskManifestEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { mixOklch } from '../../src/math/MixOklch.ts';
import { coreTasks } from '../../src/tasks/index.ts';
import { Metadata } from '../../src/types/metadata.ts';

class DeriveRoleRelationsFixture {
  static engine(colors: readonly ColorRecordEntity.Type[]): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.tasks.hook({
      'manifest': TaskManifestEntity.create({ 'name': 'seed:relationship-test', 'phase': 'onRunStart' }),
      'name': 'seed:relationship-test',
      'run': (state: PaletteStateInterface): void => {
        state.colors.push(...colors);
      }
    });
    engine.pipeline(['resolve:roles', 'derive:roleRelations']);
    return engine;
  }

  static color(hex: string, role: string): ColorRecordEntity.Type {
    const result = colorRecordFactory.fromHex(hex, { 'hints': { 'role': role } });
    return result;
  }

  static schema(relationships: RoleRelationshipEntity.Type[], roleNames: readonly string[]): RoleSchemaEntity.Type {
    const graph = RoleRelationshipGraphEntity.create({
      'groups': [{
        'anchor': 'brand',
        'defaultMode': 'analogous',
        'id': 'brand-family',
        'modes': [{
          'hueOffsets': [{ 'degrees': 30, 'variantId': 'near' }],
          'id': 'analogous'
        }],
        'name': 'Brand family',
        'relationships': relationships
      }]
    });
    const result = RoleSchemaEntity.intake({
      'name': 'relationship-resolver',
      'relationshipGraph': graph,
      'roles': roleNames.map((name) => {
        return { 'name': name };
      })
    });
    return result;
  }

  static run(
    relationships: RoleRelationshipEntity.Type[],
    roleNames: readonly string[],
    colors: readonly ColorRecordEntity.Type[]
  ) {
    const engine = this.engine(colors);
    const result = engine.run(InputEntity.intake({
      'colors': [],
      'roles': this.schema(relationships, roleNames)
    }));
    return result;
  }
}

void test('derive:roleRelations resolves every canonical relationship operation', () => {
  const relationships = [
    RoleRelationshipEntity.create({ 'id': 'alias', 'operation': 'alias', 'priority': 0, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' }),
    RoleRelationshipEntity.create({ 'id': 'offset', 'operation': 'hue-offset', 'priority': 1, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent-near', 'variantId': 'near' }),
    RoleRelationshipEntity.create({ 'id': 'delta', 'lightnessOffset': 0.1, 'operation': 'oklch-delta', 'priority': 2, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent-light' }),
    RoleRelationshipEntity.create({ 'id': 'interpolate', 'operation': 'oklch-interpolate', 'priority': 3, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent-soft', 'toward': 'background', 'weight': 0.6 }),
    RoleRelationshipEntity.create({ 'alpha': 0.4, 'base': 'background', 'id': 'overlay', 'operation': 'alpha-overlay', 'overlay': 'brand', 'priority': 4, 'relaxability': 'fixed', 'target': 'brand-overlay' })
  ];
  const brand = DeriveRoleRelationsFixture.color('#b45af2', 'brand');
  const background = DeriveRoleRelationsFixture.color('#15151c80', 'background');
  const state = DeriveRoleRelationsFixture.run(
    relationships,
    ['brand', 'background', 'accent', 'accent-near', 'accent-light', 'accent-soft', 'brand-overlay'],
    [brand, background]
  );

  assert.strictEqual(state.roles.accent, brand);
  const near = state.roles['accent-near'];
  const light = state.roles['accent-light'];
  const soft = state.roles['accent-soft'];
  const overlay = state.roles['brand-overlay'];
  assert.ok(near !== undefined);
  assert.ok(light !== undefined);
  assert.ok(soft !== undefined);
  assert.ok(overlay !== undefined);
  assert.ok(Math.abs(near.oklch.h - brand.oklch.h) > 20);
  assert.ok(light.oklch.l > brand.oklch.l);
  assert.equal(soft.hex, mixOklch.apply(brand, background, 0.6).hex);
  assert.ok(overlay.alpha < 1);
  const resolution = Metadata.relationshipResolution(state.metadata);
  assert.equal(resolution.get('brand-overlay')?.relationshipId, 'overlay');
  assert.equal(resolution.get('brand-overlay')?.after?.hex, overlay.hex);
});

void test('derive:roleRelations orders same-target relationships by priority then id', () => {
  const relationships = [
    RoleRelationshipEntity.create({ 'id': 'later', 'lightnessOffset': 0.1, 'operation': 'oklch-delta', 'priority': 2, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' }),
    RoleRelationshipEntity.create({ 'id': 'first', 'operation': 'alias', 'priority': 1, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' })
  ];
  const brand = DeriveRoleRelationsFixture.color('#7c3aed', 'brand');
  const state = DeriveRoleRelationsFixture.run(relationships, ['brand', 'accent'], [brand]);
  const accent = state.roles.accent;
  assert.ok(accent !== undefined);
  assert.ok(accent.oklch.l > brand.oklch.l);
  assert.equal(Metadata.relationshipResolution(state.metadata).get('accent')?.relationshipId, 'later');
});

void test('derive:roleRelations preserves caller-stated targets', () => {
  const relationships = [
    RoleRelationshipEntity.create({ 'id': 'alias', 'operation': 'alias', 'priority': 0, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' })
  ];
  const brand = DeriveRoleRelationsFixture.color('#7c3aed', 'brand');
  const accent = DeriveRoleRelationsFixture.color('#00ff00', 'accent');
  const state = DeriveRoleRelationsFixture.run(relationships, ['brand', 'accent'], [brand, accent]);
  assert.strictEqual(state.roles.accent, accent);
  const entry = Metadata.relationshipResolution(state.metadata).get('accent');
  assert.equal(entry?.disposition, 'preserved-stated');
  assert.equal(entry?.blockedReason, 'stated-target');
});

void test('derive:roleRelations records missing-source and cycle runtime states', () => {
  const missing = DeriveRoleRelationsFixture.run(
    [RoleRelationshipEntity.create({ 'id': 'missing', 'operation': 'alias', 'priority': 0, 'relaxability': 'fixed', 'source': 'missing-source', 'target': 'accent' })],
    ['brand', 'missing-source', 'accent'],
    []
  );
  const cycle = DeriveRoleRelationsFixture.run(
    [
      RoleRelationshipEntity.create({ 'id': 'a', 'operation': 'alias', 'priority': 0, 'relaxability': 'fixed', 'source': 'b', 'target': 'a' }),
      RoleRelationshipEntity.create({ 'id': 'b', 'operation': 'alias', 'priority': 1, 'relaxability': 'fixed', 'source': 'a', 'target': 'b' })
    ],
    ['brand', 'a', 'b'],
    []
  );
  assert.equal(Metadata.relationshipResolution(missing.metadata).get('accent')?.blockedReason, 'missing-source');
  assert.equal(Metadata.relationshipResolution(cycle.metadata).get('a')?.blockedReason, 'cycle');
  assert.equal(Metadata.relationshipResolution(cycle.metadata).get('b')?.blockedReason, 'cycle');
});

void test('core tasks resolve relationship graphs between role resolution and family expansion', () => {
  const taskNames = coreTasks.map((task) => {
    const result = task.name;
    return result;
  });
  const resolveRolesIndex = taskNames.indexOf('resolve:roles');
  const relationshipResolverIndex = taskNames.indexOf('derive:roleRelations');
  const expandFamilyIndex = taskNames.indexOf('expand:family');

  assert.equal(relationshipResolverIndex, resolveRolesIndex + 1);
  assert.equal(expandFamilyIndex, relationshipResolverIndex + 1);
});
