import { dirname, parse, join } from "pathe";
import { withoutLeadingSlash, withLeadingSlash } from "ufo";
export const PreviewConfigFiles = {
  appConfig: "app.config.ts",
  appConfigV4: "app/app.config.ts",
  nuxtConfig: "nuxt.config.ts"
};
export function withoutRoot(path) {
  return path?.startsWith("content/") ? path.split("/").slice(1).join("/") : withoutLeadingSlash(path);
}
export function withoutPrefixNumber(path, leadingSlash = false) {
  if (!path) {
    return path;
  }
  return leadingSlash ? withLeadingSlash(path.replace(/\/\d+\./, "/")) : withoutLeadingSlash(path.replace(/^\d+\./, ""));
}
export function generateStemFromPath(path) {
  const pathWithoutRoot = withoutRoot(path);
  return join(dirname(pathWithoutRoot), parse(pathWithoutRoot).name);
}
export function mergeDraft(dbFiles = [], draftAdditions, draftDeletions) {
  const additions = [...draftAdditions || []];
  const deletions = [...draftDeletions || []];
  const mergedFiles = JSON.parse(JSON.stringify(dbFiles));
  for (const addition of additions) {
    if (addition.new) {
      mergedFiles.push({ path: addition.path, parsed: addition.parsed });
    } else if (addition.oldPath) {
      deletions.splice(deletions.findIndex((d) => d.path === addition.oldPath), 1);
      const oldPathExistInCache = additions.find((a) => a.path === addition.oldPath);
      if (oldPathExistInCache) {
        mergedFiles.push({ path: addition.path, parsed: addition.parsed });
      } else {
        const file = mergedFiles.find((f) => f.path === addition.oldPath);
        if (file) {
          file.path = addition.path;
          if (addition.parsed) {
            file.parsed = addition.parsed;
          } else if (addition.pathMeta) {
            ["_file", "_path", "_id", "_locale"].forEach((key) => {
              file.parsed[key] = addition.pathMeta[key];
            });
          }
        }
      }
    } else {
      const file = mergedFiles.find((f) => f.path === addition.path);
      if (file) {
        Object.assign(file, { path: addition.path, parsed: addition.parsed });
      } else {
        mergedFiles.push({ path: addition.path, parsed: addition.parsed });
      }
    }
  }
  for (const deletion of deletions) {
    mergedFiles.splice(mergedFiles.findIndex((f) => f.path === deletion.path), 1);
  }
  const comperable = new Intl.Collator(void 0, { numeric: true });
  mergedFiles.sort((a, b) => comperable.compare(a.path, b.path));
  return mergedFiles;
}
