import type { GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

import type { UploadedImage } from '~/composables/types/index.ts';

import { ALGORITHM_LABELS } from '~/composables/algorithmLabels.ts';
import { IridisUiEvent } from '~/composables/types/index.ts';

class SelectedPalette {
  public readonly algorithmLabel: string;
  public readonly hexes: readonly string[];
  public readonly key: string;
  public readonly label: string;

  public constructor(algorithmLabel: string, hexes: readonly string[], key: string, label: string) {
    this.algorithmLabel = algorithmLabel;
    this.hexes = hexes;
    this.key = key;
    this.label = label;
  }
}

class CombineStageHelpText {
  public readonly chromaHelp: string;
  public readonly deltaECapHelp: string;
  public readonly harmonizeHelp: string;
  public readonly histogramHelp: string;
  public readonly lightnessHelp: string;

  public constructor(
    chromaHelp: string,
    deltaECapHelp: string,
    harmonizeHelp: string,
    histogramHelp: string,
    lightnessHelp: string
  ) {
    this.chromaHelp = chromaHelp;
    this.deltaECapHelp = deltaECapHelp;
    this.harmonizeHelp = harmonizeHelp;
    this.histogramHelp = histogramHelp;
    this.lightnessHelp = lightnessHelp;
  }
}

export const buildCombineStageModel = class CombineStageModel {
  public static readonly helpText = new CombineStageHelpText(
    'Only pixels whose OKLCH chroma (saturation) falls in one of these bands are considered — raise the floor to ignore a near-neutral background so the cluster budget goes toward colors the image actually cares about. Also a union of ranges.',
    "Raise this if a distinct minor color keeps getting dropped before it gets a chance to merge; lower it to keep only the heaviest colors and finish faster. It caps how many histogram bins the ΔE merger even considers — that merge step is O(n²), so this bounds the work. Not a color-distance threshold itself (that's Harmonize threshold, below).",
    'Cleans up near-duplicate colors the clustering step left slightly apart, by nudging hues within this ΔE distance of each other into agreement. Runs regardless of clustering algorithm (unlike Merge input cap, above, which only applies to Delta-E clustering). 0 disables it.',
    'Bits per RGB channel when bucketing pixels before clustering. Higher keeps finer color detail but produces more bins for the clustering step to chew through; lower is faster and smooths out near-duplicate shades.',
    'Only pixels whose OKLCH lightness falls in one of these bands are considered — use it to ignore black bars (low L) or blown-out highlights (high L). Multiple ranges are a union: add a second band to keep shadows AND highlights while still excluding the midtones between them.'
  );

  public static buildSelectedPalettes(
    uploadedImages: readonly UploadedImage[],
    effectiveHexesFor: (image: UploadedImage) => readonly string[]
  ): SelectedPalette[] {
    const palettes: SelectedPalette[] = [];
    for (let index = 0; index < uploadedImages.length; index += 1) {
      const entry = uploadedImages[index];
      if (entry === undefined) {
        throw new RangeError(`Uploaded image list is missing entry ${index}`);
      }
      const algorithmKey = entry.selectedCandidateLabel ?? entry.strategy.serializeAlgorithm();
      const algorithmLabel = ALGORITHM_LABELS[algorithmKey] ?? algorithmKey;
      palettes.push(new SelectedPalette(
        algorithmLabel,
        effectiveHexesFor(entry),
        entry.id,
        entry.name.length > 0 ? entry.name : 'Sample'
      ));
    }
    return palettes;
  }

  public static buildCandidateSelectionEvent(
    candidate: GalleryCandidateOutputEntity.Type
  ): IridisUiEvent {
    const hexes: string[] = [];
    for (let index = 0; index < candidate.colors.length; index += 1) {
      const color = candidate.colors[index];
      if (color === undefined) {
        throw new RangeError(`Candidate color list is missing entry ${index}`);
      }
      hexes.push(color.hex);
    }
    const result = IridisUiEvent.selectImageCandidate(hexes, candidate.label);
    return result;
  }

  public static buildImageSeedHexes(
    imageSeeds: readonly { readonly 'hex': string }[]
  ): readonly string[] {
    const hexes: string[] = [];
    for (let index = 0; index < imageSeeds.length; index += 1) {
      const seed = imageSeeds[index];
      if (seed === undefined) {
        throw new RangeError(`Image seed list is missing entry ${index}`);
      }
      hexes.push(seed.hex);
    }
    return hexes;
  }
};
