import type { RoleMathCandidateType } from '~/composables/types/roleMathCandidate.ts';
import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

abstract class RoleMathCandidatePresentation {
  public abstract cardClass(): string;

  public abstract distanceClass(): string;
}

class RoleMathWinningCandidatePresentation extends RoleMathCandidatePresentation {
  public cardClass(): string {
    return 'bg-primary/10 border border-primary/20';
  }

  public distanceClass(): string {
    return 'text-primary font-bold';
  }
}

class RoleMathNonWinningCandidatePresentation extends RoleMathCandidatePresentation {
  public cardClass(): string {
    return 'opacity-70';
  }

  public distanceClass(): string {
    return 'text-muted';
  }
}

class RoleMathCandidateListItem {
  public readonly distanceLabel: string;
  public readonly hex: string;
  public readonly presentation: RoleMathCandidatePresentation;

  public constructor(candidate: RoleMathCandidateType) {
    this.distanceLabel = candidate.dist.toFixed(4);
    this.hex = candidate.hex.toLowerCase();
    this.presentation = candidate.isWinner
      ? new RoleMathWinningCandidatePresentation()
      : new RoleMathNonWinningCandidatePresentation();
  }
}

export const buildRoleMathCandidateListModel = class RoleMathCandidateListModel {
  public readonly hiddenCount: number;
  public readonly hiddenCountLabel: string | null;
  public readonly items: RoleMathCandidateListItem[];

  private constructor(
    hiddenCount: number,
    hiddenCountLabel: string | null,
    items: RoleMathCandidateListItem[]
  ) {
    this.hiddenCount = hiddenCount;
    this.hiddenCountLabel = hiddenCountLabel;
    this.items = items;
  }

  public static build(role: RoleMathEntry): RoleMathCandidateListModel {
    const items: RoleMathCandidateListItem[] = [];
    const candidateCount = Math.min(role.candidates.length, 4);
    for (let index = 0; index < candidateCount; index += 1) {
      const candidate = role.candidates[index];
      if (candidate !== undefined) {
        items.push(new RoleMathCandidateListItem(candidate));
      }
    }
    const hiddenCount = Math.max(role.candidates.length - items.length, 0);
    let hiddenCountLabel: string | null = null;
    if (hiddenCount > 0) {
      const suffix = hiddenCount === 1 ? '' : 's';
      hiddenCountLabel = `+${hiddenCount} more candidate${suffix}, not shown`;
    }
    return new RoleMathCandidateListModel(hiddenCount, hiddenCountLabel, items);
  }
};
