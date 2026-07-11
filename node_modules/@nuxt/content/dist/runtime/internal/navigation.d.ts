import type { PageCollectionItemBase, CollectionQueryBuilder } from '@nuxt/content';
/**
 * Create NavItem array to be consumed from runtime plugin.
 */
export declare function generateNavigationTree<T extends PageCollectionItemBase>(queryBuilder: CollectionQueryBuilder<T>, extraFields?: Array<keyof T>): Promise<ContentNavigationItem[]>;
export declare const generateTitle: (path: string) => string;
