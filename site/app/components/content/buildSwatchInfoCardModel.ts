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
  public static readonly elevatedRow = new SwatchInfoCardModel(
    'min-w-0 flex-1',
    'flex items-center gap-2 rounded-lg border border-default p-2',
    'bg-elevated',
    'h-9 w-9 shrink-0 rounded-md border border-default',
    'truncate text-xs font-medium text-highlighted'
  );

  public static readonly plainRow = new SwatchInfoCardModel(
    'min-w-0 flex-1',
    'flex items-center gap-2 rounded-lg border border-default p-2',
    '',
    'h-9 w-9 shrink-0 rounded-md border border-default',
    'truncate text-xs font-medium text-highlighted'
  );

  public static readonly elevatedTile = new SwatchInfoCardModel(
    'w-full',
    'flex flex-col items-center gap-1 rounded border border-default p-1 text-center',
    'bg-elevated',
    'h-10 w-full shrink-0 rounded-sm border border-default',
    'w-full truncate text-center text-[9px] font-medium text-highlighted'
  );

  public static readonly plainTile = new SwatchInfoCardModel(
    'w-full',
    'flex flex-col items-center gap-1 rounded border border-default p-1 text-center',
    '',
    'h-10 w-full shrink-0 rounded-sm border border-default',
    'w-full truncate text-center text-[9px] font-medium text-highlighted'
  );
};
