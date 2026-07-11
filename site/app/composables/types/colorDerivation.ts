export type HueAlgorithm = 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'split-complementary' | 'compound' | 'freeform';
export type VariationAlgorithm = 'tints-shades' | 'saturation-gradient' | 'value-gradient';
export type DerivationStrategyPreset = 'automatic' | 'brand-focused' | 'accessible' | 'custom';
export type RoleType = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';

export interface RoleDerivation {
  hueAlgorithm: HueAlgorithm;
  variationAlgorithms: VariationAlgorithm[];
  freeformOffsets?: number[]; // Only used when hueAlgorithm === 'freeform'
}

export interface DerivationConfig {
  strategy: DerivationStrategyPreset;
  roles: Record<RoleType, RoleDerivation>;
}

// Preset defaults
export const PRESET_DEFAULTS: Record<DerivationStrategyPreset, DerivationConfig> = {
  'automatic': {
    strategy: 'automatic',
    roles: {
      'primary': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades'] },
      'success': { hueAlgorithm: 'analogous', variationAlgorithms: ['value-gradient', 'tints-shades'] },
      'warning': { hueAlgorithm: 'split-complementary', variationAlgorithms: ['saturation-gradient', 'tints-shades'] },
      'error': { hueAlgorithm: 'complementary', variationAlgorithms: ['tints-shades'] },
      'info': { hueAlgorithm: 'analogous', variationAlgorithms: ['value-gradient', 'tints-shades'] },
      'neutral': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['saturation-gradient'] },
      'accent': { hueAlgorithm: 'split-complementary', variationAlgorithms: ['saturation-gradient', 'tints-shades'] }
    }
  },
  'brand-focused': {
    strategy: 'brand-focused',
    roles: {
      'primary': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades'] },
      'success': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades'] },
      'warning': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades'] },
      'error': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades'] },
      'info': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades'] },
      'neutral': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['saturation-gradient'] },
      'accent': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades'] }
    }
  },
  'accessible': {
    strategy: 'accessible',
    roles: {
      'primary': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades', 'value-gradient'] },
      'success': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades', 'value-gradient'] },
      'warning': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades', 'value-gradient'] },
      'error': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades', 'value-gradient'] },
      'info': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades', 'value-gradient'] },
      'neutral': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['saturation-gradient', 'value-gradient'] },
      'accent': { hueAlgorithm: 'monochromatic', variationAlgorithms: ['tints-shades', 'value-gradient'] }
    }
  },
  'custom': {
    strategy: 'custom',
    roles: {} as Record<RoleType, RoleDerivation> // User will configure per-role
  }
};
