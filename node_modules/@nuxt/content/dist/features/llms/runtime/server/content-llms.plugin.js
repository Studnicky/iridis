import { appendHeader } from "h3";
import { withBase } from "ufo";
import { createDocumentGenerator, prepareContentSections } from "./utils.js";
import { defineNitroPlugin, queryCollection } from "#imports";
export default defineNitroPlugin((nitroApp) => {
  const prerenderPaths = /* @__PURE__ */ new Set();
  nitroApp.hooks.hook("llms:generate", async (event, options) => {
    prepareContentSections(options.sections);
    const sectionsToRemove = [];
    for (const index in options.sections) {
      const section = options.sections[index];
      if (!section.contentCollection) {
        continue;
      }
      const query = queryCollection(event, section.contentCollection).select("path", "title", "seo", "description").where("path", "NOT LIKE", "%/.navigation");
      const filters = section.contentFilters || [];
      for (const filter of filters) {
        query.where(filter.field, filter.operator, filter.value);
      }
      const docs = await query.all();
      if (docs.length === 0 && section.__nuxt_content_auto_generate) {
        sectionsToRemove.push(index);
        continue;
      }
      section.links ||= [];
      section.links.push(...docs.map((doc) => {
        return {
          title: doc.title || doc?.seo?.title || "",
          description: doc.description || doc?.seo?.description || "",
          href: getDocumentLink(doc.path, section.contentCollection, options)
        };
      }));
    }
    sectionsToRemove.reverse().forEach((index) => {
      options.sections.splice(Number(index), 1);
    });
  });
  nitroApp.hooks.hook("llms:generate:full", async (event, options, contents) => {
    prepareContentSections(options.sections);
    const generateDocument = await createDocumentGenerator();
    for (const index in options.sections) {
      const section = options.sections[index];
      if (!section.contentCollection) {
        continue;
      }
      const query = queryCollection(event, section.contentCollection).where("path", "NOT LIKE", "%/.navigation");
      const filters = section.contentFilters || [];
      for (const filter of filters) {
        query.where(filter.field, filter.operator, filter.value);
      }
      const docs = await query.all();
      for (const doc of docs) {
        await nitroApp.hooks.callHook("content:llms:generate:document", event, doc, options);
        const markdown = await generateDocument(doc, options);
        contents.push(markdown);
      }
    }
  });
  if (["nitro-prerender", "nitro-dev"].includes(import.meta.preset)) {
    nitroApp.hooks.hook("beforeResponse", (event) => {
      if (event.path === "/") {
        appendHeader(event, "x-nitro-prerender", Array.from(prerenderPaths));
      }
    });
  }
  function getDocumentLink(link, collection, options) {
    const contentRawMarkdown = options?.contentRawMarkdown;
    if (contentRawMarkdown === false || contentRawMarkdown?.rewriteLLMSTxt === false || contentRawMarkdown?.excludeCollections?.includes(collection)) {
      return withBase(link, options.domain);
    }
    link = `/raw${link}.md`;
    if (link.endsWith("/.md")) {
      link = link.slice(0, -3) + "index.md";
    }
    prerenderPaths.add(link);
    return withBase(link, options.domain);
  }
});
