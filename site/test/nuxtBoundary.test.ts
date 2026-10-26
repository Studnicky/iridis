import { chromium, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { THEMES } from '../app/theme/presets/index.ts';
import { ProductionNitroServer } from './fixtures/ProductionNitroServer.ts';
import { TestPatterns } from './fixtures/TestPatterns.ts';

class NuxtBoundaryHarness {
  static documentTitle(slug: string): string {
    const source = readFileSync(join(import.meta.dirname, '../content', `${slug}.md`), 'utf8');
    const prefix = 'title:';
    const line = source.split('\n').find((candidate) => {
      const matches = candidate.startsWith(prefix);
      return matches;
    });
    if (line === undefined) {
      throw new Error(`Document ${slug} declares no title`);
    }
    const result = line.slice(prefix.length).trim()
      .replaceAll('"', '');
    return result;
  }

  static async requestSsr(url: string): Promise<{ 'error': Error | undefined; 'html': string | undefined }> {
    try {
      const response = await fetch(url);
      if (response.ok) {return { 'error': undefined, 'html': await response.text() };}
      return { 'error': new Error(`SSR returned HTTP ${response.status}`), 'html': undefined };
    } catch (error) {
      const requestError = error instanceof Error ? error : new Error('SSR request failed', { 'cause': error });
      return { 'error': requestError, 'html': undefined };
    }
  }

  static async waitForSsr(url: string): Promise<string> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const result = await NuxtBoundaryHarness.requestSsr(url);
      if (result.html !== undefined) {return result.html;}
      lastError = result.error;
      await setTimeout(100);
    }
    throw new Error('Built Nuxt server did not become ready', { 'cause': lastError });
  }

  static async waitForTargetNearTop(page: Page, identifier: string): Promise<void> {
    try {
      // The page runs with reducedMotion 'reduce', so scrolling resolves in
      // one frame rather than animating. The explicit budget matches every
      // other wait in this file and covers a heavily loaded machine, where
      // Playwright's 30s default expires before the first frame lands.
      await page.waitForFunction((targetIdentifier) => {
        const target = document.getElementById(targetIdentifier);
        if (target === null) {return false;}
        const bounds = target.getBoundingClientRect();
        const result = bounds.bottom > 0 && bounds.top < window.innerHeight * 0.4;
        return result;
      }, identifier, { 'timeout': 60_000 });
      const settledGeometry = await page.evaluate(async (targetIdentifier) => {
        const target = document.getElementById(targetIdentifier);
        if (target === null) {
          return {
            'bottom': 0, 'exists': false, 'settled': false,
            'top': Number.POSITIVE_INFINITY, 'viewportHeight': window.innerHeight
          };
        }
        let previousScrollY = window.scrollY;
        let previousTop = target.getBoundingClientRect().top;
        let stableFrameCount = 0;
        // The page keeps decorative ambient motion running, so settling is
        // measured as three consecutive frames without meaningful movement
        // rather than a quiet page. A loaded machine delivers frames slowly
        // enough that 120 of them can elapse before that run of three lands.
        for (let frame = 0; frame < 600; frame += 1) {
          await new Promise<void>((resolveFrame) => {
            window.requestAnimationFrame(() => {resolveFrame();});
          });
          const top = target.getBoundingClientRect().top;
          if (Math.abs(top - previousTop) < 0.5 && Math.abs(window.scrollY - previousScrollY) < 0.5) {
            stableFrameCount += 1;
          } else {
            stableFrameCount = 0;
          }
          previousScrollY = window.scrollY;
          previousTop = top;
          if (stableFrameCount === 3) {
            const bounds = target.getBoundingClientRect();
            return {
              'bottom': bounds.bottom, 'exists': true, 'settled': true,
              'top': bounds.top, 'viewportHeight': window.innerHeight
            };
          }
        }
        const bounds = target.getBoundingClientRect();
        return {
          'bottom': bounds.bottom, 'exists': true, 'settled': false,
          'top': bounds.top, 'viewportHeight': window.innerHeight
        };
      }, identifier);
      if (
        !settledGeometry.exists
        || !settledGeometry.settled
        || settledGeometry.bottom <= 0
        || settledGeometry.top >= settledGeometry.viewportHeight * 0.4
      ) {
        throw new Error(`Navigation target ${identifier} did not settle at the reading position: ${JSON.stringify(settledGeometry)}`);
      }
    } catch (error) {
      const geometry = await page.evaluate((targetIdentifier) => {
        const target = document.getElementById(targetIdentifier);
        if (target === null) {return { 'exists': false };}
        const bounds = target.getBoundingClientRect();
        return {
          'bottom': bounds.bottom, 'exists': true, 'scrollY': window.scrollY,
          'top': bounds.top, 'viewportHeight': window.innerHeight
        };
      }, identifier);
      throw new Error(`Navigation target ${identifier} did not reach the reading position: ${JSON.stringify(geometry)}`, { 'cause': error });
    }
  }

  static async navigateFrom(page: Page, sourceIdentifier: string, buttonName: string, targetIdentifier: string): Promise<void> {
    const button = page.locator(`#${sourceIdentifier}`).getByRole('button', { 'exact': true, 'name': buttonName });
    assert.equal(await button.count(), 1);
    await button.click();
    await NuxtBoundaryHarness.waitForTargetNearTop(page, targetIdentifier);
  }
}

