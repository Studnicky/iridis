import type { JSONSchema7Type } from 'json-schema';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ColorRecordEntity } from '../../src/entities/ColorRecordEntity.ts';
import { RelationshipResolutionEntity } from '../../src/entities/RelationshipResolutionEntity.ts';
import { RoleRelationshipGraphEntity } from '../../src/entities/RoleRelationshipGraphEntity.ts';
import { RoleSchemaEntity } from '../../src/entities/RoleSchemaEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
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
