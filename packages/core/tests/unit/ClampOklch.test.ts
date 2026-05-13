/**
 * ClampOklch range-pick unit suite.
 *
 * Exercises `roleRangeFor` and the in-range no-op early return.
 * `ColorRecordShape.test.ts` already covers canonical key-order preservation
 * after a clamp rebuild — this suite is strictly about which range gets
 * picked under each combination of (color.hints.role, schema role-range
 * declarations) and whether the early-return path actually returns
 * the same record reference (no allocation) when the input is inside range.
 *
 * Drives the task via a single scenarios table — one `it` per scenario,
 * each runs the engine ONCE and asserts every observable property of the
 * resulting state.colors[0] in the same body.
 */

import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';

import { Engine }            from '@studnicky/iridis';
import type {
  ColorRecordInterface,
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { coreTasks }         from '@studnicky/iridis/tasks';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';

interface ScenarioInterface {
  readonly 'name':  string;
  /** Color (already an OKLCH record) to seed onto state.colors via an onRunStart hook. */
  readonly 'seed':  ColorRecordInterface;
  /** Role schema to drive ClampOklch's roleRangeFor lookup. */
  readonly 'input': InputInterface;
  /** True if the test expects clamp:oklch to leave state.colors[0] === seed (no allocation). */
  readonly 'expectIdentity': boolean;
  assert(state: PaletteStateInterface, seed: ColorRecordInterface): void;
}

function freshEngine(seed: ColorRecordInterface): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  const seedTask: TaskInterface = {
    'name':     'seed:onRunStart',
    'manifest': { 'name': 'seed:onRunStart', 'phase': 'onRunStart' },
    run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
      state.colors.push(seed);
    },
  };
  engine.tasks.hook('onRunStart', seedTask);
  engine.pipeline(['clamp:oklch']);
  return engine;
}

