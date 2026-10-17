
import { type Browser, chromium, type Page } from '@playwright/test';
import { JsonObject } from '@studnicky/types/browser';
import { build, version } from 'esbuild';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

class SiteManifest {
  public readonly dependencies: ReadonlyMap<string, string>;
  public readonly devDependencies: ReadonlyMap<string, string>;
  public readonly optionalDependencies: ReadonlyMap<string, string>;
  public readonly peerDependencies: ReadonlyMap<string, string>;

  private constructor(manifest: Record<string, unknown>) {
    this.dependencies = SiteManifest.stringMap(manifest.dependencies, 'dependencies');
    this.devDependencies = SiteManifest.stringMap(manifest.devDependencies, 'devDependencies');
    this.optionalDependencies = SiteManifest.stringMap(manifest.optionalDependencies, 'optionalDependencies');
    this.peerDependencies = SiteManifest.stringMap(manifest.peerDependencies, 'peerDependencies');
  }

  private static stringMap(value: unknown, fieldName: string): ReadonlyMap<string, string> {
    if (value === undefined) {
      return new Map();
    }
    if (!JsonObject.is(value)) {
      throw new TypeError(`site package ${fieldName} must be an object`);
    }
    const entries = Object.entries(value);
    const record = new Map<string, string>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [name, range] = entry;
      if (typeof range !== 'string') {
        throw new TypeError(`site package ${fieldName}.${name} must be a string`);
      }
      record.set(name, range);
    }
    return record;
  }

  public static parse(contents: string): SiteManifest {
    const parsed: unknown = JSON.parse(contents);
    if (!JsonObject.is(parsed)) {
      throw new TypeError('site package manifest must be an object');
    }
    const manifest = new SiteManifest(parsed);
    return manifest;
  }
}

class SiteDependencyBoundaryFixture {
  private static readonly sourceExtensions = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx', '.vue']);
  private static readonly excludedDirectories = new Set(['.nuxt', '.output', 'coverage', 'dist', 'node_modules']);

  private static sourceFiles(directory: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(directory, { 'withFileTypes': true });
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SiteDependencyBoundaryFixture.excludedDirectories.has(entry.name)) {
          files.push(...SiteDependencyBoundaryFixture.sourceFiles(path));
        }
      } else if (entry.isFile() && SiteDependencyBoundaryFixture.sourceExtensions.has(extname(entry.name))) {
        files.push(path);
      }
    }
    return files;
  }

  private static packageName(specifier: string): string | undefined {
    if (
      specifier.startsWith('.')
      || specifier.startsWith('#')
      || specifier.startsWith('~')
      || specifier.startsWith('@/')
      || isBuiltin(specifier)
    ) {
      return undefined;
    }
    const segments = specifier.split('/');
    const packageName = specifier.startsWith('@')
      ? segments.slice(0, 2).join('/')
      : segments[0];
    return packageName;
  }

  public static undeclaredImports(siteDirectory: string, manifest: SiteManifest): string[] {
    const declared = new Set([
      ...manifest.dependencies.keys(),
      ...manifest.devDependencies.keys(),
      ...manifest.optionalDependencies.keys(),
      ...manifest.peerDependencies.keys()
    ]);
    const violations = new Set<string>();
    const sourceFiles = SiteDependencyBoundaryFixture.sourceFiles(siteDirectory);
    for (let sourceIndex = 0; sourceIndex < sourceFiles.length; sourceIndex += 1) {
      const path = sourceFiles[sourceIndex];
      if (path === undefined) {
        continue;
      }
      const imports = ts.preProcessFile(
        readFileSync(path, 'utf8'),
        true,
        true
      ).importedFiles;
      for (let importIndex = 0; importIndex < imports.length; importIndex += 1) {
        const imported = imports[importIndex];
        if (imported === undefined) {
          continue;
        }
        const packageName = SiteDependencyBoundaryFixture.packageName(imported.fileName);
        if (packageName !== undefined && !declared.has(packageName)) {
          violations.add(`${relative(siteDirectory, path)} imports ${imported.fileName}`);
        }
      }
    }
    const result = [...violations].sort((left, right) => {
      const comparison = left.localeCompare(right);
      return comparison;
    });
    return result;
  }
}

