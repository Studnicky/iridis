import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface, TaskManifestInterfaceType
} from '@studnicky/iridis/types';

import type { DerivationConfig } from '../composables/types/colorDerivation.ts';

/**
 * Semantic hue targets, applied as a BOUNDED nudge (the engine rotates each
 * role toward the target by at most SEMANTIC_HUE_CLAMP degrees). This keeps
 * success/warning/error/info rooted in the actual palette — a red-dominant
 * image yields warm-leaning semantics rather than pure green/blue that
 * appear nowhere in it.
 */
export const SEMANTIC_HUE: Record<string, number> = { 'error': 25, 'info': 230, 'success': 160, 'warning': 60 };
export const SEMANTIC_HUE_CLAMP = 90;

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
    'description': 'Writes absolute hue/hueClamp targets for success/warning/error/info onto metadata[\'core:hueTargetOverrides\'], skipped for any role with an explicit derivation relation.',
    'name':        'derive:semanticHues',
    'reads':       ['input.roles', 'metadata'],
    'writes':      ['metadata']
  };

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    if (state.input.roles === undefined) {return;}
    const config = state.metadata['derivation:config'] as DerivationConfig | undefined;

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
