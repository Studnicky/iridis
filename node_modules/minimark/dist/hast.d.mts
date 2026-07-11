//#region src/types/tree.d.ts
type MinimarkText = string;
type MinimarkElement = [string, Record<string, unknown>, ...MinimarkNode[]];
type MinimarkNode = MinimarkElement | MinimarkText;
type MinimarkTree = {
  type: 'minimark';
  value: MinimarkNode[];
};
//#endregion
//#region src/hast.d.ts
interface HastNode {
  type: 'element' | 'text' | 'comment';
  tag?: string;
  value?: string;
  props?: Record<string, unknown>;
  children?: HastNode[];
}
declare function fromHast(tree: {
  type: 'root';
  children: HastNode[];
}): MinimarkTree;
declare function toHast(tree: MinimarkTree): {
  type: 'root';
  children: HastNode[];
};
//#endregion
export { fromHast, toHast };