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

import { Validator, InputSchema } from '@studnicky/iridis/model';
import { Engine }                            from '@studnicky/iridis/engine';
import type { SchemaInterfaceType }              from '@studnicky/iridis/model';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

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

interface Cell1Input {
  readonly schema: SchemaInterfaceType;
  readonly value:  unknown;
}
interface Cell1Output {
  readonly valid:      boolean;
  readonly errorCount: number;
  readonly firstMsg:   string;
}

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: 'value type matches schema type → valid',
    kind: 'happy',
    input: { schema: { 'type': 'string' }, value: 'hello' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=type-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=type-match] valid');
      assert.strictEqual(output!.errorCount, 0, '[cell=1, scenario=type-match] no errors');
    },
  },
  {
    name: 'number type matches number value',
    kind: 'happy',
    input: { schema: { 'type': 'number' }, value: 42 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=number-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=number-match] valid');
    },
  },
  {
    name: 'boolean type matches boolean value',
    kind: 'happy',
    input: { schema: { 'type': 'boolean' }, value: false },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=bool-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=bool-match] valid');
    },
  },
  {
    name: 'missing type schema: any value accepted',
    kind: 'happy',
    input: { schema: {}, value: 'anything' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=no-type] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=no-type] no type constraint → valid');
    },
  },
  {
    name: 'integer type: whole number is valid',
    kind: 'happy',
    input: { schema: { 'type': 'integer' }, value: 5 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=integer-whole] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=1, scenario=integer-whole] integer valid');
    },
  },
  {
    name: 'type mismatch: string value given object schema',
    kind: 'unhappy',
    input: { schema: { 'type': 'object' }, value: 'not-an-object' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=type-mismatch] must not throw the validator');
      assert.strictEqual(output!.valid, false, '[cell=1, scenario=type-mismatch] invalid');
      assert.match(output!.firstMsg, /expected object, got string/, '[cell=1, scenario=type-mismatch] message shape');
    },
  },
  {
    name: 'null is not an object',
    kind: 'edge',
    input: { schema: { 'type': 'object' }, value: null },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=null-not-object] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=1, scenario=null-not-object] null rejected as object');
      assert.match(output!.firstMsg, /expected object, got null/, '[cell=1, scenario=null-not-object] message names null');
    },
  },
  {
    name: 'array is not an object',
    kind: 'edge',
    input: { schema: { 'type': 'object' }, value: [] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=array-not-object] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=1, scenario=array-not-object] array rejected as object');
    },
  },
  {
    name: 'integer type: float is rejected',
    kind: 'edge',
    input: { schema: { 'type': 'integer' }, value: 3.14 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=integer-float] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=1, scenario=integer-float] float rejected as integer');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'Validator :: cell-1 :: type-check',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return {
      valid:      result.valid,
      errorCount: result.errors.length,
      firstMsg:   result.errors[0]?.message ?? '',
    };
  },
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

interface Cell2Input {
  readonly schema: SchemaInterfaceType;
  readonly value:  unknown;
}
interface Cell2Output {
  readonly valid:       boolean;
  readonly errorPaths:  string[];
  readonly errorMsgs:   string[];
}

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'accepts exact schema-correct object',
    kind: 'happy',
    input: {
      schema: {
        'type': 'object', 'required': ['name'],
        'properties': { 'name': { 'type': 'string' }, 'age': { 'type': 'number' } },
      },
      value: { 'name': 'Alice', 'age': 30 },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=exact-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=2, scenario=exact-match] valid');
    },
  },
  {
    name: 'accepts empty object when no required properties',
    kind: 'happy',
    input: {
      schema: { 'type': 'object', 'properties': { 'name': { 'type': 'string' } } },
      value: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty-ok] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=2, scenario=empty-ok] empty object accepted');
    },
  },
  {
    name: 'rejects missing required property with path in error',
    kind: 'unhappy',
    input: {
      schema: {
        'type': 'object', 'required': ['name'],
        'properties': { 'name': { 'type': 'string' } },
      },
      value: {},
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=missing-required] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=2, scenario=missing-required] invalid');
      assert.ok(output!.errorPaths.includes('name'), '[cell=2, scenario=missing-required] path is "name"');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('required property "name" is missing')),
        '[cell=2, scenario=missing-required] message names property',
      );
    },
  },
  {
    name: 'rejects nested type mismatch with dot-path',
    kind: 'unhappy',
    input: {
      schema: {
        'type': 'object',
        'properties': {
          'color': { 'type': 'object', 'properties': { 'hex': { 'type': 'string' } } },
        },
      },
      value: { 'color': { 'hex': 42 } },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=nested-type] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=2, scenario=nested-type] invalid');
      assert.ok(output!.errorPaths.includes('color.hex'), '[cell=2, scenario=nested-type] path is "color.hex"');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('expected string, got number')),
        '[cell=2, scenario=nested-type] message shape',
      );
    },
  },
  {
    name: 'rejects additional property when additionalProperties: false',
    kind: 'unhappy',
    input: {
      schema: {
        'type': 'object',
        'properties': { 'name': { 'type': 'string' } },
        'additionalProperties': false,
      },
      value: { 'name': 'Alice', 'extra': 'boom' },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=additional-prop] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=2, scenario=additional-prop] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('additional property "extra" is not allowed')),
        '[cell=2, scenario=additional-prop] message names property',
      );
    },
  },
  {
    name: 'deeply nested required missing: error path includes full dot chain',
    kind: 'edge',
    input: {
      schema: {
        'type': 'object',
        'properties': {
          'a': {
            'type': 'object',
            'required': ['b'],
            'properties': { 'b': { 'type': 'string' } },
          },
        },
      },
      value: { 'a': {} },
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=deep-missing] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=2, scenario=deep-missing] invalid');
      assert.ok(
        output!.errorPaths.some((p) => p.includes('b')),
        '[cell=2, scenario=deep-missing] path contains b',
      );
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'Validator :: cell-2 :: object-rules',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return {
      valid:      result.valid,
      errorPaths: result.errors.map((e) => e.path),
      errorMsgs:  result.errors.map((e) => e.message),
    };
  },
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

