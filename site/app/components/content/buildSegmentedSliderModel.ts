export const buildSegmentedSliderModel = class SegmentedSliderModelBuilder {
  public static indexFor<TValue extends string | number>(
    items: readonly { readonly 'label': string; readonly 'value': TValue }[],
    value: TValue
  ): number {
    const itemCount = items.length;
    for (let index = 0; index < itemCount; index++) {
      if (items[index]?.value === value) {
        return index;
      }
    }
    return 0;
  }

  public static valueAt<TValue extends string | number>(
    items: readonly { readonly 'label': string; readonly 'value': TValue }[],
    index: number,
    fallbackValue: TValue
  ): TValue {
    return items[index]?.value ?? fallbackValue;
  }
};
