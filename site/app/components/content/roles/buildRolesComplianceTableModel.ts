import type { RoleComplianceRowType } from './buildRolesComplianceRows.ts';

export type RolesComplianceTableRowModel = {
  readonly ariaLabel: string;
  readonly compliance: string;
  readonly hex: string;
  readonly name: string;
  readonly ratioLabel: string;
  readonly tooltip: string | undefined;
};

export function buildRolesComplianceTableModel(
  rows: readonly RoleComplianceRowType[],
  naTooltip: string
): readonly RolesComplianceTableRowModel[] {
  return rows.map((row) => {
    return {
      ariaLabel: `${row.name} ${row.hex}`,
      compliance: row.compliance,
      hex: row.hex,
      name: row.name,
      ratioLabel: row.ratio.toFixed(2),
      tooltip: row.compliance === 'n/a' ? naTooltip : undefined
    };
  });
}
