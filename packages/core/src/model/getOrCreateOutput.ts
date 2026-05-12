/**
 * Type-safe fetch-or-init helpers for plugin output and metadata slots.
 *
 * Each plugin declares its slot shape via module augmentation on
 * PluginOutputsRegistry / PluginMetadataRegistry. These helpers constrain
 * the key to the declared set and return the declared value type —
 * no `as Record<string, unknown>` needed at call sites.
 *
 * The slot is created once and mutated in place by subsequent emit tasks in
 * the same plugin family (e.g. emit:vscodeUiPalette → emit:vscodeSemanticRules
 * → emit:vscodeThemeJson all share the 'vscode' slot).
 */

import type {
  PaletteStateInterface,
  PluginOutputsRegistry,
  PluginMetadataRegistry,
} from '../types/index.ts';

export function getOrCreateOutput<K extends keyof PluginOutputsRegistry>(
  state: PaletteStateInterface,
  key:   K,
): NonNullable<PluginOutputsRegistry[K]> {
  const existing = state.outputs[key];
  if (existing !== null && existing !== undefined) {
    return existing as NonNullable<PluginOutputsRegistry[K]>;
  }
  const fresh = {} as NonNullable<PluginOutputsRegistry[K]>;
  state.outputs[key] = fresh;
  return fresh;
}

export function getOrCreateMetadata<K extends keyof PluginMetadataRegistry>(
  state: PaletteStateInterface,
  key:   K,
): NonNullable<PluginMetadataRegistry[K]> {
  const existing = state.metadata[key];
  if (existing !== null && existing !== undefined) {
    return existing as NonNullable<PluginMetadataRegistry[K]>;
  }
  const fresh = {} as NonNullable<PluginMetadataRegistry[K]>;
  state.metadata[key] = fresh;
  return fresh;
}