interface Cell3Input {
  readonly schema: SchemaInterfaceType;
  readonly value:  unknown;
}
interface Cell3Output {
  readonly valid:     boolean;
  readonly errorMsgs: string[];
  readonly errorPaths: string[];
}

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    name: 'accepts valid array matching items schema',
    kind: 'happy',
    input: { schema: { 'type': 'array', 'items': { 'type': 'string' } }, value: ['a', 'b', 'c'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=array-valid] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=3, scenario=array-valid] valid');
    },
  },
  {
    name: 'rejects item type mismatch with indexed path [1]',
    kind: 'unhappy',
    input: { schema: { 'type': 'array', 'items': { 'type': 'string' } }, value: ['a', 42, 'c'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=item-mismatch] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=3, scenario=item-mismatch] invalid');
      assert.ok(output!.errorPaths.includes('[1]'), '[cell=3, scenario=item-mismatch] path is [1]');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('expected string, got number')),
        '[cell=3, scenario=item-mismatch] message shape',
      );
    },
  },
  {
    name: 'rejects array shorter than minItems',
    kind: 'unhappy',
    input: { schema: { 'type': 'array', 'minItems': 2 }, value: ['only-one'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=min-items] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=3, scenario=min-items] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('less than minItems 2')),
        '[cell=3, scenario=min-items] message names constraint',
      );
    },
  },
  {
    name: 'rejects array longer than maxItems',
    kind: 'unhappy',
    input: { schema: { 'type': 'array', 'maxItems': 2 }, value: [1, 2, 3] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=max-items] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=3, scenario=max-items] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('greater than maxItems 2')),
        '[cell=3, scenario=max-items] message names constraint',
      );
    },
  },
  {
    name: 'accepts empty array when no minItems constraint',
    kind: 'edge',
    input: { schema: { 'type': 'array', 'items': { 'type': 'string' } }, value: [] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=empty-array] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=3, scenario=empty-array] empty array accepted');
    },
  },
  {
    name: 'exactly minItems = maxItems = 1: one element is valid',
    kind: 'edge',
    input: { schema: { 'type': 'array', 'minItems': 1, 'maxItems': 1 }, value: ['x'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=exact-one] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=3, scenario=exact-one] exactly one element valid');
    },
  },
];

new ScenarioRunner<Cell3Input, Cell3Output>(
  'Validator :: cell-3 :: array-rules',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return {
      valid:       result.valid,
      errorMsgs:   result.errors.map((e) => e.message),
      errorPaths:  result.errors.map((e) => e.path),
    };
  },
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Cell 4 — number rules (minimum, maximum)
// ---------------------------------------------------------------------------

interface Cell4Input {
  readonly schema: SchemaInterfaceType;
  readonly value:  unknown;
}
interface Cell4Output {
  readonly valid:     boolean;
  readonly errorMsgs: string[];
}

