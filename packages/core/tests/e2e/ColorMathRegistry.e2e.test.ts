/**
 * ColorMathRegistry end-to-end tests.
 *
 * Exercises primitive resolution, invoke correctness, override semantics,
 * and error paths. Uses mathBuiltins singletons via public package API.
 */
import { test } from 'node:test';
import type {
  ColorRecordInterface,
  MathPrimitiveInterface,
} from '@studnicky/iridis';
import { Engine, ColorMathRegistry } from '@studnicky/iridis';
import { mathBuiltins }              from '@studnicky/iridis/math';
import { ScenarioRunner, assert }    from './ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshRegistry(): ColorMathRegistry {
  const r = new ColorMathRegistry();
  for (const m of mathBuiltins) r.register(m);
  return r;
}

function blackRecord(): ColorRecordInterface {
  // Pure black: RGB 0,0,0
  return {
    'oklch':        { 'l': 0, 'c': 0, 'h': 0 },
    'rgb':          { 'r': 0, 'g': 0, 'b': 0 },
    'hex':          '#000000',
    'alpha':        1,
    'sourceFormat': 'hex',
  };
}

function whiteRecord(): ColorRecordInterface {
  // Pure white: RGB 1,1,1
  return {
    'oklch':        { 'l': 1, 'c': 0, 'h': 0 },
    'rgb':          { 'r': 1, 'g': 1, 'b': 1 },
    'hex':          '#ffffff',
    'alpha':        1,
    'sourceFormat': 'hex',
  };
}

function midGrayRecord(): ColorRecordInterface {
  // #777777 ≈ RGB 0.467, 0.467, 0.467
  const v = 0x77 / 255;
  return {
    'oklch':        { 'l': 0.5, 'c': 0, 'h': 0 },
    'rgb':          { 'r': v, 'g': v, 'b': v },
    'hex':          '#777777',
    'alpha':        1,
    'sourceFormat': 'hex',
  };
}

// ---------------------------------------------------------------------------
// happy: invoke contrastWcag21 of white on black ≈ 21
// ---------------------------------------------------------------------------

test('ColorMathRegistry e2e :: happy :: contrastWcag21(black, white) ≈ 21', () => {
  const registry = freshRegistry();
  const ratio = registry.invoke<number>('contrastWcag21', blackRecord(), whiteRecord());
  // WCAG 2.1 maximum contrast is exactly 21:1 for pure black on white
  assert.ok(
    Math.abs(ratio - 21) < 0.01,
    `expected ratio ≈ 21, got ${ratio}`,
  );
});

// ---------------------------------------------------------------------------
// happy: contrastWcag21 of #777777 on white ≈ 4.48
// Reference: WebAIM Contrast Checker https://webaim.org/resources/contrastchecker/
// For #777777 on #ffffff the reported ratio is 4.48:1
// ---------------------------------------------------------------------------

test('ColorMathRegistry e2e :: happy :: contrastWcag21(#777777, white) ≈ 4.48', () => {
  const registry = freshRegistry();
  // #777777 on #ffffff — WebAIM Contrast Checker reports 4.48:1
  const ratio = registry.invoke<number>('contrastWcag21', midGrayRecord(), whiteRecord());
  assert.ok(
    Math.abs(ratio - 4.48) < 0.1,
    `expected ratio ≈ 4.48, got ${ratio}`,
  );
});

// ---------------------------------------------------------------------------
// happy: oklchToRgb / rgbToOklch round-trip
// ---------------------------------------------------------------------------

test('ColorMathRegistry e2e :: happy :: oklchToRgb→rgbToOklch round-trip within 0.001', () => {
  const registry = freshRegistry();
  // Input OKLCH values
  const l = 0.5, c = 0.1, h = 30;
  const asRecord = registry.invoke<ColorRecordInterface>('oklchToRgb', l, c, h);
  const back     = registry.invoke<ColorRecordInterface>('rgbToOklch', asRecord.rgb.r, asRecord.rgb.g, asRecord.rgb.b);

  const eps = 0.001;
  assert.ok(Math.abs(back.oklch.l - l) < eps, `L round-trip diff too large: ${Math.abs(back.oklch.l - l)}`);
  assert.ok(Math.abs(back.oklch.c - c) < eps, `C round-trip diff too large: ${Math.abs(back.oklch.c - c)}`);
  // Hue wraps; compare modulo 360
  const hueDiff = Math.abs(((back.oklch.h - h) + 360) % 360);
  const normalizedHueDiff = hueDiff > 180 ? 360 - hueDiff : hueDiff;
  assert.ok(normalizedHueDiff < 1, `H round-trip diff too large: ${normalizedHueDiff}`);
});

// ---------------------------------------------------------------------------
// happy: mixOklch returns midpoint when t=0.5
// ---------------------------------------------------------------------------

test('ColorMathRegistry e2e :: happy :: mixOklch(black, white, 0.5) is mid-gray', () => {
  const registry = freshRegistry();
  const mixed = registry.invoke<ColorRecordInterface>('mixOklch', blackRecord(), whiteRecord(), 0.5);
  const eps = 0.05;
  assert.ok(Math.abs(mixed.oklch.l - 0.5) < eps, `Expected L≈0.5, got ${mixed.oklch.l}`);
});

// ---------------------------------------------------------------------------
// happy: clusterMedianCut(100 colors, k=8) returns exactly 8 records
// ---------------------------------------------------------------------------

