/**
 * Shared regex patterns for parsing RFC 6901 JSON Pointer path strings
 * ("/a/b/0") into segments, used by `SchemaWalker`, `Segments`, and `Value`
 * in `Validator.ts` to walk a validation-error path back to its schema node
 * or data value.
 */
export const JSON_POINTER_PATTERNS = {
  'digitsOnly':   /^\d+$/,
  'leadingSlash': /^\//,
  'tildeOne':     /~1/g,
  'tildeZero':    /~0/g
} as const;
