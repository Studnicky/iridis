import type { PaletteStateInterface } from '@studnicky/iridis';
import type { RoleSchemaEntity } from '@studnicky/iridis/model';

import { InputEntity, Metadata } from '@studnicky/iridis';
import { ComplianceReportEntity, CvdResultSetEntity } from '@studnicky/iridis-contrast';
import { JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PickerSeedType, SchemaPair } from '../app/composables/types/index.ts';

import { COLOR_PIPELINE } from '../app/composables/colorPipeline.ts';
import { ContrastConfigFor } from '../app/composables/contrastConfigFor.ts';
import { createColorEngine } from '../app/composables/createColorEngine.ts';
import { ContrastConfigOptionsEntity } from '../app/composables/entities/ContrastConfigOptionsEntity.ts';
import { DerivationConfigEntity } from '../app/composables/entities/DerivationConfigEntity.ts';
import { pickerSeedInputs } from '../app/composables/pickerSeedInputs.ts';
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

  static schemaPair(name: string): SchemaPair {
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
    assert.doesNotThrow(() => {
      ComplianceReportEntity.intake(state.metadata['contrast:complianceReport']);
    });
    assert.doesNotThrow(() => {
      CvdResultSetEntity.intake(state.metadata['contrast:cvd']);
    });

    for (let index = 0; index < Tokens.SHADE_KEYS.length; index += 1) {
      const shade = Tokens.SHADE_KEYS[index]!;
      const variant = state.variants[`s${  shade}`];
      if (variant === undefined) {assert.fail(`s${  shade  } is absent`);}
      const variantRoleNames = Object.keys(variant);
      RoleSchemaPipelineFixture.sortNames(variantRoleNames);
      assert.deepEqual(variantRoleNames, expectedRoleNames, `s${  shade  } resolves every ${  name  } role`);
    }
  }

  static run(name: string): { 'schema': RoleSchemaEntity.Type; 'state': PaletteStateInterface } {
    const schema = RoleSchemaPipelineFixture.schemaPair(name).dark;
    const engine = createColorEngine();
    engine.pipeline(COLOR_PIPELINE);
    const state = engine.run(InputEntity.create({
      'colors':   pickerSeedInputs(RoleSchemaPipelineFixture.seeds),
      'contrast': ContrastConfigFor.forOptions(ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'nonMandatoryLevel': 'AA', 'strictness': 0 })),
      'metadata': {
        'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
        'derivation:config': JsonValue.from(DerivationConfigEntity.defaultValue),
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

await test('pinned derived roles remain byte-exact while unpinned roles resolve around them', () => {
  const schema = RoleSchemaPipelineFixture.schemaPair('iridis-32').dark;
  const engine = createColorEngine();
  engine.pipeline(COLOR_PIPELINE);
  const state = engine.run(InputEntity.create({
    'colors': pickerSeedInputs([
      { 'hex': '#101820', 'role': 'background' },
      { 'hex': '#f5f7fa', 'role': 'text' },
      { 'hex': '#7c3aed', 'role': 'brand' },
      { 'hex': '#b55bc7', 'role': 'success' }
    ]),
    'contrast': ContrastConfigFor.forOptions(ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'nonMandatoryLevel': 'AA', 'strictness': 0 })),
    'metadata': {
      'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
      'derivation:config': JsonValue.from(DerivationConfigEntity.defaultValue),
      'derivation:semanticHuesEnabled': true
    },
    'roles': schema,
    'runtime': { 'colorSpace': 'srgb', 'framing': 'dark' }
  }));
  assert.equal(state.roles.success?.hex, '#b55bc7');
  const provenance = Metadata.roleProvenance(state.metadata).get('success');
  assert.deepEqual(provenance, { 'adjustments': [], 'origin': 'stated' });
});
