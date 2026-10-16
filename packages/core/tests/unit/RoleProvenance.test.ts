import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EngineMetadataInterfaceTypeEntity } from '../../src/entities/EngineMetadataInterfaceTypeEntity.ts';
import { RoleProvenanceInterfaceTypeEntity } from '../../src/entities/RoleProvenanceInterfaceTypeEntity.ts';

await test('role provenance preserves stated roles and records derived adjustments', () => {
  const stated = {
    'adjustments': [],
    'origin': 'stated'
  };
  const derived = {
    'adjustments': [{
      'afterHex':  '#b2a478',
      'beforeHex': '#afa073',
      'operation': 'contrast'
    }],
    'origin': 'derived'
  };

  assert.strictEqual(RoleProvenanceInterfaceTypeEntity.validate(stated), true);
  assert.strictEqual(RoleProvenanceInterfaceTypeEntity.validate(derived), true);
  assert.strictEqual(EngineMetadataInterfaceTypeEntity.validate({
    'core:roleProvenance': {
      'type': stated
    }
  }), true);
});

await test('engine metadata accepts canonical provenance and rejects retired resolution metadata', () => {
  assert.strictEqual(EngineMetadataInterfaceTypeEntity.validate({
    'core:roleProvenance': {
      'type': {
        'adjustments': [],
        'origin': 'stated'
      }
    }
  }), true);
  assert.strictEqual(EngineMetadataInterfaceTypeEntity.validate({ 'core:roleClamps': {} }), false);
  assert.strictEqual(EngineMetadataInterfaceTypeEntity.validate({ 'core:rolesDerived': [] }), false);
  assert.strictEqual(EngineMetadataInterfaceTypeEntity.validate({ 'core:rolesPinned': [] }), false);
  assert.strictEqual(EngineMetadataInterfaceTypeEntity.validate({ 'core:rolesSynthesized': [] }), false);
});

await test('role provenance rejects unknown origins and unsupported stated transformations', () => {
  assert.strictEqual(RoleProvenanceInterfaceTypeEntity.validate({
    'adjustments': [],
    'origin': 'pinned'
  }), false);
  assert.strictEqual(RoleProvenanceInterfaceTypeEntity.validate({
    'adjustments': [{
      'afterHex':  '#afa073',
      'beforeHex': '#a898c3',
      'operation': 'hue-target'
    }],
    'origin': 'stated'
  }), false);
  assert.strictEqual(RoleProvenanceInterfaceTypeEntity.validate({
    'adjustments': [{
      'afterHex': '#b2a478',
      'operation': 'contrast'
    }],
    'origin': 'derived'
  }), false);
});