const cell4Scenarios: readonly ScenarioInterface<Cell4Input, Cell4Output>[] = [
  {
    name: 'number at exact minimum is valid',
    kind: 'happy',
    input: { schema: { 'type': 'number', 'minimum': 0 }, value: 0 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=at-min] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=4, scenario=at-min] at minimum is valid');
    },
  },
  {
    name: 'number at exact maximum is valid',
    kind: 'happy',
    input: { schema: { 'type': 'number', 'maximum': 1 }, value: 1 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=at-max] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=4, scenario=at-max] at maximum is valid');
    },
  },
  {
    name: 'rejects number below minimum',
    kind: 'unhappy',
    input: { schema: { 'type': 'number', 'minimum': 0 }, value: -1 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=below-min] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=4, scenario=below-min] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('less than minimum 0')),
        '[cell=4, scenario=below-min] message names minimum',
      );
    },
  },
  {
    name: 'rejects number above maximum',
    kind: 'unhappy',
    input: { schema: { 'type': 'number', 'maximum': 1 }, value: 2 },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=above-max] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=4, scenario=above-max] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('greater than maximum 1')),
        '[cell=4, scenario=above-max] message names maximum',
      );
    },
  },
];

new ScenarioRunner<Cell4Input, Cell4Output>(
  'Validator :: cell-4 :: number-rules',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return { valid: result.valid, errorMsgs: result.errors.map((e) => e.message) };
  },
).run(cell4Scenarios);

// ---------------------------------------------------------------------------
// Cell 5 — string rules (pattern, enum)
// ---------------------------------------------------------------------------

interface Cell5Input {
  readonly schema: SchemaInterfaceType;
  readonly value:  unknown;
}
interface Cell5Output {
  readonly valid:     boolean;
  readonly errorMsgs: string[];
}

const cell5Scenarios: readonly ScenarioInterface<Cell5Input, Cell5Output>[] = [
  {
    name: 'accepts string matching pattern',
    kind: 'happy',
    input: { schema: { 'type': 'string', 'pattern': '^#[0-9a-fA-F]{6}$' }, value: '#ff0000' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=pattern-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=5, scenario=pattern-match] valid');
    },
  },
  {
    name: 'accepts value in enum',
    kind: 'happy',
    input: { schema: { 'type': 'string', 'enum': ['red', 'green', 'blue'] }, value: 'green' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=enum-match] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=5, scenario=enum-match] valid');
    },
  },
  {
    name: 'rejects string not matching pattern',
    kind: 'unhappy',
    input: { schema: { 'type': 'string', 'pattern': '^#[0-9a-fA-F]{6}$' }, value: 'not-a-hex' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=pattern-fail] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=5, scenario=pattern-fail] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('does not match pattern')),
        '[cell=5, scenario=pattern-fail] message shape',
      );
    },
  },
  {
    name: 'rejects value not in enum',
    kind: 'unhappy',
    input: { schema: { 'type': 'string', 'enum': ['red', 'green', 'blue'] }, value: 'purple' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=enum-fail] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=5, scenario=enum-fail] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('expected one of [red, green, blue]')),
        '[cell=5, scenario=enum-fail] message lists options',
      );
    },
  },
  {
    name: 'enum with empty string as member: empty string is accepted',
    kind: 'edge',
    input: { schema: { 'type': 'string', 'enum': ['', 'a'] }, value: '' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=enum-empty-str] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=5, scenario=enum-empty-str] empty string member accepted');
    },
  },
];

new ScenarioRunner<Cell5Input, Cell5Output>(
  'Validator :: cell-5 :: string-rules',
  (input) => {
    const result = validator.validate(input.schema, input.value);
    return { valid: result.valid, errorMsgs: result.errors.map((e) => e.message) };
  },
).run(cell5Scenarios);

// ---------------------------------------------------------------------------
// Cell 6 — InputSchema boundary
//
// InputSchema describes the Engine.run input. The validator must enforce it.
// ---------------------------------------------------------------------------

interface Cell6Input {
  readonly value: unknown;
}
interface Cell6Output {
  readonly valid:     boolean;
  readonly errorMsgs: string[];
  readonly errorPaths: string[];
}

const cell6Scenarios: readonly ScenarioInterface<Cell6Input, Cell6Output>[] = [
  {
    name: 'well-formed input with colors array is valid',
    kind: 'happy',
    input: { value: { 'colors': ['#ff0000'] } },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=valid-input] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=6, scenario=valid-input] valid');
    },
  },
  {
    name: 'empty colors array is valid (zero input colors)',
    kind: 'edge',
    input: { value: { 'colors': [] } },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=empty-colors] must not throw');
      assert.strictEqual(output!.valid, true, '[cell=6, scenario=empty-colors] empty colors valid');
    },
  },
  {
    name: 'rejects missing colors field',
    kind: 'unhappy',
    input: { value: {} },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=missing-colors] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=6, scenario=missing-colors] invalid');
      assert.ok(
        output!.errorPaths.some((p) => p === 'colors'),
        '[cell=6, scenario=missing-colors] error path is "colors"',
      );
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('required')),
        '[cell=6, scenario=missing-colors] message mentions required',
      );
    },
  },
  {
    name: 'rejects colors that is not an array',
    kind: 'unhappy',
    input: { value: { 'colors': 'not-array' } },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=colors-non-array] must not throw');
      assert.strictEqual(output!.valid, false, '[cell=6, scenario=colors-non-array] invalid');
      assert.ok(
        output!.errorMsgs.some((m) => m.includes('expected array, got string')),
        '[cell=6, scenario=colors-non-array] message shape',
      );
    },
  },
];