describe('ClampOklch unit :: scenarios', () => {
  // ---------------------------------------------------------------------------
  // Seed factories — each scenario picks the relevant one.
  // ---------------------------------------------------------------------------

  // In-range against the conservative defaults [0.05, 0.95] × [0.0, 0.40].
  const inRangeDefault = colorRecordFactory.fromOklch(0.5, 0.1, 200);

  // In-range under a tight role declaration [0.40, 0.60] × [0.05, 0.15].
  const inRangeRoleDefined = colorRecordFactory.fromOklch(
    0.5, 0.1, 200, 1, 'oklch', { 'role': 'accent' },
  );

  // Out-of-range L above the default upper bound — clamp:oklch must rebuild.
  const outOfRangeL = colorRecordFactory.fromOklch(0.999, 0.1, 200);

  // Hint-bearing color where the schema declares the role and a tight chroma
  // range; chroma exceeds the ceiling so clamp:oklch must rebuild.
  const outOfRangeChromaHinted = colorRecordFactory.fromOklch(
    0.5, 0.30, 200, 1, 'oklch', { 'role': 'accent' },
  );

  // Hint-bearing color whose hinted role IS defined in the schema but ranges
  // are absent on that role — should fall back to defaults (so in-range
  // defaults apply and an identity early-return fires).
  const hintRoleWithoutRanges = colorRecordFactory.fromOklch(
    0.5, 0.1, 200, 1, 'oklch', { 'role': 'mystery' },
  );

  // Hint-bearing color whose hinted role is NOT in the schema's role list —
  // roleRangeFor falls back to defaults.
  const hintRoleUnknown = colorRecordFactory.fromOklch(
    0.5, 0.1, 200, 1, 'oklch', { 'role': 'unknown-role' },
  );

  const scenarios: readonly ScenarioInterface[] = [
    {
      'name':           'default range — in-range L+C returns the same record (no allocation)',
      'seed':           inRangeDefault,
      'input':          { 'colors': [] },
      'expectIdentity': true,
      assert(state, seed): void {
        assert.strictEqual(state.colors.length, 1);
        const out = state.colors[0]!;
        // Early-return path: same reference (no factory call, no record alloc).
        assert.strictEqual(out, seed, 'in-range default → identity early-return');
        // Sanity: OKLCH unchanged.
        assert.strictEqual(out.oklch.l, 0.5);
        assert.strictEqual(out.oklch.c, 0.1);
      },
    },
    {
      'name':           'role-defined range — in-range L+C returns the same record',
      'seed':           inRangeRoleDefined,
      'input':          {
        'colors': [],
        'roles':  {
          'name':  'tight-accent',
          'roles': [
            { 'name': 'accent', 'lightnessRange': [0.40, 0.60], 'chromaRange': [0.05, 0.15] },
          ],
        },
      },
      'expectIdentity': true,
      assert(state, seed): void {
        const out = state.colors[0]!;
        // Schema overrides defaults; values are inside the tighter range, so identity holds.
        assert.strictEqual(out, seed, 'role-range in-range → identity');
        assert.strictEqual(out.hints?.role, 'accent', 'hint preserved');
      },
    },
    {
      'name':           'no hints, no schema — default range clamps out-of-range L into bounds',
      'seed':           outOfRangeL,
      'input':          { 'colors': [] },
      'expectIdentity': false,
      assert(state, seed): void {
        const out = state.colors[0]!;
        assert.notStrictEqual(out, seed, 'out-of-range → factory rebuilt the record');
        // Default upper L bound is 0.95.
        assert.ok(out.oklch.l <= 0.95 + 1e-9, `L ${out.oklch.l} should be ≤ default upper 0.95`);
        assert.ok(out.oklch.l >= 0.05 - 1e-9, `L ${out.oklch.l} should be ≥ default lower 0.05`);
        // Hue preserved.
        assert.ok(Math.abs(out.oklch.h - 200) < 1e-6, `hue should be ≈200, got ${out.oklch.h}`);
        // sourceFormat / hints preserved across the clamp rebuild.
        assert.strictEqual(out.sourceFormat, seed.sourceFormat);
        assert.strictEqual(out.hints, seed.hints);
      },
    },
    {
      'name':           'role-defined chromaRange clamps an out-of-range hinted color',
      'seed':           outOfRangeChromaHinted,
      'input':          {
        'colors': [],
        'roles':  {
          'name':  'tight-accent',
          'roles': [
            { 'name': 'accent', 'chromaRange': [0.00, 0.10] },
          ],
        },
      },
      'expectIdentity': false,
      assert(state, seed): void {
        const out = state.colors[0]!;
        assert.notStrictEqual(out, seed, 'out-of-range chroma triggered rebuild');
        assert.ok(out.oklch.c <= 0.10 + 1e-9,
          `chroma ${out.oklch.c} should be ≤ role upper 0.10`);
        assert.strictEqual(out.hints?.role, 'accent', 'hint preserved through rebuild');
        // L is in-range under defaults so it should be the same.
        assert.strictEqual(out.oklch.l, 0.5);
      },
    },
    {
      'name':           'role declared without explicit ranges — falls back to defaults',
      'seed':           hintRoleWithoutRanges,
      'input':          {
        'colors': [],
        'roles':  {
          'name':  'mystery-only',
          'roles': [
            { 'name': 'mystery' }, // role exists but declares no lightness/chroma ranges
          ],
        },
      },
      'expectIdentity': true,
      assert(state, seed): void {
        const out = state.colors[0]!;
        // Defaults apply; values inside default range → identity.
        assert.strictEqual(out, seed, 'role without ranges → defaults → in-range → identity');
        assert.strictEqual(out.hints?.role, 'mystery');
      },
    },
    {
      'name':           'role hint pointing at a role NOT in schema — defaults apply',
      'seed':           hintRoleUnknown,
      'input':          {
        'colors': [],
        'roles':  {
          'name':  'no-match',
          'roles': [
            { 'name': 'accent', 'lightnessRange': [0.40, 0.60] },
          ],
        },
      },
      'expectIdentity': true,
      assert(state, seed): void {
        const out = state.colors[0]!;
        // Hinted role name doesn't exist in schema; roleRangeFor returns defaults.
        // L=0.5 is in default range; no rebuild.
        assert.strictEqual(out, seed, 'unmatched role hint → defaults → identity');
      },
    },
  ];

  for (const sc of scenarios) {
    it(sc.name, async () => {
      const engine = freshEngine(sc.seed);
      const state  = await engine.run(sc.input);
      sc.assert(state, sc.seed);
    });
  }
});
