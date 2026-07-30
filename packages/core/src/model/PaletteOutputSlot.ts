/**
 * Fetch-or-init helper for a plugin's `state.outputs` slot.
 *
 * Each plugin writes its own slot in state.outputs. This helper creates
 * the slot object on first access and returns it so subsequent emit
 * tasks in the same plugin family share the same reference.
 *
 * The returned type is `JsonObjectType`; plugin tasks narrow it to their
 * concrete slot shape after retrieval. Invalid runtime values are replaced
 * with a fresh object so callers always receive an object-shaped slot.
 */

import { JsonObject, type JsonObjectType } from '@studnicky/types';

import type { PaletteStateInterface } from '../types/index.ts';

class PaletteOutputSlot {
  static getOrCreate(
    state: PaletteStateInterface,
    key:   string
  ): JsonObjectType {
    const existing = state.outputs[key];
    if (JsonObject.is(existing)) {
      return existing;
    }
    const fresh: JsonObjectType = {};
    state.outputs[key] = fresh;
    return fresh;
  }
}

export { PaletteOutputSlot };
