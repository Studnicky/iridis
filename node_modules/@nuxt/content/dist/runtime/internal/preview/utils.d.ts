import type { CollectionSource } from '@nuxt/content';
export * from './files.js';
export declare const defu: import("defu").DefuFn;
export declare const createSingleton: <T, Params extends Array<unknown>>(fn: () => T) => (_args?: Params) => T;
export declare function deepDelete(obj: Record<string, unknown>, newObj: Record<string, unknown>): void;
export declare function deepAssign(obj: Record<string, unknown>, newObj: Record<string, unknown>): void;
export declare function parseSourceBase(source: CollectionSource): {
    fixed: any;
    dynamic: string;
};
/**
 * Format a date string as `YYYY-MM-DD` for SQL DATE columns.
 *
 * Duplicated from `src/utils/content/transformers/utils.ts` because that
 * file lives outside the `runtime/` subtree and is not emitted to dist.
 * Importing it from the preview runtime causes a broken path in the
 * published package.
 *
 * @see https://github.com/nuxt/content/issues/3742
 */
export declare const formatDate: (date: string) => string;
/**
 * Format a date string as `YYYY-MM-DD HH:mm:ss` for SQL DATETIME columns.
 *
 * @see {@link formatDate} for why this is duplicated here.
 * @see https://github.com/nuxt/content/issues/3742
 */
export declare const formatDateTime: (datetime: string) => string;
