/**
 * Unit tests for the Validator JSON Schema walker.
 * Also covers Engine.run and Engine.adopt validation boundaries,
 * and ConfigLoader.validate delegation.
 */
import { test }                               from 'node:test';
import assert                                 from 'node:assert/strict';
import { Validator, validator, InputSchema }  from '@studnicky/iridis/model';
import { Engine }                             from '@studnicky/iridis/engine';
import type { SchemaInterface }               from '@studnicky/iridis/model';

// ---------------------------------------------------------------------------
// Validator — type-level coverage
// ---------------------------------------------------------------------------

test('Validator :: shape :: singleton is an instance of Validator', () => {
  assert.ok(validator instanceof Validator);
});

test('Validator :: happy :: accepts exact schema-correct object', () => {
  const schema: SchemaInterface = {
    'type':     'object',
    'required': ['name'],
    'properties': {
      'name': { 'type': 'string' },
      'age':  { 'type': 'number' },
    },
  };
  const result = validator.validate(schema, { 'name': 'Alice', 'age': 30 });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('Validator :: unhappy :: rejects wrong top-level type', () => {
  const schema: SchemaInterface = { 'type': 'object' };
  const result = validator.validate(schema, 'not-an-object');
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('expected object, got string')));
});

test('Validator :: unhappy :: rejects missing required property with path', () => {
  const schema: SchemaInterface = {
    'type':     'object',
    'required': ['name'],
    'properties': {
      'name': { 'type': 'string' },
    },
  };
  const result = validator.validate(schema, {});
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => e.path === 'name');
  assert.ok(err !== undefined, 'error for missing "name" must include path "name"');
  assert.ok(err.message.includes('required property "name" is missing'));
});

test('Validator :: unhappy :: rejects type mismatch on nested property with dot-path', () => {
  const schema: SchemaInterface = {
    'type':       'object',
    'properties': {
      'color': {
        'type':       'object',
        'properties': {
          'hex': { 'type': 'string' },
        },
      },
    },
  };
  const result = validator.validate(schema, { 'color': { 'hex': 42 } });
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => e.path === 'color.hex');
  assert.ok(err !== undefined, `expected error at path 'color.hex', got: ${JSON.stringify(result.errors)}`);
  assert.ok(err.message.includes('expected string, got number'));
});

test('Validator :: unhappy :: rejects additional property when additionalProperties: false', () => {
  const schema: SchemaInterface = {
    'type':                 'object',
    'properties':           { 'name': { 'type': 'string' } },
    'additionalProperties': false,
  };
  const result = validator.validate(schema, { 'name': 'Alice', 'extra': 'boom' });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('additional property "extra" is not allowed')));
});

test('Validator :: happy :: accepts empty object when no required properties', () => {
  const schema: SchemaInterface = {
    'type':       'object',
    'properties': { 'name': { 'type': 'string' } },
  };
  const result = validator.validate(schema, {});
  assert.strictEqual(result.valid, true);
});

// ---------------------------------------------------------------------------
// Validator — array checks
// ---------------------------------------------------------------------------

test('Validator :: happy :: accepts valid array with items schema', () => {
  const schema: SchemaInterface = {
    'type':  'array',
    'items': { 'type': 'string' },
  };
  const result = validator.validate(schema, ['a', 'b', 'c']);
  assert.strictEqual(result.valid, true);
});

test('Validator :: unhappy :: rejects array item type mismatch with indexed path', () => {
  const schema: SchemaInterface = {
    'type':  'array',
    'items': { 'type': 'string' },
  };
  const result = validator.validate(schema, ['a', 42, 'c']);
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => e.path === '[1]');
  assert.ok(err !== undefined, `expected error at path '[1]', got: ${JSON.stringify(result.errors)}`);
  assert.ok(err.message.includes('expected string, got number'));
});

test('Validator :: unhappy :: rejects array shorter than minItems', () => {
  const schema: SchemaInterface = { 'type': 'array', 'minItems': 2 };
  const result = validator.validate(schema, ['only-one']);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('less than minItems 2')));
});

test('Validator :: unhappy :: rejects array longer than maxItems', () => {
  const schema: SchemaInterface = { 'type': 'array', 'maxItems': 2 };
  const result = validator.validate(schema, [1, 2, 3]);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('greater than maxItems 2')));
});

// ---------------------------------------------------------------------------
// Validator — number bounds
// ---------------------------------------------------------------------------

