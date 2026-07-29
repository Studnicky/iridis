/**
 * Regex patterns used by `CssVarName.from` to turn an arbitrary role name
 * into a valid CSS custom-property token.
 */
export const CSS_VAR_NAME_PATTERNS = {
  'edgeDash':          /^-|-$/g,
  'leadingDigit':      /^[0-9]/,
  'nonToken':          /[^a-z0-9-]+/g,
  'repeatedDash':      /-{2,}/g,
  'uppercaseLetter':   /[A-Z]/g
} as const;
