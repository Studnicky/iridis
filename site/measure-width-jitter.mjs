import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const SITE_ROOT = '/Users/studs/Workspace/iridis/site';
const NITRO_SERVER = `${SITE_ROOT}/.output/server/index.mjs`;

function startNitro() {
  return new Promise((resolve, reject) => {
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
      await import(${JSON.stringify(`file://${NITRO_SERVER}`)});
    `], {
      cwd: SITE_ROOT,
      env: { ...process.env, HOST: '127.0.0.1', NODE_ENV: 'production', PORT: '0' },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });
    child.once('message', (message) => {
      if (message && message.type === 'nitro-listening') resolve({ child, origin: `http://127.0.0.1:${message.port}` });
    });
    child.once('error', reject);
    child.stderr.on('data', (d) => process.stderr.write(d));
  });
}

const { child, origin } = await startNitro();
console.log('origin', origin);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ reducedMotion: 'reduce' });

// Patch ResizeObserver BEFORE any app code runs, to log every width reading
// that reaches every observed element on the page across the whole session
// (not just BalancedWrap's own instance, matching the team's original
// "ResizeObserver over every element" methodology).
await page.addInitScript(() => {
  window.__roLog = [];
  const OriginalRO = window.ResizeObserver;
  window.ResizeObserver = class PatchedRO extends OriginalRO {
    constructor(callback) {
      super((entries, observer) => {
        for (const entry of entries) {
          const el = entry.target;
          window.__roLog.push({
            t: performance.now(),
            cls: el.className,
            w: entry.contentRect.width
          });
        }
        callback(entries, observer);
      });
    }
  };
});

await page.goto(origin, { waitUntil: 'networkidle' });
await page.locator('#combine').waitFor({ state: 'attached', timeout: 60000 });
await page.locator('#upload').getByRole('button', { exact: true, name: 'Remove Sample' }).click();
await page.locator('#combine').waitFor({ state: 'detached' });
await page.getByRole('button', { exact: true, name: 'Try a sample' }).click();
await page.locator('#combine').waitFor({ state: 'attached', timeout: 60000 });

async function navigateFrom(sourceIdentifier, buttonName, targetIdentifier) {
  const button = page.locator(`#${sourceIdentifier}`).getByRole('button', { exact: true, name: buttonName });
  await button.click();
  await page.waitForFunction((id) => {
    const target = document.getElementById(id);
    if (!target) return false;
    const bounds = target.getBoundingClientRect();
    return bounds.bottom > 0 && bounds.top < window.innerHeight * 0.4;
  }, targetIdentifier, { timeout: 60000 });
}

await navigateFrom('upload', 'Combine', 'combine');
await navigateFrom('combine', 'Refine', 'refine');
await navigateFrom('refine', 'Combine', 'combine');
await navigateFrom('combine', 'Upload', 'upload');
await navigateFrom('upload', '2. The Four Stages', '02-the-four-stages');

const referenceSection = page.locator('#reference');
await referenceSection.scrollIntoViewIfNeeded();
await referenceSection.getByRole('button', { exact: true, name: '3. Adopting Iridis In An Existing App' }).click();
await page.waitForFunction(() => {
  return document.querySelector('#remaining-documents h2')?.textContent?.includes('3. Adopting Iridis In An Existing App') === true;
});

// Settle window: this is exactly the phase that oscillates when it fails.
await page.evaluate(async () => {
  for (let frame = 0; frame < 200; frame += 1) {
    await new Promise((r) => window.requestAnimationFrame(r));
  }
});

const log = await page.evaluate(() => window.__roLog);
await browser.close();
child.kill('SIGTERM');

// Analyze: group by element (className), compute width deltas between
// consecutive readings on the SAME element, report anything that moved by a
// nonzero amount and BalancedWrap-shaped containers specifically.
const byClass = new Map();
for (const entry of log) {
  const key = entry.cls;
  if (!byClass.has(key)) byClass.set(key, []);
  byClass.get(key).push(entry);
}

console.log(`total ResizeObserver entries: ${log.length}, distinct element classes: ${byClass.size}`);
console.log('--- width deltas per class (only classes with any nonzero width delta) ---');
for (const [cls, entries] of byClass) {
  let maxDelta = 0;
  let anyNonzero = false;
  for (let i = 1; i < entries.length; i += 1) {
    const d = Math.abs(entries[i].w - entries[i - 1].w);
    if (d > 0) anyNonzero = true;
    if (d > maxDelta) maxDelta = d;
  }
  if (anyNonzero) {
    console.log(`class="${cls}" readings=${entries.length} maxWidthDelta=${maxDelta.toFixed(3)}px`);
  }
}

console.log('--- BalancedWrap-shaped containers specifically (relative flex flex-col w-full) ---');
for (const [cls, entries] of byClass) {
  if (!cls.includes('relative flex flex-col w-full') && !cls.includes('toc-bar')) continue;
  const widths = entries.map((e) => e.w);
  const uniqueWidths = [...new Set(widths.map((w) => w.toFixed(3)))];
  console.log(`class="${cls}" readings=${entries.length} uniqueWidths=${uniqueWidths.length} sample=${uniqueWidths.slice(0, 6).join(',')}`);
}
