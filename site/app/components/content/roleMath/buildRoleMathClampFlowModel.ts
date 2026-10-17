import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

abstract class RoleMathClampCardPresentation {
  public abstract label(): string;
}

class RoleMathClampSeedPresentation extends RoleMathClampCardPresentation {
  public label(): string {
    return 'Clamp seed';
  }
}

class RoleMathClampResolvedPresentation extends RoleMathClampCardPresentation {
  public label(): string {
    return 'Resolved color';
  }
}

class RoleMathClampFlowCard {
  public readonly ariaLabel: string;
  public readonly bodyText: string;
  public readonly hex: string;
  public readonly presentation: RoleMathClampCardPresentation;

  public constructor(
    ariaLabel: string,
    bodyText: string,
    hex: string,
    presentation: RoleMathClampCardPresentation
  ) {
    this.ariaLabel = ariaLabel;
    this.bodyText = bodyText;
    this.hex = hex;
    this.presentation = presentation;
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

  public static build(role: RoleMathEntry): RoleMathClampFlowModel | null {
    const clamp = role.clamp;
    if (clamp === null) {
      return null;
    }
    const resolvedCard = new RoleMathClampFlowCard(
      `${role.name} clamp resolved ${clamp.resolvedHex}`,
      clamp.roleOklch,
      clamp.resolvedHex,
      new RoleMathClampResolvedPresentation()
    );
    const seedCard = new RoleMathClampFlowCard(
      `${role.name} clamp seed ${clamp.seedHex}`,
      clamp.seedOklch,
      clamp.seedHex,
      new RoleMathClampSeedPresentation()
    );
    return new RoleMathClampFlowModel(resolvedCard, seedCard);
  }
};
