import { ALGORITHM_LABELS } from '~/composables/algorithmLabels.ts';
import type { UploadedImageInterfaceType } from '~/composables/types/index.ts';
import { IridisUiActionType } from '~/composables/types/index.ts';
import type { IridisUiEventType } from '~/composables/types/iridisUiEvent.ts';
import type { GalleryCandidateInterfaceType } from '@studnicky/iridis-image/types';

export type SelectedPaletteType = {
  key: string;
  label: string;
  algorithmLabel: string;
  hexes: readonly string[];
};

export type CombineStageHelpTextType = {
  deltaECapHelp: string;
  histogramHelp: string;
  harmonizeHelp: string;
  lightnessHelp: string;
  chromaHelp: string;
};

export const COMBINE_STAGE_HELP_TEXT: CombineStageHelpTextType = {
  deltaECapHelp:
    "Raise this if a distinct minor color keeps getting dropped before it gets a chance to merge; lower it to keep only the heaviest colors and finish faster. It caps how many histogram bins the \u0394E merger even considers \u2014 that merge step is O(n\u00b2), so this bounds the work. Not a color-distance threshold itself (that's Harmonize threshold, below).",
  histogramHelp:
    'Bits per RGB channel when bucketing pixels before clustering. Higher keeps finer color detail but produces more bins for the clustering step to chew through; lower is faster and smooths out near-duplicate shades.',
  harmonizeHelp:
    'Cleans up near-duplicate colors the clustering step left slightly apart, by nudging hues within this \u0394E distance of each other into agreement. Runs regardless of clustering algorithm (unlike Merge input cap, above, which only applies to Delta-E clustering). 0 disables it.',
  lightnessHelp:
    'Only pixels whose OKLCH lightness falls in one of these bands are considered \u2014 use it to ignore black bars (low L) or blown-out highlights (high L). Multiple ranges are a union: add a second band to keep shadows AND highlights while still excluding the midtones between them.',
  chromaHelp:
    'Only pixels whose OKLCH chroma (saturation) falls in one of these bands are considered \u2014 raise the floor to ignore a near-neutral background so the cluster budget goes toward colors the image actually cares about. Also a union of ranges.'
};

export function buildSelectedPalettes(
  uploadedImages: readonly UploadedImageInterfaceType[],
  effectiveHexesFor: (image: UploadedImageInterfaceType) => readonly string[]
): SelectedPaletteType[] {
  return uploadedImages.map((entry) => {
    const algorithmKey = entry.selectedCandidateLabel ?? entry.algorithm;
    return {
      algorithmLabel: ALGORITHM_LABELS[algorithmKey] ?? algorithmKey,
      hexes: effectiveHexesFor(entry),
      key: entry.id,
      label: entry.name || 'Sample'
    };
  });
}

export function buildCombineCandidateSelectionEvent(
  candidate: GalleryCandidateInterfaceType
): Extract<IridisUiEventType, { type: IridisUiActionType.SELECT_IMAGE_CANDIDATE }> {
  return {
    hexes: candidate.colors.map((color) => color.hex),
    label: candidate.label,
    type: IridisUiActionType.SELECT_IMAGE_CANDIDATE
  };
}

export function buildImageSeedHexes(
  imageSeeds: readonly { readonly hex: string }[]
): readonly string[] {
  return imageSeeds.map((seed) => {
    return seed.hex;
  });
}
