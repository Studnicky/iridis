import { type H3Event } from 'h3';
export declare function fetchDatabase(event: H3Event | undefined, collection: string): Promise<string>;
export declare function fetchQuery<Item>(event: H3Event | undefined, collection: string, sql: string): Promise<Item[]>;
