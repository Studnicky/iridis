/**
 * Fetch-or-init helper for a plugin's `state.outputs` slot.
 *
 * Each plugin writes its own slot in state.outputs. This helper creates
 * the slot object on first access and returns it so subsequent emit
 * tasks in the same plugin family share the same reference.
 *
 * The returned JSON record is safe for plugin tasks to narrow to their
 * concrete slot shape after retrieval. Invalid runtime values are replaced
 * with a fresh object so callers always receive an object-shaped slot.
 */

import type { JSONSchema7Type } from 'json-schema';

import { JsonObject, JsonValue } from '@studnicky/types/node';

import type { PaletteStateInterface } from '../types/index.ts';

class PaletteOutputSlot {
  static getOrCreate(
    state: PaletteStateInterface,
    key:   string
  ): Record<string, JSONSchema7Type> {
    const descriptor = Object.getOwnPropertyDescriptor(state.outputs, key);
    if (descriptor !== undefined && JsonObject.is(descriptor.value) && JsonValue.is(descriptor.value)) {
      return descriptor.value;
    }
    const fresh: Record<string, JSONSchema7Type> = {};
    Object.defineProperty(state.outputs, key, {
      'configurable': true,
      'enumerable': true,
      'value': fresh,
      'writable': true
    });
    return fresh;
  }
}

export { PaletteOutputSlot };
