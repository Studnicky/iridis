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
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface
} from '@studnicky/iridis';
import type { JsonValueType } from '@studnicky/types';

import {
  intakeAny,
  intakeHex,
  intakeHsl,
  intakeLab,
  intakeNamed,
  intakeOklch,
  intakeP3,
  intakeRgb
} from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';
import type { RawImagePixelInputInterface } from '../../src/interfaces/RawImagePixelInputInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class IntakeTestFixture {
  static makeState(colors: readonly (JsonValueType | RawImagePixelInputInterface)[]): PaletteStateInterface {
    return {
      'colors':   [],
      'input':    { 'bypass': undefined, 'colors': colors, 'contrast': undefined, 'emit': undefined, 'maxColors': undefined, 'metadata': undefined, 'roles': undefined, 'runtime': undefined },
      'metadata': {},
      'outputs':  {},
      'roles':    {},
      'runtime':  { 'colorSpace': undefined, 'extra': undefined, 'framing': undefined },
      'variants': {}
    };
  }
}

const noopContext: PipelineContextInterface = {
  'engine':    {} as PipelineContextInterface['engine'],
  'logger':    {
    'child': function()  { const result = noopContext.logger;
      return result; },
    'debug': function() { /* no-op */ },
    'error': function() { /* no-op */ },
    'info': function()  { /* no-op */ },
    'trace': function() { /* no-op */ },
    'warn': function()  { /* no-op */ }
  },
  'startedAt': 0,
  'tasks':     {} as PipelineContextInterface['tasks']
};

// ---------------------------------------------------------------------------
// Cell 1 — IntakeHex.parse: canonical parse contract
//
// parse() returns a ColorRecordInterfaceType on valid hex, throws on any other
// input (non-string, non-hex string, wrong format). Side-effect-free.
// ---------------------------------------------------------------------------

const hex = intakeHex;

const cell1Scenarios: readonly ScenarioInterface<{ 'raw': JsonValueType | RawImagePixelInputInterface }, { 'result': ColorRecordInterfaceType }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=6digit] must not throw');
      assert.ok(output!.result !== undefined, '[cell=1, scenario=6digit] result present');
      assert.strictEqual(output!.result.hex, '#8b5cf6', '[cell=1, scenario=6digit] hex round-trips');
    },
    'input': { 'raw': '#8b5cf6' },
    'kind': 'happy',
    'name': '#rrggbb six-digit canonical'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=3digit] must not throw');
      assert.ok(output!.result !== undefined, '[cell=1, scenario=3digit] result present');
      assert.strictEqual(output!.result.hex, '#ff00ff', '[cell=1, scenario=3digit] expanded to 6-digit');
    },
    'input': { 'raw': '#f0f' },
    'kind': 'happy',
    'name': '#rgb three-digit shorthand'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=8digit] must not throw');
      assert.ok(output!.result !== undefined, '[cell=1, scenario=8digit] result present');
      assert.strictEqual(output!.result.hex, '#8b5cf6', '[cell=1, scenario=8digit] 6-digit hex preserved');
      assert.ok(
        Math.abs(output!.result.alpha - (0x80 / 255)) < 0.005,
        '[cell=1, scenario=8digit] alpha decoded'
      );
    },
    'input': { 'raw': '#8b5cf680' },
    'kind': 'happy',
    'name': '#rrggbbaa eight-digit with alpha'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=nohash] must not throw');
      assert.ok(output!.result !== undefined, '[cell=1, scenario=nohash] result present');
    },
    'input': { 'raw': '8b5cf6' },
    'kind': 'edge',
    'name': 'no-hash six-digit bare string'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=oklch-throws] parse must throw');
    },
    'input': { 'raw': 'oklch(0.5 0.2 270)' },
    'kind': 'unhappy',
    'name': 'oklch string throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=rgb-obj-throws] parse must throw');
    },
    'input': { 'raw': { 'b': 0, 'g': 0, 'r': 255 } },
    'kind': 'unhappy',
    'name': 'rgb object throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=1, scenario=number-throws] parse must throw');
    },
    'input': { 'raw': 12345 },
    'kind': 'unhappy',
    'name': 'number throws'
  }
];

