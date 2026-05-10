/**
 * getOrCreateOutput.ts
 *
 * Tiny helper for the recurring "fetch-or-init the named output slot"
 * pattern that every emit:* task needs. Replaces the 5-line if-check
 * boilerplate that accumulated across stylesheet, vscode, capacitor, rdf,
 * etc.
 *
 * Slot is created once and mutated in place by subsequent emit tasks in
 * the same plugin family (e.g. emit:vscodeUiPalette → emit:vscodeSemanticRules
 * → emit:vscodeThemeJson all share the 'vscode' slot).
 */

import type { PaletteStateInterface } from '../types/index.ts';

export function getOrCreateOutput<T extends Record<string, unknown>>(
  state: PaletteStateInterface,
  key:   string,
): T {
  const existing = state.outputs[key];
  if (existing !== null && existing !== undefined && typeof existing === 'object') {
    return existing as T;
  }
  const fresh = {} as T;
  (state.outputs as Record<string, unknown>)[key] = fresh;
  return fresh;
}
