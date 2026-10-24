import type { ContrastFeasibilityReportEntity } from '@studnicky/iridis-contrast';

class SchemaFeasibilityRow {
  public readonly detail: string;
  public readonly id: string;
  public readonly label: string;
  public readonly status: string;

  private constructor(detail: string, pair: ContrastFeasibilityReportEntity.Type['pairs'][number], status: string) {
    this.detail = detail;
    this.id = `${pair.foreground}/${pair.background}`;
    this.label = `${pair.foreground} on ${pair.background}`;
    this.status = status;
  }

  public static build(pair: ContrastFeasibilityReportEntity.Type['pairs'][number]): SchemaFeasibilityRow {
    if (pair.reachability === 'always-reachable') {
      const result = new SchemaFeasibilityRow('', pair, 'Always reachable');
      return result;
    }
    if (pair.reachability === 'never-reachable') {
      const result = new SchemaFeasibilityRow(SchemaFeasibilityRow.proof(pair), pair, 'Never reachable');
      return result;
    }
    if (pair.reachability === 'reachable-only-for-some-hues') {
      const result = new SchemaFeasibilityRow(SchemaFeasibilityRow.ranges(pair), pair, 'Some hues');
      return result;
    }
    const result = new SchemaFeasibilityRow(SchemaFeasibilityRow.sample(pair), pair, 'Indeterminate');
    return result;
  }

  private static proof(pair: ContrastFeasibilityReportEntity.Type['pairs'][number]): string {
    if (pair.proof === undefined) {
      const result = '';
      return result;
    }
    const limits = pair.proof.limitingBounds.map((bound) => {
      const result = `${bound.role} ${bound.channel} ${bound.edge} ${bound.value.toFixed(2)}`;
      return result;
    });
    const result = `Best ${pair.proof.bestActual.toFixed(2)}; limited by ${limits.join(', ')}`;
    return result;
  }

  private static ranges(pair: ContrastFeasibilityReportEntity.Type['pairs'][number]): string {
    const ranges = pair.reachableHueRanges.map((range) => {
      const result = `${range.start.toFixed(0)}°–${range.end.toFixed(0)}°`;
      return result;
    });
    const result = `Reachable at ${ranges.join(', ')}`;
    return result;
  }

  private static sample(pair: ContrastFeasibilityReportEntity.Type['pairs'][number]): string {
    if (pair.sampled === undefined) {
      const result = '';
      return result;
    }
    const result = `Sampled best ${pair.sampled.bestActual.toFixed(2)}; not proof`;
    return result;
  }
}

/** Converts the engine advisory report into concise Schema-card rows. */
export const buildSchemaFeasibilityRows = class SchemaFeasibilityRowsBuilder {
  public static build(report: ContrastFeasibilityReportEntity.Type | undefined): SchemaFeasibilityRow[] {
    const result = report?.pairs.map((pair) => {
      const row = SchemaFeasibilityRow.build(pair);
      return row;
    }) ?? [];
    return result;
  }
};
