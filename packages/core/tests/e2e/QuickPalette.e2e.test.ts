/** QuickPalette resolution end-to-end contract. */

import { QuickPalette } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';
import quickPaletteVioletDark from '../fixtures/quickPalette-violet-dark.json';
import { QuickPaletteScenarios } from './quick-palette/fixtures/QuickPaletteScenarios.ts';

new ScenarioRunner(
  'QuickPalette :: cell-1 :: palette-shape',
  QuickPaletteScenarios.paletteShape.subject
).run(QuickPaletteScenarios.paletteShape.scenarios);

new ScenarioRunner(
  'QuickPalette :: cell-2 :: framing-dark',
  QuickPaletteScenarios.darkFraming.subject
).run(QuickPaletteScenarios.darkFraming.scenarios);

new ScenarioRunner(
  'QuickPalette :: cell-3 :: framing-light',
  QuickPaletteScenarios.lightFraming.subject
).run(QuickPaletteScenarios.lightFraming.scenarios);

void test('QuickPalette :: golden :: violet seed under dark framing matches locked fixture', () => {
  const palette = QuickPalette.resolve(['#5b21b6'], 'dark');
  assert.deepStrictEqual(
    palette,
    quickPaletteVioletDark,
    'QuickPalette.resolve(["#5b21b6"], "dark") output drifted from its locked fixture'
  );
});
