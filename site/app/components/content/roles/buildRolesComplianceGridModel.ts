class RolesComplianceGridSourceRow {
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

class RolesComplianceGridRow {
  public readonly ariaLabel: string;
  public readonly compliance: string;
  public readonly hex: string;
  public readonly name: string;
  public readonly ratio: number;
  public readonly ratioLabel: string;
  public readonly tooltip: string | undefined;

  public constructor(
    ariaLabel: string,
    compliance: string,
    hex: string,
    name: string,
    ratio: number,
    ratioLabel: string,
    tooltip: string | undefined
  ) {
    this.ariaLabel = ariaLabel;
    this.compliance = compliance;
    this.hex = hex;
    this.name = name;
    this.ratio = ratio;
    this.ratioLabel = ratioLabel;
    this.tooltip = tooltip;
  }
}

export const buildRolesComplianceGridModel = class RolesComplianceGridModel {
  public static build(
    rows: readonly RolesComplianceGridSourceRow[],
    naTooltip: string
  ): readonly RolesComplianceGridRow[] {
    const result: RolesComplianceGridRow[] = [];
    for (const row of rows) {
      result.push(new RolesComplianceGridRow(
        `${row.name} ${row.hex}`,
        row.compliance,
        row.hex,
        row.name,
        row.ratio,
        row.ratio.toFixed(2),
        row.compliance === 'n/a' ? naTooltip : undefined
      ));
    }
    return result;
  }
};
