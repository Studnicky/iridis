import type { RoleSortableRowInterfaceTypeEntity } from '~/composables/entities/RoleSortableRowInterfaceTypeEntity.ts';

class ResolvedRoleTableColumn {
  public readonly accessorKey: string;
  public readonly header: string;

  public constructor(
    accessorKey: string,
    header: string
  ) {
    this.accessorKey = accessorKey;
    this.header = header;
  }
}

class ResolvedRoleTablePanelModel {
  public readonly columns: readonly ResolvedRoleTableColumn[];
  public readonly label: string;
  public readonly rows: readonly (RoleSortableRowInterfaceTypeEntity.Type & { readonly 'hex': string })[];

  public constructor(
    columns: readonly ResolvedRoleTableColumn[],
    label: string,
    rows: readonly (RoleSortableRowInterfaceTypeEntity.Type & { readonly 'hex': string })[]
  ) {
    this.columns = columns;
    this.label = label;
    this.rows = rows;
  }
}

export const buildResolvedRoleTablePanelModel = class ResolvedRoleTablePanelModelBuilder {
  private static readonly columns = [
    new ResolvedRoleTableColumn('name', 'Role'),
    new ResolvedRoleTableColumn('hex', 'Hex'),
    new ResolvedRoleTableColumn('ratio', 'Ratio'),
    new ResolvedRoleTableColumn('compliance', 'Compliance')
  ];

  public static build(
    rows: readonly (RoleSortableRowInterfaceTypeEntity.Type & { readonly 'hex': string })[],
    visibleCount: number
  ): ResolvedRoleTablePanelModel {
    const visibleRows = rows.slice(0, visibleCount);
    return new ResolvedRoleTablePanelModel(
      ResolvedRoleTablePanelModelBuilder.columns,
      `UTable — top of the current sort (${visibleRows.length} of ${rows.length} roles)`,
      visibleRows
    );
  }
};
