import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface, TaskManifestInterfaceType
} from '@studnicky/iridis/types';

import { deriveColors } from '../utils/colorDerivation.ts';
import type { DerivationConfig, RoleType } from '../composables/types/colorDerivation.ts';

/**
 * Applies user-selected color derivation algorithms to transform role hues.
 * Modifies oklch hue only (canonical representation).
 * Hex is a projection that the engine derives automatically.
 */
class ApplyDerivedColors implements TaskInterface {
  readonly 'name' = 'derive:colors';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Apply derivation algorithms to role hues (oklch canonical)',
    'name':        'derive:colors',
    'reads':       ['colors', 'roles', 'metadata'],
    'writes':      ['roles']
  };

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    const derivationConfig = state.metadata['derivation:config'] as DerivationConfig | undefined;
    if (!derivationConfig) return;
    if (!state.colors || state.colors.length === 0) return;

    // Picker mode: state.colors = [{hex: string}, ...]
    const baseHues = (state.colors as any[]).map((c: any) => c.hex);
    const derivedHues = deriveColors(baseHues, derivationConfig.roles, baseHues.length);

    // Apply derived hues to roles (oklch only)
    const roles: RoleType[] = ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'accent'];
    for (const roleType of roles) {
      const derived = derivedHues[roleType];
      if (!derived?.length) continue;

      const role = (state.roles as any)[roleType];
      if (!role?.oklch) continue;

      const newHue = derived[0].hue;
      (state.roles as any)[roleType] = {
        ...role,
        oklch: { ...role.oklch, h: newHue }
      };
    }
  }
}

export const applyDerivedColors = new ApplyDerivedColors();
