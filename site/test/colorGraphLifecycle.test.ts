import {
  chromium, type Locator, type Page
} from '@playwright/test';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ProductionNitroServer } from './fixtures/ProductionNitroServer.ts';

class ColorGraphLifecycleBrowser {
  static readonly graphWaitMs = 60_000;
  static readonly wheelAttemptMs = 3_000;
  static readonly wheelAttempts = 12;
  static readonly wheelZoomInDelta = -420;
  static readonly wheelZoomRatio = 1.5;

  static activeGraph(page: Page, states: readonly string[]): Locator {
    const selector = states
      .map((state) => {
        return `#explore .cyl-face.active .cg-wrap[data-graph-state="${state}"]`;
      })
      .join(', ');
    const result = page.locator(selector);

    return result;
  }

  // The graph publishes its lifecycle FSM state, so waits follow transitions, not timers.
  // Pass every state that satisfies the condition, so a transient state cannot be missed.
  static async awaitState(page: Page, ...states: string[]): Promise<void> {
    try {
      await ColorGraphLifecycleBrowser.activeGraph(page, states).first()
        .waitFor({ 'timeout': ColorGraphLifecycleBrowser.graphWaitMs });
    } catch (error) {
      const observed = await page.locator('#explore .cg-wrap').evaluateAll((nodes) => {
        const result = nodes.map((node) => {
          const state = node.getAttribute('data-graph-state');

          return state;
        });

        return result;
      });

      throw new Error(`Expected graph state ${states.join('|')}, observed [${observed.join(', ')}].`, { 'cause': error });
    }
  }

  // The wheel targets the centre of the canvas area inside the viewport and reports the element that receives it.
  // The tuple is [x, y, description of the element under the point].
  static async wheelTarget(canvas: Locator): Promise<readonly [number, number, string]> {
    const result = await canvas.evaluate((node): readonly [number, number, string] => {
      const rect = node.getBoundingClientRect();
      const left = (Math.max(rect.left, 0) + Math.min(rect.right, window.innerWidth)) / 2;
      const top = (Math.max(rect.top, 0) + Math.min(rect.bottom, window.innerHeight)) / 2;
      const hit = document.elementFromPoint(left, top);
      const target = [left, top, hit === null ? 'none' : `${hit.tagName}.${hit.className}`] as const;

      return target;
    });

    return result;
  }

  // The carousel face can still be moving when a wheel lands, so each attempt re-measures the target.
  static async wheelZoomIn(page: Page, canvas: Locator, floor: number): Promise<void> {
    let target = await ColorGraphLifecycleBrowser.wheelTarget(canvas);

    for (let attempt = 0; attempt < ColorGraphLifecycleBrowser.wheelAttempts; attempt += 1) {
      target = await ColorGraphLifecycleBrowser.wheelTarget(canvas);
      await page.mouse.move(target[0], target[1]);
      await page.mouse.wheel(0, ColorGraphLifecycleBrowser.wheelZoomInDelta);
      if (await ColorGraphLifecycleBrowser.zoomRaised(page, floor * ColorGraphLifecycleBrowser.wheelZoomRatio)) {
        return;
      }
    }
    throw new Error(`The wheel never raised the zoom well above ${floor}; last target ${JSON.stringify(target)}.`);
  }

  // A refit while the carousel settles can reset the zoom, so the raised zoom is confirmed after the graph settles.
  static async wheelZoomInSettled(page: Page, canvas: Locator, floor: number): Promise<void> {
    for (let attempt = 0; attempt < ColorGraphLifecycleBrowser.wheelAttempts; attempt += 1) {
      await ColorGraphLifecycleBrowser.wheelZoomIn(page, canvas, floor);
      await ColorGraphLifecycleBrowser.awaitState(page, 'settled');
      const settledZoom = await ColorGraphLifecycleBrowser.zoomText(page);

      if (settledZoom > floor * ColorGraphLifecycleBrowser.wheelZoomRatio) {
        return;
      }
    }
    throw new Error(`The settled zoom never stayed above ${floor}.`);
  }

