/**
 * FramingSurface — scenario-matrix suite.
 *
 * Subject: `FramingSurface` (model helper every `emit:*` task uses to
 * honor `state.runtime.framing`).
 *
 * Cells:
 *   1. is-light        — WCAG relative-luminance threshold on the background role
 *   2. resolve-surface — framing selects state.roles vs. state.variants by
 *                        measured appearance, never by variant name
 */

import type {
  ColorRecordInterfaceType,
  InputInterface,
  PaletteStateInterface
} from '@studnicky/iridis';

import assert from 'node:assert/strict';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { FramingSurface } from '../../src/model/FramingSurface.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestState {
  /** Builds a minimal, schema-valid PaletteStateInterface for a pure FramingSurface call. */
  static build(
    roles:    Readonly<Record<string, ColorRecordInterfaceType>>,
    variants: Readonly<Record<string, Readonly<Record<string, ColorRecordInterfaceType>>>>,
    framing:  'dark' | 'light' | undefined
  ): PaletteStateInterface {
    const input: InputInterface = {
      'bypass':    undefined,
      'colors':    [],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined
    };
    return {
      'colors':   [],
      'input':    input,
      'metadata': {},
      'outputs':  {},
      'roles':    roles,
      'runtime':  { 'colorSpace': undefined, 'extra': undefined, 'framing': framing },
      'variants': variants
    };
  }
}

const DARK_BACKGROUND  = colorRecordFactory.fromHex('#0d1117');
const LIGHT_BACKGROUND = colorRecordFactory.fromHex('#f2f2f2');

// ---------------------------------------------------------------------------
// Cell 1 — isLight
//
// Appearance is the WCAG relative luminance of the `background` role,
// thresholded at 0.5. A role set with no `background` reads as dark,
// matching the pre-`framing` default across every emitter.
// ---------------------------------------------------------------------------

type IsLightInput = {
  readonly 'roles': Readonly<Record<string, ColorRecordInterfaceType>>;
};

const isLightScenarios: readonly ScenarioInterface<IsLightInput, boolean>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=dark-bg] no throw');
      assert.strictEqual(output, false,     '[cell=1, scenario=dark-bg] near-black background reads dark');
    },
    'input': { 'roles': { 'background': DARK_BACKGROUND } },
    'kind': 'happy',
    'name': 'near-black background is not light'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=light-bg] no throw');
      assert.strictEqual(output, true,      '[cell=1, scenario=light-bg] near-white background reads light');
    },
    'input': { 'roles': { 'background': LIGHT_BACKGROUND } },
    'kind': 'happy',
    'name': 'near-white background is light'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=no-bg] no throw');
      assert.strictEqual(output, false,     '[cell=1, scenario=no-bg] missing background defaults to dark');
    },
    'input': { 'roles': {} },
    'kind': 'edge',
    'name': 'missing background role defaults to not-light'
  }
];

new ScenarioRunner<IsLightInput, boolean>(
  'FramingSurface :: cell-1 :: is-light',
  (input) => { const result = FramingSurface.isLight(input.roles); return result; }
).run(isLightScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — resolve
//
// `derive:variant`'s DEFAULT_VARIANTS names variants after the transform
// (invertLightness), not the resulting appearance: given dark seeds, the
// `dark`-named variant inverts lightness and reads light, while the
// `light`-named variant is left untouched and stays dark. This cell
// proves `resolve` matches by MEASURED appearance, not by variant name.
// ---------------------------------------------------------------------------

type ResolveInput = {
  readonly 'framing':  'dark' | 'light' | undefined;
  readonly 'roles':    Readonly<Record<string, ColorRecordInterfaceType>>;
  readonly 'variants': Readonly<Record<string, Readonly<Record<string, ColorRecordInterfaceType>>>>;
};
type ResolveOutput = {
  readonly 'resolved': Readonly<Record<string, ColorRecordInterfaceType>>;
};

// Mirrors DEFAULT_VARIANTS against dark-appearing state.roles: the
// 'dark'-named variant is the inverted (light-appearing) one, and the
// 'light'-named variant is untouched (still dark-appearing) — the exact
// naming trap FramingSurface must not fall into.
const DARK_ROLES: Readonly<Record<string, ColorRecordInterfaceType>> = { 'background': DARK_BACKGROUND };
const NAME_TRAP_VARIANTS: Readonly<Record<string, Readonly<Record<string, ColorRecordInterfaceType>>>> = {
  'dark':  { 'background': LIGHT_BACKGROUND },
  'light': { 'background': DARK_BACKGROUND }
};

const resolveScenarios: readonly ScenarioInterface<ResolveInput, ResolveOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=unset-framing] no throw');
      assert.strictEqual(output!.resolved, DARK_ROLES, '[cell=2, scenario=unset-framing] returns state.roles unchanged (identity)');
    },
    'input': { 'framing': undefined, 'roles': DARK_ROLES, 'variants': NAME_TRAP_VARIANTS },
    'kind': 'happy',
    'name': 'framing unset preserves state.roles byte-for-byte'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=matching-framing] no throw');
      assert.strictEqual(output!.resolved, DARK_ROLES, '[cell=2, scenario=matching-framing] state.roles already dark, framing=dark keeps it');
      assert.strictEqual(FramingSurface.isLight(output!.resolved), false, '[cell=2, scenario=matching-framing] resolved surface reads dark');
    },
    'input': { 'framing': 'dark', 'roles': DARK_ROLES, 'variants': NAME_TRAP_VARIANTS },
    'kind': 'happy',
    'name': 'framing=dark on an already-dark role set does NOT select the dark-named (light-appearing) variant'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=inverse-framing] no throw');
      assert.strictEqual(output!.resolved, NAME_TRAP_VARIANTS.dark, "[cell=2, scenario=inverse-framing] selects the 'dark'-named variant by its measured light appearance");
      assert.strictEqual(FramingSurface.isLight(output!.resolved), true, '[cell=2, scenario=inverse-framing] resolved surface reads light');
    },
    'input': { 'framing': 'light', 'roles': DARK_ROLES, 'variants': NAME_TRAP_VARIANTS },
    'kind': 'happy',
    'name': "framing=light on dark state.roles selects the 'dark'-named variant because it measures light, not because of its name"
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=no-match] no throw');
      assert.strictEqual(output!.resolved, DARK_ROLES, '[cell=2, scenario=no-match] falls back to state.roles when no variant matches');
    },
    'input': { 'framing': 'light', 'roles': DARK_ROLES, 'variants': {} },
    'kind': 'edge',
    'name': 'framing requested but no variants derived: falls back to state.roles rather than throwing'
  }
];

new ScenarioRunner<ResolveInput, ResolveOutput>(
  'FramingSurface :: cell-2 :: resolve-surface',
  (input) => {
    const state = TestState.build(input.roles, input.variants, input.framing);
    return { 'resolved': FramingSurface.resolve(state) };
  }
).run(resolveScenarios);