test('ColorMathRegistry e2e :: happy :: clusterMedianCut(100 colors, k=8) returns 8 records', () => {
  const registry = freshRegistry();

  const colors: ColorRecordInterface[] = [];
  for (let i = 0; i < 100; i++) {
    const l = (i % 10) / 10;
    const c = (i % 7) / 70;
    const h = (i * 37) % 360;
    const result = registry.invoke<ColorRecordInterface>('oklchToRgb', l, c, h);
    colors.push(result);
  }

  const clusters = registry.invoke<ColorRecordInterface[]>('clusterMedianCut', colors, 8);
  assert.strictEqual(clusters.length, 8, `expected 8 clusters, got ${clusters.length}`);
});

// ---------------------------------------------------------------------------
// happy: luminance and contrastText
// ---------------------------------------------------------------------------

test('ColorMathRegistry e2e :: happy :: luminance(black) is 0 and luminance(white) is 1', () => {
  const registry = freshRegistry();
  const lBlack = registry.invoke<number>('luminance', blackRecord());
  const lWhite = registry.invoke<number>('luminance', whiteRecord());
  assert.ok(Math.abs(lBlack - 0) < 0.001, `Expected luminance(black)≈0, got ${lBlack}`);
  assert.ok(Math.abs(lWhite - 1) < 0.001, `Expected luminance(white)≈1, got ${lWhite}`);
});

test('ColorMathRegistry e2e :: happy :: contrastText(white) returns black', () => {
  const registry = freshRegistry();
  const result = registry.invoke<ColorRecordInterface>('contrastText', whiteRecord());
  assert.strictEqual(result.hex, '#000000', 'contrastText on white background should return black');
});

test('ColorMathRegistry e2e :: happy :: contrastText(black) returns white', () => {
  const registry = freshRegistry();
  const result = registry.invoke<ColorRecordInterface>('contrastText', blackRecord());
  assert.strictEqual(result.hex, '#ffffff', 'contrastText on black background should return white');
});

// ---------------------------------------------------------------------------
// happy: override mixOklch with a custom implementation
// ---------------------------------------------------------------------------

test('ColorMathRegistry e2e :: happy :: registering same-name primitive overrides previous', () => {
  const registry = freshRegistry();

  const customMix: MathPrimitiveInterface = {
    'name': 'mixOklch',
    apply(..._args: readonly unknown[]): unknown { return 'custom-mix'; },
  };

  registry.register(customMix);

  const resolved = registry.resolve('mixOklch');
  assert.strictEqual(resolved, customMix, 'resolve should return the overridden implementation');
  const result = registry.invoke<string>('mixOklch');
  assert.strictEqual(result, 'custom-mix', 'invoke should use the overridden implementation');
});

// ---------------------------------------------------------------------------
// edge: ensureContrast terminates within iteration cap (black on black)
// ---------------------------------------------------------------------------

test('ColorMathRegistry e2e :: edge :: ensureContrast terminates even when target unreachable', () => {
  const registry = freshRegistry();

  // Black on black — contrast ~1:1; target 4.5 is unreachable without going to white
  // ensureContrast must not loop forever — it has a 50-iteration cap
  const result = registry.invoke<ColorRecordInterface>(
    'ensureContrast',
    blackRecord(),
    blackRecord(),
    4.5,
    'wcag21',
  );

  // Whatever it returns, it must be a valid ColorRecord
  assert.ok(typeof result.hex === 'string', 'ensureContrast should return a ColorRecord');
  assert.ok(result.oklch.l >= 0 && result.oklch.l <= 1, 'L must be in [0,1]');
});

// ---------------------------------------------------------------------------
// unhappy: invoke unknown name throws
// ---------------------------------------------------------------------------

const unknownNameRunner = new ScenarioRunner<string, void>(
  'ColorMathRegistry.invoke unknown',
  (name: string) => {
    const registry = freshRegistry();
    registry.invoke(name);
  },
);

unknownNameRunner.run([
  {
    'name':  'completely unknown primitive',
    'kind':  'unhappy',
    'input': 'unknown:primitive',
    assert(_output: void | undefined, error: unknown): void {
      assert.ok(error instanceof Error, 'should throw an Error');
      assert.ok(
        (error as Error).message.includes('unknown:primitive'),
        `error should name the missing primitive, got: ${(error as Error).message}`,
      );
    },
  },
  {
    'name':  'empty string name',
    'kind':  'unhappy',
    'input': '',
    assert(_output: void | undefined, error: unknown): void {
      assert.ok(error instanceof Error, 'should throw an Error for empty name');
    },
  },
]);

// ---------------------------------------------------------------------------
// happy: mathBuiltins contains exactly 25 primitives
// ---------------------------------------------------------------------------

test('ColorMathRegistry e2e :: happy :: mathBuiltins has 25 entries', () => {
  assert.strictEqual(
    (mathBuiltins as readonly unknown[]).length,
    25,
    'mathBuiltins should export exactly 25 math primitive instances',
  );
});

test('ColorMathRegistry e2e :: happy :: all mathBuiltins register without error', () => {
  const registry = new ColorMathRegistry();
  for (const m of mathBuiltins) {
    assert.doesNotThrow(() => registry.register(m), `registering ${m.name} should not throw`);
  }
  const listed = registry.list();
  assert.strictEqual(listed.length, 25, 'list should return 25 registered names');
});
