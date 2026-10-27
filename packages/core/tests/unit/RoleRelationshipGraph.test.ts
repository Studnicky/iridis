import type { CanonicalShapeType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HarmonyModeEntity } from '../../src/entities/HarmonyModeEntity.ts';
import type { RoleRelationshipGroupEntity } from '../../src/entities/RoleRelationshipGroupEntity.ts';

import { Engine } from '../../src/engine/Engine.ts';
import { ColorRecordEntity } from '../../src/entities/ColorRecordEntity.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RelationshipResolutionEntity } from '../../src/entities/RelationshipResolutionEntity.ts';
import { RoleRelationshipEntity } from '../../src/entities/RoleRelationshipEntity.ts';
import { RoleRelationshipGraphEntity } from '../../src/entities/RoleRelationshipGraphEntity.ts';
import { RoleSchemaEntity } from '../../src/entities/RoleSchemaEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { RoleRelationshipGraphIntegrity } from '../../src/model/RoleRelationshipGraphIntegrity.ts';
import { Metadata } from '../../src/types/metadata.ts';

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
    'relationships': [
      { 'id': 'alias', 'operation': 'alias', 'priority': 0, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' },
      { 'id': 'offset', 'operation': 'hue-offset', 'priority': 1, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent-near', 'variantId': 'near' },
      { 'id': 'delta', 'lightnessOffset': 0.1, 'operation': 'oklch-delta', 'priority': 2, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent-light' },
      { 'id': 'interpolate', 'operation': 'oklch-interpolate', 'priority': 3, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent-soft', 'toward': 'background', 'weight': 0.6 },
      { 'alpha': 0.4, 'base': 'background', 'id': 'overlay', 'operation': 'alpha-overlay', 'overlay': 'brand', 'priority': 4, 'relaxability': 'tolerant', 'target': 'brand-overlay', 'tolerance': { 'alpha': 0.1, 'lightness': 0.02 } }
    ]
  }]
});

class RelationshipGraphFixture {
  static readonly roleNames = ['accent', 'accent-light', 'accent-near', 'accent-soft', 'background', 'brand', 'brand-overlay'];

  static mode(options: {
    readonly 'hueOffsets'?: [{ readonly 'degrees': number; readonly 'variantId': string }, ...{ readonly 'degrees': number; readonly 'variantId': string }[]];
    readonly 'id'?: string;
  } = {}): CanonicalShapeType<typeof HarmonyModeEntity.Schema> {
    const result: CanonicalShapeType<typeof HarmonyModeEntity.Schema> = {
      'hueOffsets': options.hueOffsets ?? [{ 'degrees': 30, 'variantId': 'near' }],
      'id': options.id ?? 'analogous'
    };
    return result;
  }

  static alias(options: { readonly 'id'?: string; readonly 'priority'?: number; readonly 'source'?: string; readonly 'target'?: string } = {}): CanonicalShapeType<typeof RoleRelationshipEntity.Schema> {
    const result: CanonicalShapeType<typeof RoleRelationshipEntity.Schema> = {
      'id': options.id ?? 'alias',
      'operation': 'alias',
      'priority': options.priority ?? 0,
      'relaxability': 'fixed',
      'source': options.source ?? 'brand',
      'target': options.target ?? 'accent'
    };
    return result;
  }

  static hueOffset(options: { readonly 'modeId'?: string; readonly 'variantId'?: string } = {}): CanonicalShapeType<typeof RoleRelationshipEntity.Schema> {
    const result: CanonicalShapeType<typeof RoleRelationshipEntity.Schema> = {
      ...(options.modeId === undefined ? {} : { 'modeId': options.modeId }),
      'id': 'offset',
      'operation': 'hue-offset',
      'priority': 1,
      'relaxability': 'fixed',
      'source': 'brand',
      'target': 'accent-near',
      'variantId': options.variantId ?? 'near'
    };
    return result;
  }

