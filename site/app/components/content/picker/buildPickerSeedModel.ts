import { isValidHex } from '~/utils/isValidHex.ts';

export type PickerSeedHexCommitResult = {
  readonly acceptedHex: string | null;
  readonly inputValue: string;
};

export function buildPickerSeedHexCommitResult(
  rawValue: string,
  fallbackHex: string
): PickerSeedHexCommitResult {
  const inputValue = rawValue.trim();
  if (isValidHex(inputValue)) {
    return {
      acceptedHex: inputValue,
      inputValue
    };
  }
  return {
    acceptedHex: null,
    inputValue: fallbackHex
  };
}
