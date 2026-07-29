class RefinePaletteSeed {
  public readonly hex: string;
  public readonly role: string | undefined;

  public constructor(hex: string, role: string | undefined) {
    this.hex = hex;
    this.role = role;
  }
}

class RefinePaletteSeedGridModel {
  public readonly balancedSeeds: RefinePaletteSeed[];
  public readonly seedRoles: (string | undefined)[];

  public constructor(
    balancedSeeds: RefinePaletteSeed[],
    seedRoles: (string | undefined)[]
  ) {
    this.balancedSeeds = balancedSeeds;
    this.seedRoles = seedRoles;
  }
}

export const buildRefinePaletteSeedGridModel = class RefinePaletteSeedGridModelBuilder {
  public static build(
    activeSeeds: readonly { readonly 'hex': string; readonly 'role'?: string }[]
  ): RefinePaletteSeedGridModel {
    const balancedSeeds = activeSeeds.map((seed) => {
      return new RefinePaletteSeed(seed.hex, seed.role);
    });
    const seedRoles = activeSeeds.map((seed) => {
      const result = seed.role;
      return result;
    });
    return new RefinePaletteSeedGridModel(balancedSeeds, seedRoles);
  }
};
