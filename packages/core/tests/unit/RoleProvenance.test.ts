import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EngineMetadataEntity } from '../../src/entities/EngineMetadataEntity.ts';
import { RoleProvenanceEntity } from '../../src/entities/RoleProvenanceEntity.ts';

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

  assert.strictEqual(RoleProvenanceEntity.validate(stated), true);
  assert.strictEqual(RoleProvenanceEntity.validate(derived), true);
  assert.strictEqual(EngineMetadataEntity.validate({
    'core:roleProvenance': {
      'type': stated
    }
  }), true);
});

await test('engine metadata accepts canonical provenance and rejects retired resolution metadata', () => {
  assert.strictEqual(EngineMetadataEntity.validate({
    'core:roleProvenance': {
      'type': {
        'adjustments': [],
        'origin': 'stated'
      }
    }
  }), true);
  assert.strictEqual(EngineMetadataEntity.validate({ 'core:roleClamps': {} }), false);
  assert.strictEqual(EngineMetadataEntity.validate({ 'core:rolesDerived': [] }), false);
  assert.strictEqual(EngineMetadataEntity.validate({ 'core:rolesPinned': [] }), false);
  assert.strictEqual(EngineMetadataEntity.validate({ 'core:rolesSynthesized': [] }), false);
});

await test('role provenance rejects unknown origins and unsupported stated transformations', () => {
  assert.strictEqual(RoleProvenanceEntity.validate({
    'adjustments': [],
    'origin': 'pinned'
  }), false);
  assert.strictEqual(RoleProvenanceEntity.validate({
    'adjustments': [{
      'afterHex':  '#afa073',
      'beforeHex': '#a898c3',
      'operation': 'hue-target'
    }],
    'origin': 'stated'
  }), false);
  assert.strictEqual(RoleProvenanceEntity.validate({
    'adjustments': [{
      'afterHex': '#b2a478',
      'operation': 'contrast'
    }],
    'origin': 'derived'
  }), false);
});
