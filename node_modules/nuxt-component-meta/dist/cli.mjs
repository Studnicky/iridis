import { defineCommand, runMain } from 'citty';
import { copyFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve, relative } from 'pathe';
import { pathToFileURL } from 'node:url';
import { resolvePath, interopDefault } from 'mlly';
import { promises, existsSync } from 'node:fs';
import '@nuxt/kit';

const name = "nuxt-component-meta";
const version = "0.17.2";
const pkg = {
	name: name,
	version: version};

async function tryResolveModule(id, url = import.meta.url) {
  try {
    return await resolvePath(id, { url });
  } catch {
  }
}
async function importModule(id, url = import.meta.url) {
  const resolvedPath = await resolvePath(id, { url });
  return import(pathToFileURL(resolvedPath).href).then(interopDefault);
}

const loadKit = async (rootDir) => {
  try {
    const localKit = await tryResolveModule("@nuxt/kit", rootDir);
    const rootURL = localKit ? rootDir : await tryResolveNuxt() || rootDir;
    const kit = await importModule(
      "@nuxt/kit",
      rootURL
    );
    return kit;
  } catch (e) {
    if (e.toString().includes("Cannot find module '@nuxt/kit'")) {
      throw new Error(
        "nuxi requires `@nuxt/kit` to be installed in your project. Try installing `nuxt` v3 or `@nuxt/bridge` first."
      );
    }
    throw e;
  }
};
async function tryResolveNuxt() {
  for (const pkg of ["nuxt-nightly", "nuxt3", "nuxt", "nuxt-edge"]) {
    const path = await tryResolveModule(pkg);
    if (path) {
      return path;
    }
  }
  return null;
}

async function clearDir(path, exclude) {
  if (!exclude) {
    await promises.rm(path, { recursive: true, force: true });
  } else if (existsSync(path)) {
    const files = await promises.readdir(path);
    await Promise.all(
      files.map(async (name) => {
        if (!exclude.includes(name)) {
          await promises.rm(join(path, name), { recursive: true, force: true });
        }
      })
    );
  }
  await promises.mkdir(path, { recursive: true });
}
function clearBuildDir(path) {
  return clearDir(path, ["cache", "analyze"]);
}

const privateKeys = /* @__PURE__ */ new Set([
  "fullPath",
  "shortPath",
  "filePath",
  "declarations"
]);
function filterKeys(key, value) {
  if (privateKeys.has(key)) {
    return void 0;
  }
  return value;
}
const generate = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: "Extract component meta from layers"
  },
  args: {
    rootDir: {
      type: "positional",
      description: "Root Directory"
    },
    outputDir: {
      type: "string",
      description: "Output Directory",
      default: ".component-meta"
    },
    schema: {
      type: "boolean",
      description: "Remove schema from output",
      default: true
    }
  },
  async setup({ args }) {
    const cwd = resolve(args.rootDir || ".");
    const outputDir = join(cwd, args.outputDir || ".component-meta");
    const buildDir = join(outputDir, ".nuxt");
    const nitroDir = join(outputDir, ".output");
    const inputSource = join(buildDir, "./component-meta.mjs");
    const inputTypes = join(buildDir, "./component-meta.d.ts");
    const outputEsm = join(outputDir, "./component-meta.mjs");
    const outputCjs = join(outputDir, "./component-meta.cjs");
    const outputTypes = join(outputDir, "./component-meta.d.ts");
    if (!args.schema) {
      privateKeys.add("schema");
    }
    const { loadNuxt, buildNuxt, installModule, logger } = await loadKit(
      cwd
    );
    const nuxt = await loadNuxt({
      rootDir: cwd,
      defaultConfig: {
        modules: [
          async (options, nuxt2) => {
            const moduleInstalled = nuxt2.options?._installedModules?.some((m) => m.meta?.name === pkg.name);
            if (moduleInstalled) {
              logger.info(`Module "${pkg.name}" already installed`);
              return;
            }
            const module = await import('./module.mjs').then((m) => m.default);
            installModule(module, {
              debug: 2,
              exclude: ["node_modules"]
            });
          }
        ]
      },
      overrides: {
        logLevel: "silent",
        buildDir,
        nitro: {
          output: {
            dir: nitroDir
          }
        }
      }
    });
    await clearBuildDir(outputDir);
    await buildNuxt(nuxt);
    const components = await importModule(inputSource).then((m) => m.default || m);
    await Promise.all([
      copyFile(inputTypes, outputTypes),
      writeFile(
        outputEsm,
        `export default ${JSON.stringify(components, filterKeys, 2)}`
      ),
      writeFile(
        outputCjs,
        `module.exports = ${JSON.stringify(components, filterKeys, 2)}`
      )
    ]);
    await Promise.all([
      rm(buildDir, { recursive: true, force: true }),
      rm(nitroDir, { recursive: true, force: true })
    ]);
    logger.success(
      "Types generated in",
      relative(process.cwd(), outputDir)
    );
  }
});

const runGenerate = () => runMain(generate);

export { runGenerate };
