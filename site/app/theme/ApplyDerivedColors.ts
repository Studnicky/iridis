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
    const derivationConfig = state.metadata['derivation:config'] as DerivationConfig | undefined;
    if (!derivationConfig || !state.colors.length) return;

    // state.colors is ColorRecordInterfaceType[] - extract hex strings
    const baseHues = state.colors.map(c => c.hex);
    const derivedHues = deriveColors(baseHues, derivationConfig.roles, baseHues.length);

    const roles: RoleType[] = ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'accent'];
    for (const roleType of roles) {
      const derived = derivedHues[roleType];
      if (!derived?.length) continue;

      const role = state.roles[roleType];
      if (!role?.oklch) continue;

      state.roles[roleType] = {
        ...role,
        oklch: { ...role.oklch, h: derived[0].hue }
      };
    }
  }
}

export const applyDerivedColors = new ApplyDerivedColors();
