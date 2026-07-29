export const buildRangeListModel = class RangeListModelBuilder {
  private static clone(
    ranges: readonly (readonly [number, number])[]
  ): [number, number][] {
    const clonedRanges: [number, number][] = [];
    for (const range of ranges) {
      clonedRanges.push([range[0], range[1]]);
    }
    return clonedRanges;
  }

  public static append(
    ranges: readonly (readonly [number, number])[],
    defaultRange: [number, number]
  ): [number, number][] {
    return [...RangeListModelBuilder.clone(ranges), defaultRange];
  }

  public static remove(
    ranges: readonly (readonly [number, number])[],
    index: number,
    defaultRange: [number, number]
  ): [number, number][] {
    const next = RangeListModelBuilder.clone(ranges).filter((_, entryIndex) => {
      return entryIndex !== index;
    });
    return next.length > 0 ? next : [defaultRange];
  }

  public static update(
    ranges: readonly (readonly [number, number])[],
    index: number,
    range: [number, number]
  ): [number, number][] {
    const next = RangeListModelBuilder.clone(ranges);
    next[index] = range;
    return next;
  }
};
