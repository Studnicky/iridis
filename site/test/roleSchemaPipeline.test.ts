import type { PaletteStateInterface } from '@studnicky/iridis';
import type { RoleSchemaInterfaceType } from '@studnicky/iridis/model';

import { getContrastMetadata } from '@studnicky/iridis-contrast';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PickerSeedType, SchemaPairType } from '../app/composables/types/index.ts';

import { contrastConfigFor } from '../app/composables/contrastConfigFor.ts';
import { createColorEngine } from '../app/composables/createColorEngine.ts';
import { optionalContrastStages } from '../app/composables/optionalContrastStages.ts';
import { pickerSeedInputs } from '../app/composables/pickerSeedInputs.ts';
import { REQUIRED_COLOR_STAGES } from '../app/composables/requiredColorStages.ts';
import { spliceOptionalStages } from '../app/composables/spliceOptionalStages.ts';
import { DEFAULT_DERIVATION_CONFIG } from '../app/composables/types/index.ts';
import { VARIANT_CONFIG } from '../app/composables/variantConfig.ts';
import { roleSchemaByName } from '../app/theme/RoleSchemaByName.ts';
import { Tokens } from '../app/theme/Tokens.ts';

class RoleSchemaPipelineFixture {
  static readonly names: readonly string[] = ['iridis-32', 'iridis-12'];
  private static readonly seeds: readonly PickerSeedType[] = [
    { 'hex': '#7c3aed', 'role': undefined },
    { 'hex': '#06b6d4', 'role': undefined },
    { 'hex': '#f59e0b', 'role': undefined },
    { 'hex': '#ec4899', 'role': undefined }
  ];

  private static schemaPair(name: string): SchemaPairType {
    for (const [registeredName, pair] of Object.entries(roleSchemaByName)) {
      if (registeredName === name) {return pair;}
    }
    throw new RangeError(`No role schema is registered for ${name}`);
  }

  static run(name: string): { 'schema': RoleSchemaInterfaceType; 'state': PaletteStateInterface } {
    const schema = RoleSchemaPipelineFixture.schemaPair(name).dark;
    const engine = createColorEngine();
    engine.pipeline(spliceOptionalStages(REQUIRED_COLOR_STAGES, optionalContrastStages(0)));
    const state = engine.run({
      'bypass':   undefined,
      'colors':   pickerSeedInputs(RoleSchemaPipelineFixture.seeds),
      'contrast': contrastConfigFor(0, true),
      'emit':     undefined,
      'maxColors': undefined,
      'metadata': {
        'core:variantConfig': VARIANT_CONFIG,
        'derivation:config': DEFAULT_DERIVATION_CONFIG,
        'derivation:semanticHuesEnabled': true
      },
      'roles':   schema,
      'runtime': { 'colorSpace': 'srgb', 'extra': undefined, 'framing': 'dark' }
    });
    return { 'schema': schema, 'state': state };
  }
}

for (const name of RoleSchemaPipelineFixture.names) {
  await test(`${name} resolves its complete dark schema through the public pipeline`, () => {
    const { schema, state } = RoleSchemaPipelineFixture.run(name);
    const expectedRoleNames: string[] = [];
    for (const role of schema.roles) {expectedRoleNames.push(role.name);}
    expectedRoleNames.sort();
    const resolvedRoleNames = Object.keys(state.roles);
    resolvedRoleNames.sort();

    assert.deepEqual(resolvedRoleNames, expectedRoleNames);
    assert.equal(state.runtime.framing, 'dark');
    assert.equal(getContrastMetadata(state.metadata, 'contrast:aa') === undefined, false);
    assert.equal(getContrastMetadata(state.metadata, 'contrast:cvd') === undefined, false);

    for (const shade of Tokens.SHADE_KEYS) {
      const variant = state.variants[`s${shade}`];
      if (variant === undefined) {assert.fail(`s${shade} is absent`);}
      const variantRoleNames = Object.keys(variant);
      variantRoleNames.sort();
      assert.deepEqual(variantRoleNames, expectedRoleNames, `s${shade} resolves every ${name} role`);
    }
  });
}
