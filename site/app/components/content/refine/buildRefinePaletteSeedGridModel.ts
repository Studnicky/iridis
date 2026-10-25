class RefinePaletteSeed {
  public readonly hex: string;
  public readonly pendingTitle: string | undefined;
  public readonly role: string | undefined;

  public constructor(hex: string, pin: { readonly 'pendingTitle': string | undefined; readonly 'role': string | undefined }) {
    this.hex = hex;
    this.pendingTitle = pin.pendingTitle;
    this.role = pin.role;
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
    activeSeeds: readonly { readonly 'hex': string; readonly 'role'?: string }[],
    rejectedPinRoles: readonly string[],
    standardLabel: string
  ): RefinePaletteSeedGridModel {
    const rejectedRoles = new Set(rejectedPinRoles);
    const balancedSeeds = activeSeeds.map((seed) => {
      const rejected = seed.role !== undefined && rejectedRoles.has(seed.role);
      const pendingTitle = rejected ? `Pending: cannot meet ${standardLabel} with this pin` : undefined;
      return new RefinePaletteSeed(seed.hex, { 'pendingTitle': pendingTitle, 'role': seed.role });
    });
    const seedRoles = activeSeeds.map((seed) => {
      const result = seed.role;
      return result;
    });
    return new RefinePaletteSeedGridModel(balancedSeeds, seedRoles);
  }
};
