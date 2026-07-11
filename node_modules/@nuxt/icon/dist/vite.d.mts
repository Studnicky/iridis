import { Plugin } from 'vite';
import { IconifyJSON } from '@iconify/types';
import { b as ClientBundleScanOptions, a as CustomCollection } from './shared/icon.Bv2czTRa.mjs';

interface NuxtIconVitePluginOptions {
    /**
     * List of icons to be bundled, each icon should be formatted as `prefix:icon`
     * (a leading `i-`/`i:` is stripped, e.g. `i-lucide:heart` works too).
     *
     * Unlike scanned icons, icons listed here hard-fail the build when they
     * cannot be resolved from the locally installed `@iconify-json/*` packages.
     */
    icons?: string[];
    /**
     * Scan source files for icon usages and bundle them as well.
     *
     * Unlike the Nuxt module (where the `<Icon>` component can fall back to a
     * server endpoint), bundling is the whole point of this plugin, so scanning
     * is enabled by default.
     *
     * @default true
     */
    scan?: boolean | ClientBundleScanOptions;
    /**
     * Custom icon collections: either inline `IconifyJSON` data or a directory
     * of SVG files (`{ prefix, dir }`).
     */
    customCollections?: (CustomCollection | IconifyJSON)[];
    /**
     * Bundle every icon of `customCollections`, on top of the requested icons.
     *
     * @default true
     */
    includeCustomCollections?: boolean;
    /**
     * Size limit of the icon bundle in KB, uncompressed.
     * When exceeded, this will prevent the build process from continuing.
     * Set to `0` to disable the size limit check.
     *
     * @default 256
     */
    sizeLimitKb?: number;
    /**
     * Directory to scan source files from, and to resolve `@iconify-json/*`
     * packages and custom collections against.
     *
     * @default Vite's resolved `config.root`
     */
    cwd?: string;
}
declare const BUNDLE_MODULE_ID = "virtual:nuxt-icon-bundle";
declare const REGISTER_MODULE_ID = "virtual:nuxt-icon-bundle/register";
/**
 * Standalone Vite plugin that bundles Iconify icons into the client build for
 * plain Vue/Vite apps (no Nuxt required), so icons render offline and during
 * SSR without requests to the Iconify API.
 *
 * It exposes two virtual modules:
 *
 * - `virtual:nuxt-icon-bundle` exports `init(addIcon)`, for integrations that
 *   want to register the bundled icons on their own copy of `@iconify/vue`
 *   (or any compatible icon store).
 * - `virtual:nuxt-icon-bundle/register` is a side-effect module that registers
 *   the bundled icons on `@iconify/vue` — just `import 'virtual:nuxt-icon-bundle/register'`
 *   in your entry file.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import { NuxtIconBundle } from '@nuxt/icon/vite'
 *
 * export default defineConfig({
 *   plugins: [NuxtIconBundle({ icons: ['lucide:heart'] })],
 * })
 * ```
 */
declare function NuxtIconBundle(options?: NuxtIconVitePluginOptions): Plugin;

export { BUNDLE_MODULE_ID, ClientBundleScanOptions, CustomCollection, NuxtIconBundle, REGISTER_MODULE_ID, NuxtIconBundle as default };
export type { NuxtIconVitePluginOptions };
