/**
 * Fetch-or-init helper for a plugin's `state.metadata` slot.
 *
 * Each plugin writes its own slot in state.metadata. This helper creates
 * the slot object on first access and returns it so subsequent emit
 * tasks in the same plugin family share the same reference.
 *
 * The returned type is `Record<string, JSONSchema7Type>`; plugin tasks narrow it to their
 * concrete slot shape after retrieval. Invalid runtime values are replaced
 * with a fresh object so callers always receive an object-shaped slot.
 */

import type { JSONSchema7Type } from 'json-schema';

import { JsonObject, JsonValue } from '@studnicky/types/node';

import type { PaletteStateInterface } from '../types/index.ts';

class PaletteMetadataSlot {
  static getOrCreate(
    state: PaletteStateInterface,
    key:   string
  ): Record<string, JSONSchema7Type> {
    const descriptor = Object.getOwnPropertyDescriptor(state.metadata, key);
    if (descriptor !== undefined && JsonObject.is(descriptor.value) && JsonValue.is(descriptor.value)) {
      return descriptor.value;
    }
    const fresh: Record<string, JSONSchema7Type> = {};
    Object.defineProperty(state.metadata, key, {
      'configurable': true,
      'enumerable': true,
      'value': fresh,
      'writable': true
    });
    return fresh;
  }
}

export { PaletteMetadataSlot };
