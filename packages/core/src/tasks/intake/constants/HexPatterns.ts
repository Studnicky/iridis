/** Regex patterns matched against a trimmed, `#`-stripped hex string by `intake:hex`. */
export const HEX_PATTERNS = {
  'DIGITS_3': /^[0-9a-fA-F]{3}$/,
  'DIGITS_3_TO_8': /^[0-9a-fA-F]{3,8}$/,
  'DIGITS_4': /^[0-9a-fA-F]{4}$/,
  'DIGITS_6': /^[0-9a-fA-F]{6}$/,
  'DIGITS_8': /^[0-9a-fA-F]{8}$/
} as const;
