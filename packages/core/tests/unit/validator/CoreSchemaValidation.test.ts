/**
 * Core schema validation — registered identifiers.
 *
 * Subject: `Validator.validate` with the immutable core schemas, which
 * validate through their registered identifiers instead of re-registering the
 * schema object on every call.
 */

import type { JsonSchemaObjectType } from '@studnicky/json-tology/types';

import { JsonTology } from '@studnicky/json-tology';
import assert from 'node:assert/strict';
import {
  mock, test
} from 'node:test';

import { InputSchema } from '../../../src/model/InputSchema.ts';
import { RoleSchemaSchema } from '../../../src/model/RoleSchemaSchema.ts';
import { Validator } from '../../../src/model/Validator.ts';

const validator = new Validator();

const invalidRoleSchema = {
  'name': 7,
  'roles': [{
    'name': '',
    'unexpected': true
  }]
};

await test('a core schema validates through its registered identifier', () => {
  const validate = mock.method(JsonTology.prototype, 'validate');

  try {
    validator.validate(RoleSchemaSchema, {
      'name': 'schema',
      'roles': []
    });
    validator.validate(InputSchema, { 'colors': [] });
    const firstArguments = validate.mock.calls.map((call) => {
      return call.arguments[0];
    });

    assert.deepEqual(firstArguments, [
      RoleSchemaSchema.$id,
      InputSchema.$id
    ]);
  } finally {
    validate.mock.restore();
  }
});

await test('an ad-hoc schema still validates through the object path', () => {
  const adHoc: JsonSchemaObjectType = {
    'properties': { 'value': { 'type': 'number' } },
    'type': 'object'
  };
  const validate = mock.method(JsonTology.prototype, 'validate');

  try {
    validator.validate(adHoc, { 'value': 'not a number' });
    const [firstArgument] = validate.mock.calls.map((call) => {
      return call.arguments[0];
    });

    assert.equal(typeof firstArgument, 'object');
  } finally {
    validate.mock.restore();
  }
});

await test('identifier-based and object-based validation report identical errors', () => {
  const byIdentifier = validator.validate(RoleSchemaSchema, invalidRoleSchema);
  const byObject = validator.validate(structuredClone(RoleSchemaSchema), invalidRoleSchema);

  assert.ok(byIdentifier.errors.length > 0);
  assert.deepEqual(byIdentifier.errors, byObject.errors);
});

await test('identifier-based validation accepts a valid role schema', () => {
  const result = validator.validate(RoleSchemaSchema, {
    'name': 'schema',
    'roles': []
  });

  assert.deepEqual(result.errors, []);
});
