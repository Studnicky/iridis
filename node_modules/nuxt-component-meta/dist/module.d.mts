import * as _nuxt_schema from '@nuxt/schema';
import { ComponentsDir, ComponentsOptions, Component } from '@nuxt/schema';
import { MetaCheckerOptions, ComponentMeta } from 'vue-component-meta';
import { J as JsonSchema } from './shared/nuxt-component-meta.KxfHq62s.mjs';

interface ModuleOptions {
    /**
     * Directory where files metas are outputed upon parsing.
     *
     * It will create `component-meta.d.ts` and `component-meta.mjs` files.
     */
    outputDir?: string;
    /**
     * Nuxt root directory.
     *
     * Should be auto-filled by the module/process.
     */
    rootDir?: string;
    /**
     * Debug level: true, false or 2.
     *
     * 2 will log every timings for components parsing.
     */
    debug?: boolean | 2;
    /**
     * Components directories pushed in the include list.
     */
    componentDirs: (string | ComponentsDir)[];
    /**
     * Components options pushed in include list.
     */
    components?: ComponentsOptions[];
    /**
     * Component paths and/or path regexps to be excluded.
     */
    exclude?: (string | RegExp | ((component: any) => boolean))[];
    /**
     * Component paths and/or path regexps to be included.
     */
    include?: (string | RegExp | ((component: any) => boolean))[];
    /**
     * vue-component-meta checker options.
     */
    checkerOptions?: MetaCheckerOptions;
    /**
     * Extra transformers to be run on top of each component code.
     *
     * `component` will be the Nuxt component options for this component and `code` the code of the component.
     */
    transformers?: ((component: any, code: string) => ({
        component: any;
        code: string;
    }))[];
    /**
     * Filter all components that are not global.
     */
    globalsOnly?: boolean;
    overrides: {
        [componentName: string]: {
            props?: {
                [propName: string]: {
                    "name": string;
                    "global"?: boolean;
                    "description"?: string;
                    "tags"?: Array<{
                        "name": string;
                        "text": string;
                    }>;
                    "required"?: boolean;
                    "type": string;
                    "schema"?: JsonSchema;
                    "default"?: string;
                };
            };
            slots?: {
                [slotName: string]: any;
            };
            events?: {
                [eventName: string]: any;
            };
            exposed?: {
                [exposedName: string]: any;
            };
        };
    };
    /**
     * Filter meta properties to be included in the output.
     */
    metaFields: {
        type: boolean;
        props: boolean | 'no-schema';
        slots: boolean | 'no-schema';
        events: boolean | 'no-schema';
        exposed: boolean | 'no-schema';
    };
    /**
     * Allow to load external components definitions.
     *
     * It can be a path to a file exporting a default object of components definitions or an object of components definitions.
     */
    metaSources?: (string | Partial<NuxtComponentMeta>)[];
}
interface ModuleHooks {
    'component-meta:transformers'(data: TransformersHookData): void;
    'component-meta:extend'(data: ExtendHookData): void;
    'component-meta:schema'(schema: NuxtComponentMeta): NuxtComponentMeta | Promise<NuxtComponentMeta>;
}

type ComponentMetaParserOptions = Omit<ModuleOptions, 'components' | 'metaSources'> & {
    components: Component[];
    metaSources?: NuxtComponentMeta;
    beforeWrite?: (schema: NuxtComponentMeta) => Promise<NuxtComponentMeta> | NuxtComponentMeta;
};
type ComponentData = Omit<Component, 'filePath' | 'shortPath'> & {
    meta: ComponentMeta;
    fullPath?: string;
    filePath?: string;
    shortPath?: string;
};
type NuxtComponentMeta = Record<string, ComponentData>;
interface TransformersHookData {
    meta: NuxtComponentMeta;
    path: string;
    source: string;
}
type ExtendHookData = ComponentMetaParserOptions;
/**
 * @deprecated Use TransformersHookData instead
 */
type HookData = TransformersHookData;

declare const _default: _nuxt_schema.NuxtModule<ModuleOptions, ModuleOptions, false>;

export { JsonSchema, _default as default };
export type { ComponentData, ComponentMetaParserOptions, ExtendHookData, HookData, ModuleHooks, ModuleOptions, NuxtComponentMeta, TransformersHookData };
