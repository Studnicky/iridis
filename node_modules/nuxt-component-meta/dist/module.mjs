import fs, { existsSync, readFileSync } from 'fs';
import { logger, createResolver, resolveAlias, defineNuxtModule, tryResolveModule, addImportsDir, addTemplate, addServerHandler } from '@nuxt/kit';
import { join, dirname, relative } from 'pathe';
import { createUnplugin } from 'unplugin';
import { performance } from 'perf_hooks';
import { resolvePathSync } from 'mlly';
import { hash } from 'ohash';
import { defu } from 'defu';
import { r as refineMeta } from './shared/nuxt-component-meta.jPHoGkDc.mjs';
import { t as tryResolveTypesDeclaration, c as createMetaChecker, d as defaultTransformers } from './shared/nuxt-component-meta.Bsvf5qii.mjs';
import 'scule';
import 'vue-component-meta';
import 'ufo';

function fnv1aHash(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}
const hashCache = /* @__PURE__ */ new WeakMap();
function computeHash(value) {
  const type = typeof value;
  if (value === null) return "null";
  if (value === void 0) return "undefined";
  if (type === "boolean") return `bool:${value}`;
  if (type === "number") return `num:${value}`;
  if (type === "string") return `str:${fnv1aHash(value)}`;
  if (type === "object") {
    const cached = hashCache.get(value);
    if (cached) return cached;
  }
  let hash;
  if (Array.isArray(value)) {
    const elemHashes = [];
    for (let i = 0; i < value.length; i++) {
      elemHashes.push(computeHash(value[i]));
    }
    hash = `arr:[${elemHashes.join(",")}]`;
  } else {
    const keys = Object.keys(value).sort();
    const pairs = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      pairs.push(`${key}:${computeHash(value[key])}`);
    }
    hash = `obj:{${pairs.join(",")}}`;
  }
  hashCache.set(value, hash);
  return hash;
}
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === void 0 || b === void 0) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  const isArrayA = Array.isArray(a);
  const isArrayB = Array.isArray(b);
  if (isArrayA !== isArrayB) return false;
  if (isArrayA) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  const keysSetB = new Set(keysB);
  for (const key of keysA) {
    if (!keysSetB.has(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}
function traverse(rootValue) {
  const hashRegistry = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new WeakMap();
  const valueToHash = /* @__PURE__ */ new WeakMap();
  const stringRegistry = /* @__PURE__ */ new Map();
  function visit(value, path) {
    if (typeof value === "string") {
      if (!stringRegistry.has(value)) {
        stringRegistry.set(value, { value, count: 0, index: null });
      }
      stringRegistry.get(value).count++;
      return;
    }
    if (value === null || typeof value !== "object") {
      return;
    }
    if (visited.has(value)) {
      return;
    }
    visited.set(value, true);
    const hash = computeHash(value);
    if (!hashRegistry.has(hash)) {
      hashRegistry.set(hash, {
        value,
        count: 0,
        locations: [],
        dependencies: /* @__PURE__ */ new Set(),
        refName: null
      });
    }
    const entry = hashRegistry.get(hash);
    if (!deepEqual(entry.value, value)) {
      let collisionIndex = 1;
      let newHash = `${hash}_c${collisionIndex}`;
      while (hashRegistry.has(newHash) && !deepEqual(hashRegistry.get(newHash).value, value)) {
        collisionIndex++;
        newHash = `${hash}_c${collisionIndex}`;
      }
      if (!hashRegistry.has(newHash)) {
        hashRegistry.set(newHash, {
          value,
          count: 0,
          locations: [],
          dependencies: /* @__PURE__ */ new Set(),
          refName: null
        });
      }
      const collisionEntry = hashRegistry.get(newHash);
      collisionEntry.count++;
      collisionEntry.locations.push([...path]);
      valueToHash.set(value, newHash);
    } else {
      entry.count++;
      entry.locations.push([...path]);
      valueToHash.set(value, hash);
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        visit(item, [...path, index]);
      });
    } else {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          visit(value[key], [...path, key]);
        }
      }
    }
  }
  visit(rootValue, []);
  return { hashRegistry, valueToHash, stringRegistry };
}
function analyzeDependencies(hashRegistry, valueToHash) {
  for (const [hash, entry] of hashRegistry.entries()) {
    let findContained = function(value) {
      if (value === null || typeof value !== "object") {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== null && typeof item === "object") {
            const itemHash = valueToHash.get(item);
            if (itemHash) {
              containedHashes.add(itemHash);
            }
            findContained(item);
          }
        });
      } else {
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            const child = value[key];
            if (child !== null && typeof child === "object") {
              const childHash = valueToHash.get(child);
              if (childHash) {
                containedHashes.add(childHash);
              }
              findContained(child);
            }
          }
        }
      }
    };
    if (entry.count < 3) continue;
    const containedHashes = /* @__PURE__ */ new Set();
    findContained(entry.value);
    for (const containedHash of containedHashes) {
      if (containedHash === hash) continue;
      const containedEntry = hashRegistry.get(containedHash);
      if (containedEntry && containedEntry.count >= 3) {
        entry.dependencies.add(containedHash);
      }
    }
  }
}
function topologicalSort(hashRegistry) {
  const duplicates = Array.from(hashRegistry.entries()).filter(([_, entry]) => entry.count >= 3);
  const graph = /* @__PURE__ */ new Map();
  const inDegree = /* @__PURE__ */ new Map();
  for (const [hash, _] of duplicates) {
    graph.set(hash, []);
    inDegree.set(hash, 0);
  }
  for (const [hash, entry] of duplicates) {
    for (const depHash of entry.dependencies) {
      if (inDegree.has(depHash)) {
        graph.get(depHash).push(hash);
        inDegree.set(hash, inDegree.get(hash) + 1);
      }
    }
  }
  const queue = [];
  const result = [];
  for (const [hash, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(hash);
    }
  }
  while (queue.length > 0) {
    const hash = queue.shift();
    const entry = hashRegistry.get(hash);
    result.push([hash, entry]);
    for (const dependent of graph.get(hash)) {
      inDegree.set(dependent, inDegree.get(dependent) - 1);
      if (inDegree.get(dependent) === 0) {
        queue.push(dependent);
      }
    }
  }
  if (result.length !== duplicates.length) {
    return duplicates;
  }
  return result;
}
function assignRefNames(sortedDuplicates) {
  const usedNames = /* @__PURE__ */ new Set();
  let refCounter = 0;
  const semanticPatterns = [
    { test: (v) => Array.isArray(v) && v.length === 0, name: "_emptyArray" },
    { test: (v) => !Array.isArray(v) && Object.keys(v).length === 0, name: "_emptyObject" }
  ];
  for (const [_, entry] of sortedDuplicates) {
    let refName = null;
    for (const pattern of semanticPatterns) {
      if (pattern.test(entry.value) && !usedNames.has(pattern.name)) {
        refName = pattern.name;
        break;
      }
    }
    if (!refName) {
      refName = `_ref${refCounter}`;
      refCounter++;
    }
    while (usedNames.has(refName)) {
      refName = `_ref${refCounter}`;
      refCounter++;
    }
    usedNames.add(refName);
    entry.refName = refName;
  }
}
const serializingValues = /* @__PURE__ */ new WeakSet();
function serializeValue(value, valueToHash, hashRegistry, stringRegistry) {
  if (value === null) return "null";
  if (value === void 0) return "undefined";
  const type = typeof value;
  if (type === "boolean" || type === "number") {
    return String(value);
  }
  if (type === "string") {
    const stringEntry = stringRegistry.get(value);
    if (stringEntry && stringEntry.index !== null && stringEntry.count >= 3) {
      return `_s[${stringEntry.index}]`;
    }
    return JSON.stringify(value);
  }
  if (type === "object") {
    const hash = valueToHash.get(value);
    if (hash && hashRegistry.has(hash)) {
      const entry = hashRegistry.get(hash);
      if (entry.refName && entry.count >= 3) {
        if (!serializingValues.has(value)) {
          return entry.refName;
        }
      }
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "[]";
      }
      const elements = value.map((item) => serializeValue(item, valueToHash, hashRegistry, stringRegistry));
      return "[" + elements.join(", ") + "]";
    } else {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return "{}";
      }
      const pairs = keys.map((key) => {
        const serializedValue = serializeValue(value[key], valueToHash, hashRegistry, stringRegistry);
        const serializedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
        return `${serializedKey}: ${serializedValue}`;
      });
      return "{" + pairs.join(", ") + "}";
    }
  }
  throw new Error(`Cannot serialize type: ${type}`);
}
function generateCode(rootValue, valueToHash, hashRegistry, sortedDuplicates, stringRegistry) {
  const lines = [];
  lines.push("// Auto-generated deduplicated module");
  lines.push("// Strings and objects extracted for memory efficiency");
  lines.push("");
  const deduplicatedStrings = Array.from(stringRegistry.values()).filter((entry) => entry.count >= 3).sort((a, b) => b.count - a.count);
  if (deduplicatedStrings.length > 0) {
    deduplicatedStrings.forEach((entry, index) => {
      entry.index = index;
    });
    lines.push("const _s = [");
    deduplicatedStrings.forEach((entry, index) => {
      const comma = index < deduplicatedStrings.length - 1 ? "," : "";
      lines.push(`  ${JSON.stringify(entry.value)}${comma}`);
    });
    lines.push("];");
    lines.push("");
  }
  for (const [_, entry] of sortedDuplicates) {
    serializingValues.add(entry.value);
    const code = serializeValue(entry.value, valueToHash, hashRegistry, stringRegistry);
    serializingValues.delete(entry.value);
    lines.push(`const ${entry.refName} = ${code};`);
  }
  if (sortedDuplicates.length > 0) {
    lines.push("");
  }
  const rootCode = serializeValue(rootValue, valueToHash, hashRegistry, stringRegistry);
  lines.push(`export default ${rootCode};`);
  return lines.join("\n");
}
function deduplicateJSON(jsonString) {
  const debug = typeof process !== "undefined" && process.env.DEBUG_TIMING;
  const t0 = debug ? Date.now() : 0;
  let rootValue;
  if (typeof jsonString === "string") {
    try {
      rootValue = JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  } else {
    rootValue = jsonString;
  }
  const t1 = debug ? Date.now() : 0;
  const { hashRegistry, valueToHash, stringRegistry } = traverse(rootValue);
  const t2 = debug ? Date.now() : 0;
  analyzeDependencies(hashRegistry, valueToHash);
  const t3 = debug ? Date.now() : 0;
  const sortedDuplicates = topologicalSort(hashRegistry);
  const t4 = debug ? Date.now() : 0;
  assignRefNames(sortedDuplicates);
  const t5 = debug ? Date.now() : 0;
  const code = generateCode(rootValue, valueToHash, hashRegistry, sortedDuplicates, stringRegistry);
  const t6 = debug ? Date.now() : 0;
  if (debug) {
    console.log("\nTiming breakdown:");
    console.log(`  Parse: ${t1 - t0}ms`);
    console.log(`  Traverse: ${t2 - t1}ms`);
    console.log(`  Analyze deps: ${t3 - t2}ms`);
    console.log(`  Topo sort: ${t4 - t3}ms`);
    console.log(`  Assign names: ${t5 - t4}ms`);
    console.log(`  Generate code: ${t6 - t5}ms`);
    console.log(`  Total: ${t6 - t0}ms`);
  }
  return code;
}

function optimiseJSON(content) {
  try {
    if (!content.startsWith("export default ")) {
      return content;
    }
    let jsonString = content.substring("export default ".length);
    if (jsonString.endsWith(";")) {
      jsonString = jsonString.substring(0, jsonString.length - 1);
    }
    const data = JSON.parse(jsonString);
    const result = deduplicateJSON(data);
    return result;
  } catch (error) {
    logger.warn("Failed to optimize JSON:", error);
    return content;
  }
}

function useComponentMetaParser({
  outputDir = join(process.cwd(), ".component-meta/"),
  rootDir = process.cwd(),
  components: _components = [],
  componentDirs = [],
  checkerOptions,
  exclude = [],
  overrides = {},
  transformers = [],
  debug = false,
  metaFields,
  metaSources = {},
  beforeWrite
}) {
  let components = { ...metaSources };
  const outputPath = join(outputDir, "component-meta");
  const isExcluded = (component2) => {
    return exclude.find((excludeRule) => {
      switch (typeof excludeRule) {
        case "string":
          return component2.filePath.includes(excludeRule);
        case "object":
          return excludeRule instanceof RegExp ? excludeRule.test(component2.filePath) : false;
        case "function":
          return excludeRule(component2);
        default:
          return false;
      }
    });
  };
  const getStringifiedComponents = () => {
    const _components2 = Object.keys(components).map((key) => [
      key,
      {
        ...components[key],
        fullPath: void 0,
        shortPath: void 0,
        export: void 0
      }
    ]);
    return JSON.stringify(Object.fromEntries(_components2), null, 2);
  };
  const getVirtualModuleContent = () => `export default ${getStringifiedComponents()}`;
  let checker;
  const refreshChecker = () => {
    checker = createMetaChecker({
      rootDir,
      checkerOptions,
      include: componentDirs.map((dir) => typeof dir === "string" ? dir : dir?.path || "")
    });
  };
  const init = async () => {
    const meta2 = await import(outputPath + ".mjs").then((m) => m.default || m).catch(() => null);
    for (const component2 of _components || []) {
      if (isExcluded(component2)) {
        continue;
      }
      if (!component2.filePath || !component2.pascalName) {
        continue;
      }
      const filePath = resolvePathSync(component2.filePath);
      components[component2.pascalName] = {
        ...component2,
        fullPath: filePath,
        filePath: relative(rootDir, filePath),
        meta: {
          type: 0,
          props: [],
          slots: [],
          events: [],
          exposed: []
        }
      };
    }
    if (meta2) {
      Object.keys(meta2).forEach((key) => {
        if (components[key]) {
          components[key].meta = meta2[key].meta;
        } else {
          components[key] = meta2[key];
        }
      });
    }
  };
  const updateOutput = async (content) => {
    const path = outputPath + ".mjs";
    if (beforeWrite && !content) {
      components = await beforeWrite(components);
    }
    if (!existsSync(dirname(path))) {
      fs.mkdirSync(dirname(path), { recursive: true });
    }
    if (existsSync(path)) {
      fs.unlinkSync(path);
    }
    content ||= getVirtualModuleContent();
    content = optimiseJSON(content);
    fs.writeFileSync(
      path,
      content,
      "utf-8"
    );
  };
  const stubOutput = () => {
    if (existsSync(outputPath + ".mjs")) {
      return;
    }
    updateOutput("export default {}");
  };
  const fetchComponent = (component) => {
    const startTime = performance.now();
    try {
      if (typeof component === "string") {
        if (components[component]) {
          component = components[component];
        } else {
          component = Object.entries(components).find(([, comp]) => comp.fullPath === component);
          if (!component) {
            return;
          }
          component = component[1];
        }
      }
      if (!component?.fullPath || !component?.pascalName) {
        return;
      }
      if (component.meta.hash && component.fullPath.includes("/node_modules/")) {
        return;
      }
      const resolvedPath = tryResolveTypesDeclaration(component.fullPath);
      let code = fs.readFileSync(resolvedPath, "utf-8");
      const codeHash = hash(code);
      if (codeHash === component.meta.hash) {
        return;
      }
      if (!checker) {
        try {
          refreshChecker();
        } catch {
          return;
        }
      }
      if (transformers && transformers.length > 0) {
        for (const transform of transformers) {
          const transformResult = transform(component, code);
          component = transformResult?.component || component;
          code = transformResult?.code || code;
        }
        checker.updateFile(resolvedPath, code);
      }
      const meta = checker.getComponentMeta(resolvedPath);
      Object.assign(
        component.meta,
        refineMeta(meta, metaFields, overrides[component.pascalName] || {}),
        {
          hash: codeHash
        }
      );
      const extendComponentMetaMatch = code.match(/extendComponentMeta\((\{[\s\S]*?\})\)/);
      const extendedComponentMeta = extendComponentMetaMatch?.length ? eval(`(${extendComponentMetaMatch[1]})`) : null;
      component.meta = defu(component.meta, extendedComponentMeta);
      components[component.pascalName] = component;
    } catch {
      if (debug) {
        logger.info(`Could not parse ${component?.pascalName || component?.filePath || "a component"}!`);
      }
    }
    const endTime = performance.now();
    if (debug === 2) {
      logger.success(`${component?.pascalName || component?.filePath || "a component"} metas parsed in ${(endTime - startTime).toFixed(2)}ms`);
    }
    return components[component.pascalName];
  };
  const fetchComponents = () => {
    const startTime2 = performance.now();
    for (const component2 of Object.values(components)) {
      fetchComponent(component2);
    }
    const endTime2 = performance.now();
    if (!debug || debug === 2) {
      logger.success(`Components metas parsed in ${(endTime2 - startTime2).toFixed(2)}ms`);
    }
  };
  return {
    get checker() {
      return checker;
    },
    get components() {
      return components;
    },
    dispose() {
      if (checker) {
        checker.clearCache();
      }
      checker = null;
      components = {};
    },
    init,
    refreshChecker,
    stubOutput,
    outputPath,
    updateOutput,
    fetchComponent,
    fetchComponents,
    getStringifiedComponents,
    getVirtualModuleContent
  };
}

const metaPlugin = createUnplugin(({ parser, parserOptions }) => {
  let instance = parser || useComponentMetaParser(parserOptions);
  let _configResolved;
  return {
    name: "vite-plugin-nuxt-component-meta",
    enforce: "post",
    async buildStart() {
      if (_configResolved?.build.ssr) {
        return;
      }
      instance?.fetchComponents();
      await instance?.updateOutput();
    },
    buildEnd() {
      if (!_configResolved?.env.DEV && _configResolved?.env.PROD) {
        instance?.dispose();
        instance = null;
      }
    },
    vite: {
      configResolved(config) {
        _configResolved = config;
      },
      async handleHotUpdate({ file }) {
        if (instance && Object.entries(instance.components).some(([, comp]) => comp.fullPath === file)) {
          instance.fetchComponent(file);
          await instance.updateOutput();
        }
      }
    }
  };
});

async function loadExternalSources(sources = []) {
  const resolver = createResolver(import.meta.url);
  const components = {};
  for (const src of sources) {
    if (typeof src === "string") {
      try {
        let modulePath = "";
        const alias = resolveAlias(src);
        if (alias !== src) {
          modulePath = alias;
        } else {
          modulePath = await resolver.resolvePath(src);
        }
        const definition = await import(modulePath).then((m) => m.default || m);
        for (const [name, meta] of Object.entries(definition)) {
          components[name] = meta;
        }
      } catch (error) {
        logger.error(`Unable to load static components definitions from "${src}"`, error);
      }
    } else {
      for (const [name, meta] of Object.entries(src)) {
        if (meta) {
          components[name] = meta;
        }
      }
    }
  }
  return components;
}

const module$1 = defineNuxtModule({
  meta: {
    name: "nuxt-component-meta",
    configKey: "componentMeta"
  },
  defaults: (nuxt) => ({
    outputDir: nuxt.options.buildDir,
    rootDir: nuxt.options.rootDir,
    componentDirs: [],
    components: [],
    metaSources: [],
    silent: true,
    exclude: [
      "nuxt/dist/app/components/welcome",
      "nuxt/dist/app/components/client-only",
      "nuxt/dist/app/components/dev-only",
      "@nuxtjs/mdc/dist/runtime/components/MDC",
      "nuxt/dist/app/components/nuxt-layout",
      "nuxt/dist/app/components/nuxt-error-boundary",
      "nuxt/dist/app/components/server-placeholder",
      "nuxt/dist/app/components/nuxt-loading-indicator",
      "nuxt/dist/app/components/nuxt-route-announcer",
      "nuxt/dist/app/components/nuxt-stubs",
      (component) => component.filePath.endsWith(".svg") || component.filePath.endsWith(".d.vue.ts")
    ],
    include: [],
    metaFields: {
      type: true,
      props: true,
      slots: true,
      events: true,
      exposed: true
    },
    transformers: defaultTransformers,
    checkerOptions: {
      forceUseTs: true,
      schema: {
        ignore: [
          "NuxtComponentMetaNames",
          // avoid loop
          "RouteLocationRaw",
          // vue router
          "RouteLocationPathRaw",
          // vue router
          "RouteLocationNamedRaw"
          // vue router
        ]
      }
    },
    globalsOnly: false
  }),
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const isComponentIncluded = (component) => {
      if (!options?.globalsOnly) {
        return true;
      }
      if (component.global) {
        return true;
      }
      return (options.include || []).find((excludeRule) => {
        switch (typeof excludeRule) {
          case "string":
            return component.pascalName === excludeRule || component.filePath.includes(excludeRule);
          case "object":
            return excludeRule instanceof RegExp ? excludeRule.test(component.filePath) : false;
          case "function":
            return excludeRule(component);
          default:
            return false;
        }
      });
    };
    let transformers = options?.transformers || [];
    transformers = await nuxt.callHook("component-meta:transformers", transformers) || transformers;
    let parser;
    const parserOptions = {
      ...options,
      components: [],
      metaSources: {},
      transformers,
      overrides: options.overrides || {},
      beforeWrite: async (schema) => {
        return await nuxt.callHook("component-meta:schema", schema) || schema;
      }
    };
    let componentDirs = [...options?.componentDirs || []];
    let components = [];
    let metaSources = {};
    const uiTemplatesPath = await tryResolveModule("@nuxt/ui-templates", import.meta.url);
    nuxt.hook("components:dirs", (dirs) => {
      componentDirs = [
        ...componentDirs,
        ...dirs,
        { path: nuxt.options.appDir }
      ];
      if (uiTemplatesPath) {
        componentDirs.push({ path: uiTemplatesPath.replace("/index.mjs", "/templates") });
      }
      parserOptions.componentDirs = componentDirs;
    });
    nuxt.hook("components:extend", (_components) => {
      _components.forEach((c) => {
        if (c.global) {
          parserOptions.componentDirs.push(c.filePath);
        }
      });
    });
    nuxt.hook("components:extend", async (_components) => {
      components = _components.filter(isComponentIncluded);
      metaSources = await loadExternalSources(options.metaSources);
      parserOptions.components = components;
      parserOptions.metaSources = metaSources;
      await nuxt.callHook("component-meta:extend", parserOptions);
      parser = useComponentMetaParser(parserOptions);
      await Promise.all([
        parser.init(),
        parser.stubOutput()
      ]);
    });
    addImportsDir(resolver.resolve("./runtime/composables"));
    addTemplate({
      filename: "component-meta.d.ts",
      getContents: () => [
        "import type { ComponentData } from 'nuxt-component-meta'",
        `export type NuxtComponentMetaNames = ${[...components, ...Object.values(metaSources)].map((c) => `'${c.pascalName}'`).join(" | ")}`,
        "export type NuxtComponentMeta = Record<NuxtComponentMetaNames, ComponentData>",
        "declare const components: NuxtComponentMeta",
        "export { components as default, components }"
      ].join("\n"),
      write: true
    });
    nuxt.hook("vite:extend", (vite) => {
      vite.config.plugins = vite.config.plugins || [];
      vite.config.plugins.push(metaPlugin.vite({ parser, parserOptions }));
    });
    nuxt.options.alias = nuxt.options.alias || {};
    nuxt.options.alias["#nuxt-component-meta"] = join(nuxt.options.buildDir, "component-meta.mjs");
    nuxt.options.alias["#nuxt-component-meta/types"] = join(nuxt.options.buildDir, "component-meta.d.ts");
    nuxt.hook("prepare:types", ({ references }) => {
      references.push({
        path: join(nuxt.options.buildDir, "component-meta.d.ts")
      });
    });
    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.handlers = nitroConfig.handlers || [];
      nitroConfig.virtual = nitroConfig.virtual || {};
      nitroConfig.virtual["#nuxt-component-meta/nitro"] = () => readFileSync(join(nuxt.options.buildDir, "/component-meta.mjs"), "utf-8");
    });
    addServerHandler({
      method: "get",
      route: "/api/component-meta",
      handler: resolver.resolve("./runtime/server/api/component-meta.get")
    });
    addServerHandler({
      method: "get",
      route: "/api/component-meta.json",
      handler: resolver.resolve("./runtime/server/api/component-meta.json.get")
    });
    addServerHandler({
      method: "get",
      route: "/api/component-meta/:component?",
      handler: resolver.resolve("./runtime/server/api/component-meta-component.get")
    });
  }
});

export { module$1 as default };
