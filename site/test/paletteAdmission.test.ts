import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildRefinePaletteSeedGridModel } from '../app/components/content/refine/buildRefinePaletteSeedGridModel.ts';
import { PaletteAdmission } from '../app/composables/paletteAdmission.ts';
import { BlockerSetFixture } from './fixtures/BlockerSetFixture.ts';

await test('PaletteAdmission admits a compliant palette after one is committed', () => {
  const admission = new PaletteAdmission();
  assert.equal(admission.admit(BlockerSetFixture.compliant), true);
  assert.equal(admission.admit(BlockerSetFixture.compliant), true);
});

await test('PaletteAdmission rejects a noncompliant palette after one is committed', () => {
  const admission = new PaletteAdmission();
  assert.equal(admission.admit(BlockerSetFixture.compliant), true);
  assert.equal(admission.admit(BlockerSetFixture.blocked), false);
});

await test('PaletteAdmission admits a noncompliant palette when nothing is committed', () => {
  const admission = new PaletteAdmission();
  assert.equal(admission.admit(BlockerSetFixture.blocked), true);
});

await test('PaletteAdmission rejects a noncompliant palette after a noncompliant first commit', () => {
  const admission = new PaletteAdmission();
  assert.equal(admission.admit(BlockerSetFixture.blocked), true);
  assert.equal(admission.admit(BlockerSetFixture.blocked), false);
  assert.equal(admission.admit(BlockerSetFixture.compliant), true);
});

await test('buildRefinePaletteSeedGridModel marks only rejected pins pending', () => {
  const model = buildRefinePaletteSeedGridModel.build(
    [{ 'hex': '#112233', 'role': 'primary' }, { 'hex': '#445566', 'role': 'accent' }, { 'hex': '#778899' }],
    ['primary'],
    'WCAG AA'
  );
  assert.equal(model.balancedSeeds[0]?.pendingTitle, 'Pending: cannot meet WCAG AA with this pin');
  assert.equal(model.balancedSeeds[1]?.pendingTitle, undefined);
  assert.equal(model.balancedSeeds[2]?.pendingTitle, undefined);
});
