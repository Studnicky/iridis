import type { PropType } from 'vue';
import type { MDCParseOptions } from '@nuxtjs/mdc';
declare var __VLS_1: {
    data: any;
    body: any;
    toc: any;
    excerpt: any;
    error: import("nuxt/app").NuxtError<unknown> | undefined;
};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_1) => any;
};
declare const __VLS_base: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    tag: {
        type: (StringConstructor | BooleanConstructor)[];
        default: string;
    };
    /**
     * Raw markdown string or parsed markdown object from `parseMarkdown`
     */
    value: {
        type: (StringConstructor | ObjectConstructor)[];
        required: true;
    };
    /**
     * Render only the excerpt
     */
    excerpt: {
        type: BooleanConstructor;
        default: boolean;
    };
    /**
     * Options for `parseMarkdown`
     */
    parserOptions: {
        type: PropType<MDCParseOptions>;
        default: () => {};
    };
    /**
     * Class to be applied to the root element
     */
    class: {
        type: (StringConstructor | ObjectConstructor | ArrayConstructor)[];
        default: string;
    };
    /**
     * Tags to unwrap separated by spaces
     * Example: 'ul li'
     */
    unwrap: {
        type: (StringConstructor | BooleanConstructor)[];
        default: boolean;
    };
    /**
     * Async Data Unique Key
     * @default `hash(props.value)`
     */
    cacheKey: {
        type: StringConstructor;
        default: undefined;
    };
    /**
     * Partial parsing (if partial is `true`, title and toc generation will not be generated)
     */
    partial: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    tag: {
        type: (StringConstructor | BooleanConstructor)[];
        default: string;
    };
    /**
     * Raw markdown string or parsed markdown object from `parseMarkdown`
     */
    value: {
        type: (StringConstructor | ObjectConstructor)[];
        required: true;
    };
    /**
     * Render only the excerpt
     */
    excerpt: {
        type: BooleanConstructor;
        default: boolean;
    };
    /**
     * Options for `parseMarkdown`
     */
    parserOptions: {
        type: PropType<MDCParseOptions>;
        default: () => {};
    };
    /**
     * Class to be applied to the root element
     */
    class: {
        type: (StringConstructor | ObjectConstructor | ArrayConstructor)[];
        default: string;
    };
    /**
     * Tags to unwrap separated by spaces
     * Example: 'ul li'
     */
    unwrap: {
        type: (StringConstructor | BooleanConstructor)[];
        default: boolean;
    };
    /**
     * Async Data Unique Key
     * @default `hash(props.value)`
     */
    cacheKey: {
        type: StringConstructor;
        default: undefined;
    };
    /**
     * Partial parsing (if partial is `true`, title and toc generation will not be generated)
     */
    partial: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{}>, {
    tag: string | boolean;
    excerpt: boolean;
    parserOptions: MDCParseOptions;
    class: string | unknown[] | Record<string, any>;
    unwrap: string | boolean;
    cacheKey: string;
    partial: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
