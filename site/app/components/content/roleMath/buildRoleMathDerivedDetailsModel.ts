import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

class RoleMathDerivedMetric {
  public readonly label: string;
  public readonly value: string;

  public constructor(label: string, value: string) {
    this.label = label;
    this.value = value;
  }
}

export const buildRoleMathDerivedDetailsModel = class RoleMathDerivedDetailsModel {
  public readonly algorithmSummary: string | null;
  public readonly metrics: RoleMathDerivedMetric[];

  private constructor(algorithmSummary: string | null, metrics: RoleMathDerivedMetric[]) {
    this.algorithmSummary = algorithmSummary;
    this.metrics = metrics;
  }

  private static algorithmSummary(role: RoleMathEntryType): string | null {
    const algorithmInfo = role.algorithmInfo;
    if (algorithmInfo === null) {
      return null;
    }
    const computedHues: string[] = [];
    for (const hue of algorithmInfo.computedHues) {
      computedHues.push(`${Math.round(hue)}°`);
    }
    return `Seed hue ${Math.round(algorithmInfo.baseHue)}° → computed ${computedHues.join(', ')}`;
  }

  public static build(role: RoleMathEntryType): RoleMathDerivedDetailsModel {
    const metrics: RoleMathDerivedMetric[] = [];
    const definition = role.def;
    if (definition !== undefined) {
      if (definition.lightnessTarget !== undefined) {
        metrics.push(new RoleMathDerivedMetric(
          'Lightness Target',
          definition.lightnessTarget.toFixed(3)
        ));
      }
      if (definition.lightnessClamp !== undefined) {
        metrics.push(new RoleMathDerivedMetric(
          'Lightness Clamp',
          definition.lightnessClamp.toFixed(3)
        ));
      }
      if (definition.chromaTarget !== undefined) {
        metrics.push(new RoleMathDerivedMetric(
          'Chroma Target',
          definition.chromaTarget.toFixed(3)
        ));
      }
      if (definition.chromaClamp !== undefined) {
        metrics.push(new RoleMathDerivedMetric(
          'Chroma Clamp',
          definition.chromaClamp.toFixed(3)
        ));
      }
      if (definition.hue !== undefined) {
        metrics.push(new RoleMathDerivedMetric('Hue Angle', `${definition.hue}°`));
      }
      if (definition.hueClamp !== undefined) {
        metrics.push(new RoleMathDerivedMetric('Hue Clamp', `${definition.hueClamp}°`));
      }
    }

    return new RoleMathDerivedDetailsModel(
      RoleMathDerivedDetailsModel.algorithmSummary(role),
      metrics
    );
  }
};
