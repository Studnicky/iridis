//#region src/types/tree.d.ts
type MinimarkText = string;
type MinimarkElement = [string, Record<string, unknown>, ...MinimarkNode[]];
type MinimarkNode = MinimarkElement | MinimarkText;
type MinimarkTree = {
  type: 'minimark';
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
//#region src/stringify.d.ts
declare function stringify(node: MinimarkTree, options?: Partial<StringifyOptions>): string;
//#endregion
export { stringify };