/**
 * Validator — scenario-matrix suite.
 *
 * Subject: `Validator` (JSON Schema walker) and `InputSchema` boundary.
 * Also covers Engine.run / Engine.adopt validation at the public API boundary.
 *
 * Cells:
 *   1. type-check      — primitive type detection and mismatch errors
 *   2. object-rules    — required, properties, additionalProperties
 *   3. array-rules     — items schema, minItems, maxItems
 *   4. number-rules    — minimum, maximum
 *   5. string-rules    — pattern, enum
 *   6. input-schema    — InputSchema validates the Engine.run input shape
 *   7. engine-boundary — Engine.run and Engine.adopt validation at the boundary
 */

import type { SchemaInterfaceType, TaskInterface } from '@studnicky/iridis/model';
import type { JsonValueType }                      from '@studnicky/types';

import { Engine }                            from '@studnicky/iridis/engine';
import { InputSchema, Validator } from '@studnicky/iridis/model';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

const validator = new Validator();

// ---------------------------------------------------------------------------
// Cell 1 — type checking
//
// walkValue must:
//   - pass when the value type matches the schema type
//   - emit an error when the type mismatches
//   - handle null as 'null' (not 'object')
//   - handle arrays as 'array' (not 'object')
//   - handle integers: 'integer' accepts whole numbers but not floats
//   - accept missing type (no constraint)
// ---------------------------------------------------------------------------

interface Cell1InputInterface {
  readonly 'schema': SchemaInterfaceType;
  readonly 'value':  JsonValueType;
}

const cell1Scenarios: readonly ScenarioInterface<Cell1InputInterface, {
  readonly 'errorCount': number;
  readonly 'firstMsg':   string;
  readonly 'valid':      boolean;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=type-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=type-match] valid');
      assert.strictEqual(output!.errorCount, 0, '[cell=1, scenario=type-match] no errors');
    },
    'input': { 'schema': { 'type': 'string' }, 'value': 'hello' },
    'kind': 'happy',
    'name': 'value type matches schema type → valid'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=number-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=number-match] valid');
    },
    'input': { 'schema': { 'type': 'number' }, 'value': 42 },
    'kind': 'happy',
    'name': 'number type matches number value'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=bool-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=bool-match] valid');
    },
    'input': { 'schema': { 'type': 'boolean' }, 'value': false },
    'kind': 'happy',
    'name': 'boolean type matches boolean value'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=no-type] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=no-type] no type constraint → valid');
    },
    'input': { 'schema': {}, 'value': 'anything' },
    'kind': 'happy',
    'name': 'missing type schema: any value accepted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=integer-whole] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=integer-whole] integer valid');
    },
    'input': { 'schema': { 'type': 'integer' }, 'value': 5 },
    'kind': 'happy',
    'name': 'integer type: whole number is valid'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=type-mismatch] must not throw the validator');
      assert.strictEqual(output!.valid, false, '[cell=1, scenario=type-mismatch] invalid');
      assert.match(output!.firstMsg, /expected object, got string/, '[cell=1, scenario=type-mismatch] message shape');
    },
    'input': { 'schema': { 'type': 'object' }, 'value': 'not-an-object' },
    'kind': 'unhappy',
    'name': 'type mismatch: string value given object schema'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=null-not-object] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=1, scenario=null-not-object] null rejected as object');
      assert.match(output!.firstMsg, /expected object, got null/, '[cell=1, scenario=null-not-object] message names null');
    },
    'input': { 'schema': { 'type': 'object' }, 'value': null },
    'kind': 'edge',
    'name': 'null is not an object'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=array-not-object] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=1, scenario=array-not-object] array rejected as object');
    },
    'input': { 'schema': { 'type': 'object' }, 'value': [] },
    'kind': 'edge',
    'name': 'array is not an object'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=integer-float] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=1, scenario=integer-float] float rejected as integer');
    },
    'input': { 'schema': { 'type': 'integer' }, 'value': 3.14 },
    'kind': 'edge',
    'name': 'integer type: float is rejected'
  }
];

