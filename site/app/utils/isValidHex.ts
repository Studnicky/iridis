import { HEX_PATTERN } from './constants/HEX_PATTERN.ts';

/** True when a value has the canonical six-digit `#rrggbb` representation. */
class IsValidHexOperation {
  static run(hex: string): boolean {
    if (hex.length !== 7) {
      return false;
    }
    const isHex = HEX_PATTERN.test(hex);
    return isHex;
  }
}

export const isValidHex = IsValidHexOperation.run;