await test('canonical VS Code tier demo keeps its controls, output, feedback, and framing coherent', { 'timeout': 180_000 }, async (context) => {
  assert.ok(
    ProductionNitroServer.isBuilt(),
    'The production Nitro entrypoint is required; run through the site test script.'
  );

  const { 'child': nitro, 'origin': origin } = await ProductionNitroServer.start();
  context.after(async () => {await ProductionNitroServer.stop(nitro);});
  await NuxtBoundaryHarness.waitForSsr(origin);

  const browser = await chromium.launch({ 'headless': true });
  context.after(async () => {await browser.close();});
  const page = await browser.newPage({ 'reducedMotion': 'reduce', 'viewport': { 'height': 900, 'width': 1280 } });
  await page.goto(origin, { 'waitUntil': 'networkidle' });

  const demo = page.getByRole('region', { 'name': 'Palette to VS Code theme' });
  const demoLayout = await page.evaluate(() => {
    const demoElement = document.querySelector<HTMLElement>('[aria-labelledby="vscode-tier-demo-title"]');
    const finalStage = document.getElementById('result');
    const remainingDocuments = document.getElementById('remaining-documents');
    const stageScene = document.querySelector<HTMLElement>('.cyl-scene-wrap');
    if (demoElement === null || finalStage === null || remainingDocuments === null || stageScene === null) {
      return {
        'demoAfterFinalStage': false,
        'demoBeforeDocumentation': false,
        'demoLeft': Number.NaN,
        'demoWidth': Number.NaN,
        'hasRequiredElements': false,
        'sceneLeft': Number.NaN,
        'sceneWidth': Number.NaN
      };
    }
    const demoBounds = demoElement.getBoundingClientRect();
    const sceneBounds = stageScene.getBoundingClientRect();
    return {
      'demoAfterFinalStage': Boolean(finalStage.compareDocumentPosition(demoElement) & Node.DOCUMENT_POSITION_FOLLOWING),
      'demoBeforeDocumentation': Boolean(demoElement.compareDocumentPosition(remainingDocuments) & Node.DOCUMENT_POSITION_FOLLOWING),
      'demoLeft': demoBounds.left,
      'demoWidth': demoBounds.width,
      'hasRequiredElements': true,
      'sceneLeft': sceneBounds.left,
      'sceneWidth': sceneBounds.width
    };
  });
  assert.ok(demoLayout.hasRequiredElements, 'The walkthrough, theme demo, and documentation sections must render.');
  assert.ok(demoLayout.demoAfterFinalStage, 'The VS Code theme demo must follow the palette walkthrough.');
  assert.ok(demoLayout.demoBeforeDocumentation, 'The VS Code theme demo must precede the reference documentation.');
  assert.ok(
    Math.abs(demoLayout.sceneLeft - demoLayout.demoLeft) <= 1,
    'The stage scene and VS Code demo must share a left grid edge.'
  );
  assert.ok(
    Math.abs(demoLayout.sceneWidth - demoLayout.demoWidth) <= 1,
    'The stage scene and VS Code demo must share a content width.'
  );
  await demo.scrollIntoViewIfNeeded();
  const palette = demo.getByLabel('Shipped palette');
  const tier = demo.getByLabel('Seed tier');
  assert.equal(await palette.count(), 1);
  assert.equal(await tier.count(), 1);

  await palette.focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#vscode-tier:focus').count(), 1);

  await tier.selectOption('8');
  await assert.doesNotReject(demo.getByText('Exact 8-role seed set', { 'exact': true }).waitFor());
  assert.equal(await demo.locator('input[aria-label$="seed color"]').count(), 8);
  await assert.doesNotReject(page.getByText('8-role tier selected. Its exact seed-role set replaces the editor fields.', { 'exact': true }).waitFor());

  const framingSwitch = page.locator('[role="switch"][aria-label="Dark framing"], [role="switch"][aria-label="Light framing"]');
  assert.equal(await framingSwitch.count(), 1);
  const initialFraming = await framingSwitch.getAttribute('aria-checked');
  const initialFramingDescription = await demo.getByText('Color framing:', { 'exact': false }).textContent();
  const revisionBeforeFlip = Number(await page.locator('html').getAttribute('data-iridis-palette-revision'));
  await framingSwitch.click();
  await page.waitForFunction((before) => {
    const revision = Number(document.documentElement.dataset.iridisPaletteRevision);
    const advanced = revision > before;
    return advanced;
  }, revisionBeforeFlip);
  assert.notEqual(await framingSwitch.getAttribute('aria-checked'), initialFraming);
  const framingDescription = await demo.getByText('Color framing:', { 'exact': false }).textContent();
  if (framingDescription === null) { throw new Error('The canonical demo must expose its shared framing state.'); }
  assert.notEqual(framingDescription, initialFramingDescription);
  assert.ok(framingDescription.includes('light') || framingDescription.includes('dark'), 'The shared framing result must name light or dark.');
  const colorMode = await page.locator('html').getAttribute('data-iridis-framing');
  assert.ok(colorMode === 'light' || colorMode === 'dark');
  const background = demo.getByLabel('background seed color');
  assert.equal(await background.count(), 1);
  await background.fill('invalid');
  const alert = demo.getByRole('alert');
  await assert.doesNotReject(alert.waitFor());
  const alertMessage = (await alert.textContent() ?? '').toLowerCase();
  assert.ok(alertMessage.includes('hex') || alertMessage.includes('color') || alertMessage.includes('invalid'));
  await background.fill('#101820');
  await alert.waitFor({ 'state': 'detached' });
  await assert.doesNotReject(demo.getByLabel('VS Code theme preview').waitFor());

  assert.equal(await demo.getByRole('button', { 'exact': true, 'name': 'Copy theme JSON' }).count(), 1);
  assert.equal(await demo.getByRole('button', { 'exact': true, 'name': 'Download theme JSON' }).count(), 1);

  await palette.focus();
  const focusStyle = await palette.evaluate((element) => {
    const style = getComputedStyle(element);
    return { 'boxShadow': style.boxShadow, 'outlineStyle': style.outlineStyle, 'outlineWidth': style.outlineWidth };
  });
  assert.ok(
    focusStyle.outlineStyle !== 'none' || focusStyle.boxShadow !== 'none',
    `The palette control needs a visible keyboard focus indicator: ${JSON.stringify(focusStyle)}`
  );

  const mobile = await browser.newPage({ 'reducedMotion': 'reduce', 'viewport': { 'height': 844, 'width': 390 } });
  await mobile.goto(origin, { 'waitUntil': 'networkidle' });
  const mobileDimensions = await mobile.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const overflowOwners: { readonly 'className': string; readonly 'identifier': string; readonly 'left': number; readonly 'right': number; readonly 'tagName': string }[] = [];
    let farthestRight = { 'className': '', 'identifier': '', 'left': 0, 'right': 0, 'tagName': '' };
    for (const element of document.querySelectorAll<HTMLElement>('body *')) {
      const bounds = element.getBoundingClientRect();
      const dimensions = {
        'className': element.className, 'identifier': element.id,
        'left': Math.round(bounds.left), 'right': Math.round(bounds.right), 'tagName': element.tagName
      };
      if (dimensions.right > farthestRight.right) {farthestRight = dimensions;}
      if (bounds.left >= 0 && bounds.right <= viewportWidth) {continue;}
      overflowOwners.push(dimensions);
      if (overflowOwners.length === 8) {break;}
    }
    const overflowContainers: { readonly 'className': string; readonly 'clientWidth': number; readonly 'identifier': string; readonly 'overflowX': string; readonly 'scrollWidth': number; readonly 'tagName': string }[] = [];
    for (const element of document.querySelectorAll<HTMLElement>('body *')) {
      if (element.scrollWidth <= element.clientWidth) {continue;}
      overflowContainers.push({
        'className': element.className, 'clientWidth': element.clientWidth, 'identifier': element.id,
        'overflowX': getComputedStyle(element).overflowX, 'scrollWidth': element.scrollWidth, 'tagName': element.tagName
      });
      if (overflowContainers.length === 8) {break;}
    }
    window.scrollTo({ 'left': viewportWidth, 'top': window.scrollY });
    const horizontalScrollX = window.scrollX;
    window.scrollTo({ 'left': 0, 'top': window.scrollY });
    return {
      'clientWidth': viewportWidth, 'farthestRight': farthestRight, 'horizontalScrollX': horizontalScrollX, 'overflowContainers': overflowContainers,
      'overflowOwners': overflowOwners, 'scrollWidth': document.documentElement.scrollWidth
    };
  });
  assert.ok(
    mobileDimensions.horizontalScrollX === 0,
    `The responsive page must not introduce horizontal overflow: ${JSON.stringify(mobileDimensions)}`
  );
  await mobile.close();
});