new ScenarioRunner<Cell1InputInterface, {
  readonly 'errorCount': number;
  readonly 'firstMsg':   string;
  readonly 'valid':      boolean;
}>(
  'Validator :: cell-1 :: type-check',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return {
      'errorCount': result.errors.length,
      'firstMsg':   result.errors.at(0)?.message ?? '',
      'valid':      result.valid
    };
  }
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — object rules (required, properties, additionalProperties)
//
// walkValue object branch must:
//   - accept an exact-match object (required + properties)
//   - reject when a required property is missing (error path = property name)
//   - reject nested property type mismatch (error path = dot-notation)
//   - reject additional property when additionalProperties: false
//   - accept empty object when no required properties
// ---------------------------------------------------------------------------

interface Cell2InputInterface {
  readonly 'schema': SchemaInterfaceType;
  readonly 'value':  JsonValueType;
}
type Cell2Output = {
  readonly 'errorMsgs':   string[];
  readonly 'errorPaths':  string[];
  readonly 'valid':       boolean;
};

const cell2Scenarios: readonly ScenarioInterface<Cell2InputInterface, Cell2Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=exact-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=2, scenario=exact-match] valid');
    },
    'input': {
      'schema': {
        'properties': { 'age': { 'type': 'number' }, 'name': { 'type': 'string' } }, 'required': ['name'],
        'type': 'object'
      },
      'value': { 'age': 30, 'name': 'Alice' }
    },
    'kind': 'happy',
    'name': 'accepts exact schema-correct object'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty-ok] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=2, scenario=empty-ok] empty object accepted');
    },
    'input': {
      'schema': { 'properties': { 'name': { 'type': 'string' } }, 'type': 'object' },
      'value': {}
    },
    'kind': 'happy',
    'name': 'accepts empty object when no required properties'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=missing-required] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=2, scenario=missing-required] invalid');
      assert.ok(output!.errorPaths.includes('name'), '[cell=2, scenario=missing-required] path is "name"');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('required property "name" is missing'); return result; }),
        '[cell=2, scenario=missing-required] message names property'
      );
    },
    'input': {
      'schema': {
        'properties': { 'name': { 'type': 'string' } }, 'required': ['name'],
        'type': 'object'
      },
      'value': {}
    },
    'kind': 'unhappy',
    'name': 'rejects missing required property with path in error'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=nested-type] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=2, scenario=nested-type] invalid');
      assert.ok(output!.errorPaths.includes('color.hex'), '[cell=2, scenario=nested-type] path is "color.hex"');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('expected string, got number'); return result; }),
        '[cell=2, scenario=nested-type] message shape'
      );
    },
    'input': {
      'schema': {
        'properties': {
          'color': { 'properties': { 'hex': { 'type': 'string' } }, 'type': 'object' }
        },
        'type': 'object'
      },
      'value': { 'color': { 'hex': 42 } }
    },
    'kind': 'unhappy',
    'name': 'rejects nested type mismatch with dot-path'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=additional-prop] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=2, scenario=additional-prop] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('additional property "extra" is not allowed'); return result; }),
        '[cell=2, scenario=additional-prop] message names property'
      );
    },
    'input': {
      'schema': {
        'additionalProperties': false,
        'properties': { 'name': { 'type': 'string' } },
        'type': 'object'
      },
      'value': { 'extra': 'boom', 'name': 'Alice' }
    },
    'kind': 'unhappy',
    'name': 'rejects additional property when additionalProperties: false'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=deep-missing] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=2, scenario=deep-missing] invalid');
      assert.ok(
        output!.errorPaths.some((p) => { const result = p.includes('b'); return result; }),
        '[cell=2, scenario=deep-missing] path contains b'
      );
    },
    'input': {
      'schema': {
        'properties': {
          'a': {
            'properties': { 'b': { 'type': 'string' } },
            'required': ['b'],
            'type': 'object'
          }
        },
        'type': 'object'
      },
      'value': { 'a': {} }
    },
    'kind': 'edge',
    'name': 'deeply nested required missing: error path includes full dot chain'
  }
];

