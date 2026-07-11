declare var __VLS_7: {
    body: any;
    data: {
        [x: string]: any;
    };
    dataContentId: any;
};
type __VLS_Slots = {} & {
    empty?: (props: typeof __VLS_7) => any;
};
declare const __VLS_base: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    /**
     * Content to render
     */
    value: {
        type: ObjectConstructor;
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
     * Root tag to use for rendering
     */
    tag: {
        type: StringConstructor;
        default: string;
    };
    /**
     * The map of custom components to use for rendering.
     */
    components: {
        type: ObjectConstructor;
        default: () => {};
    };
    data: {
        type: ObjectConstructor;
        default: () => {};
    };
    /**
     * Whether or not to render Prose components instead of HTML tags
     */
    prose: {
        type: BooleanConstructor;
        default: undefined;
    };
    /**
     * Root tag to use for rendering
     */
    class: {
        type: (StringConstructor | ObjectConstructor)[];
        default: undefined;
    };
    /**
     * Tags to unwrap separated by spaces
     * Example: 'ul li'
     */
    unwrap: {
        type: (StringConstructor | BooleanConstructor)[];
        default: boolean;
    };
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    /**
     * Content to render
     */
    value: {
        type: ObjectConstructor;
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
     * Root tag to use for rendering
     */
    tag: {
        type: StringConstructor;
        default: string;
    };
    /**
     * The map of custom components to use for rendering.
     */
    components: {
        type: ObjectConstructor;
        default: () => {};
    };
    data: {
        type: ObjectConstructor;
        default: () => {};
    };
    /**
     * Whether or not to render Prose components instead of HTML tags
     */
    prose: {
        type: BooleanConstructor;
        default: undefined;
    };
    /**
     * Root tag to use for rendering
     */
    class: {
        type: (StringConstructor | ObjectConstructor)[];
        default: undefined;
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
    data: Record<string, any>;
    class: string | Record<string, any>;
    excerpt: boolean;
    tag: string;
    components: Record<string, any>;
    prose: boolean;
    unwrap: string | boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
