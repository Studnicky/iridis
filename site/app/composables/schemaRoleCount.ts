/**
 * Parses an `iridis-N` schema name's role count, defaulting to 32 (matching
 * DEFAULT_SCHEMA_NAME's own tier) for anything that doesn't parse.
 */
export function schemaRoleCount(name: string): number {
  const parsed = parseInt(name.replace('iridis-', ''), 10);
  return Number.isNaN(parsed) ? 32 : parsed;
}