test('Validator :: unhappy :: rejects number below minimum', () => {
  const schema: SchemaInterface = { 'type': 'number', 'minimum': 0 };
  const result = validator.validate(schema, -1);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('less than minimum 0')));
});

test('Validator :: unhappy :: rejects number above maximum', () => {
  const schema: SchemaInterface = { 'type': 'number', 'maximum': 1 };
  const result = validator.validate(schema, 2);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('greater than maximum 1')));
});

// ---------------------------------------------------------------------------
// Validator — enum
// ---------------------------------------------------------------------------

test('Validator :: happy :: accepts value in enum', () => {
  const schema: SchemaInterface = { 'type': 'string', 'enum': ['red', 'green', 'blue'] };
  const result = validator.validate(schema, 'green');
  assert.strictEqual(result.valid, true);
});

test('Validator :: unhappy :: rejects value not in enum', () => {
  const schema: SchemaInterface = { 'type': 'string', 'enum': ['red', 'green', 'blue'] };
  const result = validator.validate(schema, 'purple');
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('expected one of [red, green, blue]')));
});

// ---------------------------------------------------------------------------
// Validator — pattern
// ---------------------------------------------------------------------------

test('Validator :: happy :: accepts string matching pattern', () => {
  const schema: SchemaInterface = { 'type': 'string', 'pattern': '^#[0-9a-fA-F]{6}$' };
  const result = validator.validate(schema, '#ff0000');
  assert.strictEqual(result.valid, true);
});

test('Validator :: unhappy :: rejects string not matching pattern', () => {
  const schema: SchemaInterface = { 'type': 'string', 'pattern': '^#[0-9a-fA-F]{6}$' };
  const result = validator.validate(schema, 'not-a-hex');
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('does not match pattern')));
});

// ---------------------------------------------------------------------------
// InputSchema — engine boundary validation
// ---------------------------------------------------------------------------

test('Validator :: InputSchema :: accepts valid input', () => {
  const result = validator.validate(InputSchema, { 'colors': ['#ff0000'] });
  assert.strictEqual(result.valid, true);
});

test('Validator :: InputSchema :: rejects missing colors', () => {
  const result = validator.validate(InputSchema, {});
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.path === 'colors' && e.message.includes('required')));
});

test('Validator :: InputSchema :: rejects colors that is not an array', () => {
  const result = validator.validate(InputSchema, { 'colors': 'not-array' });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.message.includes('expected array, got string')));
});

// ---------------------------------------------------------------------------
// Engine.run — validation at boundary
// ---------------------------------------------------------------------------

test('Engine :: P1.6 :: run throws on missing colors field', async () => {
  const engine = new Engine();
  await assert.rejects(
    () => engine.run({ } as never),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith('Engine.run: input invalid'),
        `expected Engine.run error prefix, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('Engine :: P1.6 :: run throws when colors is not an array', async () => {
  const engine = new Engine();
  await assert.rejects(
    () => engine.run({ 'colors': 'not-an-array' } as never),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes('Engine.run: input invalid'),
        `expected validation error, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('Engine :: P1.6 :: run accepts well-formed input', async () => {
  const engine = new Engine();
  // Does not throw — validation passes
  const state = await engine.run({ 'colors': ['#ff0000'] });
  assert.ok(state !== undefined);
});

// ---------------------------------------------------------------------------
// Engine.adopt — plugin shape validation
// ---------------------------------------------------------------------------

test('Engine :: P1.6 :: adopt throws on plugin missing name', () => {
  const engine = new Engine();
  assert.throws(
    () => engine.adopt({ 'version': '0.1.0', tasks() { return []; } } as never),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith('Engine.adopt: plugin invalid'),
        `expected Engine.adopt error prefix, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('Engine :: P1.6 :: adopt throws on plugin missing version', () => {
  const engine = new Engine();
  assert.throws(
    () => engine.adopt({ 'name': 'myplugin', tasks() { return []; } } as never),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith('Engine.adopt: plugin invalid'),
        `expected Engine.adopt error prefix, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('Engine :: P1.6 :: adopt throws on plugin with non-string name', () => {
  const engine = new Engine();
  assert.throws(
    () => engine.adopt({ 'name': 42, 'version': '0.1.0', tasks() { return []; } } as never),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.startsWith('Engine.adopt: plugin invalid'),
        `expected Engine.adopt error prefix, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('Engine :: P1.6 :: adopt accepts well-formed plugin', () => {
  const engine = new Engine();
  // Does not throw
  engine.adopt({ 'name': 'valid', 'version': '0.1.0', tasks() { return []; } });
  assert.ok(true);
});
