import type { SchemaNameType } from '~/composables/types/schemaName.ts';

export const SCHEMA_SELECTOR_ITEMS: readonly { label: string; value: SchemaNameType }[] = [
  { label: '4', value: 'iridis-4' },
  { label: '8', value: 'iridis-8' },
  { label: '12', value: 'iridis-12' },
  { label: '16', value: 'iridis-16' },
  { label: '32', value: 'iridis-32' }
];