new ScenarioRunner<Cell2InputInterface, Cell2Output>(
  'Validator :: cell-2 :: object-rules',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return {
      'errorMsgs':  result.errors.map((e) => { const result = e.message; return result; }),
      'errorPaths': result.errors.map((e) => { const result = e.path; return result; }),
      'valid':      result.valid
    };
  }
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — array rules (items, minItems, maxItems)
//
// walkValue array branch must:
//   - accept valid array matching items schema
//   - reject item type mismatch at indexed path [N]
//   - reject array shorter than minItems
//   - reject array longer than maxItems
//   - accept empty array when no minItems constraint
// ---------------------------------------------------------------------------

interface Cell3InputInterface {
  readonly 'schema': SchemaInterfaceType;
  readonly 'value':  JsonValueType;
}
type Cell3Output = {
  readonly 'errorMsgs': string[];
  readonly 'errorPaths': string[];
  readonly 'valid':     boolean;
};

const cell3Scenarios: readonly ScenarioInterface<Cell3InputInterface, Cell3Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=array-valid] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=3, scenario=array-valid] valid');
    },
    'input': { 'schema': { 'items': { 'type': 'string' }, 'type': 'array' }, 'value': ['a', 'b', 'c'] },
    'kind': 'happy',
    'name': 'accepts valid array matching items schema'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=item-mismatch] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=3, scenario=item-mismatch] invalid');
      assert.ok(output!.errorPaths.includes('[1]'), '[cell=3, scenario=item-mismatch] path is [1]');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('expected string, got number'); return result; }),
        '[cell=3, scenario=item-mismatch] message shape'
      );
    },
    'input': { 'schema': { 'items': { 'type': 'string' }, 'type': 'array' }, 'value': ['a', 42, 'c'] },
    'kind': 'unhappy',
    'name': 'rejects item type mismatch with indexed path [1]'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=min-items] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=3, scenario=min-items] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('less than minItems 2'); return result; }),
        '[cell=3, scenario=min-items] message names constraint'
      );
    },
    'input': { 'schema': { 'minItems': 2, 'type': 'array' }, 'value': ['only-one'] },
    'kind': 'unhappy',
    'name': 'rejects array shorter than minItems'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=max-items] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=3, scenario=max-items] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('greater than maxItems 2'); return result; }),
        '[cell=3, scenario=max-items] message names constraint'
      );
    },
    'input': { 'schema': { 'maxItems': 2, 'type': 'array' }, 'value': [1, 2, 3] },
    'kind': 'unhappy',
    'name': 'rejects array longer than maxItems'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=empty-array] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=3, scenario=empty-array] empty array accepted');
    },
    'input': { 'schema': { 'items': { 'type': 'string' }, 'type': 'array' }, 'value': [] },
    'kind': 'edge',
    'name': 'accepts empty array when no minItems constraint'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=exact-one] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=3, scenario=exact-one] exactly one element valid');
    },
    'input': { 'schema': { 'maxItems': 1, 'minItems': 1, 'type': 'array' }, 'value': ['x'] },
    'kind': 'edge',
    'name': 'exactly minItems = maxItems = 1: one element is valid'
  }
];

new ScenarioRunner<Cell3InputInterface, Cell3Output>(
  'Validator :: cell-3 :: array-rules',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return {
      'errorMsgs':   result.errors.map((e) => { const result = e.message; return result; }),
      'errorPaths':  result.errors.map((e) => { const result = e.path; return result; }),
      'valid':       result.valid
    };
  }
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Cell 4 — number rules (minimum, maximum)
// ---------------------------------------------------------------------------

interface Cell4InputInterface {
  readonly 'schema': SchemaInterfaceType;
  readonly 'value':  JsonValueType;
}
type Cell4Output = {
  readonly 'errorMsgs': string[];
  readonly 'valid':     boolean;
};

