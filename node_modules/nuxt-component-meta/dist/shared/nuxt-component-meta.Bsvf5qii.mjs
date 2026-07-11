import { createCheckerByJson } from 'vue-component-meta';
import { existsSync, readFileSync } from 'fs';
import { joinURL } from 'ufo';

function createMetaChecker(opts) {
  const baseUrl = joinURL(opts.rootDir, ".nuxt");
  let paths = void 0;
  try {
    const appTsconfig = JSON.parse(readFileSync(joinURL(baseUrl, "tsconfig.app.json"), "utf8"));
    const sharedTsconfig = JSON.parse(readFileSync(joinURL(baseUrl, "tsconfig.shared.json"), "utf8"));
    paths = {
      ...appTsconfig.compilerOptions.paths,
      ...sharedTsconfig.compilerOptions.paths
    };
  } catch {
  }
  return createCheckerByJson(
    opts.rootDir,
    {
      extends: `${opts.rootDir}/tsconfig.json`,
      skipLibCheck: true,
      include: opts.include?.map((path) => {
        const ext = path.split(".").pop();
        return ["vue", "ts", "tsx", "js", "jsx"].includes(ext) ? tryResolveTypesDeclaration(path) : `${path}/**/*`;
      }),
      exclude: [],
      ...paths ? { compilerOptions: { baseUrl, paths } } : {}
    },
    opts.checkerOptions || {
      forceUseTs: true,
      schema: true
      // Enable schema expansion by default
    }
  );
}
function tryResolveTypesDeclaration(fullPath) {
  const isNodeModule = fullPath.includes("node_modules");
  let resolvedPath = fullPath;
  if (isNodeModule && fullPath.endsWith(".vue")) {
    const patterns = [
      fullPath.replace(".vue", ".d.vue.ts"),
      fullPath.replace(".vue", ".vue.d.ts"),
      fullPath.replace(".vue", ".d.ts")
    ];
    for (const pattern of patterns) {
      if (existsSync(pattern)) {
        resolvedPath = pattern;
        break;
      }
    }
  }
  return resolvedPath;
}

const slotReplacer = (_, _before, slotName, _rest) => `<slot ${_before || ""}${slotName === "default" ? "" : `name="${slotName}"`}`;
const defaultTransformers = [
  // @nuxt/content support
  (component, code) => {
    if (code.includes("MDCSlot")) {
      code = code.replace(/<MDCSlot\s*([^>]*)?:use="\$slots\.([a-zA-Z0-9_]+)"/gm, slotReplacer);
      code = code.replace(/<MDCSlot\s*([^>]*)?name="([a-zA-Z0-9_]+)"/gm, slotReplacer);
      code = code.replace(/<\/MDCSlot>/gm, "</slot>");
    }
    if (code.includes("ContentSlot")) {
      code = code.replace(/<ContentSlot\s*([^>]*)?:use="\$slots\.([a-zA-Z0-9_]+)"/gm, slotReplacer);
      code = code.replace(/<ContentSlot\s*([^>]*)?name="([a-zA-Z0-9_]+)"/gm, slotReplacer);
      code = code.replace(/<\/ContentSlot>/gm, "</slot>");
    }
    const name = code.match(/(const|let|var) ([a-zA-Z][a-zA-Z-_0-9]*) = useSlots\(\)/)?.[2] || "$slots";
    const _slots = code.match(new RegExp(`${name}\\.[a-zA-Z]+`, "gm"));
    if (_slots) {
      const slots = _slots.map((s) => s.replace(name + ".", "")).map((s) => `<slot name="${s}" />`);
      code = code.replace(/<template>/, `<template>
${slots.join("\n")}
`);
    }
    const slotNames = code.match(/(const|let|var) {([^}]+)}\s*=\s*useSlots\(\)/)?.[2];
    if (slotNames) {
      const slots = slotNames.trim().split(",").map((s) => s.trim().split(":")[0]?.trim()).map((s) => `<slot name="${s}" />`);
      code = code.replace(/<template>/, `<template>
${slots.join("\n")}
`);
    }
    if (/declare const __VLS_export/.test(code)) {
      const matchWithSlots = code.match(/__VLS_WithSlots<\s*import\("vue"\)\.DefineComponent<([\s\S]*?)>,\s*([A-Za-z0-9_]+)\s*>/m);
      const matchDefineOnly = matchWithSlots ? null : code.match(/import\("vue"\)\.DefineComponent<([\s\S]*?)>/m);
      const generic = matchWithSlots?.[1] || matchDefineOnly?.[1] || "any";
      const head = code.split(/declare const __VLS_export/)[0] || "";
      const extend = matchWithSlots ? ` & { new (): { $slots: ${matchWithSlots?.[2]} } }` : "";
      code = [
        `${head}`,
        `export default {} as (import("vue").DefineComponent<${generic}>${extend});`
      ].join("\n").replace("export default _default;", "");
    }
    return { component, code };
  }
];

export { createMetaChecker as c, defaultTransformers as d, tryResolveTypesDeclaration as t };
