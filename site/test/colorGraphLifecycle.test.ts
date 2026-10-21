import { chromium, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { ProductionNitroServer } from './fixtures/ProductionNitroServer.ts';

class ColorGraphLifecycleBrowser {
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
  const page = await browser.newPage({ 'reducedMotion': 'reduce', 'viewport': { 'height': 900, 'width': 1280 } });
  await page.goto(running.origin, { 'waitUntil': 'networkidle' });

  const explore = page.locator('#explore');
  await explore.scrollIntoViewIfNeeded();
  await explore.getByRole('button', { 'exact': true, 'name': 'Color graph' }).click();
  await page.waitForSelector('#explore .cyl-face.active .cg-cosmos canvas', { 'timeout': 60_000 });
  await setTimeout(1_250);
  await explore.getByRole('button', { 'exact': true, 'name': 'Roles table' }).click();
  await page.waitForSelector('#explore .cyl-placeholder[data-cyl-key="colorGraph"]', { 'timeout': 60_000 });

  await explore.getByRole('button', { 'exact': true, 'name': 'Color graph' }).click();
  await page.waitForSelector('#explore .cyl-face.active .cg-cosmos canvas', { 'timeout': 60_000 });
  await setTimeout(900);

  const canvas = page.locator('#explore .cyl-face.active .cg-cosmos');
  const bounds = await canvas.boundingBox();
  assert.notEqual(bounds, null, 'The replacement graph needs an interactive canvas.');
  if (bounds === null) {
    return;
  }
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, -420);
  await setTimeout(350);
  const beforeZoomOut = await ColorGraphLifecycleBrowser.zoomText(page);
  await page.locator('#explore .cyl-face.active').getByLabel('Navigation D-pad').getByRole('button', { 'exact': true, 'name': 'Zoom out' }).click();
  await page.waitForFunction((previous) => {
    const text = document.querySelector('#explore .cyl-face.active .dagonizer-dpad-hud-level')?.textContent;
    const current = Number.parseFloat(text?.replace('×', '') ?? 'NaN');
    const result = Number.isFinite(current) && current < previous;
    return result;
  }, beforeZoomOut, { 'timeout': 60_000 });
  const afterZoomOut = await ColorGraphLifecycleBrowser.zoomText(page);
  assert.ok(afterZoomOut < beforeZoomOut, JSON.stringify({ 'afterZoomOut': afterZoomOut, 'beforeZoomOut': beforeZoomOut }));
});
