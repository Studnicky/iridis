import { ComponentMeta } from 'vue-component-meta';

type ComponentMetaTransformer = (component: any, code: string) => {
    component: any;
    code: string;
};

interface Options {
    rootDir: string;
    cache?: boolean;
    cacheDir?: string;
    /**
     * Extra transformers to be run on top of component code before parsing.
     */
    transformers?: ComponentMetaTransformer[];
}
declare function getComponentMeta(component: string, options?: Options): ComponentMeta;

export { getComponentMeta };
export type { Options };
