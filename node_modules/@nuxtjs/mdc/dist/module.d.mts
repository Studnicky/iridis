import * as _nuxt_schema from '@nuxt/schema';
import { BundledLanguage, LanguageRegistration, BundledTheme, ThemeRegistrationAny } from 'shiki';
import { Options } from 'remark-rehype';
import { R as RehypeHighlightOption, M as MdcConfig, a as MdcThemeOptions } from './shared/mdc.B7_zBGwd.mjs';
export { A as Awaitable, H as HighlightResult, b as Highlighter, c as HighlighterOptions, d as defineConfig } from './shared/mdc.B7_zBGwd.mjs';
import { Options as Options$1 } from 'remark-stringify';
import { YamlToStringOptions, RemarkMDCOptions } from 'remark-mdc';
import 'unified';
import 'hast';

type NodePosition = {
    start: number;
    end: number;
};
type MDCText = {
    type: 'text';
    value: string;
    position?: NodePosition;
};
type MDCComment = {
    type: 'comment';
    value: string;
    position?: NodePosition;
};
type MDCElement = {
    type: 'element';
    tag: string;
    props: Record<string, any> | undefined;
    children: Array<MDCElement | MDCText | MDCComment>;
    position?: NodePosition;
};
type MDCNode = MDCElement | MDCText | MDCComment;
type MDCRoot = {
    type: 'root';
    children: Array<MDCNode>;
};
interface MDCData extends Record<string, any> {
    title: string;
    description: string;
}

interface TocLink {
    id: string;
    text: string;
    depth: number;
    children?: TocLink[];
}
interface Toc {
    title: string;
    depth: number;
    searchDepth: number;
    links: TocLink[];
}

interface RemarkPlugin {
    instance?: any;
    options?: Array<any> | Record<string, any>;
}
interface RehypePlugin {
    instance?: any;
    options?: Array<any> | Record<string, any>;
}
interface MDCParseOptions {
    remark?: {
        plugins?: Record<string, false | RemarkPlugin>;
    };
    rehype?: {
        options?: Options;
        plugins?: Record<string, false | RehypePlugin>;
    };
    highlight?: RehypeHighlightOption | false;
    toc?: {
        /**
         * Maximum heading depth to include in the table of contents.
         */
        depth?: number;
        searchDepth?: number;
    } | false;
    keepComments?: boolean;
    /**
     * Keep the position of the node
     */
    keepPosition?: boolean;
    /**
     * Extract content heading from the markdown file.
     *
     * @default true
     */
    contentHeading?: boolean;
    /**
     * Inline mdc.config.ts
     */
    configs?: MdcConfig[];
}
interface MDCParserResult {
    data: MDCData;
    body: MDCRoot;
    excerpt: MDCRoot | undefined;
    toc: Toc | undefined;
}

interface MDCStringifyOptions {
    frontMatter?: {
        options?: YamlToStringOptions;
    };
    plugins?: {
        'remarkStringify'?: {
            options?: Options$1;
        };
        /**
         * @deprecated use 'remark-mdc' instead
         */
        'remarkMDC'?: {
            options?: RemarkMDCOptions;
        };
        'remark-mdc'?: {
            options?: RemarkMDCOptions;
        };
    };
}

