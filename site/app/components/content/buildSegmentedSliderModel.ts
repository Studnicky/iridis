export type SegmentedSliderItem<TValue extends string | number> = {
  readonly label: string;
  readonly value: TValue;
};

export function segmentedSliderIndexFor<TValue extends string | number>(
  items: readonly SegmentedSliderItem<TValue>[],
  value: TValue
): number {
  return Math.max(0, items.findIndex((item) => item.value === value));
}

export function segmentedSliderValueAt<TValue extends string | number>(
  items: readonly SegmentedSliderItem<TValue>[],
  index: number,
  fallbackValue: TValue
): TValue {
  return items[index]?.value ?? fallbackValue;
}