new ScenarioRunner<{ 'raw': JsonValueType | RawImagePixelInputInterface }, { 'result': ColorRecordInterfaceType }>(
  'Intake :: cell-1 :: IntakeHex.parse',
  (input) => {return { 'result': hex.parse(input.raw) };}
).run(cell1Scenarios);

// ---------------------------------------------------------------------------
// Cell 2 — IntakeHex.run (strict)
//
// run() iterates all entries, throws with "intake:hex" and the entry index
// on any non-hex input. Pure hex arrays succeed.
// ---------------------------------------------------------------------------


const cell2Scenarios: readonly ScenarioInterface<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=single-hex] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=2, scenario=single-hex] one color pushed');
    },
    'input': { 'colors': ['#8b5cf6'] },
    'kind': 'happy',
    'name': 'single valid hex'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=multi-hex] must not throw');
      assert.strictEqual(output!.count, 3, '[cell=2, scenario=multi-hex] three colors pushed');
    },
    'input': { 'colors': ['#ff0000', '#00ff00', '#0000ff'] },
    'kind': 'happy',
    'name': 'multiple valid hex strings'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=empty] must not throw');
      assert.strictEqual(output!.count, 0, '[cell=2, scenario=empty] zero colors');
    },
    'input': { 'colors': [] },
    'kind': 'edge',
    'name': 'empty input produces no colors'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=oklch] must throw');
      assert.match((error).message, /intake:hex/, '[cell=2, scenario=oklch] names the task');
      assert.match((error).message, /index 0/, '[cell=2, scenario=oklch] names the position');
    },
    'input': { 'colors': ['oklch(0.5 0.2 270)'] },
    'kind': 'unhappy',
    'name': 'oklch string at index 0 throws with position info'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=mixed] must throw');
      assert.match((error).message, /index 1/, '[cell=2, scenario=mixed] names index 1');
    },
    'input': { 'colors': ['#ff0000', 'red'] },
    'kind': 'unhappy',
    'name': 'valid hex followed by non-hex throws at the failing index'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=2, scenario=rgb-obj] must throw');
      assert.match((error).message, /intake:hex/, '[cell=2, scenario=rgb-obj] names the task');
    },
    'input': { 'colors': [{ 'b': 0, 'g': 0, 'r': 255 }] },
    'kind': 'unhappy',
    'name': 'rgb object at index 0 throws'
  }
];

new ScenarioRunner<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>(
  'Intake :: cell-2 :: IntakeHex.run',
  (input) => {
    const task = intakeHex;
    const state = IntakeTestFixture.makeState(input.colors);
    task.run(state, noopContext);
    return { 'count': state.colors.length };
  }
).run(cell2Scenarios);

// ---------------------------------------------------------------------------
// Cell 3 — IntakeRgb.run (strict)
//
// run() accepts {r,g,b,a?} objects, throws on non-RGB entries.
// Objects carrying h/l/c keys are considered non-RGB.
// ---------------------------------------------------------------------------


const cell3Scenarios: readonly ScenarioInterface<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=byte-channels] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=3, scenario=byte-channels] one color pushed');
    },
    'input': { 'colors': [{ 'b': 0, 'g': 0, 'r': 255 }] },
    'kind': 'happy',
    'name': '0..255 byte channels'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=float-channels] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=3, scenario=float-channels] one color pushed');
    },
    'input': { 'colors': [{ 'b': 0, 'g': 0, 'r': 1 }] },
    'kind': 'happy',
    'name': '0..1 float channels'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=hex-str] must throw');
      assert.match((error).message, /intake:rgb/, '[cell=3, scenario=hex-str] names the task');
      assert.match((error).message, /index 0/, '[cell=3, scenario=hex-str] names the position');
    },
    'input': { 'colors': ['#ff0000'] },
    'kind': 'unhappy',
    'name': 'hex string throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=3, scenario=hsl-obj] must throw');
      assert.match((error).message, /intake:rgb/, '[cell=3, scenario=hsl-obj] names the task');
    },
    'input': { 'colors': [{ 'h': 270, 'l': 0.5, 's': 0.5 }] },
    'kind': 'unhappy',
    'name': 'hsl object (has h key) throws'
  }
];

