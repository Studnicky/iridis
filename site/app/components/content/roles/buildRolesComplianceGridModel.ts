import type { RoleComplianceRowType } from './buildRolesComplianceRows.ts';

export type RolesComplianceGridRowModel = {
  readonly ariaLabel: string;
  readonly compliance: string;
  readonly hex: string;
  readonly name: string;
  readonly ratio: number;
  readonly ratioLabel: string;
  readonly tooltip: string | undefined;
};

export function buildRolesComplianceGridModel(
  rows: readonly RoleComplianceRowType[],
  naTooltip: string
): readonly RolesComplianceGridRowModel[] {
  return rows.map((row) => {
    return {
      ariaLabel: `${row.name} ${row.hex}`,
      compliance: row.compliance,
      hex: row.hex,
      name: row.name,
      ratio: row.ratio,
      ratioLabel: row.ratio.toFixed(2),
      tooltip: row.compliance === 'n/a' ? naTooltip : undefined
    };
  });
}
