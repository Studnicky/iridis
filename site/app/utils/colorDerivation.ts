import type { HueAlgorithm, RoleRelationDerivation, VariationAlgorithm } from '../composables/types/colorDerivation.ts';

import { lerpSteps } from './lerpSteps.ts';

// --- Hue selection algorithms ---

export function getMonochromaticHues(baseHue: number): number[] {
  return [baseHue];
}

export function getComplementaryHues(baseHue: number): number[] {
  return [baseHue, (baseHue + 180) % 360];
}

export function getAnalogousHues(baseHue: number, spacing = 30): number[] {
  return [baseHue, (baseHue - spacing + 360) % 360, (baseHue + spacing) % 360];
}

export function getTriadicHues(baseHue: number): number[] {
  return [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
}

export function getTetracticHues(baseHue: number): number[] {
  return [baseHue, (baseHue + 90) % 360, (baseHue + 180) % 360, (baseHue + 270) % 360];
}

export function getSplitComplementaryHues(baseHue: number, offset = 30): number[] {
  const complement = (baseHue + 180) % 360;
  return [baseHue, (complement - offset + 360) % 360, (complement + offset) % 360];
}

export function getCompoundHues(baseHue: number, spacing = 30): number[] {
  const analogous = getAnalogousHues(baseHue, spacing);
  const complement = (baseHue + 180) % 360;
  const complementAnalogous = getAnalogousHues(complement, spacing);
  return [...analogous, ...complementAnalogous];
}

export function getFreeformHues(offsets: number[]): number[] {
  return offsets;
}

export function selectHueAlgorithm(algorithm: HueAlgorithm, baseHue: number, freeformOffsets?: number[]): number[] {
  switch (algorithm) {
    case 'monochromatic': return getMonochromaticHues(baseHue);
    case 'complementary': return getComplementaryHues(baseHue);
    case 'analogous': return getAnalogousHues(baseHue);
    case 'triadic': return getTriadicHues(baseHue);
    case 'tetradic': return getTetracticHues(baseHue);
    case 'split-complementary': return getSplitComplementaryHues(baseHue);
    case 'compound': return getCompoundHues(baseHue);
    case 'freeform': return getFreeformHues(freeformOffsets ?? [0]);
    default: return [baseHue];
  }
}

// --- Variation algorithms ---

export interface HueLightness {
  hue: number;
  lightness: number;
}

export interface HueSaturation {
  hue: number;
  saturation: number;
}

export interface HueVariation {
  hue: number;
  lightness?: number;
  saturation?: number;
}

export function applyTintsShadesVariation(hues: number[], count = 5): HueLightness[] {
  const result: HueLightness[] = [];
  if (count <= 0) {return result;}
  const lightnessValues = count === 5
    ? [20, 35, 50, 65, 80]
    : lerpSteps(20, 80, count);
  for (const hue of hues) {
    for (const lightness of lightnessValues) {
      result.push({ hue, lightness });
    }
  }
  return result;
}

export function applySaturationGradient(hues: number[], count = 5): HueSaturation[] {
  const result: HueSaturation[] = [];
  if (count <= 0) {return result;}
  const saturationValues = lerpSteps(0, 100, count, 100);
  for (const hue of hues) {
    for (const saturation of saturationValues) {
      result.push({ hue, saturation });
    }
  }
  return result;
}

export function applyValueGradient(hues: number[], count = 5): HueLightness[] {
  const result: HueLightness[] = [];
  if (count <= 0) {return result;}
  const lightnessValues = lerpSteps(30, 90, count);
  for (const hue of hues) {
    for (const lightness of lightnessValues) {
      result.push({ hue, lightness });
    }
  }
  return result;
}

export function applyVariationAlgorithms(
  hues: number[],
  algorithms: VariationAlgorithm[],
  count = 5
): HueVariation[] {
  let working: HueVariation[] = hues.map((hue) => ({ hue, 'lightness': 50 }));

  for (const algo of algorithms) {
    const currentHues = working.map((w) => w.hue);
    if (algo === 'tints-shades') {
      working = applyTintsShadesVariation(currentHues, count);
    } else if (algo === 'saturation-gradient') {
      working = applySaturationGradient(currentHues, count);
    } else if (algo === 'value-gradient') {
      working = applyValueGradient(currentHues, count);
    }
  }
  return working;
}

// --- Per-relation resolution (parent→child derivedFrom edges) ---

/**
 * Every relation this codebase resolves goes through this function, whether
 * or not the user has customized it — so there is exactly one path from
 * picker to pipeline, never a second, silent fallback that can drift out of
 * sync with what the UI shows. An unset relation defaults to 'freeform'
 * seeded with the schema's own hueOffset, reproducing today's fixed output
 * exactly until the user changes it.
 */
export function effectiveRelation(
  schemaHueOffset: number | undefined,
  relation: RoleRelationDerivation | undefined
): RoleRelationDerivation {
  if (relation !== undefined) {return relation;}
  return { 'freeformOffset': schemaHueOffset ?? 0, 'hueAlgorithm': 'freeform', 'hueVariantIndex': 0 };
}

/** The relative hue offset (in degrees, from the parent role's own hue) a resolved relation produces. */
export function resolveHueOffset(relation: RoleRelationDerivation): number {
  if (relation.hueAlgorithm === 'freeform') {return relation.freeformOffset ?? 0;}
  const offsets = selectHueAlgorithm(relation.hueAlgorithm, 0);
  const index = ((relation.hueVariantIndex % offsets.length) + offsets.length) % offsets.length;
  return offsets[index] ?? 0;
}

/** Human-readable label for one of an algorithm's candidate hue slots, e.g. "Base (0°)" / "+30°" / "-30°". */
export function hueVariantLabel(offsetDeg: number): string {
  if (offsetDeg === 0) {return 'Base (0°)';}
  const rounded = Math.round(offsetDeg);
  return `${rounded > 0 ? '+' : ''}${rounded}°`;
}

/** Wraps a hue in degrees into [0, 360). */
export function normalizeHue(hueDeg: number): number {
  return ((hueDeg % 360) + 360) % 360;
}

/** Shortest angular distance between two hues in degrees, always in [0, 180]. */
export function hueCircularDistance(a: number, b: number): number {
  const diff = Math.abs(normalizeHue(a) - normalizeHue(b));
  return Math.min(diff, 360 - diff);
}
