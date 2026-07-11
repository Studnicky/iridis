import type { CollectionInfo, ResolvedCollectionSource } from '@nuxt/content';
export declare const getCollectionByFilePath: (path: string, collections: Record<string, CollectionInfo>) => {
    collection: CollectionInfo | undefined;
    matchedSource: ResolvedCollectionSource | undefined;
};
export declare const getCollectionByRoutePath: (routePath: string, collections: Record<string, CollectionInfo>) => {
    collection: CollectionInfo | undefined;
    matchedSource: ResolvedCollectionSource | undefined;
};
export declare function generateCollectionInsert(collection: CollectionInfo, data: Record<string, unknown>): string;
export declare function generateRecordUpdate(collection: CollectionInfo, stem: string, data: Record<string, unknown>): string;
export declare function generateRecordDeletion(collection: CollectionInfo, stem: string): string;
export declare function generateRecordSelectByColumn(collection: CollectionInfo, column: string, value: string): string;
