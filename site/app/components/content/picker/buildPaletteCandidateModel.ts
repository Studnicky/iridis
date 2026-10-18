import type { GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

import { ALGORITHM_LABELS } from '~/composables/algorithmLabels.ts';

abstract class PaletteCandidateSelection {
  public abstract isCurrent(): boolean;

  public static resolve(candidateLabel: string, selectedLabel: string | null): PaletteCandidateSelection {
    const result = candidateLabel === selectedLabel
      ? new SelectedPaletteCandidateSelection()
      : new UnselectedPaletteCandidateSelection();
    return result;
  }
}

class SelectedPaletteCandidateSelection extends PaletteCandidateSelection {
  public isCurrent(): boolean {
    return true;
  }
}

class UnselectedPaletteCandidateSelection extends PaletteCandidateSelection {
  public isCurrent(): boolean {
    return false;
  }
}

class PaletteCandidateModel {
  public readonly candidate: GalleryCandidateOutputEntity.Type;
  public readonly humanLabel: string;
  public readonly selection: PaletteCandidateSelection;
  public readonly swatchAriaLabelPrefix: string;
  public readonly swatches: string[];

  public constructor(
    candidate: GalleryCandidateOutputEntity.Type,
    humanLabel: string,
    selection: PaletteCandidateSelection,
    swatches: string[]
  ) {
    this.candidate = candidate;
    this.humanLabel = humanLabel;
    this.selection = selection;
    this.swatchAriaLabelPrefix = `Candidate ${humanLabel} color`;
    this.swatches = swatches;
  }
}

export const buildPaletteCandidateModel = class PaletteCandidateModelBuilder {
  public static build(
    candidates: readonly GalleryCandidateOutputEntity.Type[],
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
        PaletteCandidateSelection.resolve(candidate.label, selectedLabel),
        swatches
      );
    });
    return result;
  }
};
