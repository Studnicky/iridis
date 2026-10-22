import type { ColorHintsEntity } from '../../src/entities/ColorHintsEntity.ts';
import type { PluginSchemaContributionInterfaceEntity } from '../../src/entities/PluginSchemaContributionInterfaceEntity.ts';

import { ContrastOptionsEntity } from '../../src/entities/ContrastOptionsEntity.ts';
import { ContrastPairEntity } from '../../src/entities/ContrastPairEntity.ts';
import { RoleDefinitionEntity } from '../../src/entities/RoleDefinitionEntity.ts';
import { TaskManifestEntity } from '../../src/entities/TaskManifestEntity.ts';

export const roleTypeConsumer = {
  'colorHints': {} satisfies ColorHintsEntity.Type,
  'contrastOptions': ContrastOptionsEntity.create({}),
  'pair': ContrastPairEntity.create({
    'background': 'surface',
    'foreground':           'text',
    'minimumContrastRatio': 4.5
  }),
  'pluginSchema': {} satisfies PluginSchemaContributionInterfaceEntity.Type,
  'role': RoleDefinitionEntity.create({
    'name': 'surface'
  }),
  'taskManifest': TaskManifestEntity.create({
    'name': 'emit:test'
  })
};
