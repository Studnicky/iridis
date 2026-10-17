import { PaletteInterfaceTypeEntity } from '@studnicky/iridis-algebra';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { enforceContrast, evaluateEnforced } from '../src/index.ts';
import { EnforcedPaletteFixture } from './fixtures/EnforcedPaletteFixture.ts';

class PaletteRoleAssertions {
  static require(palette: PaletteInterfaceTypeEntity.Type, roleName: string): PaletteInterfaceTypeEntity.Type[string] {
    const role = palette[roleName];
    if (role === undefined) {
      throw new Error(`palette omits role ${roleName}`);
    }
    return role;
  }
}

await test('enforceContrast: corrects a deliberately low-contrast frame in place', () => {
  const corrected = enforceContrast(EnforcedPaletteFixture.from, EnforcedPaletteFixture.contrastPairs);
  const correctedText = PaletteRoleAssertions.require(corrected, 'text');
  const sourceText = PaletteRoleAssertions.require(EnforcedPaletteFixture.from, 'text');
  const correctedBackground = PaletteRoleAssertions.require(corrected, 'background');
  const sourceBackground = PaletteRoleAssertions.require(EnforcedPaletteFixture.from, 'background');
  assert.notStrictEqual(correctedText.l, sourceText.l, 'text lightness was adjusted');
  assert.strictEqual(correctedBackground.l, sourceBackground.l, 'background left untouched');
});

await test('enforceContrast: passes an already-passing frame through unchanged', () => {
  const passing = PaletteInterfaceTypeEntity.create({
    'background': { 'c': 0.01, 'h': 240, 'l': 0.98 },
    'text':       { 'c': 0.01, 'h': 240, 'l': 0.10 }
  });
  const corrected = enforceContrast(passing, EnforcedPaletteFixture.contrastPairs);
  const correctedText = PaletteRoleAssertions.require(corrected, 'text');
  const sourceText = PaletteRoleAssertions.require(passing, 'text');
  assert.ok(Math.abs(correctedText.l - sourceText.l) < 1e-6, 'already-passing text left effectively unchanged');
});

await test('enforceContrast: no-op when there are no contrast pairs', () => {
  const result = enforceContrast(EnforcedPaletteFixture.from, []);
  assert.deepStrictEqual(result, EnforcedPaletteFixture.from);
});

await test('evaluateEnforced: evaluated frame is re-validated and corrected', () => {
  const frame = evaluateEnforced(EnforcedPaletteFixture.from, EnforcedPaletteFixture.to, 0.5, {
    'contrastPairs': EnforcedPaletteFixture.contrastPairs
  });
  const text = PaletteRoleAssertions.require(frame, 'text');
  const sourceText = PaletteRoleAssertions.require(EnforcedPaletteFixture.from, 'text');
  assert.notStrictEqual(text.l, sourceText.l, 'evaluated+enforced text differs from the raw low-contrast lerp');
});
