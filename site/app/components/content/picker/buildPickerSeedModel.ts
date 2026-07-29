import { isValidHex } from '~/utils/isValidHex.ts';

class PickerSeedHexCommitResult {
  public readonly acceptedHex: string | null;
  public readonly inputValue: string;

  public constructor(acceptedHex: string | null, inputValue: string) {
    this.acceptedHex = acceptedHex;
    this.inputValue = inputValue;
  }
}

export const buildPickerSeedModel = class PickerSeedModelBuilder {
  public static buildHexCommitResult(
    rawValue: string,
    fallbackHex: string
  ): PickerSeedHexCommitResult {
    const inputValue = rawValue.trim();
    if (isValidHex(inputValue)) {
      return new PickerSeedHexCommitResult(inputValue, inputValue);
    }
    return new PickerSeedHexCommitResult(null, fallbackHex);
  }
};
