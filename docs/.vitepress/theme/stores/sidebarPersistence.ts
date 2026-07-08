/**
 * Sidebar drawer collapse persistence. Mirrors the read/write pattern in
 * `themeDispatcher.ts`: a single localStorage key, SSR-guarded reads and
 * writes, try/catch around storage access.
 *
 * The pre-hydration FOUC guard injected into `<head>` in `config.ts` reads
 * this same key, duplicated there as a literal since that script runs
 * before any JS module graph loads and has no access to imports.
 */

export const SIDEBAR_STORAGE_KEY = 'iridis-docs-sidebar-collapsed';

/** Persist the user's explicit collapse/expand choice so it's honored
 *  over the width-based default on subsequent loads. */
export function persistSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch { /* noop */ }
}
