import type { ComplianceReportViewInterfaceTypeEntity } from '~/composables/entities/ComplianceReportViewInterfaceTypeEntity.ts';

import { AccessibilityBlockers } from '~/composables/accessibilityBlockers.ts';

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
  public static build(report: ComplianceReportViewInterfaceTypeEntity.Type | undefined): SchemaStageSummary[] {
    const summaries: SchemaStageSummary[] = [];
    if (report !== undefined) {
      const passing = report.pairs.length - report.blockedPairs.length;
      summaries.push(new SchemaStageSummary(
        SchemaComplianceStatus.resolve(passing, report.pairs.length),
        'compliance',
        AccessibilityBlockers.standardLabel(report.selected.algorithm, report.selected.level),
        `${passing}/${report.pairs.length} pairs passing`
      ));
    }
    return summaries;
  }
};
