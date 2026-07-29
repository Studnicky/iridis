import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

export const buildRoleMathPinnedDetailsModel = class RoleMathPinnedDetailsModel {
  public readonly ariaLabel: string;
  public readonly bodyText: string;
  public readonly hex: string;
  public readonly label: 'Pinned seed';

  private constructor(ariaLabel: string, bodyText: string, hex: string) {
    this.ariaLabel = ariaLabel;
    this.bodyText = bodyText;
    this.hex = hex;
    this.label = 'Pinned seed';
  }

  public static build(role: RoleMathEntryType): RoleMathPinnedDetailsModel | null {
    const pinnedSeedHex = role.pinnedSeedHex;
    if (!role.isPinned || pinnedSeedHex === null || pinnedSeedHex.length === 0) {
      return null;
    }
    return new RoleMathPinnedDetailsModel(
      `${role.name} pinned seed ${pinnedSeedHex}`,
      'Pinned seed hex',
      pinnedSeedHex
    );
  }
};