  static delta(options: { readonly 'priority'?: number; readonly 'target'?: string } = {}): CanonicalShapeType<typeof RoleRelationshipEntity.Schema> {
    const result: CanonicalShapeType<typeof RoleRelationshipEntity.Schema> = {
      'id': 'delta',
      'lightnessOffset': 0.1,
      'operation': 'oklch-delta',
      'priority': options.priority ?? 2,
      'relaxability': 'fixed',
      'source': 'brand',
      'target': options.target ?? 'accent-light'
    };
    return result;
  }

  static interpolate(options: { readonly 'toward'?: string } = {}): CanonicalShapeType<typeof RoleRelationshipEntity.Schema> {
    const result: CanonicalShapeType<typeof RoleRelationshipEntity.Schema> = {
      'id': 'interpolate',
      'operation': 'oklch-interpolate',
      'priority': 3,
      'relaxability': 'fixed',
      'source': 'brand',
      'target': 'accent-soft',
      'toward': options.toward ?? 'background',
      'weight': 0.6
    };
    return result;
  }

  static overlay(options: { readonly 'base'?: string; readonly 'overlay'?: string } = {}): CanonicalShapeType<typeof RoleRelationshipEntity.Schema> {
    const result: CanonicalShapeType<typeof RoleRelationshipEntity.Schema> = {
      'alpha': 0.4,
      'base': options.base ?? 'background',
      'id': 'overlay',
      'operation': 'alpha-overlay',
      'overlay': options.overlay ?? 'brand',
      'priority': 4,
      'relaxability': 'tolerant',
      'target': 'brand-overlay',
      'tolerance': { 'alpha': 0.1, 'lightness': 0.02 }
    };
    return result;
  }

  static relationships(): CanonicalShapeType<typeof RoleRelationshipEntity.Schema>[] {
    const result = [this.alias(), this.hueOffset(), this.delta(), this.interpolate(), this.overlay()];
    return result;
  }

  static group(options: {
    readonly 'anchor'?: string;
    readonly 'defaultMode'?: string;
    readonly 'modes'?: [CanonicalShapeType<typeof HarmonyModeEntity.Schema>, ...CanonicalShapeType<typeof HarmonyModeEntity.Schema>[]];
    readonly 'relationships'?: CanonicalShapeType<typeof RoleRelationshipEntity.Schema>[];
  } = {}): CanonicalShapeType<typeof RoleRelationshipGroupEntity.Schema> {
    const result: CanonicalShapeType<typeof RoleRelationshipGroupEntity.Schema> = {
      'anchor': options.anchor ?? 'brand',
      'defaultMode': options.defaultMode ?? 'analogous',
      'id': 'brand-family',
      'modes': options.modes ?? [this.mode()],
      'name': 'Brand family',
      'relationships': options.relationships ?? this.relationships()
    };
    return result;
  }

  static graph(options: { readonly 'groups'?: [CanonicalShapeType<typeof RoleRelationshipGroupEntity.Schema>, ...CanonicalShapeType<typeof RoleRelationshipGroupEntity.Schema>[]] } = {}): RoleRelationshipGraphEntity.Type {
    const result = RoleRelationshipGraphEntity.create({ 'groups': options.groups ?? [this.group()] });
    return result;
  }

  static schema(relationshipGraph: RoleRelationshipGraphEntity.Type): RoleSchemaEntity.Type {
    const result = RoleSchemaEntity.create({
      'name': 'relationship-integrity',
      'relationshipGraph': relationshipGraph,
      'roles': this.roleNames.map((name) => {
        return { 'name': name };
      })
    });
    return result;
  }

  static withDuplicateGroup(): RoleRelationshipGraphEntity.Type {
    const group = this.group();
    const result = this.graph({ 'groups': [group, group] });
    return result;
  }

  static withDuplicateMode(): RoleRelationshipGraphEntity.Type {
    const mode = this.mode();
    const result = this.graph({ 'groups': [this.group({ 'modes': [mode, mode] })] });
    return result;
  }

