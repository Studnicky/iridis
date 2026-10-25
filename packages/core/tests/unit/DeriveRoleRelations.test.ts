import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorRecordEntity } from '../../src/entities/ColorRecordEntity.ts';
import type { RoleDefinitionEntity } from '../../src/entities/RoleDefinitionEntity.ts';
import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';

import { Engine } from '../../src/engine/Engine.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RoleDefinitionEntity } from '../../src/entities/RoleDefinitionEntity.ts';
import { RoleRelationshipEntity } from '../../src/entities/RoleRelationshipEntity.ts';
import { RoleRelationshipGraphEntity } from '../../src/entities/RoleRelationshipGraphEntity.ts';
import { RoleSchemaEntity } from '../../src/entities/RoleSchemaEntity.ts';
import { TaskManifestEntity } from '../../src/entities/TaskManifestEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { mixOklch } from '../../src/math/MixOklch.ts';
import { coreTasks } from '../../src/tasks/index.ts';
import { RoleGeometry } from '../../src/tasks/RoleGeometry.ts';
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
    const result = this.runSchema(this.schema(relationships, roleNames), colors);
    return result;
  }

  static runSchema(
    schema: RoleSchemaEntity.Type,
    colors: readonly ColorRecordEntity.Type[]
  ) {
    const engine = this.engine(colors);
    const result = engine.run(InputEntity.intake({
      'colors': [],
      'roles': schema
    }));
    return result;
  }

  static schemaWithRoles(
    relationships: RoleRelationshipEntity.Type[],
    roles: readonly RoleDefinitionEntity.Type[]
  ): RoleSchemaEntity.Type {
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
    const result = RoleSchemaEntity.create({
      'name': 'relationship-resolver-ranges',
      'relationshipGraph': graph,
      'roles': roles
    });
    return result;
  }
}

