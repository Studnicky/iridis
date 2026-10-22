import {
  ClusterBucketEntity,
  ClusterMergeEntity,
  ClusterWeightedBucketEntity,
  ColorHintsEntity,
  ColorInputEntity,
  ColorRecordEntity,
  ContrastAlgorithmTypeEntity,
  ContrastOptionsEntity,
  ContrastPairEntity,
  ContrastReportEntryEntity,
  EngineMetadataEntity,
  GamutMapResultEntity,
  HslInputEntity,
  HslResultEntity,
  HueTargetOverrideEntity,
  InputEntity,
  JsonOutputEntity,
  LabInputEntity,
  OklchEntity,
  OklchInputEntity,
  PaletteRoleState,
  PendingContrastEntryEntity,
  PluginSchemaContributionInterfaceEntity,
  QuickPaletteEntity,
  RgbEntity,
  RgbInputEntity,
  RoleClampEntity,
  RoleDefinitionEntity,
  RoleProvenanceEntity,
  RoleSchemaEntity,
  RuntimeOptionsEntity,
  TaskManifestEntity,
  ValidationErrorEntity,
  VariantConfigEntity
} from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const entityNamespaces = [
  ClusterBucketEntity,
  ClusterMergeEntity,
  ClusterWeightedBucketEntity,
  ColorHintsEntity,
  ColorInputEntity,
  ColorRecordEntity,
  ContrastAlgorithmTypeEntity,
  ContrastOptionsEntity,
  ContrastPairEntity,
  ContrastReportEntryEntity,
  EngineMetadataEntity,
  GamutMapResultEntity,
  HslInputEntity,
  HslResultEntity,
  HueTargetOverrideEntity,
  InputEntity,
  JsonOutputEntity,
  LabInputEntity,
  OklchInputEntity,
  OklchEntity,
  PendingContrastEntryEntity,
  PluginSchemaContributionInterfaceEntity,
  QuickPaletteEntity,
  RgbInputEntity,
  RgbEntity,
  RoleClampEntity,
  RoleDefinitionEntity,
  RoleProvenanceEntity,
  RoleSchemaEntity,
  RuntimeOptionsEntity,
  TaskManifestEntity,
  ValidationErrorEntity,
  VariantConfigEntity
] as const;

void test('core public entrypoint exposes every canonical entity namespace at runtime', () => {
  for (let index = 0; index < entityNamespaces.length; index += 1) {
    const entity = entityNamespaces[index];
    if (entity === undefined) {
      throw new Error(`Missing entity namespace at index ${index}`);
    }
    assert.equal(typeof entity.Schema, 'object');
    assert.equal(typeof entity.intake, 'function');
    assert.equal(typeof entity.validate, 'function');
  }
});

void test('core public entity factories admit canonical plugin contracts', () => {
  const manifest = TaskManifestEntity.create({ 'name': 'plugin:emit' });
  const contribution = PluginSchemaContributionInterfaceEntity.create({});
  const definition = RoleDefinitionEntity.create({ 'name': 'background' });
  const schema = RoleSchemaEntity.create({
    'name':  'plugin-roles',
    'roles': [definition]
  });
  const input = InputEntity.intake({ 'colors': ['#112233'] });
  const runtime = RuntimeOptionsEntity.intake({ 'framing': 'dark' });
  const record = ColorRecordEntity.create({
    'alpha':        1,
    'hex':          '#112233',
    'oklch':        OklchEntity.create({ 'c': 0.02, 'h': 250, 'l': 0.2 }),
    'rgb':          RgbEntity.create({ 'b': 51, 'g': 34, 'r': 17 }),
    'sourceFormat': 'hex'
  });

  assert.equal(manifest.name, 'plugin:emit');
  assert.deepEqual(contribution, {});
  assert.equal(schema.roles[0]?.name, 'background');
  assert.deepEqual(input.colors, ['#112233']);
  assert.equal(runtime.framing, 'dark');
  assert.equal(record.hex, '#112233');
});

void test('core public entrypoint exposes the Map-backed palette role workspace', () => {
  const target = {};
  const workspace = PaletteRoleState.admit(target);
  const color = ColorRecordEntity.create({
    'alpha':        1,
    'hex':          '#112233',
    'oklch':        OklchEntity.create({ 'c': 0.02, 'h': 250, 'l': 0.2 }),
    'rgb':          RgbEntity.create({ 'b': 51, 'g': 34, 'r': 17 }),
    'sourceFormat': 'hex'
  });

  workspace.set('keyword', color);
  workspace.commit();

  assert.equal(workspace.get('keyword'), color);
  assert.equal(workspace.has('keyword'), true);
  assert.deepEqual(target, { 'keyword': color });
});
