import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface
} from '@studnicky/iridis';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';

import { DerivationConfigInterfaceTypeEntity } from '../composables/entities/DerivationConfigInterfaceTypeEntity.ts';
import { SEMANTIC_HUE } from './semanticHue.ts';
import { SEMANTIC_HUE_CLAMP } from './semanticHueClamp.ts';

/**
 * Writes `hue`/`hueClamp` overrides for success/warning/error/info onto
 * `metadata['core:hueTargetOverrides']`, for `resolve:roles` (a direct role)
 * or `expand:family` (a derived one) to apply in place of the schema's own
 * values — skipped for any role the user has explicitly assigned a
 * derivation relation to via the Derivation Relations card, so an explicit
 * per-relation choice wins over this built-in semantic nudge rather than
 * being silently overridden by it.
 *
 * Writes to metadata rather than mutating `state.input.roles` directly —
 * `state.input` stays the pristine original schema throughout the pipeline.
 */
class DeriveSemanticHues implements TaskInterface {
  readonly 'name' = 'derive:semanticHues';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Writes absolute hue/hueClamp targets for success/warning/error/info onto metadata[\'core:hueTargetOverrides\'], skipped for any role with an explicit derivation relation, or entirely when metadata[\'derivation:semanticHuesEnabled\'] is false.',
    'name':        'derive:semanticHues',
    'reads':       ['input.roles', 'metadata'],
    'writes':      ['metadata']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const roleSchema = state.input.roles;
    if (roleSchema === undefined) {return;}
    if (state.metadata['derivation:semanticHuesEnabled'] === false) {return;}
    const configRaw = state.metadata['derivation:config'];
    const config = DerivationConfigInterfaceTypeEntity.validate(configRaw)
      ? DerivationConfigInterfaceTypeEntity.intake(configRaw)
      : undefined;

    const overrides = new Map<string, { 'hue': number; 'hueClamp': number }>();
    const roles = roleSchema.roles;
    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index];
      if (role === undefined) {continue;}
      const targetHue = SEMANTIC_HUE[role.name];
      if (targetHue === undefined) {continue;}
      if (config?.relations[role.name] !== undefined) {continue;}
      overrides.set(role.name, { 'hue': targetHue, 'hueClamp': SEMANTIC_HUE_CLAMP });
    }
    const serializedOverrides: Record<string, { 'hue': number; 'hueClamp': number }> = {};
    overrides.forEach((override, name) => {
      Object.defineProperty(serializedOverrides, name, { 'configurable': true, 'enumerable': true, 'value': override, 'writable': true });
    });
    state.metadata['core:hueTargetOverrides'] = serializedOverrides;
  }
}

/** Singleton instance registered wherever the color pipeline runs (useIridis.ts). */
export const deriveSemanticHues = new DeriveSemanticHues();
