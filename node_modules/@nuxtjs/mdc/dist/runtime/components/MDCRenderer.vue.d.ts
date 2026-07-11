import type { PropType, DefineComponent } from 'vue';
import type { MDCRoot } from '@nuxtjs/mdc';
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: DefineComponent<import("vue").ExtractPropTypes<{
    /**
     * Content to render
     */
    body: {
        type: PropType<MDCRoot>;
        required: true;
    };
    /**
     * Document meta data
     */
    data: {
        type: ObjectConstructor;
        default: () => {};
    };
    /**
     * Class(es) to bind to the component
     */
    class: {
        type: (StringConstructor | ObjectConstructor)[];
        default: undefined;
    };
    /**
     * Root tag to use for rendering
     */
    tag: {
        type: (StringConstructor | BooleanConstructor)[];
        default: undefined;
    };
    /**
     * Whether or not to render Prose components instead of HTML tags
     */
    prose: {
        type: BooleanConstructor;
        default: undefined;
    };
    /**
     * The map of custom components to use for rendering.
     */
    components: {
        type: PropType<Record<string, string | DefineComponent<any, any, any>>>;
        default: () => {};
    };
    /**
     * Tags to unwrap separated by spaces
     * Example: 'ul li'
     */
    unwrap: {
        type: (StringConstructor | BooleanConstructor)[];
        default: boolean;
    };
}>, {
    tags: import("vue").ComputedRef<any>;
    contentKey: import("vue").ComputedRef<string>;
    route: any;
    runtimeData: {
        [x: string]: any;
    };
    updateRuntimeData: (code: string, value: any) => {
        [x: string]: any;
    };
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    /**
     * Content to render
     */
    body: {
        type: PropType<MDCRoot>;
        required: true;
    };
    /**
     * Document meta data
     */
    data: {
        type: ObjectConstructor;
        default: () => {};
    };
    /**
     * Class(es) to bind to the component
     */
    class: {
        type: (StringConstructor | ObjectConstructor)[];
        default: undefined;
    };
    /**
     * Root tag to use for rendering
     */
    tag: {
        type: (StringConstructor | BooleanConstructor)[];
        default: undefined;
    };
    /**
     * Whether or not to render Prose components instead of HTML tags
     */
    prose: {
        type: BooleanConstructor;
        default: undefined;
    };
    /**
     * The map of custom components to use for rendering.
     */
    components: {
        type: PropType<Record<string, string | DefineComponent<any, any, any>>>;
        default: () => {};
    };
    /**
     * Tags to unwrap separated by spaces
     * Example: 'ul li'
     */
    unwrap: {
        type: (StringConstructor | BooleanConstructor)[];
        default: boolean;
    };
}>> & Readonly<{}>, {
    tag: string | boolean;
    class: string | Record<string, any>;
    unwrap: string | boolean;
    data: Record<string, any>;
    components: Record<string, string | DefineComponent<any, any, any>>;
    prose: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
