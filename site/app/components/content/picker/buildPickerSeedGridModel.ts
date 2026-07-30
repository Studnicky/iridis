class PickerSeedGridItem {
  public readonly hex: string;

  public constructor(hex: string) {
    this.hex = hex;
  }
}

export const buildPickerSeedGridModel = class PickerSeedGridModelBuilder {
  public static build(
    pickerSeeds: readonly { readonly 'hex': string }[]
  ): readonly PickerSeedGridItem[] {
    const result = pickerSeeds.map((seed) => {
      return new PickerSeedGridItem(seed.hex);
    });
    return result;
  }
};
