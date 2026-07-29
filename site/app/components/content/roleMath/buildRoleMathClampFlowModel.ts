import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

class RoleMathClampFlowCard {
  public readonly ariaLabel: string;
  public readonly bodyText: string;
  public readonly hex: string;
  public readonly label: 'Clamp seed' | 'Resolved color';

  public constructor(
    ariaLabel: string,
    bodyText: string,
    hex: string,
    label: 'Clamp seed' | 'Resolved color'
  ) {
    this.ariaLabel = ariaLabel;
    this.bodyText = bodyText;
    this.hex = hex;
    this.label = label;
  }
}

export const buildRoleMathClampFlowModel = class RoleMathClampFlowModel {
  public readonly resolvedCard: RoleMathClampFlowCard;
  public readonly seedCard: RoleMathClampFlowCard;

  private constructor(
    resolvedCard: RoleMathClampFlowCard,
    seedCard: RoleMathClampFlowCard
  ) {
    this.resolvedCard = resolvedCard;
    this.seedCard = seedCard;
  }

  public static build(role: RoleMathEntryType): RoleMathClampFlowModel | null {
    const clamp = role.clamp;
    if (clamp === null) {
      return null;
    }
    const resolvedCard = new RoleMathClampFlowCard(
      `${role.name} clamp resolved ${clamp.resolvedHex}`,
      clamp.roleOklch,
      clamp.resolvedHex,
      'Resolved color'
    );
    const seedCard = new RoleMathClampFlowCard(
      `${role.name} clamp seed ${clamp.seedHex}`,
      clamp.seedOklch,
      clamp.seedHex,
      'Clamp seed'
    );
    return new RoleMathClampFlowModel(resolvedCard, seedCard);
  }
};
