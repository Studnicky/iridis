import type { Processor } from 'unified';
import type { MDCStringifyOptions, MDCRoot } from '@nuxtjs/mdc';
export declare function createStringifyProcessor(options?: MDCStringifyOptions): Processor<undefined, import("hast").Root, import("unist").Node, import("mdast").Root, string>;
export declare function createMarkdownStringifier(options?: MDCStringifyOptions): (value: any, data?: Record<string, any>) => Promise<string>;
export declare function stringifyMarkdown(MDCAst: MDCRoot, data: Record<string, any>, options?: MDCStringifyOptions): Promise<string | null>;