class RejectionResult {
  public declare readonly conditionCount: number;
  public declare readonly message: string | null;
}

class PreservationResult {
  public declare readonly conditionCount: number;
  public declare readonly codeText: string | null | undefined;
  public declare readonly htmlColor: string | null | undefined;
  public declare readonly svgInventory: string;
  public declare readonly svgMessage: string | null;
  public declare readonly svgText: string | null | undefined;
  public declare readonly viewBox: string | null | undefined;
}

class CssContainmentResult {
  public declare readonly conditionCount: number;
  public declare readonly inlineFill: string;
  public declare readonly styleElementCount: number;
}

class SvgResourceResult {
  public declare readonly conditionCount: number;
  public declare readonly localReference: string | null;
}

class ModalBoundaryResult {
  public declare readonly cloneBoundaryMessage: string | null;
  public declare readonly conditionCount: number;
}

class MermaidThemeResult {
  public declare readonly accentColor: string;
  public declare readonly customProperties: readonly string[];
  public declare readonly legacyProperties: readonly string[];
  public declare readonly strokeColor: string;
  public declare readonly surfaceColor: string;
}

class BrowserSession {
  public browser: Browser | undefined;
  public page: Page | undefined;
}

class TrustedMarkupRendererBrowserHarness {
  static readonly #session = new BrowserSession();

  public static async start(): Promise<void> {
    const testDirectory = dirname(fileURLToPath(import.meta.url));
    const rendererPath = resolve(
      testDirectory,
      '../app/components/content/trustedMarkupRenderer.ts'
    );
    const explorerPath = resolve(
      testDirectory,
      '../app/components/content/mermaid/MermaidExplorer.ts'
    );
    const dpadStylesheet = readFileSync(resolve(
      testDirectory,
      '../app/components/content/viz/Dpad.css'
    ), 'utf8');
    const buildResult = await build({
      'bundle': true,
      'format': 'iife',
      'globalName': 'TrustedMarkupModule',
      'platform': 'browser',
      'stdin': {
        'contents': `export { trustedMarkupRenderer } from ${JSON.stringify(rendererPath)};\nexport { MermaidExplorer } from ${JSON.stringify(explorerPath)};\nexport { default as mermaid } from 'mermaid';`,
        'resolveDir': dirname(rendererPath),
        'sourcefile': 'trusted-markup-renderer-browser-entry.ts'
      },
      'target': 'es2022',
      'write': false
    });
    const bundledSource = buildResult.outputFiles[0]?.text;
    if (bundledSource === undefined) {
      throw new Error('Trusted markup renderer browser bundle was not produced');
    }

    TrustedMarkupRendererBrowserHarness.#session.browser = await chromium.launch({ 'headless': true });
    TrustedMarkupRendererBrowserHarness.#session.page = await TrustedMarkupRendererBrowserHarness.#session.browser.newPage();
    await TrustedMarkupRendererBrowserHarness.#session.page.addScriptTag({ 'content': bundledSource });
    await TrustedMarkupRendererBrowserHarness.#session.page.addStyleTag({ 'content': dpadStylesheet });
  }

  public static async stop(): Promise<void> {
    await TrustedMarkupRendererBrowserHarness.#session.browser?.close();
    TrustedMarkupRendererBrowserHarness.#session.browser = undefined;
    TrustedMarkupRendererBrowserHarness.#session.page = undefined;
  }

  public static async evaluate<Result>(script: string): Promise<Result> {
    const page = TrustedMarkupRendererBrowserHarness.#session.page;
    if (page === undefined) {
      throw new Error('Browser page is unavailable');
    }
    const result = await page.evaluate<Result>(script);
    return result;
  }
}