new ScenarioRunner<Cell6Input, Cell6Output>(
  'Validator :: cell-6 :: input-schema',
  (input) => {
    const result = validator.validate(InputSchema, input.value);
    return {
      valid:       result.valid,
      errorMsgs:   result.errors.map((e) => e.message),
      errorPaths:  result.errors.map((e) => e.path),
    };
  },
).run(cell6Scenarios);

// ---------------------------------------------------------------------------
// Cell 7 — Engine boundary validation
//
// Engine.run() and Engine.adopt() invoke the validator at their entry points.
// These scenarios are table-incompatible because they require async throws
// (Engine.run is async) and the assert callbacks are synchronous in the
// scenario runner; they are expressed as ScenarioRunner unhappy scenarios.
// ---------------------------------------------------------------------------

interface Cell7RunInput {
  readonly rawInput: unknown;
}
interface Cell7RunOutput {
  readonly placeholder: true;
}

const cell7RunScenarios: readonly ScenarioInterface<Cell7RunInput, Cell7RunOutput>[] = [
  {
    name: 'run accepts well-formed input',
    kind: 'happy',
    input: { rawInput: { 'colors': ['#ff0000'] } },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=run-valid] must not throw');
      assert.ok(output, '[cell=7, scenario=run-valid] output present');
    },
  },
  {
    name: 'run throws on missing colors field',
    kind: 'unhappy',
    input: { rawInput: {} },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=run-missing-colors] expected throw');
      assert.match((error as Error).message, /input invalid/, '[cell=7, scenario=run-missing-colors] message names context');
    },
  },
  {
    name: 'run throws when colors is not an array',
    kind: 'unhappy',
    input: { rawInput: { 'colors': 'not-an-array' } },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=run-colors-non-array] expected throw');
      assert.match((error as Error).message, /input invalid/, '[cell=7, scenario=run-colors-non-array] message names context');
    },
  },
];

new ScenarioRunner<Cell7RunInput, Cell7RunOutput>(
  'Validator :: cell-7 :: engine-run',
  async (input) => {
    const engine = new Engine();
    await engine.run(input.rawInput as never);
    return { placeholder: true };
  },
).run(cell7RunScenarios);

interface Cell7AdoptInput {
  readonly plugin: unknown;
}
interface Cell7AdoptOutput {
  readonly placeholder: true;
}

const cell7AdoptScenarios: readonly ScenarioInterface<Cell7AdoptInput, Cell7AdoptOutput>[] = [
  {
    name: 'adopt accepts well-formed plugin',
    kind: 'happy',
    input: { plugin: { 'name': 'valid', 'version': '0.1.0', tasks() { return []; } } },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=adopt-valid] must not throw');
      assert.ok(output, '[cell=7, scenario=adopt-valid] output present');
    },
  },
  {
    name: 'adopt throws on plugin missing name',
    kind: 'unhappy',
    input: { plugin: { 'version': '0.1.0', tasks() { return []; } } },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=adopt-no-name] expected throw');
      assert.match((error as Error).message, /plugin invalid/, '[cell=7, scenario=adopt-no-name] message names context');
    },
  },
  {
    name: 'adopt throws on plugin missing version',
    kind: 'unhappy',
    input: { plugin: { 'name': 'myplugin', tasks() { return []; } } },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=adopt-no-version] expected throw');
      assert.match((error as Error).message, /plugin invalid/, '[cell=7, scenario=adopt-no-version] message names context');
    },
  },
  {
    name: 'adopt throws on non-string name field',
    kind: 'unhappy',
    input: { plugin: { 'name': 42, 'version': '0.1.0', tasks() { return []; } } },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=adopt-non-string-name] expected throw');
      assert.match((error as Error).message, /plugin invalid/, '[cell=7, scenario=adopt-non-string-name] message names context');
    },
  },
];

new ScenarioRunner<Cell7AdoptInput, Cell7AdoptOutput>(
  'Validator :: cell-7 :: engine-adopt',
  (input) => {
    const engine = new Engine();
    engine.adopt(input.plugin as never);
    return { placeholder: true };
  },
).run(cell7AdoptScenarios);

// ---------------------------------------------------------------------------
// Construction fixture — every instance is a Validator
// ---------------------------------------------------------------------------

import { test } from 'node:test';

test('Validator :: cell-0 :: construction :: is an instance of Validator', () => {
  assert.ok(validator instanceof Validator, '[cell=0, scenario=construction] validator instanceof Validator');
});
