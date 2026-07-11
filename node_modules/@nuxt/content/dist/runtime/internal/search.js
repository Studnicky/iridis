import { toHast } from "minimark/hast";
import { pick } from "./utils.js";
const HEADING = /^h([1-6])$/;
const headingLevel = (tag) => Number(tag.match(HEADING)?.[1] ?? 0);
export async function generateSearchSections(queryBuilder, opts) {
  const { ignoredTags = [], extraFields = [], minHeading = "h1", maxHeading = "h6" } = opts || {};
  const minLevel = headingLevel(minHeading);
  const maxLevel = headingLevel(maxHeading);
  const documents = await queryBuilder.where("extension", "=", "md").select("path", "body", "description", "title", ...extraFields || []).all();
  return documents.flatMap((doc) => splitPageIntoSections(doc, { ignoredTags, extraFields, minLevel, maxLevel }));
}
function splitPageIntoSections(page, { ignoredTags, extraFields, minLevel, maxLevel }) {
  const body = !page.body || page.body?.type === "root" ? page.body : toHast(page.body);
  const path = page.path ?? "";
  const extraFieldsData = pick(extraFields)(page);
  const sections = [{
    ...extraFieldsData,
    id: path,
    title: page.title || "",
    titles: [],
    content: (page.description || "").trim(),
    level: 1
  }];
  if (!body?.children) {
    return sections;
  }
  let section = 1;
  let previousHeadingLevel = 0;
  const titles = [page.title ?? ""];
  for (const item of body.children) {
    const tag = item.tag || "";
    const level = headingLevel(tag);
    if (level >= minLevel && level <= maxLevel) {
      const title = extractTextFromAst(item).trim();
      if (level === 1) {
        titles.splice(0, titles.length);
      } else if (level < previousHeadingLevel) {
        titles.splice(level - 1, titles.length - 1);
      } else if (level === previousHeadingLevel) {
        titles.pop();
      }
      sections.push({
        ...extraFieldsData,
        id: `${path}#${item.props?.id}`,
        title,
        titles: [...titles],
        content: "",
        level
      });
      titles.push(title);
      previousHeadingLevel = level;
      section += 1;
    } else {
      const content = extractTextFromAst(item, ignoredTags).trim();
      if (section === 1 && sections[section - 1]?.content === content) {
        continue;
      }
      sections[section - 1].content = `${sections[section - 1].content} ${content}`.trim();
    }
  }
  return sections;
}
function extractTextFromAst(node, ignoredTags = []) {
  let text = "";
  if (node.type === "text") {
    text += node.value || "";
  }
  if (ignoredTags.includes(node.tag ?? "")) {
    return "";
  }
  if (node.children?.length) {
    text += node.children.map((child) => extractTextFromAst(child, ignoredTags)).filter(Boolean).join("");
  }
  return text;
}
const FTS_TABLE = "_fts_search";
const indexedCollections = /* @__PURE__ */ new Set();
let ftsTableCreated = false;
export function _resetFTSState() {
  indexedCollections.clear();
  ftsTableCreated = false;
}
export async function resetFTSIndex(db) {
  await db.exec(`DROP TABLE IF EXISTS ${FTS_TABLE}`);
  indexedCollections.clear();
  ftsTableCreated = false;
}
export async function buildFTSIndex(db, collection, queryBuilder, opts) {
  if (indexedCollections.has(collection)) {
    return;
  }
  if (!ftsTableCreated) {
    await db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS ${FTS_TABLE} USING fts5(collection UNINDEXED, id UNINDEXED, title, title_normalized, titles UNINDEXED, content, level UNINDEXED)`);
    ftsTableCreated = true;
  }
  const sections = await generateSearchSections(queryBuilder, opts);
  for (const section of sections) {
    const titleNormalized = section.title.replace(/([a-z])([A-Z])/g, "$1 $2");
    await db.exec(
      `INSERT INTO ${FTS_TABLE} (collection, id, title, title_normalized, titles, content, level) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [collection, section.id, section.title, titleNormalized, JSON.stringify(section.titles), section.content, section.level]
    );
  }
  indexedCollections.add(collection);
}
export async function queryFTS(db, collections, query, opts) {
  const { limit = 20, snippet, fields, minTermLength = 1, weights } = opts || {};
  const titleWeight = weights?.title ?? 20;
  const contentWeight = weights?.content ?? 5;
  const headingExponent = weights?.heading ?? 0.5;
  const tag = (snippet?.tag ?? "mark").replace(/[^a-z0-9]/gi, "");
  const pre = `<${tag}>`;
  const post = `</${tag}>`;
  const placeholders = collections.map(() => "?").join(", ");
  const collectionFilter = `collection IN (${placeholders})`;
  const bm25Expr = `bm25(${FTS_TABLE}, 0, 0, ${titleWeight}, ${titleWeight}, 0, ${contentWeight}, 0)`;
  const rankExpr = headingExponent > 0 ? `(${bm25Expr} / pow(level, ${headingExponent}))` : bm25Expr;
  let selectClause = `collection, id, title, titles, content, level, ${rankExpr} as rank`;
  const snippetColumns = snippet?.columns ?? (snippet ? ["content"] : []);
  const around = Number(snippet?.around) || 30;
  const wantContentSnippet = snippetColumns.includes("content");
  if (wantContentSnippet) {
    selectClause += `, snippet(${FTS_TABLE}, 5, '${pre}', '${post}', '...', ${around}) as snippet_content`;
  }
  const terms = query.split(/\s+/).filter((t) => t.length >= minTermLength);
  if (!terms.length) return [];
  const ftsQuery = terms.map((term) => {
    const escaped = term.replace(/"/g, '""');
    if (fields?.length) {
      return fields.map((f) => `${f} : "${escaped}"*`).join(" OR ");
    }
    return `"${escaped}"*`;
  }).join(" ");
  const sql = `SELECT ${selectClause} FROM ${FTS_TABLE} WHERE ${FTS_TABLE} MATCH ? AND ${collectionFilter} ORDER BY rank LIMIT ?`;
  const params = [ftsQuery, ...collections, limit];
  let rows;
  try {
    rows = await db.all(sql, params);
  } catch (err) {
    if (import.meta.dev) {
      console.warn("[nuxt-content] FTS query failed:", err);
    }
    return [];
  }
  const wantTitleSnippet = snippetColumns.includes("title");
  const titleRegex = wantTitleSnippet ? new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi") : null;
  return rows.map((row) => ({
    collection: row.collection,
    id: row.id,
    title: row.title,
    titles: JSON.parse(row.titles || "[]"),
    level: row.level,
    content: row.content,
    rank: row.rank,
    ...snippetColumns.length && {
      snippets: {
        ...wantTitleSnippet && { title: row.title.replace(titleRegex, `${pre}$1${post}`) },
        ...wantContentSnippet && { content: row.snippet_content }
      }
    }
  }));
}
