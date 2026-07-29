import type { JsonObjectType } from '@studnicky/types';

import { type Browser, chromium, type Page } from '@playwright/test';
import { JsonObject } from '@studnicky/types';
import { build, version } from 'esbuild';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

class SiteManifest {
  public readonly dependencies: Readonly<Record<string, string>>;
  public readonly devDependencies: Readonly<Record<string, string>>;
  public readonly optionalDependencies: Readonly<Record<string, string>>;
  public readonly peerDependencies: Readonly<Record<string, string>>;

  private constructor(manifest: JsonObjectType) {
    this.dependencies = SiteManifest.stringRecord(manifest.dependencies, 'dependencies');
    this.devDependencies = SiteManifest.stringRecord(manifest.devDependencies, 'devDependencies');
    this.optionalDependencies = SiteManifest.stringRecord(manifest.optionalDependencies, 'optionalDependencies');
    this.peerDependencies = SiteManifest.stringRecord(manifest.peerDependencies, 'peerDependencies');
  }

  private static stringRecord(value: unknown, fieldName: string): Readonly<Record<string, string>> {
    if (value === undefined) {
      return {};
    }
    if (!JsonObject.is(value)) {
      throw new TypeError(`site package ${fieldName} must be an object`);
    }
    const record: Record<string, string> = {};
    for (const [name, range] of Object.entries(value)) {
      if (typeof range !== 'string') {
        throw new TypeError(`site package ${fieldName}.${name} must be a string`);
      }
      record[name] = range;
    }
    return record;
  }

  public static parse(contents: string): SiteManifest {
    const parsed: unknown = JSON.parse(contents);
    if (!JsonObject.is(parsed)) {
      throw new TypeError('site package manifest must be an object');
    }
    return new SiteManifest(parsed);
  }
}

class SiteDependencyBoundaryFixture {
  private static readonly sourceExtensions = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx', '.vue']);
  private static readonly excludedDirectories = new Set(['.nuxt', '.output', 'coverage', 'dist', 'node_modules']);

  private static sourceFiles(directory: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(directory, { 'withFileTypes': true })) {
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
    return specifier.startsWith('@')
      ? segments.slice(0, 2).join('/')
      : segments[0];
  }

  public static undeclaredImports(siteDirectory: string, manifest: SiteManifest): string[] {
    const declared = new Set([
      ...Object.keys(manifest.dependencies),
      ...Object.keys(manifest.devDependencies),
      ...Object.keys(manifest.optionalDependencies),
      ...Object.keys(manifest.peerDependencies)
    ]);
    const violations = new Set<string>();
    for (const path of SiteDependencyBoundaryFixture.sourceFiles(siteDirectory)) {
      const imports = ts.preProcessFile(
        readFileSync(path, 'utf8'),
        true,
        true
      ).importedFiles;
      for (const imported of imports) {
        const packageName = SiteDependencyBoundaryFixture.packageName(imported.fileName);
        if (packageName !== undefined && !declared.has(packageName)) {
          violations.add(`${relative(siteDirectory, path)} imports ${imported.fileName}`);
        }
      }
    }
    return [...violations].sort();
  }
}

class RejectionResult {
  public declare readonly accepted: boolean;
  public declare readonly containsActiveContent: boolean;
  public declare readonly message: string | null;
}

class PreservationResult {
  public declare readonly codeText: string | null | undefined;
  public declare readonly htmlAccepted: boolean;
  public declare readonly htmlColor: string | null | undefined;
  public declare readonly svgAccepted: boolean;
  public declare readonly svgInventory: string;
  public declare readonly svgMessage: string | null;
  public declare readonly svgText: string | null | undefined;
  public declare readonly viewBox: string | null | undefined;
}

class IdentityResult {
  public declare readonly accepted: boolean;
  public declare readonly firstChanged: boolean;
  public declare readonly identityPreserved: boolean;
  public declare readonly secondChanged: boolean;
}

class UpdateResult {
  public declare readonly accepted: boolean;
  public declare readonly changed: boolean;
  public declare readonly identityChanged: boolean;
  public declare readonly text: string | null;
}

