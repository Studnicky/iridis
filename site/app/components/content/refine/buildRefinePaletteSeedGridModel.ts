export type RefinePaletteSeedGridModel = {
  readonly balancedSeeds: readonly { readonly hex: string; readonly role?: string }[];
  readonly seedRoles: readonly (string | undefined)[];
};

export function buildRefinePaletteSeedGridModel(
  activeSeeds: readonly { readonly hex: string; readonly role?: string }[]
): RefinePaletteSeedGridModel {
  return {
    balancedSeeds: [...activeSeeds],
    seedRoles: activeSeeds.map((seed) => {
      return seed.role;
    })
  };
}
