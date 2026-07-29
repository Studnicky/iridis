class ResolvedRolesTableRowModel {
  public readonly ariaLabel: string;
  public readonly cLabel: string;
  public readonly hex: string;
  public readonly hLabel: string;
  public readonly lLabel: string;
  public readonly name: string;

  public constructor(
    row: { readonly 'c': number; readonly 'h': number; readonly 'hex': string; readonly 'l': number; readonly 'name': string }
  ) {
    this.ariaLabel = `${row.name} ${row.hex}`;
    this.cLabel = row.c.toFixed(2);
    this.hex = row.hex;
    this.hLabel = `${row.h.toFixed(0)}°`;
    this.lLabel = row.l.toFixed(2);
    this.name = row.name;
  }
}

export const buildResolvedRolesTableModel = class ResolvedRolesTableModelBuilder {
  public static build(
    rows: readonly { readonly 'c': number; readonly 'h': number; readonly 'hex': string; readonly 'l': number; readonly 'name': string }[]
  ): readonly ResolvedRolesTableRowModel[] {
    const models: ResolvedRolesTableRowModel[] = [];
    for (const row of rows) {
      models.push(new ResolvedRolesTableRowModel(row));
    }
    return models;
  }
};
