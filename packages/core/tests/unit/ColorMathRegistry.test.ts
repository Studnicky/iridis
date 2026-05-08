import type { MathPrimitiveInterface } from '@studnicky/iridis';
import { ColorMathRegistry } from '@studnicky/iridis/registry';
import { ScenarioRunner, assert } from './ScenarioRunner.ts';
import { test } from 'node:test';

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function makePrimitive(name: string, returnValue: unknown = name): MathPrimitiveInterface {
  return {
    'name': name,
    apply(..._args: readonly unknown[]): unknown {
      return returnValue;
    },
  };
}

// ---------------------------------------------------------------------------
// ScenarioRunner for register / resolve / has / list / invoke
// ---------------------------------------------------------------------------

type MathInput =
  | { 'op': 'register'; 'primitive': MathPrimitiveInterface }
  | { 'op': 'resolve';  'name': string }
  | { 'op': 'has';      'name': string }
  | { 'op': 'list' }
  | { 'op': 'invoke';   'name': string; 'args': readonly unknown[] };

type MathOutput = MathPrimitiveInterface | boolean | readonly string[] | unknown | void;

function runMathOp(registry: ColorMathRegistry, input: MathInput): MathOutput {
  switch (input.op) {
    case 'register': return registry.register(input.primitive);
    case 'resolve':  return registry.resolve(input.name);
    case 'has':      return registry.has(input.name);
    case 'list':     return registry.list();
    case 'invoke':   return registry.invoke(input.name, ...input.args);
  }
}

// Each scenario builds a fresh registry with 'math:double' pre-registered.
function buildRegistry(): ColorMathRegistry {
  const registry = new ColorMathRegistry();
  registry.register(makePrimitive('math:double', 42));
  return registry;
}

const happyRunner = new ScenarioRunner<MathInput, MathOutput>(
  'ColorMathRegistry',
  (input) => runMathOp(buildRegistry(), input),
);

happyRunner.run([
  {
    'name': 'register then has returns true',
    'kind': 'happy',
    'input': { 'op': 'has', 'name': 'math:double' },
    assert(output, error) {
      assert.ifError(error);
      assert.strictEqual(output, true);
    },
  },
  {
    'name': 'register then resolve returns primitive',
    'kind': 'happy',
    'input': { 'op': 'resolve', 'name': 'math:double' },
    assert(output, error) {
      assert.ifError(error);
      assert.ok(output !== undefined);
      assert.strictEqual((output as MathPrimitiveInterface).name, 'math:double');
    },
  },
  {
    'name': 'list returns all registered names',
    'kind': 'happy',
    'input': { 'op': 'list' },
    assert(output, error) {
      assert.ifError(error);
      const names = output as readonly string[];
      assert.ok(names.includes('math:double'));
    },
  },
  {
    'name': 'invoke calls apply and returns result',
    'kind': 'happy',
    'input': { 'op': 'invoke', 'name': 'math:double', 'args': [21] },
    assert(output, error) {
      assert.ifError(error);
      assert.strictEqual(output, 42);
    },
  },
]);

// ---------------------------------------------------------------------------
// Edge
// ---------------------------------------------------------------------------

test('ColorMathRegistry :: edge :: has returns false for unregistered name', () => {
  const registry = new ColorMathRegistry();
  assert.strictEqual(registry.has('not:registered'), false);
});

test('ColorMathRegistry :: edge :: list returns empty array when nothing registered', () => {
  const registry = new ColorMathRegistry();
  assert.strictEqual(registry.list().length, 0);
});

test('ColorMathRegistry :: edge :: invoke passes args to apply', () => {
  const registry = new ColorMathRegistry();
  const calls: readonly unknown[][] = [];
  // capture args via closure
  const spy: MathPrimitiveInterface = {
    'name': 'spy',
    apply(...args: readonly unknown[]): unknown {
      (calls as unknown as unknown[][]).push([...args]);
      return args[0];
    },
  };
  registry.register(spy);
  const result = registry.invoke<number>('spy', 7, 8);
  assert.strictEqual(result, 7);
  assert.strictEqual((calls as unknown[][]).length, 1);
});

// ---------------------------------------------------------------------------
// Unhappy
// ---------------------------------------------------------------------------

test('ColorMathRegistry :: unhappy :: resolve unknown name throws', () => {
  const registry = new ColorMathRegistry();
  assert.throws(
    () => registry.resolve('no:such'),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('no primitive registered'));
      return true;
    },
  );
});

test('ColorMathRegistry :: unhappy :: invoke unknown name throws', () => {
  const registry = new ColorMathRegistry();
  assert.throws(
    () => registry.invoke('no:such'),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('no primitive registered'));
      return true;
    },
  );
});