await test('carousel mounts only its active face and neighbours while the active face owns the scene height', { 'timeout': 180_000 }, async (context) => {
  assert.ok(ProductionNitroServer.isBuilt());
  const { 'child': nitro, 'origin': origin } = await ProductionNitroServer.start();
  context.after(async () => {await ProductionNitroServer.stop(nitro);});
  await NuxtBoundaryHarness.waitForSsr(origin);

  const browser = await chromium.launch({ 'headless': true });
  context.after(async () => {await browser.close();});
  const page = await browser.newPage({ 'reducedMotion': 'reduce', 'viewport': { 'height': 900, 'width': 1280 } });
  await page.goto(origin, { 'waitUntil': 'networkidle' });

  const explore = page.locator('#explore');
  await explore.scrollIntoViewIfNeeded();
  const initialFaces = await explore.evaluate((section) => {
    const scene = section.querySelector<HTMLElement>('.cyl-scene');
    if (scene === null) {throw new Error('Explore carousel scene is missing.');}
    return {
      'placeholders': section.querySelectorAll('.cyl-placeholder').length,
      'richFaces': section.querySelectorAll('.cyl-card').length,
      'sceneHeight': Number.parseFloat(scene.style.height)
    };
  });
  assert.equal(initialFaces.richFaces, 3);
  assert.equal(initialFaces.placeholders, 6);
  assert.ok(Number.isFinite(initialFaces.sceneHeight));

  const expandedHeight = await explore.evaluate(async (section) => {
    const scene = section.querySelector<HTMLElement>('.cyl-scene');
    const content = section.querySelector<HTMLElement>('.cyl-face.active .cyl-card-content');
    if (scene === null || content === null) {throw new Error('Active carousel content is missing.');}
    const initialHeight = Number.parseFloat(scene.style.height);
    const expansion = document.createElement('div');
    expansion.style.height = '320px';
    content.append(expansion);
    const deadline = performance.now() + 10_000;
    let nextHeight = initialHeight;
    while (nextHeight < initialHeight + 300 && performance.now() < deadline) {
      await new Promise<void>((resolveFrame) => {window.requestAnimationFrame(() => {resolveFrame();});});
      nextHeight = Number.parseFloat(scene.style.height);
    }
    return { 'initialHeight': initialHeight, 'nextHeight': nextHeight };
  });
  assert.ok(expandedHeight.nextHeight >= expandedHeight.initialHeight + 300, JSON.stringify(expandedHeight));

  await explore.getByRole('button', { 'exact': true, 'name': 'Color graph' }).click();
  await page.waitForFunction(() => {
    const card = document.querySelector<HTMLElement>('#explore .cyl-card[data-cyl-key="colorGraph"]');
    const result = card?.closest('.cyl-face')?.classList.contains('active') === true;
    return result;
  });
  const promotedFaces = await explore.evaluate((section) => {
    const cardKeys = Array.from(section.querySelectorAll<HTMLElement>('.cyl-card')).map((card) => {return card.dataset.cylKey;});
    const placeholderKeys = Array.from(section.querySelectorAll<HTMLElement>('.cyl-placeholder')).map((card) => {return card.dataset.cylKey;});
    const result = { 'cardKeys': cardKeys, 'placeholderKeys': placeholderKeys };
    return result;
  });
  assert.equal(promotedFaces.cardKeys.length, 3);
  assert.ok(promotedFaces.cardKeys.includes('colorGraph'));
  assert.ok(promotedFaces.placeholderKeys.includes('rolesTable'));
});

