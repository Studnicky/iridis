/**
 * Intake tasks — scenario-matrix suite.
 *
 * Subject: all format-specific intake tasks plus IntakeAny.
 * Exercises the strict-throw contract for all intake tasks:
 *   - each typed intake accepts its format and rejects all others with a
 *     descriptive throw naming the entry index and the expected format.
 *   - IntakeAny dispatches correctly across all formats and throws only
 *     when no delegate matches.
 *
 * Cells:
 *   1. IntakeHex.parse         — parse / throw contract (no side effects)
 *   2. IntakeHex.run (strict)  — accepts hex, throws on non-hex at each position
 *   3. IntakeRgb.run (strict)  — accepts {r,g,b}, throws on non-RGB
 *   4. IntakeHsl.run (strict)  — accepts {h,s,l}, throws on non-HSL
 *   5. IntakeOklch.run (strict)— accepts {l,c,h}, throws on non-OKLCH
 *   6. IntakeLab.run (strict)  — accepts {l,a,b}, throws on non-Lab
 *   7. IntakeNamed.run (strict)— accepts CSS named colors, throws on unknown
 *   8. IntakeP3.run (strict)   — accepts color(display-p3 …), throws on non-P3
 *   9. IntakeAny.run           — tolerates mixed formats, throws on truly malformed
 */

import type {
  PaletteStateInterface,
  PipelineContextInterface,
} from '@studnicky/iridis';
import {
  intakeHex,
  intakeRgb,
  intakeHsl,
  intakeOklch,
  intakeLab,
  intakeNamed,
  intakeP3,
  intakeAny,
} from '@studnicky/iridis/tasks';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeState(colors: readonly unknown[]): PaletteStateInterface {
  return {
    'input':    { 'colors': colors, 'bypass': undefined, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
    'runtime':  { 'colorSpace': undefined, 'extra': undefined, 'framing': undefined },
    'colors':   [],
    'roles':    {},
    'variants': {},
    'outputs':  {},
    'metadata': {},
  };
}

const noopCtx: PipelineContextInterface = {
  'engine':    {} as PipelineContextInterface['engine'],
  'tasks':     {} as PipelineContextInterface['tasks'],
  'logger':    {
    child()  { return noopCtx.logger; },
    trace() { /* no-op */ },
    debug() { /* no-op */ },
    info()  { /* no-op */ },
    warn()  { /* no-op */ },
    error() { /* no-op */ },
  },
  'startedAt': 0,
};

// ---------------------------------------------------------------------------
// Cell 1 — IntakeHex.parse: canonical parse contract
//
// parse() returns a ColorRecordInterfaceType on valid hex, throws on any other
// input (non-string, non-hex string, wrong format). Side-effect-free.
// ---------------------------------------------------------------------------

interface Cell1Input  { raw: unknown }
interface Cell1Output { result: import('@studnicky/iridis').ColorRecordInterfaceType }

const hex = intakeHex;

const cell1Scenarios: readonly ScenarioInterface<Cell1Input, Cell1Output>[] = [
  {
    name: '#rrggbb six-digit canonical',
    kind: 'happy',
    input: { raw: '#8b5cf6' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=6digit] must not throw');
      assert.ok(output!.result !== undefined, '[cell=1, scenario=6digit] result present');
      assert.strictEqual(output!.result.hex, '#8b5cf6', '[cell=1, scenario=6digit] hex round-trips');
    },
  },
  {
    name: '#rgb three-digit shorthand',
    kind: 'happy',
    input: { raw: '#f0f' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=3digit] must not throw');
      assert.ok(output!.result !== undefined, '[cell=1, scenario=3digit] result present');
      assert.strictEqual(output!.result.hex, '#ff00ff', '[cell=1, scenario=3digit] expanded to 6-digit');
    },
  },
  {
    name: '#rrggbbaa eight-digit with alpha',
    kind: 'happy',
    input: { raw: '#8b5cf680' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=8digit] must not throw');
      assert.ok(output!.result !== undefined, '[cell=1, scenario=8digit] result present');
      assert.strictEqual(output!.result.hex, '#8b5cf6', '[cell=1, scenario=8digit] 6-digit hex preserved');
      assert.ok(
        Math.abs(output!.result.alpha - (0x80 / 255)) < 0.005,
        '[cell=1, scenario=8digit] alpha decoded',
      );
    },
  },
  {
    name: 'no-hash six-digit bare string',
    kind: 'edge',
    input: { raw: '8b5cf6' },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=nohash] must not throw');
      assert.ok(output!.result !== undefined, '[cell=1, scenario=nohash] result present');
    },
  },
  {
    name: 'oklch string throws',
    kind: 'unhappy',
    input: { raw: 'oklch(0.5 0.2 270)' },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=oklch-throws] parse must throw');
    },
  },
  {
    name: 'rgb object throws',
    kind: 'unhappy',
    input: { raw: { r: 255, g: 0, b: 0 } },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=rgb-obj-throws] parse must throw');
    },
  },
  {
    name: 'number throws',
    kind: 'unhappy',
    input: { raw: 12345 },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=number-throws] parse must throw');
    },
  },
];

