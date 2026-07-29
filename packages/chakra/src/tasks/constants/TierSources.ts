/**
 * Chakra shade tier each data source maps to. The engine has no
 * numeric-shade generator (no `s50`..`s900` scale) — the only per-role
 * color data available is the canonical resolved role
 * (`state.roles`) and the `dark`/`light` framings produced by
 * `derive:variant` (`state.variants['dark' | 'light']`). This maps
 * those three sources onto a minimal three-tier Chakra scale.
 */
export const TIER_SOURCES: readonly { 'source': 'roles' | 'dark' | 'light'; 'tier': string }[] = [
  { 'source': 'light', 'tier': '100' },
  { 'source': 'roles', 'tier': '500' },
  { 'source': 'dark',  'tier': '900' }
];