await test('ambient canvas paints the colour drift without writing document root styles', { 'timeout': 180_000 }, async (context) => {
  assert.ok(ProductionNitroServer.isBuilt());
  const { 'child': nitro, 'origin': origin } = await ProductionNitroServer.start();
  context.after(async () => {await ProductionNitroServer.stop(nitro);});
  await NuxtBoundaryHarness.waitForSsr(origin);

  const browser = await chromium.launch({ 'headless': true });
  context.after(async () => {await browser.close();});
  const page = await browser.newPage({ 'reducedMotion': 'no-preference', 'viewport': { 'height': 900, 'width': 1280 } });
  await page.goto(origin, { 'waitUntil': 'networkidle' });
  await page.waitForSelector('canvas.ambient-field');
  await page.waitForFunction(() => {
    const revision = Number(document.documentElement.dataset.iridisPaletteRevision);
    const committed = revision > 0;
    return committed;
  });

  const observed = await page.evaluate(async () => {
    const root = document.documentElement;
    let rootStyleMutations = 0;
    const observer = new MutationObserver((records) => {
      rootStyleMutations += records.length;
    });
    observer.observe(root, { 'attributeFilter': ['style'], 'attributes': true });
    await new Promise<void>((resolveWindow) => {
      window.setTimeout(() => {resolveWindow();}, 1000);
    });
    observer.disconnect();
    const canvas = document.querySelector<HTMLCanvasElement>('canvas.ambient-field');
    const context2d = canvas?.getContext('2d') ?? null;
    const pixels = canvas !== null && context2d !== null
      ? context2d.getImageData(0, 0, canvas.width, canvas.height).data
      : new Uint8ClampedArray(0);
    let paintedPixels = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if ((pixels[index] ?? 0) > 0) {
        paintedPixels += 1;
      }
    }
    const result = { 'paintedPixels': paintedPixels, 'rootStyleMutations': rootStyleMutations };
    return result;
  });
  assert.equal(observed.rootStyleMutations, 0, 'the drift must not write root styles');
  assert.ok(observed.paintedPixels > 0, 'the ambient canvas must carry painted colour');
});

