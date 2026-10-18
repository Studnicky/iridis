import type { ColorHintsInterfaceTypeEntity } from '../../src/entities/ColorHintsInterfaceTypeEntity.ts';
import type { PluginSchemaContributionInterfaceEntity } from '../../src/entities/PluginSchemaContributionInterfaceEntity.ts';

import { ContrastOptionsInterfaceTypeEntity } from '../../src/entities/ContrastOptionsInterfaceTypeEntity.ts';
import { ContrastPairInterfaceTypeEntity } from '../../src/entities/ContrastPairInterfaceTypeEntity.ts';
import { RoleDefinitionInterfaceTypeEntity } from '../../src/entities/RoleDefinitionInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../src/entities/TaskManifestInterfaceTypeEntity.ts';

export const roleInterfaceTypeConsumer = {
  'colorHints': {} satisfies ColorHintsInterfaceTypeEntity.Type,
  'contrastOptions': ContrastOptionsInterfaceTypeEntity.create({}),
  'pair': ContrastPairInterfaceTypeEntity.create({
    'background': 'surface',
    'foreground':           'text',
    'minimumContrastRatio': 4.5
  }),
  'pluginSchema': {} satisfies PluginSchemaContributionInterfaceEntity.Type,
  'role': RoleDefinitionInterfaceTypeEntity.create({
    'name': 'surface'
  }),
  'taskManifest': TaskManifestInterfaceTypeEntity.create({
    'name': 'emit:test'
  })
};
