import type { GalleryCandidateInterfaceType } from '@studnicky/iridis-image/types';

import { ALGORITHM_LABELS } from '~/composables/algorithmLabels.ts';

class PaletteCandidateModel {
  public readonly candidate: GalleryCandidateInterfaceType;
  public readonly humanLabel: string;
  public readonly isSelected: boolean;
  public readonly swatchAriaLabelPrefix: string;
  public readonly swatches: string[];

  public constructor(
    candidate: GalleryCandidateInterfaceType,
    humanLabel: string,
    isSelected: boolean,
    swatches: string[]
  ) {
    this.candidate = candidate;
    this.humanLabel = humanLabel;
    this.isSelected = isSelected;
    this.swatchAriaLabelPrefix = `Candidate ${humanLabel} color`;
    this.swatches = swatches;
  }
}

export const buildPaletteCandidateModel = class PaletteCandidateModelBuilder {
  public static build(
    candidates: readonly GalleryCandidateInterfaceType[],
    selectedLabel: string | null
  ): readonly PaletteCandidateModel[] {
    const result = candidates.map((candidate) => {
      const humanLabel = ALGORITHM_LABELS[candidate.algorithm] ?? candidate.label;
      const swatches = candidate.colors.map((color) => {
        const result = color.hex;
        return result;
      });
      return new PaletteCandidateModel(
        candidate,
        humanLabel,
        selectedLabel === candidate.label,
        swatches
      );
    });
    return result;
  }
};
