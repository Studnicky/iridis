import { withLeadingSlash } from "ufo";
import { stringify } from "minimark/stringify";
import { queryCollection } from "@nuxt/content/server";
import { getRouterParams, eventHandler, createError, setHeader } from "h3";
import { useRuntimeConfig } from "#imports";
import collections from "#content/manifest";
export default eventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const llmsConfig = config.llms;
  const slug = getRouterParams(event)["slug.md"];
  if (!slug?.endsWith(".md") || llmsConfig?.contentRawMarkdown === false) {
    throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
  }
  let path = withLeadingSlash(slug.replace(".md", ""));
  if (path.endsWith("/index")) {
    path = path.substring(0, path.length - 6);
  }
  const excludeCollections = llmsConfig?.contentRawMarkdown?.excludeCollections || [];
  const _collections = Object.entries(collections).filter(([_key, value]) => value.type === "page" && !excludeCollections.includes(_key)).map(([key]) => key);
  let page = null;
  for (const collection of _collections) {
    page = await queryCollection(event, collection).path(path).first();
    if (page) {
      break;
    }
  }
  if (!page) {
    throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
  }
  if (page.body.value[0]?.[0] !== "h1") {
    page.body.value.unshift(["blockquote", {}, page.description]);
    page.body.value.unshift(["h1", {}, page.title]);
  }
  const links = page.links || page.meta?.links;
  if (Array.isArray(links) && links.length > 0) {
    const linkItems = links.filter((link) => link.label && link.to).map((link) => ["li", {}, ["a", { href: link.to }, link.label]]);
    if (linkItems.length > 0) {
      page.body.value.push(["hr"]);
      page.body.value.push(["ul", {}, ...linkItems]);
    }
  }
  setHeader(event, "Content-Type", "text/markdown; charset=utf-8");
  return stringify({ ...page.body, type: "minimark" }, { format: "markdown/html" });
});