class CssContainmentResult {
  public declare readonly accepted: boolean;
  public declare readonly bodyDisplayPreserved: boolean;
  public declare readonly inlineFill: string;
  public declare readonly styleElementCount: number;
}

class SvgResourceResult {
  public declare readonly externalAccepted: readonly boolean[];
  public declare readonly externalResourcesPresent: boolean;
  public declare readonly localAccepted: boolean;
  public declare readonly localReference: string | null;
}

class ModalBoundaryResult {
  public declare readonly cloneBoundaryAccepted: boolean;
  public declare readonly cloneBoundaryMessage: string | null;
  public declare readonly expandControlPresent: boolean;
  public declare readonly safeCloneDistinct: boolean;
  public declare readonly safeClonePresent: boolean;
  public declare readonly unsafeMarkupPresent: boolean;
  public declare readonly unsafeModalPresent: boolean;
}

class MermaidThemeResult {
  public declare readonly accentColor: string;
  public declare readonly customProperties: readonly string[];
  public declare readonly legacyProperties: readonly string[];
  public declare readonly strokeColor: string;
  public declare readonly surfaceColor: string;
}

class TrustedMarkupRendererBrowserHarness {
  static #browser: Browser | undefined;
  static #page: Page | undefined;

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

    TrustedMarkupRendererBrowserHarness.#browser = await chromium.launch({ 'headless': true });
    TrustedMarkupRendererBrowserHarness.#page = await TrustedMarkupRendererBrowserHarness.#browser.newPage();
    await TrustedMarkupRendererBrowserHarness.#page.addScriptTag({ 'content': bundledSource });
    await TrustedMarkupRendererBrowserHarness.#page.addStyleTag({ 'content': dpadStylesheet });
  }

  public static async stop(): Promise<void> {
    await TrustedMarkupRendererBrowserHarness.#browser?.close();
    TrustedMarkupRendererBrowserHarness.#browser = undefined;
    TrustedMarkupRendererBrowserHarness.#page = undefined;
  }

  public static async evaluate<Result>(script: string): Promise<Result> {
    if (TrustedMarkupRendererBrowserHarness.#page === undefined) {
      throw new Error('Browser page is unavailable');
    }
    return await TrustedMarkupRendererBrowserHarness.#page.evaluate<Result>(script);
  }
}

