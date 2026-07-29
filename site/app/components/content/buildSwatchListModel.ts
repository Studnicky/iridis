class SwatchListItem {
  public readonly ariaLabel: string;
  public readonly hex: string;

  public constructor(hex: string, ariaLabelPrefix: string | undefined) {
    this.ariaLabel = ariaLabelPrefix === undefined || ariaLabelPrefix.length === 0
      ? hex
      : `${ariaLabelPrefix} ${hex}`;
    this.hex = hex;
  }
}

class SwatchListModel {
  public readonly emptyLabel: string;
  public readonly items: SwatchListItem[];

  public constructor(emptyLabel: string, items: SwatchListItem[]) {
    this.emptyLabel = emptyLabel;
    this.items = items;
  }
}

export const buildSwatchListModel = class SwatchListModelBuilder {
  public static build(
    swatches: readonly string[],
    options?: { readonly 'ariaLabelPrefix'?: string; readonly 'emptyLabel'?: string }
  ): SwatchListModel {
    const items = swatches.map((hex) => {
      return new SwatchListItem(hex, options?.ariaLabelPrefix);
    });
    return new SwatchListModel(options?.emptyLabel ?? 'None', items);
  }
};
