class ResolvedRolesGridValueModel {
  public readonly containerClass: string;
  public readonly hexLabel: string;
  public readonly metrics: string[];

  public constructor(containerClass: string, hexLabel: string, metrics: string[]) {
    this.containerClass = containerClass;
    this.hexLabel = hexLabel;
    this.metrics = metrics;
  }
}

export const buildResolvedRolesGridModel = class ResolvedRolesGridModelBuilder {
  private static containerClass(showTitleSlot: boolean, isTile: boolean): string {
    if (showTitleSlot) {
      return 'flex shrink-0 gap-x-2 text-[10px] text-muted';
    }
    if (isTile) {
      return 'flex gap-x-1 text-[8px] text-muted';
    }
    return 'grid grid-cols-3 gap-x-2 text-[10px] text-muted';
  }

  public static build(
    row: { readonly 'c': number; readonly 'h': number; readonly 'hex': string; readonly 'l': number },
    layout: { readonly 'showTitleSlot': boolean; readonly 'valueClass': string; readonly 'variant'?: 'tile' }
  ): ResolvedRolesGridValueModel {
    const isTile = layout.variant === 'tile';
    const metrics = isTile
      ? [row.l.toFixed(2), row.c.toFixed(2), `${row.h.toFixed(0)}°`]
      : [`L ${row.l.toFixed(2)}`, `C ${row.c.toFixed(2)}`, `H ${row.h.toFixed(0)}°`];
    return new ResolvedRolesGridValueModel(
      ResolvedRolesGridModelBuilder.containerClass(layout.showTitleSlot, isTile),
      row.hex,
      metrics
    );
  }
};
