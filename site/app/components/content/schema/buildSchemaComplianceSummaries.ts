import type { ApcaPairResultSetInterfaceTypeEntity, WcagPairResultSetInterfaceTypeEntity } from '@studnicky/iridis-contrast';

class SchemaContrastReports {
  public readonly aa: WcagPairResultSetInterfaceTypeEntity.Type | undefined;
  public readonly aaa: WcagPairResultSetInterfaceTypeEntity.Type | undefined;
  public readonly apca: ApcaPairResultSetInterfaceTypeEntity.Type | undefined;
}

abstract class SchemaComplianceStatus {
  public abstract get color(): 'success' | 'warning';

  public static resolve(passing: number, total: number): SchemaComplianceStatus {
    const result = passing === total ? new SchemaComplianceSuccessStatus() : new SchemaComplianceWarningStatus();
    return result;
  }
}

class SchemaComplianceSuccessStatus extends SchemaComplianceStatus {
  public get color(): 'success' {
    const result = 'success';
    return result;
  }
}

class SchemaComplianceWarningStatus extends SchemaComplianceStatus {
  public get color(): 'warning' {
    const result = 'warning';
    return result;
  }
}

class SchemaStageSummary {
  readonly #status: SchemaComplianceStatus;
  public readonly key: string;
  public readonly label: string;
  public readonly text: string;

  public constructor(
    status: SchemaComplianceStatus,
    key: string,
    label: string,
    text: string
  ) {
    this.#status = status;
    this.key = key;
    this.label = label;
    this.text = text;
  }

  public get color(): 'success' | 'warning' {
    const result = this.#status.color;
    return result;
  }
}

export const buildSchemaComplianceSummaries = class SchemaComplianceSummariesBuilder {
  private static buildSummary(
    key: string,
    label: string,
    report: ApcaPairResultSetInterfaceTypeEntity.Type | WcagPairResultSetInterfaceTypeEntity.Type
  ): SchemaStageSummary {
    let passing = 0;
    for (const pair of report.pairs) {
      if (pair.pass) {
        passing += 1;
      }
    }
    const result = new SchemaStageSummary(
      SchemaComplianceStatus.resolve(passing, report.pairs.length),
      key,
      label,
      `${passing}/${report.pairs.length} pairs passing`
    );
    return result;
  }

  public static build(
    enabledStageNames: ReadonlySet<string>,
    reports: SchemaContrastReports
  ): SchemaStageSummary[] {
    const summaries: SchemaStageSummary[] = [];
    if (enabledStageNames.has('enforce:wcagAA') && reports.aa !== undefined) {
      summaries.push(SchemaComplianceSummariesBuilder.buildSummary('aa', 'WCAG AA', reports.aa));
    }
    if (enabledStageNames.has('enforce:wcagAAA') && reports.aaa !== undefined) {
      summaries.push(SchemaComplianceSummariesBuilder.buildSummary('aaa', 'WCAG AAA', reports.aaa));
    }
    if (enabledStageNames.has('enforce:apca') && reports.apca !== undefined) {
      summaries.push(SchemaComplianceSummariesBuilder.buildSummary('apca', 'APCA', reports.apca));
    }
    return summaries;
  }
};
