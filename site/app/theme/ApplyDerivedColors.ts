import type {
  PaletteStateInterface, PipelineContextInterface, RoleDefinitionInterfaceType, TaskInterface, TaskManifestInterfaceType
} from '@studnicky/iridis/types';

import { colorRecordFactory } from '@studnicky/iridis';
import { deriveColors } from '../utils/colorDerivation.ts';
import type { DerivationConfig, RoleType } from '../composables/types/colorDerivation.ts';

/**
 * Applies user-selected color derivation algorithms to transform role hues.
 * Reads derivationConfig from metadata, applies the selected hue algorithm
 * for each role, and updates the resolved roles with derived hues while
 * preserving other properties (lightness range, chroma range, etc.).
 */
class ApplyDerivedColors implements TaskInterface {
  readonly 'name' = 'derive:colors';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Applies user-selected derivation algorithms (monochromatic, complementary, analogous, etc.) to transform role hues based on input seed colors.',
    'name':        'derive:colors',
    'reads':       ['colors', 'roles', 'metadata'],
    'writes':      ['roles']
  };

  run(state: PaletteStateInterface, _ctx: PipelineContextInterface): void {
    // Get derivation config from metadata, skip if not present
    const derivationConfig = state.metadata['derivation:config'] as DerivationConfig | undefined;
    if (!derivationConfig || !state.colors || state.colors.length === 0) {return;}
    if (!derivationConfig.roles) {return;}

    // Get base hues from input colors
    const baseHues = state.colors.map(c => c.hex);

    // Apply derivation algorithms to generate role hues
    const derivedHues = deriveColors(baseHues, derivationConfig.roles, baseHues.length);
    if (!derivedHues) {return;}

    // Apply derived hues to roles while preserving other properties
    const roles: RoleType[] = ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'accent'];
    for (const roleType of roles) {
      const derived = derivedHues[roleType];
      if (!derived || derived.length === 0) {continue;}

      // Update the role's color using the derived hue
      const existingColor = state.roles[roleType];
      if (!existingColor) {continue;}

      // Use the first derived hue for this role
      const firstDerived = derived[0];
      const derivedHue = firstDerived.hue;

      // Parse existing color and update hue
      const record = colorRecordFactory.fromHex(existingColor.hex || '#000000');
      const { c, l } = record.oklch;
      const updated = colorRecordFactory.fromOklch(l, c, derivedHue, { 'alpha': record.alpha });
      state.roles[roleType] = { ...existingColor, 'hex': updated.hex };
    }
  }
}

/** Singleton instance registered with the engine. */
export const applyDerivedColors = new ApplyDerivedColors();
