import {
  ClusterBucketEntity,
  ClusterMergeEntity,
  ClusterWeightedBucketEntity,
  ColorHintsInterfaceTypeEntity,
  ColorInputEntity,
  ColorRecordInterfaceTypeEntity,
  ContrastAlgorithmTypeEntity,
  ContrastOptionsInterfaceTypeEntity,
  ContrastPairInterfaceTypeEntity,
  ContrastReportEntryInterfaceTypeEntity,
  EngineMetadataInterfaceTypeEntity,
  GamutMapResultEntity,
  HslInputEntity,
  HslResultInterfaceTypeEntity,
  HueTargetOverrideInterfaceTypeEntity,
  InputInterfaceTypeEntity,
  JsonOutputEntity,
  LabInputEntity,
  OklchInputEntity,
  OklchInterfaceTypeEntity,
  PaletteRoleState,
  PendingContrastEntryInterfaceTypeEntity,
  PluginSchemaContributionInterfaceEntity,
  QuickPaletteInterfaceTypeEntity,
  RgbInputEntity,
  RgbInterfaceTypeEntity,
  RoleClampInterfaceTypeEntity,
  RoleDefinitionInterfaceTypeEntity,
  RoleProvenanceInterfaceTypeEntity,
  RoleSchemaInterfaceTypeEntity,
  RuntimeOptionsInterfaceTypeEntity,
  TaskManifestInterfaceTypeEntity,
  ValidationErrorInterfaceTypeEntity,
  VariantConfigInterfaceTypeEntity
} from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const entityNamespaces = [
  ClusterBucketEntity,
  ClusterMergeEntity,
  ClusterWeightedBucketEntity,
  ColorHintsInterfaceTypeEntity,
  ColorInputEntity,
  ColorRecordInterfaceTypeEntity,
  ContrastAlgorithmTypeEntity,
  ContrastOptionsInterfaceTypeEntity,
  ContrastPairInterfaceTypeEntity,
  ContrastReportEntryInterfaceTypeEntity,
  EngineMetadataInterfaceTypeEntity,
  GamutMapResultEntity,
  HslInputEntity,
  HslResultInterfaceTypeEntity,
  HueTargetOverrideInterfaceTypeEntity,
  InputInterfaceTypeEntity,
  JsonOutputEntity,
  LabInputEntity,
  OklchInputEntity,
  OklchInterfaceTypeEntity,
  PendingContrastEntryInterfaceTypeEntity,
  PluginSchemaContributionInterfaceEntity,
  QuickPaletteInterfaceTypeEntity,
  RgbInputEntity,
  RgbInterfaceTypeEntity,
  RoleClampInterfaceTypeEntity,
  RoleDefinitionInterfaceTypeEntity,
  RoleProvenanceInterfaceTypeEntity,
  RoleSchemaInterfaceTypeEntity,
  RuntimeOptionsInterfaceTypeEntity,
  TaskManifestInterfaceTypeEntity,
  ValidationErrorInterfaceTypeEntity,
  VariantConfigInterfaceTypeEntity
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
  const manifest = TaskManifestInterfaceTypeEntity.create({ 'name': 'plugin:emit' });
  const contribution = PluginSchemaContributionInterfaceEntity.create({});
  const definition = RoleDefinitionInterfaceTypeEntity.create({ 'name': 'background' });
  const schema = RoleSchemaInterfaceTypeEntity.create({
    'name':  'plugin-roles',
    'roles': [definition]
  });
  const input = InputInterfaceTypeEntity.intake({ 'colors': ['#112233'] });
  const runtime = RuntimeOptionsInterfaceTypeEntity.intake({ 'framing': 'dark' });
  const record = ColorRecordInterfaceTypeEntity.create({
    'alpha':        1,
    'hex':          '#112233',
    'oklch':        OklchInterfaceTypeEntity.create({ 'c': 0.02, 'h': 250, 'l': 0.2 }),
    'rgb':          RgbInterfaceTypeEntity.create({ 'b': 51, 'g': 34, 'r': 17 }),
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
  const color = ColorRecordInterfaceTypeEntity.create({
    'alpha':        1,
    'hex':          '#112233',
    'oklch':        OklchInterfaceTypeEntity.create({ 'c': 0.02, 'h': 250, 'l': 0.2 }),
    'rgb':          RgbInterfaceTypeEntity.create({ 'b': 51, 'g': 34, 'r': 17 }),
    'sourceFormat': 'hex'
  });

  workspace.set('keyword', color);
  workspace.commit();

  assert.equal(workspace.get('keyword'), color);
  assert.equal(workspace.has('keyword'), true);
  assert.deepEqual(target, { 'keyword': color });
});
