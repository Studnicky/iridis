/**
 * Backwards-compatible facade over `themeDispatcher`. Components that
 * import `configStore` get the writable proxy whose mutations route
 * through the dispatcher's reducer, so existing v-model bindings keep
 * working while the dispatcher remains the only path that mutates
 * state. New components should import `themeStore` and `dispatch`
 * directly.
 */

import { themeStoreWritable, resetTheme } from './themeDispatcher.ts';
import type { DocsConfigType } from '../schemas/docsConfig.schema.ts';

/** The writable proxy. Mutations are turned into dispatcher actions. */
export const configStore: DocsConfigType = themeStoreWritable;

/** Convenience accessor for the writable proxy, mirroring Vue composable style. */
export function useConfig(): DocsConfigType {
  return configStore;
}

/** Resets every config field to its declared default. */
export function resetConfig(): void {
  resetTheme();
}
