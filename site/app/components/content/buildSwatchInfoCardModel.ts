type SwatchInfoCardVariant = 'row' | 'tile';
type SwatchInfoCardSurface = 'plain' | 'elevated';

export type SwatchInfoCardModel = {
  readonly bodyClass: string;
  readonly cardClass: string;
  readonly surfaceClass: string;
  readonly swatchClass: string;
  readonly titleClass: string;
};

const CARD_CLASS_BY_VARIANT: Record<SwatchInfoCardVariant, string> = {
  'row': 'flex items-center gap-2 rounded-lg border border-default p-2',
  'tile': 'flex flex-col items-center gap-1 rounded border border-default p-1 text-center'
};

const SURFACE_CLASS_BY_TONE: Record<SwatchInfoCardSurface, string> = {
  'elevated': 'bg-elevated',
  'plain': ''
};

const SWATCH_CLASS_BY_VARIANT: Record<SwatchInfoCardVariant, string> = {
  'row': 'h-9 w-9 shrink-0 rounded-md border border-default',
  'tile': 'h-10 w-full shrink-0 rounded-sm border border-default'
};

const TITLE_CLASS_BY_VARIANT: Record<SwatchInfoCardVariant, string> = {
  'row': 'truncate text-xs font-medium text-highlighted',
  'tile': 'w-full truncate text-center text-[9px] font-medium text-highlighted'
};

const BODY_CLASS_BY_VARIANT: Record<SwatchInfoCardVariant, string> = {
  'row': 'min-w-0 flex-1',
  'tile': 'w-full'
};

export function buildSwatchInfoCardModel(
  variant: SwatchInfoCardVariant,
  surface: SwatchInfoCardSurface
): SwatchInfoCardModel {
  return {
    'bodyClass': BODY_CLASS_BY_VARIANT[variant],
    'cardClass': CARD_CLASS_BY_VARIANT[variant],
    'surfaceClass': SURFACE_CLASS_BY_TONE[surface],
    'swatchClass': SWATCH_CLASS_BY_VARIANT[variant],
    'titleClass': TITLE_CLASS_BY_VARIANT[variant]
  };
}
