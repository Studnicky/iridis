import { HEX_PATTERN } from './constants/HEX_PATTERN.ts';

/** True for a well-formed 6-digit `#rrggbb` hex string — the one validity check every engine-output filter in useIridis.ts shares. */
class IsValidHexOperation {
  static run(hex: string): boolean {
    const result = HEX_PATTERN.test(hex);
    return result;
  }
}

export const isValidHex = IsValidHexOperation.run;