new ScenarioRunner<Cell1Input, Cell1Output>(
  'Intake :: cell-1 :: IntakeHex.parse',
  (input) => ({ result: hex.parse(input.raw) }),
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — IntakeHex.run (strict)
//
// run() iterates all entries, throws with "intake:hex" and the entry index
// on any non-hex input. Pure hex arrays succeed.
// ---------------------------------------------------------------------------

interface Cell2Input  { colors: readonly unknown[] }
interface Cell2Output { count: number }

const cell2Scenarios: readonly ScenarioInterface<Cell2Input, Cell2Output>[] = [
  {
    name: 'single valid hex',
    kind: 'happy',
    input: { colors: ['#8b5cf6'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=single-hex] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=2, scenario=single-hex] one color pushed');
    },
  },
  {
    name: 'multiple valid hex strings',
    kind: 'happy',
    input: { colors: ['#ff0000', '#00ff00', '#0000ff'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=multi-hex] must not throw');
      assert.strictEqual(output!.count, 3, '[cell=2, scenario=multi-hex] three colors pushed');
    },
  },
  {
    name: 'empty input produces no colors',
    kind: 'edge',
    input: { colors: [] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty] must not throw');
      assert.strictEqual(output!.count, 0, '[cell=2, scenario=empty] zero colors');
    },
  },
  {
    name: 'oklch string at index 0 throws with position info',
    kind: 'unhappy',
    input: { colors: ['oklch(0.5 0.2 270)'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=oklch] must throw');
      assert.match((error as Error).message, /intake:hex/, '[cell=2, scenario=oklch] names the task');
      assert.match((error as Error).message, /index 0/, '[cell=2, scenario=oklch] names the position');
    },
  },
  {
    name: 'valid hex followed by non-hex throws at the failing index',
    kind: 'unhappy',
    input: { colors: ['#ff0000', 'red'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=mixed] must throw');
      assert.match((error as Error).message, /index 1/, '[cell=2, scenario=mixed] names index 1');
    },
  },
  {
    name: 'rgb object at index 0 throws',
    kind: 'unhappy',
    input: { colors: [{ r: 255, g: 0, b: 0 }] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=rgb-obj] must throw');
      assert.match((error as Error).message, /intake:hex/, '[cell=2, scenario=rgb-obj] names the task');
    },
  },
];

new ScenarioRunner<Cell2Input, Cell2Output>(
  'Intake :: cell-2 :: IntakeHex.run',
  (input) => {
    const task = intakeHex;
    const state = makeState(input.colors);
    task.run(state, noopCtx);
    return { count: state.colors.length };
  },
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — IntakeRgb.run (strict)
//
// run() accepts {r,g,b,a?} objects, throws on non-RGB entries.
// Objects carrying h/l/c keys are considered non-RGB.
// ---------------------------------------------------------------------------

interface Cell3Input  { colors: readonly unknown[] }
interface Cell3Output { count: number }

const cell3Scenarios: readonly ScenarioInterface<Cell3Input, Cell3Output>[] = [
  {
    name: '0..255 byte channels',
    kind: 'happy',
    input: { colors: [{ r: 255, g: 0, b: 0 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=byte-channels] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=3, scenario=byte-channels] one color pushed');
    },
  },
  {
    name: '0..1 float channels',
    kind: 'happy',
    input: { colors: [{ r: 1, g: 0, b: 0 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=float-channels] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=3, scenario=float-channels] one color pushed');
    },
  },
  {
    name: 'hex string throws',
    kind: 'unhappy',
    input: { colors: ['#ff0000'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=hex-str] must throw');
      assert.match((error as Error).message, /intake:rgb/, '[cell=3, scenario=hex-str] names the task');
      assert.match((error as Error).message, /index 0/, '[cell=3, scenario=hex-str] names the position');
    },
  },
  {
    name: 'hsl object (has h key) throws',
    kind: 'unhappy',
    input: { colors: [{ h: 270, s: 0.5, l: 0.5 }] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=hsl-obj] must throw');
      assert.match((error as Error).message, /intake:rgb/, '[cell=3, scenario=hsl-obj] names the task');
    },
  },
];

