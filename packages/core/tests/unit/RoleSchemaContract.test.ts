import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Engine } from '../../src/engine/Engine.ts';
import { ContrastPairInterfaceTypeEntity } from '../../src/entities/ContrastPairInterfaceTypeEntity.ts';
import { ContrastReportEntryInterfaceTypeEntity } from '../../src/entities/ContrastReportEntryInterfaceTypeEntity.ts';
import { PendingContrastEntryInterfaceTypeEntity } from '../../src/entities/PendingContrastEntryInterfaceTypeEntity.ts';
import { RoleDefinitionInterfaceTypeEntity } from '../../src/entities/RoleDefinitionInterfaceTypeEntity.ts';
import { RoleSchemaSchema } from '../../src/model/RoleSchemaSchema.ts';
import { Validator } from '../../src/model/Validator.ts';

await test('role derivation controls validate their declared domains', () => {
  assert.strictEqual(RoleDefinitionInterfaceTypeEntity.validate({
    'chromaScale': 0,
    'lightnessOffset': -1,
    'name': 'surface'
  }), true);
  assert.strictEqual(RoleDefinitionInterfaceTypeEntity.validate({
    'chromaScale': -0.01,
    'name': 'surface'
  }), false);
  assert.strictEqual(RoleDefinitionInterfaceTypeEntity.validate({
    'lightnessOffset': 1.01,
    'name': 'surface'
  }), false);
});

await test('contrast-pair bands require bounded ratios and a non-inverted range', () => {
  assert.strictEqual(ContrastPairInterfaceTypeEntity.validate({
    'background': 'background',
    'foreground': 'accent',
    'maxRatio': 4.5,
    'minRatio': 3
  }), true);
  assert.strictEqual(ContrastPairInterfaceTypeEntity.validate({
    'background': 'background',
    'foreground': 'accent',
    'maxRatio': 2.99,
    'minRatio': 3
  }), false);
  assert.strictEqual(ContrastPairInterfaceTypeEntity.validate({
    'background': 'background',
    'foreground': 'accent',
    'maxRatio': 21.01,
    'minRatio': 3
  }), false);
});

await test('role schemas expose derivation controls and contrast bands at the input boundary', () => {
  const validator = new Validator();
  const valid = validator.validate(RoleSchemaSchema, {
    'contrastPairs': [{
      'background': 'background',
      'foreground': 'accent',
      'maxRatio': 4.5,
      'minRatio': 3
    }],
    'name': 'contract',
    'roles': [{
      'chromaScale': 1.25,
      'lightnessOffset': -0.12,
      'name': 'accent'
    }]
  });
  const invalid = validator.validate(RoleSchemaSchema, {
    'name': 'contract',
    'roles': [{
      'chromaScale': -0.01,
      'name': 'accent'
    }]
  });

  assert.strictEqual(valid.valid, true);
  assert.strictEqual(invalid.valid, false);
});

await test('contrast reports and pending entries carry optional maximum-ratio data', () => {
  assert.strictEqual(ContrastReportEntryInterfaceTypeEntity.validate({
    'adjusted': false,
    'adjustmentDisposition': 'not-needed',
    'algorithm': 'wcag21',
    'background': 'background',
    'foreground': 'accent',
    'maxRatio': 4.5,
    'minRatio': 3,
    'passed': true,
    'ratio': 3.5
  }), true);
  assert.strictEqual(PendingContrastEntryInterfaceTypeEntity.validate({
    'adjusted': false,
    'adjustmentDisposition': 'not-needed',
    'algo': 'wcag21',
    'maxRatio': 4.5,
    'minRatio': 3,
    'pair': {
      'background': 'background',
      'foreground': 'accent',
      'maxRatio': 4.5,
      'minRatio': 3
    }
  }), true);
});

await test('Engine rejects a contrast band whose maximum is below its minimum', () => {
  assert.throws(
    () => {
      new Engine().run({
        'bypass':    undefined,
        'colors':    [],
        'contrast':  undefined,
        'emit':      undefined,
        'maxColors': undefined,
        'metadata':  undefined,
        'roles': {
          'contrastPairs': [{
            'algorithm': undefined,
            'background': 'background',
            'foreground': 'accent',
            'maxRatio': 3,
            'minRatio': 4.5
          }],
          'description': undefined,
          'name': 'contract',
          'roles': []
        },
        'runtime': undefined
      });
    },
    /input\.roles invalid: contrastPairs\[0\]\.maxRatio: must be greater than or equal to minRatio/
  );
});
