import { unified } from "unified";
import remarkParse from "remark-parse";
import remark2rehype from "remark-rehype";
import { parseFrontMatter } from "remark-mdc";
import { defu } from "defu";
import { nodeTextContent } from "../utils/node.js";
import { useProcessorPlugins } from "./utils/plugins.js";
import { defaults } from "./options.js";
import { generateToc } from "./toc.js";
import { compileHast } from "./compiler.js";
let moduleOptions;
let generatedMdcConfigs;
export const createParseProcessor = async (inlineOptions = {}) => {
  if (!moduleOptions) {
    moduleOptions = await import(
      "#mdc-imports"
      /* @vite-ignore */
    ).catch(() => ({}));
  }
  if (!generatedMdcConfigs) {
    generatedMdcConfigs = await import(
      "#mdc-configs"
      /* @vite-ignore */
    ).then((r) => r.getMdcConfigs()).catch(() => []);
  }
  const mdcConfigs = [
    ...generatedMdcConfigs || [],
    ...inlineOptions.configs || []
  ];
  if (inlineOptions.highlight != null && inlineOptions.highlight != false && inlineOptions.highlight.highlighter !== void 0 && typeof inlineOptions.highlight.highlighter !== "function") {
    if (process.dev)
      console.warn("[@nuxtjs/mdc] `highlighter` passed to `parseMarkdown` is should be a function, but got " + JSON.stringify(inlineOptions.highlight.highlighter) + ", ignored.");
    inlineOptions = {
      ...inlineOptions,
      highlight: {
        ...inlineOptions.highlight
      }
    };
    delete inlineOptions.highlight.highlighter;
  }
  const options = defu(inlineOptions, {
    remark: { plugins: moduleOptions?.remarkPlugins },
    rehype: { plugins: moduleOptions?.rehypePlugins },
    highlight: moduleOptions?.highlight
  }, defaults);
  if (options.rehype?.plugins?.highlight) {
    if (inlineOptions.highlight === false) {
      delete options.rehype.plugins.highlight;
    } else {
      options.rehype.plugins.highlight.options = defu({}, options.rehype.plugins.highlight.options, options.highlight || {});
    }
  }
  let processor = unified();
  for (const config of mdcConfigs) {
    processor = await config.unified?.pre?.(processor) || processor;
  }
  processor.use(remarkParse);
  for (const config of mdcConfigs) {
    processor = await config.unified?.remark?.(processor) || processor;
  }
  await useProcessorPlugins(processor, options.remark?.plugins);
  processor.use(remark2rehype, options.rehype?.options);
  for (const config of mdcConfigs) {
    processor = await config.unified?.rehype?.(processor) || processor;
  }
  await useProcessorPlugins(processor, options.rehype?.plugins);
  processor.use(compileHast, options);
  for (const config of mdcConfigs) {
    processor = await config.unified?.post?.(processor) || processor;
  }
  return processor;
};
export const createMarkdownParser = async (inlineOptions = {}) => {
  const processor = await createParseProcessor(inlineOptions);
  return async function parse(md, { fileOptions } = {}) {
    const { content, data: frontmatter } = await parseFrontMatter(md);
    const cwd = typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : "/tmp";
    const processedFile = await new Promise((resolve, reject) => {
      processor.process({ cwd, ...fileOptions, value: content, data: frontmatter }, (err, file) => {
        if (err) {
          reject(err);
        } else {
          resolve(file);
        }
      });
    });
    const parsedContent = processedFile?.result;
    const data = Object.assign(
      inlineOptions.contentHeading !== false ? contentHeading(parsedContent.body) : {},
      frontmatter,
      processedFile?.data || {}
    );
    const parsedResult = { data, body: parsedContent.body };
    const userTocOption = data.toc ?? inlineOptions.toc;
    if (userTocOption !== false) {
      const tocOption = defu({}, userTocOption, defaults.toc);
      parsedResult.toc = generateToc(parsedContent.body, tocOption);
    }
    if (parsedContent.excerpt) {
      parsedResult.excerpt = parsedContent.excerpt;
    }
    return parsedResult;
  };
};
export const parseMarkdown = async (md, markdownParserOptions = {}, parseOptions = {}) => {
  const parser = await createMarkdownParser(markdownParserOptions);
  return parser(md.replace(/\r\n/g, "\n"), parseOptions);
};
export function contentHeading(body) {
  let title = "";
  let description = "";
  const children = body.children.filter((node) => node.type === "element" && node.tag !== "hr");
  if (children.length && children[0].tag === "h1") {
    const node = children.shift();
    title = nodeTextContent(node);
  }
  if (children.length && children[0].tag === "p") {
    const node = children.shift();
    description = nodeTextContent(node);
  }
  return {
    title,
    description
  };
}
