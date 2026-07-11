import type { PropType } from 'vue';
declare var __VLS_8: {};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_8) => any;
};
declare const __VLS_base: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    href: {
        type: StringConstructor;
        default: string;
    };
    target: {
        type: PropType<"_blank" | "_parent" | "_self" | "_top" | (string & object) | null | undefined>;
        default: undefined;
        required: false;
    };
}>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    href: {
        type: StringConstructor;
        default: string;
    };
    target: {
        type: PropType<"_blank" | "_parent" | "_self" | "_top" | (string & object) | null | undefined>;
        default: undefined;
        required: false;
    };
}>> & Readonly<{}>, {
    href: string;
    target: "_blank" | "_parent" | "_self" | "_top" | null | undefined;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
