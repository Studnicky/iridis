import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

export type RoleMathPinnedDetailsModel = {
  readonly ariaLabel: string;
  readonly bodyText: string;
  readonly hex: string;
  readonly label: 'Pinned seed';
};

export function buildRoleMathPinnedDetailsModel(
  role: RoleMathEntryType
): RoleMathPinnedDetailsModel | null {
  if (!role.isPinned || !role.pinnedSeedHex) {
    return null;
  }
  return {
    ariaLabel: `${role.name} pinned seed ${role.pinnedSeedHex}`,
    bodyText: 'Pinned seed hex',
    hex: role.pinnedSeedHex,
    label: 'Pinned seed'
  };
}
