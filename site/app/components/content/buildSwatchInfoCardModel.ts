class SwatchInfoCardModel {
  public readonly bodyClass: string;
  public readonly cardClass: string;
  public readonly surfaceClass: string;
  public readonly swatchClass: string;
  public readonly titleClass: string;

  public constructor(
    bodyClass: string,
    cardClass: string,
    surfaceClass: string,
    swatchClass: string,
    titleClass: string
  ) {
    this.bodyClass = bodyClass;
    this.cardClass = cardClass;
    this.surfaceClass = surfaceClass;
    this.swatchClass = swatchClass;
    this.titleClass = titleClass;
  }
}

export const buildSwatchInfoCardModel = class SwatchInfoCardModelBuilder {
  private static readonly bodyClassByVariant = {
    'row': 'min-w-0 flex-1',
    'tile': 'w-full'
  } as const;

  private static readonly cardClassByVariant = {
    'row': 'flex items-center gap-2 rounded-lg border border-default p-2',
    'tile': 'flex flex-col items-center gap-1 rounded border border-default p-1 text-center'
  } as const;

  private static readonly surfaceClassByTone = {
    'elevated': 'bg-elevated',
    'plain': ''
  } as const;

  private static readonly swatchClassByVariant = {
    'row': 'h-9 w-9 shrink-0 rounded-md border border-default',
    'tile': 'h-10 w-full shrink-0 rounded-sm border border-default'
  } as const;

  private static readonly titleClassByVariant = {
    'row': 'truncate text-xs font-medium text-highlighted',
    'tile': 'w-full truncate text-center text-[9px] font-medium text-highlighted'
  } as const;

  public static build(
    variant: 'row' | 'tile',
    surface: 'plain' | 'elevated'
  ): SwatchInfoCardModel {
    return new SwatchInfoCardModel(
      SwatchInfoCardModelBuilder.bodyClassByVariant[variant],
      SwatchInfoCardModelBuilder.cardClassByVariant[variant],
      SwatchInfoCardModelBuilder.surfaceClassByTone[surface],
      SwatchInfoCardModelBuilder.swatchClassByVariant[variant],
      SwatchInfoCardModelBuilder.titleClassByVariant[variant]
    );
  }
};