  static async zoomRaised(page: Page, floor: number): Promise<boolean> {
    try {
      await page.waitForFunction((reference) => {
        const text = document.querySelector('#explore .cyl-face.active .dagonizer-dpad-hud-level')?.textContent;
        const current = Number.parseFloat(text?.replace('×', '') ?? 'NaN');
        const result = Number.isFinite(current) && current > reference;

        return result;
      }, floor, { 'timeout': ColorGraphLifecycleBrowser.wheelAttemptMs });
    } catch {
      return false;
    }

    return true;
  }

  static async awaitZoomAbove(page: Page, floor: number): Promise<void> {
    try {
      await page.waitForFunction((reference) => {
        const text = document.querySelector('#explore .cyl-face.active .dagonizer-dpad-hud-level')?.textContent;
        const current = Number.parseFloat(text?.replace('×', '') ?? 'NaN');
        const result = Number.isFinite(current) && current > reference;

        return result;
      }, floor, { 'timeout': ColorGraphLifecycleBrowser.graphWaitMs });
    } catch (error) {
      throw await ColorGraphLifecycleBrowser.zoomTimeout(page, `above ${floor}`, error);
    }
  }

  static async awaitZoomBelow(page: Page, ceiling: number): Promise<void> {
    try {
      await page.waitForFunction((reference) => {
        const text = document.querySelector('#explore .cyl-face.active .dagonizer-dpad-hud-level')?.textContent;
        const current = Number.parseFloat(text?.replace('×', '') ?? 'NaN');
        const result = Number.isFinite(current) && current < reference;

        return result;
      }, ceiling, { 'timeout': ColorGraphLifecycleBrowser.graphWaitMs });
    } catch (error) {
      throw await ColorGraphLifecycleBrowser.zoomTimeout(page, `below ${ceiling}`, error);
    }
  }

  private static async zoomTimeout(page: Page, expectation: string, cause: unknown): Promise<Error> {
    const hud = await page.locator('#explore .cyl-face.active .dagonizer-dpad-hud-level').innerText();
    const states = await page.locator('#explore .cg-wrap').evaluateAll((nodes) => {
      const result = nodes.map((node) => {
        const state = node.getAttribute('data-graph-state');

        return state;
      });

      return result;
    });
    const result = new Error(`Expected zoom ${expectation}; the HUD shows "${hud}" with graph state [${states.join(', ')}].`, { 'cause': cause });

    return result;
  }

  static async awaitSuspended(page: Page): Promise<void> {
    await page.locator('#explore .cyl-face:not(.active) .cg-wrap[data-graph-state="suspended"]').waitFor({ 'timeout': ColorGraphLifecycleBrowser.graphWaitMs });
  }

  static async selectGraphCard(page: Page): Promise<void> {
    await page.locator('#explore').getByRole('button', {
      'exact': true,
      'name': 'Color graph'
    })
      .click();
    await page.locator('#explore .cyl-face.active .cyl-card[data-cyl-key="colorGraph"]').scrollIntoViewIfNeeded();
  }

  static async zoomText(page: Page): Promise<number> {
    const text = await page.locator('#explore .cyl-face.active .dagonizer-dpad-hud-level').innerText();
    const result = Number.parseFloat(text.replace('×', ''));

    assert.ok(Number.isFinite(result), `Expected a finite zoom text, received ${text}.`);

    return result;
  }
}