new ScenarioRunner<Cell3Input, Cell3Output>(
  'Intake :: cell-3 :: IntakeRgb.run',
  (input) => {
    const task = intakeRgb;
    const state = makeState(input.colors);
    task.run(state, noopCtx);
    return { count: state.colors.length };
  },
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Cell 4 — IntakeHsl.run (strict)
//
// run() accepts {h,s,l,a?} objects, throws on non-HSL entries.
// ---------------------------------------------------------------------------

interface Cell4Input  { colors: readonly unknown[] }
interface Cell4Output { count: number }

const cell4Scenarios: readonly ScenarioInterface<Cell4Input, Cell4Output>[] = [
  {
    name: 'degree hue with 0..1 saturation/lightness',
    kind: 'happy',
    input: { colors: [{ h: 270, s: 0.5, l: 0.5 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=hsl-float] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=4, scenario=hsl-float] one color pushed');
    },
  },
  {
    name: 'degree hue with 0..100 saturation/lightness',
    kind: 'happy',
    input: { colors: [{ h: 270, s: 80, l: 50 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=hsl-100] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=4, scenario=hsl-100] one color pushed');
    },
  },
  {
    name: 'oklch object (has c key) throws',
    kind: 'unhappy',
    input: { colors: [{ l: 0.5, c: 0.2, h: 270 }] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=oklch-obj] must throw');
      assert.match((error as Error).message, /intake:hsl/, '[cell=4, scenario=oklch-obj] names the task');
    },
  },
  {
    name: 'hex string throws',
    kind: 'unhappy',
    input: { colors: ['#8b5cf6'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=hex-str] must throw');
      assert.match((error as Error).message, /intake:hsl/, '[cell=4, scenario=hex-str] names the task');
    },
  },
];

new ScenarioRunner<Cell4Input, Cell4Output>(
  'Intake :: cell-4 :: IntakeHsl.run',
  (input) => {
    const task = intakeHsl;
    const state = makeState(input.colors);
    task.run(state, noopCtx);
    return { count: state.colors.length };
  },
).run(cell4Scenarios);

// ---------------------------------------------------------------------------
// Cell 5 — IntakeOklch.run (strict)
//
// run() accepts {l,c,h,a?} objects, throws on non-OKLCH entries.
// ---------------------------------------------------------------------------

interface Cell5Input  { colors: readonly unknown[] }
interface Cell5Output { count: number }

const cell5Scenarios: readonly ScenarioInterface<Cell5Input, Cell5Output>[] = [
  {
    name: 'valid oklch object',
    kind: 'happy',
    input: { colors: [{ l: 0.5, c: 0.2, h: 270 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=oklch-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=5, scenario=oklch-obj] one color pushed');
    },
  },
  {
    name: 'hex string throws',
    kind: 'unhappy',
    input: { colors: ['#8b5cf6'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=hex-str] must throw');
      assert.match((error as Error).message, /intake:oklch/, '[cell=5, scenario=hex-str] names the task');
      assert.match((error as Error).message, /index 0/, '[cell=5, scenario=hex-str] names the position');
    },
  },
  {
    name: 'hsl object (has s key) throws',
    kind: 'unhappy',
    input: { colors: [{ h: 270, s: 0.5, l: 0.5 }] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=hsl-obj] must throw');
      assert.match((error as Error).message, /intake:oklch/, '[cell=5, scenario=hsl-obj] names the task');
    },
  },
];

new ScenarioRunner<Cell5Input, Cell5Output>(
  'Intake :: cell-5 :: IntakeOklch.run',
  (input) => {
    const task = intakeOklch;
    const state = makeState(input.colors);
    task.run(state, noopCtx);
    return { count: state.colors.length };
  },
).run(cell5Scenarios);

// ---------------------------------------------------------------------------
// Cell 6 — IntakeLab.run (strict)
//
// run() accepts {l,a,b} objects without conflicting format keys.
// ---------------------------------------------------------------------------

interface Cell6Input  { colors: readonly unknown[] }
interface Cell6Output { count: number }

