import type { ContrastFeasibilityReportEntity } from '@studnicky/iridis-contrast';

abstract class SchemaFeasibilityStatus {
  public abstract get color(): 'error' | 'neutral' | 'success' | 'warning';
  public abstract get label(): string;
}

class AlwaysReachableStatus extends SchemaFeasibilityStatus {
  public get color(): 'success' { return 'success'; }
  public get label(): string { return 'Always reachable'; }
}

class IndeterminateStatus extends SchemaFeasibilityStatus {
  public get color(): 'neutral' { return 'neutral'; }
  public get label(): string { return 'Indeterminate'; }
}

class NeverReachableStatus extends SchemaFeasibilityStatus {
  public get color(): 'error' { return 'error'; }
  public get label(): string { return 'Never reachable'; }
}

class SomeHuesStatus extends SchemaFeasibilityStatus {
  public get color(): 'warning' { return 'warning'; }
  public get label(): string { return 'Some hues'; }
}

class SchemaFeasibilityRow {
  readonly #status: SchemaFeasibilityStatus;
  public readonly detail: string;
  public readonly id: string;
  public readonly label: string;

  private constructor(detail: string, pair: ContrastFeasibilityReportEntity.Type['pairs'][number], status: SchemaFeasibilityStatus) {
    this.#status = status;
    this.detail = detail;
    this.id = `${pair.foreground}/${pair.background}`;
    this.label = `${pair.foreground} on ${pair.background}`;
  }

  public get color(): 'error' | 'neutral' | 'success' | 'warning' {
    const result = this.#status.color;
    return result;
  }

  public get status(): string {
    const result = this.#status.label;
    return result;
  }

  public static build(pair: ContrastFeasibilityReportEntity.Type['pairs'][number]): SchemaFeasibilityRow {
    const status = SchemaFeasibilityRow.#statusByReachability[pair.reachability];
    const detail = SchemaFeasibilityRow.detail(pair);
    const result = new SchemaFeasibilityRow(detail, pair, status);
    return result;
  }

  static readonly #statusByReachability: Readonly<Record<ContrastFeasibilityReportEntity.Type['pairs'][number]['reachability'], SchemaFeasibilityStatus>> = {
    'always-reachable': new AlwaysReachableStatus(),
    'indeterminate': new IndeterminateStatus(),
    'never-reachable': new NeverReachableStatus(),
    'reachable-only-for-some-hues': new SomeHuesStatus()
  };

  private static detail(pair: ContrastFeasibilityReportEntity.Type['pairs'][number]): string {
    if (pair.reachability === 'always-reachable') {
      const result = '';
      return result;
    }
    if (pair.reachability === 'never-reachable') {
      const result = SchemaFeasibilityRow.proof(pair);
      return result;
    }
    if (pair.reachability === 'reachable-only-for-some-hues') {
      const result = SchemaFeasibilityRow.ranges(pair);
      return result;
    }
    const result = SchemaFeasibilityRow.sample(pair);
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
