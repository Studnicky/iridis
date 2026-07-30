/**
 * JSON-Pointer segment values that resolve into the prototype chain rather
 * than an own-enumerable property or array index. Used by
 * `SchemaReference.resolve` and `Value.resolve` in `Validator.ts` to guard
 * their segment-walking loops against prototype-chain confusion when a
 * `$ref` fragment or a validation-error path contains one of these names.
 */
export const UNSAFE_PATH_SEGMENTS: ReadonlySet<string> = new Set([
  '__proto__', 'constructor', 'prototype'
]);