new ScenarioRunner<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>(
  'Intake :: cell-3 :: IntakeRgb.run',
  (input) => {
    const task = intakeRgb;
    const state = IntakeTestFixture.makeState(input.colors);
    task.run(state, noopContext);
    return { 'count': state.colors.length };
  }
).run(cell3Scenarios);

// ---------------------------------------------------------------------------
// Cell 4 — IntakeHsl.run (strict)
//
// run() accepts {h,s,l,a?} objects, throws on non-HSL entries.
// ---------------------------------------------------------------------------


const cell4Scenarios: readonly ScenarioInterface<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=hsl-float] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=4, scenario=hsl-float] one color pushed');
    },
    'input': { 'colors': [{ 'h': 270, 'l': 0.5, 's': 0.5 }] },
    'kind': 'happy',
    'name': 'degree hue with 0..1 saturation/lightness'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=hsl-100] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=4, scenario=hsl-100] one color pushed');
    },
    'input': { 'colors': [{ 'h': 270, 'l': 50, 's': 80 }] },
    'kind': 'happy',
    'name': 'degree hue with 0..100 saturation/lightness'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=oklch-obj] must throw');
      assert.match((error).message, /intake:hsl/, '[cell=4, scenario=oklch-obj] names the task');
    },
    'input': { 'colors': [{ 'c': 0.2, 'h': 270, 'l': 0.5 }] },
    'kind': 'unhappy',
    'name': 'oklch object (has c key) throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=4, scenario=hex-str] must throw');
      assert.match((error).message, /intake:hsl/, '[cell=4, scenario=hex-str] names the task');
    },
    'input': { 'colors': ['#8b5cf6'] },
    'kind': 'unhappy',
    'name': 'hex string throws'
  }
];

new ScenarioRunner<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>(
  'Intake :: cell-4 :: IntakeHsl.run',
  (input) => {
    const task = intakeHsl;
    const state = IntakeTestFixture.makeState(input.colors);
    task.run(state, noopContext);
    return { 'count': state.colors.length };
  }
).run(cell4Scenarios);

// ---------------------------------------------------------------------------
// Cell 5 — IntakeOklch.run (strict)
//
// run() accepts {l,c,h,a?} objects, throws on non-OKLCH entries.
// ---------------------------------------------------------------------------


const cell5Scenarios: readonly ScenarioInterface<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=oklch-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=5, scenario=oklch-obj] one color pushed');
    },
    'input': { 'colors': [{ 'c': 0.2, 'h': 270, 'l': 0.5 }] },
    'kind': 'happy',
    'name': 'valid oklch object'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=hex-str] must throw');
      assert.match((error).message, /intake:oklch/, '[cell=5, scenario=hex-str] names the task');
      assert.match((error).message, /index 0/, '[cell=5, scenario=hex-str] names the position');
    },
    'input': { 'colors': ['#8b5cf6'] },
    'kind': 'unhappy',
    'name': 'hex string throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=5, scenario=hsl-obj] must throw');
      assert.match((error).message, /intake:oklch/, '[cell=5, scenario=hsl-obj] names the task');
    },
    'input': { 'colors': [{ 'h': 270, 'l': 0.5, 's': 0.5 }] },
    'kind': 'unhappy',
    'name': 'hsl object (has s key) throws'
  }
];

new ScenarioRunner<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>(
  'Intake :: cell-5 :: IntakeOklch.run',
  (input) => {
    const task = intakeOklch;
    const state = IntakeTestFixture.makeState(input.colors);
    task.run(state, noopContext);
    return { 'count': state.colors.length };
  }
).run(cell5Scenarios);

// ---------------------------------------------------------------------------
// Cell 6 — IntakeLab.run (strict)
//
// run() accepts {l,a,b} objects without conflicting format keys.
// ---------------------------------------------------------------------------


