import { defaultHandlers, toMdast } from "hast-util-to-mdast";
import { nodeTextContent } from "@nuxtjs/mdc/runtime/utils/node";
import { hasProtocol } from "ufo";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";
import { format } from "hast-util-format";
import { computeHighlightRanges, refineCodeLanguage } from "./utils.js";
const mdcRemarkElementType = "mdc-element";
const mdastTextComponentType = "textDirective";
const mdcTextComponentType = "textComponent";
const own = {}.hasOwnProperty;
export function mdcRemark(options) {
  return function(node, _file) {
    const tree = preProcessElementNodes(node);
    const mdast = toMdast(tree, {
      /**
       * Default to true in rehype-remark
       * @see https://github.com/rehypejs/rehype-remark/blob/main/lib/index.js#L37ckages/remark/lib/index.js#L100
       */
      document: true,
      newlines: true,
      ...options,
      handlers: {
        ...mdcRemarkHandlers,
        ...options?.handlers
      },
      nodeHandlers: {
        ...mdcRemarkNodeHandlers,
        ...options?.nodeHandlers
      }
    });
    visit(mdast, (node2) => node2.type === mdastTextComponentType, (node2, index, parent) => {
      node2.type = mdcTextComponentType;
      if (node2.name === "binding") {
        return;
      }
      if (index && parent && parent.children) {
        if (index > 0 && parent.children[index - 1]?.type === "text") {
          const text = parent.children[index - 1];
          if (!["\n", " ", "	"].includes(text.value.slice(-1))) {
            text.value += " ";
          }
        }
        if (index && index < parent.children.length - 1 && parent.children[index + 1]?.type === "text") {
          const text = parent.children[index + 1];
          if (!["\n", " ", "	", ",", "."].includes(text.value.slice(0, 1))) {
            text.value = " " + text.value;
          }
        }
      }
    });
    return mdast;
  };
}
function preProcessElementNodes(node) {
  if (node.type === "element") {
    if (node.children?.length && (node.children || []).every((child) => child.tag === "template")) {
      node.children = node.children.flatMap((child) => {
        if (typeof child.props?.["v-slot:default"] !== "undefined" && Object.keys(child.props).length === 1) {
          return child.children || [];
        }
        return child;
      });
    }
    const result = {
      type: mdcRemarkElementType,
      tagName: node.tag,
      properties: node.props,
      children: (node.children || []).map(preProcessElementNodes)
    };
    if (!node.children?.length) {
      delete result.children;
    }
    return result;
  }
  if (node?.children) {
    return {
      ...node,
      children: (node.children || []).map(preProcessElementNodes)
    };
  }
  return node;
}
const mdcRemarkNodeHandlers = {
  [mdcRemarkElementType]: (state, node, parent) => {
    if (node.properties && node.properties.dataMdast === "ignore") {
      return;
    }
    if (node.properties && (node.properties.className || node.properties["class-name"])) {
      const pascal = Array.isArray(node.properties.className || "") ? node.properties.className : String(node.properties.className || "").split(" ");
      const kebab = Array.isArray(node.properties["class-name"] || "") ? node.properties["class-name"] : String(node.properties["class-name"] || "").split(" ");
      node.properties.class = [node.properties.class || "", ...pascal, ...kebab].filter(Boolean).join(" ");
      Reflect.deleteProperty(node.properties, "className");
      Reflect.deleteProperty(node.properties, "class-name");
    }
    if (own.call(state.handlers, node.tagName)) {
      return state.handlers[node.tagName](state, node, parent) || void 0;
    }
    if ("value" in node && typeof node.value === "string") {
      const result = { type: "text", value: node.value };
      state.patch(node, result);
      return result;
    }
    const isInlineElement = isForcedToBeInlineByItsParent(node, parent);
    if (isInlineElement) {
      return {
        type: mdastTextComponentType,
        name: node.tagName,
        attributes: node.properties,
        children: state.all(node)
      };
    }
    if (!["li", "p"].includes(parent?.tagName || "") && !node.children?.length) {
      const attributes = Object.entries(node.properties || {});
      if (attributes.length < 4 && !attributes.some(([key, value]) => String(value).includes("\n") || key.startsWith(":"))) {
        return {
          type: "paragraph",
          children: [{
            type: mdastTextComponentType,
            name: node.tagName,
            attributes: node.properties,
            children: state.all(node)
          }]
        };
      }
    }
    let children = state.all(node);
    if (children.every((child) => [mdastTextComponentType, "text"].includes(child.type))) {
      children = [{ type: "paragraph", children }];
    }
    return {
      type: "containerComponent",
      name: node.tagName,
      attributes: node.properties,
      children
    };
  }
};
const mdcRemarkHandlers = {
  "template": (state, node) => {
    const vSlot = Object.keys(node.properties || {}).find((prop) => prop?.startsWith("v-slot:"))?.replace("v-slot:", "") || "default";
    const attributes = Object.fromEntries(Object.entries(node.properties || {}).filter(([key]) => !key.startsWith("v-slot:")));
    return {
      type: "componentContainerSection",
      name: vSlot,
      attributes,
      children: state.toFlow(state.all(node))
    };
  },
  "div": (state, node) => {
    return {
      type: "containerComponent",
      name: "div",
      attributes: node.properties,
      children: state.toFlow(state.all(node))
    };
  },
  "li": (state, node) => {
    const result = defaultHandlers.li(state, node);
    if (result.children[0]?.type === "paragraph") {
      const paragraph = result.children[0];
      const lastChild = paragraph.children[paragraph.children.length - 1];
      if (lastChild?.type === "text" && lastChild.value?.endsWith("\n")) {
        lastChild.value = lastChild.value.trim();
      }
    }
    return result;
  },
  "ul": (state, node, parent) => {
    const result = defaultHandlers.ul(state, node);
    return ["p", "li"].includes(parent?.tagName || "") ? result : { type: "paragraph", children: [result] };
  },
  "ol": (state, node, parent) => {
    const result = defaultHandlers.ol(state, node);
    return ["p", "li"].includes(parent?.tagName || "") ? result : { type: "paragraph", children: [result] };
  },
  "code": (state, node) => {
    const attributes = { ...node.properties };
    if ("style" in attributes && !attributes.style) {
      delete attributes.style;
    }
    if ("class" in attributes) {
      attributes.className = String(attributes.class).split(" ").filter(Boolean);
      delete attributes.class;
    }
    if (Array.isArray(attributes.className)) {
      attributes.className = attributes.className.filter((name) => !name.startsWith("language-"));
      if (Array.isArray(attributes.className) && !attributes.className.length) {
        delete attributes.className;
      }
    }
    if (attributes.language) {
      attributes.lang = refineCodeLanguage(attributes.language);
      delete attributes.language;
    }
    const result = { type: "inlineCode", value: nodeTextContent(node), attributes };
    state.patch(node, result);
    return result;
  },
  "pre": (_state, node) => {
    const meta = [
      node.properties.filename ? `[${String(node.properties.filename).replace(/\]/g, "\\]")}]` : "",
      node.properties.highlights?.length ? `{${computeHighlightRanges(node.properties.highlights)}}` : "",
      node.properties.meta
    ].filter(Boolean).join(" ");
    const value = String(node.properties.code || "").replace(/\n$/, "");
    return {
      type: "code",
      value,
      lang: refineCodeLanguage(node.properties.language),
      meta
    };
  },
  "button": (state, node, parent) => {
    if (isInlineNode(node, parent)) {
      return createTextComponent("button")(state, node);
    }
    return {
      type: "containerComponent",
      name: "button",
      children: state.all(node),
      attributes: node.properties
    };
  },
  "span": createTextComponent("span"),
  "kbd": createTextComponent("kbd"),
  "binding": createTextComponent("binding"),
  "iframe": createTextComponent("iframe"),
  "video": createTextComponent("video"),
  "nuxt-img": createTextComponent("nuxt-img"),
  "nuxt-picture": createTextComponent("nuxt-picture"),
  "br": createTextComponent("br"),
  "table": (state, node) => {
    visit(node, (node2) => {
      if (node2.type === mdcRemarkElementType) {
        node2.type = "element";
      }
    });
    if (Object.keys(node.properties).length) {
      format({ type: "root", children: [node] });
      return {
        type: "html",
        value: toHtml(node)
      };
    }
    return defaultHandlers.table(state, node);
  },
  "img": (state, node) => {
    const { src, title, alt, ...attributes } = node.properties || {};
    const result = {
      type: "image",
      url: state.resolve(String(src || "") || null),
      title: title ? String(title) : null,
      alt: alt ? String(alt) : "",
      attributes
    };
    state.patch(node, result);
    return result;
  },
  "em": (state, node) => {
    const result = { type: "emphasis", children: state.all(node), attributes: node.properties };
    state.patch(node, result);
    return result;
  },
  "strong": (state, node) => {
    const result = { type: "strong", children: state.all(node), attributes: node.properties };
    state.patch(node, result);
    return result;
  },
  a(state, node) {
    const { href, title, ...attributes } = node.properties || {};
    if (hasProtocol(String(href || ""))) {
      if (attributes.target === "_blank") {
        delete attributes.target;
      }
      if (["nofollow,noopener,noreferrer"].includes(String(attributes.rel))) {
        delete attributes.rel;
      }
    }
    const result = {
      type: "link",
      url: state.resolve(String(href || "") || null),
      title: title ? String(title) : null,
      children: state.all(node),
      attributes
    };
    state.patch(node, result);
    return result;
  }
};
function createTextComponent(name) {
  return (state, node) => {
    const result = {
      type: mdastTextComponentType,
      name,
      attributes: node.properties,
      children: state.all(node)
    };
    state.patch(node, result);
    return result;
  };
}
function isForcedToBeInlineByItsParent(node, parent) {
  if (["p", "li", "strong", "em", "span", "h1", "h2", "h3", "h4", "h5", "h6"].includes(parent?.tagName || "")) {
    return true;
  }
  if (parent?.children?.some((child) => child.type === "text")) {
    return true;
  }
  return false;
}
function isInlineNode(node, parent) {
  if (
    // @ts-expect-error: custom type
    node.children?.find((child) => child.type === mdcRemarkElementType) || node.children?.find((child) => child.type === "text" && child.value.includes("\n"))
  ) {
    return false;
  }
  if (!isForcedToBeInlineByItsParent(node, parent)) {
    return false;
  }
  return true;
}
