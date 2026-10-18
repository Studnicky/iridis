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

class ResolvedRolesGridPresentation {
  public readonly cPrefix: string;
  public readonly containerClass: string;
  public readonly hPrefix: string;
  public readonly lPrefix: string;

  public constructor(containerClass: string, lPrefix: string, cPrefix: string, hPrefix: string) {
    this.cPrefix = cPrefix;
    this.containerClass = containerClass;
    this.hPrefix = hPrefix;
    this.lPrefix = lPrefix;
  }
}

export const buildResolvedRolesGridModel = class ResolvedRolesGridModelBuilder {
  public static readonly standardPresentation = new ResolvedRolesGridPresentation(
    'grid grid-cols-3 gap-x-2 text-[10px] text-muted',
    'L ',
    'C ',
    'H '
  );
  public static readonly tilePresentation = new ResolvedRolesGridPresentation(
    'flex gap-x-1 text-[8px] text-muted',
    '',
    '',
    ''
  );
  public static readonly titleSlotPresentation = new ResolvedRolesGridPresentation(
    'flex shrink-0 gap-x-2 text-[10px] text-muted',
    'L ',
    'C ',
    'H '
  );

  public static build(
    row: { readonly 'c': number; readonly 'h': number; readonly 'hex': string; readonly 'l': number },
    presentation: ResolvedRolesGridPresentation
  ): ResolvedRolesGridValueModel {
    const metrics = [
      `${presentation.lPrefix}${row.l.toFixed(2)}`,
      `${presentation.cPrefix}${row.c.toFixed(2)}`,
      `${presentation.hPrefix}${row.h.toFixed(0)}°`
    ];
    return new ResolvedRolesGridValueModel(presentation.containerClass, row.hex, metrics);
  }
};
