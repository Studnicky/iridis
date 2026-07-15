/** Built-in schema-tier identifiers; the registry also accepts
 *  dispatcher-published `custom-<timestamp>` entries authored via the
 *  RoleSchemaEditor. The map's key type is widened to `string` to admit
 *  those custom entries; built-in tier names remain the canonical default
 *  set. */
export type SchemaNameType = 'iridis-4' | 'iridis-8' | 'iridis-12' | 'iridis-16' | 'iridis-32';

/** The schema tier every palette pipeline falls back to when `schemaName` doesn't resolve a registered entry. */
export const DEFAULT_SCHEMA_NAME: SchemaNameType = 'iridis-32';
