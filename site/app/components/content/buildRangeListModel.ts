export const buildRangeListModel = class RangeListModelBuilder {
  private static clone(
    ranges: readonly (readonly [number, number])[]
  ): [number, number][] {
    const clonedRanges: [number, number][] = [];
    for (let index = 0; index < ranges.length; index += 1) {
      const range = ranges[index];
      if (range !== undefined) {
        clonedRanges.push([range[0], range[1]]);
      }
    }
    return clonedRanges;
  }

  public static append(
    ranges: readonly (readonly [number, number])[],
    defaultRange: [number, number]
  ): [number, number][] {
    const next = [...RangeListModelBuilder.clone(ranges), defaultRange];
    return next;
  }

  public static remove(
    ranges: readonly (readonly [number, number])[],
    index: number,
    defaultRange: [number, number]
  ): [number, number][] {
    const next = RangeListModelBuilder.clone(ranges).filter((_, entryIndex) => {
      const retained = entryIndex !== index;
      return retained;
    });
    const result = next.length > 0 ? next : [defaultRange];
    return result;
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
