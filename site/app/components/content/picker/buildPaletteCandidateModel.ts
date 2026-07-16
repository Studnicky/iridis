import type { GalleryCandidateInterfaceType } from '@studnicky/iridis-image/types';
import { ALGORITHM_LABELS } from '~/composables/algorithmLabels.ts';

export type PaletteCandidateModel = {
  readonly candidate: GalleryCandidateInterfaceType;
  readonly humanLabel: string;
  readonly isSelected: boolean;
  readonly swatches: readonly string[];
  readonly swatchAriaLabelPrefix: string;
};

export function buildPaletteCandidateModels(
  candidates: readonly GalleryCandidateInterfaceType[],
  selectedLabel: string | null
): readonly PaletteCandidateModel[] {
  return candidates.map((candidate) => {
    const humanLabel = ALGORITHM_LABELS[candidate.algorithm] ?? candidate.label;
    return {
      candidate,
      humanLabel,
      isSelected: selectedLabel === candidate.label,
      swatches: candidate.colors.map((color) => color.hex),
      swatchAriaLabelPrefix: `Candidate ${humanLabel} color`
    };
  });
}