const cell4Scenarios: readonly ScenarioInterface<Cell4InputInterface, Cell4Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=at-min] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=4, scenario=at-min] at minimum is valid');
    },
    'input': { 'schema': { 'minimum': 0, 'type': 'number' }, 'value': 0 },
    'kind': 'happy',
    'name': 'number at exact minimum is valid'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=at-max] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=4, scenario=at-max] at maximum is valid');
    },
    'input': { 'schema': { 'maximum': 1, 'type': 'number' }, 'value': 1 },
    'kind': 'happy',
    'name': 'number at exact maximum is valid'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=below-min] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=4, scenario=below-min] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('less than minimum 0'); return result; }),
        '[cell=4, scenario=below-min] message names minimum'
      );
    },
    'input': { 'schema': { 'minimum': 0, 'type': 'number' }, 'value': -1 },
    'kind': 'unhappy',
    'name': 'rejects number below minimum'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=above-max] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=4, scenario=above-max] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('greater than maximum 1'); return result; }),
        '[cell=4, scenario=above-max] message names maximum'
      );
    },
    'input': { 'schema': { 'maximum': 1, 'type': 'number' }, 'value': 2 },
    'kind': 'unhappy',
    'name': 'rejects number above maximum'
  }
];

new ScenarioRunner<Cell4InputInterface, Cell4Output>(
  'Validator :: cell-4 :: number-rules',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return { 'errorMsgs': result.errors.map((e) => { const result = e.message; return result; }), 'valid': result.valid };
  }
).run(cell4Scenarios);

// ---------------------------------------------------------------------------
// Cell 5 — string rules (pattern, enum)
// ---------------------------------------------------------------------------

interface Cell5InputInterface {
  readonly 'schema': SchemaInterfaceType;
  readonly 'value':  JsonValueType;
}
type Cell5Output = {
  readonly 'errorMsgs': string[];
  readonly 'valid':     boolean;
};

const cell5Scenarios: readonly ScenarioInterface<Cell5InputInterface, Cell5Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=pattern-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=5, scenario=pattern-match] valid');
    },
    'input': { 'schema': { 'pattern': '^#[0-9a-fA-F]{6}$', 'type': 'string' }, 'value': '#ff0000' },
    'kind': 'happy',
    'name': 'accepts string matching pattern'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=enum-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=5, scenario=enum-match] valid');
    },
    'input': { 'schema': { 'enum': ['red', 'green', 'blue'], 'type': 'string' }, 'value': 'green' },
    'kind': 'happy',
    'name': 'accepts value in enum'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=pattern-fail] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=5, scenario=pattern-fail] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('does not match pattern'); return result; }),
        '[cell=5, scenario=pattern-fail] message shape'
      );
    },
    'input': { 'schema': { 'pattern': '^#[0-9a-fA-F]{6}$', 'type': 'string' }, 'value': 'not-a-hex' },
    'kind': 'unhappy',
    'name': 'rejects string not matching pattern'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=enum-fail] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=5, scenario=enum-fail] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('expected one of [red, green, blue]'); return result; }),
        '[cell=5, scenario=enum-fail] message lists options'
      );
    },
    'input': { 'schema': { 'enum': ['red', 'green', 'blue'], 'type': 'string' }, 'value': 'purple' },
    'kind': 'unhappy',
    'name': 'rejects value not in enum'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=enum-empty-str] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=5, scenario=enum-empty-str] empty string member accepted');
    },
    'input': { 'schema': { 'enum': ['', 'a'], 'type': 'string' }, 'value': '' },
    'kind': 'edge',
    'name': 'enum with empty string as member: empty string is accepted'
  }
];

new ScenarioRunner<Cell5InputInterface, Cell5Output>(
  'Validator :: cell-5 :: string-rules',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return { 'errorMsgs': result.errors.map((e) => { const result = e.message; return result; }), 'valid': result.valid };
  }
).run(cell5Scenarios);

