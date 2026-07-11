import { BuiltinTheme, Highlighter as Highlighter$1, ShikiTransformer, HighlighterCore } from 'shiki';
import { Processor } from 'unified';
import { ElementContent } from 'hast';

type MdcThemeOptions = BuiltinTheme | string | Record<string, BuiltinTheme | string>;
interface HighlighterOptions {
    highlights?: number[];
    meta?: string;
}
interface HighlightResult {
    tree: ElementContent[];
    className?: string;
    style?: string;
    inlineStyle?: string;
}
type Highlighter = (code: string, lang: string, theme: MdcThemeOptions, options: Partial<HighlighterOptions>) => Promise<HighlightResult>;
interface RehypeHighlightOption {
    theme?: MdcThemeOptions;
    highlighter?: Highlighter;
}

type Awaitable<T> = T | Promise<T>;
interface MdcConfig {
    /**
     * Hooks for the unified markdown pipeline
     */
    unified?: {
        /**
         * Custom setup for unified processor before other plugins
         */
        pre?: (processor: Processor) => Awaitable<undefined | Processor>;
        /**
         * Custom setup for unified processor after remark but before rehype
         */
        remark?: (processor: Processor) => Awaitable<undefined | Processor>;
        /**
         * Custom setup for unified processor after rehype
         */
        rehype?: (processor: Processor) => Awaitable<undefined | Processor>;
        /**
         * Custom setup for unified processor after all plugins
         */
        post?: (processor: Processor) => Awaitable<undefined | Processor>;
    };
    /**
     * Custom hightlighter, available when `highlighter` is set to `custom`
     */
    highlighter?: Highlighter$1;
    /**
     * Hooks for shiki
     */
    shiki?: {
        /**
         * Get transformers for shiki
         */
        transformers?: ShikiTransformer[] | ((code: string, lang: string, theme: MdcThemeOptions, options: Partial<HighlighterOptions>) => Awaitable<ShikiTransformer[]>);
        /**
         * Custom setup for shiki instance, only called once on server or client
         */
        setup?: (highlighter: HighlighterCore) => Awaitable<void>;
    };
}

declare function defineConfig(config: MdcConfig): MdcConfig;

export { defineConfig as d };
export type { Awaitable as A, HighlightResult as H, MdcConfig as M, RehypeHighlightOption as R, MdcThemeOptions as a, Highlighter as b, HighlighterOptions as c };