await test('declares every direct site package import', () => {
  const siteDirectory = fileURLToPath(new URL('..', import.meta.url));
  const manifest = SiteManifest.parse(readFileSync(join(siteDirectory, 'package.json'), 'utf8'));
  assert.equal(manifest.dependencies.get('reka-ui'), '2.9.10');
  assert.equal(manifest.devDependencies.get('esbuild'), '0.28.1');
  assert.equal(version, '0.28.1');
  assert.deepEqual(SiteDependencyBoundaryFixture.undeclaredImports(siteDirectory, manifest), []);
});

await TrustedMarkupRendererBrowserHarness.start();

await test('rejects unsafe elements, event attributes, and URL schemes as text', async () => {
  const results = await TrustedMarkupRendererBrowserHarness.evaluate<readonly RejectionResult[]>(String.raw`
    (() => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const attacks = [
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><text>x</text></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>x</text></a></svg>'
      ];
      return attacks.map((markup) => {
        const host = document.createElement('div');
        const result = renderer.render(host, markup, 'svg');
        const activeContent = host.querySelector('script, [onload], [href^="javascript:"]') !== null;
        return {
          conditionCount: Number(!result.accepted) + Number(!activeContent) + Number(host.textContent?.startsWith('Unable to render markup:')),
          message: host.textContent
        };
      });
    })()
  `);

  assert.equal(results.length, 3);
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    if (result === undefined) {
      throw new Error('Missing rejected-markup result');
    }
    assert.equal(result.conditionCount, 3);
    assert.equal(result.message?.startsWith('Unable to render markup:'), true);
  }
});

await test('preserves allowlisted highlighted HTML and Mermaid SVG structure', async () => {
  const result = await TrustedMarkupRendererBrowserHarness.evaluate<PreservationResult>(String.raw`
    (async () => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const mermaid = TrustedMarkupModule.mermaid;
      const htmlHost = document.createElement('div');
      const svgHost = document.createElement('div');
      const htmlResult = renderer.render(
        htmlHost,
        '<pre class="shiki" style="background-color: #111; color: #eee"><code><span style="color: #fff">safe code</span></code></pre>',
        'html'
      );
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
      const generated = await mermaid.render(
        'trusted-markup-test-diagram',
        'flowchart TD\n  A[safe diagram] --> B[preserved node]'
      );
      const parsedSvg = new DOMParser().parseFromString(generated.svg, 'image/svg+xml');
      const svgInventory = [...parsedSvg.querySelectorAll('*')]
        .map((element) => [
          element.localName,
          ...[...element.attributes].map((attribute) => '@' + attribute.name)
        ].join(','))
        .join(';');
      const svgResult = renderer.render(
        svgHost,
        generated.svg,
        'svg'
      );
      const svgText = svgHost.querySelector('svg')?.textContent;
      const viewBox = svgHost.querySelector('svg')?.getAttribute('viewBox');
      return {
        codeText: htmlHost.querySelector('pre.shiki code span')?.textContent,
        conditionCount: Number(htmlResult.accepted) + Number(svgResult.accepted) + Number(svgText?.includes('safe diagram')) + Number(viewBox !== null && viewBox !== undefined),
        htmlColor: htmlHost.querySelector('span')?.getAttribute('style'),
        svgInventory,
        svgMessage: svgResult.accepted ? null : svgHost.textContent,
        svgText,
        viewBox
      };
    })()
  `);

  assert.equal(result.conditionCount, 4);
  assert.equal(result.codeText, 'safe code');
  assert.equal(result.htmlColor, 'color: #fff');
  assert.equal(result.svgMessage, null, result.svgInventory);
  assert.equal(result.svgText?.includes('safe diagram'), true);
  assert.notEqual(result.viewBox, null);
});

