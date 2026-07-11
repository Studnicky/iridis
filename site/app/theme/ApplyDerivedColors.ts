import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface, TaskManifestInterfaceType
} from '@studnicky/iridis/types';

import { deriveColors } from '../utils/colorDerivation.ts';
import type { DerivationConfig, RoleType } from '../composables/types/colorDerivation.ts';

/**
 * Apply derivation algorithms to role hues (oklch canonical only).
 * Consumes state.colors normalized by prior pipeline tasks.
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
    if (!derivationConfig || !state.colors || state.colors.length === 0) return;

    const baseHues = (state.colors as string[]);
    const derivedHues = deriveColors(baseHues, derivationConfig.roles, baseHues.length);

    const roles: RoleType[] = ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'accent'];
    for (const roleType of roles) {
      const derived = derivedHues[roleType];
      if (!derived?.length) continue;

      const role = (state.roles as any)[roleType];
      if (!role?.oklch) continue;

      (state.roles as any)[roleType] = {
        ...role,
        oklch: { ...role.oklch, h: derived[0].hue }
      };
    }
  }
}

export const applyDerivedColors = new ApplyDerivedColors();