  static withDuplicateVariant(): RoleRelationshipGraphEntity.Type {
    const result = RoleRelationshipGraphEntity.create({
      'groups': [{
        'anchor': 'brand',
        'defaultMode': 'analogous',
        'id': 'brand-family',
        'modes': [{
          'hueOffsets': [{ 'degrees': 30, 'variantId': 'near' }, { 'degrees': 30, 'variantId': 'near' }],
          'id': 'analogous'
        }],
        'name': 'Brand family',
        'relationships': this.relationships()
      }]
    });
    return result;
  }

  static withDuplicateRelationship(): RoleRelationshipGraphEntity.Type {
    const relationships = [...this.relationships(), this.alias({ 'id': 'alias', 'priority': 5, 'target': 'accent-light' })];
    const result = this.graph({ 'groups': [this.group({ 'relationships': relationships })] });
    return result;
  }

  static withAbsentDefaultMode(): RoleRelationshipGraphEntity.Type {
    const result = this.graph({ 'groups': [this.group({ 'defaultMode': 'absent' })] });
    return result;
  }

  static withAbsentMode(): RoleRelationshipGraphEntity.Type {
    const relationships = [this.alias(), this.hueOffset({ 'modeId': 'absent' }), this.delta(), this.interpolate(), this.overlay()];
    const result = this.graph({ 'groups': [this.group({ 'relationships': relationships })] });
    return result;
  }

  static withAbsentVariant(): RoleRelationshipGraphEntity.Type {
    const relationships = [this.alias(), this.hueOffset({ 'variantId': 'absent' }), this.delta(), this.interpolate(), this.overlay()];
    const result = this.graph({ 'groups': [this.group({ 'relationships': relationships })] });
    return result;
  }

  static withAbsentAnchor(): RoleRelationshipGraphEntity.Type {
    const result = this.graph({ 'groups': [this.group({ 'anchor': 'absent' })] });
    return result;
  }

  static withAbsentSource(): RoleRelationshipGraphEntity.Type {
    const relationships = [this.alias({ 'source': 'absent' }), this.hueOffset(), this.delta(), this.interpolate(), this.overlay()];
    const result = this.graph({ 'groups': [this.group({ 'relationships': relationships })] });
    return result;
  }

  static withAbsentTarget(): RoleRelationshipGraphEntity.Type {
    const relationships = [this.alias({ 'target': 'absent' }), this.hueOffset(), this.delta(), this.interpolate(), this.overlay()];
    const result = this.graph({ 'groups': [this.group({ 'relationships': relationships })] });
    return result;
  }

  static withAbsentToward(): RoleRelationshipGraphEntity.Type {
    const relationships = [this.alias(), this.hueOffset(), this.delta(), this.interpolate({ 'toward': 'absent' }), this.overlay()];
    const result = this.graph({ 'groups': [this.group({ 'relationships': relationships })] });
    return result;
  }

  static withAbsentBase(): RoleRelationshipGraphEntity.Type {
    const relationships = [this.alias(), this.hueOffset(), this.delta(), this.interpolate(), this.overlay({ 'base': 'absent' })];
    const result = this.graph({ 'groups': [this.group({ 'relationships': relationships })] });
    return result;
  }

  static withAbsentOverlay(): RoleRelationshipGraphEntity.Type {
    const relationships = [this.alias(), this.hueOffset(), this.delta(), this.interpolate(), this.overlay({ 'overlay': 'absent' })];
    const result = this.graph({ 'groups': [this.group({ 'relationships': relationships })] });
    return result;
  }

  static withAmbiguousTargetPriority(): RoleRelationshipGraphEntity.Type {
    const relationships = [this.alias(), this.hueOffset(), this.delta({ 'priority': 0, 'target': 'accent' }), this.interpolate(), this.overlay()];
    const result = this.graph({ 'groups': [this.group({ 'relationships': relationships })] });
    return result;
  }

