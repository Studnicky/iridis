import type { RoleSortableRowType } from '~/composables/types/roleSortableRow.ts';

type ResolvedRoleTableRow = RoleSortableRowType & { readonly hex: string };

type ResolvedRoleTableColumn = {
  readonly accessorKey: 'name' | 'hex' | 'ratio' | 'compliance';
  readonly header: string;
};

export type ResolvedRoleTablePanelModel = {
  readonly columns: readonly ResolvedRoleTableColumn[];
  readonly label: string;
  readonly rows: readonly ResolvedRoleTableRow[];
};

const TABLE_COLUMNS = [
  { 'accessorKey': 'name', 'header': 'Role' },
  { 'accessorKey': 'hex', 'header': 'Hex' },
  { 'accessorKey': 'ratio', 'header': 'Ratio' },
  { 'accessorKey': 'compliance', 'header': 'Compliance' }
] as const satisfies readonly ResolvedRoleTableColumn[];

export function buildResolvedRoleTablePanelModel(
  rows: readonly ResolvedRoleTableRow[],
  visibleCount: number
): ResolvedRoleTablePanelModel {
  const visibleRows = rows.slice(0, visibleCount);

  return {
    columns: TABLE_COLUMNS,
    label: `UTable — top of the current sort (${visibleRows.length} of ${rows.length} roles)`,
    rows: visibleRows
  };
}
