import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface
} from '@studnicky/iridis';

import { TaskManifestEntity } from '@studnicky/iridis';

import { DerivationConfigEntity } from '../composables/entities/DerivationConfigEntity.ts';
import { DerivationRelationEntity } from '../composables/entities/DerivationRelationEntity.ts';
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

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Computes each derivedFrom role\'s effective hueOffset from the user-selected per-relation hue algorithm, writing overrides for expand:family to apply.',
    'name':        'derive:roleRelations',
    'reads':       ['input.roles', 'metadata'],
    'writes':      ['metadata']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const configRaw = state.metadata['derivation:config'];
    const roleSchema = state.input.roles;
    if (roleSchema === undefined || !DerivationConfigEntity.validate(configRaw)) {return;}
    const config = DerivationConfigEntity.intake(configRaw);

    const overrides = new Map<string, number>();
    const roles = roleSchema.roles;
    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index];
      if (role?.derivedFrom === undefined || role.derivedFrom === '') {continue;}
      const storedRelation = config.relations[role.name];
      const authoredRelation = storedRelation === undefined
        ? undefined
        : DerivationRelationEntity.intake(storedRelation);
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

/** Singleton task registered by createColorEngine. */
export const deriveRoleRelations = new DeriveRoleRelations();