  static assertIntegrityError(
    relationshipGraph: RoleRelationshipGraphEntity.Type,
    path: string,
    message: string
  ): void {
    const errors = RoleRelationshipGraphIntegrity.validate(this.schema(relationshipGraph));
    const first = errors[0];
    assert.equal(first?.path, path);
    assert.equal(first?.message, message);
  }
}

void test('relationship graph admits every canonical operation and embeds in a role schema', () => {
  assert.equal(RoleRelationshipGraphEntity.validate(graph), true);
  const schema = RoleSchemaEntity.intake({
    'name': 'relationship-contract',
    'relationshipGraph': graph,
    'roles': [{ 'name': 'brand' }]
  });
  assert.equal(schema.relationshipGraph?.groups[0]?.relationships.length, 5);
});

void test('relationship graph requires a tolerance only for tolerant relationships', () => {
  assert.equal(RoleRelationshipGraphEntity.validate({
    'groups': [{
      'anchor': 'brand',
      'defaultMode': 'analogous',
      'id': 'brand-family',
      'modes': [{ 'hueOffsets': [{ 'degrees': 30, 'variantId': 'near' }], 'id': 'analogous' }],
      'name': 'Brand family',
      'relationships': [{ 'id': 'invalid', 'operation': 'alias', 'priority': 0, 'relaxability': 'tolerant', 'source': 'brand', 'target': 'accent' }]
    }]
  }), false);
});

void test('relationship-resolution metadata preserves full color records including alpha', () => {
  const before = colorRecordFactory.fromHex('#33669980');
  const after = colorRecordFactory.fromHex('#6699cc40');
  const resolution = RelationshipResolutionEntity.create({
    'after': ColorRecordEntity.intake(after),
    'before': ColorRecordEntity.intake(before),
    'disposition': 'applied',
    'groupId': 'brand-family',
    'operation': 'alpha-overlay',
    'relationshipId': 'overlay',
    'sources': ['background', 'brand']
  });
  const metadata: Record<string, JSONSchema7Type> = {};
  Metadata.writeRelationshipResolution(metadata, new Map([['brand-overlay', resolution]]));
  const restored = Metadata.relationshipResolution(metadata);

  assert.deepEqual(restored.get('brand-overlay'), resolution);
  assert.equal(restored.get('brand-overlay')?.after?.alpha, 0.25098039215686274);
});

void test('relationship-resolution metadata validates each stored entry', () => {
  const metadata: Record<string, JSONSchema7Type> = {
    'core:relationshipResolution': {
      'invalid': {}
    }
  };

  assert.throws(() => {
    Metadata.relationshipResolution(metadata);
  });
});

