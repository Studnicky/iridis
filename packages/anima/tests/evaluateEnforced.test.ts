import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { enforceContrast, evaluateEnforced } from '../src/index.ts';

// Deliberately low-contrast: light gray text on white background (~1.6:1),
// well below the 4.5:1 WCAG AA threshold.
const LOW_CONTRAST_FROM: PaletteInterfaceType = {
  'background': { 'c': 0.01, 'h': 240, 'l': 0.98 },
  'text':       { 'c': 0.01, 'h': 240, 'l': 0.85 }
};
const LOW_CONTRAST_TO: PaletteInterfaceType = {
  'background': { 'c': 0.01, 'h': 240, 'l': 0.98 },
  'text':       { 'c': 0.01, 'h': 240, 'l': 0.80 }
};

const CONTRAST_PAIRS = [
  { 'algorithm': undefined, 'background': 'background', 'foreground': 'text', 'minRatio': 4.5 }
];

test('enforceContrast: corrects a deliberately low-contrast frame in place', () => {
  const corrected = enforceContrast(LOW_CONTRAST_FROM, CONTRAST_PAIRS, 'aa');
  assert.notStrictEqual(corrected['text']!.l, LOW_CONTRAST_FROM['text']!.l, 'text lightness was adjusted');
  assert.strictEqual(corrected['background']!.l, LOW_CONTRAST_FROM['background']!.l, 'background left untouched');
});

test('enforceContrast: passes an already-passing frame through unchanged', () => {
  const passing: PaletteInterfaceType = {
    'background': { 'c': 0.01, 'h': 240, 'l': 0.98 },
    'text':       { 'c': 0.01, 'h': 240, 'l': 0.10 }
  };
  const corrected = enforceContrast(passing, CONTRAST_PAIRS, 'aa');
  assert.ok(Math.abs(corrected['text']!.l - passing['text']!.l) < 1e-6, 'already-passing text left effectively unchanged');
});

test('enforceContrast: no-op when there are no contrast pairs', () => {
  const result = enforceContrast(LOW_CONTRAST_FROM, [], 'aa');
  assert.deepStrictEqual(result, LOW_CONTRAST_FROM);
});

test('evaluateEnforced: evaluated frame is re-validated and corrected', () => {
  const frame = evaluateEnforced(LOW_CONTRAST_FROM, LOW_CONTRAST_TO, 0.5, {
    'chromaticDetourRoles': undefined,
    'contrastPairs':        CONTRAST_PAIRS,
    'easing':               undefined,
    'hueDirection':         undefined,
    'level':                'aa'
  });
  assert.notStrictEqual(frame['text']!.l, LOW_CONTRAST_FROM['text']!.l, 'evaluated+enforced text differs from the raw low-contrast lerp');
});