await test('contains parsed SVG styles within the validated SVG tree', async () => {
  const result = await TrustedMarkupRendererBrowserHarness.evaluate<CssContainmentResult>(String.raw`
    (() => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const host = document.createElement('div');
      document.body.appendChild(host);
      const beforeDisplay = getComputedStyle(document.body).display;
      const renderResult = renderer.render(
        host,
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>body { display: none } .inside { fill: #123 }</style><rect class="inside" width="10" height="10"/></svg>',
        'svg'
      );
      const rect = host.querySelector('rect');
      const result = {
        conditionCount: Number(renderResult.accepted) + Number(getComputedStyle(document.body).display === beforeDisplay),
        inlineFill: rect?.style.getPropertyValue('fill') ?? '',
        styleElementCount: host.querySelectorAll('style').length
      };
      host.remove();
      return result;
    })()
  `);

  assert.equal(result.conditionCount, 2);
  assert.equal(result.inlineFill, 'rgb(17, 34, 51)');
  assert.equal(result.styleElementCount, 0);
});

await test('rejects external SVG resources and preserves local fragment use', async () => {
  const result = await TrustedMarkupRendererBrowserHarness.evaluate<SvgResourceResult>(String.raw`
    (() => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const externalMarkup = [
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/image.svg"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.com/sprite.svg#shape"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="https://example.com/sprite.svg#shape"/></svg>'
      ];
      const externalHosts = externalMarkup.map((markup) => {
        const host = document.createElement('div');
        return { host, result: renderer.render(host, markup, 'svg') };
      });
      const localHost = document.createElement('div');
      const localResult = renderer.render(
        localHost,
        '<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="shape" d="M0 0 L10 10"/></defs><use href="#shape"/></svg>',
        'svg'
      );
      const externalRejected = externalHosts.every((entry) => !entry.result.accepted);
      const externalResourcesAbsent = !externalHosts.some((entry) => entry.host.querySelector('[href], [xlink\\:href]') !== null);
      return {
        conditionCount: Number(externalRejected) + Number(externalResourcesAbsent) + Number(localResult.accepted),
        localReference: localHost.querySelector('use')?.getAttribute('href') ?? null
      };
    })()
  `);

  assert.equal(result.conditionCount, 3);
  assert.equal(result.localReference, '#shape');
});

await test('revalidates Mermaid modal clones without a secondary markup sink', async () => {
  const result = await TrustedMarkupRendererBrowserHarness.evaluate<ModalBoundaryResult>(String.raw`
    (async () => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const explorer = TrustedMarkupModule.MermaidExplorer;
      const markup = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><g class="node"><rect width="20" height="20"/><text x="2" y="12">modal clone</text></g></svg>';

      const safeHost = document.createElement('div');
      document.body.appendChild(safeHost);
      renderer.render(safeHost, markup, 'svg');
      const safeSource = safeHost.querySelector('svg');
      explorer.enhance(safeHost, explorer.naturalFitOptions());
      const clonePreview = safeSource?.cloneNode(true);
      const previewStage = document.createElement('div');
      const cloneBoundaryResult = clonePreview instanceof SVGSVGElement
        ? renderer.render(
            previewStage,
            new XMLSerializer().serializeToString(clonePreview),
            'svg'
          )
        : { accepted: false, message: 'Clone is not an SVG element' };
      const expandControl = safeHost.querySelector('[aria-label="Expand fullscreen"]');
      expandControl?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const safeModal = document.querySelector('.dag-mermaid-modal');
      const safeClone = safeModal?.querySelector('svg') ?? null;
      const safeClonePresent = safeClone !== null;
      const safeCloneDistinct = safeClonePresent && safeClone !== safeSource;
      safeModal?.querySelector('[aria-label="Close (Esc)"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      safeHost.remove();

      const unsafeHost = document.createElement('div');
      document.body.appendChild(unsafeHost);
      renderer.render(unsafeHost, markup, 'svg');
      const unsafeSource = unsafeHost.querySelector('svg');
      unsafeSource?.setAttribute('onload', 'alert(1)');
      explorer.enhance(unsafeHost, explorer.naturalFitOptions());
      unsafeHost.querySelector('[aria-label="Expand fullscreen"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const unsafeModal = document.querySelector('.dag-mermaid-modal');
      const unsafeMarkupPresent = unsafeModal?.querySelector('[onload], script') !== null
        && unsafeModal?.querySelector('[onload], script') !== undefined;
      const result = {
        cloneBoundaryMessage: cloneBoundaryResult.message,
        conditionCount: Number(expandControl !== null) + Number(cloneBoundaryResult.accepted) + Number(safeClonePresent) + Number(safeCloneDistinct) + Number(unsafeModal === null) + Number(!unsafeMarkupPresent)
      };
      unsafeModal?.remove();
      unsafeHost.remove();
      return result;
    })()
  `);

  assert.equal(result.conditionCount, 6, result.cloneBoundaryMessage ?? undefined);
});

