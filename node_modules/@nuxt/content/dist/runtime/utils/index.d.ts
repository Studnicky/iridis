import type { ContentNavigationItem } from '../../types/index.js';
type FindPageBreadcrumbOptions = {
    current?: boolean;
    indexAsChild?: boolean;
};
export declare function findPageBreadcrumb(navigation?: ContentNavigationItem[], path?: string | undefined | null, options?: FindPageBreadcrumbOptions): ContentNavigationItem[];
type FindPageOptions = {
    indexAsChild?: boolean;
};
export declare function findPageChildren(navigation?: ContentNavigationItem[], path?: string | undefined | null, options?: FindPageOptions): ContentNavigationItem[];
export declare function findPageSiblings(navigation?: ContentNavigationItem[], path?: string | undefined | null, options?: FindPageOptions): ContentNavigationItem[];
export declare function findPageHeadline(navigation?: ContentNavigationItem[], path?: string | undefined | null, options?: FindPageOptions): string | undefined;
export {};
