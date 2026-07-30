import { chromium, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { THEMES } from '../app/theme/presets/index.ts';
import { TestPatterns } from './fixtures/TestPatterns.ts';

const SITE_ROOT = resolve(import.meta.dirname, '..');
const NITRO_SERVER = resolve(SITE_ROOT, '.output/server/index.mjs');

class NuxtBoundaryHarness {
  static isListeningMessage(message: unknown): message is { readonly 'port': number; readonly 'type': 'nitro-listening' } {
    if (typeof message !== 'object' || message === null) {return false;}
    return Reflect.get(message, 'type') === 'nitro-listening'
      && Number.isInteger(Reflect.get(message, 'port'))
      && Reflect.get(message, 'port') > 0;
  }

  static hasExited(child: ChildProcess): boolean {
    return child.exitCode !== null || child.signalCode !== null;
  }

  static async waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
    if (NuxtBoundaryHarness.hasExited(child)) {return true;}
    return await new Promise<boolean>((resolveExit) => {
      const onExit = (): void => {
        globalThis.clearTimeout(timer);
        resolveExit(true);
      };
      const timer = globalThis.setTimeout(() => {
        child.off('exit', onExit);
        resolveExit(NuxtBoundaryHarness.hasExited(child));
      }, timeoutMs);
      child.once('exit', onExit);
    });
  }

  static async stopNitro(child: ChildProcess): Promise<void> {
    if (NuxtBoundaryHarness.hasExited(child)) {return;}
    child.kill('SIGTERM');
    if (await NuxtBoundaryHarness.waitForExit(child, 5_000)) {return;}
    child.kill('SIGKILL');
    if (!await NuxtBoundaryHarness.waitForExit(child, 5_000)) {
      throw new Error(`Nitro child ${child.pid ?? 'unknown'} did not exit after SIGKILL`);
    }
  }

  static async startNitro(): Promise<{ readonly 'child': ChildProcess; readonly 'origin': string }> {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', `
      import { Server } from 'node:net';

      const originalListen = Server.prototype.listen;
      Server.prototype.listen = function (...argumentsList) {
        const server = this;
        server.once('listening', () => {
          const address = server.address();
          if (address !== null && typeof address !== 'string' && typeof process.send === 'function') {
            process.send({ port: address.port, type: 'nitro-listening' });
          }
        });
        return Reflect.apply(originalListen, server, argumentsList);
      };

      await import(${JSON.stringify(pathToFileURL(NITRO_SERVER).href)});
    `], {
      'cwd': SITE_ROOT,
      'env': { ...process.env, 'HOST': '127.0.0.1', 'NODE_ENV': 'production', 'PORT': '0' },
      'stdio': ['ignore', 'pipe', 'pipe', 'ipc']
    });
    let standardOutput = '';
    let standardError = '';
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {standardOutput += chunk;});
    child.stderr?.on('data', (chunk: string) => {standardError += chunk;});

    try {
      const port = await new Promise<number>((resolvePort, rejectPort) => {
        const cleanup = (): void => {
          globalThis.clearTimeout(timer);
          child.off('error', onError);
          child.off('exit', onExit);
          child.off('message', onMessage);
        };
        const fail = (message: string, cause?: unknown): void => {
          cleanup();
          const output = `${standardOutput}\n${standardError}`.trim();
          rejectPort(new Error(`${message}${output.length > 0 ? `\n${output}` : ''}`, { 'cause': cause }));
        };
        const onError = (error: Error): void => {fail('Nitro child failed to start', error);};
        const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
          fail(`Nitro child exited before listening (code ${String(code)}, signal ${String(signal)})`);
        };
        const onMessage = (message: unknown): void => {
          if (!NuxtBoundaryHarness.isListeningMessage(message)) {return;}
          cleanup();
          resolvePort(message.port);
        };
        const timer = globalThis.setTimeout(() => {
          fail('Nitro child did not report its bound port within 15 seconds');
        }, 15_000);
        child.once('error', onError);
        child.once('exit', onExit);
        child.on('message', onMessage);
      });
      return { 'child': child, 'origin': `http://127.0.0.1:${port}` };
    } catch (error) {
      await NuxtBoundaryHarness.stopNitro(child);
      throw error;
    }
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
        return bounds.bottom > 0 && bounds.top < window.innerHeight * 0.4;
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

await test('built Nuxt app SSRs and hydrates the rendered navigation order', { 'timeout': 240_000 }, async (context) => {
  // The production build is produced once by site's `pretest` script, not
  // here. Nuxt takes a lockfile for the duration of a build, and `node --test`
  // runs test files in parallel processes, so building inside a test raced
  // any sibling that touched the same output and failed with "Another Nuxt
  // build is already running". Building once up front also keeps that ~40s
  // out of this test's own budget.
  assert.ok(
    existsSync(NITRO_SERVER),
    `Nitro entrypoint missing at ${NITRO_SERVER}. Run the suite through 'pnpm --filter site run test', whose pretest builds it.`
  );

  const { 'child': nitro, 'origin': origin } = await NuxtBoundaryHarness.startNitro();
  context.after(async () => {await NuxtBoundaryHarness.stopNitro(nitro);});

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
  await NuxtBoundaryHarness.navigateFrom(page, 'upload', '2. The Four Stages', '02-the-four-stages');

  const referenceSection = page.locator('#reference');
  await referenceSection.scrollIntoViewIfNeeded();
  const nextDocumentButton = referenceSection.getByRole('button', {
    'exact': true,
    'name': '3. Adopting Iridis In An Existing App'
  });
  assert.equal(await nextDocumentButton.count(), 1);
  await nextDocumentButton.click();
  await assert.doesNotReject(page.waitForFunction(() => {
    return document.querySelector('#remaining-documents h2')?.textContent?.includes('3. Adopting Iridis In An Existing App') === true;
  }));
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
    '5. Recipe: Vue + Capacitor Per-Category Palettes',
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
    const lavaBlob = document.createElement('span');
    lavaBlob.className = 'lava-blob';
    const heroOrb = document.createElement('span');
    heroOrb.className = 'hero-orb float';
    probe.append(shape, glyph, lavaBlob);
    document.body.append(probe, heroOrb);

    const animationNames: Record<string, readonly string[]> = {};
    for (const presetKey of presetKeys) {
      document.documentElement.dataset.iridisTheme = presetKey;
      await new Promise<void>((resolveFrame) => {
        window.requestAnimationFrame(() => {resolveFrame();});
      });
      animationNames[presetKey] = [
        getComputedStyle(probe).animationName,
        getComputedStyle(probe, '::before').animationName,
        getComputedStyle(probe, '::after').animationName,
        getComputedStyle(shape).animationName,
        getComputedStyle(glyph).animationName,
        getComputedStyle(lavaBlob).animationName,
        getComputedStyle(heroOrb).animationName,
        getComputedStyle(heroOrb, '::before').animationName,
        getComputedStyle(heroOrb, '::after').animationName
      ];
    }

    if (previousPresetKey === undefined) {
      document.documentElement.removeAttribute('data-iridis-theme');
    } else {
      document.documentElement.dataset.iridisTheme = previousPresetKey;
    }
    probe.remove();
    heroOrb.remove();
    return animationNames;
  }, Object.keys(THEMES).sort());
  assert.equal(Object.keys(reducedMotionByPreset).length, Object.keys(THEMES).length);
  for (const [presetKey, animationNames] of Object.entries(reducedMotionByPreset)) {
    assert.deepEqual(
      new Set(animationNames),
      new Set(['none']),
      `${presetKey} must neutralize every preset animation under reduced motion`
    );
  }
});