void test('Validator :: cell-5 :: local-reference diagnostics resolve every formatted constraint', () => {
  const schema: SchemaInterfaceType = {
    '$defs': {
      'allowed':         { 'enum': ['red', 'green'], 'type': 'string' },
      'maximum':         { 'maximum': 20, 'type': 'number' },
      'maximumItems':    { 'maxItems': 2, 'type': 'array' },
      'minimum/value~':  { 'minimum': 10, 'type': 'number' },
      'minimumItems':    { 'minItems': 2, 'type': 'array' },
      'pattern':         { 'pattern': '^ok-[0-9]+$', 'type': 'string' }
    },
    '$id': 'urn:iridis:test:local-reference-diagnostics',
    'properties': {
      'allowed':        { '$ref': '#/$defs/allowed' },
      'maximum':        { '$ref': '#/$defs/maximum' },
      'maximumItems':   { '$ref': '#/$defs/maximumItems' },
      'minimumItems':   { '$ref': '#/$defs/minimumItems' },
      'pattern':        { '$ref': '#/$defs/pattern' },
      'score':          { '$ref': '#/$defs/minimum~1value~0' }
    },
    'type': 'object'
  };
  const result = validator.validate(schema, {
    'allowed':      'blue',
    'maximum':      21,
    'maximumItems': [1, 2, 3],
    'minimumItems': [],
    'pattern':      'wrong',
    'score':        5
  });
  const messages = new Map(result.errors.map((error) => {
    return [error.path, error.message];
  }));

  assert.strictEqual(result.valid, false, 'referenced constraints reject invalid values');
  assert.strictEqual(messages.get('allowed'), 'expected one of [red, green], got blue');
  assert.strictEqual(messages.get('maximum'), '21 is greater than maximum 20');
  assert.strictEqual(messages.get('maximumItems'), 'array length 3 is greater than maxItems 2');
  assert.strictEqual(messages.get('minimumItems'), 'array length 0 is less than minItems 2');
  assert.strictEqual(messages.get('pattern'), 'value "wrong" does not match pattern ^ok-[0-9]+$');
  assert.strictEqual(messages.get('score'), '5 is less than minimum 10');
});

void test('Validator :: cell-5 :: numeric object keys remain properties while array indices use brackets', () => {
  const schema: SchemaInterfaceType = {
    '$defs': {
      'array/maximum~': { 'maximum': 3, 'type': 'number' },
      'minimum/value~': { 'minimum': 10, 'type': 'number' }
    },
    '$id': 'urn:iridis:test:numeric-property-diagnostics',
    'properties': {
      '0':      { '$ref': '#/$defs/minimum~1value~0' },
      'nested': {
        'properties': {
          '1': { 'maximum': 20, 'type': 'number' },
          '2': { 'enum': ['ok', 'ready'], 'type': 'string' },
          '3': { 'pattern': '^ok-[0-9]+$', 'type': 'string' }
        },
        'type': 'object'
      },
      'values': {
        'items': { '$ref': '#/$defs/array~1maximum~0' },
        'type': 'array'
      }
    },
    'type': 'object'
  };
  const result = validator.validate(schema, {
    '0':      5,
    'nested': { '1': 21, '2': 'wrong', '3': 'wrong' },
    'values': [4]
  });
  const messages = new Map(result.errors.map((error) => {
    return [error.path, error.message];
  }));

  assert.strictEqual(result.valid, false, 'numeric properties and array items reject invalid values');
  assert.strictEqual(messages.get('0'), '5 is less than minimum 10');
  assert.strictEqual(messages.get('nested.1'), '21 is greater than maximum 20');
  assert.strictEqual(messages.get('nested.2'), 'expected one of [ok, ready], got wrong');
  assert.strictEqual(messages.get('nested.3'), 'value "wrong" does not match pattern ^ok-[0-9]+$');
  assert.strictEqual(messages.get('values[0]'), '4 is greater than maximum 3');
});

