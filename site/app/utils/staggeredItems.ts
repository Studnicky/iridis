export type StaggeredItem = {
  'id': string;
  'index': number;
  'role': string;
};

/**
 * Builds `count` items with a stable id and a role cycled from `roles`.
 * Callers map the result into their own per-theme style objects — this only
 * covers the id/role/index bookkeeping shared across logo-background themes.
 */
export function buildStaggeredItems(idPrefix: string, count: number, roles: readonly string[]): StaggeredItem[] {
  const result = Array.from({ 'length': count }, (_, i) => {return {
    'id':    `${idPrefix}-${i}`,
    'index': i,
    'role':  roles[i % roles.length]!
  };});
  return result;
}