void test('relationship graph integrity rejects incoherent authored references', () => {
  const cases = [
    { 'graph': RelationshipGraphFixture.withDuplicateGroup(), 'message': 'must be unique', 'path': 'relationshipGraph.groups[1].id' },
    { 'graph': RelationshipGraphFixture.withDuplicateMode(), 'message': 'must be unique within its group', 'path': 'relationshipGraph.groups[0].modes[1].id' },
    { 'graph': RelationshipGraphFixture.withDuplicateVariant(), 'message': 'must be unique within its mode', 'path': 'relationshipGraph.groups[0].modes[0].hueOffsets[1].variantId' },
    { 'graph': RelationshipGraphFixture.withDuplicateRelationship(), 'message': 'must be unique within its group', 'path': 'relationshipGraph.groups[0].relationships[5].id' },
    { 'graph': RelationshipGraphFixture.withAbsentDefaultMode(), 'message': 'must name a mode in its group', 'path': 'relationshipGraph.groups[0].defaultMode' },
    { 'graph': RelationshipGraphFixture.withAbsentMode(), 'message': 'must name a mode in its group', 'path': 'relationshipGraph.groups[0].relationships[1].modeId' },
    { 'graph': RelationshipGraphFixture.withAbsentVariant(), 'message': 'must name a hue variant in its selected mode', 'path': 'relationshipGraph.groups[0].relationships[1].variantId' },
    { 'graph': RelationshipGraphFixture.withAbsentAnchor(), 'message': 'must name a declared role', 'path': 'relationshipGraph.groups[0].anchor' },
    { 'graph': RelationshipGraphFixture.withAbsentSource(), 'message': 'must name a declared role', 'path': 'relationshipGraph.groups[0].relationships[0].source' },
    { 'graph': RelationshipGraphFixture.withAbsentTarget(), 'message': 'must name a declared role', 'path': 'relationshipGraph.groups[0].relationships[0].target' },
    { 'graph': RelationshipGraphFixture.withAbsentToward(), 'message': 'must name a declared role', 'path': 'relationshipGraph.groups[0].relationships[3].toward' },
    { 'graph': RelationshipGraphFixture.withAbsentBase(), 'message': 'must name a declared role', 'path': 'relationshipGraph.groups[0].relationships[4].base' },
    { 'graph': RelationshipGraphFixture.withAbsentOverlay(), 'message': 'must name a declared role', 'path': 'relationshipGraph.groups[0].relationships[4].overlay' },
    { 'graph': RelationshipGraphFixture.withAmbiguousTargetPriority(), 'message': 'must be derived by one relationship in the graph', 'path': 'relationshipGraph.groups[0].relationships[2].target' }
  ];

  for (let index = 0; index < cases.length; index += 1) {
    const scenario = cases[index];
    if (scenario !== undefined) {
      RelationshipGraphFixture.assertIntegrityError(scenario.graph, scenario.path, scenario.message);
    }
  }
});

void test('relationship graph integrity rejects a target derived in another group', () => {
  const graph = RoleRelationshipGraphEntity.create({
    'groups': [
      RelationshipGraphFixture.group(),
      {
        'anchor': 'background',
        'defaultMode': 'base',
        'id': 'background-family',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
        'name': 'Background family',
        'relationships': [{
          'id': 'second-alias',
          'operation': 'alias',
          'priority': 0,
          'relaxability': 'fixed',
          'source': 'background',
          'target': 'accent'
        }]
      }
    ]
  });

  RelationshipGraphFixture.assertIntegrityError(
    graph,
    'relationshipGraph.groups[1].relationships[0].target',
    'must be derived by one relationship in the graph'
  );
});

void test('engine rejects graph integrity errors at role-schema admission', () => {
  assert.throws(
    () => {
      new Engine().run(InputEntity.intake({
        'colors': [],
        'roles': RelationshipGraphFixture.schema(RelationshipGraphFixture.withAbsentAnchor())
      }));
    },
    {
      'message': 'Validation failed at "input.roles": input.roles invalid: relationshipGraph.groups[0].anchor: must name a declared role'
    }
  );
});

void test('hue-offset rejects degrees and modeId together at structural admission', () => {
  assert.equal(RoleRelationshipEntity.validate({
    'degrees': 30,
    'id': 'invalid',
    'modeId': 'analogous',
    'operation': 'hue-offset',
    'priority': 0,
    'relaxability': 'fixed',
    'source': 'brand',
    'target': 'accent'
  }), false);
});

void test('hue-target admits a bounded absolute hue and rejects values outside its authored domain', () => {
  const relationship = {
    'clamp': 90,
    'hue': 120,
    'id': 'semantic',
    'operation': 'hue-target',
    'priority': 0,
    'relaxability': 'fixed',
    'source': 'brand',
    'target': 'success'
  };

  assert.equal(RoleRelationshipEntity.validate(relationship), true);
  assert.equal(RoleRelationshipEntity.validate({ ...relationship, 'hue': 361 }), false);
  assert.equal(RoleRelationshipEntity.validate({ ...relationship, 'clamp': 181 }), false);
});

void test('hue-target permits an omitted source for a target-own resolved candidate', () => {
  assert.equal(RoleRelationshipEntity.validate({
    'hue': 120,
    'id': 'semantic-self',
    'operation': 'hue-target',
    'priority': 0,
    'relaxability': 'fixed',
    'target': 'success'
  }), true);
});

