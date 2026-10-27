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
  public readonly metrics: RoleMathDerivedMetric[];

  private constructor(metrics: RoleMathDerivedMetric[]) {
    this.metrics = metrics;
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
    }

    return new RoleMathDerivedDetailsModel(metrics);
  }
};
