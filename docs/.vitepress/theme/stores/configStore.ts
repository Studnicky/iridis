/**
 * configStore.ts
 *
 * Reactive global config for the docs. Hydrates from localStorage on the
 * client and writes through on every mutation. SSR-safe: every storage
 * touch is guarded by a typeof window check so vitepress's static build
 * never trips.
 */

import { reactive, watch } from 'vue';

import { docsConfigDefaults } from '../schemas/docsConfig.schema.ts';
import type { DocsConfigType } from '../schemas/docsConfig.schema.ts';

const STORAGE_KEY = 'iridis-docs-config';

function readPersisted(): Partial<DocsConfigType> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return {};
    }
    const parsed = JSON.parse(raw) as Partial<DocsConfigType>;
    return parsed;
  } catch {
    return {};
  }
}

function writePersisted(config: DocsConfigType): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* quota or privacy mode — silently degrade */
  }
}

const merged: DocsConfigType = {
  ...docsConfigDefaults,
  ...readPersisted(),
};

export const configStore = reactive<DocsConfigType>(merged);

if (typeof window !== 'undefined') {
  watch(
    () => ({ ...configStore }),
    (next) => writePersisted(next),
    { 'deep': true },
  );
}

export function useConfig(): DocsConfigType {
  return configStore;
}

export function resetConfig(): void {
  Object.assign(configStore, docsConfigDefaults);
}
