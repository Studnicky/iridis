/** Math primitive composition scenarios. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import { MathCompositionScenarios } from './math/fixtures/MathCompositionScenarios.ts';

await test('Math.composition :: cell-1 :: happy :: white on black ≈ 21', () => {
  const output = MathCompositionScenarios.contrast.subject({ 'bgHex': '#ffffff', 'fgHex': '#000000' });
  assert.ok(Math.abs(output.ratio - 21) < 0.5, 'white on black produces a WCAG ratio of approximately 21');
});

new ScenarioRunner(
  'Math.composition :: cell-1 :: contrastWcag21',
  MathCompositionScenarios.contrast.subject
).run(MathCompositionScenarios.contrast.scenarios.slice(1));

new ScenarioRunner(
  'Math.composition :: cell-2 :: clusterMedianCut',
  MathCompositionScenarios.cluster.subject
).run(MathCompositionScenarios.cluster.scenarios);

new ScenarioRunner(
  'Math.composition :: cell-3 :: lighten-darken',
  MathCompositionScenarios.lightenDarken.subject
).run(MathCompositionScenarios.lightenDarken.scenarios);

new ScenarioRunner(
  'Math.composition :: cell-4 :: oklch-round-trip',
  MathCompositionScenarios.roundTrip.subject
).run(MathCompositionScenarios.roundTrip.scenarios);
