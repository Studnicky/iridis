import type { ApcaPairResultSetInterfaceType, WcagPairResultSetInterfaceType } from '@studnicky/iridis-contrast';

class SchemaStageSummary {
  public readonly color: 'success' | 'warning';
  public readonly key: string;
  public readonly label: string;
  public readonly text: string;

  public constructor(
    color: 'success' | 'warning',
    key: string,
    label: string,
    text: string
  ) {
    this.color = color;
    this.key = key;
    this.label = label;
    this.text = text;
  }
}

export const buildSchemaComplianceSummaries = class SchemaComplianceSummariesBuilder {
  private static buildSummary(
    key: string,
    label: string,
    report: ApcaPairResultSetInterfaceType | WcagPairResultSetInterfaceType
  ): SchemaStageSummary {
    let passing = 0;
    for (const pair of report.pairs) {
      if (pair.pass) {
        passing += 1;
      }
    }
    return new SchemaStageSummary(
      passing === report.pairs.length ? 'success' : 'warning',
      key,
      label,
      `${passing}/${report.pairs.length} pairs passing`
    );
  }

  public static build(
    enabledStageNames: ReadonlySet<string>,
    aa: WcagPairResultSetInterfaceType | undefined,
    aaa: WcagPairResultSetInterfaceType | undefined,
    apca: ApcaPairResultSetInterfaceType | undefined
  ): SchemaStageSummary[] {
    const summaries: SchemaStageSummary[] = [];
    if (enabledStageNames.has('enforce:wcagAA') && aa !== undefined) {
      summaries.push(SchemaComplianceSummariesBuilder.buildSummary('aa', 'WCAG AA', aa));
    }
    if (enabledStageNames.has('enforce:wcagAAA') && aaa !== undefined) {
      summaries.push(SchemaComplianceSummariesBuilder.buildSummary('aaa', 'WCAG AAA', aaa));
    }
    if (enabledStageNames.has('enforce:apca') && apca !== undefined) {
      summaries.push(SchemaComplianceSummariesBuilder.buildSummary('apca', 'APCA', apca));
    }
    return summaries;
  }
};