const cell6Scenarios: readonly ScenarioInterface<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=lab-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=6, scenario=lab-obj] one color pushed');
    },
    'input': { 'colors': [{ 'a': 20, 'b': -30, 'l': 50 }] },
    'kind': 'happy',
    'name': 'valid lab object'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=hex-str] must throw');
      assert.match((error).message, /intake:lab/, '[cell=6, scenario=hex-str] names the task');
      assert.match((error).message, /index 0/, '[cell=6, scenario=hex-str] names the position');
    },
    'input': { 'colors': ['#8b5cf6'] },
    'kind': 'unhappy',
    'name': 'hex string throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=6, scenario=oklch-obj] must throw');
      assert.match((error).message, /intake:lab/, '[cell=6, scenario=oklch-obj] names the task');
    },
    'input': { 'colors': [{ 'c': 0.2, 'h': 270, 'l': 0.5 }] },
    'kind': 'unhappy',
    'name': 'oklch object (has c and h keys) throws'
  }
];

new ScenarioRunner<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>(
  'Intake :: cell-6 :: IntakeLab.run',
  (input) => {
    const task = intakeLab;
    const state = IntakeTestFixture.makeState(input.colors);
    task.run(state, noopContext);
    return { 'count': state.colors.length };
  }
).run(cell6Scenarios);

// ---------------------------------------------------------------------------
// Cell 7 — IntakeNamed.run (strict)
//
// run() accepts CSS named color strings, throws on unrecognised input.
// ---------------------------------------------------------------------------


const cell7Scenarios: readonly ScenarioInterface<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number; 'hex': string | null }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=rebeccapurple] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=7, scenario=rebeccapurple] one color pushed');
      assert.strictEqual(output!.hex, '#663399', '[cell=7, scenario=rebeccapurple] correct hex');
      // hex is the canonical hex for rebeccapurple
    },
    'input': { 'colors': ['rebeccapurple'] },
    'kind': 'happy',
    'name': 'lowercase named color'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=7, scenario=mixed-case] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=7, scenario=mixed-case] one color pushed');
    },
    'input': { 'colors': ['RebeccaPurple'] },
    'kind': 'edge',
    'name': 'case-insensitive named color'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=hex-str] must throw');
      assert.match((error).message, /intake:named/, '[cell=7, scenario=hex-str] names the task');
      assert.match((error).message, /index 0/, '[cell=7, scenario=hex-str] names the position');
    },
    'input': { 'colors': ['#663399'] },
    'kind': 'unhappy',
    'name': 'hex string throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=7, scenario=unknown-name] must throw');
      assert.match((error).message, /intake:named/, '[cell=7, scenario=unknown-name] names the task');
    },
    'input': { 'colors': ['notacolor'] },
    'kind': 'unhappy',
    'name': 'unknown name string throws'
  }
];

new ScenarioRunner<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number; 'hex': string | null }>(
  'Intake :: cell-7 :: IntakeNamed.run',
  (input) => {
    const task = intakeNamed;
    const state = IntakeTestFixture.makeState(input.colors);
    task.run(state, noopContext);
    return { 'count': state.colors.length, 'hex': state.colors.at(0)?.hex ?? null };
  }
).run(cell7Scenarios);

// ---------------------------------------------------------------------------
// Cell 8 — IntakeP3.run (strict)
//
// run() accepts CSS color(display-p3 …) strings, throws on non-P3 input.
// ---------------------------------------------------------------------------


const cell8Scenarios: readonly ScenarioInterface<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=p3-no-alpha] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=8, scenario=p3-no-alpha] one color pushed');
    },
    'input': { 'colors': ['color(display-p3 0.5 0.2 0.8)'] },
    'kind': 'happy',
    'name': 'valid display-p3 string without alpha'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=8, scenario=p3-alpha] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=8, scenario=p3-alpha] one color pushed');
    },
    'input': { 'colors': ['color(display-p3 0.5 0.2 0.8 / 0.5)'] },
    'kind': 'happy',
    'name': 'valid display-p3 string with alpha'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=hex-str] must throw');
      assert.match((error).message, /intake:p3/, '[cell=8, scenario=hex-str] names the task');
      assert.match((error).message, /index 0/, '[cell=8, scenario=hex-str] names the position');
    },
    'input': { 'colors': ['#8b5cf6'] },
    'kind': 'unhappy',
    'name': 'hex string throws'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=8, scenario=rgb-obj] must throw');
      assert.match((error).message, /intake:p3/, '[cell=8, scenario=rgb-obj] names the task');
    },
    'input': { 'colors': [{ 'b': 0, 'g': 0, 'r': 1 }] },
    'kind': 'unhappy',
    'name': 'rgb object throws'
  }
];

