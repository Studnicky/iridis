import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

export type RoleMathCandidateListItem = {
  readonly distanceLabel: string;
  readonly hex: string;
  readonly isWinner: boolean;
};

export type RoleMathCandidateListModel = {
  readonly hiddenCount: number;
  readonly hiddenCountLabel: string | null;
  readonly items: readonly RoleMathCandidateListItem[];
};

export function buildRoleMathCandidateListModel(
  role: RoleMathEntryType
): RoleMathCandidateListModel {
  const items = role.candidates.slice(0, 4).map((candidate) => ({
    distanceLabel: candidate.dist.toFixed(4),
    hex: candidate.hex.toLowerCase(),
    isWinner: candidate.isWinner
  }));
  const hiddenCount = Math.max(role.candidates.length - items.length, 0);
  return {
    hiddenCount,
    hiddenCountLabel: hiddenCount > 0
      ? `+${hiddenCount} more candidate${hiddenCount === 1 ? '' : 's'}, not shown`
      : null,
    items
  };
}