await test('declares every direct site package import', () => {
  const siteDirectory = fileURLToPath(new URL('..', import.meta.url));
  const manifest = SiteManifest.parse(readFileSync(join(siteDirectory, 'package.json'), 'utf8'));
  assert.equal(manifest.dependencies['reka-ui'], '2.9.10');
  assert.equal(manifest.devDependencies.esbuild, '0.28.1');
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
        return {
          accepted: result.accepted,
          containsActiveContent: host.querySelector('script, [onload], [href^="javascript:"]') !== null,
          message: host.textContent
        };
      });
    })()
  `);

  assert.equal(results.length, 3);
  for (const result of results) {
    assert.equal(result.accepted, false);
    assert.equal(result.containsActiveContent, false);
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
      return {
        codeText: htmlHost.querySelector('pre.shiki code span')?.textContent,
        htmlAccepted: htmlResult.accepted,
        htmlColor: htmlHost.querySelector('span')?.getAttribute('style'),
        svgAccepted: svgResult.accepted,
        svgInventory,
        svgMessage: svgResult.accepted ? null : svgHost.textContent,
        svgText: svgHost.querySelector('svg')?.textContent,
        viewBox: svgHost.querySelector('svg')?.getAttribute('viewBox')
      };
    })()
  `);

  assert.equal(result.htmlAccepted, true);
  assert.equal(result.codeText, 'safe code');
  assert.equal(result.htmlColor, 'color: #fff');
  assert.equal(
    result.svgAccepted,
    true,
    `${result.svgMessage ?? 'SVG rejected'}; ${result.svgInventory}`
  );
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
        accepted: renderResult.accepted,
        bodyDisplayPreserved: getComputedStyle(document.body).display === beforeDisplay,
        inlineFill: rect?.style.getPropertyValue('fill') ?? '',
        styleElementCount: host.querySelectorAll('style').length
      };
      host.remove();
      return result;
    })()
  `);

  assert.equal(result.accepted, true);
  assert.equal(result.bodyDisplayPreserved, true);
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
      return {
        externalAccepted: externalHosts.map((entry) => entry.result.accepted),
        externalResourcesPresent: externalHosts.some((entry) => entry.host.querySelector('[href], [xlink\\:href]') !== null),
        localAccepted: localResult.accepted,
        localReference: localHost.querySelector('use')?.getAttribute('href') ?? null
      };
    })()
  `);

  assert.deepEqual(result.externalAccepted, [false, false, false]);
  assert.equal(result.externalResourcesPresent, false);
  assert.equal(result.localAccepted, true);
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
      explorer.enhance(safeHost, { fit: 'none' });
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
      explorer.enhance(unsafeHost, { fit: 'none' });
      unsafeHost.querySelector('[aria-label="Expand fullscreen"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const unsafeModal = document.querySelector('.dag-mermaid-modal');
      const unsafeMarkupPresent = unsafeModal?.querySelector('[onload], script') !== null
        && unsafeModal?.querySelector('[onload], script') !== undefined;
      const result = {
        cloneBoundaryAccepted: cloneBoundaryResult.accepted,
        cloneBoundaryMessage: cloneBoundaryResult.message,
        expandControlPresent: expandControl !== null,
        safeCloneDistinct,
        safeClonePresent,
        unsafeMarkupPresent,
        unsafeModalPresent: unsafeModal !== null
      };
      unsafeModal?.remove();
      unsafeHost.remove();
      return result;
    })()
  `);

  assert.equal(result.expandControlPresent, true);
  assert.equal(result.cloneBoundaryAccepted, true, result.cloneBoundaryMessage ?? undefined);
  assert.equal(result.safeClonePresent, true, result.cloneBoundaryMessage ?? undefined);
  assert.equal(result.safeCloneDistinct, true);
  assert.equal(result.unsafeModalPresent, false);
  assert.equal(result.unsafeMarkupPresent, false);
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
      explorer.enhance(host, {
        fit: 'none',
        theme: {
          accent: '#112233',
          stroke: '#445566',
          surface: '#778899'
        }
      });
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
  const result = await TrustedMarkupRendererBrowserHarness.evaluate<IdentityResult>(String.raw`
    (() => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const host = document.createElement('div');
      const markup = '<pre><code><span>stable</span></code></pre>';
      const firstRender = renderer.render(host, markup, 'html');
      const originalRoot = host.firstElementChild;
      const secondRender = renderer.render(host, markup, 'html');
      return {
        accepted: secondRender.accepted,
        firstChanged: firstRender.changed,
        identityPreserved: originalRoot === host.firstElementChild,
        secondChanged: secondRender.changed
      };
    })()
  `);

  assert.equal(result.accepted, true);
  assert.equal(result.firstChanged, true);
  assert.equal(result.identityPreserved, true);
  assert.equal(result.secondChanged, false);
});

await test('replaces validated DOM nodes when markup changes', async () => {
  const result = await TrustedMarkupRendererBrowserHarness.evaluate<UpdateResult>(String.raw`
    (() => {
      const renderer = TrustedMarkupModule.trustedMarkupRenderer;
      const host = document.createElement('div');
      renderer.render(host, '<pre><code>before</code></pre>', 'html');
      const originalRoot = host.firstElementChild;
      const update = renderer.render(host, '<pre><code>after</code></pre>', 'html');
      return {
        accepted: update.accepted,
        changed: update.changed,
        identityChanged: originalRoot !== host.firstElementChild,
        text: host.textContent
      };
    })()
  `);

  assert.equal(result.accepted, true);
  assert.equal(result.changed, true);
  assert.equal(result.identityChanged, true);
  assert.equal(result.text, 'after');
});

await TrustedMarkupRendererBrowserHarness.stop();
