import { toHast, fromHast } from "minimark/hast";
import { visit as minimarkVisit } from "minimark";
export function compressTree(input) {
  return fromHast(input);
}
export function decompressTree(input) {
  return toHast({ type: "minimark", value: input.value });
}
export function visit(tree, checker, visitor) {
  minimarkVisit({ type: "minimark", value: tree.value }, checker, visitor);
}
