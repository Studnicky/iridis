/**
 * Maximum number of records fed into the deltaE-merge reducer. The
 * agglomerative merger is O(N² log N), so feeding it a raw photo
 * histogram (thousands of non-empty bins) hangs the main thread. We
 * pre-trim by descending weight: the merger still sees every visually
 * important cluster (heaviest first), and the long tail of one-off
 * pixels falls off, which is the same trade-off median-cut already
 * makes implicitly when its bucket-selection heuristic refuses to
 * split low-weight buckets.
 *
 * The trim ranking is NOT raw pixel count. A single enormous flat
 * region (e.g. a solid-black background covering most of the frame)
 * would otherwise linearly out-vote many smaller, genuinely saturated
 * regions whose own weight is split across many slightly-different
 * quantised bins. Two adjustments make the ranking reflect visual
 * prominence instead of pixel-count dominance:
 *
 *   - weight is dampened via sqrt() before ranking, so a bin 100x
 *     heavier than another only ranks ~10x higher, not 100x.
 *   - near-achromatic bins (chroma below CHROMA_EPSILON — grays,
 *     near-black, near-white) are ranked in a separate, lower tier,
 *     since in a hue-extraction context they are far more often
 *     background/neutral than a deliberately chosen palette color.
 *     Monochrome/grayscale images still extract correctly: neutral
 *     bins fill remaining cap slots once no chromatic bins are left.
 */
export const CLUSTER_DISPATCHER_DEFAULTS = {
  'CHROMA_EPSILON':          0.05,
  'DELTA_E_INPUT_CAP_DEFAULT': 128
} as const;
