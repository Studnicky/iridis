import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface, TaskManifestInterfaceType
} from '@studnicky/iridis/types';

import { deriveColors } from '../utils/colorDerivation.ts';
import type { DerivationConfig, RoleType } from '../composables/types/colorDerivation.ts';

/**
 * Apply derivation algorithms to role hues (oklch canonical only).
 * Works in linear pipeline with multiple entry points.
 */
class ApplyDerivedColors implements TaskInterface {
  readonly 'name' = 'derive:colors';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Apply derivation algorithms to role hues',
    'name':        'derive:colors',
    'reads':       ['colors', 'roles', 'metadata'],
    'writes':      ['roles']
  };

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    try {
      const derivationConfig = state.metadata['derivation:config'] as DerivationConfig | undefined;
      if (!derivationConfig || !state.colors.length) {
        console.log('[derive:colors] Skipping - no config or colors');
        return;
      }

      console.log('[derive:colors] Running with', state.colors.length, 'colors');

      // state.colors is ColorRecordInterfaceType[] - extract hex strings
      const baseHues = state.colors.map(c => c.hex);
      const derivedHues = deriveColors(baseHues, derivationConfig.roles, baseHues.length);

      console.log('[derive:colors] Derived hues:', Object.keys(derivedHues).filter(k => derivedHues[k as RoleType]?.length));

      const roles: RoleType[] = ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'accent'];
      for (const roleType of roles) {
        const derived = derivedHues[roleType];
        if (!derived?.length) continue;

        const role = state.roles[roleType];
        if (!role?.oklch) {
          console.log('[derive:colors] Role', roleType, 'missing or has no oklch');
          continue;
        }

        console.log('[derive:colors] Updating', roleType, 'hue:', role.oklch.h, '→', derived[0].hue);

        state.roles[roleType] = {
          ...role,
          oklch: { ...role.oklch, h: derived[0].hue }
        };
      }
      console.log('[derive:colors] Complete');
    } catch (e) {
      console.error('[derive:colors] Error:', e);
      throw e;
    }
  }
}

export const applyDerivedColors = new ApplyDerivedColors();
