//#region src/types.d.ts
interface ResourceMeta {
  src?: string;
  file: string;
  css?: string[];
  assets?: string[];
  isEntry?: boolean;
  name?: string;
  isDynamicEntry?: boolean;
  sideEffects?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  module?: boolean;
  prefetch?: boolean;
  preload?: boolean;
  resourceType?: "audio" | "document" | "embed" | "fetch" | "font" | "image" | "object" | "script" | "style" | "track" | "worker" | "video";
  mimeType?: string;
}
interface Manifest {
  [key: string]: ResourceMeta;
}
declare function defineManifest(manifest: Manifest): Manifest;
//#endregion
//#region src/runtime.d.ts
interface ModuleDependencies {
  scripts: Record<string, ResourceMeta>;
  styles: Record<string, ResourceMeta>;
  preload: Record<string, ResourceMeta>;
  prefetch: Record<string, ResourceMeta>;
}
interface SSRContext {
  renderResourceHints?: (...args: unknown[]) => unknown;
  renderScripts?: (...args: unknown[]) => unknown;
  renderStyles?: (...args: unknown[]) => unknown;
  modules?: Set<string>;
  _registeredComponents?: Set<string>;
  _requestDependencies?: ModuleDependencies;
  [key: string]: unknown;
}
interface RenderOptions {
  buildAssetsURL?: (id: string) => string;
  /** @deprecated Use `precomputed` instead for better performance */
  manifest?: Manifest;
  /** Precomputed dependency data */
  precomputed?: PrecomputedData;
  /**
  * Maximum number of entries kept in the per-request module-set cache
  * (`_dependencySets`). The cache is keyed by the sorted module ids of a
  * request; on high-cardinality sites it can grow without bound and pin
  * manifest references for the lifetime of the renderer. A bounded LRU
  * keeps a hot working set without unbounded growth.
  *
  * Set to `0` (or any non-positive / non-finite value) to disable the
  * cache entirely; useful for prerender runs or for sites whose request
  * variation makes the cache pure overhead.
  *
  * @default 1000
  */
  dependencySetsCacheSize?: number;
}
interface RendererContext {
  buildAssetsURL: (id: string) => string;
  manifest?: Manifest;
  precomputed?: PrecomputedData;
  _dependencies: Record<string, ModuleDependencies>;
  _dependencySets: Map<string, ModuleDependencies>;
  _dependencySetsCacheSize: number;
  _entrypoints: string[];
  updateManifest: (manifest: Manifest) => void;
}
interface LinkAttributes {
  rel: string | null;
  href: string;
  as?: string | null;
  type?: string | null;
  crossorigin?: "" | null;
}
declare function createRendererContext({
  manifest,
  precomputed,
  buildAssetsURL,
  dependencySetsCacheSize
}: RenderOptions): RendererContext;
declare function getModuleDependencies(id: string, rendererContext: RendererContext): ModuleDependencies;
declare function getAllDependencies(ids: Set<string>, rendererContext: RendererContext): ModuleDependencies;
interface RequestDependenciesOptions {
  /**
  * Module ids to exclude from dependency resolution. Excluded ids are
  * subtracted from the merged id set before resolution, so chunks reachable
  * only through them are also dropped. Has no effect on `renderStyles`,
  * `renderScripts`, or `getResources`, which deliberately ignore this option.
  */
  exclude?: Iterable<string>;
}
declare function getRequestDependencies(ssrContext: SSRContext, rendererContext: RendererContext, options?: RequestDependenciesOptions): ModuleDependencies;
declare function renderStyles(ssrContext: SSRContext, rendererContext: RendererContext): string;
declare function getResources(ssrContext: SSRContext, rendererContext: RendererContext): LinkAttributes[];
declare function renderResourceHints(ssrContext: SSRContext, rendererContext: RendererContext, options?: RequestDependenciesOptions): string;
declare function renderResourceHeaders(ssrContext: SSRContext, rendererContext: RendererContext, options?: RequestDependenciesOptions): Record<string, string>;
declare function getPreloadLinks(ssrContext: SSRContext, rendererContext: RendererContext, options?: RequestDependenciesOptions): LinkAttributes[];
declare function getPrefetchLinks(ssrContext: SSRContext, rendererContext: RendererContext, options?: RequestDependenciesOptions): LinkAttributes[];
declare function renderScripts(ssrContext: SSRContext, rendererContext: RendererContext): string;
type RenderFunction = (ssrContext: SSRContext, rendererContext: RendererContext) => unknown;
type CreateApp<App> = (ssrContext: SSRContext) => App | Promise<App>;
type ImportOf<T> = T | {
  default: T;
} | Promise<T> | Promise<{
  default: T;
}>;
type RenderToString<App> = (app: App, ssrContext: SSRContext) => string | Promise<string>;
interface Renderer {
  rendererContext: RendererContext;
  renderToString: (ssrContext: SSRContext) => Promise<{
    html: string;
    renderResourceHeaders: () => Record<string, string>;
    renderResourceHints: () => string;
    renderStyles: () => string;
    renderScripts: () => string;
  }>;
}
declare function createRenderer<App>(createApp: ImportOf<CreateApp<App>>, renderOptions: RenderOptions & {
  renderToString: RenderToString<App>;
}): Renderer;
//#endregion
//#region src/precompute.d.ts
interface PrecomputedData {
  /** Pre-resolved dependencies for each module */
  dependencies: Record<string, ModuleDependencies>;
  /** List of entry point module IDs */
  entrypoints: string[];
  /** Module metadata needed at runtime (file paths, etc.) */
  modules: Record<string, Pick<ResourceMeta, "file" | "resourceType" | "mimeType" | "module">>;
}
/**
* Build-time utility to precompute all module dependencies from a manifest.
* This eliminates recursive dependency resolution at runtime.
*
* @param manifest The build manifest
* @returns Serializable precomputed data for runtime use
*/
declare function precomputeDependencies(manifest: Manifest): PrecomputedData;
//#endregion
export { ResourceMeta as C, Manifest as S, getResources as _, RenderOptions as a, renderScripts as b, RequestDependenciesOptions as c, createRendererContext as d, getAllDependencies as f, getRequestDependencies as g, getPreloadLinks as h, RenderFunction as i, SSRContext as l, getPrefetchLinks as m, precomputeDependencies as n, Renderer as o, getModuleDependencies as p, ModuleDependencies as r, RendererContext as s, PrecomputedData as t, createRenderer as u, renderResourceHeaders as v, defineManifest as w, renderStyles as x, renderResourceHints as y };