new ScenarioRunner<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>(
  'Intake :: cell-8 :: IntakeP3.run',
  (input) => {
    const task = intakeP3;
    const state = IntakeTestFixture.makeState(input.colors);
    task.run(state, noopContext);
    return { 'count': state.colors.length };
  }
).run(cell8Scenarios);

// ---------------------------------------------------------------------------
// Cell 9 — IntakeAny.run
//
// run() dispatches per entry to the first matching delegate.
// Accepts mixed-format arrays. Throws only when NO delegate matches.
// ---------------------------------------------------------------------------


const cell9Scenarios: readonly ScenarioInterface<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=hex] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=hex] one color pushed');
    },
    'input': { 'colors': ['#8b5cf6'] },
    'kind': 'happy',
    'name': 'single hex entry dispatched'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=named] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=named] one color pushed');
    },
    'input': { 'colors': ['rebeccapurple'] },
    'kind': 'happy',
    'name': 'single css named color dispatched'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=rgb-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=rgb-obj] one color pushed');
    },
    'input': { 'colors': [{ 'b': 0, 'g': 0, 'r': 255 }] },
    'kind': 'happy',
    'name': 'single rgb object dispatched'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=oklch-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=oklch-obj] one color pushed');
    },
    'input': { 'colors': [{ 'c': 0.2, 'h': 270, 'l': 0.5 }] },
    'kind': 'happy',
    'name': 'single oklch object dispatched'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=hsl-obj] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=hsl-obj] one color pushed');
    },
    'input': { 'colors': [{ 'h': 270, 'l': 0.5, 's': 0.5 }] },
    'kind': 'happy',
    'name': 'single hsl object dispatched'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=p3-str] must not throw');
      assert.strictEqual(output!.count, 1, '[cell=9, scenario=p3-str] one color pushed');
    },
    'input': { 'colors': ['color(display-p3 0.5 0.2 0.8)'] },
    'kind': 'happy',
    'name': 'single display-p3 string dispatched'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=mixed] must not throw');
      assert.strictEqual(output!.count, 4, '[cell=9, scenario=mixed] four colors pushed');
    },
    'input': { 'colors': ['#ff0000', 'rebeccapurple', { 'b': 0, 'g': 255, 'r': 0 }, { 'c': 0.15, 'h': 120, 'l': 0.5 }] },
    'kind': 'happy',
    'name': 'mixed formats in one array — all dispatched'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=9, scenario=empty] must not throw');
      assert.strictEqual(output!.count, 0, '[cell=9, scenario=empty] zero colors');
    },
    'input': { 'colors': [] },
    'kind': 'edge',
    'name': 'empty input produces no colors'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=9, scenario=number] must throw');
      assert.match((error).message, /intake:any/, '[cell=9, scenario=number] names the task');
      assert.match((error).message, /index 0/, '[cell=9, scenario=number] names the position');
    },
    'input': { 'colors': [42] },
    'kind': 'unhappy',
    'name': 'truly malformed entry (number) throws with position'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=9, scenario=unrecognised-str] must throw');
      assert.match((error).message, /intake:any/, '[cell=9, scenario=unrecognised-str] names the task');
      assert.match((error).message, /index 0/, '[cell=9, scenario=unrecognised-str] names the position');
    },
    'input': { 'colors': ['not-a-color-format'] },
    'kind': 'unhappy',
    'name': 'unrecognised string throws with position'
  },
  {
    'assert': function(_output, error) {
      assert.ok(error instanceof Error, '[cell=9, scenario=mixed-fail] must throw');
      assert.match((error).message, /index 1/, '[cell=9, scenario=mixed-fail] names index 1');
    },
    'input': { 'colors': ['#ff0000', 99] },
    'kind': 'unhappy',
    'name': 'valid entry followed by malformed — throws at failing index'
  }
];

new ScenarioRunner<{ 'colors': readonly (JsonValueType | RawImagePixelInputInterface)[] }, { 'count': number }>(
  'Intake :: cell-9 :: IntakeAny.run',
  (input) => {
    const task = intakeAny;
    const state = IntakeTestFixture.makeState(input.colors);
    task.run(state, noopContext);
    return { 'count': state.colors.length };
  }
).run(cell9Scenarios);
