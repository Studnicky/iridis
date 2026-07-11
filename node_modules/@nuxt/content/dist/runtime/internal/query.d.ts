import type { Collections, CollectionQueryBuilder, CollectionQueryGroup } from '@nuxt/content';
export declare const collectionQueryGroup: <T extends keyof Collections>(collection: T) => CollectionQueryGroup<Collections[T]>;
export declare const collectionQueryBuilder: <T extends keyof Collections>(collection: T, fetch: (collection: T, sql: string) => Promise<Collections[T][]>) => CollectionQueryBuilder<Collections[T]>;
