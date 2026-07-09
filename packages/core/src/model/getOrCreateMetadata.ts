/**
 * Fetch-or-init helper for a plugin's `state.metadata` slot.
 *
 * Each plugin writes its own slot in state.metadata. This helper creates
 * the slot object on first access and returns it so subsequent emit
 * tasks in the same plugin family share the same reference.
 *
 * The returned type is `JsonObjectType` — plugin tasks cast
 * to their own concrete types after retrieval. This is safe because the
 * plugin owns and controls the slot; no other plugin writes to it.
 */

import type { JsonObjectType } from '@studnicky/types';

import type { PaletteStateInterface } from '../types/index.ts';

export function getOrCreateMetadata(
  state: PaletteStateInterface,
  key:   string
): JsonObjectType {
  const existing = state.metadata[key];
  if (existing !== null && existing !== undefined) {
    return existing as JsonObjectType;
  }
  const fresh: JsonObjectType = {};
  state.metadata[key] = fresh;
  return fresh;
}
