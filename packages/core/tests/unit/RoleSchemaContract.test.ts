import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Engine } from '../../src/engine/Engine.ts';
import { ContrastPairEntity } from '../../src/entities/ContrastPairEntity.ts';
import { ContrastReportEntryEntity } from '../../src/entities/ContrastReportEntryEntity.ts';
import { InputEntity } from '../../src/entities/InputEntity.ts';
import { PendingContrastEntryEntity } from '../../src/entities/PendingContrastEntryEntity.ts';
import { RoleDefinitionEntity } from '../../src/entities/RoleDefinitionEntity.ts';
import { RoleSchemaEntity } from '../../src/entities/RoleSchemaEntity.ts';
import { RoleSchemaSchema } from '../../src/model/RoleSchemaSchema.ts';
import { Validator } from '../../src/model/Validator.ts';

await test('role definitions reject retired derivation controls', () => {
  assert.strictEqual(RoleDefinitionEntity.validate({
    'derivedFrom': 'surface',
    'name': 'accent'
  }), false);
  assert.strictEqual(RoleDefinitionEntity.validate({
    'hueOffset': 30,
    'name': 'accent'
  }), false);
  assert.strictEqual(RoleDefinitionEntity.validate({
    'lightnessOffset': 0.1,
    'name': 'accent'
  }), false);
});

await test('contrast-pair bands require bounded ratios and a non-inverted range', () => {
  assert.strictEqual(ContrastPairEntity.validate({
    'background': 'background',
    'foreground': 'accent',
    'maximumContrastRatio': 4.5,
    'minimumContrastRatio': 3
  }), true);
  assert.strictEqual(ContrastPairEntity.validate({
    'background': 'background',
    'foreground': 'accent',
    'maximumContrastRatio': 2.99,
    'minimumContrastRatio': 3
  }), false);
  assert.strictEqual(ContrastPairEntity.validate({
    'algorithm': 'wcag21',
    'background': 'background',
    'foreground': 'accent',
    'maximumContrastRatio': 21.01,
    'minimumContrastRatio': 3
  }), false);
});

await test('contrast-pair admission uses WCAG and APCA ratio domains', () => {
  assert.strictEqual(ContrastPairEntity.validate({
    'algorithm': 'apca',
    'background': 'background',
    'foreground': 'bodyText',
    'minimumContrastRatio': 75
  }), true);
  assert.strictEqual(ContrastPairEntity.validate({
    'algorithm': 'apca',
    'background': 'background',
    'foreground': 'bodyText',
    'maximumContrastRatio': 108,
    'minimumContrastRatio': 0
  }), true);
  assert.strictEqual(ContrastPairEntity.validate({
    'algorithm': 'apca',
    'background': 'background',
    'foreground': 'bodyText',
    'minimumContrastRatio': 108.01
  }), false);
  assert.strictEqual(ContrastPairEntity.validate({
    'algorithm': 'wcag21',
    'background': 'background',
    'foreground': 'bodyText',
    'minimumContrastRatio': 0
  }), false);
});

await test('role schemas admit graph relationships and reject retired derivation controls', () => {
  const validator = new Validator();
  const valid = validator.validate(RoleSchemaSchema, {
    'contrastPairs': [{
      'background': 'background',
      'foreground': 'accent',
      'maximumContrastRatio': 4.5,
      'minimumContrastRatio': 3
    }],
    'name': 'contract',
    'relationshipGraph': { 'groups': [] },
    'roles': [{ 'name': 'accent' }]
  });
  const invalid = validator.validate(RoleSchemaSchema, {
    'name': 'contract',
    'roles': [{
      'chromaScale': -0.01,
      'name': 'accent'
    }]
  });

  assert.deepStrictEqual(valid.errors, []);
  assert.ok(invalid.errors.length > 0);
});

await test('contrast reports and pending entries carry optional maximum-ratio data', () => {
  assert.strictEqual(ContrastReportEntryEntity.validate({
    'actual': 3.5,
    'adjustedRoles': [],
    'background': 'background',
    'constraints': [],
    'foreground': 'accent',
    'passed': true,
    'required': 3,
    'shortfall': 0
  }), true);
  assert.strictEqual(PendingContrastEntryEntity.validate({
    'adjusted': false,
    'adjustmentDisposition': 'not-needed',
    'algo': 'wcag21',
    'constraints': [],
    'maximumContrastRatio': 4.5,
    'minimumContrastRatio': 3,
    'pair': {
      'background': 'background',
      'foreground': 'accent',
      'maximumContrastRatio': 4.5,
      'minimumContrastRatio': 3
    },
    'target': 'AA'
  }), true);
});

await test('APCA reports and pending entries retain APCA Lc targets', () => {
  assert.strictEqual(ContrastReportEntryEntity.validate({
    'actual': 82,
    'adjustedRoles': [],
    'background': 'background',
    'constraints': [],
    'foreground': 'bodyText',
    'passed': true,
    'required': 75,
    'shortfall': 0
  }), true);
  assert.strictEqual(PendingContrastEntryEntity.validate({
    'adjusted': false,
    'adjustmentDisposition': 'not-needed',
    'algo': 'apca',
    'constraints': [],
    'minimumContrastRatio': 60,
    'pair': {
      'algorithm': 'apca',
      'background': 'background',
      'foreground': 'headline',
      'minimumContrastRatio': 60
    },
    'target': 'APCA-Lc-60'
  }), true);
});

await test('Engine resolves omitted contrast-pair algorithms from the run default', () => {
  const apcaInput = InputEntity.intake({
    'colors': [],
    'contrast': {
      'algorithm': 'apca',
      'extra': [{
        'background': 'background',
        'foreground': 'uiControl',
        'minimumContrastRatio': 45
      }]
    },
    'roles': {
      'contrastPairs': [{
        'background': 'background',
        'foreground': 'bodyText',
        'minimumContrastRatio': 75
      }],
      'name': 'apca-contract',
      'roles': []
    }
  });

  assert.doesNotThrow(() => { new Engine().run(apcaInput); });
  assert.throws(
    () => {
      new Engine().run(InputEntity.intake({
        'colors': [],
        'roles': {
          'contrastPairs': [{
            'background': 'background',
            'foreground': 'bodyText',
            'minimumContrastRatio': 75
          }],
          'name': 'wcag-contract',
          'roles': []
        }
      }));
    },
    { 'message': 'Validation failed at "input.roles": input.roles invalid: contrastPairs[0].minimumContrastRatio: must be between 1 and 21 for the effective contrast algorithm' }
  );
  assert.throws(
    () => {
      new Engine().run(InputEntity.intake({
        'colors': [],
        'contrast': {
          'extra': [{
            'background': 'background',
            'foreground': 'bodyText',
            'minimumContrastRatio': 75
          }]
        }
      }));
    },
    { 'message': 'Validation failed at "input.contrast": input.contrast invalid: extra[0].minimumContrastRatio: must be between 1 and 21 for the effective contrast algorithm' }
  );
});

await test('Engine rejects a contrast band whose maximum is below its minimum', () => {
  assert.throws(
    () => {
      new Engine().run(InputEntity.intake({
        'colors': [],
        'roles': RoleSchemaEntity.intake({
          'contrastPairs': [
            ContrastPairEntity.intake({
              'background': 'background',
              'foreground': 'accent',
              'maximumContrastRatio': 3,
              'minimumContrastRatio': 4.5
            })
          ],
          'name': 'contract',
          'roles': []
        })
      }));
    },
    { 'message': 'Validation failed at "input.roles": input.roles invalid: contrastPairs[0].maximumContrastRatio: must be greater than or equal to minimumContrastRatio' }
  );
});
