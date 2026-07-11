import { generateNavigationTree } from "./navigation.js";
export async function generateItemSurround(queryBuilder, path, opts) {
  const { before = 1, after = 1, fields = [] } = opts || {};
  const navigation = await generateNavigationTree(queryBuilder, fields);
  const flatData = flattedData(navigation);
  const index = flatData.findIndex((item) => item.path === path);
  const beforeItems = index === -1 ? [] : flatData.slice(index - before, index);
  const afterItems = index === -1 ? [] : flatData.slice(index + 1, index + after + 1);
  return [
    ...Array.from({ length: before }).fill(null).concat(beforeItems).slice(beforeItems.length),
    ...afterItems.concat(Array.from({ length: after }).fill(null)).slice(0, after)
  ];
}
export function flattedData(data) {
  const flatData = data.flatMap((item) => {
    const children = item.children ? flattedData(item.children) : [];
    if (item.page === false || children.length && children.find((c) => c.path === item.path)) {
      return children;
    }
    return [{ ...item, children: void 0 }, ...children];
  });
  return flatData;
}
