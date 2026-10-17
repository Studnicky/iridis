import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface
} from '@studnicky/iridis';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';

import type { DerivationConfigType } from '../composables/types/colorDerivation.ts';

import { effectiveRelation } from '../utils/effectiveRelation.ts';
import { resolveHueOffset } from '../utils/resolveHueOffset.ts';

/**
 * Computes each `derivedFrom` role's effective hueOffset from the user's
 * per-relation hue-algorithm choice (monochromatic/complementary/analogous/
 * .../freeform — set via the Derivation Relations card), writing it to
 * `metadata['core:hueOffsetOverrides']` for `expand:family` (core) to apply
 * in place of the schema's own hueOffset.
 *
 * Writes to metadata rather than mutating `state.input.roles` directly —
 * `state.input` stays the pristine original schema throughout the pipeline,
 * exactly as every other task expects it to.
 *
 * A relation the user hasn't touched resolves to 'freeform' seeded with the
 * schema's own hueOffset (see effectiveRelation()), reproducing today's
 * fixed output exactly until customized — there is exactly one resolution
 * path from picker to pipeline, never a second, silent fallback.
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
    const config = state.metadata['derivation:config'] as DerivationConfigType | undefined;
    const roleSchema = state.input.roles;
    if (config === undefined || roleSchema === undefined) {return;}

    const overrides = new Map<string, number>();
    const roles = roleSchema.roles;
    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index];
      if (role?.derivedFrom === undefined || role.derivedFrom === '') {continue;}
      const relation = effectiveRelation(role.hueOffset, config.relations[role.name]);
      overrides.set(role.name, resolveHueOffset(relation));
    }
    const serializedOverrides: Record<string, number> = {};
    overrides.forEach((offset, name) => {
      Object.defineProperty(serializedOverrides, name, { 'configurable': true, 'enumerable': true, 'value': offset, 'writable': true });
    });
    state.metadata['core:hueOffsetOverrides'] = serializedOverrides;
  }
}

/** Singleton instance registered wherever the color pipeline runs (useIridis.ts). */
export const deriveRoleRelations = new DeriveRoleRelations();
