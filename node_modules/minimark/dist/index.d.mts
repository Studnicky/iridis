import { MinimarkNode as MinimarkNode$1, MinimarkTree as MinimarkTree$1 } from "./types";

//#region src/types/tree.d.ts
type MinimarkText = string;
type MinimarkElement = [string, Record<string, unknown>, ...MinimarkNode[]];
type MinimarkNode = MinimarkElement | MinimarkText;
type MinimarkTree = {
  type: 'minimark';
  value: MinimarkNode[];
};
type MinimalTree = {
  type: 'minimal';
  value: MinimarkNode[];
};
//#endregion
//#region src/types/stringify.d.ts
interface StringifyOptions {
  /**
   * @default '\n\n'
   */
  blockSeparator: string;
  /**
   * @default 'markdown/mdc'
   */
  format: 'markdown/mdc' | 'markdown/html' | 'text/html';
  /**
   * user defined node handlers
   */
  handlers: Record<string, NodeHandler>;
  /**
   * @default true
   */
  removeLastStyle?: boolean;
}
type NodeHandler = (node: MinimarkElement, state: State, parent?: MinimarkElement) => string;
interface Context extends StringifyOptions {
  /**
   * true if node is inside html scope
   */
  html?: boolean;
  /**
   * true if node is inside a list
   */
  list?: boolean;
  /**
   * number if node is inside an ordered list
   */
  order?: number;
  [key: string]: unknown;
}
type State = {
  handlers: Record<string, NodeHandler>;
  context: Context;
  flow: NodeHandler;
  one: (node: MinimarkNode, state: State, parent?: MinimarkElement) => string;
  applyContext: (edit: Record<string, unknown>) => Record<string, unknown>;
};
//#endregion
//#region src/utils/index.d.ts
declare function textContent(node: MinimarkNode): string;
//#endregion
//#region src/utils/visit.d.ts
declare function visit(tree: MinimarkTree$1, checker: (node: MinimarkNode$1) => boolean, visitor: (node: MinimarkNode$1) => MinimarkNode$1 | undefined): void;
//#endregion
export { Context, MinimalTree, MinimarkElement, MinimarkNode, MinimarkText, MinimarkTree, NodeHandler, State, StringifyOptions, textContent, visit };