void test('derive:roleRelations resolves every canonical relationship operation', () => {
  const relationships = [
    RoleRelationshipEntity.create({ 'id': 'alias', 'operation': 'alias', 'priority': 0, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' }),
    RoleRelationshipEntity.create({ 'id': 'offset', 'operation': 'hue-offset', 'priority': 1, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent-near', 'variantId': 'near' }),
    RoleRelationshipEntity.create({ 'id': 'delta', 'lightnessOffset': 0.1, 'operation': 'oklch-delta', 'priority': 2, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent-light' }),
    RoleRelationshipEntity.create({ 'id': 'interpolate', 'operation': 'oklch-interpolate', 'priority': 3, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent-soft', 'toward': 'background', 'weight': 0.6 }),
    RoleRelationshipEntity.create({ 'alpha': 0.4, 'base': 'background', 'id': 'overlay', 'operation': 'alpha-overlay', 'overlay': 'brand', 'priority': 4, 'relaxability': 'fixed', 'target': 'brand-overlay' }),
    RoleRelationshipEntity.create({ 'hue': 120, 'id': 'semantic', 'operation': 'hue-target', 'priority': 5, 'relaxability': 'fixed', 'source': 'brand', 'target': 'semantic' })
  ];
  const brand = DeriveRoleRelationsFixture.color('#b45af280', 'brand');
  const background = DeriveRoleRelationsFixture.color('#15151c80', 'background');
  const state = DeriveRoleRelationsFixture.run(
    relationships,
    ['brand', 'background', 'accent', 'accent-near', 'accent-light', 'accent-soft', 'brand-overlay', 'semantic'],
    [brand, background]
  );

  assert.strictEqual(state.roles.accent, brand);
  const near = state.roles['accent-near'];
  const light = state.roles['accent-light'];
  const soft = state.roles['accent-soft'];
  const overlay = state.roles['brand-overlay'];
  const semantic = state.roles.semantic;
  assert.ok(near !== undefined);
  assert.ok(light !== undefined);
  assert.ok(soft !== undefined);
  assert.ok(overlay !== undefined);
  assert.ok(semantic !== undefined);
  assert.ok(Math.abs(near.oklch.h - brand.oklch.h) > 20);
  assert.ok(light.oklch.l > brand.oklch.l);
  assert.equal(soft.hex, mixOklch.apply(brand, background, 0.6).hex);
  assert.ok(overlay.alpha < 1);
  assert.equal(semantic.alpha, brand.alpha);
  assert.equal(semantic.oklch.l, brand.oklch.l);
  assert.equal(semantic.oklch.c, brand.oklch.c);
  assert.equal(semantic.oklch.h, RoleGeometry.hueTowards(brand.oklch.h, 120, RoleGeometry.DEFAULT_HUE_CLAMP));
  const resolution = Metadata.relationshipResolution(state.metadata);
  assert.equal(resolution.get('brand-overlay')?.relationshipId, 'overlay');
  assert.equal(resolution.get('brand-overlay')?.after?.hex, overlay.hex);
  assert.equal(resolution.get('semantic')?.operation, 'hue-target');
});

void test('derive:roleRelations resolves dependent targets after their sources become available', () => {
  const relationships = [
    RoleRelationshipEntity.create({ 'id': 'accent-delta', 'lightnessOffset': 0.1, 'operation': 'oklch-delta', 'priority': 2, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' }),
    RoleRelationshipEntity.create({ 'id': 'highlight-alias', 'operation': 'alias', 'priority': 1, 'relaxability': 'fixed', 'source': 'accent', 'target': 'highlight' })
  ];
  const brand = DeriveRoleRelationsFixture.color('#7c3aed', 'brand');
  const state = DeriveRoleRelationsFixture.run(relationships, ['brand', 'accent', 'highlight'], [brand]);
  const accent = state.roles.accent;
  const highlight = state.roles.highlight;
  assert.ok(accent !== undefined);
  assert.ok(highlight !== undefined);
  assert.ok(accent.oklch.l > brand.oklch.l);
  assert.equal(Metadata.relationshipResolution(state.metadata).get('highlight')?.relationshipId, 'highlight-alias');
});

void test('derive:roleRelations applies target envelopes and source-less hue targets', () => {
  const rangeRelationship = RoleRelationshipEntity.create({
    'id': 'alias',
    'operation': 'alias',
    'priority': 0,
    'relaxability': 'fixed',
    'source': 'brand',
    'target': 'accent'
  });
  const rangeSchema = DeriveRoleRelationsFixture.schemaWithRoles(
    [rangeRelationship],
    [
      RoleDefinitionEntity.create({ 'name': 'brand' }),
      RoleDefinitionEntity.create({
        'chromaRange': [0.01, 0.03],
        'lightnessRange': [0.20, 0.40],
        'name': 'accent'
      })
    ]
  );
  const brand = DeriveRoleRelationsFixture.color('#7c3aed80', 'brand');
  const ranged = DeriveRoleRelationsFixture.runSchema(rangeSchema, [brand]);
  const accent = ranged.roles.accent;
  assert.ok(accent !== undefined);
  assert.ok(Math.abs(accent.oklch.l - 0.30) < 1e-12);
  assert.ok(Math.abs(accent.oklch.c - 0.02) < 1e-12);
  assert.ok(Math.abs((Metadata.relationshipResolution(ranged.metadata).get('accent')?.after?.oklch.l ?? 0) - 0.30) < 1e-12);

  const selfRelationship = RoleRelationshipEntity.create({
    'clamp': 25,
    'hue': 120,
    'id': 'error-hue',
    'operation': 'hue-target',
    'priority': 0,
    'relaxability': 'fixed',
    'target': 'error'
  });
  const selfSchema = DeriveRoleRelationsFixture.schemaWithRoles(
    [selfRelationship],
    [
      RoleDefinitionEntity.create({ 'name': 'brand' }),
      RoleDefinitionEntity.create({
        'chromaRange': [0.10, 0.20],
        'lightnessRange': [0.40, 0.60],
        'name': 'error',
        'required': true
      })
    ]
  );
  const self = DeriveRoleRelationsFixture.runSchema(selfSchema, []);
  const entry = Metadata.relationshipResolution(self.metadata).get('error');
  assert.equal(entry?.disposition, 'applied');
  assert.ok(entry?.before !== undefined);
  assert.ok(entry?.after !== undefined);
  assert.equal(entry?.after?.oklch.l, entry?.before?.oklch.l);
  assert.equal(entry?.after?.oklch.c, entry?.before?.oklch.c);
  assert.equal(entry?.after?.alpha, entry?.before?.alpha);
  assert.equal(entry?.after?.oklch.h, RoleGeometry.hueTowards(entry.before.oklch.h, 120, 25));

  const statedError = DeriveRoleRelationsFixture.color('#d93448', 'error');
  const stated = DeriveRoleRelationsFixture.runSchema(selfSchema, [statedError]);
  assert.strictEqual(stated.roles.error, statedError);
  assert.equal(Metadata.relationshipResolution(stated.metadata).get('error')?.disposition, 'preserved-stated');
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
