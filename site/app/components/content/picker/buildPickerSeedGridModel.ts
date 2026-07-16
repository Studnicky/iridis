export type PickerSeedGridItem = {
  readonly hex: string;
};

export function buildPickerSeedGridModel(
  pickerSeeds: readonly { readonly hex: string }[]
): readonly PickerSeedGridItem[] {
  return pickerSeeds.map((seed) => {
    return { 'hex': seed.hex };
  });
}
