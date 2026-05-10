/**
 * configStore.ts — backwards-compatible facade over themeDispatcher.
 *
 * Components that import { configStore } get the writable proxy whose
 * mutations route through the dispatcher's reducer. This keeps existing
 * v-model bindings working while making the dispatcher the only path
 * that mutates state.
 *
 * Components SHOULD migrate to importing { themeStore, dispatch } directly,
 * but until they do, every write through this proxy fires the same actions.
 */

import { themeStoreWritable, resetTheme } from './themeDispatcher.ts';
import type { DocsConfigType } from '../schemas/docsConfig.schema.ts';

export const configStore: DocsConfigType = themeStoreWritable;

export function useConfig(): DocsConfigType {
  return configStore;
}

export function resetConfig(): void {
  resetTheme();
}
