export type SwatchListItem = {
  readonly ariaLabel: string;
  readonly hex: string;
};

export type SwatchListModel = {
  readonly emptyLabel: string;
  readonly items: readonly SwatchListItem[];
};

export function buildSwatchListModel(
  swatches: readonly string[],
  ariaLabelPrefix?: string,
  emptyLabel?: string
): SwatchListModel {
  return {
    emptyLabel: emptyLabel ?? 'None',
    items: swatches.map((hex) => ({
      ariaLabel: ariaLabelPrefix ? `${ariaLabelPrefix} ${hex}` : hex,
      hex
    }))
  };
}
