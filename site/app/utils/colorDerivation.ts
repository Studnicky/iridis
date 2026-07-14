import type { HueAlgorithm, RoleDerivation, RoleType, VariationAlgorithm } from '../composables/types/colorDerivation.ts';

import { colorRecordFactory } from '@studnicky/iridis';

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

// --- Hex to hue conversion ---

function hexToHue(hex: string): number {
  const record = colorRecordFactory.fromHex(hex);
  return record.oklch.h ?? 0;
}

// --- Main composition ---

export function deriveColors(
  baseHues: string[],
  roleDerivations: Record<RoleType, RoleDerivation>,
  count: number
): Record<RoleType, HueVariation[]> {
  const result = {} as Record<RoleType, HueVariation[]>;
  const roles: RoleType[] = ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'accent'];

  for (let i = 0; i < roles.length && i < baseHues.length; i += 1) {
    const role = roles[i]!;
    const baseHex = baseHues[i]!;
    const hue = hexToHue(baseHex);

    const roleConfig = roleDerivations[role];
    if (!roleConfig) {continue;}

    const derivedHues = selectHueAlgorithm(roleConfig.hueAlgorithm, hue, roleConfig.freeformOffsets);
    result[role] = applyVariationAlgorithms(derivedHues, roleConfig.variationAlgorithms, count);
  }

  return result;
}
