/** Regex patterns matched against a hex color string by `ColorRecordFactory.fromHex`. */
export const HEX_PATTERNS = {
  'LEADING_HASH': /^#/,
  'VALID_HEX':    /^[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/
} as const;
