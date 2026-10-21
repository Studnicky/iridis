import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ProductionNitroServer } from './fixtures/ProductionNitroServer.ts';

await test('carousel leaves a distant graph uninstantiated and mounts it only after selection', { 'timeout': 120_000 }, async (context) => {
  assert.ok(ProductionNitroServer.isBuilt(), 'The production Nitro entrypoint is required; run through the site test script.');
  const { 'child': nitro, 'origin': origin } = await ProductionNitroServer.start();
  context.after(async () => {await ProductionNitroServer.stop(nitro);});

  const browser = await chromium.launch({ 'headless': true });
  context.after(async () => {await browser.close();});
  const page = await browser.newPage({ 'reducedMotion': 'reduce', 'viewport': { 'height': 900, 'width': 1280 } });
  await page.goto(origin, { 'waitUntil': 'networkidle' });

  await page.waitForFunction(() => {
    const result = document.querySelector('#explore .cyl-scene') !== null;
    return result;
  });
  await page.evaluate(() => {document.querySelector('#explore')?.scrollIntoView();});
  const explore = page.locator('#explore');
  const dormant = await explore.evaluate((section) => {
    const placeholder = section.querySelector<HTMLElement>('.cyl-placeholder[data-cyl-key="colorGraph"]');
    return {
      'canvasCount': placeholder?.querySelectorAll('canvas').length ?? -1,
      'graphCount': placeholder?.querySelectorAll('.cg-canvas').length ?? -1,
      'hasPlaceholder': placeholder !== null
    };
  });
  assert.deepEqual(dormant, { 'canvasCount': 0, 'graphCount': 0, 'hasPlaceholder': true });

  await explore.getByRole('button', { 'exact': true, 'name': 'Color graph' }).click();
  await page.waitForFunction(() => {
    const graphCard = document.querySelector<HTMLElement>('#explore .cyl-face.active .cyl-card[data-cyl-key="colorGraph"]');
    const result = graphCard !== null && graphCard.querySelector('.cg-canvas') !== null && graphCard.querySelectorAll('canvas').length > 0;
    return result;
  });
  const promoted = await explore.evaluate((section) => {
    const graphCard = section.querySelector<HTMLElement>('.cyl-face.active .cyl-card[data-cyl-key="colorGraph"]');
    return {
      'canvasCount': graphCard?.querySelectorAll('canvas').length ?? 0,
      'graphCount': graphCard?.querySelectorAll('.cg-canvas').length ?? 0,
      'placeholderCount': section.querySelectorAll('.cyl-placeholder[data-cyl-key="colorGraph"]').length
    };
  });
  assert.equal(promoted.placeholderCount, 0);
  assert.ok(promoted.graphCount > 0, JSON.stringify(promoted));
  assert.ok(promoted.canvasCount > 0, JSON.stringify(promoted));

  await explore.getByRole('button', { 'exact': true, 'name': 'Roles table' }).click();
  await page.waitForFunction(() => {
    const result = document.querySelector('#explore .cyl-placeholder[data-cyl-key="colorGraph"]') !== null;
    return result;
  });
  const unmounted = await explore.evaluate((section) => {
    const placeholder = section.querySelector<HTMLElement>('.cyl-placeholder[data-cyl-key="colorGraph"]');
    return {
      'canvasCount': placeholder?.querySelectorAll('canvas').length ?? -1,
      'graphCount': placeholder?.querySelectorAll('.cg-canvas').length ?? -1,
      'hasPlaceholder': placeholder !== null
    };
  });
  assert.deepEqual(unmounted, { 'canvasCount': 0, 'graphCount': 0, 'hasPlaceholder': true });
});
