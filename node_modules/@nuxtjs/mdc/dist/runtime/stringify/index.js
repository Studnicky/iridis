import { unified } from "unified";
import gfm from "remark-gfm";
import mdc, { stringifyFrontMatter } from "remark-mdc";
import stringify from "remark-stringify";
import { mdcRemark } from "./mdc-remark.js";
export function createStringifyProcessor(options = {}) {
  return unified().use(function jsonParser() {
    this.parser = function(root) {
      return JSON.parse(root);
    };
  }).use(mdcRemark).use(gfm).use(mdc, options?.plugins?.["remark-mdc"]?.options || options?.plugins?.remarkMDC?.options || {}).use(stringify, {
    bullet: "-",
    emphasis: "*",
    rule: "-",
    listItemIndent: "one",
    fence: "`",
    fences: true,
    ...options?.plugins?.remarkStringify?.options
  });
}
export function createMarkdownStringifier(options = {}) {
  const processor = createStringifyProcessor(options);
  async function stringify2(value, data = {}) {
    const result = await processor.process({ value: JSON.stringify(value) });
    if (Object.keys(data).length) {
      return stringifyFrontMatter(data, result.value, options.frontMatter?.options);
    }
    return result.value;
  }
  return stringify2;
}
export async function stringifyMarkdown(MDCAst, data, options = {}) {
  const processor = createMarkdownStringifier(options);
  if (!MDCAst) return null;
  return await processor(MDCAst, data);
}