void test('Validator :: cell-5 :: core identifier reference preserves constraint diagnostics', () => {
  const schema: SchemaInterfaceType = {
    '$id':  'urn:iridis:test:core-reference-diagnostics',
    '$ref': 'https://studnicky.dev/iridis/ColorRecord'
  };
  const result = validator.validate(schema, {
    'alpha': -0.5,
    'hex': '#123456',
    'oklch': { 'c': 0.1, 'h': 30, 'l': 0.5 },
    'rgb': { 'b': 0.3, 'g': 0.2, 'r': 0.1 },
    'sourceFormat': 'hex'
  });

  assert.strictEqual(result.valid, false, 'core reference rejects invalid alpha');
  assert.ok(
    result.errors.some((error) => {
      return error.path === 'alpha' && error.message === '-0.5 is less than minimum 0';
    }),
    'core reference diagnostic reports the ColorRecord alpha constraint'
  );
});

void test('Validator :: cell-5 :: missing local reference fails compilation and validation', () => {
  const schema: SchemaInterfaceType = {
    '$id': 'urn:iridis:test:missing-local-reference',
    'properties': { 'score': { '$ref': '#/$defs/missing' } },
    'type': 'object'
  };

  assert.strictEqual(validator.tryCompile(schema), false, 'missing local reference is not compilable');
  assert.throws(
    () => { const result = validator.validate(schema, { 'score': 5 }); return result; },
    Error,
    'missing local reference cannot be validated'
  );
});

void test('Validator :: cell-5 :: data objects containing a type key remain valid schema values', () => {
  const schema: SchemaInterfaceType = {
    'default': { 'type': 'domain-value' },
    'examples': [{ 'type': 'another-domain-value' }],
    'type': 'object'
  };

  assert.strictEqual(validator.tryCompile(schema), true, 'data-valued keywords are not schema nodes');
});

// ---------------------------------------------------------------------------
// Cell 6 — InputSchema boundary
//
// InputSchema describes the Engine.run input. The validator must enforce it.
// ---------------------------------------------------------------------------

type Cell6InputInterface = {
  readonly 'value': JsonValueType;
};
type Cell6Output = {
  readonly 'errorMsgs': string[];
  readonly 'errorPaths': string[];
  readonly 'valid':     boolean;
};

const cell6Scenarios: readonly ScenarioInterface<Cell6InputInterface, Cell6Output>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=valid-input] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=6, scenario=valid-input] valid');
    },
    'input': { 'value': { 'colors': ['#ff0000'] } },
    'kind': 'happy',
    'name': 'well-formed input with colors array is valid'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=empty-colors] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=6, scenario=empty-colors] empty colors valid');
    },
    'input': { 'value': { 'colors': [] } },
    'kind': 'edge',
    'name': 'empty colors array is valid (zero input colors)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=missing-colors] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=6, scenario=missing-colors] invalid');
      assert.ok(
        output!.errorPaths.some((p) => {return p === 'colors';}),
        '[cell=6, scenario=missing-colors] error path is "colors"'
      );
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('required'); return result; }),
        '[cell=6, scenario=missing-colors] message mentions required'
      );
    },
    'input': { 'value': {} },
    'kind': 'unhappy',
    'name': 'rejects missing colors field'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=colors-non-array] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=6, scenario=colors-non-array] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => { const result = m.includes('expected array, got string'); return result; }),
        '[cell=6, scenario=colors-non-array] message shape'
      );
    },
    'input': { 'value': { 'colors': 'not-array' } },
    'kind': 'unhappy',
    'name': 'rejects colors that is not an array'
  }
];

new ScenarioRunner<Cell6InputInterface, Cell6Output>(
  'Validator :: cell-6 :: input-schema',
  (input) => {
    const result = validator.validate(InputSchema, input.value);
    return {
      'errorMsgs':   result.errors.map((e) => { const result = e.message; return result; }),
      'errorPaths':  result.errors.map((e) => { const result = e.path; return result; }),
      'valid':       result.valid
    };
  }
).run(cell6Scenarios);

