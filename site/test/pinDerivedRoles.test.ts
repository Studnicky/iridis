import type { PaletteStateInterface } from '@studnicky/iridis';

import { InputEntity, Metadata } from '@studnicky/iridis';
import { JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PickerSeedType } from '../app/composables/types/index.ts';

import { COLOR_PIPELINE } from '../app/composables/colorPipeline.ts';
import { ContrastConfigFor } from '../app/composables/contrastConfigFor.ts';
import { createColorEngine } from '../app/composables/createColorEngine.ts';
import { ContrastConfigOptionsEntity } from '../app/composables/entities/ContrastConfigOptionsEntity.ts';
import { DerivationConfigEntity } from '../app/composables/entities/DerivationConfigEntity.ts';
import { pickerSeedInputs } from '../app/composables/pickerSeedInputs.ts';
import { VARIANT_CONFIG } from '../app/composables/variantConfig.ts';
import { roleSchemaByName } from '../app/theme/RoleSchemaByName.ts';

class PinnedPaletteRun {
  static resolve(pinRole: string, pinHex: string): PaletteStateInterface {
    const seeds: readonly PickerSeedType[] = [
      { 'hex': '#7c3aed', 'role': undefined },
      { 'hex': '#06b6d4', 'role': undefined },
      { 'hex': pinHex, 'role': pinRole }
    ];
    const engine = createColorEngine();
    engine.pipeline(COLOR_PIPELINE);
    const result = engine.run(InputEntity.create({
      'colors':   pickerSeedInputs(seeds),
      'contrast': ContrastConfigFor.forOptions(ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 2 })),
      'metadata': {
        'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
        'derivation:config': JsonValue.from(DerivationConfigEntity.defaultValue),
        'derivation:semanticHuesEnabled': true
      },
      'roles':   roleSchemaByName['iridis-32'].dark,
      'runtime': { 'colorSpace': 'srgb', 'framing': 'dark' }
    }));
    return result;
  }
}

await test('a pinned derived role keeps its exact hex and is recorded as stated', () => {
  const state = PinnedPaletteRun.resolve('surface', '#808080');

  assert.equal(state.roles.surface?.hex, '#808080');
  assert.equal(Metadata.roleProvenance(state.metadata).get('surface')?.origin, 'stated');
});

await test('a pinned color outside the role range is not nudged', () => {
  const state = PinnedPaletteRun.resolve('surface', '#ffffff');

  assert.equal(state.roles.surface?.hex, '#ffffff');
});
