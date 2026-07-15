import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface, TaskManifestInterfaceType
} from '@studnicky/iridis/types';

import type { DerivationConfigType } from '../composables/types/colorDerivation.ts';

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

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Writes absolute hue/hueClamp targets for success/warning/error/info onto metadata[\'core:hueTargetOverrides\'], skipped for any role with an explicit derivation relation, or entirely when metadata[\'derivation:semanticHuesEnabled\'] is false.',
    'name':        'derive:semanticHues',
    'reads':       ['input.roles', 'metadata'],
    'writes':      ['metadata']
  };

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    if (state.input.roles === undefined) {return;}
    if (state.metadata['derivation:semanticHuesEnabled'] === false) {return;}
    const config = state.metadata['derivation:config'] as DerivationConfigType | undefined;

    const overrides: Record<string, { 'hue': number; 'hueClamp': number }> = {};
    for (const role of state.input.roles.roles) {
      const targetHue = SEMANTIC_HUE[role.name];
      if (targetHue === undefined) {continue;}
      if (config?.relations[role.name] !== undefined) {continue;}
      overrides[role.name] = { 'hue': targetHue, 'hueClamp': SEMANTIC_HUE_CLAMP };
    }
    state.metadata['core:hueTargetOverrides'] = overrides;
  }
}

/** Singleton instance registered wherever the color pipeline runs (useIridis.ts). */
export const deriveSemanticHues = new DeriveSemanticHues();
