import type { PaletteStateInterface } from '@studnicky/iridis';
import type { RoleSchemaEntity } from '@studnicky/iridis/model';

import { InputEntity, Metadata } from '@studnicky/iridis';
import { ComplianceReportEntity, CvdResultSetEntity } from '@studnicky/iridis-contrast';
import { RoleGeometry } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PickerSeedType, SchemaPair } from '../app/composables/types/index.ts';

import { COLOR_PIPELINE } from '../app/composables/colorPipeline.ts';
import { ContrastConfigFor } from '../app/composables/contrastConfigFor.ts';
import { createColorEngine } from '../app/composables/createColorEngine.ts';
import { ContrastConfigOptionsEntity } from '../app/composables/entities/ContrastConfigOptionsEntity.ts';
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
      const entry = entries[index];
      assert.notEqual(entry, undefined, `role schema entry ${index} exists`);
      if (entry === undefined) {
        throw new Error(`role schema entry ${index} is absent`);
      }
      const [registeredName, pair] = entry;
      if (registeredName === name) {return pair;}
    }
    throw new RangeError(`No role schema is registered for ${  name}`);
  }

  private static sortNames(names: string[]): void {
    names.sort(RoleSchemaPipelineFixture.compareNames);
  }

  static relationshipsByTarget(
    schema: RoleSchemaEntity.Type
  ): Map<string, NonNullable<RoleSchemaEntity.Type['relationshipGraph']>['groups'][number]['relationships'][number]> {
    if (schema.relationshipGraph === undefined) {
      throw new Error('iridis-32 schema is missing its relationship graph');
    }
    const result = new Map<string, NonNullable<RoleSchemaEntity.Type['relationshipGraph']>['groups'][number]['relationships'][number]>();
    for (let groupIndex = 0; groupIndex < schema.relationshipGraph.groups.length; groupIndex += 1) {
      const group = schema.relationshipGraph.groups[groupIndex];
      if (group === undefined) {
        throw new Error(`relationship group ${groupIndex} is absent`);
      }
      for (let relationshipIndex = 0; relationshipIndex < group.relationships.length; relationshipIndex += 1) {
        const relationship = group.relationships[relationshipIndex];
        if (relationship === undefined) {
          throw new Error(`relationship ${relationshipIndex} is absent`);
        }
        result.set(relationship.target, relationship);
      }
    }
    return result;
  }

  static assertSchema(name: string): void {
    const { schema, state } = RoleSchemaPipelineFixture.run(name);
    const expectedRoleNames: string[] = [];
    for (let index = 0; index < schema.roles.length; index += 1) {
      const role = schema.roles[index];
      assert.notEqual(role, undefined, `${name} role ${index} exists`);
      if (role === undefined) {
        throw new Error(`${name} role ${index} is absent`);
      }
      expectedRoleNames.push(role.name);
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
      const shade = Tokens.SHADE_KEYS[index];
      assert.notEqual(shade, undefined, `shade key ${index} exists`);
      if (shade === undefined) {
        throw new Error(`shade key ${index} is absent`);
      }
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
      'contrast': ContrastConfigFor.forOptions(ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 0 })),
      'metadata': {
        'core:variantConfig': VARIANT_CONFIG
      },
      'roles':   schema,
      'runtime': { 'colorSpace': 'srgb', 'framing': 'dark' }
    }));
    return { 'schema': schema, 'state': state };
  }
}

for (let index = 0; index < RoleSchemaPipelineFixture.names.length; index += 1) {
  const name = RoleSchemaPipelineFixture.names[index];
  if (name === undefined) {
    throw new Error(`schema name ${index} is absent`);
  }
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
    'contrast': ContrastConfigFor.forOptions(ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': false, 'nonMandatoryLevel': 'AA', 'strictness': 0 })),
    'metadata': {
      'core:variantConfig': VARIANT_CONFIG
    },
    'roles': schema,
    'runtime': { 'colorSpace': 'srgb', 'framing': 'dark' }
  }));
  assert.equal(state.roles.success?.hex, '#b55bc7');
  const provenance = Metadata.roleProvenance(state.metadata).get('success');
  assert.deepEqual(provenance, { 'adjustments': [], 'origin': 'stated' });
});

await test('iridis-32 status hue targets preserve their authored clamp and tolerance', () => {
  const { schema, state } = RoleSchemaPipelineFixture.run('iridis-32');
  const resolutions = Metadata.relationshipResolution(state.metadata);
  const relationshipsByTarget = RoleSchemaPipelineFixture.relationshipsByTarget(schema);
  const statusRoleNames = ['error', 'info', 'success', 'warning'];
  for (let roleIndex = 0; roleIndex < statusRoleNames.length; roleIndex += 1) {
    const roleName = statusRoleNames[roleIndex];
    if (roleName === undefined) {
      throw new Error(`status role ${roleIndex} is absent`);
    }
    const relationship = relationshipsByTarget.get(roleName);
    const resolution = resolutions.get(roleName);
    const final = state.roles[roleName];
    assert.notEqual(relationship, undefined, `${roleName} declares a relationship`);
    assert.notEqual(resolution, undefined, `${roleName} records a relationship baseline`);
    assert.notEqual(final, undefined, `${roleName} resolves`);
    if (relationship === undefined || resolution?.after === undefined || final === undefined) {
      throw new Error(`${roleName} is missing relationship resolution evidence`);
    }
    assert.equal(relationship.operation, 'hue-target', `${roleName} uses a hue target`);
    if (relationship.operation !== 'hue-target') {
      throw new Error(`${roleName} does not use a hue target`);
    }
    const source = relationship.source === undefined ? resolution.before : state.roles[relationship.source];
    assert.notEqual(source, undefined, `${roleName} hue target resolves its source`);
    if (source === undefined) {
      throw new Error(`${roleName} hue target source is absent`);
    }
    const expected = RoleGeometry.hueTowards(
      source.oklch.h,
      relationship.hue,
      relationship.clamp ?? RoleGeometry.DEFAULT_HUE_CLAMP
    );
    assert.ok(RoleGeometry.hueDifference(resolution.after.oklch.h, expected) <= 1e-12, `${roleName} baseline obeys its hue clamp`);
    assert.ok(
      RoleGeometry.hueDifference(final.oklch.h, resolution.after.oklch.h) <= (relationship.tolerance?.hue ?? 0) + 1e-12,
      `${roleName} final hue stays inside its relationship tolerance`
    );
  }
});
