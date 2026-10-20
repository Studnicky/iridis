import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface
} from '@studnicky/iridis';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';

import { DerivationConfigInterfaceTypeEntity } from '../composables/entities/DerivationConfigInterfaceTypeEntity.ts';
import { DerivationRelationInterfaceTypeEntity } from '../composables/entities/DerivationRelationInterfaceTypeEntity.ts';
import { effectiveRelation } from '../utils/effectiveRelation.ts';
import { resolveHueOffset } from '../utils/resolveHueOffset.ts';

/**
 * Computes each derived role's effective hue offset from its admitted
 * derivation relation and writes `metadata['core:hueOffsetOverrides']` for
 * family expansion. The task preserves the immutable input role schema and
 * applies the schema offset when no relation overrides it.
 */
class DeriveRoleRelations implements TaskInterface {
  readonly 'name' = 'derive:roleRelations';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Computes each derivedFrom role\'s effective hueOffset from the user-selected per-relation hue algorithm, writing overrides for expand:family to apply.',
    'name':        'derive:roleRelations',
    'reads':       ['input.roles', 'metadata'],
    'writes':      ['metadata']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const configRaw = state.metadata['derivation:config'];
    const roleSchema = state.input.roles;
    if (roleSchema === undefined || !DerivationConfigInterfaceTypeEntity.validate(configRaw)) {return;}
    const config = DerivationConfigInterfaceTypeEntity.intake(configRaw);

    const overrides = new Map<string, number>();
    const roles = roleSchema.roles;
    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index];
      if (role?.derivedFrom === undefined || role.derivedFrom === '') {continue;}
      const storedRelation = config.relations[role.name];
      const authoredRelation = storedRelation === undefined
        ? undefined
        : DerivationRelationInterfaceTypeEntity.intake(storedRelation);
      const relation = effectiveRelation({ 'relation': authoredRelation, 'schemaHueOffset': role.hueOffset });
      overrides.set(role.name, resolveHueOffset(relation));
    }
    const serializedOverrides: Record<string, number> = {};
    overrides.forEach((offset, name) => {
      Object.defineProperty(serializedOverrides, name, { 'configurable': true, 'enumerable': true, 'value': offset, 'writable': true });
    });
    state.metadata['core:hueOffsetOverrides'] = serializedOverrides;
  }
}

/** Singleton task registered by the PaletteSession resolution adapter. */
export const deriveRoleRelations = new DeriveRoleRelations();
