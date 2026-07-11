import type { Root as HastRoot } from 'hast';
import type { Options as ToMdastOptions } from 'hast-util-to-mdast';
import type { Root as MDastRoot } from 'mdast';
import type { VFile } from 'vfile';
interface Options extends ToMdastOptions {
}
export declare function mdcRemark(options?: Options | undefined | null): (node: HastRoot, _file: VFile) => MDastRoot;
export {};