const cell6Scenarios: readonly ScenarioInterface<Cell6Input, Cell6Output>[] = [
  {
    name: 'valid lab object',
    kind: 'happy',
    input: { colors: [{ l: 50, a: 20, b: -30 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=lab-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=6, scenario=lab-obj] one color pushed');
    },
  },
  {
    name: 'hex string throws',
    kind: 'unhappy',
    input: { colors: ['#8b5cf6'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=hex-str] must throw');
      assert.match((error as Error).message, /intake:lab/, '[cell=6, scenario=hex-str] names the task');
      assert.match((error as Error).message, /index 0/, '[cell=6, scenario=hex-str] names the position');
    },
  },
  {
    name: 'oklch object (has c and h keys) throws',
    kind: 'unhappy',
    input: { colors: [{ l: 0.5, c: 0.2, h: 270 }] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=oklch-obj] must throw');
      assert.match((error as Error).message, /intake:lab/, '[cell=6, scenario=oklch-obj] names the task');
    },
  },
];

new ScenarioRunner<Cell6Input, Cell6Output>(
  'Intake :: cell-6 :: IntakeLab.run',
  (input) => {
    const task = intakeLab;
    const state = makeState(input.colors);
    task.run(state, noopCtx);
    return { count: state.colors.length };
  },
).run(cell6Scenarios);

// ---------------------------------------------------------------------------
// Cell 7 — IntakeNamed.run (strict)
//
// run() accepts CSS named color strings, throws on unrecognised input.
// ---------------------------------------------------------------------------

interface Cell7Input  { colors: readonly unknown[] }
interface Cell7Output { count: number; hex: string | null }

const cell7Scenarios: readonly ScenarioInterface<Cell7Input, Cell7Output>[] = [
  {
    name: 'lowercase named color',
    kind: 'happy',
    input: { colors: ['rebeccapurple'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=rebeccapurple] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=7, scenario=rebeccapurple] one color pushed');
      assert.strictEqual(output!.hex, '#663399', '[cell=7, scenario=rebeccapurple] correct hex');
      // hex is the canonical hex for rebeccapurple
    },
  },
  {
    name: 'case-insensitive named color',
    kind: 'edge',
    input: { colors: ['RebeccaPurple'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=mixed-case] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=7, scenario=mixed-case] one color pushed');
    },
  },
  {
    name: 'hex string throws',
    kind: 'unhappy',
    input: { colors: ['#663399'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=hex-str] must throw');
      assert.match((error as Error).message, /intake:named/, '[cell=7, scenario=hex-str] names the task');
      assert.match((error as Error).message, /index 0/, '[cell=7, scenario=hex-str] names the position');
    },
  },
  {
    name: 'unknown name string throws',
    kind: 'unhappy',
    input: { colors: ['notacolor'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=unknown-name] must throw');
      assert.match((error as Error).message, /intake:named/, '[cell=7, scenario=unknown-name] names the task');
    },
  },
];

new ScenarioRunner<Cell7Input, Cell7Output>(
  'Intake :: cell-7 :: IntakeNamed.run',
  (input) => {
    const task = intakeNamed;
    const state = makeState(input.colors);
    task.run(state, noopCtx);
    return { count: state.colors.length, hex: state.colors[0]?.hex ?? null };
  },
).run(cell7Scenarios);

// ---------------------------------------------------------------------------
// Cell 8 — IntakeP3.run (strict)
//
// run() accepts CSS color(display-p3 …) strings, throws on non-P3 input.
// ---------------------------------------------------------------------------

interface Cell8Input  { colors: readonly unknown[] }
interface Cell8Output { count: number }

const cell8Scenarios: readonly ScenarioInterface<Cell8Input, Cell8Output>[] = [
  {
    name: 'valid display-p3 string without alpha',
    kind: 'happy',
    input: { colors: ['color(display-p3 0.5 0.2 0.8)'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=p3-no-alpha] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=8, scenario=p3-no-alpha] one color pushed');
    },
  },
  {
    name: 'valid display-p3 string with alpha',
    kind: 'happy',
    input: { colors: ['color(display-p3 0.5 0.2 0.8 / 0.5)'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=p3-alpha] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=8, scenario=p3-alpha] one color pushed');
    },
  },
  {
    name: 'hex string throws',
    kind: 'unhappy',
    input: { colors: ['#8b5cf6'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=hex-str] must throw');
      assert.match((error as Error).message, /intake:p3/, '[cell=8, scenario=hex-str] names the task');
      assert.match((error as Error).message, /index 0/, '[cell=8, scenario=hex-str] names the position');
    },
  },
  {
    name: 'rgb object throws',
    kind: 'unhappy',
    input: { colors: [{ r: 1, g: 0, b: 0 }] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=rgb-obj] must throw');
      assert.match((error as Error).message, /intake:p3/, '[cell=8, scenario=rgb-obj] names the task');
    },
  },
];

