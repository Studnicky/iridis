import { Tokens } from '../theme/Tokens.ts';

/** Absolute OKLCH lightness per shade — resolved through the engine, not here. */
const SHADE_L: Record<number, number> = {
  '100': 0.955, '200': 0.915, '300': 0.855, '400': 0.775, '50': 0.985, '500': 0.685,
  '600': 0.595, '700': 0.505, '800': 0.415, '900': 0.335, '950': 0.235
};

/**
 * The s50…s950 tonal-ramp config passed as `metadata['core:variantConfig']` —
 * shared by the live palette pipeline (useIridis) and the export pipeline
 * (useMultiOutput) so both derive:variant passes produce the identical ramp.
 */
export const VARIANT_CONFIG = Tokens.SHADE_KEYS.map((s) => {return { 'invertLightness': false, 'lightnessTarget': SHADE_L[s]!, 'name': `s${s}` };});
