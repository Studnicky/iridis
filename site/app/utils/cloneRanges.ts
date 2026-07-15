/** Deep-clones a `[number, number][]` tuple list — every call site handing a lightness/chroma range to `engine.run()` needs its own array (never the original reactive ref's), so this is the one shared clone instead of six independent `.map((r) => [...r] as [number, number])` copies. */
export function cloneRanges(ranges: readonly (readonly [number, number])[]): [number, number][] {
  const result = ranges.map((r) => { return [...r] as [number, number]; });
  return result;
}
