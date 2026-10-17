import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

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

  private static algorithmSummary(role: RoleMathEntry): string | null {
    const algorithmInfo = role.algorithmInfo;
    if (algorithmInfo === null) {
      return null;
    }
    const computedHues: string[] = [];
    for (let index = 0; index < algorithmInfo.computedHues.length; index += 1) {
      const hue = algorithmInfo.computedHues[index];
      if (hue !== undefined) {
        computedHues.push(`${Math.round(hue)}°`);
      }
    }
    return `Seed hue ${Math.round(algorithmInfo.baseHue)}° → computed ${computedHues.join(', ')}`;
  }

  public static build(role: RoleMathEntry): RoleMathDerivedDetailsModel {
    const metrics: RoleMathDerivedMetric[] = [];
    const definition = role.def;
    if (definition !== undefined) {
      if (definition.lightnessRange !== undefined) {
        metrics.push(new RoleMathDerivedMetric(
          'Lightness Range',
          `${definition.lightnessRange[0].toFixed(3)}–${definition.lightnessRange[1].toFixed(3)}`
        ));
      }
      if (definition.chromaRange !== undefined) {
        metrics.push(new RoleMathDerivedMetric(
          'Chroma Range',
          `${definition.chromaRange[0].toFixed(3)}–${definition.chromaRange[1].toFixed(3)}`
        ));
      }
      if (definition.lightnessOffset !== undefined) {
        metrics.push(new RoleMathDerivedMetric(
          'Lightness Offset',
          definition.lightnessOffset.toFixed(3)
        ));
      }
      if (definition.chromaScale !== undefined) {
        metrics.push(new RoleMathDerivedMetric(
          'Chroma Scale',
          definition.chromaScale.toFixed(3)
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