void test('role-schema intake observes mutations to caller-owned schemas on the next admission', () => {
  const source = {
    'name': 'mutable-schema',
    'roles': [{ 'lightnessRange': [0.2, 0.4], 'name': 'brand' }]
  };
  const first = RoleSchemaEntity.intake(source);
  const brand = source.roles[0];
  assert.notEqual(brand, undefined, 'mutable schema exposes its brand role');
  if (brand === undefined) {
    throw new Error('mutable schema is missing its brand role');
  }
  brand.lightnessRange[0] = 0.3;
  const second = RoleSchemaEntity.intake(source);

  assert.equal(first.roles[0]?.lightnessRange?.[0], 0.2);
  assert.equal(second.roles[0]?.lightnessRange?.[0], 0.3);
  assert.notStrictEqual(first, second);
});

void test('role-relationship graph intake observes caller-owned graph changes on the next admission', () => {
  const source = {
    'groups': [{
      'anchor': 'brand',
      'defaultMode': 'base',
      'id': 'family',
      'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
      'name': 'Family',
      'relationships': [{ 'id': 'accent', 'operation': 'alias', 'priority': 0, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' }]
    }]
  };
  const first = RoleRelationshipGraphEntity.intake(source);
  const family = source.groups[0];
  assert.notEqual(family, undefined, 'mutable graph exposes its relationship group');
  if (family === undefined) {
    throw new Error('mutable graph is missing its relationship group');
  }
  family.relationships.push({ 'id': 'warning', 'operation': 'alias', 'priority': 1, 'relaxability': 'fixed', 'source': 'brand', 'target': 'warning' });
  const second = RoleRelationshipGraphEntity.intake(source);

  assert.equal(first.groups[0]?.relationships.length, 1);
  assert.equal(second.groups[0]?.relationships.length, 2);
  assert.notStrictEqual(first, second);
});

void test('relationship integrity revalidates caller-owned graph changes', () => {
  const source = {
    'name': 'mutable-integrity',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'brand',
        'defaultMode': 'base',
        'id': 'family',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
        'name': 'Family',
        'relationships': [{ 'id': 'accent', 'operation': 'alias', 'priority': 0, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' }]
      }]
    },
    'roles': [{ 'name': 'accent' }, { 'name': 'brand' }, { 'name': 'warning' }]
  };
  const first = RoleSchemaEntity.intake(source);
  assert.deepEqual(RoleRelationshipGraphIntegrity.validate(first), []);
  const family = source.relationshipGraph.groups[0];
  assert.notEqual(family, undefined, 'mutable integrity graph exposes its relationship group');
  if (family === undefined) {
    throw new Error('mutable integrity graph is missing its relationship group');
  }
  family.relationships.push({ 'id': 'warning', 'operation': 'alias', 'priority': 1, 'relaxability': 'fixed', 'source': 'brand', 'target': 'accent' });
  const second = RoleSchemaEntity.intake(source);
  const errors = RoleRelationshipGraphIntegrity.validate(second);

  assert.equal(errors[0]?.path, 'relationshipGraph.groups[0].relationships[1].target');
  assert.equal(errors[0]?.message, 'must be derived by one relationship in the graph');
});

void test('relationship-resolution metadata copies entries at its write boundary', () => {
  const entry = RelationshipResolutionEntity.create({
    'disposition': 'applied',
    'groupId': 'family',
    'operation': 'alias',
    'relationshipId': 'accent',
    'sources': ['brand']
  });
  const metadata: Record<string, JSONSchema7Type> = {};
  Metadata.writeRelationshipResolution(metadata, new Map([['accent', entry]]));
  Reflect.set(entry, 'groupId', 'mutated');

  assert.equal(Metadata.relationshipResolutionForRole(metadata, 'accent')?.groupId, 'family');
});