new ScenarioRunner<Cell8Input, Cell8Output>(
  'Intake :: cell-8 :: IntakeP3.run',
  (input) => {
    const task = intakeP3;
    const state = makeState(input.colors);
    task.run(state, noopCtx);
    return { count: state.colors.length };
  },
).run(cell8Scenarios);

// ---------------------------------------------------------------------------
// Cell 9 — IntakeAny.run
//
// run() dispatches per entry to the first matching delegate.
// Accepts mixed-format arrays. Throws only when NO delegate matches.
// ---------------------------------------------------------------------------

interface Cell9Input  { colors: readonly unknown[] }
interface Cell9Output { count: number }

const cell9Scenarios: readonly ScenarioInterface<Cell9Input, Cell9Output>[] = [
  {
    name: 'single hex entry dispatched',
    kind: 'happy',
    input: { colors: ['#8b5cf6'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=hex] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=hex] one color pushed');
    },
  },
  {
    name: 'single css named color dispatched',
    kind: 'happy',
    input: { colors: ['rebeccapurple'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=named] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=named] one color pushed');
    },
  },
  {
    name: 'single rgb object dispatched',
    kind: 'happy',
    input: { colors: [{ r: 255, g: 0, b: 0 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=rgb-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=rgb-obj] one color pushed');
    },
  },
  {
    name: 'single oklch object dispatched',
    kind: 'happy',
    input: { colors: [{ l: 0.5, c: 0.2, h: 270 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=oklch-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=oklch-obj] one color pushed');
    },
  },
  {
    name: 'single hsl object dispatched',
    kind: 'happy',
    input: { colors: [{ h: 270, s: 0.5, l: 0.5 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=hsl-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=hsl-obj] one color pushed');
    },
  },
  {
    name: 'single display-p3 string dispatched',
    kind: 'happy',
    input: { colors: ['color(display-p3 0.5 0.2 0.8)'] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=p3-str] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=p3-str] one color pushed');
    },
  },
  {
    name: 'mixed formats in one array — all dispatched',
    kind: 'happy',
    input: { colors: ['#ff0000', 'rebeccapurple', { r: 0, g: 255, b: 0 }, { l: 0.5, c: 0.15, h: 120 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=mixed] must not throw');
      assert.strictEqual(output!.count, 4, '[cell=9, scenario=mixed] four colors pushed');
    },
  },
  {
    name: 'empty input produces no colors',
    kind: 'edge',
    input: { colors: [] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=empty] must not throw');
      assert.strictEqual(output!.count, 0, '[cell=9, scenario=empty] zero colors');
    },
  },
  {
    name: 'truly malformed entry (number) throws with position',
    kind: 'unhappy',
    input: { colors: [42] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=9, scenario=number] must throw');
      assert.match((error as Error).message, /intake:any/, '[cell=9, scenario=number] names the task');
      assert.match((error as Error).message, /index 0/, '[cell=9, scenario=number] names the position');
    },
  },
  {
    name: 'unrecognised string throws with position',
    kind: 'unhappy',
    input: { colors: ['not-a-color-format'] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=9, scenario=unrecognised-str] must throw');
      assert.match((error as Error).message, /intake:any/, '[cell=9, scenario=unrecognised-str] names the task');
      assert.match((error as Error).message, /index 0/, '[cell=9, scenario=unrecognised-str] names the position');
    },
  },
  {
    name: 'valid entry followed by malformed — throws at failing index',
    kind: 'unhappy',
    input: { colors: ['#ff0000', 99] },
    assert(_output, error) {
      assert.ok(error instanceof Error, '[cell=9, scenario=mixed-fail] must throw');
      assert.match((error as Error).message, /index 1/, '[cell=9, scenario=mixed-fail] names index 1');
    },
  },
];

new ScenarioRunner<Cell9Input, Cell9Output>(
  'Intake :: cell-9 :: IntakeAny.run',
  (input) => {
    const task = intakeAny;
    const state = makeState(input.colors);
    task.run(state, noopCtx);
    return { count: state.colors.length };
  },
).run(cell9Scenarios);
