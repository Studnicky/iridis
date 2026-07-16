type ResolvedRoleLayout = {
  readonly showTitleSlot: boolean;
  readonly valueClass: string;
  readonly variant?: 'tile';
};

type ResolvedRoleRow = {
  readonly c: number;
  readonly h: number;
  readonly hex: string;
  readonly l: number;
};

export type ResolvedRolesGridValueModel = {
  readonly containerClass: string;
  readonly hexLabel: string;
  readonly metrics: readonly string[];
};

export function buildResolvedRolesGridValueModel(
  row: ResolvedRoleRow,
  layout: ResolvedRoleLayout
): ResolvedRolesGridValueModel {
  const isTile = layout.variant === 'tile';
  return {
    containerClass: layout.showTitleSlot
      ? 'flex shrink-0 gap-x-2 text-[10px] text-muted'
      : isTile
        ? 'flex gap-x-1 text-[8px] text-muted'
        : 'grid grid-cols-3 gap-x-2 text-[10px] text-muted',
    hexLabel: row.hex,
    metrics: isTile
      ? [row.l.toFixed(2), row.c.toFixed(2), `${row.h.toFixed(0)}°`]
      : [`L ${row.l.toFixed(2)}`, `C ${row.c.toFixed(2)}`, `H ${row.h.toFixed(0)}°`]
  };
}
