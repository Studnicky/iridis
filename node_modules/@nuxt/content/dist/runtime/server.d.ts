import type { H3Event } from 'h3';
import { type GenerateSearchSectionsOptions, type Section } from './internal/search.js';
import type { Collections, CollectionQueryBuilder, PageCollections, SurroundOptions, SQLOperator, QueryGroupFunction } from '@nuxt/content';
export type { GenerateSearchSectionsOptions, Section } from './internal/search.js';
interface ChainablePromise<T extends keyof PageCollections, R> extends Promise<R> {
    where(field: keyof PageCollections[T] | string, operator: SQLOperator, value?: unknown): ChainablePromise<T, R>;
    andWhere(groupFactory: QueryGroupFunction<PageCollections[T]>): ChainablePromise<T, R>;
    orWhere(groupFactory: QueryGroupFunction<PageCollections[T]>): ChainablePromise<T, R>;
    order(field: keyof PageCollections[T], direction: 'ASC' | 'DESC'): ChainablePromise<T, R>;
}
export declare const queryCollection: <T extends keyof Collections>(event: H3Event, collection: T) => CollectionQueryBuilder<Collections[T]>;
export declare function queryCollectionNavigation<T extends keyof PageCollections>(event: H3Event, collection: T, fields?: Array<keyof PageCollections[T]>): ChainablePromise<T, ContentNavigationItem[]>;
export declare function queryCollectionItemSurroundings<T extends keyof PageCollections>(event: H3Event, collection: T, path: string, opts?: SurroundOptions<keyof PageCollections[T]>): ChainablePromise<T, ContentNavigationItem[]>;
export declare function queryCollectionSearchSections<T extends keyof PageCollections, const K extends keyof PageCollections[T]>(event: H3Event, collection: T, opts: Omit<GenerateSearchSectionsOptions, 'extraFields'> & {
    extraFields: K[];
}): ChainablePromise<T, Array<Section & Pick<PageCollections[T], K>>>;
export declare function queryCollectionSearchSections<T extends keyof PageCollections>(event: H3Event, collection: T, opts?: GenerateSearchSectionsOptions): ChainablePromise<T, Section[]>;
