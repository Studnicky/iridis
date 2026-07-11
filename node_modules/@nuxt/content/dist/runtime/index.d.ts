import type { MDCRoot } from '@nuxtjs/mdc';
import type { MinimarkNode, MinimarkTree } from 'minimark';
import type { MinimalTree, MinimalNode } from '@nuxt/content';
type Tree = MinimalTree | MinimarkTree;
type Node = MinimalNode | MinimarkNode;
export declare function compressTree(input: MDCRoot): MinimarkTree;
export declare function decompressTree(input: Tree): MDCRoot;
export declare function visit(tree: Tree, checker: (node: Node) => boolean, visitor: (node: Node) => Node | undefined): void;
export {};
