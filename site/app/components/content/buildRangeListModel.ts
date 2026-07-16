export type RangeListEntry = [number, number];

function cloneRanges(ranges: readonly (readonly [number, number])[]): RangeListEntry[] {
  return ranges.map((range) => [...range] as RangeListEntry);
}

export function updateRangeListEntry(
  ranges: readonly (readonly [number, number])[],
  index: number,
  range: RangeListEntry
): RangeListEntry[] {
  const next = cloneRanges(ranges);
  next[index] = range;
  return next;
}

export function appendRangeListEntry(
  ranges: readonly (readonly [number, number])[],
  defaultRange: RangeListEntry
): RangeListEntry[] {
  return [...cloneRanges(ranges), defaultRange];
}

export function removeRangeListEntry(
  ranges: readonly (readonly [number, number])[],
  index: number,
  defaultRange: RangeListEntry
): RangeListEntry[] {
  const next = cloneRanges(ranges).filter((_, entryIndex) => entryIndex !== index);
  return next.length > 0 ? next : [defaultRange];
}