await test('MermaidExplorer theme overrides drive the shared D-pad UI variables', async () => {
  const result = await TrustedMarkupRendererBrowserHarness.evaluate<MermaidThemeResult>(String.raw`
    (() => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const explorer = TrustedMarkupModule.MermaidExplorer;
      document.documentElement.style.setProperty('--iridis-border-style', 'solid');
      const host = document.createElement('div');
      document.body.appendChild(host);
      renderer.render(
        host,
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20"/></svg>',
        'svg'
      );
      explorer.enhance(host, explorer.naturalFitTheme({
        accent: '#112233',
        stroke: '#445566',
        surface: '#778899'
      }));
      const wrap = host.querySelector('.dagonizer-dpad-wrap');
      const button = wrap?.querySelector('.dagonizer-dpad-btn');
      if (!(wrap instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
        host.remove();
        throw new Error('Mermaid D-pad was not rendered');
      }
      const accentProbe = document.createElement('span');
      accentProbe.className = 'dagonizer-dpad-hud-level';
      wrap.appendChild(accentProbe);
      const customProperties = Array.from(wrap.style)
        .filter((property) => property.startsWith('--'))
        .sort();
      const result = {
        accentColor: getComputedStyle(accentProbe).color,
        customProperties,
        legacyProperties: customProperties.filter((property) => (
          property.startsWith('--dag-') || property.startsWith('--vp-')
        )),
        strokeColor: getComputedStyle(button).borderTopColor,
        surfaceColor: getComputedStyle(button).backgroundColor
      };
      host.remove();
      document.documentElement.style.removeProperty('--iridis-border-style');
      return result;
    })()
  `);

  assert.deepEqual(result.customProperties, ['--ui-bg-elevated', '--ui-border', '--ui-primary']);
  assert.deepEqual(result.legacyProperties, []);
  assert.equal(result.accentColor, 'rgb(17, 34, 51)');
  assert.equal(result.strokeColor, 'rgb(68, 85, 102)');
  assert.equal(result.surfaceColor, 'rgb(119, 136, 153)');
});

await test('does not replace DOM nodes when validated markup is unchanged', async () => {
  const preservedConditionCount = await TrustedMarkupRendererBrowserHarness.evaluate<number>(String.raw`
    (() => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const host = document.createElement('div');
      const markup = '<pre><code><span>stable</span></code></pre>';
      const firstRender = renderer.render(host, markup, 'html');
      const originalRoot = host.firstElementChild;
      const secondRender = renderer.render(host, markup, 'html');
      return Number(secondRender.accepted) + Number(firstRender.changed) + Number(originalRoot === host.firstElementChild) + Number(!secondRender.changed);
    })()
  `);

  assert.equal(preservedConditionCount, 4);
});

await test('replaces validated DOM nodes when markup changes', async () => {
  const replacementConditionCount = await TrustedMarkupRendererBrowserHarness.evaluate<number>(String.raw`
    (() => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const host = document.createElement('div');
      renderer.render(host, '<pre><code>before</code></pre>', 'html');
      const originalRoot = host.firstElementChild;
      const update = renderer.render(host, '<pre><code>after</code></pre>', 'html');
      return Number(update.accepted) + Number(update.changed) + Number(originalRoot !== host.firstElementChild) + Number(host.textContent === 'after');
    })()
  `);

  assert.equal(replacementConditionCount, 4);
});

await TrustedMarkupRendererBrowserHarness.stop();
