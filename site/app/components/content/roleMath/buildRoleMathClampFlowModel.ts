import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

export type RoleMathClampFlowCard = {
  readonly ariaLabel: string;
  readonly bodyText: string;
  readonly hex: string;
  readonly label: 'Clamp seed' | 'Resolved color';
};

export type RoleMathClampFlowModel = {
  readonly seedCard: RoleMathClampFlowCard;
  readonly resolvedCard: RoleMathClampFlowCard;
};

export function buildRoleMathClampFlowModel(
  role: RoleMathEntryType
): RoleMathClampFlowModel | null {
  if (!role.clamp) {
    return null;
  }
  return {
    seedCard: {
      ariaLabel: `${role.name} clamp seed ${role.clamp.seedHex}`,
      bodyText: role.clamp.seedOklch,
      hex: role.clamp.seedHex,
      label: 'Clamp seed'
    },
    resolvedCard: {
      ariaLabel: `${role.name} clamp resolved ${role.clamp.resolvedHex}`,
      bodyText: role.clamp.roleOklch,
      hex: role.clamp.resolvedHex,
      label: 'Resolved color'
    }
  };
}
