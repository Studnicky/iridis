import type { ContentNavigationItem, PageCollectionItemBase, SurroundOptions } from '@nuxt/content';
import type { CollectionQueryBuilder } from '~/src/types';
export declare function generateItemSurround<T extends PageCollectionItemBase>(queryBuilder: CollectionQueryBuilder<T>, path: string, opts?: SurroundOptions<keyof T>): Promise<ContentNavigationItem[]>;
export declare function flattedData(data: ContentNavigationItem[]): ContentNavigationItem[];
