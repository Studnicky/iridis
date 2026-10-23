import {
  chromium, type Locator, type Page
} from '@playwright/test';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ProductionNitroServer } from './fixtures/ProductionNitroServer.ts';

class ColorGraphLifecycleBrowser {
  static readonly graphWaitMs = 60_000;
  static readonly wheelZoomInDelta = -420;

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

  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, ColorGraphLifecycleBrowser.wheelZoomInDelta);
  await page.waitForFunction((floor) => {
    const text = document.querySelector('#explore .cyl-face.active .dagonizer-dpad-hud-level')?.textContent;
    const current = Number.parseFloat(text?.replace('×', '') ?? 'NaN');
    const result = Number.isFinite(current) && current > floor;

    return result;
  }, fitZoom, { 'timeout': ColorGraphLifecycleBrowser.graphWaitMs });
  await ColorGraphLifecycleBrowser.awaitState(page, 'settled');
  const beforeZoomOut = await ColorGraphLifecycleBrowser.zoomText(page);

  await page.locator('#explore .cyl-face.active').getByLabel('Navigation D-pad')
    .getByRole('button', {
      'exact': true,
      'name': 'Zoom out'
    })
    .click();
  await page.waitForFunction((previous) => {
    const text = document.querySelector('#explore .cyl-face.active .dagonizer-dpad-hud-level')?.textContent;
    const current = Number.parseFloat(text?.replace('×', '') ?? 'NaN');
    const result = Number.isFinite(current) && current < previous;

    return result;
  }, beforeZoomOut, { 'timeout': ColorGraphLifecycleBrowser.graphWaitMs });
  const afterZoomOut = await ColorGraphLifecycleBrowser.zoomText(page);

  assert.ok(afterZoomOut < beforeZoomOut, JSON.stringify({
    'afterFit': fitZoom,
    'afterZoomOut': afterZoomOut,
    'beforeZoomOut': beforeZoomOut
  }));
});
