import type { GenerateSearchSectionsOptions, SearchCollectionOptions, SearchResult, Section } from './internal/search.js';
import type { Collections, PageCollections, CollectionQueryBuilder, SurroundOptions, SQLOperator, QueryGroupFunction, ContentNavigationItem } from '@nuxt/content';
import type { MaybeRefOrGetter } from 'vue';
export type { SearchCollectionOptions, SearchResult, GenerateSearchSectionsOptions, Section } from './internal/search.js';
interface ChainablePromise<T extends keyof PageCollections, R> extends Promise<R> {
    where(field: keyof PageCollections[T] | string, operator: SQLOperator, value?: unknown): ChainablePromise<T, R>;
    andWhere(groupFactory: QueryGroupFunction<PageCollections[T]>): ChainablePromise<T, R>;
    orWhere(groupFactory: QueryGroupFunction<PageCollections[T]>): ChainablePromise<T, R>;
    order(field: keyof PageCollections[T], direction: 'ASC' | 'DESC'): ChainablePromise<T, R>;
}
export declare const queryCollection: <T extends keyof Collections>(collection: T) => CollectionQueryBuilder<Collections[T]>;
export declare function queryCollectionNavigation<T extends keyof PageCollections>(collection: T, fields?: Array<keyof PageCollections[T]>): ChainablePromise<T, ContentNavigationItem[]>;
export declare function queryCollectionItemSurroundings<T extends keyof PageCollections>(collection: T, path: string, opts?: SurroundOptions<keyof PageCollections[T]>): ChainablePromise<T, ContentNavigationItem[]>;
export declare function queryCollectionSearchSections<T extends keyof PageCollections, const K extends keyof PageCollections[T]>(collection: T, opts: Omit<GenerateSearchSectionsOptions, 'extraFields'> & {
    extraFields: K[];
}): ChainablePromise<T, Array<Section & Pick<PageCollections[T], K>>>;
export declare function queryCollectionSearchSections<T extends keyof PageCollections>(collection: T, opts?: GenerateSearchSectionsOptions): ChainablePromise<T, Section[]>;
export declare function useSearchCollection<T extends keyof PageCollections>(collection: MaybeRefOrGetter<T | T[]>, opts?: GenerateSearchSectionsOptions & {
    immediate?: boolean;
}): {
    status: import("vue").Ref<"error" | "ready" | "idle" | "loading", "error" | "ready" | "idle" | "loading">;
    search: (query: string, searchOpts?: SearchCollectionOptions) => Promise<SearchResult[]>;
    init: () => Promise<any>;
};
