import type { PaletteStateInterface } from '@studnicky/iridis';
import type { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis/model';

import { InputInterfaceTypeEntity } from '@studnicky/iridis';
import { getContrastMetadata } from '@studnicky/iridis-contrast';
import { JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PickerSeedType, SchemaPair } from '../app/composables/types/index.ts';

import { ContrastConfigFor } from '../app/composables/contrastConfigFor.ts';
import { createColorEngine } from '../app/composables/createColorEngine.ts';
import { DerivationConfigInterfaceTypeEntity } from '../app/composables/entities/DerivationConfigInterfaceTypeEntity.ts';
import { optionalContrastStages } from '../app/composables/optionalContrastStages.ts';
import { pickerSeedInputs } from '../app/composables/pickerSeedInputs.ts';
import { REQUIRED_COLOR_STAGES } from '../app/composables/requiredColorStages.ts';
import { spliceOptionalStages } from '../app/composables/spliceOptionalStages.ts';
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

  private static compareNames(left: string, right: string): number {
    const comparison = left.localeCompare(right);
    return comparison;
  }

  private static schemaPair(name: string): SchemaPair {
    const entries = Object.entries(roleSchemaByName);
    for (let index = 0; index < entries.length; index += 1) {
      const [registeredName, pair] = entries[index]!;
      if (registeredName === name) {return pair;}
    }
    throw new RangeError(`No role schema is registered for ${  name}`);
  }

  private static sortNames(names: string[]): void {
    names.sort(RoleSchemaPipelineFixture.compareNames);
  }

  static assertSchema(name: string): void {
    const { schema, state } = RoleSchemaPipelineFixture.run(name);
    const expectedRoleNames: string[] = [];
    for (let index = 0; index < schema.roles.length; index += 1) {
      expectedRoleNames.push(schema.roles[index]!.name);
    }
    RoleSchemaPipelineFixture.sortNames(expectedRoleNames);
    const resolvedRoleNames = Object.keys(state.roles);
    RoleSchemaPipelineFixture.sortNames(resolvedRoleNames);

    assert.deepEqual(resolvedRoleNames, expectedRoleNames);
    assert.equal(state.runtime.framing, 'dark');
    assert.equal(getContrastMetadata(state.metadata, 'contrast:aa') === undefined, false);
    assert.equal(getContrastMetadata(state.metadata, 'contrast:cvd') === undefined, false);

    for (let index = 0; index < Tokens.SHADE_KEYS.length; index += 1) {
      const shade = Tokens.SHADE_KEYS[index]!;
      const variant = state.variants[`s${  shade}`];
      if (variant === undefined) {assert.fail(`s${  shade  } is absent`);}
      const variantRoleNames = Object.keys(variant);
      RoleSchemaPipelineFixture.sortNames(variantRoleNames);
      assert.deepEqual(variantRoleNames, expectedRoleNames, `s${  shade  } resolves every ${  name  } role`);
    }
  }

  static run(name: string): { 'schema': RoleSchemaInterfaceTypeEntity.Type; 'state': PaletteStateInterface } {
    const schema = RoleSchemaPipelineFixture.schemaPair(name).dark;
    const engine = createColorEngine();
    engine.pipeline(spliceOptionalStages(REQUIRED_COLOR_STAGES, optionalContrastStages(0)));
    const state = engine.run(InputInterfaceTypeEntity.create({
      'colors':   pickerSeedInputs(RoleSchemaPipelineFixture.seeds),
      'contrast': ContrastConfigFor.forStrictness(0),
      'metadata': {
        'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
        'derivation:config': JsonValue.from(DerivationConfigInterfaceTypeEntity.defaultValue),
        'derivation:semanticHuesEnabled': true
      },
      'roles':   schema,
      'runtime': { 'colorSpace': 'srgb', 'framing': 'dark' }
    }));
    return { 'schema': schema, 'state': state };
  }
}

for (let index = 0; index < RoleSchemaPipelineFixture.names.length; index += 1) {
  const name = RoleSchemaPipelineFixture.names[index]!;
  await test(`${name  } resolves its complete dark schema through the public pipeline`, () => {
    const result = RoleSchemaPipelineFixture.assertSchema(name);
    return result;
  });
}
