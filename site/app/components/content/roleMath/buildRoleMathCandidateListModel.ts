import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

class RoleMathCandidateListItem {
  public readonly distanceLabel: string;
  public readonly hex: string;
  public readonly isWinner: boolean;

  public constructor(distanceLabel: string, hex: string, isWinner: boolean) {
    this.distanceLabel = distanceLabel;
    this.hex = hex;
    this.isWinner = isWinner;
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

  public static build(role: RoleMathEntryType): RoleMathCandidateListModel {
    const items: RoleMathCandidateListItem[] = [];
    for (const candidate of role.candidates.slice(0, 4)) {
      items.push(new RoleMathCandidateListItem(
        candidate.dist.toFixed(4),
        candidate.hex.toLowerCase(),
        candidate.isWinner
      ));
    }
    const hiddenCount = Math.max(role.candidates.length - items.length, 0);
    const hiddenCountLabel = hiddenCount > 0
      ? `+${hiddenCount} more candidate${hiddenCount === 1 ? '' : 's'}, not shown`
      : null;
    return new RoleMathCandidateListModel(hiddenCount, hiddenCountLabel, items);
  }
};
