class UploadedImageTierItem {
  public readonly label: string;
  public readonly value: number;

  public constructor(label: string, value: number) {
    this.label = label;
    this.value = value;
  }
}

class UploadedImageCardHelpText {
  public readonly chromaHelp: string;
  public readonly deltaECapHelp: string;
  public readonly harmonizeHelp: string;
  public readonly histogramHelp: string;
  public readonly lightnessHelp: string;

  public constructor() {
    this.chromaHelp =
      "Restricts which chroma band the image's own budget goes toward colors the image actually cares about. Also a union of ranges.";
    this.deltaECapHelp =
      "Not a color-distance threshold (that's Harmonize threshold, below) — this caps how many histogram bins are even considered before the ΔE merger runs (it's O(n²), so this bounds the work). Lower keeps only the heaviest bins; raise it if a distinct minor color is getting dropped before it gets a chance to merge.";
    this.harmonizeHelp =
      'After clustering, hues within this ΔE distance of each other are nudged into agreement — cleans up near-duplicate colors the clustering step left slightly apart. Runs regardless of clustering algorithm (unlike Merge input cap, above, which only applies to Delta-E clustering). 0 disables it.';
    this.histogramHelp =
      'Bits per RGB channel when bucketing pixels before clustering. Higher keeps finer color detail but produces more bins for the clustering step to chew through; lower is faster and smooths out near-duplicate shades.';
    this.lightnessHelp =
      'Union of ranges — add a second band to keep shadows AND highlights while still excluding the midtones between them.';
  }
}

export const buildUploadedImageCardModel = class UploadedImageCardModel {
  public readonly helpText: UploadedImageCardHelpText;
  public readonly kTierItems: readonly UploadedImageTierItem[];

  private constructor(helpText: UploadedImageCardHelpText, kTierItems: readonly UploadedImageTierItem[]) {
    this.helpText = helpText;
    this.kTierItems = kTierItems;
  }

  public static build(): UploadedImageCardModel {
    return new UploadedImageCardModel(
      new UploadedImageCardHelpText(),
      [
        new UploadedImageTierItem('4', 4),
        new UploadedImageTierItem('8', 8),
        new UploadedImageTierItem('12', 12),
        new UploadedImageTierItem('16', 16),
        new UploadedImageTierItem('32', 32)
      ]
    );
  }
};