await test('tearing down during a final fit cannot impose a zoom floor on a replacement graph', { 'timeout': 180_000 }, async (context) => {
  assert.ok(ProductionNitroServer.isBuilt(), 'The production Nitro entrypoint is required; run through the site test script.');
  const running = await ProductionNitroServer.start();

  context.after(async () => {
    await ProductionNitroServer.stop(running.child);
  });

  const browser = await chromium.launch({ 'headless': true });

  context.after(async () => {
    await browser.close();
  });
  const page = await browser.newPage({
    'reducedMotion': 'reduce',
    'viewport': {
      'height': 900,
      'width': 1280
    }
  });

  await page.goto(running.origin, { 'waitUntil': 'networkidle' });

  const explore = page.locator('#explore');

  await explore.scrollIntoViewIfNeeded();
  await ColorGraphLifecycleBrowser.selectGraphCard(page);
  await ColorGraphLifecycleBrowser.awaitState(page, 'fitting', 'settled');
  await explore.getByRole('button', {
    'exact': true,
    'name': 'Roles table'
  }).click();
  await page.locator('#explore .cyl-placeholder[data-cyl-key="colorGraph"]').waitFor({ 'timeout': ColorGraphLifecycleBrowser.graphWaitMs });

  await ColorGraphLifecycleBrowser.selectGraphCard(page);
  await ColorGraphLifecycleBrowser.awaitState(page, 'settled');

  const canvas = page.locator('#explore .cyl-face.active .cg-cosmos');
  const bounds = await canvas.boundingBox();

  assert.notEqual(bounds, null, 'The replacement graph needs an interactive canvas.');
  if (bounds === null) {
    return;
  }
  const fitZoom = await ColorGraphLifecycleBrowser.zoomText(page);

  await ColorGraphLifecycleBrowser.wheelZoomInSettled(page, canvas, fitZoom);
  const beforeZoomOut = await ColorGraphLifecycleBrowser.zoomText(page);

  await page.locator('#explore .cyl-face.active').getByLabel('Navigation D-pad')
    .getByRole('button', {
      'exact': true,
      'name': 'Zoom out'
    })
    .click();
  await ColorGraphLifecycleBrowser.awaitZoomBelow(page, beforeZoomOut);
  const afterZoomOut = await ColorGraphLifecycleBrowser.zoomText(page);

  assert.ok(afterZoomOut < beforeZoomOut, JSON.stringify({
    'afterFit': fitZoom,
    'afterZoomOut': afterZoomOut,
    'beforeZoomOut': beforeZoomOut
  }));
});

await test('a graph on an inactive neighbour face is disposed behind a snapshot and mounts again when the face activates', { 'timeout': 180_000 }, async (context) => {
  assert.ok(ProductionNitroServer.isBuilt(), 'The production Nitro entrypoint is required; run through the site test script.');
  const running = await ProductionNitroServer.start();

  context.after(async () => {
    await ProductionNitroServer.stop(running.child);
  });

  const browser = await chromium.launch({ 'headless': true });

  context.after(async () => {
    await browser.close();
  });
  const page = await browser.newPage({
    'reducedMotion': 'reduce',
    'viewport': {
      'height': 900,
      'width': 1280
    }
  });

  await page.goto(running.origin, { 'waitUntil': 'networkidle' });
  await page.locator('#explore').scrollIntoViewIfNeeded();
  await ColorGraphLifecycleBrowser.selectGraphCard(page);
  await ColorGraphLifecycleBrowser.awaitState(page, 'settled');

  await page.locator('#explore').getByRole('button', {
    'exact': true,
    'name': 'Spectrum'
  })
    .click();
  await ColorGraphLifecycleBrowser.awaitSuspended(page);

  const suspended = await page.locator('#explore .cyl-face:not(.active) .cg-wrap[data-graph-state="suspended"]').evaluate((node) => {
    const result = {
      'liveCanvases': node.querySelectorAll('.cg-cosmos canvas').length,
      'snapshotCanvases': node.querySelectorAll('.cg-snapshot canvas').length
    };

    return result;
  });

  assert.deepEqual(suspended, { 'liveCanvases': 0, 'snapshotCanvases': 1 });

  await ColorGraphLifecycleBrowser.selectGraphCard(page);
  await ColorGraphLifecycleBrowser.awaitState(page, 'settled');

  const resumed = await page.locator('#explore .cyl-face.active .cg-wrap').evaluate((node) => {
    const result = {
      'liveCanvases': node.querySelectorAll('.cg-cosmos canvas').length,
      'snapshotCanvases': node.querySelectorAll('.cg-snapshot canvas').length
    };

    return result;
  });

  assert.deepEqual(resumed, { 'liveCanvases': 1, 'snapshotCanvases': 0 });
});