// ---------------------------------------------------------------------------
// Cell 7 — Engine boundary validation
//
// Engine.run() and Engine.adopt() invoke the validator at their entry points.
// These scenarios are expressed as ScenarioRunner unhappy scenarios so a
// thrown ValidationError is captured as the scenario's `error` rather than
// propagating out of the task callback.
// ---------------------------------------------------------------------------

type Cell7RunInputInterface = {
  readonly 'rawInput': JsonValueType;
};

const cell7RunScenarios: readonly ScenarioInterface<Cell7RunInputInterface, {
  readonly 'placeholder': true;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=run-valid] must not throw');
      assert.ok(output !== undefined, '[cell=7, scenario=run-valid] output present');
    },
    'input': { 'rawInput': { 'colors': ['#ff0000'] } },
    'kind': 'happy',
    'name': 'run accepts well-formed input'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=run-missing-colors] expected throw');
      assert.match((error).message, /input invalid/, '[cell=7, scenario=run-missing-colors] message names context');
    },
    'input': { 'rawInput': {} },
    'kind': 'unhappy',
    'name': 'run throws on missing colors field'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=run-colors-non-array] expected throw');
      assert.match((error).message, /input invalid/, '[cell=7, scenario=run-colors-non-array] message names context');
    },
    'input': { 'rawInput': { 'colors': 'not-an-array' } },
    'kind': 'unhappy',
    'name': 'run throws when colors is not an array'
  }
];

new ScenarioRunner<Cell7RunInputInterface, {
  readonly 'placeholder': true;
}>(
  'Validator :: cell-7 :: engine-run',
  (input) => {
    const engine = new Engine();
    engine.run(input.rawInput as never);
    return { 'placeholder': true };
  }
).run(cell7RunScenarios);

interface Cell7AdoptInputInterface {
  readonly 'name'?: JsonValueType;
  readonly 'tasks': () => readonly TaskInterface[];
  readonly 'version'?: JsonValueType;
}

const cell7AdoptScenarios: readonly ScenarioInterface<Cell7AdoptInputInterface, {
  readonly 'placeholder': true;
}>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=adopt-valid] must not throw');
      assert.ok(output !== undefined, '[cell=7, scenario=adopt-valid] output present');
    },
    'input': { 'name': 'valid', 'tasks': function() { return []; }, 'version': '0.1.0' },
    'kind': 'happy',
    'name': 'adopt accepts well-formed plugin'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=adopt-no-name] expected throw');
      assert.match((error).message, /plugin invalid/, '[cell=7, scenario=adopt-no-name] message names context');
    },
    'input': { 'tasks': function() { return []; }, 'version': '0.1.0' },
    'kind': 'unhappy',
    'name': 'adopt throws on plugin missing name'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=adopt-no-version] expected throw');
      assert.match((error).message, /plugin invalid/, '[cell=7, scenario=adopt-no-version] message names context');
    },
    'input': { 'name': 'myplugin', 'tasks': function() { return []; } },
    'kind': 'unhappy',
    'name': 'adopt throws on plugin missing version'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=adopt-non-string-name] expected throw');
      assert.match((error).message, /plugin invalid/, '[cell=7, scenario=adopt-non-string-name] message names context');
    },
    'input': { 'name': 42, 'tasks': function() { return []; }, 'version': '0.1.0' },
    'kind': 'unhappy',
    'name': 'adopt throws on non-string name field'
  }
];

new ScenarioRunner<Cell7AdoptInputInterface, {
  readonly 'placeholder': true;
}>(
  'Validator :: cell-7 :: engine-adopt',
  (input) => {
    const engine = new Engine();
    engine.adopt(input as never);
    return { 'placeholder': true };
  }
).run(cell7AdoptScenarios);

// ---------------------------------------------------------------------------
// Construction fixture — every instance is a Validator
// ---------------------------------------------------------------------------

void test('Validator :: cell-0 :: construction :: is an instance of Validator', () => {
  assert.ok(validator instanceof Validator, '[cell=0, scenario=construction] validator instanceof Validator');
});