interface UnistPlugin {
    src?: string;
    options?: Record<string, any>;
}
interface ModuleOptions {
    /**
     * A map of remark plugins to be used for processing markdown.
     */
    remarkPlugins?: Record<string, UnistPlugin | false>;
    /**
     * A map of remark plugins to be used for processing markdown.
     */
    rehypePlugins?: Record<string, UnistPlugin | false>;
    highlight?: {
        /**
         * The highlighter to be used for highlighting code blocks.
         *
         * Set to `custom` to provide your own highlighter function in `mdc.config.ts`.
         * Set to `shiki` to use the builtin highlighter based on Shiki.
         * Or provide the path to your own highlighter module with the default export.
         *
         * @default 'shiki'
         */
        highlighter?: 'shiki' | 'custom' | string;
        /**
         * Default theme that will be used for highlighting code blocks.
         */
        theme?: MdcThemeOptions;
        /**
         * Languages to be bundled loaded by Shiki
         *
         * All languages used has to be included in this list at build time, to create granular bundles.
         *
         * Unlike the `preload` option, when this option is provided, it will override the default languages.
         *
         * @default ['js','jsx','json','ts','tsx','vue','css','html','bash','md','mdc','yaml']
         */
        langs?: (BundledLanguage | LanguageRegistration)[];
        /**
         * Additional themes to be bundled loaded by Shiki
         */
        themes?: (BundledTheme | ThemeRegistrationAny)[];
        /**
         * Engine to be used for Shiki
         *
         * Note that the `javascript` engine still in experimental, use with caution.
         *
         * @see https://shiki.style/guide/regex-engines
         * @default 'oniguruma'
         */
        shikiEngine?: 'oniguruma' | 'javascript';
        /**
         * Preloaded languages that will be available for highlighting code blocks.
         *
         * @deprecated use `langs` instead.
         */
        preload?: string[];
        /**
         * Inject background color to code block wrapper
         *
         * @default false
         */
        wrapperStyle?: boolean | string;
        noApiRoute?: boolean;
    } | false;
    headings?: {
        anchorLinks?: {
            [heading in 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6']?: boolean;
        } | boolean;
    };
    keepComments?: boolean;
    components?: {
        prose?: boolean;
        map?: Record<string, string>;
        /**
         * Custom element tags to ignore at MDC runtime (ex: ['mjx-container', 'my-element'])
         */
        customElements?: string[];
    };
}

/**
 * Info associated with nodes by the ecosystem.
 *
 * This space is guaranteed to never be specified by unist or specifications
 * implementing unist.
 * But you can use it in utilities and plugins to store data.
 *
 * This type can be augmented to register custom data.
 * For example:
 *
 * ```ts
 * declare module 'unist' {
 *   interface Data {
 *     // `someNode.data.myId` is typed as `number | undefined`
 *     myId?: number | undefined
 *   }
 * }
 * ```
 */
interface Data$1 {
    [key: string]: unknown;
}
/**
 * One place in a source file.
 */
interface Point {
    /**
     * Line in a source file (1-indexed integer).
     */
    line: number;
    /**
     * Column in a source file (1-indexed integer).
     */
    column: number;
    /**
     * Character in a source file (0-indexed integer).
     */
    offset?: number | undefined;
}
/**
 * Position of a node in a source document.
 *
 * A position is a range between two points.
 */
interface Position {
    /**
     * Place of the first character of the parsed source region.
     */
    start: Point;
    /**
     * Place of the first character after the parsed source region.
     */
    end: Point;
}
/**
 * Abstract unist node that contains the smallest possible value.
 *
 * This interface is supposed to be extended.
 *
 * For example, in HTML, a `text` node is a leaf that contains text.
 */
interface Literal$1 extends Node$1 {
    /**
     * Plain value.
     */
    value: unknown;
}
/**
 * Abstract unist node.
 *
 * The syntactic unit in unist syntax trees are called nodes.
 *
 * This interface is supposed to be extended.
 * If you can use {@link Literal} or {@link Parent}, you should.
 * But for example in markdown, a `thematicBreak` (`***`), is neither literal
 * nor parent, but still a node.
 */
interface Node$1 {
    /**
     * Node type.
     */
    type: string;
    /**
     * Info from the ecosystem.
     */
    data?: Data$1 | undefined;
    /**
     * Position of a node in a source document.
     *
     * Nodes that are generated (not in the original source document) must not
     * have a position.
     */
    position?: Position | undefined;
}
/**
 * Abstract unist node that contains other nodes (*children*).
 *
 * This interface is supposed to be extended.
 *
 * For example, in XML, an element is a parent of different things, such as
 * comments, text, and further elements.
 */
interface Parent$1 extends Node$1 {
    /**
     * List of children.
     */
    children: Node$1[];
}

/**
 * Info associated with hast nodes by the ecosystem.
 *
 * This space is guaranteed to never be specified by unist or hast.
 * But you can use it in utilities and plugins to store data.
 *
 * This type can be augmented to register custom data.
 * For example:
 *
 * ```ts
 * declare module 'hast' {
 *   interface Data {
 *     // `someNode.data.myId` is typed as `number | undefined`
 *     myId?: number | undefined
 *   }
 * }
 * ```
 */
type Data = Data$1;
/**
 * Info associated with an element.
 */
interface Properties {
    [PropertyName: string]: boolean | number | string | null | undefined | Array<string | number>;
}
/**
 * Union of registered hast nodes that can occur in {@link Element}.
 *
 * To register mote custom hast nodes, add them to {@link ElementContentMap}.
 * They will be automatically added here.
 */
type ElementContent = ElementContentMap[keyof ElementContentMap];
/**
 * Registry of all hast nodes that can occur as children of {@link Element}.
 *
 * For a union of all {@link Element} children, see {@link ElementContent}.
 */
interface ElementContentMap {
    comment: Comment;
    element: Element;
    text: Text;
}
/**
 * Union of registered hast nodes that can occur in {@link Root}.
 *
 * To register custom hast nodes, add them to {@link RootContentMap}.
 * They will be automatically added here.
 */
type RootContent = RootContentMap[keyof RootContentMap];
/**
 * Registry of all hast nodes that can occur as children of {@link Root}.
 *
 * > 👉 **Note**: {@link Root} does not need to be an entire document.
 * > it can also be a fragment.
 *
 * For a union of all {@link Root} children, see {@link RootContent}.
 */
interface RootContentMap {
    comment: Comment;
    doctype: Doctype;
    element: Element;
    text: Text;
}
/**
 * Union of registered hast nodes that can occur in {@link Root}.
 *
 * @deprecated Use {@link RootContent} instead.
 */
type Content = RootContent;
/**
 * Union of registered hast literals.
 *
 * To register custom hast nodes, add them to {@link RootContentMap} and other
 * places where relevant.
 * They will be automatically added here.
 */
type Literals = Extract<Nodes, Literal$1>;
/**
 * Union of registered hast nodes.
 *
 * To register custom hast nodes, add them to {@link RootContentMap} and other
 * places where relevant.
 * They will be automatically added here.
 */
type Nodes = Root | RootContent;
/**
 * Union of registered hast parents.
 *
 * To register custom hast nodes, add them to {@link RootContentMap} and other
 * places where relevant.
 * They will be automatically added here.
 */
type Parents = Extract<Nodes, Parent$1>;
/**
 * Abstract hast node.
 *
 * This interface is supposed to be extended.
 * If you can use {@link Literal} or {@link Parent}, you should.
 * But for example in HTML, a `Doctype` is neither literal nor parent, but
 * still a node.
 *
 * To register custom hast nodes, add them to {@link RootContentMap} and other
 * places where relevant (such as {@link ElementContentMap}).
 *
 * For a union of all registered hast nodes, see {@link Nodes}.
 */
interface Node extends Node$1 {
    /**
     * Info from the ecosystem.
     */
    data?: Data | undefined;
}
/**
 * Abstract hast node that contains the smallest possible value.
 *
 * This interface is supposed to be extended if you make custom hast nodes.
 *
 * For a union of all registered hast literals, see {@link Literals}.
 */
interface Literal extends Node {
    /**
     * Plain-text value.
     */
    value: string;
}
/**
 * Abstract hast node that contains other hast nodes (*children*).
 *
 * This interface is supposed to be extended if you make custom hast nodes.
 *
 * For a union of all registered hast parents, see {@link Parents}.
 */
interface Parent extends Node {
    /**
     * List of children.
     */
    children: RootContent[];
}
/**
 * HTML comment.
 */
interface Comment extends Literal {
    /**
     * Node type of HTML comments in hast.
     */
    type: 'comment';
    /**
     * Data associated with the comment.
     */
    data?: CommentData | undefined;
}
/**
 * Info associated with hast comments by the ecosystem.
 */
type CommentData = Data;
/**
 * HTML document type.
 */
interface Doctype extends Node$1 {
    /**
     * Node type of HTML document types in hast.
     */
    type: 'doctype';
    /**
     * Data associated with the doctype.
     */
    data?: DoctypeData | undefined;
}
/**
 * Info associated with hast doctypes by the ecosystem.
 */
type DoctypeData = Data;
/**
 * HTML element.
 */
interface Element extends Parent {
    /**
     * Node type of elements.
     */
    type: 'element';
    /**
     * Tag name (such as `'body'`) of the element.
     */
    tagName: string;
    /**
     * Info associated with the element.
     */
    properties: Properties;
    /**
     * Children of element.
     */
    children: ElementContent[];
    /**
     * When the `tagName` field is `'template'`, a `content` field can be
     * present.
     */
    content?: Root | undefined;
    /**
     * Data associated with the element.
     */
    data?: ElementData | undefined;
}
/**
 * Info associated with hast elements by the ecosystem.
 */
type ElementData = Data;
/**
 * Document fragment or a whole document.
 *
 * Should be used as the root of a tree and must not be used as a child.
 *
 * Can also be used as the value for the content field on a `'template'` element.
 */
interface Root extends Parent {
    /**
     * Node type of hast root.
     */
    type: 'root';
    /**
     * Children of root.
     */
    children: RootContent[];
    /**
     * Data associated with the hast root.
     */
    data?: RootData | undefined;
}
/**
 * Info associated with hast root nodes by the ecosystem.
 */
type RootData = Data;
/**
 * HTML character data (plain text).
 */
interface Text extends Literal {
    /**
     * Node type of HTML character data (plain text) in hast.
     */
    type: 'text';
    /**
     * Data associated with the text.
     */
    data?: TextData | undefined;
}
/**
 * Info associated with hast texts by the ecosystem.
 */
type TextData = Data;

interface MDCRenderOptions {
    documentMeta: MDCData;
    parentScope: any;
    resolveComponent: (component: any) => any;
}

declare const DefaultHighlightLangs: BundledLanguage[];
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions, ModuleOptions, false>;

declare module '@nuxt/schema' {
    interface NuxtHooks {
        'mdc:configSources': (configs: string[]) => void;
    }
    interface PublicRuntimeConfig {
        mdc: {
            components: {
                prose: boolean;
                map: Record<string, string>;
                customElements: string[];
            };
            headings: ModuleOptions['headings'];
            highlight: ModuleOptions['highlight'];
        };
    }
    interface ConfigSchema {
        runtimeConfig: {
            public?: {
                mdc: {
                    components: {
                        prose: boolean;
                        map: Record<string, string>;
                        customElements: string[];
                    };
                };
                headings: ModuleOptions['headings'];
            };
        };
    }
}

export { DefaultHighlightLangs, MdcConfig, MdcThemeOptions, RehypeHighlightOption, _default as default };
export type { Comment, CommentData, Content, Data, Doctype, DoctypeData, Element, ElementContent, ElementContentMap, ElementData, Literal, Literals, MDCComment, MDCData, MDCElement, MDCNode, MDCParseOptions, MDCParserResult, MDCRenderOptions, MDCRoot, MDCStringifyOptions, MDCText, ModuleOptions, Node, NodePosition, Nodes, Parent, Parents, Properties, RehypePlugin, RemarkPlugin, Root, RootContent, RootContentMap, RootData, Text, TextData, Toc, TocLink, UnistPlugin };
