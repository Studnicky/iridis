import { chromium, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ProductionNitroServer } from './fixtures/ProductionNitroServer.ts';

/** Plain-JS init script: records worker traffic and pings the main thread's task queue at each lane send. Kept as a string so the bundler injects no helpers into the page. */
const WORKER_TRACE_SCRIPT = `
(() => {
  const NativeWorker = window.Worker;
  const stats = new Map();
  const serviced = new Set();
  const laneKinds = new Set(['combine', 'extract', 'palette']);
  const bump = (key) => { stats.set(key, (stats.get(key) ?? 0) + 1); };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      bump('workerCount');
      this.addEventListener('message', (event) => {
        bump('received:' + event.data.kind);
        if (laneKinds.has(event.data.kind) && !serviced.has(event.data.id)) { bump('unservicedReplies'); }
      });
    }
    postMessage(message) {
      if (message instanceof ArrayBuffer) {
        bump('transferredBuffers');
        super.postMessage(message, [message]);
        if (message.byteLength === 0) { bump('detachedBuffers'); }
        return;
      }
      const kind = message.message.kind;
      bump('sent:' + kind);
      super.postMessage(message);
      if (laneKinds.has(kind)) {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => { serviced.add(message.id); };
        channel.port2.postMessage(0);
      }
    }
  };
  window.iridisWorkerStat = (key) => stats.get(key) ?? 0;
})();
`;

class WorkerTraceHarness {
  public static async stat(page: Page, key: string): Promise<number> {
    const value: unknown = await page.evaluate(`window.iridisWorkerStat(${JSON.stringify(key)})`);
    if (typeof value === 'number') {
      return value;
    }
    throw new TypeError(`Worker trace stat ${key} is not a number`);
  }
}

await test('image extraction and combine round-trip through the real worker while the main thread keeps servicing tasks', { 'timeout': 240_000 }, async (context) => {
  assert.ok(
    ProductionNitroServer.isBuilt(),
    'The production Nitro entrypoint is required; run through the site test script.'
  );

  const { 'child': nitro, 'origin': origin } = await ProductionNitroServer.start();
  context.after(async () => {await ProductionNitroServer.stop(nitro);});

  const browser = await chromium.launch({ 'headless': true });
  context.after(async () => {await browser.close();});
  const page = await browser.newPage({ 'reducedMotion': 'reduce' });
  await page.addInitScript({ 'content': WORKER_TRACE_SCRIPT });
  await page.goto(origin, { 'waitUntil': 'networkidle' });

  await page.waitForFunction(`window.iridisWorkerStat('received:extract') >= 1
    && window.iridisWorkerStat('received:combine') >= 1
    && Number(document.documentElement.dataset.iridisPaletteRevision) > 0`, null, { 'timeout': 120_000 });

  await page.locator('#upload').getByRole('button', { 'exact': true, 'name': 'Remove Sample' }).click();
  await page.locator('#combine').waitFor({ 'state': 'detached' });
  await page.getByRole('button', { 'exact': true, 'name': 'Try a sample' }).click();
  await page.waitForFunction(`window.iridisWorkerStat('received:extract') >= 2
    && window.iridisWorkerStat('received:combine') >= 2`, null, { 'timeout': 120_000 });

  const transferred = await WorkerTraceHarness.stat(page, 'transferredBuffers');
  assert.equal(await WorkerTraceHarness.stat(page, 'workerCount'), 1, 'extraction, combine, and palette resolve share one worker');
  assert.ok(transferred >= 2, 'each decoded image transfers its pixel buffer');
  assert.equal(await WorkerTraceHarness.stat(page, 'detachedBuffers'), transferred, 'transferred buffers are detached on the main thread, not copied');
  assert.ok(await WorkerTraceHarness.stat(page, 'sent:pixels') >= 2);
  assert.ok(await WorkerTraceHarness.stat(page, 'sent:extract') >= 2);
  assert.ok(await WorkerTraceHarness.stat(page, 'sent:combine') >= 2);
  assert.ok(await WorkerTraceHarness.stat(page, 'sent:palette') >= 1);
  assert.ok(await WorkerTraceHarness.stat(page, 'sent:release') >= 1, 'removing an image releases its worker-held pixels');
  assert.equal(await WorkerTraceHarness.stat(page, 'unservicedReplies'), 0, 'the main thread ran a queued task before every lane reply arrived');
});
