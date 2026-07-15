/** One-line "what is this and when would I pick it" for each clustering algorithm — shown under the select so the choice isn't just four unexplained names. */
export const ALGORITHM_HELP: Record<string, string> = {
  'delta-e':     'Agglomerative merging by perceptual color difference (ΔE2000). Tends to keep small but visually distinct colors that box-splitting algorithms merge away.',
  'k-means':     'Iteratively refines K centroids in OKLCH space until they stop moving. Often finds the lowest-error partition of the four, at the cost of being iterative rather than a single pass.',
  'median-cut':  'Recursive box splitting at the median of the widest channel. Fast, one-shot, the long-standing default — but a median split can bisect a small distinct cluster.',
  'wu-quantize': 'Recursive box splitting like median cut, but each split lands where it minimizes total clustering error instead of at the median. One-shot, usually a better split than median cut for similar cost.'
};