await test('built Nuxt app SSRs and hydrates the rendered navigation order', { 'timeout': 240_000 }, async (context) => {
  // The production build is produced once by site's `pretest` script, not
  // here. Nuxt takes a lockfile for the duration of a build, and `node --test`
  // runs test files in parallel processes, so building inside a test raced
  // any sibling that touched the same output and failed with "Another Nuxt
  // build is already running". Building once up front also keeps that ~40s
  // out of this test's own budget.
  assert.ok(
    ProductionNitroServer.isBuilt(),
    'The production Nitro entrypoint is required; run through the site test script.'
  );

  const { 'child': nitro, 'origin': origin } = await ProductionNitroServer.start();
  context.after(async () => {await ProductionNitroServer.stop(nitro);});

  const html = await NuxtBoundaryHarness.waitForSsr(origin);
  assert.match(html, TestPatterns.SSR_NUXT_ROOT);
  assert.match(html, TestPatterns.SSR_TOKEN_SELECTOR);
  assert.match(html, TestPatterns.SSR_DOCUMENT_ONE);
  assert.match(html, TestPatterns.SSR_REMAINING_DOCUMENTS);
  assert.doesNotMatch(html, TestPatterns.SSR_COMBINE_STAGE);

  const browser = await chromium.launch({ 'headless': true });
  context.after(async () => {await browser.close();});
  const page = await browser.newPage({ 'reducedMotion': 'reduce' });
  await page.goto(origin, { 'waitUntil': 'networkidle' });

  const schemaTree = page.locator('[data-cyl-key="schema"]');
  const schemaExpansion = await schemaTree.locator('[role="treeitem"][aria-level="1"]').evaluateAll((tierNodes) => {
    const result = tierNodes.map((tierNode) => {
      return {
        'expanded': tierNode.getAttribute('aria-expanded'),
        'label': tierNode.textContent?.trim()
      };
    });
    return result;
  });
  assert.deepEqual(schemaExpansion, [
    { 'expanded': 'false', 'label': 'iridis-4' },
    { 'expanded': 'false', 'label': 'iridis-8' },
    { 'expanded': 'false', 'label': 'iridis-12' },
    { 'expanded': 'false', 'label': 'iridis-16' },
    { 'expanded': 'true', 'label': 'iridis-32' }
  ]);

  await page.locator('#combine').waitFor({ 'state': 'attached', 'timeout': 60_000 });
  const navigationTargetIdentifiers = [
    ...TestPatterns.DOCUMENT_IDENTIFIERS,
    ...TestPatterns.ALWAYS_VISIBLE_STAGE_IDENTIFIERS,
    'combine'
  ];
  const hydratedOrder = await page.evaluate((targetIdentifiers) => {
    const targets = new Set(targetIdentifiers);
    const order: string[] = [];
    for (const element of document.querySelectorAll('[id]')) {
      if (targets.has(element.id)) {order.push(element.id);}
    }
    return order;
  }, navigationTargetIdentifiers);
  assert.deepEqual(hydratedOrder, TestPatterns.EXPECTED_NAVIGATION_ORDER_WITH_COMBINE);

  await page.locator('#upload').getByRole('button', { 'exact': true, 'name': 'Remove Sample' }).click();
  await page.locator('#combine').waitFor({ 'state': 'detached' });
  const orderWithoutCombine = await page.evaluate((targetIdentifiers) => {
    const targets = new Set(targetIdentifiers);
    const order: string[] = [];
    for (const element of document.querySelectorAll('[id]')) {
      if (targets.has(element.id)) {order.push(element.id);}
    }
    return order;
  }, navigationTargetIdentifiers);
  assert.deepEqual(orderWithoutCombine, TestPatterns.EXPECTED_INITIAL_NAVIGATION_ORDER);

  await page.getByRole('button', { 'exact': true, 'name': 'Try a sample' }).click();
  await page.locator('#combine').waitFor({ 'state': 'attached', 'timeout': 60_000 });
  const restoredOrder = await page.evaluate((targetIdentifiers) => {
    const targets = new Set(targetIdentifiers);
    const order: string[] = [];
    for (const element of document.querySelectorAll('[id]')) {
      if (targets.has(element.id)) {order.push(element.id);}
    }
    return order;
  }, navigationTargetIdentifiers);
  assert.deepEqual(restoredOrder, TestPatterns.EXPECTED_NAVIGATION_ORDER_WITH_COMBINE);

  await NuxtBoundaryHarness.navigateFrom(page, 'upload', 'Combine', 'combine');
  await NuxtBoundaryHarness.navigateFrom(page, 'combine', 'Refine', 'refine');
  await NuxtBoundaryHarness.navigateFrom(page, 'refine', 'Combine', 'combine');
  await NuxtBoundaryHarness.navigateFrom(page, 'combine', 'Upload', 'upload');
  await NuxtBoundaryHarness.navigateFrom(page, 'upload', NuxtBoundaryHarness.documentTitle('02-the-four-stages'), '02-the-four-stages');

  const referenceSection = page.locator('#reference');
  await referenceSection.scrollIntoViewIfNeeded();
  const nextDocumentTitle = NuxtBoundaryHarness.documentTitle('03-adopting-existing-apps');
  const nextDocumentButton = referenceSection.getByRole('button', {
    'exact': true,
    'name': nextDocumentTitle
  });
  assert.equal(await nextDocumentButton.count(), 1);
  await nextDocumentButton.click();
  await assert.doesNotReject(page.waitForFunction((title) => {
    const result = document.querySelector('#remaining-documents h2')?.textContent?.includes(title) === true;
    return result;
  }, nextDocumentTitle));
  await NuxtBoundaryHarness.waitForTargetNearTop(page, '03-adopting-existing-apps');

  const directScrollState = await page.locator('[id="05-recipe-vue-capacitor"]').evaluate(async (element) => {
    const top = element.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.2;
    window.scrollTo({ 'behavior': 'instant', 'top': top });
    await new Promise<void>((resolveFrame) => {
      window.requestAnimationFrame(() => {resolveFrame();});
    });
    await new Promise<void>((resolveFrame) => {
      window.requestAnimationFrame(() => {resolveFrame();});
    });
    const targetBounds = element.getBoundingClientRect();
    const nextTargetTop = document.getElementById('06-plugin-ecosystem')?.getBoundingClientRect().top;
    return {
      'header': document.querySelector('#remaining-documents h2')?.textContent?.trim(),
      'nextTargetTop': nextTargetTop,
      'readingPosition': window.innerHeight * 0.2,
      'scrollY': window.scrollY,
      'targetBottom': targetBounds.bottom,
      'targetTop': targetBounds.top
    };
  });
  assert.ok(
    directScrollState.targetTop <= directScrollState.readingPosition + 1
      && directScrollState.nextTargetTop !== undefined
      && directScrollState.nextTargetTop > directScrollState.readingPosition + 1,
    `Doc05 must geometrically bracket the reading position: ${JSON.stringify(directScrollState)}`
  );
  assert.equal(
    directScrollState.header,
    NuxtBoundaryHarness.documentTitle('05-recipe-vue-capacitor'),
    `Direct scrolling must select the document at the reading position: ${JSON.stringify(directScrollState)}`
  );

  const reducedMotionAnimation = await page.evaluate(() => {
    const modal = document.createElement('div');
    modal.className = 'dagonizer-modal-card';
    document.body.append(modal);
    const animationName = getComputedStyle(modal).animationName;
    modal.remove();
    return animationName;
  });
  assert.equal(reducedMotionAnimation, 'none');

  const reducedMotionByPreset = await page.evaluate(async (presetKeys) => {
    const previousPresetKey = document.documentElement.dataset.iridisTheme;
    const probe = document.createElement('div');
    probe.className = 'ambient';
    const shape = document.createElement('span');
    shape.className = 'particle particle-shape';
    const glyph = document.createElement('span');
    glyph.className = 'particle particle-glyph';
    const heroOrb = document.createElement('span');
    heroOrb.className = 'hero-orb float';
    probe.append(shape, glyph);
    document.body.append(probe, heroOrb);

    const animationNames = new Map<string, readonly string[]>();
    for (let index = 0; index < presetKeys.length; index += 1) {
      const presetKey = presetKeys[index]!;
      document.documentElement.dataset.iridisTheme = presetKey;
      await new Promise<void>((resolveFrame) => {
        window.requestAnimationFrame(() => {resolveFrame();});
      });
      animationNames.set(presetKey, [
        getComputedStyle(probe).animationName,
        getComputedStyle(probe, '::before').animationName,
        getComputedStyle(probe, '::after').animationName,
        getComputedStyle(shape).animationName,
        getComputedStyle(glyph).animationName,
        getComputedStyle(heroOrb).animationName,
        getComputedStyle(heroOrb, '::before').animationName,
        getComputedStyle(heroOrb, '::after').animationName
      ]);
    }

    if (previousPresetKey === undefined) {
      document.documentElement.removeAttribute('data-iridis-theme');
    } else {
      document.documentElement.dataset.iridisTheme = previousPresetKey;
    }
    probe.remove();
    heroOrb.remove();
    const result = Array.from(animationNames.entries());
    return result;
  }, Object.keys(THEMES).toSorted((left, right) => { const result = left.localeCompare(right); return result; }));
  assert.equal(reducedMotionByPreset.length, Object.keys(THEMES).length);
  for (let index = 0; index < reducedMotionByPreset.length; index += 1) {
    const [presetKey, animationNames] = reducedMotionByPreset[index]!;
    assert.deepEqual(
      new Set(animationNames),
      new Set(['none']),
      `${presetKey} must neutralize every preset animation under reduced motion`
    );
  }
});
