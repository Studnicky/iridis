import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface, TaskManifestInterfaceType
} from '@studnicky/iridis/types';

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

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Computes each derivedFrom role\'s effective hueOffset from the user-selected per-relation hue algorithm, writing overrides for expand:family to apply.',
    'name':        'derive:roleRelations',
    'reads':       ['input.roles', 'metadata'],
    'writes':      ['metadata']
  };

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    const config = state.metadata['derivation:config'] as DerivationConfigType | undefined;
    if (config === undefined || state.input.roles === undefined) {return;}

    const overrides: Record<string, number> = {};
    for (const role of state.input.roles.roles) {
      if (role.derivedFrom === undefined || role.derivedFrom === '') {continue;}
      const relation = effectiveRelation(role.hueOffset, config.relations[role.name]);
      overrides[role.name] = resolveHueOffset(relation);
    }
    state.metadata['core:hueOffsetOverrides'] = overrides;
  }
}

/** Singleton instance registered wherever the color pipeline runs (useIridis.ts). */
export const deriveRoleRelations = new DeriveRoleRelations();
