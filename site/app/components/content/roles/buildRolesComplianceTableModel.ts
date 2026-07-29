class RolesComplianceTableSourceRow {
  public readonly compliance: string;
  public readonly hex: string;
  public readonly name: string;
  public readonly ratio: number;

  public constructor(compliance: string, hex: string, name: string, ratio: number) {
    this.compliance = compliance;
    this.hex = hex;
    this.name = name;
    this.ratio = ratio;
  }
}

class RolesComplianceTableRow {
  public readonly ariaLabel: string;
  public readonly compliance: string;
  public readonly hex: string;
  public readonly name: string;
  public readonly ratioLabel: string;
  public readonly tooltip: string | undefined;

  public constructor(
    ariaLabel: string,
    compliance: string,
    hex: string,
    name: string,
    ratioLabel: string,
    tooltip: string | undefined
  ) {
    this.ariaLabel = ariaLabel;
    this.compliance = compliance;
    this.hex = hex;
    this.name = name;
    this.ratioLabel = ratioLabel;
    this.tooltip = tooltip;
  }
}

export const buildRolesComplianceTableModel = class RolesComplianceTableModel {
  public static build(
    rows: readonly RolesComplianceTableSourceRow[],
    naTooltip: string
  ): readonly RolesComplianceTableRow[] {
    const result: RolesComplianceTableRow[] = [];
    for (const row of rows) {
      result.push(new RolesComplianceTableRow(
        `${row.name} ${row.hex}`,
        row.compliance,
        row.hex,
        row.name,
        row.ratio.toFixed(2),
        row.compliance === 'n/a' ? naTooltip : undefined
      ));
    }
    return result;
  }
};
