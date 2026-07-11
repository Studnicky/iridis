import { b as ClientBundleScanOptions, S as ServerBundleOptions, a as CustomCollection, R as RemoteCollection } from './shared/icon.Bv2czTRa.mjs';
export { C as ClientBundleOptions, c as RemoteCollectionSource } from './shared/icon.Bv2czTRa.mjs';
import { IconifyJSON } from '@iconify/types';

declare class IconUsageScanner {
    globInclude: string[];
    globExclude: string[];
    matchRegex: RegExp;
    constructor(scanOptions: ClientBundleScanOptions | true);
    extractFromCode(code: string, set: Set<string>): void;
    isFileMatch(path: string): boolean;
    scanFiles(cwd: string | string[], set?: Set<string>): Promise<Set<string>>;
}
declare function createMatchRegex(collections: string[] | Set<string>): RegExp;

interface ResolveBundleIconsOptions {
    /**
     * Icons explicitly requested, in `prefix:name` format (a leading `i-`/`i:` is stripped).
     *
     * Icons that cannot be resolved are reported in `failed`, callers are expected
     * to treat them as a hard error in production builds.
     */
    icons?: Iterable<string>;
    /**
     * Icons detected by scanning source files (e.g. with `IconUsageScanner`).
     *
     * Since extraction can have false positives, icons that cannot be resolved are
     * silently skipped and fall back to runtime loading.
     */
    scannedIcons?: Iterable<string>;
    /**
     * Icons contributed by integrations (e.g. through the `icon:clientBundleIcons` Nuxt hook).
     *
     * Icons that cannot be resolved are reported in `dropped` so integration authors
     * get a heads-up, but they do not fail the build and fall back to runtime loading.
     */
    extraIcons?: Iterable<string>;
    /**
     * Already-loaded custom collections, taking priority over installed `@iconify-json/*` packages.
     */
    customCollections?: IconifyJSON[];
    /**
     * Bundle every icon of `customCollections`, on top of the requested icons.
     *
     * @default false
     */
    includeCustomCollections?: boolean;
    /**
     * Directories used to resolve installed `@iconify-json/*` packages
     * (each is walked up like the Node.js module resolver).
     *
     * @default [process.cwd()]
     */
    resolvePaths?: string[];
}
interface ResolvedBundleIcons {
    collections: IconifyJSON[];
    count: number;
    failed: string[];
    dropped: string[];
}
/**
 * Resolve icon data for a client bundle from locally installed `@iconify-json/*`
 * packages and custom collections. Framework-agnostic: used by the Nuxt module's
 * `clientBundle` and by the standalone Vite plugin.
 */
declare function resolveBundleIcons(options: ResolveBundleIconsOptions): Promise<ResolvedBundleIcons>;
interface GenerateClientBundleOptions {
    /**
     * Size limit of the generated bundle in KB, uncompressed.
     * When exceeded, an error is thrown to prevent the build from continuing.
     * Set to `0` to disable the size limit check.
     *
     * @default 256
     */
    sizeLimitKb?: number;
}
/**
 * Generate the client bundle module code from resolved icon collections.
 *
 * The generated module exports `init(addIcon)`, which registers every bundled
 * icon through the passed `addIcon` (e.g. from `@iconify/vue`).
 */
declare function generateClientBundleCode(collections: IconifyJSON[], options?: GenerateClientBundleOptions): {
    code: string;
    bundleSizeKb: number;
};

declare function hasFullCollection(resolvePaths: string[]): boolean;
declare function resolveCollection(collection: string | IconifyJSON | CustomCollection | RemoteCollection, rootDir: string): Promise<string | IconifyJSON | RemoteCollection>;
declare function getCollectionPath(collection: string, resolvePaths: string[]): string;
declare function loadCustomCollection(collection: IconifyJSON | CustomCollection, rootDir: string): Promise<IconifyJSON>;
declare function discoverInstalledCollections(resolvePaths: string[]): Promise<ServerBundleOptions['collections']>;

declare const collectionNames: string[];

export { ClientBundleScanOptions, CustomCollection, IconUsageScanner, RemoteCollection, ServerBundleOptions, collectionNames, createMatchRegex, discoverInstalledCollections, generateClientBundleCode, getCollectionPath, hasFullCollection, loadCustomCollection, resolveBundleIcons, resolveCollection };
export type { GenerateClientBundleOptions, ResolveBundleIconsOptions, ResolvedBundleIcons };
