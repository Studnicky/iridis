/**
 * Fetch-or-init helpers for plugin output and metadata slots.
 *
 * Each plugin writes its own slot in state.outputs / state.metadata.
 * These helpers create the slot object on first access and return it
 * so subsequent emit tasks in the same plugin family share the same reference.
 *
 * The returned type is `Record<string, unknown>` — plugin tasks cast
 * to their own concrete types after retrieval. This is safe because the
 * plugin owns and controls the slot; no other plugin writes to it.
 */

import type { PaletteStateInterface } from '../types/index.ts';

export function getOrCreateOutput(
  state: PaletteStateInterface,
  key:   string,
): Record<string, unknown> {
  const existing = state.outputs[key];
  if (existing !== null && existing !== undefined) {
    return existing as Record<string, unknown>;
  }
  const fresh: Record<string, unknown> = {};
  state.outputs[key] = fresh;
  return fresh;
}

export function getOrCreateMetadata(
  state: PaletteStateInterface,
  key:   string,
): Record<string, unknown> {
  const existing = state.metadata[key];
  if (existing !== null && existing !== undefined) {
    return existing as Record<string, unknown>;
  }
  const fresh: Record<string, unknown> = {};
  state.metadata[key] = fresh;
  return fresh;
}
