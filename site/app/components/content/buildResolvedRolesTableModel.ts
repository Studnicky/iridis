type ResolvedRoleRow = {
  readonly c: number;
  readonly h: number;
  readonly hex: string;
  readonly l: number;
  readonly name: string;
};

export type ResolvedRolesTableRowModel = {
  readonly ariaLabel: string;
  readonly cLabel: string;
  readonly hLabel: string;
  readonly hex: string;
  readonly lLabel: string;
  readonly name: string;
};

export function buildResolvedRolesTableModel(
  rows: readonly ResolvedRoleRow[]
): readonly ResolvedRolesTableRowModel[] {
  return rows.map((row) => {
    return {
      ariaLabel: `${row.name} ${row.hex}`,
      cLabel: row.c.toFixed(2),
      hLabel: `${row.h.toFixed(0)}°`,
      hex: row.hex,
      lLabel: row.l.toFixed(2),
      name: row.name
    };
  });
}
