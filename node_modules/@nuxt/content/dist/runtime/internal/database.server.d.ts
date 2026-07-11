import type { H3Event } from 'h3';
import type { DatabaseAdapter, RuntimeConfig } from '@nuxt/content';
export default function loadDatabaseAdapter(config: RuntimeConfig['content']): DatabaseAdapter;
export declare function checkAndImportDatabaseIntegrity(event: H3Event, collection: string, config: RuntimeConfig['content']): Promise<void>;
