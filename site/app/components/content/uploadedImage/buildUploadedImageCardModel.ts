export const UPLOADED_IMAGE_K_TIER_ITEMS = [
  { label: '4', value: 4 },
  { label: '8', value: 8 },
  { label: '12', value: 12 },
  { label: '16', value: 16 },
  { label: '32', value: 32 }
] as const;

export const UPLOADED_IMAGE_CARD_HELP_TEXT = {
  chromaHelp:
    "Restricts which chroma band the image's own budget goes toward colors the image actually cares about. Also a union of ranges.",
  deltaECapHelp:
    "Not a color-distance threshold (that's Harmonize threshold, below) — this caps how many histogram bins are even considered before the ΔE merger runs (it's O(n²), so this bounds the work). Lower keeps only the heaviest bins; raise it if a distinct minor color is getting dropped before it gets a chance to merge.",
  harmonizeHelp:
    'After clustering, hues within this ΔE distance of each other are nudged into agreement — cleans up near-duplicate colors the clustering step left slightly apart. Runs regardless of clustering algorithm (unlike Merge input cap, above, which only applies to Delta-E clustering). 0 disables it.',
  histogramHelp:
    'Bits per RGB channel when bucketing pixels before clustering. Higher keeps finer color detail but produces more bins for the clustering step to chew through; lower is faster and smooths out near-duplicate shades.',
  lightnessHelp:
    'Union of ranges — add a second band to keep shadows AND highlights while still excluding the midtones between them.'
} as const;
