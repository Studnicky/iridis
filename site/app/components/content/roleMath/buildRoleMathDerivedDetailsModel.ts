import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

export type RoleMathDerivedMetric = {
  readonly label: string;
  readonly value: string;
};

export type RoleMathDerivedDetailsModel = {
  readonly metrics: readonly RoleMathDerivedMetric[];
  readonly algorithmSummary: string | null;
};

export function buildRoleMathDerivedDetailsModel(
  role: RoleMathEntryType
): RoleMathDerivedDetailsModel {
  const metrics: RoleMathDerivedMetric[] = [];

  if (role.def?.lightnessTarget !== undefined) {
    metrics.push({ label: 'Lightness Target', value: role.def.lightnessTarget.toFixed(3) });
  }
  if (role.def?.lightnessClamp !== undefined) {
    metrics.push({ label: 'Lightness Clamp', value: role.def.lightnessClamp.toFixed(3) });
  }
  if (role.def?.chromaTarget !== undefined) {
    metrics.push({ label: 'Chroma Target', value: role.def.chromaTarget.toFixed(3) });
  }
  if (role.def?.chromaClamp !== undefined) {
    metrics.push({ label: 'Chroma Clamp', value: role.def.chromaClamp.toFixed(3) });
  }
  if (role.def?.hue !== undefined) {
    metrics.push({ label: 'Hue Angle', value: `${role.def.hue}°` });
  }
  if (role.def?.hueClamp !== undefined) {
    metrics.push({ label: 'Hue Clamp', value: `${role.def.hueClamp}°` });
  }

  return {
    metrics,
    algorithmSummary: role.algorithmInfo
      ? `Seed hue ${Math.round(role.algorithmInfo.baseHue)}° → computed ${role.algorithmInfo.computedHues.map((hue) => `${Math.round(hue)}°`).join(', ')}`
      : null
  };
}
