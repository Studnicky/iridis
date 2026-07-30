import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliArgs = process.argv.slice(2);
const cliValue = (name, fallback) => {
  const prefix = `${name}=`;
  const match = cliArgs.find((arg) => arg.startsWith(prefix));
  if (match) {
    return match.slice(prefix.length);
  }
  return fallback;
};
const isDebug = new Set(cliArgs).has('--headful') || new Set(cliArgs).has('--headed') || new Set(cliArgs).has('--interactive');
const PROFILE_MS = Number(cliValue('--duration', process.env.IRIDIS_VIZ_PROFILE_MS ?? '14000'));
const DEBUG_WAIT_MS = Number(cliValue('--wait-ms', process.env.IRIDIS_VIZ_WAIT_MS ?? '0'));

async function runTarget(page, { name, selector, extraDelayMs = 400, scroll = false, durationMs = PROFILE_MS }) {
  const result = await page.evaluate(async ({ selector, durationMs, extraDelayMs, scroll }) => {
    const target = document.querySelector(selector);
    if (!target) {
      return { ok: false, reason: `selector not found: ${selector}` };
    }

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const profile = {
      frames: [],
      longTasks: [],
      mem: [],
      start: performance.now(),
    };

    if (scroll && target.scrollIntoView) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }

    target.dispatchEvent(new Event('mouseenter', { bubbles: true }));

    let prev = performance.now();
    const tick = (ts) => {
      profile.frames.push(ts - prev);
      prev = ts;
      if (performance.now() - profile.start < durationMs) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);

    let observer;
    if ('PerformanceObserver' in window) {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            profile.longTasks.push({ duration: entry.duration, startTime: entry.startTime, name: entry.name });
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {
        // ignore
      }
    }

    const memTimer = setInterval(() => {
      if (performance.memory) {
        profile.mem.push({
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          js: performance.memory.jsHeapSizeLimit,
        });
      }
    }, 200);

    const dispatchWheel = (deltaY) => {
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      target.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY,
        clientX: x,
        clientY: y,
      }));
    };

    const dispatchDrag = async () => {
      const rect = target.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      const moveX = startX + 24;
      const moveY = startY + 12;
      const base = {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      };

      target.dispatchEvent(new PointerEvent('pointerdown', { ...base, clientX: startX, clientY: startY }));
      target.dispatchEvent(new PointerEvent('pointermove', { ...base, clientX: moveX, clientY: moveY }));
      target.dispatchEvent(new PointerEvent('pointerup', { ...base, clientX: moveX, clientY: moveY }));
    };

    for (let i = 0; i < 12; i += 1) {
      dispatchWheel(-120);
      dispatchWheel(120);
      await dispatchDrag();
      await wait(32);
    }

    const remainingProfileTime = Math.max(0, durationMs - (performance.now() - profile.start));
    await wait(remainingProfileTime + extraDelayMs);
    clearInterval(memTimer);
    observer?.disconnect();

    const frames = profile.frames;
    const sorted = [...frames].sort((a, b) => a - b);
    const total = frames.reduce((acc, value) => acc + value, 0);
    const avg = frames.length ? total / frames.length : 0;

    return {
      ok: true,
      overlayText: target.querySelector('.cg-overlay')?.textContent?.trim() || null,
      frameCount: frames.length,
      avgMs: avg,
      maxMs: sorted.at(-1) ?? 0,
      p50Ms: sorted[Math.floor(frames.length * 0.5)] ?? 0,
      p90Ms: sorted[Math.floor(frames.length * 0.9)] ?? 0,
      p95Ms: sorted[Math.floor(frames.length * 0.95)] ?? 0,
      p99Ms: sorted[Math.floor(frames.length * 0.99)] ?? 0,
      longCount: profile.longTasks.length,
      longTotalMs: profile.longTasks.reduce((acc, item) => acc + item.duration, 0),
      long10MsOrMore: profile.longTasks.filter((x) => x.duration >= 10).length,
      memSamples: profile.mem.length,
      memStartMB: profile.mem[0] ? profile.mem[0].used / 1048576 : 0,
      memEndMB: profile.mem.at(-1) ? profile.mem.at(-1).used / 1048576 : 0,
      memPeakMB: profile.mem.reduce((acc, item) => Math.max(acc, item.total), 0) / 1048576,
      jsPeakMB: profile.mem.reduce((acc, item) => Math.max(acc, item.js), 0) / 1048576,
    };
  }, {
    selector,
    durationMs,
    extraDelayMs,
    scroll,
  });

  return { name, selector, ...result };
}

const scriptDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const root = resolve(scriptDir, '.output/public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

export class VisualizationProfileStaticFile {
  static resolve(publicRoot, requestUrl) {
    const canonicalRoot = realpathSync(publicRoot);
    const rawPath = (requestUrl ?? '/').split(/[?#]/u)[0] ?? '/';
    if (!rawPath.startsWith('/') || rawPath.includes('\\') || rawPath.includes('\0')) {
      throw new TypeError('Invalid static request path');
    }
    if (/%(?:2f|5c)/iu.test(rawPath)) {
      throw new TypeError('Escaped path separators are not allowed');
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      throw new TypeError('Static request path is not valid URI encoding');
    }

    let decodedAgain;
    try {
      decodedAgain = decodeURIComponent(decodedPath);
    } catch {
      throw new TypeError('Static request path contains nested URI encoding');
    }
    if (decodedAgain !== decodedPath || decodedPath.includes('\\') || decodedPath.includes('\0')) {
      throw new TypeError('Static request path contains an escaped path');
    }

    const pathSegments = decodedPath.split('/');
    if (pathSegments.some((segment) => segment === '.' || segment === '..')) {
      throw new TypeError('Static request path contains a dot segment');
    }

    const relativeRequestPath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
    const requestedPath = resolve(canonicalRoot, relativeRequestPath);
    this.#assertContained(canonicalRoot, requestedPath);
    const requestedFile = this.#existingFile(canonicalRoot, requestedPath);
    if (requestedFile !== undefined) {
      return { 'filePath': requestedFile, 'statusCode': 200 };
    }

    for (const fallbackName of ['404.html', 'index.html']) {
      const fallbackPath = resolve(canonicalRoot, fallbackName);
      const fallbackFile = this.#existingFile(canonicalRoot, fallbackPath);
      if (fallbackFile !== undefined) {
        return { 'filePath': fallbackFile, 'statusCode': 404 };
      }
    }

    return { 'filePath': undefined, 'statusCode': 404 };
  }

  static #assertContained(publicRoot, candidatePath) {
    const relativePath = relative(publicRoot, candidatePath);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new TypeError('Static request path escapes the public build directory');
    }
  }

  static #existingFile(publicRoot, candidatePath) {
    if (!existsSync(candidatePath) || statSync(candidatePath).isDirectory()) { return undefined; }
    const canonicalFile = realpathSync(candidatePath);
    this.#assertContained(publicRoot, canonicalFile);
    return canonicalFile;
  }
}

class VisualizationProfileOperation {
  static async run() {
    if (!existsSync(root) || !statSync(root).isDirectory()) {
      throw new Error(`Static build not found at ${root}. Run: npm run generate`);
    }

    const browser = await chromium.launch({ 'headless': !isDebug });
    const server = createServer((request, response) => {
      let staticFile;
      try {
        staticFile = VisualizationProfileStaticFile.resolve(root, request.url);
      } catch {
        response.statusCode = 400;
        response.end('invalid request path');
        return;
      }

      if (staticFile.filePath === undefined) {
        response.statusCode = 404;
        response.end('not found');
        return;
      }

      response.statusCode = staticFile.statusCode;
      response.setHeader('Content-Type', MIME[extname(staticFile.filePath)] || 'application/octet-stream');
      createReadStream(staticFile.filePath).pipe(response);
    });

    const report = [];
    try {
      await new Promise((resolveServer) => {
        server.listen(0, '127.0.0.1', resolveServer);
      });
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new TypeError('Profile server did not bind an IP socket');
      }

      const page = await browser.newPage({ 'viewport': { 'height': 1100, 'width': 1680 } });
      await page.goto(`http://127.0.0.1:${address.port}/`, { 'timeout': 60000, 'waitUntil': 'domcontentloaded' });
      await page.waitForTimeout(3000);

      for (const [name, selector] of [
        ['graph', '.cg-wrap'],
        ['mermaid', '.dag-mermaid-frame'],
        ['graphDpad', '.dagonizer-dpad-wrap'],
        ['mermaidDpad', '.dag-mermaid-dpad-wrap'],
      ]) {
        report.push(await runTarget(page, { 'extraDelayMs': 2500, name, 'scroll': true, selector }));
      }

      if (isDebug && DEBUG_WAIT_MS > 0) {
        await page.waitForTimeout(DEBUG_WAIT_MS);
      }
      await page.close();
    } finally {
      await browser.close();
      if (server.listening) {
        await new Promise((resolveServer) => { server.close(resolveServer); });
      }
    }

    for (const item of report) {
      if (!item.ok) {
        console.log(`target=${item.name} ok=false reason=${item.reason}`);
        continue;
      }

      const fps = item.avgMs ? (1000 / item.avgMs) : 0;
      console.log(
        `target=${item.name} frameCount=${item.frameCount} avgMs=${item.avgMs.toFixed(2)} fps=${fps.toFixed(1)} max=${item.maxMs.toFixed(2)} p90=${item.p90Ms.toFixed(2)} p95=${item.p95Ms.toFixed(2)} p99=${item.p99Ms.toFixed(2)} long=${item.longCount}/${item.long10MsOrMore} mem=${item.memStartMB.toFixed(1)}=>${item.memEndMB.toFixed(1)} peak=${item.memPeakMB.toFixed(1)} jsPeak=${item.jsPeakMB.toFixed(1)} overlay=${item.overlayText ?? 'n/a'}`,
      );
    }
  }
}

if (import.meta.main) {
  await VisualizationProfileOperation.run();
}
