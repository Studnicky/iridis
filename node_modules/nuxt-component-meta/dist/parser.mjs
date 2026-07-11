import { r as refineMeta } from './shared/nuxt-component-meta.jPHoGkDc.mjs';
import { d as defaultTransformers, t as tryResolveTypesDeclaration, c as createMetaChecker } from './shared/nuxt-component-meta.Bsvf5qii.mjs';
import { join, isAbsolute } from 'pathe';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { withBase } from 'ufo';
import { hash } from 'crypto';
import 'scule';
import 'vue-component-meta';

function getComponentMeta(component, options) {
  const rootDir = options?.rootDir ?? process.cwd();
  const opts = {
    cache: false,
    rootDir,
    cacheDir: join(rootDir, ".data/nuxt-component-meta"),
    ...options,
    transformers: [
      ...defaultTransformers,
      ...options?.transformers || []
    ]
  };
  const fullPath = isAbsolute(component) ? component : withBase(component, opts.rootDir);
  const resolvedPath = tryResolveTypesDeclaration(fullPath);
  const initialComponent = { fullPath, filePath: resolvedPath };
  let code;
  let transformedComponent = initialComponent;
  try {
    code = readFileSync(resolvedPath, { encoding: "utf8", flag: "r" });
  } catch (error) {
    throw new Error(`Error reading file ${resolvedPath}: ${error}`);
  }
  if (opts.transformers.length) {
    for (const transform of opts.transformers) {
      const res = transform(transformedComponent, code);
      transformedComponent = res?.component || transformedComponent;
      code = res?.code || code;
    }
  }
  let cachePath = void 0;
  if (opts.cache) {
    const cacheId = component.split("/").pop()?.replace(/\./g, "_") + "--" + hash("sha1", code).slice(0, 12);
    cachePath = join(opts.cacheDir, `${cacheId}.json`);
    if (existsSync(cachePath)) {
      return JSON.parse(readFileSync(cachePath, { encoding: "utf8", flag: "r" }));
    }
  }
  const componentMeta = _getComponentMeta(resolvedPath, code, opts);
  if (cachePath) {
    const cache = JSON.stringify({ cachedAt: Date.now(), ...componentMeta });
    if (!existsSync(opts.cacheDir)) {
      mkdirSync(opts.cacheDir, { recursive: true });
    }
    writeFileSync(cachePath, cache, { encoding: "utf8", flag: "w" });
  }
  return componentMeta;
}
function _getComponentMeta(resolvedPath, code, opts) {
  const checker = createMetaChecker(
    {
      rootDir: opts.rootDir,
      include: [resolvedPath]
    }
  );
  checker.updateFile(resolvedPath, code);
  return refineMeta(
    checker.getComponentMeta(resolvedPath)
  );
}

export { getComponentMeta };
